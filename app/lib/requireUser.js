import { sql } from "@vercel/postgres";
import { auth } from "../../auth";
import { isAdminEmail } from "./isAdmin";

// The single gate every protected API route goes through.
//
// Returns { id, email, isAdmin } for a signed-in user, or null. Besides validating the session
// token it confirms the account still exists in the database: sessions are stateless JWTs that
// stay valid for weeks, so without this a deleted account (self-deleted, or removed by an admin)
// would keep working until the token expired.
//
// If the database itself is unreachable this throws (routes turn that into a 500) rather than
// returning null -- an outage should look like an outage, not silently sign everyone out.
export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!id || !email) return null;

  const { rows } = await sql`SELECT 1 FROM users WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return null;

  return { id, email, isAdmin: isAdminEmail(email) };
}

export function unauthorized() {
  return Response.json(
    { error: "Please sign in to continue.", code: "AUTH_REQUIRED" },
    { status: 401 }
  );
}
