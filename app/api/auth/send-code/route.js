import { sendEmailCode } from "../../../lib/emailCode";
import { ensureAuthSchema } from "../../../lib/ensureAuthSchema";
import { rateLimit, getClientIp, tooManyRequests } from "../../../lib/rateLimit";
import { errorText } from "../../../lib/secrets";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    const { email } = await req.json();
    const clean = (email || "").trim().toLowerCase();

    if (!EMAIL_RE.test(clean)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    // Every request emails a stranger and spends Resend quota, and each new code also resets that
    // address's guess counter -- so unlimited sends would mean unlimited guesses. Bounded per
    // address (one a minute, five an hour: at most 25 guesses an hour in total) and per IP.
    const ip = getClientIp(req);
    for (const [key, opts] of [
      [`sendcode:cooldown:${clean}`, { limit: 1, windowSeconds: 60 }],
      [`sendcode:hour:${clean}`, { limit: 5, windowSeconds: 3600 }],
      [`sendcode:ip:${ip}`, { limit: 20, windowSeconds: 3600 }],
    ]) {
      const r = await rateLimit(key, opts);
      if (!r.allowed) return tooManyRequests(r);
    }

    await ensureAuthSchema();
    await sendEmailCode(clean);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not send the code: " + errorText(err) }, { status: 500 });
  }
}
