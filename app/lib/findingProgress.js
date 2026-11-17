// Compares two reports of the same app (older vs newer) by finding category, so the newer report
// can say "3 issues from last time are fixed". Pure function: no database, easy to test.
//
// Only an explicit "good" in the newer report counts as fixed. A category that is simply missing
// (e.g. the newer scan had no screenshots) is unknown, not fixed, so it's left out entirely.

const isOpen = (s) => s === "bad" || s === "warn";

export function computeProgress(prevFindings, curFindings) {
  const prev = new Map();
  for (const f of Array.isArray(prevFindings) ? prevFindings : []) if (f?.key) prev.set(f.key, f);
  const cur = new Map();
  for (const f of Array.isArray(curFindings) ? curFindings : []) if (f?.key) cur.set(f.key, f);

  const brief = (f) => ({ key: f.key, title: String(f.title || f.key).slice(0, 120), status: f.status });
  const resolved = [], persisting = [], newIssues = [];

  for (const [key, p] of prev) {
    const c = cur.get(key);
    if (!c || !isOpen(p.status)) continue;
    if (c.status === "good") resolved.push(brief(c));
    else if (isOpen(c.status)) persisting.push(brief(c));
  }
  for (const [key, c] of cur) {
    if (!isOpen(c.status)) continue;
    const p = prev.get(key);
    if (!p || p.status === "good") newIssues.push(brief(c));
  }
  return { resolved, persisting, newIssues };
}

export const TRACK_STATUSES = ["done", "wontfix"];
