import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../lib/pulse/schema";
import { ensureScansSchema } from "../../../../../lib/ensureScansSchema";
import { rateLimit, tooManyRequests } from "../../../../../lib/rateLimit";
import { computeReviewTopics, taskFromTopic, topicByKey } from "../../../../../lib/reviewTopics";
import { loadUserScans } from "../../../../../lib/taskData";
import { projectKey } from "../../../../../lib/projects";
import { errorText } from "../../../../../lib/secrets";

export const runtime = "nodejs";

// What people complain about in the stored reviews of one of the caller's own apps (kind "mine"),
// and a way to turn a topic into a task. The task lands in the same project a report of this app
// uses (same app id), so it shows up in Tasks next to the report's own issues. That needs at least
// one report of the app to exist; without one there is no project to put it in.

async function ownMonitor(id, email) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await sql`SELECT id, app_id, app_name FROM pulse_monitors WHERE id = ${id} AND user_email = ${email} AND kind = 'mine' LIMIT 1`;
  return rows[0] || null;
}

async function reviewsOf(monitorId) {
  const { rows } = await sql`
    SELECT rating, title, content FROM pulse_reviews WHERE monitor_id = ${monitorId} ORDER BY first_seen_at DESC, review_id DESC LIMIT 300
  `;
  return rows;
}

const projectOf = async (email, monitor) => {
  const pk = `app:${String(monitor.app_id).toLowerCase()}`;
  const scans = (await loadUserScans(email)).filter((s) => projectKey(s.app_name, s.store_url) === pk);
  return { pk, hasReports: scans.length > 0 };
};

export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    await ensureScansSchema();
    const { id } = await params;
    const monitor = await ownMonitor(id, user.email);
    if (!monitor) return Response.json({ error: "Monitor not found." }, { status: 404 });

    const { sample, topics } = computeReviewTopics(await reviewsOf(monitor.id));
    const { pk, hasReports } = await projectOf(user.email, monitor);
    const { rows: added } = await sql`SELECT task_key FROM custom_tasks WHERE user_email = ${user.email} AND project_key = ${pk}`;
    const addedKeys = new Set(added.map((r) => r.task_key));
    const { rows: doneRows } = await sql`SELECT finding_key FROM task_status WHERE user_email = ${user.email} AND project_key = ${pk} AND status = 'done' AND finding_key LIKE 'rev:%'`;
    const doneKeys = new Set(doneRows.map((r) => r.finding_key));
    return Response.json({
      sample,
      hasReports,
      topics: topics.map((t) => ({ ...t, added: addedKeys.has(`rev:${t.key}`), fixed: addedKeys.has(`rev:${t.key}`) && doneKeys.has(`rev:${t.key}`) })),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load review topics: " + errorText(err) }, { status: 500 });
  }
}

// POST { topic } -> adds "Reviews: <topic>" to Tasks. Everything in the task is rebuilt here from the
// stored reviews; only the topic key comes from the browser. Adding twice is harmless.
export async function POST(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`pulse:topic-task:${user.id}`, { limit: 60, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);
    await ensurePulseSchema();
    await ensureScansSchema();
    const { id } = await params;
    const monitor = await ownMonitor(id, user.email);
    if (!monitor) return Response.json({ error: "Monitor not found." }, { status: 404 });

    let body;
    try { body = await req.json(); } catch { body = null; }
    if (typeof body?.topic !== "string" || !topicByKey(body.topic)) {
      return Response.json({ error: "Unknown topic." }, { status: 400 });
    }

    const { sample, topics } = computeReviewTopics(await reviewsOf(monitor.id));
    const topic = topics.find((t) => t.key === body.topic);
    if (!topic || !topic.canAdd) {
      return Response.json({ error: "Not enough reviews mention this yet (at least 3 are needed)." }, { status: 400 });
    }
    const { pk, hasReports } = await projectOf(user.email, monitor);
    if (!hasReports) {
      return Response.json(
        { error: "Make a report of this app from its store link first, so its tasks have a home.", code: "NO_REPORT" },
        { status: 409 }
      );
    }

    const t = taskFromTopic(topic, sample);
    const { rowCount } = await sql`
      INSERT INTO custom_tasks (user_email, project_key, task_key, title, severity, finding, suggestion, source)
      VALUES (${user.email}, ${pk}, ${t.key}, ${t.title}, ${t.severity}, ${t.finding}, ${t.suggestion}, 'review')
      ON CONFLICT (user_email, project_key, task_key) DO NOTHING
    `;
    return Response.json({ ok: true, added: rowCount > 0, projectKey: pk });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not add the task: " + errorText(err) }, { status: 500 });
  }
}
