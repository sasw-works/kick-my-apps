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
  // One kind of thing: a monitored app. It is either "mine" or "other" (someone else's app you keep
  // an eye on, e.g. a rival), and alerts_enabled says whether it raises alerts. Others default to
  // quiet (alerts about someone else's app are noise unless you ask for them) but that is a switch,
  // not a rule. Others show up in the side-by-side comparison on your apps' pages.
  await sql`ALTER TABLE pulse_monitors ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'mine'`;
  await sql`ALTER TABLE pulse_monitors ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN NOT NULL DEFAULT true`;
  // Older versions had "competitors" attached to a parent app via competitor_of. They become plain
  // monitors of kind "other" (quiet, as before) and are detached so deleting an app no longer
  // deletes them. The column is kept, unused, so older code running during a deploy doesn't break.
  await sql`ALTER TABLE pulse_monitors ADD COLUMN IF NOT EXISTS competitor_of INTEGER REFERENCES pulse_monitors(id) ON DELETE CASCADE`;
  await sql`UPDATE pulse_monitors SET kind = 'other', alerts_enabled = false, competitor_of = NULL WHERE competitor_of IS NOT NULL`;
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
  // What an app looked like at each check, so the next check can tell what changed: its listing
  // name, icon and screenshots (as short keys, not the images), price and release notes. NULL on
  // snapshots from before these existed, which means "unknown", never "changed".
  await sql`ALTER TABLE pulse_snapshots ADD COLUMN IF NOT EXISTS release_notes TEXT`;
  await sql`ALTER TABLE pulse_snapshots ADD COLUMN IF NOT EXISTS listing_name TEXT`;
  await sql`ALTER TABLE pulse_snapshots ADD COLUMN IF NOT EXISTS icon_key TEXT`;
  await sql`ALTER TABLE pulse_snapshots ADD COLUMN IF NOT EXISTS screens_key TEXT`;
  await sql`ALTER TABLE pulse_snapshots ADD COLUMN IF NOT EXISTS screens_count INTEGER`;
  await sql`ALTER TABLE pulse_snapshots ADD COLUMN IF NOT EXISTS price TEXT`;
  // A change log for other people's apps (rivals): one row per thing that changed at a check.
  await sql`
    CREATE TABLE IF NOT EXISTS pulse_changes (
      id SERIAL PRIMARY KEY,
      monitor_id INTEGER NOT NULL REFERENCES pulse_monitors(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS pulse_changes_user_idx ON pulse_changes (user_email, detected_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS pulse_alerts_user_idx ON pulse_alerts (user_email, created_at DESC)`;

  ensured = true;
}
