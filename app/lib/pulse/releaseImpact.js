import { computeReviewSignals } from "../reviewSignals.js";

// "Did the release help?": for each version Pulse has seen, the written reviews of that version next
// to the reviews of the version before it, plus the tasks the user marked done around that release.
//
// Honest limits, built into the output rather than hidden:
//  - reviews are a SAMPLE (recent written ones Pulse has stored), so every side carries its size and
//    a comparison with fewer than MIN_REVIEWS on either side is "unclear", never "better"/"worse";
//  - a task marked done near a release is "shipped around then", not proof it caused any change;
//  - the store's overall average moves slowly, so it's shown but the verdict leans on the reviews.
//
// Pure: takes rows already read from the database.
//  snapshots: [{ taken_at, version, version_released_at, avg_rating }] (any order)
//  reviews:   [{ rating, title, content, version }]
//  doneTasks: [{ key, title, doneAt }]
export const MIN_REVIEWS = 8;
const DAY = 86_400_000;
const MAX_VERSIONS = 6;

const ms = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

function summarize(reviews) {
  const n = reviews.length;
  if (!n) return { n: 0, negPct: null, avgRating: null, topics: [] };
  const neg = reviews.filter((r) => r.rating <= 2).length;
  const avg = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / n;
  const topics = computeReviewSignals(reviews).performance.topics.map((t) => ({ key: t.key, label: t.label, count: t.count, pct: Math.round((t.count / n) * 100) }));
  return { n, negPct: Math.round((neg / n) * 100), avgRating: Math.round(avg * 100) / 100, topics };
}

export function computeReleaseImpact({ snapshots, reviews, doneTasks }) {
  const snaps = (Array.isArray(snapshots) ? snapshots : [])
    .filter((s) => s && ms(s.taken_at) != null)
    .sort((a, b) => ms(a.taken_at) - ms(b.taken_at));
  const revs = Array.isArray(reviews) ? reviews : [];
  const done = (Array.isArray(doneTasks) ? doneTasks : []).filter((t) => t && ms(t.doneAt) != null);

  // Versions in the order Pulse first saw them.
  const versions = [];
  for (const s of snaps) {
    if (!s.version || versions.some((v) => v.version === s.version)) continue;
    versions.push({ version: s.version, releasedAt: ms(s.version_released_at) ?? ms(s.taken_at), firstSeen: ms(s.taken_at) });
  }

  const byVersion = (v) => revs.filter((r) => r.version === v);
  const out = [];
  for (let i = 1; i < versions.length; i++) {
    const cur = versions[i];
    const prev = versions[i - 1];
    const before = summarize(byVersion(prev.version));
    const after = summarize(byVersion(cur.version));
    const enough = before.n >= MIN_REVIEWS && after.n >= MIN_REVIEWS;

    // Store average: last reading before this version appeared vs. the last reading while it was current.
    const beforeSnap = [...snaps].reverse().find((s) => ms(s.taken_at) < cur.firstSeen && s.avg_rating != null);
    const afterSnap = [...snaps].reverse().find((s) => s.version === cur.version && s.avg_rating != null);
    const ratingBefore = beforeSnap ? Number(beforeSnap.avg_rating) : null;
    const ratingAfter = afterSnap ? Number(afterSnap.avg_rating) : null;
    const ratingDelta = ratingBefore != null && ratingAfter != null ? Math.round((ratingAfter - ratingBefore) * 100) / 100 : null;

    let verdict = "unclear";
    let changes = [];
    if (enough) {
      const negDelta = after.negPct - before.negPct;
      const avgDelta = after.avgRating - before.avgRating;
      verdict = negDelta <= -10 || (Math.abs(negDelta) < 10 && avgDelta >= 0.4) ? "better" : negDelta >= 10 || (Math.abs(negDelta) < 10 && avgDelta <= -0.4) ? "worse" : "flat";
      const keys = new Set([...before.topics, ...after.topics].map((t) => t.key));
      changes = [...keys]
        .map((k) => {
          const b = before.topics.find((t) => t.key === k);
          const a = after.topics.find((t) => t.key === k);
          return { key: k, label: (a || b).label, beforePct: b?.pct ?? 0, afterPct: a?.pct ?? 0, delta: (a?.pct ?? 0) - (b?.pct ?? 0) };
        })
        .filter((c) => Math.abs(c.delta) >= 8)
        .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
        .slice(0, 3);
    }

    const windowStart = prev.releasedAt;
    const windowEnd = cur.releasedAt + 2 * DAY;
    const tasks = done
      .filter((t) => ms(t.doneAt) >= windowStart && ms(t.doneAt) <= windowEnd)
      .map((t) => ({ key: t.key, title: String(t.title || t.key).slice(0, 160), doneAt: new Date(ms(t.doneAt)).toISOString() }));

    out.push({
      version: cur.version,
      previousVersion: prev.version,
      releasedAt: new Date(cur.releasedAt).toISOString(),
      before,
      after,
      enough,
      verdict,
      changes,
      ratingBefore,
      ratingAfter,
      ratingDelta,
      tasks,
    });
  }
  return out.reverse().slice(0, MAX_VERSIONS);
}
