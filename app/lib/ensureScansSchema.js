import { sql } from "@vercel/postgres";

let ensured = false;

export async function ensureScansSchema() {
  if (ensured) return;

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
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS result_json JSONB;`;
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS store_url TEXT;`;
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS icon_url TEXT;`;
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_email TEXT;`;

  ensured = true;
}

let comparisonsEnsured = false;

// Comparisons used to be created inline in two different routes (with no owner at all).
// One shared definition now, including the owner column every comparison query filters on.
export async function ensureComparisonsSchema() {
  if (comparisonsEnsured) return;

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
  await sql`ALTER TABLE comparisons ADD COLUMN IF NOT EXISTS user_email TEXT;`;

  comparisonsEnsured = true;
}
