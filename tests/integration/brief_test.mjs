// The weekly product brief: what goes into it (from seeded data), how it reads as text and as email
// HTML (everything user-controlled escaped), and that other people's data never leaks in.
// Run: POSTGRES_URL=postgres://kma:kma@127.0.0.1:5432/kma_test node tests/integration/brief_test.mjs
import { sql } from "@vercel/postgres";
import { ensurePulseSchema } from "../../app/lib/pulse/schema.js";
import { ensureScansSchema } from "../../app/lib/ensureScansSchema.js";
import { buildBrief, briefToText, briefToHtml } from "../../app/lib/brief.js";
import { computeReviewTopics } from "../../app/lib/reviewTopics.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));
await ensurePulseSchema(); await ensureScansSchema();
for (const t of ["pulse_changes", "pulse_alerts", "pulse_reviews", "pulse_snapshots", "pulse_monitors", "scans", "task_status", "custom_tasks"]) { try { await sql.query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`); } catch {} }

const mon = async (email, appId, name, kind = "mine") => (await sql`INSERT INTO pulse_monitors (user_email, app_id, country, app_name, developer, kind, alerts_enabled) VALUES (${email}, ${appId}, 'us', ${name}, 'D', ${kind}, true) RETURNING id`).rows[0].id;
const snap = (id, daysAgo, rating, version, nr, nn) => sql`INSERT INTO pulse_snapshots (monitor_id, version, avg_rating, rating_count, new_review_count, new_negative_count, is_baseline, taken_at) VALUES (${id}, ${version}, ${rating}, 100, ${nr}, ${nn}, false, now() - (${daysAgo}::int * interval '1 day'))`;
const A = "alice@x.com";
const evil = `Evil <img src=x onerror=alert(1)> & Co`;
const m1 = await mon(A, "11111", evil);
await snap(m1, 8, 4.0, "1.0", 3, 1); await snap(m1, 3, 4.2, "1.0", 5, 2); await snap(m1, 1, 4.3, "1.1", 7, 1);
for (let i = 0; i < 4; i++) await sql`INSERT INTO pulse_reviews (monitor_id, review_id, rating, title, content) VALUES (${m1}, ${"c" + i}, 1, '', 'It crashes all the time')`;
const rival = await mon(A, "22222", "RivalOne", "other");
await sql`INSERT INTO pulse_changes (monitor_id, user_email, kind, title, detail, detected_at) VALUES (${rival}, ${A}, 'version', 'Released version 9.0', 'New <b>editor</b>', now() - interval '2 days'), (${rival}, ${A}, 'price', 'Too old to show', 'x', now() - interval '10 days')`;
const findings = [
  { key: "f1", title: "Fix low contrast", status: "bad", finding: "a", suggestion: "b" },
  { key: "f2", title: "Weak main button", status: "warn", finding: "a", suggestion: "b" },
  { key: "f3", title: "Slow onboarding", status: "bad", finding: "a", suggestion: "b" },
  { key: "f4", title: "Already fixed one", status: "bad", finding: "a", suggestion: "b" },
  { key: "f5", title: "All good here", status: "good", finding: "a", suggestion: "b" },
  { key: "f6", title: "Another warning", status: "warn", finding: "a", suggestion: "b" },
];
await sql`INSERT INTO scans (app_name, health_score, result_json, store_url, user_email) VALUES (${evil}, 60, ${JSON.stringify({ healthScore: 60, aiSummary: "x", findings, lensScores: {} })}::jsonb, 'https://apps.apple.com/us/app/x/id11111', ${A})`;
await sql`INSERT INTO task_status (user_email, project_key, finding_key, status) VALUES (${A}, 'app:11111', 'f4', 'done')`;
// someone else's data, which must never appear
const mb = await mon("bob@x.com", "33333", "BobsSecretApp");
await snap(mb, 1, 1.0, "1.0", 99, 99);
await sql`INSERT INTO pulse_changes (monitor_id, user_email, kind, title, detail) VALUES (${await mon("bob@x.com", "44444", "BobRival", "other")}, 'bob@x.com', 'icon', 'Bob rival icon', 'x')`;

console.log("== 1. the data");
const b = await buildBrief(A);
const a = b.apps[0];
check("one app, named, with the latest rating", b.apps.length === 1 && a.name === evil && a.rating === 4.3, JSON.stringify(a));
check("rating change versus a week ago (4.3 vs 4.0 eight days ago)", a.ratingDelta === 0.3, String(a.ratingDelta));
check("new / negative reviews summed over the last 7 days only (12 / 3, not the 8-day-old snapshot)", a.newReviews === 12 && a.newNegative === 3, `${a.newReviews}/${a.newNegative}`);
check("release spotted (1.0 -> 1.1 this week)", a.release === "1.1");
const expectTop = computeReviewTopics(Array.from({ length: 4 }, () => ({ rating: 1, title: "", content: "It crashes all the time" }))).topics[0];
check("most complained-about topic with its count", a.topComplaint?.label === expectTop.label && a.topComplaint.count === 4, JSON.stringify(a.topComplaint));
check("rival changes from the last 7 days only", b.rivals.length === 1 && b.rivals[0].app === "RivalOne" && b.rivals[0].title === "Released version 9.0");
check("top 3 open tasks: critical first, the one marked done and the good one left out", b.todos.map((t) => t.title).join("|") === "Fix low contrast|Slow onboarding|Weak main button" && b.openTaskCount === 4, JSON.stringify(b.todos));
check("another user's apps and rivals never appear", !JSON.stringify(b).includes("Bob") && !JSON.stringify(b).includes("99"));
check("someone with nothing gets an empty brief", (await buildBrief("nobody@x.com")).empty === true);

console.log("== 2. text and html");
const t = briefToText(b);
check("text has the four parts", t.includes("Your apps") && t.includes("What your rivals did") && t.includes("Do this first (4 open in total)") && t.includes("1. [Critical] Fix low contrast"), t);
check("rating, arrow, counts and release in the app line", t.includes("4.30 ★ (▲ 0.3), 12 new reviews (3 negative), version 1.1 released"), t);
check("complaint line says how often", t.includes(`Most complained about: ${expectTop.label} (4 mentions`));
const html = briefToHtml(b, { unsubscribeUrl: 'https://x/unsubscribe?type=brief&token=a"b' });
check("the app name is escaped in the email", !html.includes("<img") && html.includes("Evil &lt;img src=x onerror=alert(1)&gt; &amp; Co"));
check("rival detail text is not put in the email as markup", !html.includes("<b>editor</b>"));
check("the unsubscribe link is there and escaped", html.includes('token=a&quot;b') && html.includes("Turn it off"));
const only = { ...b, apps: [], rivals: [], todos: b.todos.slice(0, 1), openTaskCount: 1 };
check("sections without content are left out", !briefToText(only).includes("Your apps") && !briefToText(only).includes("rivals") && briefToText(only).startsWith("Do this first"));

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
