// Unit test for app/lib/pulse/compare.js (no server or database): node tests/integration/pulse_compare_test.mjs
import { summarizeApp, gapVersus } from "../../app/lib/pulse/compare.js";
let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };
const snap = (v, r, n = 100, at = "2026-01-01T00:00:00Z") => ({ taken_at: at, version: v, version_released_at: at, avg_rating: r, rating_count: n });
const rv = (rating, content) => ({ rating, title: "", content, version: null });

console.log("== summarizeApp");
const s = summarizeApp(
  [snap("1.0", 4.1, 100, "2026-01-01T00:00:00Z"), snap("1.0", 4.2, 110, "2026-01-02T00:00:00Z"), snap("1.1", 4.3, 120, "2026-01-03T00:00:00Z"), snap("1.2", 4.0, 130, "2026-01-04T00:00:00Z")],
  [rv(1, "crashes constantly"), rv(2, "so slow"), rv(5, "great"), rv(5, "love it"), rv(1, "crash again")]
);
check("latest rating / count / version come from the newest snapshot", s.avgRating === 4.0 && s.ratingCount === 130 && s.version === "1.2");
check("updates seen counts version changes only (the first snapshot is the baseline)", s.updatesSeen === 2, s.updatesSeen);
check("tracked since the first snapshot", s.trackedSince === "2026-01-01T00:00:00Z");
check("negative share is of the reviews we have (3 of 5 = 60%)", s.negativePct === 60 && s.reviewSample === 5, JSON.stringify([s.negativePct, s.reviewSample]));
check("top complaints are counted from review text", s.topComplaints[0]?.label.startsWith("Crashes") && s.topComplaints[0].count === 2, JSON.stringify(s.topComplaints));
check("rating history is oldest first", s.ratingHistory.length === 4 && s.ratingHistory[0].avg_rating === 4.1);

console.log("== edge cases");
const e = summarizeApp([], []);
check("no data -> nulls, not NaN", e.avgRating === null && e.version === null && e.negativePct === null && e.updatesSeen === 0 && e.topComplaints.length === 0);
check("garbage input is safe", summarizeApp(null, undefined).reviewSample === 0);
check("a rating of 0 is kept (not treated as missing)", summarizeApp([snap("1", 0, 5)], []).avgRating === 0);
check("history is capped at 30 points", summarizeApp(Array.from({ length: 50 }, (_, i) => snap("1", 4, 1, `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`)), []).ratingHistory.length === 30);

console.log("== gapVersus");
check("positive when the competitor is ahead", gapVersus({ avgRating: 4.0 }, { avgRating: 4.35 }) === 0.35);
check("negative when you're ahead", gapVersus({ avgRating: 4.5 }, { avgRating: 4.1 }) === -0.4);
check("unknown when either side has no rating", gapVersus({ avgRating: null }, { avgRating: 4 }) === null && gapVersus(null, { avgRating: 4 }) === null);

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
