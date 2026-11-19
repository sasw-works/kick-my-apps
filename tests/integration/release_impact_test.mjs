// Unit tests for app/lib/pulse/releaseImpact.js (no server or database):
// node tests/integration/release_impact_test.mjs
import { computeReleaseImpact, MIN_REVIEWS } from "../../app/lib/pulse/releaseImpact.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };
const D = (s) => new Date(s).toISOString();
const snap = (day, version, rating, released) => ({ taken_at: D(`2026-03-${day}T12:00:00Z`), version, avg_rating: rating, version_released_at: released ? D(released) : null });
const rv = (rating, version, content = "ok") => ({ rating, title: "", content, version });
const many = (n, rating, version, content) => Array.from({ length: n }, () => rv(rating, version, content));

console.log("== versions and basics");
check("no data -> []", computeReleaseImpact({}).length === 0 && computeReleaseImpact({ snapshots: [], reviews: [] }).length === 0);
check("a single version has nothing to compare", computeReleaseImpact({ snapshots: [snap("01", "1.0", 4.0)], reviews: many(20, 5, "1.0") }).length === 0);
const snaps = [snap("01", "1.0", 4.0), snap("05", "1.1", 4.0, "2026-03-05T08:00:00Z"), snap("12", "1.1", 4.2), snap("20", "1.2", 4.2, "2026-03-20T08:00:00Z"), snap("27", "1.2", 4.1)];
const r = computeReleaseImpact({ snapshots: snaps, reviews: [] });
check("one entry per upgrade, newest first", r.map((x) => x.version).join() === "1.2,1.1" && r[0].previousVersion === "1.1");
check("release date uses the store's date when given", r[0].releasedAt === D("2026-03-20T08:00:00Z"));
check("store rating before = last reading before the version appeared; after = last while it was current", r[1].ratingBefore === 4.0 && r[1].ratingAfter === 4.2 && r[1].ratingDelta === 0.2 && r[0].ratingBefore === 4.2 && r[0].ratingAfter === 4.1, JSON.stringify([r[0], r[1]].map((x) => [x.ratingBefore, x.ratingAfter])));
check("snapshots given out of order are sorted", computeReleaseImpact({ snapshots: [...snaps].reverse(), reviews: [] }).map((x) => x.version).join() === "1.2,1.1");

console.log("== verdicts need enough reviews");
const crash = "It crashes every time I open it";
const better = computeReleaseImpact({ snapshots: snaps, reviews: [...many(10, 1, "1.1", crash), ...many(10, 5, "1.2")] });
check("a clear drop in bad reviews is 'better'", better[0].verdict === "better" && better[0].before.negPct === 100 && better[0].after.negPct === 0, JSON.stringify(better[0].verdict));
check("...and the topic that moved is named with both percentages", better[0].changes[0]?.key === "crash" && better[0].changes[0].beforePct === 100 && better[0].changes[0].afterPct === 0 && better[0].changes[0].delta === -100, JSON.stringify(better[0].changes));
const worse = computeReleaseImpact({ snapshots: snaps, reviews: [...many(10, 5, "1.1"), ...many(10, 1, "1.2", crash)] });
check("a jump in bad reviews is 'worse'", worse[0].verdict === "worse" && worse[0].changes[0].delta === 100);
const flat = computeReleaseImpact({ snapshots: snaps, reviews: [...many(10, 4, "1.1"), ...many(10, 4, "1.2")] });
check("no movement is 'flat'", flat[0].verdict === "flat" && flat[0].changes.length === 0);
const thin = computeReleaseImpact({ snapshots: snaps, reviews: [...many(MIN_REVIEWS - 1, 1, "1.1", crash), ...many(20, 5, "1.2")] });
check(`fewer than ${MIN_REVIEWS} reviews on a side is 'unclear', not 'better'`, thin[0].verdict === "unclear" && thin[0].enough === false && thin[0].changes.length === 0);
check("review counts are reported per side", thin[0].before.n === MIN_REVIEWS - 1 && thin[0].after.n === 20);
check("reviews with no version are ignored", computeReleaseImpact({ snapshots: snaps, reviews: many(30, 1, null) })[0].after.n === 0);
const avgOnly = computeReleaseImpact({ snapshots: snaps, reviews: [...many(5, 3, "1.1"), ...many(5, 4, "1.1"), ...many(10, 5, "1.2")] });
check("a small share-of-bad change falls back to the average rating", avgOnly[0].verdict === "better", JSON.stringify([avgOnly[0].verdict, avgOnly[0].before, avgOnly[0].after.avgRating]));

console.log("== tasks shipped around a release");
const tasks = [
  { key: "a", title: "Fix contrast", doneAt: D("2026-03-10T10:00:00Z") }, // between 1.1 and 1.2 releases -> belongs to 1.2
  { key: "b", title: "Bigger buttons", doneAt: D("2026-03-21T10:00:00Z") }, // 1 day after 1.2 released -> grace window
  { key: "c", title: "Too late", doneAt: D("2026-03-25T10:00:00Z") }, // after the grace window
  { key: "d", title: "Early", doneAt: D("2026-03-02T10:00:00Z") }, // before 1.1 released -> not in 1.2's window
];
const t = computeReleaseImpact({ snapshots: snaps, reviews: [], doneTasks: tasks });
check("1.2 lists tasks done since 1.1 shipped, plus a 2-day grace after release", t[0].tasks.map((x) => x.key).sort().join() === "a,b", JSON.stringify(t[0].tasks));
check("1.1 lists tasks done before it shipped", t[1].tasks.map((x) => x.key).join() === "d" || t[1].tasks.map((x) => x.key).includes("d"), JSON.stringify(t[1].tasks));
check("garbage tasks are ignored", computeReleaseImpact({ snapshots: snaps, reviews: [], doneTasks: [null, {}, { key: "x", doneAt: "nope" }] })[0].tasks.length === 0);
check("at most 6 versions come back", computeReleaseImpact({ snapshots: Array.from({ length: 12 }, (_, i) => snap(String(i + 1).padStart(2, "0"), `2.${i}`, 4)), reviews: [] }).length === 6);

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
