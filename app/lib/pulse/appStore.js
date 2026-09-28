import { createHash } from "node:crypto";

// Everything Pulse asks Apple. Two sources, chosen for how much we can trust each:
//  - the official lookup API: version, release date, notes, average rating, rating count. Stable,
//    per storefront, cheap.
//  - the public "most recent reviews" feed: the only way to see *new written reviews*. Less
//    reliable from cloud IPs (it sometimes answers 200 with nothing), so callers must treat
//    "no reviews came back" as "couldn't read them", not as "there are none".
// A monitor is one app in one storefront: ratings and reviews differ per country, and mixing
// storefronts (as the one-off analysis does when a feed is empty) would make the numbers meaningless.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// Kept short on purpose: while this runs on Vercel's Hobby plan, the whole cron *function* is cut
// off at 10 seconds (no override), so every network call inside it has to leave room for others in
// the same run. If/when this moves off Vercel, raise it (no code change needed elsewhere -- see
// PULSE_FETCH_TIMEOUT_MS below).
const DEFAULT_TIMEOUT_MS = Number(process.env.PULSE_FETCH_TIMEOUT_MS) || 3500;

export const COUNTRIES = {
  tr: "Turkey",
  us: "United States",
  gb: "United Kingdom",
  de: "Germany",
  fr: "France",
  ae: "United Arab Emirates",
  sa: "Saudi Arabia",
  es: "Spain",
  it: "Italy",
  nl: "Netherlands",
};

export const isAppId = (v) => /^\d{5,12}$/.test(String(v ?? ""));
export const isCountry = (v) => /^[a-z]{2}$/.test(String(v ?? ""));
export const appIdFromStoreUrl = (url) => /\/id(\d{5,12})/.exec(String(url ?? ""))?.[1] ?? null;
export const countryFromStoreUrl = (url) => /apps\.apple\.com\/([a-z]{2})\//i.exec(String(url ?? ""))?.[1]?.toLowerCase() ?? null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// { ok: true, app } | { ok: false, reason: "not_found" | "unavailable" }
export async function lookupApp(appId, country) {
  try {
    const data = await getJson(`https://itunes.apple.com/lookup?id=${appId}&country=${country}&entity=software`);
    const r = (data.results || []).find((x) => String(x.trackId) === String(appId));
    if (!r) return { ok: false, reason: "not_found" };
    return {
      ok: true,
      app: {
        appId: String(r.trackId),
        name: r.trackName || "",
        developer: r.sellerName || r.artistName || "",
        iconUrl: r.artworkUrl100 || r.artworkUrl60 || null,
        storeUrl: r.trackViewUrl ? String(r.trackViewUrl).split("?")[0] : null,
        version: r.version || null,
        releasedAt: r.currentVersionReleaseDate || null,
        releaseNotes: r.releaseNotes || "",
        avgRating: typeof r.averageUserRating === "number" ? r.averageUserRating : null,
        ratingCount: Number.isInteger(r.userRatingCount) ? r.userRatingCount : 0,
      },
    };
  } catch (err) {
    return { ok: false, reason: "unavailable", error: err.message };
  }
}

function parseEntry(e) {
  const rating = Number(e["im:rating"]?.label ?? 0);
  const title = String(e.title?.label ?? "").slice(0, 200);
  const content = String(e.content?.label ?? "").slice(0, 2000);
  const reviewedAtRaw = e.updated?.label;
  const t = reviewedAtRaw ? new Date(reviewedAtRaw) : null;
  // Reviews carry an id; if one ever doesn't, derive a stable one so it still de-duplicates.
  const id =
    e.id?.label ||
    createHash("sha1").update(`${e.author?.name?.label ?? ""}|${reviewedAtRaw ?? ""}|${title}|${content}`).digest("hex");
  return {
    id: String(id),
    rating,
    title,
    content,
    version: e["im:version"]?.label ?? null,
    reviewedAt: t && !Number.isNaN(t.getTime()) ? t.toISOString() : null,
  };
}

// { ok: true, reviews } when the feed gave us reviews; { ok: false, reviews: [] } when it gave
// nothing after a few tries -- which could be a throttled feed or an app with no written reviews.
// The caller has the rating count and decides which it is.
//
// attempts defaults to 1: the cron path (many monitors, one function invocation with a hard total
// time budget -- currently Vercel Hobby's 10s) can't afford retries per monitor. The manual
// "check now" path (one monitor, its own invocation) passes attempts: 2 for a better shot at a
// feed that's just having a bad moment.
export async function fetchRecentReviews(appId, country, { attempts = 1 } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      const data = await getJson(`https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/sortby=mostrecent/json`);
      const entries = [].concat(data?.feed?.entry ?? []).filter((e) => e && e["im:rating"]);
      if (entries.length > 0) return { ok: true, reviews: entries.slice(0, 50).map(parseEntry) };
    } catch {
      // fall through to the retry
    }
    if (i < attempts - 1) await sleep(300);
  }
  return { ok: false, reviews: [] };
}
