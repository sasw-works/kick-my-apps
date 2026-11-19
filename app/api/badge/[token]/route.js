import { sql } from "@vercel/postgres";
import { ensureScansSchema } from "../../../lib/ensureScansSchema";
import { isShareToken } from "../../../lib/shareToken";
import { healthBadgeSvg } from "../../../lib/badge";
import { rateLimit } from "../../../lib/rateLimit";

export const runtime = "nodejs";

// The "App Health" badge of a SHARED report, for a README or website. Public like the shared
// report itself: whoever holds the share token can see the score, and nothing else is exposed
// (just the number). It stops working the moment sharing is turned off.
const headers = (cache) => ({
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": cache,
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
  "X-Content-Type-Options": "nosniff",
});

export async function GET(req, { params }) {
  const { token } = await params;
  if (!isShareToken(token)) return new Response(healthBadgeSvg(null), { status: 404, headers: headers("no-store") });
  try {
    // Embeds get hit by crawlers and image proxies: a generous per-token ceiling is enough.
    const rl = await rateLimit(`badge:${token.slice(0, 12)}`, { limit: 600, windowSeconds: 3600 });
    if (!rl.allowed) return new Response(healthBadgeSvg(null), { status: 429, headers: headers("no-store") });
    await ensureScansSchema();
    const { rows } = await sql`SELECT health_score FROM scans WHERE share_token = ${token} LIMIT 1`;
    if (!rows[0]) return new Response(healthBadgeSvg(null), { status: 404, headers: headers("no-store") });
    return new Response(healthBadgeSvg(Number(rows[0].health_score)), { headers: headers("public, max-age=300") });
  } catch (err) {
    console.error(err);
    return new Response(healthBadgeSvg(null), { status: 500, headers: headers("no-store") });
  }
}
