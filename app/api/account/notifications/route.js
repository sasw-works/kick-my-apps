import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { ensureNotifySchema } from "../../../lib/notifySchema";
import { validateWebhookUrl, sendWebhook } from "../../../lib/webhook";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";

export const runtime = "nodejs";

// The webhook URL is a secret (anyone holding it can post into the channel), so it is never sent
// back in full: only the host and the last few characters.
function mask(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/…${url.slice(-4)}`;
  } catch { return "…"; }
}
const shape = (r) => ({ kind: r.kind, urlMasked: mask(r.url), lastSentAt: r.last_sent_at, lastOk: r.last_ok, lastError: r.last_error });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  await ensureNotifySchema();
  const { rows } = await sql`SELECT * FROM notification_channels WHERE user_email = ${user.email}`;
  return Response.json({ channel: rows[0] ? shape(rows[0]) : null });
}

export async function PUT(req) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rl = await rateLimit(`notify:save:${user.id}`, { limit: 20, windowSeconds: 3600 });
  if (!rl.allowed) return tooManyRequests(rl);
  const body = await req.json().catch(() => ({}));
  const v = await validateWebhookUrl(body.url, body.kind);
  if (!v.ok) return Response.json({ error: v.error, code: "BAD_URL" }, { status: 400 });
  await ensureNotifySchema();
  const { rows } = await sql`
    INSERT INTO notification_channels (user_email, kind, url) VALUES (${user.email}, ${v.kind}, ${v.url})
    ON CONFLICT (user_email) DO UPDATE SET kind = EXCLUDED.kind, url = EXCLUDED.url, last_sent_at = NULL, last_ok = NULL, last_error = NULL
    RETURNING *
  `;
  return Response.json({ channel: shape(rows[0]) });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  await ensureNotifySchema();
  await sql`DELETE FROM notification_channels WHERE user_email = ${user.email}`;
  return Response.json({ ok: true });
}

// Sends a test message to the saved channel.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rl = await rateLimit(`notify:test:${user.id}`, { limit: 10, windowSeconds: 3600 });
  if (!rl.allowed) return tooManyRequests(rl);
  await ensureNotifySchema();
  const { rows } = await sql`SELECT * FROM notification_channels WHERE user_email = ${user.email}`;
  if (!rows[0]) return Response.json({ error: "Save a webhook first.", code: "NO_CHANNEL" }, { status: 404 });
  const r = await sendWebhook(rows[0], { title: "Kick My Apps test message", text: "Your channel is connected. Alerts for your apps will arrive here.", link: `https://${process.env.CANONICAL_HOST || "kick-my-apps.vercel.app"}/console/pulse` });
  await sql`UPDATE notification_channels SET last_sent_at = now(), last_ok = ${r.ok}, last_error = ${r.ok ? null : r.error} WHERE user_email = ${user.email}`;
  if (!r.ok) return Response.json({ error: r.error, code: "DELIVERY_FAILED" }, { status: 502 });
  return Response.json({ ok: true });
}
