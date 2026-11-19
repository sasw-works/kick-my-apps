import { sql } from "@vercel/postgres";
import { generateUnsubscribeToken } from "./unsubscribeToken.js";

// Who gets the weekly product brief, and where. Opt-in: no row (or both switches off) = nothing is
// ever sent. The token is the one-click opt-out in every email (no sign-in needed).
let ensured = false;
export async function ensureBriefSchema() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS brief_settings (
      user_email TEXT PRIMARY KEY,
      email_on BOOLEAN NOT NULL DEFAULT false,
      chat_on BOOLEAN NOT NULL DEFAULT false,
      unsub_token TEXT NOT NULL,
      last_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS brief_settings_token_idx ON brief_settings (unsub_token)`;
  ensured = true;
}

export async function saveBriefSettings(email, { emailOn, chatOn }) {
  await ensureBriefSchema();
  const { rows } = await sql`
    INSERT INTO brief_settings (user_email, email_on, chat_on, unsub_token)
    VALUES (${email}, ${!!emailOn}, ${!!chatOn}, ${generateUnsubscribeToken()})
    ON CONFLICT (user_email) DO UPDATE SET
      email_on = COALESCE(${emailOn ?? null}::boolean, brief_settings.email_on),
      chat_on = COALESCE(${chatOn ?? null}::boolean, brief_settings.chat_on)
    RETURNING *
  `;
  return rows[0];
}
