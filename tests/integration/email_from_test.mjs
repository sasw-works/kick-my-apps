// Unit test for app/lib/email.js (no server or database needed): node tests/integration/email_from_test.mjs
import { getEmailFrom } from "../../app/lib/email.js";
let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };

const origFrom = process.env.EMAIL_FROM;
const origEnv = process.env.VERCEL_ENV;
const origWarn = console.warn;
const FALLBACK = "Kick My Apps <onboarding@resend.dev>";

function capture(run) {
  const seen = [];
  console.warn = (...args) => seen.push(args.join(" "));
  try { return { result: run(), warnings: seen }; } finally { console.warn = origWarn; }
}

console.log("== getEmailFrom");

// Order matters: the module warns at most once per process (a module-level flag), so the cases
// that must NOT warn run first, before anything has a chance to set that flag.

delete process.env.EMAIL_FROM;
process.env.VERCEL_ENV = "preview";
let r = capture(() => getEmailFrom());
check("preview deploy, unset -> falls back safely", r.result === FALLBACK);
check("...with no warning (not a real production deploy)", r.warnings.length === 0, r.warnings);

process.env.VERCEL_ENV = "development";
r = capture(() => getEmailFrom());
check("local dev, unset -> same safe fallback, no warning", r.result === FALLBACK && r.warnings.length === 0, r.warnings);

process.env.VERCEL_ENV = "production";
process.env.EMAIL_FROM = "Kick My Apps <noreply@kickmyapps.com>";
r = capture(() => getEmailFrom());
check("production, configured -> the configured address is used as-is", r.result === "Kick My Apps <noreply@kickmyapps.com>");
check("...and no warning, since it's actually set", r.warnings.length === 0, r.warnings);

delete process.env.EMAIL_FROM;
r = capture(() => getEmailFrom());
check("production, unset -> still falls back (never throws/breaks sign-in)", r.result === FALLBACK);
check("...but now warns, since this is the one case that matters", r.warnings.length === 1, r.warnings);

r = capture(() => { getEmailFrom(); getEmailFrom(); getEmailFrom(); });
check("...and doesn't warn again on every subsequent call (would spam the log)", r.warnings.length === 0, r.warnings);

if (origFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = origFrom;
if (origEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = origEnv;

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
