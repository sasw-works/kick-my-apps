// Unit tests for app/lib/reviewSignals.js and app/lib/analysisExtras.js (no server or database):
// node tests/integration/review_signals_test.mjs
import { computeReviewSignals } from "../../app/lib/reviewSignals.js";
import { applyAnalysisExtras, normalizeAccessibilityChecks } from "../../app/lib/analysisExtras.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };
const rv = (rating, content, extra = {}) => ({ rating, title: "", content, version: null, helpfulVotes: 0, ...extra });

console.log("== computeReviewSignals");
const reviews = [
  rv(1, "The app crashes every time I open it on my iPhone 13 Pro"),
  rv(2, "So slow and laggy since the last update, iOS 17.4 is unusable"),
  rv(1, "Drains my battery and my iPad gets hot"),
  rv(5, "Love it, works great"),
  rv(3, "Uygulama çok yavaş ve sürekli çöküyor"),
  rv(4, "Great on iPad, iPad iPad iPad"),
];
const s = computeReviewSignals(reviews);
const topic = (k) => s.performance.topics.find((t) => t.key === k);
check("total counted", s.totalReviews === 6);
check("crash: English + Turkish = 2", topic("crash")?.count === 2, JSON.stringify(s.performance.topics));
check("slow: English + Turkish = 2", topic("slow")?.count === 2);
check("battery = 1", topic("battery")?.count === 1);
check("affected reviews counted once each (4 of 6)", s.performance.affected === 4 && s.performance.affectedPct === 67, JSON.stringify(s.performance));
check("a happy review isn't flagged", !s.performance.examples.some((e) => e.text.includes("Love it")));
check("examples are lowest-rated first", s.performance.examples[0].rating === 1);
const dev = Object.fromEntries(s.compatibility.devices.map((d) => [d.name, d.count]));
check("iPad counted once per review, not per mention (2 reviews)", dev["iPad"] === 2, JSON.stringify(dev));
check("iPhone model parsed", dev["iPhone 13 Pro"] === 1, JSON.stringify(dev));
check("iOS version parsed", s.compatibility.osVersions[0]?.name === "iOS 17", JSON.stringify(s.compatibility.osVersions));
check("'since the last update' detected", s.compatibility.afterUpdate === 1);

console.log("== edge cases");
const empty = computeReviewSignals([]);
check("empty list -> zeros, no NaN", empty.totalReviews === 0 && empty.performance.affectedPct === 0);
check("null / garbage input is safe", computeReviewSignals(null).totalReviews === 0 && computeReviewSignals([null, {}, { rating: 1 }]).performance.affected === 0);
check("no false positive on 'slowly' in unrelated word 'slowpoke'... ", computeReviewSignals([rv(5, "Fun game, my cat is a slowpoke")]).performance.affected === 0);

console.log("== applyAnalysisExtras");
const hostile = {
  performanceStability: {
    summary: "x".repeat(5000),
    signals: [{ type: "DROP TABLE", label: "Crashes", severity: "catastrophic", evidence: "e" }, "junk", null, { label: "" }],
    suggestions: ["a", "b", "c", "d", "e", "f"],
    mentions: { affected: 9999 },
  },
  compatibility: "not an object",
  accessibilityChecks: [
    { check: "contrast", status: "bad", note: "n", standard: "WCAG 1.4.3" },
    { check: "contrast", status: "good", note: "dupe" },
    { check: "made_up", status: "good" },
    { check: "labels", status: "maybe" },
  ],
};
let r = applyAnalysisExtras(structuredClone(hostile), { reviews, hasImages: true });
check("summary clamped", r.performanceStability.summary.length === 400);
check("bad enum values coerced", r.performanceStability.signals.length === 1 && r.performanceStability.signals[0].type === "other" && r.performanceStability.signals[0].severity === "medium");
check("suggestions capped at 4", r.performanceStability.suggestions.length === 4);
check("model-supplied counts overwritten by exact ones", r.performanceStability.mentions.affected === 4);
check("non-object compatibility from model -> built from counts only", r.compatibility.mentions.devices.length > 0 && r.compatibility.summary === "");
check("duplicate / unknown checks dropped, first wins", r.accessibilityChecks.length === 2 && r.accessibilityChecks[0].status === "bad");
check("unknown status -> 'unknown'", r.accessibilityChecks[1].status === "unknown");

r = applyAnalysisExtras(structuredClone(hostile), { reviews: null, hasImages: false });
check("no reviews -> performance removed", r.performanceStability === null);
check("no reviews and no screenshots -> compatibility and accessibility removed", r.compatibility === null && r.accessibilityChecks === null);
r = applyAnalysisExtras({ accessibilityChecks: [{ check: "labels", status: "good" }] }, { reviews: [rv(5, "nice")], hasImages: false });
check("no screenshots -> accessibility removed even if the model produced it", r.accessibilityChecks === null);
check("clean reviews -> no empty performance panel", r.performanceStability === null);
check("normalizeAccessibilityChecks([]) -> null", normalizeAccessibilityChecks([]) === null);

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
