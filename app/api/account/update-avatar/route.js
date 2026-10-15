import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { errorText } from "../../../lib/secrets";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";

export const runtime = "nodejs";

// The client resizes/crops to a small square JPEG before sending, but we still cap the stored
// data URL server-side -- a worst-case ~2MB of base64 text per user is fine in a TEXT column,
// and keeps someone from scripting huge uploads straight at the API.
const MAX_DATA_URL_LENGTH = 2_000_000;
const ALLOWED_MIME = /^data:image\/(png|jpe?g|webp);base64,/;

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  // Each call can write up to ~2MB of base64 straight into Postgres -- bounded the same way the
  // size itself is bounded, so a script can't hammer this into a de facto storage/bandwidth abuse
  // vector even while staying under MAX_DATA_URL_LENGTH each time.
  const r = await rateLimit(`avatar:${user.id}`, { limit: 20, windowSeconds: 3600 });
  if (!r.allowed) return tooManyRequests(r);

  try {
    const { image } = await req.json();

    if (image === null) {
      // Explicit removal -- back to the initials avatar (or the OAuth photo, if any, is gone too).
      await sql`UPDATE users SET image = NULL WHERE id = ${user.id}`;
      return Response.json({ ok: true, image: null });
    }

    if (typeof image !== "string" || !ALLOWED_MIME.test(image)) {
      return Response.json({ error: "That doesn't look like a valid image." }, { status: 400 });
    }
    if (image.length > MAX_DATA_URL_LENGTH) {
      return Response.json({ error: "Image is too large. Please use a smaller photo." }, { status: 400 });
    }

    await sql`UPDATE users SET image = ${image} WHERE id = ${user.id}`;
    return Response.json({ ok: true, image });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not update your photo: " + errorText(err) }, { status: 500 });
  }
}
