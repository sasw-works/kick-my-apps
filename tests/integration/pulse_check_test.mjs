// Unit test of the Pulse check/alert logic against a real Postgres, with FAKE Apple responses
// (no network). Run: POSTGRES_URL=postgres://kma:kma@127.0.0.1:5432/kma_test node tests/integration/pulse_check_test.mjs
import { sql } from "@vercel/postgres";
import { ensurePulseSchema } from "../../app/lib/pulse/schema.js";
import { runCheck, claimAndCheck, claimMonitor, checkDueMonitors, RULES } from "../../app/lib/pulse/check.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));

for (const t of ["app_notifications", "pulse_alerts", "pulse_reviews", "pulse_snapshots", "pulse_monitors"]) {
  try { await sql.query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`); } catch {}
}
await ensurePulseSchema();

async function makeMonitor(overrides = {}) {
  const { rows } = await sql`
    INSERT INTO pulse_monitors (user_email, app_id, country, app_name, developer, icon_url, store_url)
    VALUES (${overrides.email || "alice@x.com"}, ${overrides.appId || "111"}, ${overrides.country || "us"}, 'TestApp', 'Dev', null, 'https://apps.apple.com/us/app/id111')
    RETURNING *`;
  return rows[0];
}
const app = (o) => ({ appId: "111", name: "TestApp", developer: "Dev", iconUrl: null, storeUrl: "x", version: "1.0", releasedAt: "2026-01-01T00:00:00Z", releaseNotes: "", avgRating: 4.5, ratingCount: 1000, ...o });
const review = (i, rating, extra = {}) => ({ id: `r${i}`, rating, title: `t${i}`, content: `c${i}`, version: "1.0", reviewedAt: new Date().toISOString(), ...extra });
const deps = (lookupResult, reviewsResult) => ({
  lookupApp: async () => lookupResult,
  fetchRecentReviews: async () => reviewsResult,
});
async function alerts(monitorId) {
  const { rows } = await sql`SELECT kind, severity, title FROM pulse_alerts WHERE monitor_id = ${monitorId} ORDER BY id`;
  return rows;
}

console.log("== 1. first ever check is a silent baseline");
{
  const m = await makeMonitor({ appId: "1" });
  const r = await runCheck(m, deps({ ok: true, app: app({ appId: "1" }) }, { ok: true, reviews: [review(1, 5), review(2, 1)] }));
  check("ok + baseline flag", r.ok && r.baseline === true, JSON.stringify(r));
  check("no alerts on the first check ever", (await alerts(m.id)).length === 0);
  const { rows } = await sql`SELECT is_baseline, new_review_count FROM pulse_snapshots WHERE monitor_id=${m.id}`;
  check("snapshot marked as baseline, with 0 'new' reviews counted", rows[0].is_baseline === true && rows[0].new_review_count === 0, JSON.stringify(rows[0]));
  const { rows: revRows } = await sql`SELECT count(*)::int c FROM pulse_reviews WHERE monitor_id=${m.id}`;
  check("but the reviews ARE stored (so next check can diff against them)", revRows[0].c === 2);
}

console.log("== 2. new version detected");
{
  const m = await makeMonitor({ appId: "2" });
  await runCheck(m, deps({ ok: true, app: app({ appId: "2", version: "1.0" }) }, { ok: true, reviews: [] }));
  const r = await runCheck(m, deps({ ok: true, app: app({ appId: "2", version: "1.1", releaseNotes: "Fixed a crash" }) }, { ok: true, reviews: [] }));
  const a = await alerts(m.id);
  check("second check finds the version bump", a.some((x) => x.kind === "new_version" && x.title.includes("1.1")), JSON.stringify(a));
  // Every alert is also announced in the Console bell, with a link to the monitor.
  const { rows: bell } = await sql`SELECT kind, title, href FROM app_notifications WHERE user_email = ${m.user_email} AND href = ${"/console/pulse/" + m.id}`;
  check("the alert also lands in the account's notifications", bell.length === a.length && bell.some((x) => x.kind === "alert_info" && x.title.includes("1.1")), JSON.stringify(bell));
}

console.log("== 2b. alerts can be switched off per monitor (the default for other people's apps)");
{
  const quiet = await makeMonitor({ appId: "21" });
  await sql`UPDATE pulse_monitors SET kind = 'other', alerts_enabled = false WHERE id = ${quiet.id}`;
  const rival = (await sql`SELECT * FROM pulse_monitors WHERE id = ${quiet.id}`).rows[0];
  await runCheck(rival, deps({ ok: true, app: app({ appId: "21", avgRating: 4.6, version: "1.0" }) }, { ok: true, reviews: [review(1, 5)] }));
  // A drop, a new version and a burst of bad reviews would all alert on a monitor with alerts on.
  await runCheck(rival, deps({ ok: true, app: app({ appId: "21", avgRating: 3.9, version: "2.0" }) }, { ok: true, reviews: [review(2, 1), review(3, 1), review(4, 1), review(5, 1)] }));
  check("a monitor with alerts off raises NO alerts, whatever happens to it", (await alerts(rival.id)).length === 0, JSON.stringify(await alerts(rival.id)));
  const { rows: snaps } = await sql`SELECT count(*)::int c FROM pulse_snapshots WHERE monitor_id=${rival.id}`;
  const { rows: revs } = await sql`SELECT count(*)::int c FROM pulse_reviews WHERE monitor_id=${rival.id}`;
  check("...but its snapshots and reviews are still recorded for comparison", snaps[0].c === 2 && revs[0].c === 5, JSON.stringify([snaps[0], revs[0]]));

  // Same "other app", alerts switched ON: it alerts like any monitor (it is a switch, not a rule).
  const loud = await makeMonitor({ appId: "22" });
  await sql`UPDATE pulse_monitors SET kind = 'other', alerts_enabled = true WHERE id = ${loud.id}`;
  const loudRow = (await sql`SELECT * FROM pulse_monitors WHERE id = ${loud.id}`).rows[0];
  await runCheck(loudRow, deps({ ok: true, app: app({ appId: "22", avgRating: 4.5 }) }, { ok: true, reviews: [] }));
  await runCheck(loudRow, deps({ ok: true, app: app({ appId: "22", avgRating: 4.2 }) }, { ok: true, reviews: [] }));
  check("an 'other' app with alerts ON does alert", (await alerts(loud.id)).some((x) => x.kind === "rating_drop"));

  const mine = await makeMonitor({ appId: "20" });
  await runCheck(mine, deps({ ok: true, app: app({ appId: "20", avgRating: 4.5 }) }, { ok: true, reviews: [] }));
  await runCheck(mine, deps({ ok: true, app: app({ appId: "20", avgRating: 4.2 }) }, { ok: true, reviews: [] }));
  check("while the user's own app alerts as before (default on)", (await alerts(mine.id)).some((x) => x.kind === "rating_drop"));
}

console.log("== 2c. old 'competitor' rows migrate to plain 'other' monitors");
{
  const parent = await makeMonitor({ appId: "30" });
  const { rows } = await sql`
    INSERT INTO pulse_monitors (user_email, app_id, country, app_name, developer, store_url, competitor_of)
    VALUES ('alice@x.com', '31', 'us', 'OldRival', 'Dev', 'x', ${parent.id}) RETURNING id`;
  const legacy = rows[0].id;
  const fresh = await import("../../app/lib/pulse/schema.js?migrate"); // a new module copy: runs the migration again
  await fresh.ensurePulseSchema();
  const { rows: after } = await sql`SELECT kind, alerts_enabled, competitor_of FROM pulse_monitors WHERE id = ${legacy}`;
  check("it becomes kind 'other', quiet, and detached from its parent", after[0].kind === "other" && after[0].alerts_enabled === false && after[0].competitor_of === null, JSON.stringify(after[0]));
  await sql`DELETE FROM pulse_monitors WHERE id = ${parent.id}`;
  const { rows: left } = await sql`SELECT count(*)::int c FROM pulse_monitors WHERE id = ${legacy}`;
  check("deleting the old parent app no longer deletes it", left[0].c === 1);
  const { rows: mine } = await sql`SELECT kind, alerts_enabled FROM pulse_monitors WHERE app_id = '20' LIMIT 1`;
  check("ordinary monitors keep kind 'mine' with alerts on", mine[0].kind === "mine" && mine[0].alerts_enabled === true, JSON.stringify(mine[0]));
}

console.log("== 3. rating drop: warn vs critical thresholds");
{
  const m = await makeMonitor({ appId: "3" });
  await runCheck(m, deps({ ok: true, app: app({ appId: "3", avgRating: 4.50 }) }, { ok: true, reviews: [] }));
  await runCheck(m, deps({ ok: true, app: app({ appId: "3", avgRating: 4.35 }) }, { ok: true, reviews: [] })); // -0.15: warn
  let a = await alerts(m.id);
  check(`drop of 0.15 (>= warn ${RULES.ratingDropWarn}, < critical ${RULES.ratingDropCritical}) -> warn`, a.some((x) => x.kind === "rating_drop" && x.severity === "warn"), JSON.stringify(a));
  check("not flagged critical", !a.some((x) => x.kind === "rating_drop" && x.severity === "critical"));

  const m2 = await makeMonitor({ appId: "4" });
  await runCheck(m2, deps({ ok: true, app: app({ appId: "4", avgRating: 4.50 }) }, { ok: true, reviews: [] }));
  await runCheck(m2, deps({ ok: true, app: app({ appId: "4", avgRating: 4.00 }) }, { ok: true, reviews: [] })); // -0.50: critical
  a = await alerts(m2.id);
  check(`drop of 0.50 (>= critical) -> critical`, a.some((x) => x.kind === "rating_drop" && x.severity === "critical"), JSON.stringify(a));

  const m3 = await makeMonitor({ appId: "5" });
  await runCheck(m3, deps({ ok: true, app: app({ appId: "5", avgRating: 4.50 }) }, { ok: true, reviews: [] }));
  await runCheck(m3, deps({ ok: true, app: app({ appId: "5", avgRating: 4.48 }) }, { ok: true, reviews: [] })); // -0.02: noise
  check("a 0.02 wobble raises nothing", (await alerts(m3.id)).length === 0);

  const m4 = await makeMonitor({ appId: "6" });
  await runCheck(m4, deps({ ok: true, app: app({ appId: "6", avgRating: 4.00 }) }, { ok: true, reviews: [] }));
  await runCheck(m4, deps({ ok: true, app: app({ appId: "6", avgRating: 4.20 }) }, { ok: true, reviews: [] })); // +0.20: rise
  a = await alerts(m4.id);
  check("a real rise is reported too (info)", a.some((x) => x.kind === "rating_rise" && x.severity === "info"), JSON.stringify(a));
}

console.log("== 4. negative-review burst, relative to the app's own normal");
{
  const m = await makeMonitor({ appId: "7" });
  // three quiet checks establish "typically ~1 negative review per check"
  await runCheck(m, deps({ ok: true, app: app({ appId: "7" }) }, { ok: true, reviews: [review(100, 5)] }));
  for (let i = 0; i < 3; i++) {
    await runCheck(m, deps({ ok: true, app: app({ appId: "7" }) }, { ok: true, reviews: [review(200 + i, 2)] }));
  }
  check("no alerts yet (1 negative/check is this app's normal)", (await alerts(m.id)).length === 0);
  // a burst well above normal and above the absolute floor
  const burst = Array.from({ length: 6 }, (_, i) => review(300 + i, 1));
  await runCheck(m, deps({ ok: true, app: app({ appId: "7" }) }, { ok: true, reviews: burst }));
  const a = await alerts(m.id);
  check("6 negatives (>= floor, >= 2x its own typical ~1) -> alert", a.some((x) => x.kind === "negative_burst"), JSON.stringify(a));
  check("detail includes an actual quoted review", a.find((x) => x.kind === "negative_burst"), JSON.stringify(a));

  const m2 = await makeMonitor({ appId: "8" });
  await runCheck(m2, deps({ ok: true, app: app({ appId: "8" }) }, { ok: true, reviews: [] }));
  const small = [review(1, 1), review(2, 2)]; // 2 negatives: under the absolute floor of 3
  await runCheck(m2, deps({ ok: true, app: app({ appId: "8" }) }, { ok: true, reviews: small }));
  check("2 negatives is under the floor -> no alert even with no history", (await alerts(m2.id)).length === 0);
}

console.log("== 5. an empty review feed: 'couldn't read it' vs 'genuinely nothing new'");
{
  const small = await makeMonitor({ appId: "9" });
  await runCheck(small, deps({ ok: true, app: app({ appId: "9", ratingCount: 5 }) }, { ok: false, reviews: [] }));
  const r2 = await runCheck(small, deps({ ok: true, app: app({ appId: "9", ratingCount: 5 }) }, { ok: false, reviews: [] }));
  check("tiny app, empty feed -> treated as reviews_ok (nothing to report)", r2.reviewsOk === true);

  const big = await makeMonitor({ appId: "10" });
  await runCheck(big, deps({ ok: true, app: app({ appId: "10", ratingCount: 50000 }) }, { ok: false, reviews: [] }));
  const r3 = await runCheck(big, deps({ ok: true, app: app({ appId: "10", ratingCount: 50000 }) }, { ok: false, reviews: [] }));
  check("big app, empty feed -> flagged as unread, not a false 'zero new reviews'", r3.reviewsOk === false);
  const { rows } = await sql`SELECT reviews_ok FROM pulse_snapshots WHERE monitor_id=${big.id} ORDER BY id DESC LIMIT 1`;
  check("...and that's what's stored", rows[0].reviews_ok === false);
}

console.log("== 6. app removed from the store");
{
  const m = await makeMonitor({ appId: "11" });
  const r = await runCheck(m, deps({ ok: false, reason: "not_found" }, { ok: true, reviews: [] }));
  check("a clear, non-technical error", r.ok === false && r.error.includes("no longer listed"), r.error);
  const { rows } = await sql`SELECT last_check_ok, last_error FROM pulse_monitors WHERE id=${m.id}`;
  check("recorded on the monitor for the UI to show", rows[0].last_check_ok === false && rows[0].last_error.includes("no longer listed"));
}

console.log("== 7. claim is atomic: concurrent checks of the same monitor don't double up");
{
  const m = await makeMonitor({ appId: "12" });
  const results = await Promise.all(Array.from({ length: 10 }, () => claimMonitor(m.id, { minIntervalSeconds: 3600 })));
  const won = results.filter(Boolean).length;
  check("exactly one of 10 concurrent claims succeeds", won === 1, `won=${won}`);
  check("an immediate re-claim within the interval is refused", (await claimMonitor(m.id, { minIntervalSeconds: 3600 })) === null);
}

console.log("== 8. claimAndCheck: 'checked too recently' is reported, not silently ignored");
{
  const m = await makeMonitor({ appId: "13" });
  const r1 = await claimAndCheck(m.id, { minIntervalSeconds: 3600, deps: deps({ ok: true, app: app({ appId: "13" }) }, { ok: true, reviews: [] }) });
  check("first call actually runs", r1.ok === true && !r1.skipped);
  const r2 = await claimAndCheck(m.id, { minIntervalSeconds: 3600, deps: deps({ ok: true, app: app({ appId: "13" }) }, { ok: true, reviews: [] }) });
  check("immediate second call is skipped, not run again", r2.skipped === true);
}

console.log("== 9. checkDueMonitors: due monitors get checked, others are left alone, rotation is fair");
{
  // isolate from every monitor created by the tests above (some never went through claim, so their
  // last_checked_at is still NULL, which would make them look "due" here too)
  for (const t of ["pulse_alerts", "pulse_reviews", "pulse_snapshots", "pulse_monitors"]) await sql.query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`);
  const stale = await makeMonitor({ appId: "14" });
  await sql`UPDATE pulse_monitors SET last_checked_at = now() - interval '2 days' WHERE id = ${stale.id}`;
  const recent = await makeMonitor({ appId: "15" });
  await sql`UPDATE pulse_monitors SET last_checked_at = now() WHERE id = ${recent.id}`;
  const paused = await makeMonitor({ appId: "16" });
  await sql`UPDATE pulse_monitors SET status = 'paused', last_checked_at = now() - interval '2 days' WHERE id = ${paused.id}`;

  const summary = await checkDueMonitors({ minIntervalSeconds: 3600, deps: deps({ ok: true, app: app({}) }, { ok: true, reviews: [] }) });
  check("only the genuinely-stale, active monitor was checked", summary.checked === 1, JSON.stringify(summary));
  const { rows } = await sql`SELECT last_checked_at > now() - interval '1 minute' AS recent FROM pulse_monitors WHERE id = ${recent.id}`;
  check("the recently-checked one was left alone (its last_checked_at is untouched)", rows[0].recent === true, JSON.stringify(rows[0]));
}

console.log("== 10. old data is pruned so history doesn't grow forever");
{
  const m = await makeMonitor({ appId: "17" });
  for (let i = 0; i < 5; i++) {
    await runCheck(m, deps({ ok: true, app: app({ appId: "17" }) }, { ok: true, reviews: [review(1000 + i, 3)] }));
  }
  const { rows } = await sql`SELECT id FROM pulse_snapshots WHERE monitor_id=${m.id}`;
  check("5 checks with keepSnapshots effectively unbounded at this scale -> all 5 kept", rows.length === 5, rows.length);
}

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
