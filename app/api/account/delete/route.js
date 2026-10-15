import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { deleteUserData } from "../../../lib/deleteUserData";
import { errorText } from "../../../lib/secrets";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";

export const runtime = "nodejs";

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  // Destructive and a multi-table cascade -- this isn't about a legitimate caller ever hitting
  // it, it's a floor against a broken client or script retry-looping the request.
  const r = await rateLimit(`account-delete:${user.id}`, { limit: 5, windowSeconds: 3600 });
  if (!r.allowed) return tooManyRequests(r);

  try {
    await deleteUserData({ id: user.id, email: user.email });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not delete your account: " + errorText(err) }, { status: 500 });
  }
}
