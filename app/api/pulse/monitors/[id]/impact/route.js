import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../lib/pulse/schema";
import { ensureScansSchema } from "../../../../../lib/ensureScansSchema";
import { computeReleaseImpact } from "../../../../../lib/pulse/releaseImpact";
import { loadUserScans } from "../../../../../lib/taskData";
import { projectKey } from "../../../../../lib/projects";
import { errorText } from "../../../../../lib/secrets";

export const runtime = "nodejs";

// "Did the release help?" for one of the caller's own apps (kind "mine"): per version, the written
// reviews next to the previous version's, plus the tasks they marked done around that release.
// The task link works through the project: a report made from this app's store link and this
// monitor share the same app id, so the same project key.
export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    await ensureScansSchema();
    const { id } = await params;
    if (!/^\d+$/.test(String(id))) return Response.json({ error: "Monitor not found." }, { status: 404 });
    const { rows: own } = await sql`
      SELECT id, app_id, app_name FROM pulse_monitors WHERE id = ${id} AND user_email = ${user.email} AND kind = 'mine' LIMIT 1
    `;
    const monitor = own[0];
    if (!monitor) return Response.json({ error: "Monitor not found." }, { status: 404 });

    const { rows: snapshots } = await sql`
      SELECT taken_at, version, version_released_at, avg_rating FROM pulse_snapshots WHERE monitor_id = ${id} ORDER BY taken_at ASC, id ASC
    `;
    const { rows: reviews } = await sql`
      SELECT rating, title, content, version FROM pulse_reviews WHERE monitor_id = ${id} ORDER BY first_seen_at DESC LIMIT 2000
    `;

    const pk = `app:${String(monitor.app_id).toLowerCase()}`;
    const scans = (await loadUserScans(user.email)).filter((s) => projectKey(s.app_name, s.store_url) === pk);
    const titles = new Map();
    for (const s of [...scans].reverse()) {
      for (const f of Array.isArray(s.findings) ? s.findings : []) if (f?.key) titles.set(f.key, f.title);
    }
    let doneTasks = [];
    if (scans.length) {
      const { rows } = await sql`
        SELECT finding_key, updated_at FROM task_status WHERE user_email = ${user.email} AND project_key = ${pk} AND status = 'done'
      `;
      doneTasks = rows.map((r) => ({ key: r.finding_key, title: titles.get(r.finding_key) || r.finding_key, doneAt: r.updated_at }));
    }

    return Response.json({
      app: { id: monitor.id, name: monitor.app_name },
      hasReports: scans.length > 0,
      releases: computeReleaseImpact({ snapshots, reviews, doneTasks }),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load release impact: " + errorText(err) }, { status: 500 });
  }
}
