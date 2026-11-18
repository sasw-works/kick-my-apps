// Unit test for app/lib/projects.js (no server or database): node tests/integration/projects_test.mjs
import { projectKey, computeProjectTasks, groupProjects } from "../../app/lib/projects.js";
let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };
const f = (key, status) => ({ key, status, title: key, finding: "f", suggestion: "s" });
const scan = (id, at, ...findings) => ({ id, created_at: at, findings });
const T0 = "2026-01-01T00:00:00Z", T1 = "2026-01-02T00:00:00Z", T2 = "2026-01-03T00:00:00Z";
const keys = (a) => a.map((x) => x.key).join(",");

console.log("== projectKey");
check("store link id wins over name", projectKey("Foo", "https://apps.apple.com/us/app/foo/id389801252") === "app:389801252");
check("same app, different display name -> same project", projectKey("Foo 2", "https://apps.apple.com/tr/app/x/id389801252?l=tr") === "app:389801252");
check("no link -> by lowercase trimmed name", projectKey("  My App ", "") === "name:my app" && projectKey("my app", null) === "name:my app");
check("garbage input is safe", projectKey(undefined, undefined) === "name:");

console.log("== computeProjectTasks");
let r = computeProjectTasks([scan(2, T1, f("a", "bad"), f("b", "warn"), f("c", "good"))]);
check("only bad/warn become tasks, critical first", keys(r.tasks) === "a,b" && r.tasks[0].severity === "bad");
check("everything starts as todo; nothing is 'new' without a previous report", r.tasks.every((t) => t.status === "todo" && !t.isNew && !t.reappeared));
check("empty input is safe", computeProjectTasks([]).tasks.length === 0);

r = computeProjectTasks([scan(2, T1, f("a", "bad")), scan(1, T0, f("a", "bad"))], { a: { status: "done", updated_at: T2 } });
check("done AFTER the latest scan stays done", r.tasks[0].status === "done" && !r.tasks[0].reappeared);
r = computeProjectTasks([scan(2, T2, f("a", "bad")), scan(1, T0, f("a", "bad"))], { a: { status: "done", updated_at: T1 } });
check("done BEFORE a scan that still flags it -> back to todo, marked 'came back'", r.tasks[0].status === "todo" && r.tasks[0].reappeared === true);
r = computeProjectTasks([scan(2, T2, f("a", "bad"))], { a: { status: "wontdo", updated_at: T0 } });
check("'won't do' is kept across a newer scan", r.tasks[0].status === "wontdo" && !r.tasks[0].reappeared);

r = computeProjectTasks([scan(2, T1, f("a", "good"), f("b", "bad"), f("n", "warn")), scan(1, T0, f("a", "bad"), f("b", "bad"), f("n", "good"))]);
check("bad -> good is 'verified fixed'", keys(r.verified) === "a", keys(r.verified));
check("a new issue is flagged new; a persisting one is not", r.tasks.find((t) => t.key === "n").isNew && !r.tasks.find((t) => t.key === "b").isNew);
r = computeProjectTasks([scan(2, T1, f("a", "bad")), scan(1, T0, f("zzz", "bad"))]);
check("a category missing from the newer scan isn't claimed fixed", r.verified.length === 0);
check("counts add up", r.counts.todo === 1 && r.counts.done === 0 && r.counts.verified === 0);

console.log("== groupProjects");
const g = groupProjects([
  { id: 3, app_name: "A", store_url: "https://apps.apple.com/us/app/a/id111111" },
  { id: 2, app_name: "B", store_url: "" },
  { id: 1, app_name: "A renamed", store_url: "https://apps.apple.com/us/app/a/id111111" },
]);
check("reports of one app group together (newest first), keyed by store id", g.length === 2 && g[0].key === "app:111111" && g[0].scans.length === 2 && g[0].scans[0].id === 3);

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
