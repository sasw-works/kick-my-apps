// Apple's public RSS review feed — no auth needed, real data.
// (Play Store has no equivalent public feed; that's a known v1 gap, see README.)
export async function fetchAppStoreReviews(storeUrl) {
  const idMatch = storeUrl.match(/id(\d+)/);
  if (!idMatch) return null;
  const appId = idMatch[1];
  const countryMatch = storeUrl.match(/apps\.apple\.com\/([a-z]{2})\//i);
  const country = countryMatch ? countryMatch[1] : "us";

  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  };

  async function fetchFeed(cc, attempt = 0) {
    const rssUrl = `https://itunes.apple.com/${cc}/rss/customerreviews/id=${appId}/sortby=mostrecent/json`;
    const res = await fetch(rssUrl, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const entries = data?.feed?.entry;
    if (entries && Array.isArray(entries)) return entries;
    // Apple's RSS API occasionally rate-limits/throttles a request and returns an
    // empty-but-200 feed; one short-delayed retry clears this most of the time.
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 600));
      return fetchFeed(cc, 1);
    }
    return null;
  }

  // Apple's RSS review feed is inconsistently populated per country — some apps have
  // plenty of reviews in the US feed but none in e.g. the TR feed. Try the app's own
  // store country first, then fall back to "us" (almost always populated) if empty.
  let entries = await fetchFeed(country);
  if (!entries && country !== "us") entries = await fetchFeed("us");
  if (!entries) return null;

  return entries
    .filter((e) => e.content?.label)
    .slice(0, 50)
    .map((e) => ({
      rating: Number(e["im:rating"]?.label ?? 0),
      title: e.title?.label ?? "",
      content: e.content?.label ?? "",
      version: e["im:version"]?.label ?? null,
      helpfulVotes: Number(e["im:voteSum"]?.label ?? 0),
    }));
}

// Apple's public Lookup API — real store listing metadata (title, description,
// version notes). Used for the ASO / store listing review.
export async function fetchAppStoreListing(storeUrl) {
  const idMatch = storeUrl.match(/id(\d+)/);
  if (!idMatch) return null;
  const appId = idMatch[1];
  const countryMatch = storeUrl.match(/apps\.apple\.com\/([a-z]{2})\//i);
  const country = countryMatch ? countryMatch[1] : "us";

  const res = await fetch(`https://itunes.apple.com/lookup?id=${appId}&country=${country}`);
  if (!res.ok) return null;
  const data = await res.json();
  const app = data?.results?.[0];
  if (!app) return null;

  return {
    trackName: app.trackName ?? "",
    description: app.description ?? "",
    releaseNotes: app.releaseNotes ?? "",
    genre: app.primaryGenreName ?? "",
    screenshotCount: (app.screenshotUrls?.length ?? 0) + (app.ipadScreenshotUrls?.length ?? 0),
    version: app.version ?? "",
    averageRating: app.averageUserRating ?? null,
    ratingCount: app.userRatingCount ?? null,
    iconUrl: app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60 || null,
  };
}


// so these numbers are always exactly accurate (no AI arithmetic/hallucination).
export function computeReviewAnalytics(reviews) {
  const ratingDistribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const negativeReviews = reviews.filter((r) => r.rating <= 2);
  const mostHelpfulNegative = negativeReviews.length
    ? negativeReviews.reduce((best, r) => (r.helpfulVotes > (best?.helpfulVotes ?? -1) ? r : best), null)
    : null;

  const byVersion = {};
  for (const r of reviews) {
    if (!r.version) continue;
    if (!byVersion[r.version]) byVersion[r.version] = [];
    byVersion[r.version].push(r.rating);
  }
  const versions = Object.keys(byVersion);
  let versionTrend = null;
  if (versions.length >= 2) {
    const avgByVersion = versions
      .map((v) => ({
        version: v,
        avg: byVersion[v].reduce((a, b) => a + b, 0) / byVersion[v].length,
        count: byVersion[v].length,
      }))
      .filter((v) => v.count >= 2);
    if (avgByVersion.length >= 2) {
      versionTrend = avgByVersion.slice(0, 4);
    }
  }

  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;

  return {
    ratingDistribution,
    mostHelpfulNegative,
    versionTrend,
    avgRating: Math.round(avgRating * 10) / 10,
    totalReviews: reviews.length,
  };
}
