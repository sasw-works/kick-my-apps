// A "project" is one app: all of a user's reports of the same app. Task progress belongs to the
// project, not to a single report, so it survives re-scans.

const isOpen = (s) => s === "bad" || s === "warn";

// Prefers the App Store id (or Play package name) from the link (stable even if the name changes); falls back to the name
// for analyses made from screenshots only.
export function projectKey(appName, storeUrl) {
  // Google Play links carry the package name: ...play.google.com/store/apps/details?id=com.example.app
  const play = typeof storeUrl === "string" ? storeUrl.match(/^https:\/\/play\.google\.com\/.*[?&]id=([A-Za-z][\w]*(?:\.[A-Za-z][\w]*)+)/) : null;
  if (play) return `app:${play[1].toLowerCase()}`;
  const m = typeof storeUrl === "string" ? storeUrl.match(/id(\d{4,})/) : null;
  if (m) return `app:${m[1]}`;
  return `name:${String(appName || "").trim().toLowerCase().slice(0, 120)}`;
}

export const TASK_STATUSES = ["todo", "inprogress", "done", "wontdo"];

// scansNewestFirst: one project's reports, [{ id, created_at, findings }]. statusByKey: what the
// user has recorded, { findingKey: { status: "done"|"wontdo", updated_at } }.
//
//  - tasks: every issue (bad/warn) in the LATEST report. Status is what the user set, except an
//    item they marked done that the latest scan still flags is put back to "todo" with
//    reappeared=true (the scan is newer than their tick).
//  - isNew: issue that wasn't an issue in the previous report.
//  - verified: issues that a newer scan now reports as good (fixed, confirmed by a scan).
//  - extraTasks: tasks that don't come from a report (made from review complaint topics). They keep
//    whatever status the user gave them; there is no scan to say they "came back".
export function computeProjectTasks(scansNewestFirst, statusByKey = {}, extraTasks = []) {
  const [latest, prev] = scansNewestFirst;
  if (!latest) return { tasks: [], verified: [], counts: { todo: 0, inprogress: 0, done: 0, wontdo: 0, verified: 0 } };

  const index = (scan) => {
    const m = new Map();
    for (const f of Array.isArray(scan?.findings) ? scan.findings : []) if (f?.key) m.set(f.key, f);
    return m;
  };
  const cur = index(latest);
  const old = index(prev);
  const latestAt = new Date(latest.created_at).getTime();

  const tasks = [];
  const verified = [];
  for (const [key, f] of cur) {
    const stored = statusByKey[key];
    if (isOpen(f.status)) {
      let status = stored?.status === "done" || stored?.status === "wontdo" || stored?.status === "inprogress" ? stored.status : "todo";
      let reappeared = false;
      if (status === "done" && new Date(stored.updated_at).getTime() < latestAt) {
        status = "todo";
        reappeared = true;
      }
      const p = old.get(key);
      tasks.push({
        key,
        title: String(f.title || key).slice(0, 160),
        severity: f.status,
        finding: String(f.finding || "").slice(0, 600),
        suggestion: String(f.suggestion || "").slice(0, 600),
        status,
        isNew: Boolean(prev) && (!p || p.status === "good"),
        reappeared,
      });
    } else if (f.status === "good") {
      const p = old.get(key);
      if ((p && isOpen(p.status)) || stored) {
        verified.push({ key, title: String(f.title || key).slice(0, 160) });
      }
    }
  }
  for (const x of Array.isArray(extraTasks) ? extraTasks : []) {
    if (!x?.key) continue;
    const stored = statusByKey[x.key]?.status;
    tasks.push({
      key: x.key,
      title: String(x.title || x.key).slice(0, 160),
      severity: x.severity === "bad" ? "bad" : "warn",
      finding: String(x.finding || "").slice(0, 600),
      suggestion: String(x.suggestion || "").slice(0, 600),
      status: stored === "done" || stored === "wontdo" || stored === "inprogress" ? stored : "todo",
      isNew: false,
      reappeared: false,
      source: x.source || "review",
    });
  }
  tasks.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "bad" ? -1 : 1));

  const counts = { todo: 0, inprogress: 0, done: 0, wontdo: 0, verified: verified.length };
  for (const t of tasks) counts[t.status] += 1;
  return { tasks, verified, counts };
}

// Groups a user's reports (newest first) into projects, newest project first.
export function groupProjects(scansNewestFirst) {
  const map = new Map();
  for (const s of scansNewestFirst) {
    const key = projectKey(s.app_name, s.store_url);
    if (!map.has(key)) map.set(key, { key, appName: s.app_name, storeUrl: s.store_url || "", scans: [] });
    map.get(key).scans.push(s);
  }
  return [...map.values()];
}
