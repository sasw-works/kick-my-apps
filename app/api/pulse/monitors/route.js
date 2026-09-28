import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { ensurePulseSchema } from "../../../lib/pulse/schema";
import { lookupApp, isAppId, isCountry, appIdFromStoreUrl, countryFromStoreUrl } from "../../../lib/pulse/appStore";
import { claimAndCheck } from "../../../lib/pulse/check";
import { pulseLimit } from "../../../lib/plans";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  await ensurePulseSchema();

  const { rows } = await sql`
    SELECT
      m.*,
      s.avg_rating, s.rating_count, s.version, s.taken_at AS last_snapshot_at,
      s.new_review_count, s.new_negative_count, s.reviews_ok,
      (SELECT COUNT(*)::int FROM pulse_alerts a WHERE a.monitor_id = m.id AND a.read_at IS NULL) AS unread_alerts
    FROM pulse_monitors m
    LEFT JOIN LATERAL (
      SELECT * FROM pulse_snapshots WHERE monitor_id = m.id ORDER BY taken_at DESC, id DESC LIMIT 1
    ) s ON true
    WHERE m.user_email = ${user.email}
    ORDER BY m.created_at ASC
  `;
  return Response.json({ monitors: rows, limit: pulseLimit(user) });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const r = await rateLimit(`pulse:add:${user.id}`, { limit: 10, windowSeconds: 3600 });
  if (!r.allowed) return tooManyRequests(r);

  await ensurePulseSchema();

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const appId = String(body.appId || appIdFromStoreUrl(body.storeUrl) || "").trim();
  const country = String(body.country || countryFromStoreUrl(body.storeUrl) || "us").toLowerCase();
  if (!isAppId(appId)) return Response.json({ error: "That doesn't look like a valid App Store app." }, { status: 400 });
  if (!isCountry(country)) return Response.json({ error: "Unsupported store." }, { status: 400 });

  // Checked before the plan limit: re-adding an app you already monitor should say so, not "your
  // plan is full" (which it would, confusingly, if this ran second and the account happened to be
  // at its limit already).
  const { rows: existing } = await sql`
    SELECT id FROM pulse_monitors WHERE user_email = ${user.email} AND app_id = ${appId} AND country = ${country} LIMIT 1
  `;
  if (existing.length > 0) return Response.json({ error: "You're already monitoring this app in this store." }, { status: 409 });

  const limit = pulseLimit(user);
  if (limit !== null) {
    const { rows } = await sql`SELECT COUNT(*)::int AS n FROM pulse_monitors WHERE user_email = ${user.email} AND status != 'deleted'`;
    if (rows[0].n >= limit) {
      return Response.json(
        { error: `Your plan includes ${limit} Pulse monitor${limit === 1 ? "" : "s"}. Remove one to add another, or upgrade.`, code: "PLAN_LIMIT" },
        { status: 403 }
      );
    }
  }

  const found = await lookupApp(appId, country);
  if (!found.ok) {
    return Response.json(
      { error: found.reason === "not_found" ? "That app couldn't be found in this store." : "The App Store didn't respond. Please try again." },
      { status: found.reason === "not_found" ? 404 : 502 }
    );
  }
  const app = found.app;

  const { rows } = await sql`
    INSERT INTO pulse_monitors (user_email, app_id, country, app_name, developer, icon_url, store_url)
    VALUES (${user.email}, ${appId}, ${country}, ${app.name}, ${app.developer}, ${app.iconUrl}, ${app.storeUrl})
    RETURNING *
  `;
  const monitor = rows[0];

  // First check runs immediately so the card has real numbers right away, not a "—" until tomorrow's
  // cron. It's a baseline (no alerts), so failure here just means it runs on the next daily pass.
  try {
    await claimAndCheck(monitor.id, { minIntervalSeconds: 0, reviewAttempts: 2 });
  } catch (err) {
    console.error("Initial Pulse check failed for monitor", monitor.id, err?.message);
  }

  const { rows: fresh } = await sql`SELECT * FROM pulse_monitors WHERE id = ${monitor.id}`;
  return Response.json({ monitor: fresh[0] });
}
