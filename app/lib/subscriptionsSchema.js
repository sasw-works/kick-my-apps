import { sql } from "@vercel/postgres";
import { generateUnsubscribeToken } from "./unsubscribeToken";

let ensured = false;

export async function ensureSubscriptionsTable() {
  if (ensured) return;

  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      app_name TEXT NOT NULL,
      store_url TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  // Every subscription needs a working, no-login-required opt-out link in its emails (CAN-SPAM
  // requires this for commercial email). backfillMissingTokens() covers rows created before this
  // column existed, so nothing is left permanently un-unsubscribable.
  await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT;`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_unsubscribe_token_idx ON subscriptions (unsubscribe_token);`;

  ensured = true;
}

export async function backfillMissingTokens() {
  const { rows } = await sql`SELECT id FROM subscriptions WHERE unsubscribe_token IS NULL`;
  for (const row of rows) {
    await sql`UPDATE subscriptions SET unsubscribe_token = ${generateUnsubscribeToken()} WHERE id = ${row.id}`;
  }
}
