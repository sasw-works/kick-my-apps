import { sql } from "@vercel/postgres";

// One chat/webhook channel per account (Slack, Discord or a generic webhook). Created lazily like
// the other tables; the module-level flag means it runs once per server instance.
let ensured = false;
export async function ensureNotifySchema() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS notification_channels (
      user_email TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_sent_at TIMESTAMPTZ,
      last_ok BOOLEAN,
      last_error TEXT
    )
  `;
  ensured = true;
}
