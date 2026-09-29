import { sql } from "@vercel/postgres";
import { ensureSubscriptionsTable } from "../../../lib/subscriptionsSchema";

export const runtime = "nodejs";

// No sign-in here on purpose: the whole point of the link in an email is that it works for
// whoever opened that email, on whatever device, signed in or not -- that's what CAN-SPAM requires
// for a working opt-out. The token itself is the credential (24 random bytes, effectively
// unguessable), not the visitor's identity.

// GET only looks the subscription up -- it does NOT unsubscribe. Some email clients and security
// scanners "click" every link in an inbox to prescan it; if GET deleted the row, that alone would
// silently unsubscribe people who never clicked anything themselves. The confirmation page (which
// calls DELETE) is the actual opt-out action.
export async function GET(req) {
  await ensureSubscriptionsTable();
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") || "").trim();
  if (!token) return Response.json({ error: "Missing token." }, { status: 400 });

  const { rows } = await sql`
    SELECT app_name, email FROM subscriptions WHERE unsubscribe_token = ${token} LIMIT 1
  `;
  if (rows.length === 0) {
    // Already unsubscribed (link reused) or never existed -- either way, nothing more to do.
    return Response.json({ found: false });
  }
  return Response.json({ found: true, appName: rows[0].app_name, email: rows[0].email });
}

export async function DELETE(req) {
  await ensureSubscriptionsTable();
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") || "").trim();
  if (!token) return Response.json({ error: "Missing token." }, { status: 400 });

  const { rowCount } = await sql`DELETE FROM subscriptions WHERE unsubscribe_token = ${token}`;
  // Not found is still a success from the visitor's point of view: whatever they were subscribed
  // to, they no longer are (someone may have already used this exact link once before).
  return Response.json({ ok: true, removed: rowCount > 0 });
}
