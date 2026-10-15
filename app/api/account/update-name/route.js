import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { errorText } from "../../../lib/secrets";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const r = await rateLimit(`update-name:${user.id}`, { limit: 20, windowSeconds: 3600 });
  if (!r.allowed) return tooManyRequests(r);

  try {
    const { name } = await req.json();
    const clean = (name || "").trim().slice(0, 100);
    await sql`UPDATE users SET name = ${clean || null} WHERE id = ${user.id}`;
    return Response.json({ ok: true, name: clean || null });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not update your name: " + errorText(err) }, { status: 500 });
  }
}
