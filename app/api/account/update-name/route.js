import { sql } from "@vercel/postgres";
import { auth } from "../../../../auth";

export const runtime = "nodejs";

export async function POST(req) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "You need to be signed in." }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const clean = (name || "").trim().slice(0, 100);
    await sql`UPDATE users SET name = ${clean || null} WHERE id = ${userId}`;
    return Response.json({ ok: true, name: clean || null });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not update your name: " + err.message }, { status: 500 });
  }
}
