import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../lib/rateLimit";
import { errorText } from "../../lib/secrets";
import { computeProjectTasks, TASK_STATUSES } from "../../lib/projects";
import { loadProjects, loadStatusMap, loadCustomTasks, loadAllCustomTasks } from "../../lib/taskData";

export const runtime = "nodejs";

// GET            -> the caller's projects (one per app) with task counts
// GET ?project=  -> one project's tasks
// PATCH          -> set one task's status
// Everything is scoped to the signed-in user's own reports; admins get no special access here.

export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const projects = await loadProjects(user.email);
    const wanted = new URL(req.url).searchParams.get("project");

    if (wanted) {
      const project = projects.find((p) => p.key === wanted);
      if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
      const statusMap = await loadStatusMap(user.email, project.key);
      const result = computeProjectTasks(project.scans, statusMap, await loadCustomTasks(user.email, project.key));
      const latest = project.scans[0];
      return Response.json({
        project: { key: project.key, appName: project.appName, storeUrl: project.storeUrl, reportCount: project.scans.length, latestScanId: latest.id, latestScanDate: latest.created_at },
        ...result,
      });
    }

    const { rows: all } = await sql`SELECT project_key, finding_key, status, updated_at FROM task_status WHERE user_email = ${user.email}`;
    const customByProject = await loadAllCustomTasks(user.email);
    const byProject = {};
    for (const r of all) (byProject[r.project_key] ||= {})[r.finding_key] = { status: r.status, updated_at: r.updated_at };

    return Response.json({
      projects: projects.map((p) => {
        const { counts } = computeProjectTasks(p.scans, byProject[p.key] || {}, customByProject[p.key] || []);
        const latest = p.scans[0];
        return { key: p.key, appName: p.appName, storeUrl: p.storeUrl, reportCount: p.scans.length, latestScanId: latest.id, latestScanDate: latest.created_at, counts };
      }),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load tasks: " + errorText(err) }, { status: 500 });
  }
}

// DELETE { projects: [key, ...] } -> remove those projects from the caller's Tasks list: their progress
// (ticks and review-made tasks) is deleted and the project is hidden. The reports are NOT touched, and
// the project reappears (fresh) when the app is analysed again.
export async function DELETE(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`tasks:delete:${user.id}`, { limit: 120, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

    let body;
    try { body = await req.json(); } catch { body = null; }
    const keys = Array.isArray(body?.projects) ? [...new Set(body.projects.filter((k) => typeof k === "string"))].slice(0, 100) : [];
    if (!keys.length) return Response.json({ error: "projects is required." }, { status: 400 });

    // Only projects the caller really has: nobody can write rows for keys that are not theirs.
    const mine = new Set((await loadProjects(user.email)).map((p) => p.key));
    const removed = keys.filter((k) => mine.has(k));
    for (const pk of removed) {
      await sql`DELETE FROM task_status WHERE user_email = ${user.email} AND project_key = ${pk}`;
      await sql`DELETE FROM custom_tasks WHERE user_email = ${user.email} AND project_key = ${pk}`;
      await sql`
        INSERT INTO hidden_task_projects (user_email, project_key, hidden_at) VALUES (${user.email}, ${pk}, now())
        ON CONFLICT (user_email, project_key) DO UPDATE SET hidden_at = now()
      `;
    }
    return Response.json({ ok: true, removed: removed.length });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not delete: " + errorText(err) }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`tasks:${user.id}`, { limit: 600, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

    let body;
    try { body = await req.json(); } catch { body = null; }
    const { project: pk, key, status } = body || {};
    if (typeof pk !== "string" || typeof key !== "string" || !TASK_STATUSES.includes(status)) {
      return Response.json({ error: "project, key and a valid status are required." }, { status: 400 });
    }

    const projects = await loadProjects(user.email);
    const project = projects.find((p) => p.key === pk);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    // Only real tasks can be tracked (no arbitrary keys): an open issue in the latest report, or a
    // task the user made from review complaints.
    const custom = await loadCustomTasks(user.email, pk);
    const open =
      (project.scans[0].findings || []).some((f) => f?.key === key && (f.status === "bad" || f.status === "warn")) ||
      custom.some((c) => c.key === key);
    if (!open) return Response.json({ error: "That isn't an open issue in this project." }, { status: 400 });

    if (status === "todo") {
      await sql`DELETE FROM task_status WHERE user_email = ${user.email} AND project_key = ${pk} AND finding_key = ${key}`;
    } else {
      await sql`
        INSERT INTO task_status (user_email, project_key, finding_key, status, updated_at)
        VALUES (${user.email}, ${pk}, ${key}, ${status}, now())
        ON CONFLICT (user_email, project_key, finding_key)
        DO UPDATE SET status = EXCLUDED.status, updated_at = now();
      `;
    }
    const result = computeProjectTasks(project.scans, await loadStatusMap(user.email, pk), custom);
    return Response.json({ ok: true, counts: result.counts });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not save: " + errorText(err) }, { status: 500 });
  }
}
