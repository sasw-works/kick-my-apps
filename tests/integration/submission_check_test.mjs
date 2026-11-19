// Pre-submission checklist rules. Run: node tests/integration/submission_check_test.mjs
import { checkSubmission, STORES } from "../../app/lib/submissionCheck.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));
const find = (res, id) => res.items.find((i) => i.id === id);
const long = "This app helps small teams plan their week. ".repeat(10);
const allConfirms = (store) => Object.fromEntries(STORES[store].confirms.map((q) => [q.key, true]));
const good = (store) => store === "apple"
  ? { store, fields: { name: "Plan Week", subtitle: "Plan your week fast", keywords: "planner,calendar,tasks,todo,team,agenda,schedule,reminders,goals,habits,focus,deadline,weekly", promo: "New this week", description: long, whatsNew: "Fixes" }, screenshots: 5, confirms: allConfirms(store) }
  : { store, fields: { name: "Plan Week", short: "Plan your week fast with your team", description: long, whatsNew: "Fixes" }, screenshots: 5, confirms: allConfirms(store) };

console.log("== 1. a complete draft");
for (const s of ["apple", "play"]) {
  const r = checkSubmission(good(s));
  check(`${s}: nothing failing, nothing left to confirm`, r.summary.fail === 0 && r.summary.todo === 0 && r.summary.ready, JSON.stringify(r.summary));
}

console.log("== 2. limits and empties");
let r = checkSubmission({ store: "apple", fields: { name: "A name that is far longer than thirty characters", subtitle: "", keywords: "", description: "" }, screenshots: 0, confirms: {} });
check("name too long is a fail with the overshoot", /too long/.test(find(r, "field:name").title) && find(r, "field:name").status === "fail");
check("required empties fail, optional ones are todo", find(r, "field:subtitle").status === "fail" && find(r, "field:promo").status === "info");
check("no screenshots fails", find(r, "shots").status === "fail");
check("optional empties never block readiness", checkSubmission({ ...good("apple"), fields: { ...good("apple").fields, promo: "", whatsNew: "" } }).summary.ready);
check("not ready, with a red verdict", !r.summary.ready && /Fix the red/.test(r.summary.verdict));
r = checkSubmission({ ...good("play"), screenshots: 1 });
check("Play needs 2 screenshots, Apple only 1", find(r, "shots").status === "fail" && checkSubmission({ ...good("apple"), screenshots: 1 }).items.find((i) => i.id === "shots").status === "warn");
check("too many screenshots fails", checkSubmission({ ...good("apple"), screenshots: 11 }).items.find((i) => i.id === "shots").status === "fail");
check("Play what's new is limited to 500", checkSubmission({ ...good("play"), fields: { ...good("play").fields, whatsNew: "x".repeat(501) } }).items.find((i) => i.id === "field:whatsNew").status === "fail");

console.log("== 3. content rules");
r = checkSubmission({ ...good("apple"), fields: { ...good("apple").fields, description: "TODO write this. " + long } });
check("placeholder text fails", find(r, "field:description:placeholder")?.status === "fail");
r = checkSubmission({ ...good("apple"), fields: { ...good("apple").fields, subtitle: "The #1 best app ever" } });
check("ranking claims warn", find(r, "field:subtitle:claims")?.status === "warn");
r = checkSubmission({ ...good("apple"), fields: { ...good("apple").fields, keywords: "planner, planner,week" } });
check("repeated keywords and spaces after commas warn", find(r, "kw:dup") && find(r, "kw:spaces"));
r = checkSubmission({ ...good("apple"), fields: { ...good("apple").fields, keywords: "plan,week,calendar" } });
check("keywords repeating the name warn", find(r, "kw:name")?.detail.includes("plan"));
check("emoji in the name warns", checkSubmission({ ...good("apple"), fields: { ...good("apple").fields, name: "Plan 🚀 Week" } }).items.some((i) => i.id === "name:emoji"));

console.log("== 4. confirmations and junk input");
r = checkSubmission({ ...good("apple"), confirms: { privacyUrl: true } });
check("unticked confirmations are todo, not ready", r.summary.todo === STORES.apple.confirms.length - 1 && !r.summary.ready);
check("only a literal true counts", checkSubmission({ ...good("apple"), confirms: { privacyUrl: "yes", supportUrl: 1 } }).items.find((i) => i.id === "confirm:privacyUrl").status === "todo");
check("junk input doesn't throw and defaults to the App Store", checkSubmission(null).store === "apple" && checkSubmission({ store: "x", fields: 5, screenshots: "a", confirms: [] }).items.length > 0);

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
