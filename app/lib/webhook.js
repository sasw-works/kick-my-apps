import dns from "node:dns/promises";
import net from "node:net";

// Outbound chat/webhook delivery. The URL is typed in by a user, so the server must never be
// talked into calling something inside its own network: https only, no credentials in the URL,
// Slack/Discord URLs must really be on those services, and any other host must resolve to public
// addresses only. Redirects are never followed (a public host could bounce us to a private one).
//
// WEBHOOK_ALLOW_PRIVATE=1 lifts the host/https rules; it exists only so tests can use a local
// receiver and must never be set in production.

export const KINDS = ["slack", "discord", "generic"];
const allowPrivate = () => process.env.WEBHOOK_ALLOW_PRIVATE === "1";

export function detectKind(url) {
  let u;
  try { u = new URL(url); } catch { return "generic"; }
  if (u.hostname === "hooks.slack.com") return "slack";
  if ((u.hostname === "discord.com" || u.hostname === "discordapp.com" || u.hostname.endsWith(".discord.com")) && u.pathname.startsWith("/api/webhooks/")) return "discord";
  return "generic";
}

export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x === "::1" || x === "::") return true;
    if (x.startsWith("::ffff:")) return isPrivateAddress(x.slice(7));
    return x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb");
  }
  return true;
}

// Returns { ok: true, url, kind } or { ok: false, error } (error text is safe to show to the user).
export async function validateWebhookUrl(input, wantedKind, { resolve = true } = {}) {
  const raw = String(input ?? "").trim();
  if (!raw || raw.length > 600) return { ok: false, error: "Enter a webhook URL." };
  let u;
  try { u = new URL(raw); } catch { return { ok: false, error: "That doesn't look like a valid URL." }; }
  if (u.username || u.password) return { ok: false, error: "The URL must not contain a username or password." };
  const detected = detectKind(raw);
  const kind = wantedKind && KINDS.includes(wantedKind) ? wantedKind : detected;
  if (!allowPrivate()) {
    if (u.protocol !== "https:") return { ok: false, error: "The webhook URL must start with https://." };
    if (kind === "slack" && detected !== "slack") return { ok: false, error: "A Slack webhook URL starts with https://hooks.slack.com/." };
    if (kind === "discord" && detected !== "discord") return { ok: false, error: "A Discord webhook URL starts with https://discord.com/api/webhooks/." };
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return { ok: false, error: "That address isn't allowed." };
    if (net.isIP(host)) {
      if (isPrivateAddress(host)) return { ok: false, error: "That address isn't allowed." };
    } else if (resolve) {
      try {
        const addrs = await dns.lookup(host, { all: true });
        if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) return { ok: false, error: "That address isn't allowed." };
      } catch {
        return { ok: false, error: "Couldn't find that host." };
      }
    }
  } else if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { ok: false, error: "The webhook URL must start with https://." };
  }
  return { ok: true, url: u.toString(), kind };
}

// message: { title, text, link? }
export function buildPayload(kind, { title, text, link }) {
  const t = String(title || "").slice(0, 200);
  const body = String(text || "").slice(0, 1500);
  if (kind === "slack") {
    return { text: `*${t}*\n${body}${link ? `\n<${link}|Open in Kick My Apps>` : ""}` };
  }
  if (kind === "discord") {
    return { content: `**${t}**\n${body}${link ? `\n${link}` : ""}`.slice(0, 1900) };
  }
  return { source: "kick-my-apps", title: t, text: body, link: link || null, sentAt: new Date().toISOString() };
}

// Re-checks the address at send time too (DNS can change after it was saved). Never throws.
export async function sendWebhook({ url, kind }, message, { timeoutMs = 4000 } = {}) {
  try {
    const v = await validateWebhookUrl(url, kind);
    if (!v.ok) return { ok: false, error: v.error };
    const res = await fetch(v.url, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "kick-my-apps-webhook" },
      body: JSON.stringify(buildPayload(v.kind, message)),
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status >= 300) return { ok: false, error: `The receiver answered ${res.status}.` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.name === "TimeoutError" ? "The receiver took too long to answer." : "Couldn't reach the receiver." };
  }
}
