import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { deleteUserData } from "../../../lib/deleteUserData";
import { errorText } from "../../../lib/secrets";

export const runtime = "nodejs";

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    await deleteUserData({ id: user.id, email: user.email });
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not delete your account: " + errorText(err) }, { status: 500 });
  }
}
