import { sql } from "@vercel/postgres";
import { auth } from "../../../../auth";
import { errorText } from "../../../lib/secrets";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "You need to be signed in." }, { status: 401 });
  }

  try {
    const { rows } = await sql`
      SELECT id, name, email, image, created_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1;
    `;
    if (rows.length === 0) {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }
    return Response.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load your account: " + errorText(err) }, { status: 500 });
  }
}
