import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../lib/rateLimit";
import { errorText } from "../../lib/secrets";
import { computeProjectTasks } from "../../lib/projects";
import { loadProjects, loadStatusMap, loadCustomTasks } from "../../lib/taskData";
import { ensureChecklistSchema, MAX_CUSTOM_PER_PROJECT, MAX_ITEMS_PER_USER, MAX_TITLE } from "../../lib/checklistItems";

export const runtime = "nodejs";

// GET            -> the caller's apps (for the picker), each with how many critical tasks are still open
// GET ?project=  -> one app's part of the Checklist:
//                     critical:  open critical tasks, read live from Tasks (not stored here)
//                     pinned:    findings pinned from a report, with their current state from Tasks
//                     custom:    the person's own items
// POST {projectKey, findingKey}  -> pin a finding of that app's latest report
// POST {projectKey, title}       -> add an item of your own
// PATCH  {id, checked}           -> tick / untick one of your own items
// DELETE {id}                    -> remove a pinned or own item
// Everything is scoped to the signed-in user; admins get no special access here.

async function projectState(email, project) {
  const statusMap = await loadStatusMap(email, project.key);
  const result = computeProjectTasks(project.scans, statusMap, await loadCustomTasks(email, project.key));
  return result;
}

export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensureChecklistSchema();
    const projects = await loadProjects(user.email);
    const wanted = new URL(req.url).searchParams.get("project");

    if (!wanted) {
      const out = [];
      for (const p of projects) {
        const { tasks } = await projectState(user.email, p);
        out.push({ key: p.key, appName: p.appName, openCritical: tasks.filter((t) => t.severity === "bad" && t.status === "todo").length });
      }
      return Response.json({ projects: out });
    }

    const project = projects.find((p) => p.key === wanted);
    if (!project) return Response.json({ error: "App not found." }, { status: 404 });
    const { tasks, verified } = await projectState(user.email, project);
    const byKey = new Map(tasks.map((t) => [t.key, t]));
    const fixedKeys = new Set(verified.map((v) => v.key));
    const { rows } = await sql`
      SELECT id, kind, finding_key, title, checked FROM checklist_items
      WHERE user_email = ${user.email} AND project_key = ${project.key} ORDER BY created_at ASC, id ASC
    `;
    const pinnedKeys = new Set(rows.filter((r) => r.kind === "pin").map((r) => r.finding_key));
    const critical = tasks
      .filter((t) => t.severity === "bad" && t.status === "todo" && !pinnedKeys.has(t.key))
      .map((t) => ({ key: t.key, title: t.title, suggestion: t.suggestion }));
    const pinned = rows.filter((r) => r.kind === "pin").map((r) => {
      const t = byKey.get(r.finding_key);
      // done / wontdo: ticked in Tasks. Not flagged any more in the latest report: the scan confirms the fix.
      const status = t ? t.status : "done";
      return { id: r.id, key: r.finding_key, title: t?.title || r.title, severity: t?.severity || null, status, confirmedByScan: !t && fixedKeys.has(r.finding_key) };
    });
    const custom = rows.filter((r) => r.kind === "custom").map((r) => ({ id: r.id, title: r.title, checked: r.checked }));
    const doneCritical = tasks.filter((t) => t.severity === "bad" && (t.status === "done" || t.status === "wontdo")).length;
    return Response.json({
      project: { key: project.key, appName: project.appName },
      critical, pinned, custom,
      criticalTotal: critical.length + doneCritical + tasks.filter((t) => t.severity === "bad" && t.status === "todo" && pinnedKeys.has(t.key)).length,
      tasksHref: `/console/tasks/${encodeURIComponent(project.key)}`,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load the checklist: " + errorText(err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`checklist:add:${user.id}`, { limit: 200, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);
    const body = await req.json().catch(() => ({}));
    const projectKey = typeof body.projectKey === "string" ? body.projectKey : "";
    await ensureChecklistSchema();
    const project = (await loadProjects(user.email)).find((p) => p.key === projectKey);
    if (!project) return Response.json({ error: "App not found." }, { status: 404 });
    const { rows: [n] } = await sql`SELECT count(*)::int AS n FROM checklist_items WHERE user_email = ${user.email}`;
    if (n.n >= MAX_ITEMS_PER_USER) return Response.json({ error: "Your checklist is full. Remove a few items first." }, { status: 400 });

    if (typeof body.findingKey === "string" && body.findingKey) {
      const f = (Array.isArray(project.scans[0].findings) ? project.scans[0].findings : []).find((x) => x?.key === body.findingKey);
      if (!f) return Response.json({ error: "That finding is not in this app's latest report." }, { status: 404 });
      const title = String(f.title || f.key).slice(0, MAX_TITLE);
      const { rows } = await sql`
        INSERT INTO checklist_items (user_email, project_key, kind, finding_key, title)
        VALUES (${user.email}, ${project.key}, 'pin', ${f.key}, ${title})
        ON CONFLICT (user_email, project_key, finding_key) WHERE kind = 'pin' DO NOTHING
        RETURNING id
      `;
      return Response.json({ ok: true, added: rows.length > 0, projectKey: project.key });
    }

    const title = typeof body.title === "string" ? body.title.trim().slice(0, MAX_TITLE) : "";
    if (!title) return Response.json({ error: "Write what the item should say." }, { status: 400 });
    const { rows: [c] } = await sql`SELECT count(*)::int AS n FROM checklist_items WHERE user_email = ${user.email} AND project_key = ${project.key} AND kind = 'custom'`;
    if (c.n >= MAX_CUSTOM_PER_PROJECT) return Response.json({ error: `You can have ${MAX_CUSTOM_PER_PROJECT} items of your own per app.` }, { status: 400 });
    const { rows } = await sql`
      INSERT INTO checklist_items (user_email, project_key, kind, title) VALUES (${user.email}, ${project.key}, 'custom', ${title}) RETURNING id
    `;
    return Response.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not add it: " + errorText(err) }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`checklist:tick:${user.id}`, { limit: 600, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);
    const body = await req.json().catch(() => ({}));
    const id = Number.parseInt(body.id, 10);
    if (!Number.isInteger(id) || typeof body.checked !== "boolean") return Response.json({ error: "Send the item id and checked true or false." }, { status: 400 });
    await ensureChecklistSchema();
    const { rowCount } = await sql`UPDATE checklist_items SET checked = ${body.checked} WHERE id = ${id} AND user_email = ${user.email} AND kind = 'custom'`;
    if (!rowCount) return Response.json({ error: "Item not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not save it: " + errorText(err) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`checklist:delete:${user.id}`, { limit: 300, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);
    const body = await req.json().catch(() => ({}));
    const id = Number.parseInt(body.id, 10);
    if (!Number.isInteger(id)) return Response.json({ error: "Send the item id." }, { status: 400 });
    await ensureChecklistSchema();
    const { rowCount } = await sql`DELETE FROM checklist_items WHERE id = ${id} AND user_email = ${user.email}`;
    if (!rowCount) return Response.json({ error: "Item not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not remove it: " + errorText(err) }, { status: 500 });
  }
}
