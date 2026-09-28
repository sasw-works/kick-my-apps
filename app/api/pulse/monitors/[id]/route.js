import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../lib/pulse/schema";

export const runtime = "nodejs";

async function ownedMonitor(id, email) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await sql`SELECT * FROM pulse_monitors WHERE id = ${id} AND user_email = ${email} LIMIT 1`;
  return rows[0] || null;
}

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  await ensurePulseSchema();
  const { id } = await params;

  if (!/^\d+$/.test(String(id))) return Response.json({ error: "Monitor not found." }, { status: 404 });

  // Same shape as the list endpoint: the monitor row alone has no rating/version/reviews_ok --
  // those live on its most recent snapshot.
  const { rows } = await sql`
    SELECT
      m.*,
      s.avg_rating, s.rating_count, s.version, s.taken_at AS last_snapshot_at,
      s.new_review_count, s.new_negative_count, s.reviews_ok
    FROM pulse_monitors m
    LEFT JOIN LATERAL (
      SELECT * FROM pulse_snapshots WHERE monitor_id = m.id ORDER BY taken_at DESC, id DESC LIMIT 1
    ) s ON true
    WHERE m.id = ${id} AND m.user_email = ${user.email}
    LIMIT 1
  `;
  const monitor = rows[0];
  if (!monitor) return Response.json({ error: "Monitor not found." }, { status: 404 });

  const { rows: snapshots } = await sql`
    SELECT id, taken_at, version, version_released_at, avg_rating, rating_count, reviews_ok, new_review_count, new_negative_count, is_baseline
    FROM pulse_snapshots WHERE monitor_id = ${id} ORDER BY taken_at ASC, id ASC
  `;
  const { rows: reviews } = await sql`
    SELECT review_id AS id, rating, title, content, version, reviewed_at, first_seen_at
    FROM pulse_reviews WHERE monitor_id = ${id} ORDER BY first_seen_at DESC LIMIT 50
  `;
  const { rows: alerts } = await sql`
    SELECT id, kind, severity, title, detail, created_at, read_at
    FROM pulse_alerts WHERE monitor_id = ${id} ORDER BY created_at DESC LIMIT 50
  `;

  await sql`UPDATE pulse_alerts SET read_at = now() WHERE monitor_id = ${id} AND read_at IS NULL`;

  return Response.json({ monitor, snapshots, reviews, alerts });
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const monitor = await ownedMonitor(id, user.email);
  if (!monitor) return Response.json({ error: "Monitor not found." }, { status: 404 });

  const { status } = await req.json().catch(() => ({}));
  if (!["active", "paused"].includes(status)) {
    return Response.json({ error: "status must be 'active' or 'paused'." }, { status: 400 });
  }
  await sql`UPDATE pulse_monitors SET status = ${status} WHERE id = ${id}`;
  return Response.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const { rowCount } = await sql`DELETE FROM pulse_monitors WHERE id = ${id} AND user_email = ${user.email}`;
  if (rowCount === 0) return Response.json({ error: "Monitor not found." }, { status: 404 });
  return Response.json({ ok: true });
}
