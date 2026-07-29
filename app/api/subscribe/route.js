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
      return Response.json({ error: "Geçerli bir e-posta adresi gir." }, { status: 400 });
    }
    if (!appName || !storeUrl) {
      return Response.json({ error: "appName ve storeUrl gerekli." }, { status: 400 });
    }

    // Aynı e-posta + aynı uygulama için tekrar kayıt olmasın.
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
    return Response.json({ error: "Kayıt oluşturulamadı: " + err.message }, { status: 500 });
  }
}
