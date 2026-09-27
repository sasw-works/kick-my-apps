import { sql } from "@vercel/postgres";
import { auth } from "../../../../auth";
import { isAdminEmail } from "../../../lib/isAdmin";
import { ensureScansSchema } from "../../../lib/ensureScansSchema";

export const runtime = "nodejs";

export async function GET(req) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) {
    return Response.json({ error: "email is required." }, { status: 400 });
  }

  try {
    await ensureScansSchema();
    const { rows } = await sql`
      SELECT id, app_name, health_score, bad_count, warn_count, good_count, store_url, icon_url, created_at
      FROM scans
      WHERE user_email = ${email}
      ORDER BY created_at DESC;
    `;
    return Response.json({ scans: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not retrieve scans: " + err.message }, { status: 500 });
  }
}
