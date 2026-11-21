import { sql } from "@vercel/postgres";

// The bell in the Console header: one row per thing the signed-in person should hear about
// (a report finished, a monitor raised an alert, a rival changed its listing, the weekly brief is
// ready). Created lazily like the other tables. This is separate from notification_channels, which
// is the optional Slack/Discord/webhook delivery of the same kinds of events.
let ensured = false;
export async function ensureInappSchema() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS app_notifications (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      href TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      read_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS app_notifications_user_idx ON app_notifications (user_email, created_at DESC)`;
  ensured = true;
}

// Keep the list bounded: the newest KEEP rows per person survive.
const KEEP = 100;

// Adds one notification. Best effort: a failure here must never break the action that caused it.
export async function addNotification(email, { kind, title, body = null, href = null }) {
  if (!email || !kind || !title) return false;
  try {
    await ensureInappSchema();
    const t = String(title).slice(0, 200);
    const b = body ? String(body).slice(0, 500) : null;
    await sql`INSERT INTO app_notifications (user_email, kind, title, body, href) VALUES (${email}, ${kind}, ${t}, ${b}, ${href})`;
    await sql`
      DELETE FROM app_notifications WHERE user_email = ${email}
        AND id NOT IN (SELECT id FROM app_notifications WHERE user_email = ${email} ORDER BY created_at DESC, id DESC LIMIT ${KEEP})
    `;
    return true;
  } catch {
    return false;
  }
}
