import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { ensurePulseSchema } from "../../../lib/pulse/schema";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";
import { errorText } from "../../../lib/secrets";
import { INBOX_WINDOW_DAYS, STATS_WINDOW_DAYS, MAX_OPEN, HANDLED, replyStats } from "../../../lib/replyInbox";

export const runtime = "nodejs";

// The caller's reply inbox: 1-3 star reviews (with text) of their OWN apps that nobody has dealt
// with yet, worst first. "Dealt with" is the person's own mark (replied / skipped), or the store
// saying the developer already replied (Google Play). Only kind "mine" monitors count.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    const { rows: mine } = await sql`SELECT count(*)::int AS c FROM pulse_monitors WHERE user_email = ${user.email} AND kind = 'mine' AND status = 'active'`;

    const { rows: open } = await sql`
      SELECT m.id AS monitor_id, m.app_name, rv.review_id, rv.rating, rv.title, rv.content, rv.version, rv.reviewed_at, rv.first_seen_at
      FROM pulse_reviews rv JOIN pulse_monitors m ON m.id = rv.monitor_id
      WHERE m.user_email = ${user.email} AND m.kind = 'mine' AND m.status = 'active'
        AND rv.handled_at IS NULL AND rv.rating BETWEEN 1 AND 3 AND length(trim(coalesce(rv.title,'') || coalesce(rv.content,''))) > 0
        AND coalesce(rv.reviewed_at, rv.first_seen_at) >= now() - (${INBOX_WINDOW_DAYS}::int * interval '1 day')
      ORDER BY rv.rating ASC, coalesce(rv.reviewed_at, rv.first_seen_at) DESC, rv.review_id
    `;
    const { rows: st } = await sql`
      SELECT count(*)::int AS low_total,
             count(*) FILTER (WHERE rv.handled_how IN ('replied','store'))::int AS replied,
             count(*) FILTER (WHERE rv.handled_how = 'skipped')::int AS skipped,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM rv.handled_at - coalesce(rv.reviewed_at, rv.first_seen_at))) FILTER (WHERE rv.handled_how = 'replied') AS median_s
      FROM pulse_reviews rv JOIN pulse_monitors m ON m.id = rv.monitor_id
      WHERE m.user_email = ${user.email} AND m.kind = 'mine' AND m.status = 'active'
        AND rv.rating BETWEEN 1 AND 3 AND length(trim(coalesce(rv.title,'') || coalesce(rv.content,''))) > 0
        AND coalesce(rv.reviewed_at, rv.first_seen_at) >= now() - (${STATS_WINDOW_DAYS}::int * interval '1 day')
    `;
    const now = Date.now();
    return Response.json({
      watching: mine[0].c,
      openTotal: open.length,
      open: open.slice(0, MAX_OPEN).map((r) => ({
        monitorId: r.monitor_id, appName: r.app_name, reviewId: r.review_id, rating: r.rating,
        title: r.title, content: r.content, version: r.version, reviewedAt: r.reviewed_at,
        ageDays: Math.max(0, Math.floor((now - new Date(r.reviewed_at || r.first_seen_at).getTime()) / 86_400_000)),
      })),
      stats: replyStats({ lowTotal: st[0].low_total, repliedCount: st[0].replied, skippedCount: st[0].skipped, medianSeconds: st[0].median_s }),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load the inbox: " + errorText(err) }, { status: 500 });
  }
}

// PATCH { monitorId, reviewId, status: "replied" | "skipped" | "open" }
export async function PATCH(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`inbox:mark:${user.id}`, { limit: 600, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);
    let body;
    try { body = await req.json(); } catch { body = null; }
    const { monitorId, reviewId, status } = body || {};
    if (!Number.isInteger(monitorId) || typeof reviewId !== "string" || !reviewId || reviewId.length > 300 || ![...HANDLED, "open"].includes(status)) {
      return Response.json({ error: "monitorId, reviewId and a valid status are required." }, { status: 400 });
    }
    await ensurePulseSchema();
    const { rows: own } = await sql`SELECT id FROM pulse_monitors WHERE id = ${monitorId} AND user_email = ${user.email} AND kind = 'mine' LIMIT 1`;
    if (!own[0]) return Response.json({ error: "Review not found." }, { status: 404 });
    // Reopening only undoes the person's own marks; a reply the store itself reported stays.
    const { rowCount } = status === "open"
      ? await sql`UPDATE pulse_reviews SET handled_at = NULL, handled_how = NULL WHERE monitor_id = ${monitorId} AND review_id = ${reviewId} AND handled_how IN ('replied','skipped')`
      : await sql`UPDATE pulse_reviews SET handled_at = now(), handled_how = ${status} WHERE monitor_id = ${monitorId} AND review_id = ${reviewId} AND (handled_how IS NULL OR handled_how IN ('replied','skipped'))`;
    if (!rowCount) {
      const { rows: any } = await sql`SELECT handled_how FROM pulse_reviews WHERE monitor_id = ${monitorId} AND review_id = ${reviewId}`;
      if (!any[0]) return Response.json({ error: "Review not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not save: " + errorText(err) }, { status: 500 });
  }
}
