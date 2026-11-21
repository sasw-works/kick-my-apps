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
  // Public read-only link: NULL = not shared. The token is the only thing that grants access.
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS share_token TEXT;`;
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;`;
  // Owner's manual progress per finding category: { "contrast": "done", "cta": "wontfix" }.
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS finding_status JSONB;`;
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS visuals_json JSONB;`;
  // Screenshots added to a report afterwards (shrunk JPEG/PNG/WebP data URLs, at most 8). Only these are kept; images used for the first analysis never were.
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS screens_json JSONB;`;
  // Task progress per project (app), kept across re-scans. 'todo' is simply the absence of a row.
  await sql`CREATE TABLE IF NOT EXISTS task_status (
    user_email TEXT NOT NULL,
    project_key TEXT NOT NULL,
    finding_key TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_email, project_key, finding_key)
  );`;
  // Tasks that don't come from a report's findings: today, ones made from review complaint topics
  // ("Reviews: Crashes"). Their status lives in task_status like any other task (finding_key = task_key).
  await sql`CREATE TABLE IF NOT EXISTS custom_tasks (
    user_email TEXT NOT NULL,
    project_key TEXT NOT NULL,
    task_key TEXT NOT NULL,
    title TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warn',
    finding TEXT NOT NULL DEFAULT '',
    suggestion TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_email, project_key, task_key)
  );`;
  // A project the person removed from their Tasks list. The reports themselves stay; the project only comes back
  // if a report newer than hidden_at is saved (they analysed the app again).
  await sql`CREATE TABLE IF NOT EXISTS hidden_task_projects (
    user_email TEXT NOT NULL,
    project_key TEXT NOT NULL,
    hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_email, project_key)
  );`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS scans_share_token_idx ON scans (share_token) WHERE share_token IS NOT NULL;`;

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
