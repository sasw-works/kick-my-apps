import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../lib/pulse/schema";
import { rateLimit } from "../../../../lib/rateLimit";
import { errorText } from "../../../../lib/secrets";
import { generateText, aiConfigured } from "../../../../lib/textModel";
import { buildReplyPrompt, cleanReply, defaultToneFor } from "../../../../lib/replyDraft";
import { MAX_BULK_DRAFTS } from "../../../../lib/replyInbox";

export const runtime = "nodejs";

// POST { items: [{ monitorId, reviewId }] } (up to 5) -> { results: [{ reviewId, reply } | { reviewId, error }] }
// Drafts for several inbox reviews at once. Each one counts against the same hourly allowance as a
// single "Draft reply", so this is a convenience, not a way around the limit. Nothing is posted.
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    let body;
    try { body = await req.json(); } catch { body = null; }
    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_BULK_DRAFTS || items.some((i) => !Number.isInteger(i?.monitorId) || typeof i?.reviewId !== "string" || !i.reviewId || i.reviewId.length > 300)) {
      return Response.json({ error: `items must be 1 to ${MAX_BULK_DRAFTS} reviews.` }, { status: 400 });
    }
    if (!aiConfigured()) {
      console.error("Bulk drafts unavailable: neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set.");
      return Response.json({ error: "Drafting replies isn't available right now." }, { status: 503 });
    }
    await ensurePulseSchema();
    const results = [];
    for (const it of items) {
      const rl = await rateLimit(`reply-draft:${user.id}`, { limit: 30, windowSeconds: 3600 });
      if (!rl.allowed) { results.push({ reviewId: it.reviewId, error: "Hourly limit reached. Try again later." }); continue; }
      const { rows } = await sql`
        SELECT m.app_name, m.developer, rv.rating, rv.title, rv.content FROM pulse_monitors m
        JOIN pulse_reviews rv ON rv.monitor_id = m.id AND rv.review_id = ${it.reviewId}
        WHERE m.id = ${it.monitorId} AND m.user_email = ${user.email} AND m.kind = 'mine' LIMIT 1
      `;
      const row = rows[0];
      if (!row) { results.push({ reviewId: it.reviewId, error: "Review not found." }); continue; }
      try {
        const reply = cleanReply(await generateText(buildReplyPrompt({ appName: row.app_name, developer: row.developer, review: row, tone: defaultToneFor(row.rating) })));
        results.push(reply ? { reviewId: it.reviewId, reply } : { reviewId: it.reviewId, error: "Couldn't write a draft." });
      } catch (err) {
        console.error("Bulk draft failed:", errorText(err, 500));
        results.push({ reviewId: it.reviewId, error: "Couldn't write a draft." });
      }
    }
    return Response.json({ results });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not draft replies: " + errorText(err) }, { status: 500 });
  }
}
