import { sql } from "@vercel/postgres";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    await ensureTable();
    const { email, appName, storeUrl } = await req.json();

    if (!email || !EMAIL_RE.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!appName || !storeUrl) {
      return Response.json({ error: "appName and storeUrl are required." }, { status: 400 });
    }

    // Don't let the same email + same app subscribe twice.
    const { rows: existing } = await sql`
      SELECT id FROM subscriptions WHERE email = ${email} AND app_name = ${appName} LIMIT 1;
    `;
    if (existing.length > 0) {
      return Response.json({ ok: true, alreadySubscribed: true });
    }

    await sql`
      INSERT INTO subscriptions (email, app_name, store_url)
      VALUES (${email}, ${appName}, ${storeUrl});
    `;

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not create subscription: " + err.message }, { status: 500 });
  }
}
