// How does an app compare with the other apps in its category (App Store only)? Peers are the
// category's current top free apps in the same storefront, with their public average rating and
// rating count from Apple's lookup API. The maths is plain and shown as is: percentile among the
// peers, the peers' median, and the rank. It says "among the top N", never "among all apps".

const base = () => (process.env.ITUNES_API_BASE || "https://itunes.apple.com").replace(/\/$/, "");
const UA = "Mozilla/5.0 (compatible; KickMyApps/1.0)";

async function getJson(url, ms = 8000) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const PEER_LIMIT = 100;

// -> { ok: true, genre: {id, name}, peers: [{id, name, rating, count}] } | { ok: false, reason }
export async function fetchCategoryPeers(appId, country) {
  try {
    const me = await getJson(`${base()}/lookup?id=${appId}&country=${country}&entity=software`);
    const r = (me.results || []).find((x) => String(x.trackId) === String(appId));
    if (!r) return { ok: false, reason: "not_found" };
    const genreId = String(r.primaryGenreId ?? "");
    if (!/^\d{1,6}$/.test(genreId)) return { ok: false, reason: "no_category" };
    const self = { id: String(r.trackId), name: r.trackName || "", rating: typeof r.averageUserRating === "number" ? r.averageUserRating : null, count: Number.isInteger(r.userRatingCount) ? r.userRatingCount : 0 };

    const feed = await getJson(`${base()}/${country}/rss/topfreeapplications/limit=${PEER_LIMIT}/genre=${genreId}/json`);
    const ids = (feed?.feed?.entry || []).map((e) => String(e?.id?.attributes?.["im:id"] ?? "")).filter((x) => /^\d{5,12}$/.test(x) && x !== self.id).slice(0, PEER_LIMIT);
    if (!ids.length) return { ok: false, reason: "no_peers" };
    const look = await getJson(`${base()}/lookup?id=${ids.join(",")}&country=${country}&entity=software`);
    const peers = (look.results || [])
      .filter((x) => x && x.trackId && String(x.trackId) !== self.id)
      .map((x) => ({ id: String(x.trackId), name: x.trackName || "", rating: typeof x.averageUserRating === "number" ? x.averageUserRating : null, count: Number.isInteger(x.userRatingCount) ? x.userRatingCount : 0 }));
    return { ok: true, genre: { id: genreId, name: r.primaryGenreName || "" }, self, peers };
  } catch (err) {
    return { ok: false, reason: "unavailable" };
  }
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (n, d = 1) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);
// share of peers this value beats (ties count half), 0-100
const percentile = (v, xs) => (xs.length ? Math.round(((xs.filter((x) => x < v).length + xs.filter((x) => x === v).length / 2) / xs.length) * 100) : null);

export const MIN_PEERS = 10;

export function computeBenchmark(self, peers) {
  const withRating = peers.filter((p) => p.rating !== null && p.count >= 50);
  const ratings = withRating.map((p) => p.rating);
  const counts = peers.map((p) => p.count);
  const enough = withRating.length >= MIN_PEERS;
  const out = {
    peerCount: peers.length,
    ratedPeers: withRating.length,
    enough,
    rating: { value: self.rating, median: round(median(ratings), 2), percentile: self.rating !== null && enough ? percentile(self.rating, ratings) : null },
    count: { value: self.count, median: Math.round(median(counts) ?? 0), percentile: peers.length >= MIN_PEERS ? percentile(self.count, counts) : null },
    best: [...withRating].sort((a, b) => b.rating - a.rating || b.count - a.count).slice(0, 3).map((p) => ({ name: p.name, rating: round(p.rating, 1), count: p.count })),
    rank: null,
    notes: [],
  };
  if (self.rating !== null && enough) out.rank = withRating.filter((p) => p.rating > self.rating).length + 1;
  if (!enough) out.notes.push("Too few comparable apps to say where you stand.");
  else {
    const d = round(self.rating - out.rating.median, 2);
    if (d >= 0.2) out.notes.push(`Your rating is ${d.toFixed(1)} above the median of the top apps in this category.`);
    else if (d <= -0.2) out.notes.push(`Your rating is ${Math.abs(d).toFixed(1)} below the median of the top apps in this category.`);
    else out.notes.push("Your rating is about the same as the median of the top apps in this category.");
    if (out.count.percentile !== null && out.count.percentile < 25) out.notes.push("Far fewer people rate your app than the top apps here. Asking happy users for a rating could help.");
  }
  return out;
}
