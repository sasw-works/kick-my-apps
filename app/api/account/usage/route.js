import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { reportsLimit, comparisonsLimit, pulseLimit } from "../../../lib/plans";
import { countReportsThisMonth, countComparisonsThisMonth } from "../../../lib/usage";
import { ensureScansSchema } from "../../../lib/ensureScansSchema";
import { ensurePulseSchema } from "../../../lib/pulse/schema";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

// Everything the Account page's usage cards need, in one round trip: this month's reports and
// comparisons (reset on the 1st, matching the plan limits) and the current Pulse monitor count
// (not month-scoped -- monitors are an ongoing count, not a per-month action like a report).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  await ensureScansSchema();
  await ensurePulseSchema();

  const [reportsUsed, comparisonsUsed, pulseRows] = await Promise.all([
    countReportsThisMonth(user.email),
    countComparisonsThisMonth(user.email),
    sql`SELECT COUNT(*)::int AS n FROM pulse_monitors WHERE user_email = ${user.email} AND status != 'deleted'`,
  ]);

  return Response.json({
    reports: { used: reportsUsed, limit: reportsLimit(user) },
    comparisons: { used: comparisonsUsed, limit: comparisonsLimit(user) },
    pulse: { used: pulseRows.rows[0].n, limit: pulseLimit(user) },
  });
}
