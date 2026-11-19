// Unit test of webhook URL validation (SSRF rules), payload shapes and delivery, against a local
// receiver. Run: node tests/integration/webhook_unit_test.mjs
import http from "node:http";
import { validateWebhookUrl, buildPayload, sendWebhook, detectKind, isPrivateAddress } from "../../app/lib/webhook.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));
delete process.env.WEBHOOK_ALLOW_PRIVATE;

console.log("== 1. URL rules");
const v = (u, k) => validateWebhookUrl(u, k, { resolve: false });
check("slack url accepted and detected", (await v("https://hooks.slack.com/services/T/B/x")).kind === "slack");
check("discord url accepted and detected", (await v("https://discord.com/api/webhooks/1/abc")).kind === "discord");
check("generic https accepted", (await v("https://example.com/hook")).kind === "generic");
check("http refused", !(await v("http://example.com/hook")).ok);
check("credentials in url refused", !(await v("https://a:b@example.com/hook")).ok);
check("localhost refused", !(await v("https://localhost/hook")).ok);
check("127.0.0.1 refused", !(await v("https://127.0.0.1/hook")).ok);
check("10.x refused", !(await v("https://10.1.2.3/hook")).ok);
check("169.254 metadata refused", !(await v("https://169.254.169.254/latest")).ok);
check("ipv6 loopback refused", !(await v("https://[::1]/hook")).ok);
check("ipv4-mapped ipv6 private refused", !(await v("https://[::ffff:127.0.0.1]/hook")).ok);
check(".internal refused", !(await v("https://db.internal/hook")).ok);
check("garbage refused", !(await v("not a url")).ok && !(await v("")).ok && !(await v(null)).ok);
check("slack kind on a foreign host refused", !(await v("https://evil.com/x", "slack")).ok);
check("discord kind on a foreign host refused", !(await v("https://evil.com/api/webhooks/1/a", "discord")).ok);
check("lookalike host not detected as slack", detectKind("https://hooks.slack.com.evil.com/x") === "generic");
check("private address helper", isPrivateAddress("192.168.1.1") && isPrivateAddress("172.16.0.1") && !isPrivateAddress("8.8.8.8") && !isPrivateAddress("172.32.0.1"));

console.log("== 2. payload shapes");
const m = { title: "T", text: "body", link: "https://x/y" };
check("slack: text with bold title + link", buildPayload("slack", m).text.startsWith("*T*\nbody") && buildPayload("slack", m).text.includes("<https://x/y|"));
check("discord: content", buildPayload("discord", m).content.startsWith("**T**\nbody"));
check("generic: structured json", buildPayload("generic", m).title === "T" && buildPayload("generic", m).link === "https://x/y" && buildPayload("generic", m).source === "kick-my-apps");
check("long text is clipped", buildPayload("discord", { title: "T", text: "x".repeat(9000) }).content.length <= 1900);

console.log("== 3. delivery (local receiver, private hosts allowed only by the test switch)");
let got = [];
let mode = "ok";
const srv = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c));
  req.on("end", () => {
    got.push({ url: req.url, body: JSON.parse(b || "{}"), ua: req.headers["user-agent"] });
    if (mode === "redirect") { res.writeHead(302, { location: "http://127.0.0.1:1/x" }); return res.end(); }
    if (mode === "500") { res.writeHead(500); return res.end("secret detail"); }
    if (mode === "slow") return;
    res.writeHead(200); res.end("ok");
  });
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.address().port}`;
check("private receiver refused by default", !(await sendWebhook({ url: `${base}/h`, kind: "generic" }, m)).ok && got.length === 0);
process.env.WEBHOOK_ALLOW_PRIVATE = "1";
let r = await sendWebhook({ url: `${base}/h`, kind: "slack" }, m);
check("delivered once with slack shape", r.ok && got.length === 1 && got[0].body.text.startsWith("*T*") && got[0].ua === "kick-my-apps-webhook", JSON.stringify([r, got]));
mode = "500"; r = await sendWebhook({ url: `${base}/h`, kind: "generic" }, m);
check("non-2xx reported without the receiver's body", !r.ok && r.error.includes("500") && !r.error.includes("secret"), JSON.stringify(r));
mode = "redirect"; r = await sendWebhook({ url: `${base}/h`, kind: "generic" }, m);
check("redirects are not followed", !r.ok && got.length === 3, JSON.stringify([r, got.length]));
mode = "slow"; r = await sendWebhook({ url: `${base}/h`, kind: "generic" }, m, { timeoutMs: 300 });
check("slow receiver times out cleanly", !r.ok && /too long/.test(r.error), JSON.stringify(r));
r = await sendWebhook({ url: "http://127.0.0.1:1/x", kind: "generic" }, m);
check("unreachable receiver gives a plain error, never throws", !r.ok && r.error === "Couldn't reach the receiver.", JSON.stringify(r));
srv.closeAllConnections?.(); srv.close();

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
