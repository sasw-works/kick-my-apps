import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { claimAndCheck, secondsUntilCheckAllowed } from "../../../../../lib/pulse/check";
import { rateLimit, tooManyRequests } from "../../../../../lib/rateLimit";

export const runtime = "nodejs";

// Manual "check now" shares the same minimum interval as the daily cron, so someone can't force
// their monitor to the front of the line, or bypass the Apple rate limit, by mashing the button.
const MIN_INTERVAL_SECONDS = 20 * 3600;

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;

  if (!/^\d+$/.test(String(id))) return Response.json({ error: "Monitor not found." }, { status: 404 });
  const { rows } = await sql`SELECT id FROM pulse_monitors WHERE id = ${id} AND user_email = ${user.email} LIMIT 1`;
  if (rows.length === 0) return Response.json({ error: "Monitor not found." }, { status: 404 });

  const r = await rateLimit(`pulse:check:${user.id}`, { limit: 20, windowSeconds: 3600 });
  if (!r.allowed) return tooManyRequests(r);

  const result = await claimAndCheck(id, { minIntervalSeconds: MIN_INTERVAL_SECONDS, reviewAttempts: 2 });
  if (result.skipped) {
    const wait = await secondsUntilCheckAllowed(id, { minIntervalSeconds: MIN_INTERVAL_SECONDS });
    return Response.json(
      { error: "This monitor was checked recently. Try again later.", code: "TOO_SOON", retryAfterSeconds: wait },
      { status: 429 }
    );
  }
  return Response.json(result);
}
