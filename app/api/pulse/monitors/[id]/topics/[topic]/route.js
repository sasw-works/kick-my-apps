import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../../lib/pulse/schema";
import { ensureScansSchema } from "../../../../../../lib/ensureScansSchema";
import { topicByKey } from "../../../../../../lib/reviewTopics";
import { errorText } from "../../../../../../lib/secrets";

export const runtime = "nodejs";

// "Tell people it's fixed": the stored 1-3 star reviews that mention a complaint topic the caller
// has marked DONE in Tasks, so they can answer those reviewers (draft replies go through the normal
// reply-draft endpoint). Refused until the topic's task really is done, so the UI can't be used to
// announce a fix that hasn't been marked as made.
export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    await ensureScansSchema();
    const { id, topic: key } = await params;
    const topic = topicByKey(key);
    if (!topic || !/^\d+$/.test(String(id))) return Response.json({ error: "Not found." }, { status: 404 });
    const { rows: own } = await sql`SELECT id, app_id FROM pulse_monitors WHERE id = ${id} AND user_email = ${user.email} AND kind = 'mine' LIMIT 1`;
    if (!own[0]) return Response.json({ error: "Not found." }, { status: 404 });

    const pk = `app:${String(own[0].app_id).toLowerCase()}`;
    const { rows: st } = await sql`
      SELECT updated_at FROM task_status WHERE user_email = ${user.email} AND project_key = ${pk} AND finding_key = ${"rev:" + key} AND status = 'done'
    `;
    if (!st[0]) return Response.json({ error: "Mark this item as done in your Checklist first.", code: "NOT_FIXED" }, { status: 409 });

    const { rows } = await sql`
      SELECT review_id, rating, title, content, version, reviewed_at FROM pulse_reviews
      WHERE monitor_id = ${id} AND rating BETWEEN 1 AND 3 ORDER BY first_seen_at DESC, review_id DESC LIMIT 300
    `;
    const matches = rows.filter((r) => topic.re.test(`${r.title ?? ""} ${r.content ?? ""}`.toLowerCase()));
    const { rows: snap } = await sql`SELECT version FROM pulse_snapshots WHERE monitor_id = ${id} AND version IS NOT NULL ORDER BY taken_at DESC, id DESC LIMIT 1`;
    return Response.json({
      topic: { key, label: topic.label },
      fixedAt: st[0].updated_at,
      latestVersion: snap[0]?.version || null,
      total: matches.length,
      reviews: matches.slice(0, 15).map((r) => ({ id: r.review_id, rating: r.rating, title: r.title, content: r.content, version: r.version, reviewed_at: r.reviewed_at })),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load the reviews: " + errorText(err) }, { status: 500 });
  }
}
