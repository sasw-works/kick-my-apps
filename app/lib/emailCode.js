import { randomInt, timingSafeEqual } from "node:crypto";
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

// crypto.randomInt, not Math.random: Math.random's output is predictable from a few observed
// values, and a sign-in code is a secret.
function generateCode() {
  return String(randomInt(100000, 1000000)); // 6 digits, never a leading zero
}

function sameCode(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
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
//
// Each check first *claims an attempt* in a single UPDATE (only while the code is unexpired and
// under the limit), and only then compares. Checking the counter with a SELECT and bumping it later
// let a burst of parallel guesses all read "0 attempts used" and each get a free try -- 40 parallel
// guesses were measured getting 10 attempts through against a limit of 5. Doing it in one statement
// makes the database serialize them, so at most MAX_ATTEMPTS ever reach the comparison.
export async function verifyEmailCode(email, submittedCode) {
  await ensureTable();

  const { rows } = await sql`
    UPDATE email_codes SET attempts = attempts + 1
    WHERE email = ${email} AND attempts < ${MAX_ATTEMPTS} AND expires_at > now()
    RETURNING code
  `;
  if (rows.length === 0) return false;
  if (!sameCode(rows[0].code, submittedCode)) return false;

  // One-time use, and atomic: if two correct submissions race, only one deletes the row and wins.
  const { rowCount } = await sql`DELETE FROM email_codes WHERE email = ${email} AND code = ${rows[0].code}`;
  return rowCount === 1;
}
