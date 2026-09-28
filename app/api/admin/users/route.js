import { sql } from "@vercel/postgres";
import { auth } from "../../../../auth";
import { isAdminEmail } from "../../../lib/isAdmin";
import { ensureScansSchema } from "../../../lib/ensureScansSchema";
import { deleteUserData } from "../../../lib/deleteUserData";
import { errorText } from "../../../lib/secrets";

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
    await ensureScansSchema();
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
    return Response.json({ error: "Could not retrieve users: " + errorText(err) }, { status: 500 });
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

    await deleteUserData({ id: userId, email });

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not delete user: " + errorText(err) }, { status: 500 });
  }
}
