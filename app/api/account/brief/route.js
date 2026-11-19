import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { ensureBriefSchema, saveBriefSettings } from "../../../lib/briefSchema";
import { ensureNotifySchema } from "../../../lib/notifySchema";
import { buildBrief, briefToText } from "../../../lib/brief";
import { sendBrief } from "../../../lib/sendBrief";
import { emailConfigured } from "../../../lib/resend";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";
import { errorText } from "../../../lib/secrets";

export const runtime = "nodejs";

// The caller's weekly-brief settings (opt-in, off by default), a preview of this week's brief, and
// "send me one now". Email only ever goes to the signed-in address.
async function settingsOf(email) {
  await ensureBriefSchema();
  await ensureNotifySchema();
  const { rows } = await sql`SELECT * FROM brief_settings WHERE user_email = ${email}`;
  const { rows: ch } = await sql`SELECT 1 FROM notification_channels WHERE user_email = ${email}`;
  const s = rows[0];
  return {
    emailOn: !!s?.email_on,
    chatOn: !!s?.chat_on,
    hasChannel: ch.length > 0,
    emailAvailable: emailConfigured(),
    lastSentAt: s?.last_sent_at || null,
  };
}

export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const out = { settings: await settingsOf(user.email) };
    if (new URL(req.url).searchParams.get("preview") === "1") {
      const r = await rateLimit(`brief:preview:${user.id}`, { limit: 30, windowSeconds: 3600 });
      if (!r.allowed) return tooManyRequests(r);
      const brief = await buildBrief(user.email);
      out.preview = { ...brief, text: brief.empty ? "" : briefToText(brief) };
    }
    return Response.json(out);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load the brief: " + errorText(err) }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await req.json().catch(() => null);
    for (const f of ["emailOn", "chatOn"]) if (body?.[f] != null && typeof body[f] !== "boolean") return Response.json({ error: `${f} must be true or false.` }, { status: 400 });
    if (body?.emailOn == null && body?.chatOn == null) return Response.json({ error: "Nothing to change." }, { status: 400 });
    const current = await settingsOf(user.email);
    if (body.chatOn === true && !current.hasChannel) return Response.json({ error: "Save a Slack, Discord or webhook channel first.", code: "NO_CHANNEL" }, { status: 400 });
    await saveBriefSettings(user.email, { emailOn: body.emailOn, chatOn: body.chatOn });
    return Response.json({ settings: await settingsOf(user.email) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not save: " + errorText(err) }, { status: 500 });
  }
}

// POST { channel: "email" | "chat" }: send this week's brief now, to that channel only.
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`brief:send:${user.id}`, { limit: 5, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);
    const body = await req.json().catch(() => null);
    if (body?.channel !== "email" && body?.channel !== "chat") return Response.json({ error: "channel must be email or chat." }, { status: 400 });
    await settingsOf(user.email);
    const s = await saveBriefSettings(user.email, {}); // makes sure a row (and its opt-out token) exists
    const res = await sendBrief(user.email, s, { email: body.channel === "email", chat: body.channel === "chat" });
    if (res.empty) return Response.json({ error: "Nothing to report yet: add an app to Monitored apps or run a report first.", code: "EMPTY" }, { status: 409 });
    const state = res[body.channel];
    if (state === "sent") return Response.json({ ok: true });
    const msg = { not_configured: "Email isn't set up on this server.", no_channel: "Save a chat channel first.", failed: "Couldn't deliver it. Please try again." }[state] || "Couldn't deliver it.";
    return Response.json({ error: msg, code: state.toUpperCase() }, { status: state === "no_channel" ? 404 : state === "not_configured" ? 503 : 502 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not send: " + errorText(err) }, { status: 500 });
  }
}
