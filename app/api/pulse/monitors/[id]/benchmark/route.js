import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../lib/pulse/schema";
import { rateLimit, tooManyRequests } from "../../../../../lib/rateLimit";
import { isAppStoreId } from "../../../../../lib/pulse/appStore";
import { fetchCategoryPeers, computeBenchmark } from "../../../../../lib/categoryBenchmark";

export const runtime = "nodejs";

// GET -> how the caller's own App Store app compares with its category's top free apps in the same
// storefront. Read live from Apple; nothing is stored.
export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    const { id } = await params;
    if (!/^\d+$/.test(String(id))) return Response.json({ error: "Monitor not found." }, { status: 404 });
    const { rows } = await sql`SELECT app_id, country FROM pulse_monitors WHERE id = ${id} AND user_email = ${user.email} AND kind = 'mine' LIMIT 1`;
    const m = rows[0];
    if (!m) return Response.json({ error: "Monitor not found." }, { status: 404 });
    if (!isAppStoreId(m.app_id)) return Response.json({ supported: false, reason: "Category comparison works for App Store apps for now." });
    const r = await rateLimit(`pulse:benchmark:${user.id}`, { limit: 30, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

    const res = await fetchCategoryPeers(m.app_id, m.country);
    if (!res.ok) {
      const msg = { not_found: "Apple doesn't list this app in this country.", no_category: "Apple didn't give a category for this app.", no_peers: "No comparable apps found in this category.", unavailable: "Couldn't reach Apple right now. Try again later." }[res.reason];
      return Response.json({ error: msg || "Could not compare." }, { status: res.reason === "unavailable" ? 502 : 200 });
    }
    return Response.json({ supported: true, category: res.genre.name, country: m.country, ...computeBenchmark(res.self, res.peers) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not compare with the category." }, { status: 500 });
  }
}
