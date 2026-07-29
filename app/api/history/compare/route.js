import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = (searchParams.get("ids") || "").trim();
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
