import { sql } from "@vercel/postgres";

let ensured = false;

// Created on first use, like the other tables. Children cascade from the monitor, so deleting a
// monitor (or a user's monitors) leaves nothing behind.
export async function ensurePulseSchema() {
  if (ensured) return;

  await sql`
    CREATE TABLE IF NOT EXISTS pulse_monitors (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      app_id TEXT NOT NULL,
      country TEXT NOT NULL,
      app_name TEXT NOT NULL,
      developer TEXT,
      icon_url TEXT,
      store_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_checked_at TIMESTAMPTZ,
      last_check_ok BOOLEAN,
      last_error TEXT,
      UNIQUE (user_email, app_id, country)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pulse_snapshots (
      id SERIAL PRIMARY KEY,
      monitor_id INTEGER NOT NULL REFERENCES pulse_monitors(id) ON DELETE CASCADE,
      taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      version TEXT,
      version_released_at TIMESTAMPTZ,
      avg_rating DOUBLE PRECISION,
      rating_count INTEGER,
      reviews_ok BOOLEAN NOT NULL DEFAULT true,
      new_review_count INTEGER NOT NULL DEFAULT 0,
      new_negative_count INTEGER NOT NULL DEFAULT 0,
      is_baseline BOOLEAN NOT NULL DEFAULT false
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS pulse_snapshots_monitor_idx ON pulse_snapshots (monitor_id, taken_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS pulse_reviews (
      monitor_id INTEGER NOT NULL REFERENCES pulse_monitors(id) ON DELETE CASCADE,
      review_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      version TEXT,
      reviewed_at TIMESTAMPTZ,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (monitor_id, review_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pulse_alerts (
      id SERIAL PRIMARY KEY,
      monitor_id INTEGER NOT NULL REFERENCES pulse_monitors(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      kind TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      read_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS pulse_alerts_user_idx ON pulse_alerts (user_email, created_at DESC)`;

  ensured = true;
}
