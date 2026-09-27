import { sql } from "@vercel/postgres";
import { auth } from "../../../../auth";

export const runtime = "nodejs";

export async function DELETE() {
  const session = await auth();
  const email = session?.user?.email;
  const userId = session?.user?.id;

  if (!email || !userId) {
    return Response.json({ error: "You need to be signed in to delete your account." }, { status: 401 });
  }

  try {
    await sql`DELETE FROM accounts WHERE "userId" = ${userId}`;
    await sql`DELETE FROM sessions WHERE "userId" = ${userId}`;
    await sql`DELETE FROM scans WHERE user_email = ${email}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not delete your account: " + err.message }, { status: 500 });
  }
}
