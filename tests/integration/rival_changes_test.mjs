// Rival change tracking: the pure detection and the change log written at each check, against a
// real Postgres with FAKE store responses. Run: POSTGRES_URL=postgres://kma:kma@127.0.0.1:5432/kma_test node tests/integration/rival_changes_test.mjs
import { sql } from "@vercel/postgres";
import { ensurePulseSchema } from "../../app/lib/pulse/schema.js";
import { runCheck } from "../../app/lib/pulse/check.js";
import { detectChanges, assetKey, screensKey, listingFingerprint } from "../../app/lib/pulse/changes.js";
import { mapPlayApp } from "../../app/lib/pulse/playStore.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));
for (const t of ["pulse_changes", "pulse_alerts", "pulse_reviews", "pulse_snapshots", "pulse_monitors"]) { try { await sql.query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`); } catch {} }
await ensurePulseSchema();

console.log("== 1. asset keys ignore sizing and cache parameters");
check("apple icon: same picture, different size/query -> same key", assetKey("https://is1-ssl.mzstatic.com/image/thumb/Purple/v4/ab/cd/hash1/AppIcon.png/100x100bb.jpg?x=1") === assetKey("https://is2-ssl.mzstatic.com/image/thumb/Purple/v4/ab/cd/hash1/AppIcon.png/512x512bb.jpg"));
check("different picture -> different key", assetKey("https://x.com/a/hash1/i.png/100x100bb.jpg") !== assetKey("https://x.com/a/hash2/i.png/100x100bb.jpg"));
check("google: size suffix ignored", assetKey("https://play-lh.googleusercontent.com/AbC123=w240-h480") === assetKey("https://play-lh.googleusercontent.com/AbC123=w512"));
check("garbage -> null", assetKey(null) === null && assetKey("nonsense") === null && assetKey(5) === null);
check("screenshots: same list gives the same key; none gives null and 0", screensKey(["https://x.com/a", "https://x.com/b"]).key === screensKey(["https://x.com/a", "https://x.com/b"]).key && screensKey([]).key === null && screensKey(undefined).count === 0);

console.log("== 2. detection");
const app = (o) => ({ name: "Rival", version: "1.0", releaseNotes: "", iconUrl: "https://x.com/i/h1/Icon.png/100x100bb.jpg", screenshots: ["https://x.com/s/1", "https://x.com/s/2"], price: "Free", ...o });
const prevOf = (a) => { const f = listingFingerprint(a); return { version: a.version, listing_name: f.listingName, icon_key: f.iconKey, screens_key: f.screensKey, screens_count: f.screensCount, price: f.price }; };
const a0 = app({});
check("identical -> nothing", detectChanges(prevOf(a0), app({})).length === 0);
const v = detectChanges(prevOf(a0), app({ version: "1.1", releaseNotes: "Dark mode!" }));
check("new version with its notes", v.length === 1 && v[0].kind === "version" && v[0].detail === "Dark mode!");
check("version without notes says so", detectChanges(prevOf(a0), app({ version: "1.1" }))[0].detail === "No release notes were published.");
check("icon", detectChanges(prevOf(a0), app({ iconUrl: "https://x.com/i/h2/Icon.png/100x100bb.jpg" })).map((c) => c.kind).join() === "icon");
check("name", detectChanges(prevOf(a0), app({ name: "Rival Pro" }))[0].detail === "“Rival” → “Rival Pro”");
const sc = detectChanges(prevOf(a0), app({ screenshots: ["https://x.com/s/1", "https://x.com/s/9", "https://x.com/s/3"] }));
check("screenshots changed, with the new count", sc.length === 1 && sc[0].kind === "screenshots" && sc[0].detail.includes("3 screenshots now (was 2)"), JSON.stringify(sc));
check("price", detectChanges(prevOf(a0), app({ price: "$4.99" }))[0].detail === "Free → $4.99");
check("several things at once", detectChanges(prevOf(a0), app({ version: "2", price: "$1", name: "R2" })).length === 3);
check("unknown before (null columns) is never reported as a change", detectChanges({ version: "1.0" }, app({ name: "X", price: "$9", iconUrl: "https://x.com/q/Icon.png/1x1.png" })).length === 0);
check("a field the store stopped giving is not a change", detectChanges(prevOf(a0), app({ iconUrl: null, screenshots: [], price: null, name: "" })).length === 0);
check("no previous snapshot -> nothing", detectChanges(null, a0).length === 0);
check("play and apple mappings carry screenshots and price", mapPlayApp({ appId: "a.b", title: "T", screenshots: ["https://p/1"], free: true }).price === "Free" && mapPlayApp({ appId: "a.b", title: "T", screenshots: ["https://p/1"], free: false, priceText: "$2.00" }).price === "$2.00" && mapPlayApp({ appId: "a.b", title: "T", screenshots: ["u"] }).screenshots.length === 1);

console.log("== 3. the change log at each check");
async function monitor(appId, kind, alerts) {
  const { rows } = await sql`INSERT INTO pulse_monitors (user_email, app_id, country, app_name, developer, kind, alerts_enabled, store_url)
    VALUES ('a@x.com', ${appId}, 'us', 'Rival', 'Dev', ${kind}, ${alerts}, 'x') RETURNING *`;
  return rows[0];
}
const deps = (a) => ({ lookupApp: async () => ({ ok: true, app: { appId: "1", developer: "D", storeUrl: "x", releasedAt: "2026-01-01T00:00:00Z", avgRating: 4.5, ratingCount: 1000, ...a } }), fetchRecentReviews: async () => ({ ok: true, reviews: [] }) });
const log = async (id) => (await sql`SELECT kind, title, detail FROM pulse_changes WHERE monitor_id = ${id} ORDER BY id`).rows;
{
  const m = await monitor("1", "other", false);
  await runCheck(m, deps(app({})));
  check("baseline check logs nothing", (await log(m.id)).length === 0);
  const { rows: s0 } = await sql`SELECT listing_name, icon_key, screens_count, price FROM pulse_snapshots WHERE monitor_id = ${m.id}`;
  check("but stores the listing fingerprint for the next check", s0[0].listing_name === "Rival" && s0[0].icon_key && s0[0].screens_count === 2 && s0[0].price === "Free", JSON.stringify(s0[0]));
  await runCheck(m, deps(app({})));
  check("an unchanged check logs nothing", (await log(m.id)).length === 0);
  await runCheck(m, deps(app({ version: "1.1", releaseNotes: "New editor", price: "$2.99", screenshots: ["https://x.com/s/7"] })));
  const l = await log(m.id);
  check("version + screenshots + price logged even though alerts are OFF", l.map((x) => x.kind).sort().join() === "price,screenshots,version", JSON.stringify(l));
  check("and no alert rows were raised (alerts are off)", (await sql`SELECT count(*)::int c FROM pulse_alerts WHERE monitor_id = ${m.id}`).rows[0].c === 0);
  await runCheck(m, deps(app({ version: "1.1", releaseNotes: "New editor", price: "$2.99", screenshots: ["https://x.com/s/7"] })));
  check("the same state again logs nothing more (no duplicates)", (await log(m.id)).length === 3);
}
{
  const own = await monitor("2", "mine", true);
  await runCheck(own, deps(app({ price: "Free" })));
  await runCheck(own, deps(app({ price: "$9.99", version: "2.0" })));
  check("your own app gets alerts but no rival change log", (await log(own.id)).length === 0 && (await sql`SELECT count(*)::int c FROM pulse_alerts WHERE monitor_id = ${own.id}`).rows[0].c >= 1);
}
{
  const old = await monitor("3", "other", false);
  await sql`INSERT INTO pulse_snapshots (monitor_id, version, avg_rating, rating_count, is_baseline) VALUES (${old.id}, '1.0', 4.0, 100, false)`; // pre-feature snapshot: new columns NULL
  await runCheck(old, deps(app({ name: "Brand new name", price: "$5" })));
  check("first check after the upgrade (old snapshot, NULL columns) reports no fake changes", (await log(old.id)).length === 0);
}
{
  const gone = await monitor("4", "other", false);
  await runCheck(gone, deps(app({})));
  await sql`DELETE FROM pulse_monitors WHERE id = ${gone.id}`;
  check("deleting the monitor deletes its log", (await sql`SELECT count(*)::int c FROM pulse_changes WHERE monitor_id = ${gone.id}`).rows[0].c === 0);
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
