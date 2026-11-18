import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../lib/pulse/schema";
import { lookupApp, isAppId, isCountry, appIdFromStoreUrl, countryFromStoreUrl } from "../../../../../lib/pulse/appStore";
import { claimAndCheck } from "../../../../../lib/pulse/check";
import { summarizeApp, gapVersus } from "../../../../../lib/pulse/compare";
import { competitorsLimit } from "../../../../../lib/plans";
import { rateLimit, tooManyRequests } from "../../../../../lib/rateLimit";
import { errorText } from "../../../../../lib/secrets";

export const runtime = "nodejs";

// Competitors of one of the caller's own monitored apps. A competitor is itself a row in
// pulse_monitors (so the daily check covers it) with competitor_of pointing at the parent.
// Everything is scoped to the signed-in owner; the parent must be theirs and not itself a competitor.

async function ownParent(id, email) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await sql`
    SELECT * FROM pulse_monitors WHERE id = ${id} AND user_email = ${email} AND competitor_of IS NULL LIMIT 1
  `;
  return rows[0] || null;
}

async function loadSummary(monitorId) {
  const { rows: snaps } = await sql`
    SELECT taken_at, version, version_released_at, avg_rating, rating_count
    FROM pulse_snapshots WHERE monitor_id = ${monitorId} ORDER BY taken_at ASC, id ASC
  `;
  const { rows: reviews } = await sql`
    SELECT rating, title, content, version FROM pulse_reviews WHERE monitor_id = ${monitorId}
  `;
  return summarizeApp(snaps, reviews);
}

export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    const { id } = await params;
    const parent = await ownParent(id, user.email);
    if (!parent) return Response.json({ error: "Monitor not found." }, { status: 404 });

    const { rows: comps } = await sql`
      SELECT id, app_id, country, app_name, developer, icon_url, store_url, status, last_check_ok, last_error, created_at
      FROM pulse_monitors WHERE competitor_of = ${parent.id} AND user_email = ${user.email} ORDER BY created_at ASC
    `;
    const self = await loadSummary(parent.id);
    const competitors = [];
    for (const c of comps) {
      const summary = await loadSummary(c.id);
      competitors.push({ ...c, ...summary, ratingGap: gapVersus(self, summary) });
    }
    return Response.json({
      self: { id: parent.id, app_name: parent.app_name, icon_url: parent.icon_url, ...self },
      competitors,
      limit: competitorsLimit(user),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load competitors: " + errorText(err) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`pulse:competitor:${user.id}`, { limit: 20, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);
    await ensurePulseSchema();
    const { id } = await params;
    const parent = await ownParent(id, user.email);
    if (!parent) return Response.json({ error: "Monitor not found." }, { status: 404 });

    let body;
    try { body = await req.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
    const appId = String(body.appId || appIdFromStoreUrl(body.storeUrl) || "").trim();
    // Default to the parent's storefront: ratings only compare fairly within one country.
    const country = String(body.country || countryFromStoreUrl(body.storeUrl) || parent.country).toLowerCase();
    if (!isAppId(appId)) return Response.json({ error: "That doesn't look like a valid App Store app." }, { status: 400 });
    if (!isCountry(country)) return Response.json({ error: "Unsupported store." }, { status: 400 });
    if (appId === parent.app_id && country === parent.country) {
      return Response.json({ error: "That's your own app. Pick a competitor." }, { status: 400 });
    }

    const { rows: existing } = await sql`
      SELECT competitor_of FROM pulse_monitors WHERE user_email = ${user.email} AND app_id = ${appId} AND country = ${country} LIMIT 1
    `;
    if (existing.length > 0) {
      return Response.json(
        { error: existing[0].competitor_of === parent.id ? "You're already tracking this competitor." : "You're already monitoring this app (as one of your apps or another app's competitor)." },
        { status: 409 }
      );
    }

    const limit = competitorsLimit(user);
    if (limit !== null) {
      const { rows } = await sql`SELECT COUNT(*)::int AS n FROM pulse_monitors WHERE competitor_of = ${parent.id}`;
      if (rows[0].n >= limit) {
        return Response.json(
          { error: `Your plan includes ${limit} competitor${limit === 1 ? "" : "s"} per app. Remove one to add another, or upgrade.`, code: "PLAN_LIMIT" },
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
      INSERT INTO pulse_monitors (user_email, app_id, country, app_name, developer, icon_url, store_url, competitor_of)
      VALUES (${user.email}, ${appId}, ${country}, ${app.name}, ${app.developer}, ${app.iconUrl}, ${app.storeUrl}, ${parent.id})
      RETURNING id
    `;
    try {
      await claimAndCheck(rows[0].id, { minIntervalSeconds: 0, reviewAttempts: 2 });
    } catch (err) {
      console.error("Initial competitor check failed for monitor", rows[0].id, err?.message);
    }
    return Response.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not add the competitor: " + errorText(err) }, { status: 500 });
  }
}
