import { readSecret } from "./secrets.js";
import { getEmailFrom } from "./email.js";

// RESEND_API_BASE exists only so tests can point this at a local stand-in.
const base = () => process.env.RESEND_API_BASE || "https://api.resend.com";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, headers }) {
  const res = await fetch(`${base()}/emails`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${readSecret("RESEND_API_KEY")}` },
    body: JSON.stringify({ from: getEmailFrom(), to, subject, html, ...(headers ? { headers } : {}) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  return res.json();
}

export const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
