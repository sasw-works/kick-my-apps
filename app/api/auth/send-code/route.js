import { sendEmailCode } from "../../../lib/emailCode";
import { ensureAuthSchema } from "../../../lib/ensureAuthSchema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    const { email } = await req.json();
    const clean = (email || "").trim().toLowerCase();

    if (!EMAIL_RE.test(clean)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    await ensureAuthSchema();
    await sendEmailCode(clean);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not send the code: " + err.message }, { status: 500 });
  }
}
