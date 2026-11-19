// Reply inbox rules: what needs a reply, the stats maths, Google Play's "developer replied" flag
// and how it lands on stored reviews. Run: POSTGRES_URL=postgres://kma:kma@127.0.0.1:5432/kma_test node tests/integration/reply_inbox_test.mjs
import { sql } from "@vercel/postgres";
import { needsReply, replyStats } from "../../app/lib/replyInbox.js";
import { mapPlayReview } from "../../app/lib/pulse/playStore.js";
import { ensurePulseSchema } from "../../app/lib/pulse/schema.js";
import { runCheck } from "../../app/lib/pulse/check.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));

console.log("== 1. what needs a reply");
check("1-3 stars with text", needsReply({ rating: 1, content: "bad" }) && needsReply({ rating: 3, title: "meh" }));
check("4-5 stars, no text, whitespace only, or bad ratings don't", !needsReply({ rating: 4, content: "x" }) && !needsReply({ rating: 5, content: "x" }) && !needsReply({ rating: 1, content: "", title: "" }) && !needsReply({ rating: 2, content: "  \n" }) && !needsReply({ rating: 0, content: "x" }));

console.log("== 2. stats");
let s = replyStats({ lowTotal: 10, repliedCount: 6, skippedCount: 2, medianSeconds: 5400 });
check("rate leaves skipped reviews out (6 of 8 = 75%)", s.rate === 75 && s.replied === 6 && s.lowTotal === 10 && s.windowDays === 30);
check("median in hours, one decimal", s.medianHours === 1.5);
s = replyStats({ lowTotal: 0, repliedCount: 0, skippedCount: 0, medianSeconds: null });
check("nothing to answer -> no rate, no median (not 0%)", s.rate === null && s.medianHours === null);
check("everything skipped -> no rate", replyStats({ lowTotal: 3, repliedCount: 0, skippedCount: 3, medianSeconds: null }).rate === null);

console.log("== 3. Google Play's reply flag");
check("a review with a developer reply is flagged", mapPlayReview({ id: "a", score: 1, text: "bad", replyText: "Thanks, fixed" }).storeReplied === true);
check("without one it is not", mapPlayReview({ id: "b", score: 1, text: "bad" }).storeReplied === false && mapPlayReview({ id: "c", score: 1, text: "bad", replyText: "" }).storeReplied === false);

console.log("== 4. what a check stores");
for (const t of ["pulse_alerts", "pulse_reviews", "pulse_snapshots", "pulse_monitors"]) { try { await sql.query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`); } catch {} }
await ensurePulseSchema();
const { rows: [m] } = await sql`INSERT INTO pulse_monitors (user_email, app_id, country, app_name, developer, kind, alerts_enabled) VALUES ('a@x.com', 'com.a.b', 'us', 'A', 'D', 'mine', true) RETURNING *`;
const rev = (id, rating, storeReplied) => ({ id, rating, title: "", content: "text " + id, version: "1.0", reviewedAt: new Date().toISOString(), helpfulVotes: 0, storeReplied });
const deps = (reviews) => ({ lookupApp: async () => ({ ok: true, app: { appId: "com.a.b", name: "A", developer: "D", storeUrl: "x", version: "1.0", releasedAt: "2026-01-01T00:00:00Z", avgRating: 4, ratingCount: 10 } }), fetchRecentReviews: async () => ({ ok: true, reviews }) });
await runCheck(m, deps([rev("r1", 1, true), rev("r2", 1, false), rev("r3", 2, undefined)]));
const { rows } = await sql`SELECT review_id, handled_how, handled_at IS NOT NULL AS h FROM pulse_reviews WHERE monitor_id = ${m.id} ORDER BY review_id`;
check("a review the store says was answered is marked 'store'; the others stay open", rows[0].handled_how === "store" && rows[0].h && rows[1].handled_how === null && !rows[1].h && rows[2].handled_how === null, JSON.stringify(rows));
await sql`UPDATE pulse_reviews SET handled_how = 'replied', handled_at = now() WHERE monitor_id = ${m.id} AND review_id = 'r2'`;
await runCheck(m, deps([rev("r1", 1, false), rev("r2", 1, false), rev("r3", 2, false)]));
const { rows: again } = await sql`SELECT review_id, handled_how FROM pulse_reviews WHERE monitor_id = ${m.id} ORDER BY review_id`;
check("a later check never overwrites what is already stored or marked", again[0].handled_how === "store" && again[1].handled_how === "replied" && again[2].handled_how === null, JSON.stringify(again));
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
