import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../lib/pulse/schema";
import { rateLimit, tooManyRequests } from "../../../../../lib/rateLimit";
import { errorText } from "../../../../../lib/secrets";
import { generateText, aiConfigured } from "../../../../../lib/textModel";
import { buildReplyPrompt, cleanReply, TONES, defaultToneFor } from "../../../../../lib/replyDraft";

export const runtime = "nodejs";

// POST { reviewId, tone?, note? } -> { reply }: a draft answer to one review of the caller's OWN
// app. Competitors' reviews can't be answered (they aren't yours), so the monitor must be a
// top-level one. Nothing is posted anywhere: the draft is for the person to edit and use.
export async function POST(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`reply-draft:${user.id}`, { limit: 30, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

    const { id } = await params;
    if (!/^\d+$/.test(String(id))) return Response.json({ error: "Monitor not found." }, { status: 404 });
    let body;
    try { body = await req.json(); } catch { body = null; }
    const reviewId = typeof body?.reviewId === "string" ? body.reviewId : "";
    if (!reviewId || reviewId.length > 300) return Response.json({ error: "reviewId is required." }, { status: 400 });
    if (body?.note != null && typeof body.note !== "string") return Response.json({ error: "note must be text." }, { status: 400 });
    if (body?.tone != null && !TONES[body.tone]) return Response.json({ error: "Unknown tone." }, { status: 400 });

    await ensurePulseSchema();
    const { rows } = await sql`
      SELECT m.app_name, m.developer, rv.rating, rv.title, rv.content
      FROM pulse_monitors m
      JOIN pulse_reviews rv ON rv.monitor_id = m.id AND rv.review_id = ${reviewId}
      WHERE m.id = ${id} AND m.user_email = ${user.email} AND m.competitor_of IS NULL
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return Response.json({ error: "Review not found." }, { status: 404 });

    if (!aiConfigured()) {
      console.error("Reply draft unavailable: neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set.");
      return Response.json({ error: "Drafting replies isn't available right now." }, { status: 503 });
    }

    const tone = body?.tone || defaultToneFor(row.rating);
    const prompt = buildReplyPrompt({ appName: row.app_name, developer: row.developer, review: row, tone, note: body?.note });
    let reply;
    try {
      reply = cleanReply(await generateText(prompt));
    } catch (err) {
      console.error("Reply draft failed:", errorText(err, 500));
      return Response.json({ error: "Couldn't write a draft right now. Please try again." }, { status: 502 });
    }
    if (!reply) return Response.json({ error: "Couldn't write a draft right now. Please try again." }, { status: 502 });
    return Response.json({ reply, tone });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not draft a reply: " + errorText(err) }, { status: 500 });
  }
}
