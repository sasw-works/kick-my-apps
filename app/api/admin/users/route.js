import { sql } from "@vercel/postgres";
import { auth } from "../../../../auth";
import { isAdminEmail } from "../../../lib/isAdmin";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAdminEmail(email)) return null;
  return email;
}

export async function GET() {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const { rows } = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.image,
        u.created_at,
        u.last_login,
        COUNT(s.id)::int AS scan_count
      FROM users u
      LEFT JOIN scans s ON s.user_email = u.email
      GROUP BY u.id, u.name, u.email, u.image, u.created_at, u.last_login
      ORDER BY u.created_at DESC NULLS LAST;
    `;
    return Response.json({ users: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not retrieve users: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const { userId, email } = await req.json();
    if (!userId || !email) {
      return Response.json({ error: "userId and email are required." }, { status: 400 });
    }
    if (email.toLowerCase() === adminEmail.toLowerCase()) {
      return Response.json({ error: "You can't delete your own admin account." }, { status: 400 });
    }

    // Delete the user's auth records (accounts/sessions cascade via userId) and their scans
    // (scans are only linked by email, not a foreign key, so that's a separate delete).
    await sql`DELETE FROM accounts WHERE "userId" = ${userId}`;
    await sql`DELETE FROM sessions WHERE "userId" = ${userId}`;
    await sql`DELETE FROM scans WHERE user_email = ${email}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not delete user: " + err.message }, { status: 500 });
  }
}
