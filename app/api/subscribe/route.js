import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../lib/requireUser";
import { errorText } from "../../lib/secrets";
import { generateUnsubscribeToken } from "../../lib/unsubscribeToken";
import { ensureSubscriptionsTable } from "../../lib/subscriptionsSchema";

export const runtime = "nodejs";

export async function GET() {
  // Signed-in users manage their own subscriptions here (Account page). The email itself uses a
  // separate, token-based, no-login route -- see /api/subscribe/unsubscribe -- since a link in an
  // inbox has to work whether or not the person is currently signed in on that device.
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  await ensureSubscriptionsTable();
  const { rows } = await sql`
    SELECT id, app_name, store_url, created_at
    FROM subscriptions
    WHERE email = ${user.email}
    ORDER BY created_at DESC
  `;
  return Response.json({ subscriptions: rows });
}

export async function POST(req) {
  try {
    // Sign-in required, and the address is always the signed-in user's own: it comes from the
    // session, never from the request body, so nobody can subscribe someone else's inbox.
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await ensureSubscriptionsTable();
    const { appName, storeUrl } = await req.json();

    if (!appName || !storeUrl) {
      return Response.json({ error: "appName and storeUrl are required." }, { status: 400 });
    }

    // Don't let the same email + same app subscribe twice.
    const { rows: existing } = await sql`
      SELECT id FROM subscriptions WHERE email = ${user.email} AND app_name = ${appName} LIMIT 1;
    `;
    if (existing.length > 0) {
      return Response.json({ ok: true, alreadySubscribed: true });
    }

    await sql`
      INSERT INTO subscriptions (email, app_name, store_url, unsubscribe_token)
      VALUES (${user.email}, ${appName}, ${storeUrl}, ${generateUnsubscribeToken()});
    `;

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not create subscription: " + errorText(err) }, { status: 500 });
  }
}

export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  await ensureSubscriptionsTable();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ error: "id is required." }, { status: 400 });
  }

  // Owner-scoped, same as every other delete in the product: only your own subscriptions.
  const { rowCount } = await sql`DELETE FROM subscriptions WHERE id = ${id} AND email = ${user.email}`;
  if (rowCount === 0) {
    return Response.json({ error: "Subscription not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
