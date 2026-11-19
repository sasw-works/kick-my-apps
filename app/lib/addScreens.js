import { computeLensScores } from "./lensScores.js";
import { normalizeCompatibility, normalizeAccessibilityChecks } from "./analysisExtras.js";

// Adding app screenshots to a report that was made without them (for example from a store link only).
// A visual-only analysis is run on the new images and merged into the report. The report as it was
// before the first addition is kept in `_base`, so every later run (replacing the screenshots)
// starts from the original and the result never piles up. Model output is untrusted and is
// sanitised here.

export const MAX_SCREENS = 8;
export const MAX_RUNS = 2; // additions (including replacements) per report
export const MAX_FILE_BYTES = 700 * 1024; // the browser shrinks images before upload
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

const KEYS = ["onboarding", "cta", "contrast", "typography", "accessibility", "permissions", "conversion", "navigation", "empty_states", "consistency", "loading", "copy", "trust"];
const STATUSES = ["good", "warn", "bad"];
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const str = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

// Only real images, judged by their first bytes, never by the name or type the browser claims.
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf.slice(1, 4).toString("latin1") === "PNG") return "image/png";
  if (buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

export function buildVisualPrompt({ appName, genre, existingTitles, count }) {
  const known = (existingTitles || []).slice(0, 12).map((t) => `- ${str(t, 100)}`).join("\n");
  return `You are an experienced mobile UX auditor. You are shown ${count} in-app screenshot${count === 1 ? "" : "s"} of "${str(appName, 80) || "an app"}"${genre ? ` (category: ${str(genre, 40)})` : ""}, numbered in order. Judge ONLY what you can see.

Write everything in English. Answer with JSON only:
{
  "healthScore": <integer 0-100 for what the screenshots show; don't inflate>,
  "findings": [
    { "key": "<one of ${KEYS.join("|")}>", "title": "<short title>", "status": "<good|warn|bad>", "finding": "<what you saw, on which screenshot, 1-2 sentences>", "suggestion": "<a concrete action>", "screenshotIndex": <1-based number or null>, "boundingBox": { "x": <0-100>, "y": <0-100>, "width": <0-100>, "height": <0-100> } or null }
  ],
  "approvalRisks": [ { "issue": "<a concrete risk you can see>", "guideline": "<Apple/Google guideline area>", "severity": "<high|medium>" } ],
  "compatibility": { "summary": "", "platformNotes": [ { "issue": "<platform-convention issue you can see>", "guideline": "<e.g. Apple HIG: Navigation bars>", "severity": "<high|medium|low>" } ] } or null,
  "accessibilityChecks": [ { "check": "<touch_targets|text_size|contrast|color_only|labels>", "status": "<good|warn|bad|unknown>", "note": "<one sentence>", "standard": "<e.g. WCAG 1.4.3>" } ] or null
}

Rules:
- 3 to 8 findings, each based on something visible. At most one finding per category. Never invent detail.
- For consistency findings compare at least two screens by number.
- boundingBox only when you are fairly sure where it is; otherwise null.
- approvalRisks: only concrete visible risks (placeholder text, broken-looking screens, misleading claims); an empty array if none.
- Never state pixel sizes or contrast ratios as measurements; say "appears" or "looks like".
- Findings already known from the app's store listing and reviews (don't repeat them, add what the screenshots show):
${known || "- (none)"}`;
}

function normalizeBox(b) {
  if (!isObj(b)) return null;
  const n = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : null);
  const x = n(b.x), y = n(b.y), w = n(b.width), h = n(b.height);
  if ([x, y, w, h].some((v) => v === null) || w < 1 || h < 1) return null;
  return { x, y, width: Math.min(w, 100 - x), height: Math.min(h, 100 - y) };
}

export function parseVisualJson(raw) {
  try { return JSON.parse(String(raw ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim()); } catch { return null; }
}

// -> { healthScore, findings, approvalRisks, compatibility, accessibilityChecks } or null when nothing usable
export function normalizeVisual(raw, imageCount) {
  if (!isObj(raw)) return null;
  const seen = new Set();
  const findings = [];
  for (const f of Array.isArray(raw.findings) ? raw.findings : []) {
    if (!isObj(f)) continue;
    const key = typeof f.key === "string" ? f.key.trim() : "";
    if (!KEYS.includes(key) || seen.has(key)) continue;
    const title = str(f.title, 100), finding = str(f.finding, 400), suggestion = str(f.suggestion, 300);
    if (!title || !finding) continue;
    seen.add(key);
    const idx = Number.isInteger(f.screenshotIndex) && f.screenshotIndex >= 1 && f.screenshotIndex <= imageCount ? f.screenshotIndex : null;
    findings.push({
      key, title, finding, suggestion,
      status: STATUSES.includes(f.status) ? f.status : "warn",
      screenshotIndex: idx,
      boundingBox: idx ? normalizeBox(f.boundingBox) : null,
      codeSnippet: null,
      addedLater: true,
    });
    if (findings.length >= 8) break;
  }
  if (!findings.length) return null;
  const score = Number.isFinite(raw.healthScore) ? Math.max(0, Math.min(100, Math.round(raw.healthScore))) : null;
  const risks = (Array.isArray(raw.approvalRisks) ? raw.approvalRisks : []).filter(isObj)
    .map((r) => ({ issue: str(r.issue, 240), guideline: str(r.guideline, 120), severity: r.severity === "high" ? "high" : "medium" }))
    .filter((r) => r.issue).slice(0, 4);
  return {
    healthScore: score,
    findings,
    approvalRisks: risks,
    compatibility: normalizeCompatibility(raw.compatibility),
    accessibilityChecks: normalizeAccessibilityChecks(raw.accessibilityChecks),
  };
}

const BASE_FIELDS = ["healthScore", "aiSummary", "findings", "approvalRisks", "compatibility", "accessibilityChecks", "lensScores"];
const count = (fs, s) => fs.filter((f) => f.status === s).length;

// base: the stored result_json. Returns { result, counts } -- the new result_json and the figures
// stored in the scans row.
export function mergeVisual(stored, visual, { now = new Date(), screenCount } = {}) {
  const prev = isObj(stored) ? stored : {};
  const base = isObj(prev._base) ? prev._base : Object.fromEntries(BASE_FIELDS.map((k) => [k, prev[k] ?? null]));
  const baseFindings = Array.isArray(base.findings) ? base.findings : [];
  const newKeys = new Set(visual.findings.map((f) => f.key));
  // Evidence from screenshots replaces a text-only finding of the same category.
  const findings = [...baseFindings.filter((f) => !newKeys.has(f?.key)), ...visual.findings];

  const baseScore = Number.isFinite(base.healthScore) ? base.healthScore : null;
  let healthScore;
  if (baseScore !== null && visual.healthScore !== null) {
    // Each part counts for as many findings as it rests on.
    const bn = Math.max(baseFindings.length, 1), vn = visual.findings.length;
    healthScore = Math.round((baseScore * bn + visual.healthScore * vn) / (bn + vn));
  } else healthScore = visual.healthScore ?? baseScore ?? 0;

  const risks = [...(Array.isArray(base.approvalRisks) ? base.approvalRisks : [])];
  for (const r of visual.approvalRisks) if (!risks.some((x) => x.issue === r.issue)) risks.push(r);

  let compatibility = base.compatibility ? { ...base.compatibility } : null;
  if (visual.compatibility) {
    compatibility = compatibility || { summary: "", platformNotes: [], deviceSignals: [], suggestions: [] };
    compatibility.platformNotes = [...(compatibility.platformNotes || []), ...visual.compatibility.platformNotes].slice(0, 6);
    if (!compatibility.summary) compatibility.summary = visual.compatibility.summary || "";
  }

  const runs = (Number(prev.visualAdded?.runs) || 0) + 1;
  const result = {
    ...prev,
    _base: base,
    healthScore,
    findings,
    approvalRisks: risks,
    compatibility,
    accessibilityChecks: visual.accessibilityChecks || base.accessibilityChecks || null,
    lensScores: computeLensScores(findings),
    visualAdded: { at: now.toISOString(), runs, screens: screenCount ?? null, scoreBefore: baseScore, scoreAfter: healthScore },
  };
  return { result, counts: { healthScore, bad: count(findings, "bad"), warn: count(findings, "warn"), good: count(findings, "good") } };
}
