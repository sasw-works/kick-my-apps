import { computeReviewSignals } from "../reviewSignals.js";

// Turns one monitored app (yours or a competitor) into the numbers shown side by side.
// Pure: takes rows already read from the database.
//
// snapshots: [{ taken_at, version, version_released_at, avg_rating, rating_count }] oldest first.
// reviews:   [{ rating, title, content, version }] the written reviews we've stored for it.
//
// What users complain about is only what the stored reviews say (a sample of recent ones, not
// every review), so the sample size is always returned alongside the percentages.
export function summarizeApp(snapshots, reviews) {
  const snaps = Array.isArray(snapshots) ? snapshots : [];
  const revs = Array.isArray(reviews) ? reviews : [];
  const last = snaps[snaps.length - 1] || null;

  // Version changes seen since tracking began (the first snapshot is just the starting point).
  let updatesSeen = 0;
  for (let i = 1; i < snaps.length; i++) {
    if (snaps[i].version && snaps[i - 1].version && snaps[i].version !== snaps[i - 1].version) updatesSeen++;
  }

  const negative = revs.filter((r) => r.rating <= 2).length;
  const signals = computeReviewSignals(revs);

  return {
    avgRating: last?.avg_rating != null ? Number(last.avg_rating) : null,
    ratingCount: last?.rating_count ?? null,
    version: last?.version ?? null,
    versionReleasedAt: last?.version_released_at ?? null,
    lastSnapshotAt: last?.taken_at ?? null,
    updatesSeen,
    trackedSince: snaps[0]?.taken_at ?? null,
    reviewSample: revs.length,
    negativePct: revs.length ? Math.round((negative / revs.length) * 100) : null,
    topComplaints: signals.performance.topics.slice(0, 3).map((t) => ({ label: t.label, count: t.count, pct: t.pct })),
    ratingHistory: snaps
      .filter((s) => s.avg_rating != null)
      .slice(-30)
      .map((s) => ({ taken_at: s.taken_at, avg_rating: Number(s.avg_rating) })),
  };
}

// How a competitor stands against your own app: positive rating gap = they're ahead of you.
export function gapVersus(self, other) {
  if (self?.avgRating == null || other?.avgRating == null) return null;
  return Math.round((other.avgRating - self.avgRating) * 100) / 100;
}
