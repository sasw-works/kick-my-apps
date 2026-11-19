// Delivery of Pulse alerts to the account's chat/webhook channel, against a real Postgres, fake
// Apple responses and a local receiver. Run: POSTGRES_URL=postgres://kma:kma@127.0.0.1:5432/kma_test node tests/integration/notify_test.mjs
import http from "node:http";
import { sql } from "@vercel/postgres";
process.env.WEBHOOK_ALLOW_PRIVATE = "1";
const { ensurePulseSchema } = await import("../../app/lib/pulse/schema.js");
const { ensureNotifySchema } = await import("../../app/lib/notifySchema.js");
const { runCheck } = await import("../../app/lib/pulse/check.js");
const { notifyDigest } = await import("../../app/lib/notify.js");

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));
for (const t of ["pulse_alerts", "pulse_reviews", "pulse_snapshots", "pulse_monitors", "notification_channels"]) {
  try { await sql.query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`); } catch {}
}
await ensurePulseSchema(); await ensureNotifySchema();

let got = [], status = 200;
const srv = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c));
  req.on("end", () => { got.push({ url: req.url, body: JSON.parse(b || "{}") }); res.writeHead(status); res.end(); });
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.address().port}`;

async function monitor(email, appId, { kind = "mine", alerts = true } = {}) {
  const { rows } = await sql`INSERT INTO pulse_monitors (user_email, app_id, country, app_name, developer, kind, alerts_enabled, store_url)
    VALUES (${email}, ${appId}, 'us', 'TestApp', 'Dev', ${kind}, ${alerts}, 'x') RETURNING *`;
  return rows[0];
}
const app = (o) => ({ appId: "1", name: "TestApp", developer: "Dev", iconUrl: null, storeUrl: "x", version: "1.0", releasedAt: "2026-01-01T00:00:00Z", releaseNotes: "", avgRating: 4.5, ratingCount: 1000, ...o });
const deps = (a) => ({ lookupApp: async () => ({ ok: true, app: a }), fetchRecentReviews: async () => ({ ok: true, reviews: [] }) });
const setChannel = (email, kind, path) => sql`INSERT INTO notification_channels (user_email, kind, url) VALUES (${email}, ${kind}, ${base + path})
  ON CONFLICT (user_email) DO UPDATE SET kind = EXCLUDED.kind, url = EXCLUDED.url`;

console.log("== 1. an alert reaches the channel");
{
  await setChannel("a@x.com", "slack", "/slack");
  const m = await monitor("a@x.com", "1");
  await runCheck(m, deps(app({ version: "1.0", avgRating: 4.6 })));
  check("baseline check sends nothing", got.length === 0);
  await runCheck(m, deps(app({ version: "1.1", avgRating: 4.0, releaseNotes: "Fixed it" })));
  check("one message per check, even with several alerts", got.length === 1, JSON.stringify(got));
  const t = got[0]?.body.text || "";
  check("slack shape, app name, both alerts, link to the app's page", t.includes("*TestApp: 2 new alerts*") && t.includes("Version 1.1 released") && t.includes("fell to 4.00") && t.includes(`/console/pulse/${m.id}`), t);
  const { rows } = await sql`SELECT last_ok, last_error FROM notification_channels WHERE user_email='a@x.com'`;
  check("delivery recorded as ok", rows[0].last_ok === true && rows[0].last_error === null);
}

console.log("== 2. alerts switch off = silent");
{
  got = [];
  await setChannel("b@x.com", "generic", "/gen");
  const m = await monitor("b@x.com", "2", { kind: "other", alerts: false });
  await runCheck(m, deps(app({ appId: "2" })));
  await runCheck(m, deps(app({ appId: "2", version: "9.0", avgRating: 3.0 })));
  check("nothing sent for a monitor with alerts off", got.length === 0, JSON.stringify(got));
}

console.log("== 3. no channel / other user's channel");
{
  got = [];
  const m = await monitor("c@x.com", "3");
  await runCheck(m, deps(app({ appId: "3" })));
  const r = await runCheck(m, deps(app({ appId: "3", version: "2.0" })));
  check("a user without a channel: check fine, nothing sent (not even to someone else's channel)", r.ok && r.alerts.length === 1 && got.length === 0);
}

console.log("== 4. a failing receiver never breaks the check");
{
  got = []; status = 500;
  await setChannel("d@x.com", "generic", "/gen");
  const m = await monitor("d@x.com", "4");
  await runCheck(m, deps(app({ appId: "4" })));
  const r = await runCheck(m, deps(app({ appId: "4", version: "2.0" })));
  check("check still succeeds and stores the alert", r.ok && (await sql`SELECT count(*)::int c FROM pulse_alerts WHERE monitor_id=${m.id}`).rows[0].c === 1);
  const { rows } = await sql`SELECT last_ok, last_error FROM notification_channels WHERE user_email='d@x.com'`;
  check("failure recorded, without receiver details", rows[0].last_ok === false && /500/.test(rows[0].last_error));
  await sql`DELETE FROM notification_channels WHERE user_email='d@x.com'`;
  await sql`INSERT INTO notification_channels (user_email, kind, url) VALUES ('d@x.com','generic','http://127.0.0.1:1/x')`;
  const m2 = await monitor("d@x.com", "5");
  await runCheck(m2, deps(app({ appId: "5" })));
  const r2 = await runCheck(m2, deps(app({ appId: "5", version: "2.0" })));
  check("unreachable receiver: still fine", r2.ok);
}

console.log("== 5. weekly digest message");
{
  got = []; status = 200;
  await setChannel("e@x.com", "discord", "/disc");
  const r = await notifyDigest("e@x.com", { appName: "TestApp", analytics: { avgRating: 4.1, totalReviews: 50, mostHelpfulNegative: { content: "Crashes on launch" } } });
  check("digest delivered in discord shape", r.sent && got[0]?.body.content.includes("TestApp — weekly review summary") && got[0].body.content.includes("Crashes on launch"), JSON.stringify([r, got]));
  const none = await notifyDigest("nobody@x.com", { appName: "A", analytics: { avgRating: 1, totalReviews: 1 } });
  check("no channel = nothing sent, no error", none.sent === false);
}

srv.closeAllConnections?.(); srv.close();
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
