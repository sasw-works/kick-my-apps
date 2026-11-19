import { sql } from "@vercel/postgres";
import { ensureBriefSchema } from "../../../lib/briefSchema";
import { rateLimit, getClientIp, tooManyRequests } from "../../../lib/rateLimit";

export const runtime = "nodejs";

// One-click opt-out from the weekly brief email, no sign-in (the token is the credential, like the
// digest's). GET only looks up, never changes anything: mail scanners "click" every link, and that
// must not unsubscribe anyone. The confirmation page calls DELETE.
async function gate(req) {
  const r = await rateLimit(`brief:unsub:ip:${getClientIp(req)}`, { limit: 30, windowSeconds: 60 });
  return r.allowed ? null : tooManyRequests(r);
}
const tokenOf = (req) => (new URL(req.url).searchParams.get("token") || "").trim();

export async function GET(req) {
  const limited = await gate(req); if (limited) return limited;
  await ensureBriefSchema();
  const token = tokenOf(req);
  if (!token) return Response.json({ error: "Missing token." }, { status: 400 });
  const { rows } = await sql`SELECT email_on FROM brief_settings WHERE unsub_token = ${token} LIMIT 1`;
  return Response.json(rows[0] ? { found: true, active: rows[0].email_on } : { found: false });
}

export async function DELETE(req) {
  const limited = await gate(req); if (limited) return limited;
  await ensureBriefSchema();
  const token = tokenOf(req);
  if (!token) return Response.json({ error: "Missing token." }, { status: 400 });
  const { rowCount } = await sql`UPDATE brief_settings SET email_on = false WHERE unsub_token = ${token}`;
  return Response.json({ ok: true, changed: rowCount > 0 });
}
