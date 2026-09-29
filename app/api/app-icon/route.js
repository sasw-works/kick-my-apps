import { fetchAppStoreListing } from "../../lib/reviews";
import { rateLimit, getClientIp, tooManyRequests } from "../../lib/rateLimit";

export const runtime = "nodejs";

export async function GET(req) {
  // Same reasoning as /api/search-app: no sign-in gate, and every call proxies to Apple.
  const ip = getClientIp(req);
  const r = await rateLimit(`app-icon:ip:${ip}`, { limit: 60, windowSeconds: 60 });
  if (!r.allowed) return tooManyRequests(r);

  try {
    const { searchParams } = new URL(req.url);
    const storeUrl = searchParams.get("storeUrl");
    if (!storeUrl) {
      return Response.json({ error: "storeUrl is required." }, { status: 400 });
    }
    const listing = await fetchAppStoreListing(storeUrl);
    return Response.json({ iconUrl: listing?.iconUrl || null });
  } catch (err) {
    return Response.json({ iconUrl: null });
  }
}
