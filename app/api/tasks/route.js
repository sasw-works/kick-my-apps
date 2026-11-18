import { sql } from "@vercel/postgres";
import { ensureScansSchema } from "../../lib/ensureScansSchema";
import { getCurrentUser, unauthorized } from "../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../lib/rateLimit";
import { errorText } from "../../lib/secrets";
import { computeProjectTasks, TASK_STATUSES } from "../../lib/projects";
import { loadUserScans, migrateLegacyTracking, loadStatusMap, groupProjects } from "../../lib/taskData";

export const runtime = "nodejs";

// GET            -> the caller's projects (one per app) with task counts
// GET ?project=  -> one project's tasks
// PATCH          -> set one task's status
// Everything is scoped to the signed-in user's own reports; admins get no special access here.

async function prepare(user) {
  await ensureScansSchema();
  const scans = await loadUserScans(user.email);
  if (await migrateLegacyTracking(user.email, scans)) {
    for (const s of scans) s.finding_status = null;
  }
  return groupProjects(scans);
}

export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const projects = await prepare(user);
    const wanted = new URL(req.url).searchParams.get("project");

    if (wanted) {
      const project = projects.find((p) => p.key === wanted);
      if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
      const statusMap = await loadStatusMap(user.email, project.key);
      const result = computeProjectTasks(project.scans, statusMap);
      const latest = project.scans[0];
      return Response.json({
        project: { key: project.key, appName: project.appName, storeUrl: project.storeUrl, reportCount: project.scans.length, latestScanId: latest.id, latestScanDate: latest.created_at },
        ...result,
      });
    }

    const { rows: all } = await sql`SELECT project_key, finding_key, status, updated_at FROM task_status WHERE user_email = ${user.email}`;
    const byProject = {};
    for (const r of all) (byProject[r.project_key] ||= {})[r.finding_key] = { status: r.status, updated_at: r.updated_at };

    return Response.json({
      projects: projects.map((p) => {
        const { counts } = computeProjectTasks(p.scans, byProject[p.key] || {});
        const latest = p.scans[0];
        return { key: p.key, appName: p.appName, storeUrl: p.storeUrl, reportCount: p.scans.length, latestScanId: latest.id, latestScanDate: latest.created_at, counts };
      }),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load tasks: " + errorText(err) }, { status: 500 });
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

    const projects = await prepare(user);
    const project = projects.find((p) => p.key === pk);
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    // Only issues the latest report actually contains can be tracked (no arbitrary keys).
    const open = (project.scans[0].findings || []).some((f) => f?.key === key && (f.status === "bad" || f.status === "warn"));
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
    const result = computeProjectTasks(project.scans, await loadStatusMap(user.email, pk));
    return Response.json({ ok: true, counts: result.counts });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not save: " + errorText(err) }, { status: 500 });
  }
}
