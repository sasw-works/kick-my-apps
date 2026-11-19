import { sql } from "@vercel/postgres";
import { ensureBriefSchema } from "../../../lib/briefSchema";
import { sendBrief } from "../../../lib/sendBrief";
import { errorText } from "../../../lib/secrets";

export const runtime = "nodejs";
export const maxDuration = 300;

// Sends the weekly brief to everyone who turned it on. Fails closed without CRON_SECRET (like the
// other cron routes). Each person is claimed with a single UPDATE (last_sent_at), so two
// overlapping runs can't both send, and if every channel fails the claim is given back.
export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    await ensureBriefSchema();
    const { rows: due } = await sql`
      SELECT user_email FROM brief_settings
      WHERE (email_on OR chat_on) AND (last_sent_at IS NULL OR last_sent_at < now() - interval '6 days')
      ORDER BY last_sent_at NULLS FIRST LIMIT 100
    `;
    const summary = { due: due.length, sent: 0, empty: 0, failed: 0 };
    for (const { user_email } of due) {
      const { rows: prev } = await sql`SELECT last_sent_at FROM brief_settings WHERE user_email = ${user_email}`;
      const { rows: claimed } = await sql`
        UPDATE brief_settings SET last_sent_at = now()
        WHERE user_email = ${user_email} AND (last_sent_at IS NULL OR last_sent_at < now() - interval '6 days')
        RETURNING *
      `;
      if (!claimed[0]) continue; // another run got there first
      const res = await sendBrief(user_email, claimed[0], { email: claimed[0].email_on, chat: claimed[0].chat_on });
      if (res.empty) { summary.empty++; continue; }
      const anySent = res.email === "sent" || res.chat === "sent";
      if (anySent) summary.sent++;
      else {
        summary.failed++;
        await sql`UPDATE brief_settings SET last_sent_at = ${prev[0]?.last_sent_at ?? null} WHERE user_email = ${user_email}`;
      }
    }
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Weekly brief failed: " + errorText(err) }, { status: 500 });
  }
}
