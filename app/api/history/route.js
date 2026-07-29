import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS scans (
      id SERIAL PRIMARY KEY,
      app_name TEXT NOT NULL,
      health_score INTEGER NOT NULL,
      bad_count INTEGER DEFAULT 0,
      warn_count INTEGER DEFAULT 0,
      good_count INTEGER DEFAULT 0,
      result_json JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  // Daha önce oluşturulmuş tabloda result_json sütunu yoksa ekle (eski kurulumlar için güvenli göç).
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS result_json JSONB;`;
}

export async function POST(req) {
  try {
    await ensureTable();
    const { appName, healthScore, badCount, warnCount, goodCount, resultJson } = await req.json();

    if (!appName || typeof healthScore !== "number") {
      return Response.json({ error: "appName ve healthScore gerekli." }, { status: 400 });
    }

    const normalized = appName.trim();

    const { rows } = await sql`
      INSERT INTO scans (app_name, health_score, bad_count, warn_count, good_count, result_json)
      VALUES (${normalized}, ${healthScore}, ${badCount ?? 0}, ${warnCount ?? 0}, ${goodCount ?? 0}, ${JSON.stringify(resultJson ?? null)})
      RETURNING id;
    `;

    return Response.json({ ok: true, id: rows[0]?.id });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Geçmiş kaydedilemedi: " + err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const appName = (searchParams.get("appName") || "").trim();
    const all = searchParams.get("all");

    if (all) {
      // Karşılaştırma ekranı için: tüm uygulamalardaki son taramaların özet listesi.
      const { rows } = await sql`
        SELECT id, app_name, health_score, bad_count, warn_count, good_count, created_at
        FROM scans
        ORDER BY created_at DESC
        LIMIT 50;
      `;
      return Response.json({ scans: rows });
    }

    if (!appName) {
      return Response.json({ error: "appName gerekli." }, { status: 400 });
    }

    const { rows } = await sql`
      SELECT health_score, bad_count, warn_count, good_count, created_at
      FROM scans
      WHERE app_name = ${appName}
      ORDER BY created_at ASC
      LIMIT 20;
    `;

    return Response.json({ scans: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Geçmiş getirilemedi: " + err.message }, { status: 500 });
  }
}
