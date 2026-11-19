import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../lib/pulse/schema";
import { ensureScansSchema } from "../../../../../lib/ensureScansSchema";
import { rateLimit, tooManyRequests } from "../../../../../lib/rateLimit";
import { computeFeatureRequests, taskFromFeature, buildGroupPrompt, parseClusters, MAX_TO_GROUP } from "../../../../../lib/featureRequests";
import { aiConfigured, generateText } from "../../../../../lib/textModel";
import { loadUserScans } from "../../../../../lib/taskData";
import { projectKey } from "../../../../../lib/projects";
import { errorText } from "../../../../../lib/secrets";

export const runtime = "nodejs";

// Feature requests found in the stored reviews of one of the caller's own apps (kind "mine").
// GET lists them (rule-based groups plus any AI groups saved earlier), POST {key} adds one to Tasks,
// POST {action:"group"} asks the AI to group the requests the rules did not recognise.

async function ownMonitor(id, email) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await sql`SELECT id, app_id FROM pulse_monitors WHERE id = ${id} AND user_email = ${email} AND kind = 'mine' LIMIT 1`;
  return rows[0] || null;
}

async function reviewsOf(monitorId) {
  const { rows } = await sql`
    SELECT review_id AS id, rating, title, content FROM pulse_reviews
    WHERE monitor_id = ${monitorId} ORDER BY first_seen_at DESC, review_id DESC LIMIT 300`;
  return rows;
}

// Rule groups + saved AI groups, all derived from the stored reviews.
async function build(monitor) {
  const reviews = await reviewsOf(monitor.id);
  const base = computeFeatureRequests(reviews);
  const { rows } = await sql`SELECT cluster_key, title, review_ids FROM feature_clusters WHERE monitor_id = ${monitor.id} ORDER BY created_at`;
  const byId = new Map(reviews.map((r) => [String(r.id), r]));
  const ai = rows.map((c) => {
    const hits = c.review_ids.map((i) => byId.get(String(i))).filter(Boolean);
    return {
      key: c.cluster_key,
      label: c.title,
      ai: true,
      count: hits.length,
      pct: Math.round((hits.length / Math.max(base.requestCount, 1)) * 100),
      examples: hits.slice(0, 2).map((h) => ({ rating: Number(h.rating) || 0, text: String(h.content || h.title || "").slice(0, 200) })),
      suggestion: "",
      canAdd: hits.length >= 3,
    };
  }).filter((t) => t.count >= 2);
  const topics = [...base.topics, ...ai].sort((a, b) => b.count - a.count);
  return { ...base, topics, reviews };
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
    const { sample, requestCount, topics, unmatched } = await build(monitor);
    const { pk, hasReports } = await projectOf(user.email, monitor);
    const { rows: added } = await sql`SELECT task_key FROM custom_tasks WHERE user_email = ${user.email} AND project_key = ${pk} AND task_key LIKE 'feat:%'`;
    const addedKeys = new Set(added.map((r) => r.task_key));
    return Response.json({
      sample,
      requestCount,
      hasReports,
      canGroup: aiConfigured() && unmatched.length >= 2,
      ungrouped: unmatched.length,
      topics: topics.map((t) => ({ ...t, added: addedKeys.has(`feat:${t.key}`) })),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load feature requests: " + errorText(err) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    await ensureScansSchema();
    const { id } = await params;
    const monitor = await ownMonitor(id, user.email);
    if (!monitor) return Response.json({ error: "Monitor not found." }, { status: 404 });
    let body;
    try { body = await req.json(); } catch { body = null; }

    if (body?.action === "group") {
      const r = await rateLimit(`pulse:feat-group:${user.id}`, { limit: 10, windowSeconds: 3600 });
      if (!r.allowed) return tooManyRequests(r);
      if (!aiConfigured()) return Response.json({ error: "AI grouping isn't set up on this server." }, { status: 503 });
      const { unmatched } = await build(monitor);
      const items = unmatched.slice(0, MAX_TO_GROUP).map((u) => ({ id: String(u.id), text: `${u.title ?? ""}. ${u.content ?? ""}`.trim() }));
      if (items.length < 2) return Response.json({ ok: true, groups: 0 });
      let raw;
      try {
        raw = await generateText(buildGroupPrompt(items), { json: true, maxTokens: 800 });
      } catch (err) {
        console.error(err);
        return Response.json({ error: "The AI couldn't group these right now. Try again later." }, { status: 502 });
      }
      const clusters = parseClusters(raw, items);
      for (const c of clusters) {
        await sql`
          INSERT INTO feature_clusters (monitor_id, cluster_key, title, review_ids)
          VALUES (${monitor.id}, ${c.key}, ${c.title}, ${`{${c.reviewIds.map((x) => `"${x.replace(/["\\]/g, "\\$&")}"`).join(",")}}`}::text[])
          ON CONFLICT (monitor_id, cluster_key) DO UPDATE SET title = EXCLUDED.title, review_ids = EXCLUDED.review_ids`;
      }
      return Response.json({ ok: true, groups: clusters.length });
    }

    const r = await rateLimit(`pulse:feat-task:${user.id}`, { limit: 60, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);
    if (typeof body?.key !== "string" || body.key.length > 40) return Response.json({ error: "Unknown request." }, { status: 400 });
    const { sample, topics } = await build(monitor);
    const topic = topics.find((t) => t.key === body.key);
    if (!topic) return Response.json({ error: "Unknown request." }, { status: 400 });
    if (!topic.canAdd) return Response.json({ error: "Not enough reviews ask for this yet (at least 3 are needed)." }, { status: 400 });
    const { pk, hasReports } = await projectOf(user.email, monitor);
    if (!hasReports) {
      return Response.json({ error: "Make a report of this app from its store link first, so its tasks have a home.", code: "NO_REPORT" }, { status: 409 });
    }
    const t = taskFromFeature(topic, sample);
    const { rowCount } = await sql`
      INSERT INTO custom_tasks (user_email, project_key, task_key, title, severity, finding, suggestion, source)
      VALUES (${user.email}, ${pk}, ${t.key}, ${t.title}, ${t.severity}, ${t.finding}, ${t.suggestion}, 'review')
      ON CONFLICT (user_email, project_key, task_key) DO NOTHING`;
    return Response.json({ ok: true, added: rowCount > 0, projectKey: pk });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Request failed: " + errorText(err) }, { status: 500 });
  }
}
