import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS comparisons (
      id SERIAL PRIMARY KEY,
      scan_id_a INTEGER NOT NULL,
      scan_id_b INTEGER NOT NULL,
      app_name_a TEXT NOT NULL,
      app_name_b TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
}

export async function POST(req) {
  try {
    await ensureTable();
    const { scanIdA, scanIdB, appNameA, appNameB } = await req.json();
    if (!scanIdA || !scanIdB) {
      return Response.json({ error: "scanIdA ve scanIdB gerekli." }, { status: 400 });
    }
    const { rows } = await sql`
      INSERT INTO comparisons (scan_id_a, scan_id_b, app_name_a, app_name_b)
      VALUES (${scanIdA}, ${scanIdB}, ${appNameA || ""}, ${appNameB || ""})
      RETURNING id;
    `;
    return Response.json({ ok: true, id: rows[0]?.id });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Karşılaştırma kaydedilemedi: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ error: "id gerekli." }, { status: 400 });
    }
    await sql`DELETE FROM comparisons WHERE id = ${id};`;
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Silinemedi: " + err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const idsParam = (searchParams.get("ids") || "").trim();
    const comparisonId = searchParams.get("comparisonId");
    const all = searchParams.get("all");

    if (all) {
      const { rows } = await sql`
        SELECT c.id, c.app_name_a, c.app_name_b, c.created_at,
               sa.icon_url AS icon_url_a, sb.icon_url AS icon_url_b
        FROM comparisons c
        LEFT JOIN scans sa ON sa.id = c.scan_id_a
        LEFT JOIN scans sb ON sb.id = c.scan_id_b
        ORDER BY c.created_at DESC
        LIMIT 100;
      `;
      return Response.json({ comparisons: rows });
    }

    if (comparisonId) {
      const { rows } = await sql`
        SELECT scan_id_a, scan_id_b FROM comparisons WHERE id = ${comparisonId} LIMIT 1;
      `;
      if (rows.length === 0) {
        return Response.json({ error: "Karşılaştırma bulunamadı." }, { status: 404 });
      }
      const ids = [rows[0].scan_id_a, rows[0].scan_id_b];
      const { rows: scans } = await sql`
        SELECT id, app_name, health_score, bad_count, warn_count, good_count, result_json, created_at
        FROM scans
        WHERE id = ANY(${ids})
        ORDER BY created_at ASC;
      `;
      return Response.json({ scans });
    }

    const ids = idsParam
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n));

    if (ids.length === 0) {
      return Response.json({ error: "ids gerekli." }, { status: 400 });
    }

    const { rows } = await sql`
      SELECT id, app_name, health_score, bad_count, warn_count, good_count, result_json, created_at
      FROM scans
      WHERE id = ANY(${ids})
      ORDER BY created_at ASC;
    `;

    return Response.json({ scans: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Karşılaştırma verisi alınamadı: " + err.message }, { status: 500 });
  }
}
