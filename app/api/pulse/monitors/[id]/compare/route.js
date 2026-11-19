import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../lib/pulse/schema";
import { storeOfAppId } from "../../../../../lib/pulse/appStore";
import { summarizeApp, gapVersus } from "../../../../../lib/pulse/compare";
import { errorText } from "../../../../../lib/secrets";

export const runtime = "nodejs";

// Side-by-side comparison for one of the caller's own apps (kind "mine"): every app they monitor as
// "other" in the same store and country. Ratings and review volumes only compare fairly within one
// store and one storefront, so the rest are not shown, just counted in `hidden`.
// Read-only: adding an app to compare is just adding a monitor of kind "other".

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
    if (!/^\d+$/.test(String(id))) return Response.json({ error: "Monitor not found." }, { status: 404 });
    const { rows: own } = await sql`
      SELECT * FROM pulse_monitors WHERE id = ${id} AND user_email = ${user.email} AND kind = 'mine' LIMIT 1
    `;
    const parent = own[0];
    if (!parent) return Response.json({ error: "Monitor not found." }, { status: 404 });

    const { rows: all } = await sql`
      SELECT id, app_id, country, app_name, developer, icon_url, store_url, status, last_check_ok, last_error, alerts_enabled, created_at
      FROM pulse_monitors WHERE user_email = ${user.email} AND kind = 'other' AND status != 'deleted' ORDER BY created_at ASC
    `;
    const comparable = all.filter((c) => c.country === parent.country && storeOfAppId(c.app_id) === storeOfAppId(parent.app_id));
    const self = await loadSummary(parent.id);
    const others = [];
    for (const c of comparable) {
      const summary = await loadSummary(c.id);
      others.push({ ...c, ...summary, ratingGap: gapVersus(self, summary) });
    }
    return Response.json({
      self: { id: parent.id, app_name: parent.app_name, icon_url: parent.icon_url, ...self },
      others,
      hidden: all.length - comparable.length,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load the comparison: " + errorText(err) }, { status: 500 });
  }
}
