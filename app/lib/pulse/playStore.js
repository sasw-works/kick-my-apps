import { createHash } from "node:crypto";

// Google Play. Unlike the App Store, Google has no public review feed and no free lookup API, so
// this goes through the open-source `google-play-scraper` package, which reads the same pages and
// internal endpoints the Play website itself uses. That makes it the most fragile integration in
// the app: if Google changes those pages it can stop returning data until the package is updated.
// Every function therefore returns an { ok: false } result instead of throwing, and callers treat
// "couldn't read it" as "couldn't read it", never as "there is nothing there".
//
// The scraper is imported lazily so the pure helpers below (id / URL parsing, mapping) can be unit
// tested without it and without a network.

const DEFAULT_TIMEOUT_MS = Number(process.env.PULSE_FETCH_TIMEOUT_MS) || 3500;

// Android package names: dot-separated segments, each starting with a letter.
export const isPlayId = (v) => /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(String(v ?? "")) && String(v).length <= 155;

export function playIdFromStoreUrl(url) {
  try {
    const u = new URL(String(url ?? ""));
    if (u.hostname !== "play.google.com") return null;
    const id = u.searchParams.get("id");
    return isPlayId(id) ? id : null;
  } catch {
    return null;
  }
}

export function playCountryFromStoreUrl(url) {
  try {
    const gl = new URL(String(url ?? "")).searchParams.get("gl");
    return /^[A-Za-z]{2}$/.test(gl ?? "") ? gl.toLowerCase() : null;
  } catch {
    return null;
  }
}

export const playStoreUrl = (appId, country = "us") =>
  `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&gl=${country}`;

// Review language follows the storefront: reviews are read in the language they were written in.
const LANG = { tr: "tr", de: "de", fr: "fr", es: "es", it: "it", nl: "nl", ae: "ar", sa: "ar", gb: "en", us: "en" };
const langFor = (country) => LANG[country] || "en";

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function scraper() {
  const mod = await import("google-play-scraper");
  return mod.default || mod;
}

const cleanVersion = (v) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s && !/^vary/i.test(s) ? s.slice(0, 40) : null;
};

const toIso = (v) => {
  const t = v ? new Date(v) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toISOString() : null;
};

export function mapPlayApp(a, country = "us") {
  return {
    appId: String(a.appId),
    name: String(a.title || ""),
    developer: String(a.developer || ""),
    iconUrl: a.icon || null,
    storeUrl: playStoreUrl(a.appId, country),
    version: cleanVersion(a.version),
    releasedAt: toIso(a.updated),
    releaseNotes: String(a.recentChanges || ""),
    avgRating: typeof a.score === "number" ? a.score : null,
    ratingCount: Number.isInteger(a.ratings) ? a.ratings : 0,
    screenshots: Array.isArray(a.screenshots) ? a.screenshots.filter((u) => typeof u === "string").slice(0, 12) : [],
    price: a.free === true ? "Free" : typeof a.priceText === "string" && a.priceText ? a.priceText : a.free === false && typeof a.price === "number" ? String(a.price) : null,
  };
}

export function mapPlayReview(r) {
  const title = String(r.title ?? "").slice(0, 200);
  const content = String(r.text ?? "").slice(0, 2000);
  const reviewedAt = toIso(r.date);
  const id = r.id || createHash("sha1").update(`${r.userName ?? ""}|${reviewedAt ?? ""}|${content}`).digest("hex");
  return {
    id: String(id),
    rating: Number(r.score) || 0,
    title,
    content,
    version: cleanVersion(r.version),
    reviewedAt,
    helpfulVotes: Number(r.thumbsUp) || 0,
  };
}

// { ok: true, app } | { ok: false, reason: "not_found" | "unavailable" }
export async function lookupPlayApp(appId, country, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  try {
    const gplay = await scraper();
    const a = await withTimeout(gplay.app({ appId, country, lang: langFor(country) }), timeoutMs);
    if (!a?.title) return { ok: false, reason: "not_found" };
    return { ok: true, app: mapPlayApp({ ...a, appId }, country) };
  } catch (err) {
    if (err?.status === 404 || /not found/i.test(err?.message || "")) return { ok: false, reason: "not_found" };
    return { ok: false, reason: "unavailable", error: err?.message };
  }
}

// { ok: true, reviews } | { ok: false, reviews: [] } (same contract as the App Store feed).
export async function fetchRecentPlayReviews(appId, country, { attempts = 1, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      const gplay = await scraper();
      const res = await withTimeout(
        gplay.reviews({ appId, country, lang: langFor(country), sort: gplay.sort.NEWEST, num: 50 }),
        timeoutMs
      );
      const reviews = (res?.data || []).filter((r) => r && r.text && Number(r.score) > 0).map(mapPlayReview);
      if (reviews.length > 0) return { ok: true, reviews };
    } catch {
      // retry
    }
  }
  return { ok: false, reviews: [] };
}

export async function searchPlayApps(term, country = "us") {
  try {
    const gplay = await scraper();
    const list = await withTimeout(gplay.search({ term, num: 8, country, lang: langFor(country) }), 6000);
    return (list || []).filter((a) => isPlayId(a.appId)).map((a) => ({
      trackId: a.appId,
      name: a.title,
      developer: a.developer || "",
      icon: a.icon || null,
      storeUrl: playStoreUrl(a.appId, country),
    }));
  } catch {
    return [];
  }
}

// For the one-off analysis: listing text + sampled reviews, shaped like the App Store versions in
// reviews.js so the rest of the analysis doesn't care where they came from.
export async function fetchPlayListing(storeUrl) {
  const appId = playIdFromStoreUrl(storeUrl);
  if (!appId) return null;
  const country = playCountryFromStoreUrl(storeUrl) || "us";
  try {
    const gplay = await scraper();
    const a = await withTimeout(gplay.app({ appId, country, lang: langFor(country) }), 8000);
    if (!a?.title) return null;
    return {
      trackName: a.title,
      description: a.description || "",
      releaseNotes: a.recentChanges || "",
      genre: a.genre || "",
      screenshotCount: Array.isArray(a.screenshots) ? a.screenshots.length : 0,
      screenshotUrls: Array.isArray(a.screenshots) ? a.screenshots : [],
      version: cleanVersion(a.version) || "",
      averageRating: typeof a.score === "number" ? a.score : null,
      ratingCount: Number.isInteger(a.ratings) ? a.ratings : null,
      iconUrl: a.icon || null,
    };
  } catch {
    return null;
  }
}

export async function fetchPlayReviews(storeUrl) {
  const appId = playIdFromStoreUrl(storeUrl);
  if (!appId) return null;
  const country = playCountryFromStoreUrl(storeUrl) || "us";
  const res = await fetchRecentPlayReviews(appId, country, { attempts: 2, timeoutMs: 8000 });
  if (!res.ok) return null;
  return res.reviews.map((r) => ({
    rating: r.rating,
    title: r.title,
    content: r.content,
    version: r.version,
    helpfulVotes: r.helpfulVotes,
  }));
}
