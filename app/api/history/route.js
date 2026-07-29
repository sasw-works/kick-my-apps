import { sql } from "@vercel/postgres";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS scans (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      app_name TEXT NOT NULL,
      health_score INTEGER NOT NULL,
      bad_count INTEGER DEFAULT 0,
      warn_count INTEGER DEFAULT 0,
      good_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
    }

    await ensureTable();
    const { appName, healthScore, badCount, warnCount, goodCount } = await req.json();

    if (!appName || typeof healthScore !== "number") {
      return Response.json({ error: "appName ve healthScore gerekli." }, { status: 400 });
    }

    const normalized = appName.trim();

    await sql`
      INSERT INTO scans (user_id, app_name, health_score, bad_count, warn_count, good_count)
      VALUES (${userId}, ${normalized}, ${healthScore}, ${badCount ?? 0}, ${warnCount ?? 0}, ${goodCount ?? 0});
    `;

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Geçmiş kaydedilemedi: " + err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Giriş yapmalısın." }, { status: 401 });
    }

    await ensureTable();
    const { searchParams } = new URL(req.url);
    const appName = (searchParams.get("appName") || "").trim();

    if (!appName) {
      return Response.json({ error: "appName gerekli." }, { status: 400 });
    }

    const { rows } = await sql`
      SELECT health_score, bad_count, warn_count, good_count, created_at
      FROM scans
      WHERE user_id = ${userId} AND app_name = ${appName}
      ORDER BY created_at ASC
      LIMIT 20;
    `;

    return Response.json({ scans: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Geçmiş getirilemedi: " + err.message }, { status: 500 });
  }
}
