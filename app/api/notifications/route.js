import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../lib/requireUser";
import { ensureInappSchema } from "../../lib/inapp";
import { rateLimit, tooManyRequests } from "../../lib/rateLimit";
import { errorText } from "../../lib/secrets";

export const runtime = "nodejs";

const shape = (r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, href: r.href, createdAt: r.created_at, read: !!r.read_at });

// The caller's newest notifications plus how many are still unread.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensureInappSchema();
    const { rows } = await sql`
      SELECT id, kind, title, body, href, created_at, read_at FROM app_notifications
      WHERE user_email = ${user.email} ORDER BY created_at DESC, id DESC LIMIT 30
    `;
    const { rows: c } = await sql`SELECT count(*)::int AS n FROM app_notifications WHERE user_email = ${user.email} AND read_at IS NULL`;
    return Response.json({ items: rows.map(shape), unread: c[0]?.n ?? 0 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load notifications: " + errorText(err) }, { status: 500 });
  }
}

// Mark as read: { all: true } or { ids: [1, 2] }. Only the caller's own rows are ever touched.
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const rl = await rateLimit(`notifications:read:${user.id}`, { limit: 300, windowSeconds: 3600 });
    if (!rl.allowed) return tooManyRequests(rl);
    const body = await req.json().catch(() => ({}));
    await ensureInappSchema();
    if (body.all === true) {
      await sql`UPDATE app_notifications SET read_at = now() WHERE user_email = ${user.email} AND read_at IS NULL`;
    } else if (Array.isArray(body.ids)) {
      const ids = body.ids.filter((n) => Number.isInteger(n)).slice(0, 100);
      if (ids.length) {
        await sql`UPDATE app_notifications SET read_at = now() WHERE user_email = ${user.email} AND read_at IS NULL AND id = ANY(${ids})`;
      }
    } else {
      return Response.json({ error: "Send { all: true } or { ids: [...] }." }, { status: 400 });
    }
    const { rows: c } = await sql`SELECT count(*)::int AS n FROM app_notifications WHERE user_email = ${user.email} AND read_at IS NULL`;
    return Response.json({ ok: true, unread: c[0]?.n ?? 0 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not update notifications: " + errorText(err) }, { status: 500 });
  }
}

// Clear the whole list.
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensureInappSchema();
    await sql`DELETE FROM app_notifications WHERE user_email = ${user.email}`;
    return Response.json({ ok: true, unread: 0 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not clear notifications: " + errorText(err) }, { status: 500 });
  }
}
