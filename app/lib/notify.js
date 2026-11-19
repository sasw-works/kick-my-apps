import { sql } from "@vercel/postgres";
import { ensureNotifySchema } from "./notifySchema.js";
import { sendWebhook } from "./webhook.js";

const siteUrl = (path = "") => `https://${process.env.CANONICAL_HOST || "kick-my-apps.vercel.app"}${path}`;

async function channelFor(email) {
  await ensureNotifySchema();
  const { rows } = await sql`SELECT kind, url FROM notification_channels WHERE user_email = ${email}`;
  return rows[0] || null;
}

async function deliver(email, channel, message) {
  const r = await sendWebhook(channel, message);
  await sql`
    UPDATE notification_channels SET last_sent_at = now(), last_ok = ${r.ok}, last_error = ${r.ok ? null : r.error}
    WHERE user_email = ${email}
  `;
  return r;
}

// Sends a message to the account's channel, if it has one. Never throws.
export async function notifyUser(email, message) {
  try {
    const channel = await channelFor(email);
    if (!channel) return { sent: false, reason: "no_channel" };
    const r = await deliver(email, channel, message);
    return { sent: r.ok, reason: r.ok ? undefined : "failed" };
  } catch {
    return { sent: false, reason: "error" };
  }
}

// Called after a check stored new alerts. One message per check, however many alerts: the
// monitor's own alerts switch decides (off = silent, the default for other people's apps).
export async function notifyAlerts(monitor, alerts) {
  if (!alerts?.length || monitor.alerts_enabled === false) return { sent: false, reason: "nothing_to_send" };
  const icon = (s) => (s === "critical" ? "🔴" : s === "warn" ? "🟠" : "🔵");
  const name = monitor.app_name || "Your app";
  return notifyUser(monitor.user_email, {
    title: `${name}: ${alerts.length === 1 ? "1 new alert" : `${alerts.length} new alerts`}`,
    text: alerts.map((a) => `${icon(a.severity)} ${a.title}${a.detail ? ` — ${a.detail}` : ""}`).join("\n"),
    link: siteUrl(`/console/pulse/${monitor.id}`),
  });
}

export async function notifyDigest(email, { appName, analytics }) {
  return notifyUser(email, {
    title: `${appName} — weekly review summary`,
    text: `Average ${analytics.avgRating} over the last ${analytics.totalReviews} reviews.` + (analytics.mostHelpfulNegative?.content ? `\nMost-voted negative review: ${String(analytics.mostHelpfulNegative.content).slice(0, 220)}` : ""),
    link: siteUrl("/console"),
  });
}
