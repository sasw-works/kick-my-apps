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
      store_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  // Daha önce oluşturulmuş tabloda eksik sütunlar varsa ekle (eski kurulumlar için güvenli göç).
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS result_json JSONB;`;
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS store_url TEXT;`;
}

export async function POST(req) {
  try {
    await ensureTable();
    const { appName, healthScore, badCount, warnCount, goodCount, resultJson, storeUrl } = await req.json();

    if (!appName || typeof healthScore !== "number") {
      return Response.json({ error: "appName ve healthScore gerekli." }, { status: 400 });
    }

    const normalized = appName.trim();

    const { rows } = await sql`
      INSERT INTO scans (app_name, health_score, bad_count, warn_count, good_count, result_json, store_url)
      VALUES (${normalized}, ${healthScore}, ${badCount ?? 0}, ${warnCount ?? 0}, ${goodCount ?? 0}, ${JSON.stringify(resultJson ?? null)}, ${storeUrl || null})
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
    const apps = searchParams.get("apps");

    if (apps) {
      // Portfolio panosu: her uygulamanın en son taraması + toplam tarama sayısı.
      const { rows: latest } = await sql`
        SELECT DISTINCT ON (app_name) app_name, health_score, bad_count, warn_count, good_count, created_at
        FROM scans
        ORDER BY app_name, created_at DESC;
      `;
      const { rows: counts } = await sql`
        SELECT app_name, COUNT(*)::int AS scan_count
        FROM scans
        GROUP BY app_name;
      `;
      const countMap = Object.fromEntries(counts.map((c) => [c.app_name, c.scan_count]));
      const merged = latest
        .map((row) => ({ ...row, scan_count: countMap[row.app_name] ?? 1 }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return Response.json({ apps: merged });
    }

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
      SELECT id, health_score, bad_count, warn_count, good_count, created_at
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

