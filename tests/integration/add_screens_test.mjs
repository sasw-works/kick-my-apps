// Adding screenshots to a report: image sniffing, sanitising the model's answer, merging into the
// report (keeping the original for later replacement). Run: node tests/integration/add_screens_test.mjs
import { sniffImage, normalizeVisual, mergeVisual, buildVisualPrompt, parseVisualJson, MAX_RUNS } from "../../app/lib/addScreens.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));

console.log("== 1. images");
const pad = Buffer.alloc(12);
check("JPEG, PNG and WebP recognised by their bytes", sniffImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), pad])) === "image/jpeg" && sniffImage(Buffer.concat([Buffer.from([0x89]), Buffer.from("PNG"), pad])) === "image/png" && sniffImage(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")])) === "image/webp");
check("text, SVG, HTML and tiny buffers are refused", sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")) === null && sniffImage(Buffer.from("<html>hello world</html>")) === null && sniffImage(Buffer.alloc(3)) === null && sniffImage(null) === null);

console.log("== 2. the model's answer");
const f = (o) => ({ key: "cta", title: "Weak button", status: "bad", finding: "The button is faint on screen 2.", suggestion: "Make it bolder.", screenshotIndex: 2, boundingBox: { x: 10, y: 20, width: 30, height: 10 }, ...o });
let v = normalizeVisual({ healthScore: 61.4, findings: [f(), f({ key: "cta", title: "dup" }), f({ key: "nope" }), f({ key: "copy", screenshotIndex: 9, boundingBox: { x: 1, y: 1, width: 5, height: 5 } }), f({ key: "trust", title: "" }), f({ key: "loading", status: "weird", boundingBox: { x: 90, y: 90, width: 50, height: 50 } })], approvalRisks: [{ issue: "Lorem ipsum on screen 3", severity: "high" }, { issue: "" }], compatibility: { platformNotes: [{ issue: "Back gesture differs", severity: "low" }] }, accessibilityChecks: [{ check: "contrast", status: "warn", note: "n" }, { check: "bogus" }] }, 3);
check("one finding per category, unknown keys and untitled ones dropped", v.findings.map((x) => x.key).join() === "cta,copy,loading", v.findings.map((x) => x.key).join());
check("screenshot index outside the uploaded range -> no index and no box; bad status -> warn", v.findings[1].screenshotIndex === null && v.findings[1].boundingBox === null && v.findings[2].status === "warn");
check("boxes are clamped inside the picture", v.findings[2].boundingBox === null || (v.findings[2].boundingBox.x + v.findings[2].boundingBox.width <= 100));
check("score rounded; findings flagged as added later", v.healthScore === 61 && v.findings.every((x) => x.addedLater === true));
check("risks, platform notes and accessibility checks sanitised", v.approvalRisks.length === 1 && v.approvalRisks[0].severity === "high" && v.compatibility.platformNotes.length === 1 && v.accessibilityChecks.length === 1);
check("garbage or no usable finding -> null", normalizeVisual(null, 2) === null && normalizeVisual({ findings: [] }, 2) === null && normalizeVisual({ findings: [{ key: "x" }] }, 2) === null && parseVisualJson("nope") === null && parseVisualJson('```json\n{"a":1}\n```').a === 1);

console.log("== 3. merging");
const stored = { healthScore: 80, aiSummary: "s", findings: [{ key: "copy", title: "Copy ok", status: "good" }, { key: "cta", title: "Old CTA", status: "good" }, { key: "trust", title: "Trust", status: "warn" }], approvalRisks: [], reviewSummary: { totalReviews: 5 } };
v = normalizeVisual({ healthScore: 50, findings: [f(), f({ key: "contrast", title: "Low contrast" })] }, 2);
let m = mergeVisual(stored, v, { screenCount: 2, now: new Date("2026-01-01T00:00:00Z") });
check("a visual finding replaces the text-only one of the same category, the rest stay", m.result.findings.map((x) => x.key).join() === "copy,trust,cta,contrast");
check("score blends by the number of findings each rests on (80x3 + 50x2) / 5 = 68", m.result.healthScore === 68 && m.counts.healthScore === 68, String(m.result.healthScore));
check("counts and lens scores follow the merged findings", m.counts.bad === 2 && m.counts.warn === 1 && m.counts.good === 1 && m.result.lensScores !== null);
check("other parts of the report are untouched", m.result.reviewSummary.totalReviews === 5 && m.result.aiSummary === "s");
check("run record keeps before / after", m.result.visualAdded.runs === 1 && m.result.visualAdded.scoreBefore === 80 && m.result.visualAdded.scoreAfter === 68 && m.result.visualAdded.screens === 2);
check("the original is kept for later replacement", m.result._base.findings.length === 3 && m.result._base.healthScore === 80);
const v2 = normalizeVisual({ healthScore: 90, findings: [f({ key: "navigation", title: "Clear nav", status: "good" })] }, 1);
const m2 = mergeVisual(m.result, v2, { screenCount: 1 });
check("replacing starts from the original, nothing piles up", m2.result.findings.map((x) => x.key).join() === "copy,cta,trust,navigation" || m2.result.findings.map((x) => x.key).sort().join() === "copy,cta,navigation,trust", m2.result.findings.map((x) => x.key).join());
check("the old visual findings are gone, the original CTA is back", !m2.result.findings.some((x) => x.key === "contrast") && m2.result.findings.find((x) => x.key === "cta").title === "Old CTA" && m2.result.visualAdded.runs === 2 && m2.result.visualAdded.scoreBefore === 80);
check("limit is two additions", MAX_RUNS === 2);
check("prompt: count, known findings, English", /2 in-app screenshots/.test(buildVisualPrompt({ appName: "App", existingTitles: ["Copy ok"], count: 2 })) && /Copy ok/.test(buildVisualPrompt({ appName: "App", existingTitles: ["Copy ok"], count: 2 })));

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
