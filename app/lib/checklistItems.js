import { sql } from "@vercel/postgres";

// The Checklist page's per-app part: findings the person pinned from a report ("Add to Checklist")
// and items they typed themselves. Open critical tasks are NOT stored here: they are read live from
// Tasks, so ticking one in Tasks is all it takes. Pinned findings also take their state from Tasks.
// Created lazily like the other tables.
let ensured = false;
export async function ensureChecklistSchema() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      project_key TEXT NOT NULL,
      kind TEXT NOT NULL,
      finding_key TEXT,
      title TEXT NOT NULL,
      checked BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS checklist_items_user_idx ON checklist_items (user_email, project_key, created_at)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS checklist_items_pin_uniq ON checklist_items (user_email, project_key, finding_key) WHERE kind = 'pin'`;
  ensured = true;
}

export const MAX_CUSTOM_PER_PROJECT = 50;
export const MAX_ITEMS_PER_USER = 400;
export const MAX_TITLE = 160;
