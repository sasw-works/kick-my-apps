import { sql } from "@vercel/postgres";
import { ensureScansSchema } from "../../../lib/ensureScansSchema";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";
import { errorText } from "../../../lib/secrets";
import { generateShareToken } from "../../../lib/shareToken";

export const runtime = "nodejs";

// Owner-only management of a report's public link. Only the person who owns the report can create
// or revoke it -- not even an admin, since sharing someone else's report would publish their data.

async function owner(req) {
  const user = await getCurrentUser();
  if (!user) return { res: unauthorized() };
  const r = await rateLimit(`share:${user.id}`, { limit: 60, windowSeconds: 3600 });
  if (!r.allowed) return { res: tooManyRequests(r) };
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return { res: Response.json({ error: "id is required." }, { status: 400 }) };
  }
  await ensureScansSchema();
  return { user, id };
}

const notFound = () => Response.json({ error: "Report not found." }, { status: 404 });

export async function GET(req) {
  try {
    const o = await owner(req);
    if (o.res) return o.res;
    const { rows } = await sql`SELECT share_token FROM scans WHERE id = ${o.id} AND user_email = ${o.user.email}`;
    if (!rows[0]) return notFound();
    return Response.json({ shared: !!rows[0].share_token, token: rows[0].share_token || null });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not read share status: " + errorText(err) }, { status: 500 });
  }
}

// Idempotent: sharing an already-shared report returns the same link rather than rotating it.
export async function POST(req) {
  try {
    const o = await owner(req);
    if (o.res) return o.res;
    const { rows } = await sql`
      UPDATE scans SET share_token = COALESCE(share_token, ${generateShareToken()}),
                       shared_at = COALESCE(shared_at, now())
      WHERE id = ${o.id} AND user_email = ${o.user.email}
      RETURNING share_token;
    `;
    if (!rows[0]) return notFound();
    return Response.json({ shared: true, token: rows[0].share_token });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not create the link: " + errorText(err) }, { status: 500 });
  }
}

// Revoking clears the token; creating a link again later issues a brand-new one.
export async function DELETE(req) {
  try {
    const o = await owner(req);
    if (o.res) return o.res;
    const { rowCount } = await sql`
      UPDATE scans SET share_token = NULL, shared_at = NULL WHERE id = ${o.id} AND user_email = ${o.user.email};
    `;
    if (!rowCount) return notFound();
    return Response.json({ shared: false, token: null });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not stop sharing: " + errorText(err) }, { status: 500 });
  }
}
