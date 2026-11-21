import { sql } from "@vercel/postgres";
import { projectKey, groupProjects } from "./projects.js";
import { ensureScansSchema } from "./ensureScansSchema.js";

// All of one user's reports, newest first, with only the parts the task views need.
export async function loadUserScans(email) {
  const { rows } = await sql`
    SELECT id, app_name, store_url, created_at, health_score, result_json->'findings' AS findings, finding_status
    FROM scans WHERE user_email = ${email}
    ORDER BY created_at DESC, id DESC LIMIT 500;
  `;
  return rows;
}

// Reports made while tracking still lived on each single report keep their ticks: copy them into
// the per-project table once, then clear them. Idempotent; never overwrites a newer choice.
export async function migrateLegacyTracking(email, scans) {
  const legacy = scans.filter((s) => s.finding_status && Object.keys(s.finding_status).length);
  if (!legacy.length) return false;
  for (const s of legacy) {
    const pk = projectKey(s.app_name, s.store_url);
    for (const [key, v] of Object.entries(s.finding_status)) {
      const status = v === "done" ? "done" : v === "wontfix" ? "wontdo" : null;
      if (!status) continue;
      await sql`
        INSERT INTO task_status (user_email, project_key, finding_key, status)
        VALUES (${email}, ${pk}, ${key}, ${status})
        ON CONFLICT DO NOTHING;
      `;
    }
    await sql`UPDATE scans SET finding_status = NULL WHERE id = ${s.id} AND user_email = ${email}`;
  }
  return true;
}

export async function loadStatusMap(email, pk) {
  const { rows } = await sql`
    SELECT finding_key, status, updated_at FROM task_status WHERE user_email = ${email} AND project_key = ${pk}
  `;
  const map = {};
  for (const r of rows) map[r.finding_key] = { status: r.status, updated_at: r.updated_at };
  return map;
}

// Tasks added by hand from review complaint topics, for one project (or all, keyed by project).
export async function loadCustomTasks(email, pk) {
  const { rows } = await sql`
    SELECT task_key AS key, title, severity, finding, suggestion, source
    FROM custom_tasks WHERE user_email = ${email} AND project_key = ${pk} ORDER BY created_at ASC
  `;
  return rows;
}

export async function loadAllCustomTasks(email) {
  const { rows } = await sql`
    SELECT project_key, task_key AS key, title, severity, finding, suggestion, source
    FROM custom_tasks WHERE user_email = ${email} ORDER BY created_at ASC
  `;
  const byProject = {};
  for (const r of rows) (byProject[r.project_key] ||= []).push(r);
  return byProject;
}

// The caller's projects (one per app), newest first, after the one-time legacy migration.
export async function loadProjects(email) {
  await ensureScansSchema();
  const scans = await loadUserScans(email);
  if (await migrateLegacyTracking(email, scans)) {
    for (const s of scans) s.finding_status = null;
  }
  const { rows: hidden } = await sql`SELECT project_key, hidden_at FROM hidden_task_projects WHERE user_email = ${email}`;
  const hiddenAt = new Map(hidden.map((h) => [h.project_key, new Date(h.hidden_at).getTime()]));
  // A removed project stays gone until a report newer than the removal exists.
  return groupProjects(scans).filter((p) => {
    const at = hiddenAt.get(p.key);
    return at === undefined || new Date(p.scans[0].created_at).getTime() > at;
  });
}

export { groupProjects, projectKey };
