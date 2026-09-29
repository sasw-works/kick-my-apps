import { rateLimit, getClientIp, tooManyRequests } from "../../lib/rateLimit";

export const runtime = "nodejs";

export async function GET(req) {
  // No sign-in required (it feeds the public home-page search box), so this is the only thing
  // stopping a script from hammering it: every call proxies to Apple's own search API, and enough
  // volume from our IP risks Apple throttling that endpoint for every visitor, not just the abuser.
  const ip = getClientIp(req);
  const r = await rateLimit(`search-app:ip:${ip}`, { limit: 60, windowSeconds: 60 });
  if (!r.allowed) return tooManyRequests(r);

  const { searchParams } = new URL(req.url);
  const term = (searchParams.get("term") || "").trim();
  // Optional, defaults to "tr" (the existing behavior for the home-page search box). Pulse passes
  // the store the person actually wants to monitor, since ratings/reviews differ per storefront.
  const country = (searchParams.get("country") || "tr").toLowerCase();

  if (term.length < 3) {
    return Response.json({ results: [] });
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term
    )}&entity=software&country=${encodeURIComponent(country)}&limit=8`;
    const res = await fetch(url);
    if (!res.ok) {
      return Response.json({ results: [] });
    }
    const data = await res.json();

    const results = (data.results || []).map((r) => ({
      trackId: r.trackId,
      name: r.trackName,
      developer: r.sellerName || r.artistName || "",
      icon: r.artworkUrl100 || r.artworkUrl60,
      storeUrl: r.trackViewUrl,
    }));

    return Response.json({ results });
  } catch (err) {
    console.error(err);
    return Response.json({ results: [] });
  }
}
