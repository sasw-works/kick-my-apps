import { sql } from "@vercel/postgres";
import { projectKey, groupProjects } from "./projects";

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

export { groupProjects, projectKey };
