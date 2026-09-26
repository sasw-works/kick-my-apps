import { sql } from "@vercel/postgres";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS email_codes (
      email TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    )
  `;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits, no leading zero issues
}

// Creates (or replaces) a fresh code for this email and sends it via Resend.
// Throws if the email fails to send so the caller can surface a real error.
export async function sendEmailCode(email) {
  await ensureTable();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO email_codes (email, code, expires_at, attempts)
    VALUES (${email}, ${code}, ${expiresAt.toISOString()}, 0)
    ON CONFLICT (email) DO UPDATE SET code = ${code}, expires_at = ${expiresAt.toISOString()}, attempts = 0
  `;

  const from = process.env.EMAIL_FROM || "Kick My Apps <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `${code} is your Kick My Apps sign-in code`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color:#1A2B3B;">Sign in to Kick My Apps</h2>
          <p style="color:#697386;font-size:14px;">Enter this code to finish signing in. It expires in ${CODE_TTL_MINUTES} minutes.</p>
          <div style="margin:24px 0;padding:16px 24px;background:#F6F8FA;border-radius:12px;text-align:center;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1A2B3B;">${code}</span>
          </div>
          <p style="color:#9AA2B1;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error: ${res.status} ${text}`);
  }
}

// Returns true and consumes the code on success. Returns false (without throwing) on any
// mismatch/expiry/attempt-limit case, so the caller can show a generic "invalid code" message.
export async function verifyEmailCode(email, submittedCode) {
  await ensureTable();

  const { rows } = await sql`SELECT code, expires_at, attempts FROM email_codes WHERE email = ${email}`;
  const row = rows[0];
  if (!row) return false;

  if (row.attempts >= MAX_ATTEMPTS) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;

  if (row.code !== submittedCode) {
    await sql`UPDATE email_codes SET attempts = attempts + 1 WHERE email = ${email}`;
    return false;
  }

  // one-time use
  await sql`DELETE FROM email_codes WHERE email = ${email}`;
  return true;
}
