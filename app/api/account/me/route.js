import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { errorText } from "../../../lib/secrets";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const { rows } = await sql`
      SELECT id, name, email, image, created_at
      FROM users
      WHERE id = ${user.id}
      LIMIT 1;
    `;
    if (rows.length === 0) {
      // getCurrentUser() already confirms the row exists, so this only happens if it was deleted
      // in the instant between that check and this query -- vanishingly rare, but still a real
      // "not found" rather than a bug if it ever does.
      return Response.json({ error: "Account not found." }, { status: 404 });
    }
    return Response.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load your account: " + errorText(err) }, { status: 500 });
  }
}
