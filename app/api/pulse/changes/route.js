import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { ensurePulseSchema } from "../../../lib/pulse/schema";
import { errorText } from "../../../lib/secrets";

export const runtime = "nodejs";

// "What your rivals did": the change log of the caller's other-people's-apps, newest first.
// ?days=7 (1-90, default 7). Only the caller's own monitors are ever read.
export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    const raw = Number(new URL(req.url).searchParams.get("days"));
    const days = Number.isInteger(raw) && raw >= 1 && raw <= 90 ? raw : 7;
    const { rows } = await sql`
      SELECT c.id, c.kind, c.title, c.detail, c.detected_at, m.id AS monitor_id, m.app_name, m.icon_url
      FROM pulse_changes c JOIN pulse_monitors m ON m.id = c.monitor_id
      WHERE m.user_email = ${user.email} AND m.kind = 'other' AND c.detected_at >= now() - (${days}::int * interval '1 day')
      ORDER BY c.detected_at DESC, c.id DESC LIMIT 100
    `;
    const { rows: n } = await sql`SELECT count(*)::int AS c FROM pulse_monitors WHERE user_email = ${user.email} AND kind = 'other' AND status = 'active'`;
    return Response.json({ days, watching: n[0].c, changes: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load changes: " + errorText(err) }, { status: 500 });
  }
}
