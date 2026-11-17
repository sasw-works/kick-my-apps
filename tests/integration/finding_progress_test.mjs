// Unit test for app/lib/findingProgress.js (no server or database): node tests/integration/finding_progress_test.mjs
import { computeProgress } from "../../app/lib/findingProgress.js";
let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };
const f = (key, status, title = key) => ({ key, status, title });
const keys = (a) => a.map((x) => x.key).sort().join(",");

console.log("== computeProgress");
let p = computeProgress(
  [f("contrast", "bad"), f("cta", "warn"), f("copy", "bad"), f("trust", "good"), f("onboarding", "bad")],
  [f("contrast", "good"), f("cta", "warn"), f("trust", "bad"), f("navigation", "bad"), f("onboarding", "good")]
);
check("bad/warn -> good is resolved", keys(p.resolved) === "contrast,onboarding", keys(p.resolved));
check("still bad/warn is persisting", keys(p.persisting) === "cta", keys(p.persisting));
check("good -> bad and brand-new bad are new issues", keys(p.newIssues) === "navigation,trust", keys(p.newIssues));
check("a category missing from the newer scan is NOT counted as fixed", !p.resolved.some((x) => x.key === "copy") && !p.persisting.some((x) => x.key === "copy"));
check("good -> good is ignored", ![...p.resolved, ...p.persisting, ...p.newIssues].some((x) => x.key === "trust" && x.status === "good"));

console.log("== edge cases");
p = computeProgress(undefined, null);
check("missing/garbage input is safe", !p.resolved.length && !p.persisting.length && !p.newIssues.length);
p = computeProgress([null, {}, f("a", "bad")], [{ status: "good" }, f("a", "good")]);
check("entries without a key are skipped", keys(p.resolved) === "a");
p = computeProgress([f("a", "bad", "x".repeat(500))], [f("a", "good", "x".repeat(500))]);
check("long titles are clamped", p.resolved[0].title.length === 120);

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
