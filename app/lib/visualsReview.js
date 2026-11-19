// The "store visuals" review: an AI opinion on an app's public icon and screenshots, with the model's
// answer sanitized before it is stored or shown. It is design feedback on what is publicly visible,
// not conversion data: nobody can know from a picture how many people it persuades.

const RATINGS = ["strong", "ok", "weak"];
const ISSUES = ["none", "low", "medium", "high"];

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const str = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const oneOf = (v, allowed, fallback) => {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return allowed.includes(s) ? s : fallback;
};
const strList = (v, maxItems, maxLen) =>
  Array.isArray(v) ? v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];

export function buildVisualsPrompt({ appName, genre, hasIcon, screenshotCount }) {
  const name = str(appName, 80) || "this app";
  return `You are an app-store creative reviewer. You are shown the public store assets of "${name}"${
    genre ? ` (category: ${str(genre, 40)})` : ""
  }: ${hasIcon ? "the app icon first (Image #1), then " : ""}${screenshotCount} store screenshot${
    screenshotCount === 1 ? "" : "s"
  } in the order the store shows them.

Judge only what you can see. Rules:
- Be specific and honest. Name what you see ("the first screenshot has a long caption in small text"),
  not generic advice. If something is fine, say so; do not invent problems.
- You cannot know conversion rates. Never claim a change "will increase downloads"; say what it would
  likely make clearer.
- Look at: whether the icon is simple, distinctive and readable at small size; whether the first two
  screenshots (the ones seen without scrolling) show the core value; caption legibility; visual
  consistency across the set; whether the set tells a story in a sensible order; text-heavy or
  cluttered screenshots; empty states, placeholder data or debug UI left visible.
- Write everything in English, whatever language the screenshots are in.

Return ONLY a JSON object, no markdown fences:
{
  "icon": ${hasIcon ? '{ "rating": "<strong|ok|weak>", "notes": ["<max 3 short observations>"] }' : "null"},
  "firstImpression": { "rating": "<strong|ok|weak>", "note": "<what the first screenshot(s) communicate and whether it's the core value>" },
  "screenshots": [ { "index": <1-based screenshot number, in the order shown, not counting the icon>, "issue": "<none|low|medium|high>", "note": "<one concrete sentence>" } ],
  "consistency": "<one or two sentences on visual consistency and story order across the set>",
  "suggestions": ["<max 4 concrete, prioritized changes>"]
}
Include one "screenshots" entry per screenshot shown.`;
}

export function normalizeVisuals(raw, { hasIcon, screenshotCount }) {
  if (!isObj(raw)) return null;
  const icon =
    hasIcon && isObj(raw.icon)
      ? { rating: oneOf(raw.icon.rating, RATINGS, "ok"), notes: strList(raw.icon.notes, 3, 200) }
      : null;
  const first = isObj(raw.firstImpression)
    ? { rating: oneOf(raw.firstImpression.rating, RATINGS, "ok"), note: str(raw.firstImpression.note, 300) }
    : null;
  const seen = new Set();
  const screenshots = [];
  for (const s of Array.isArray(raw.screenshots) ? raw.screenshots : []) {
    if (!isObj(s)) continue;
    const index = Number.parseInt(s.index, 10);
    if (!Number.isInteger(index) || index < 1 || index > screenshotCount || seen.has(index)) continue;
    const note = str(s.note, 240);
    if (!note) continue;
    seen.add(index);
    screenshots.push({ index, issue: oneOf(s.issue, ISSUES, "low"), note });
  }
  screenshots.sort((a, b) => a.index - b.index);
  const out = {
    icon,
    firstImpression: first && first.note ? first : null,
    screenshots,
    consistency: str(raw.consistency, 400),
    suggestions: strList(raw.suggestions, 4, 220),
  };
  const empty = !out.icon && !out.firstImpression && !out.screenshots.length && !out.consistency && !out.suggestions.length;
  return empty ? null : out;
}

// Pulls the JSON object out of a model answer that may wrap it in fences or chatter.
export function parseModelJson(text) {
  const s = String(text ?? "").replace(/```json|```/gi, "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(s.slice(a, b + 1));
  } catch {
    return null;
  }
}
