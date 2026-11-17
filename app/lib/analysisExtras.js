// Sanitizes the three optional "signals" sections the AI returns (performanceStability,
// compatibility, accessibilityChecks) and attaches the exact review counts computed server-side.
// Model output is untrusted: wrong types, unknown enum values, runaway lengths and extra keys are
// all coerced or dropped here so the report UI can render whatever comes out without guarding.

import { computeReviewSignals } from "./reviewSignals.js";

const SIGNAL_TYPES = ["slow", "crash", "battery", "loading", "freeze", "storage", "network", "other"];
const SEVERITIES = ["high", "medium", "low"];
const CHECKS = ["touch_targets", "text_size", "contrast", "color_only", "labels"];
const CHECK_STATUS = ["good", "warn", "bad", "unknown"];

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function str(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

function oneOf(v, allowed, fallback) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return allowed.includes(s) ? s : fallback;
}

function strList(v, maxItems, maxLen) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);
}

export function normalizePerformance(raw) {
  if (!isObj(raw)) return null;
  const signals = (Array.isArray(raw.signals) ? raw.signals : [])
    .filter(isObj)
    .map((s) => ({
      type: oneOf(s.type, SIGNAL_TYPES, "other"),
      label: str(s.label, 80),
      severity: oneOf(s.severity, SEVERITIES, "medium"),
      evidence: str(s.evidence, 240),
    }))
    .filter((s) => s.label)
    .slice(0, 6);
  const out = {
    summary: str(raw.summary, 400),
    signals,
    suggestions: strList(raw.suggestions, 4, 200),
  };
  return out.summary || signals.length || out.suggestions.length ? out : null;
}

export function normalizeCompatibility(raw) {
  if (!isObj(raw)) return null;
  const platformNotes = (Array.isArray(raw.platformNotes) ? raw.platformNotes : [])
    .filter(isObj)
    .map((n) => ({
      issue: str(n.issue, 240),
      guideline: str(n.guideline, 120),
      severity: oneOf(n.severity, SEVERITIES, "medium"),
    }))
    .filter((n) => n.issue)
    .slice(0, 5);
  const deviceSignals = (Array.isArray(raw.deviceSignals) ? raw.deviceSignals : [])
    .filter(isObj)
    .map((d) => ({ label: str(d.label, 80), evidence: str(d.evidence, 240) }))
    .filter((d) => d.label)
    .slice(0, 5);
  const out = {
    summary: str(raw.summary, 400),
    platformNotes,
    deviceSignals,
    suggestions: strList(raw.suggestions, 4, 200),
  };
  return out.summary || platformNotes.length || deviceSignals.length || out.suggestions.length ? out : null;
}

export function normalizeAccessibilityChecks(raw) {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  const checks = [];
  for (const c of raw) {
    if (!isObj(c)) continue;
    const check = oneOf(c.check, CHECKS, null);
    if (!check || seen.has(check)) continue; // one row per check, first wins
    seen.add(check);
    checks.push({
      check,
      status: oneOf(c.status, CHECK_STATUS, "unknown"),
      note: str(c.note, 260),
      standard: str(c.standard, 100),
    });
  }
  return checks.length ? checks : null;
}

// Mutates and returns `result`. `reviews` is the raw sampled list (or null), `hasImages` whether
// screenshots were provided: sections that need evidence the user didn't supply are removed
// even if the model produced them anyway.
export function applyAnalysisExtras(result, { reviews, hasImages }) {
  const hasReviews = Array.isArray(reviews) && reviews.length > 0;

  result.performanceStability = hasReviews ? normalizePerformance(result.performanceStability) : null;
  result.compatibility =
    hasReviews || hasImages ? normalizeCompatibility(result.compatibility) : null;
  result.accessibilityChecks = hasImages ? normalizeAccessibilityChecks(result.accessibilityChecks) : null;

  if (hasReviews) {
    const signals = computeReviewSignals(reviews);
    // Exact counts win over anything the model wrote: attached as separate fields.
    if (result.performanceStability) {
      result.performanceStability.mentions = signals.performance;
      result.performanceStability.totalReviews = signals.totalReviews;
    } else if (signals.performance.affected > 0) {
      result.performanceStability = {
        summary: "",
        signals: [],
        suggestions: [],
        mentions: signals.performance,
        totalReviews: signals.totalReviews,
      };
    }
    const c = signals.compatibility;
    const hasCompat = c.devices.length || c.osVersions.length || c.afterUpdate || c.layoutIssues;
    if (result.compatibility) {
      result.compatibility.mentions = c;
      result.compatibility.totalReviews = signals.totalReviews;
    } else if (hasCompat) {
      result.compatibility = {
        summary: "",
        platformNotes: [],
        deviceSignals: [],
        suggestions: [],
        mentions: c,
        totalReviews: signals.totalReviews,
      };
    }
  }
  return result;
}
