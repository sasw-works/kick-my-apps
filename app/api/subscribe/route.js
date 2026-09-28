import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../lib/requireUser";
import { errorText } from "../../lib/secrets";

export const runtime = "nodejs";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      app_name TEXT NOT NULL,
      store_url TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
}

export async function POST(req) {
  try {
    // Sign-in required, and the address is always the signed-in user's own: it comes from the
    // session, never from the request body, so nobody can subscribe someone else's inbox.
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await ensureTable();
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
      INSERT INTO subscriptions (email, app_name, store_url)
      VALUES (${user.email}, ${appName}, ${storeUrl});
    `;

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not create subscription: " + errorText(err) }, { status: 500 });
  }
}
