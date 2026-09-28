import { pathToFileURL } from "node:url";
import pg from "pg";
import PostgresAdapter from "@auth/pg-adapter";
const { handleLoginOrRegister } = await import(pathToFileURL(process.cwd() + "/node_modules/@auth/core/lib/actions/callback/handle-login.js").href);

const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URL });
const adapter = PostgresAdapter(pool);
const q = async (t, p) => (await pool.query(t, p)).rows;
let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };

for (const t of ["accounts", "sessions", "users"]) await q(`TRUNCATE ${t} RESTART IDENTITY CASCADE`);

const opts = (allow) => ({
  adapter, events: {}, jwt: {}, logger: { debug() {}, warn() {}, error() {} },
  session: { strategy: "jwt", generateSessionToken: () => "x" },
  provider: { id: "google", type: "oauth", account: (t) => t, allowDangerousEmailAccountLinking: allow },
});
const google = (sub) => ({ provider: "google", type: "oauth", providerAccountId: sub, access_token: "t", token_type: "bearer", scope: "openid email profile", id_token: "i", expires_at: 1 });
const profile = (email) => ({ id: "g-" + email, email, name: "Ada", image: null, emailVerified: null });

console.log("== the person first signed in with an emailed code (user row, no linked account) ==");
const emailUser = await adapter.createUser({ email: "ada@x.com", emailVerified: new Date() });
console.log("   created user id", emailUser.id);

console.log("== BEFORE: without the flag (what production did) ==");
let err = null;
try { await handleLoginOrRegister(undefined, profile("ada@x.com"), google("g-ada"), opts(false)); } catch (e) { err = e; }
check("Google login for that same address is REJECTED (OAuthAccountNotLinked)", err && err.type === "OAuthAccountNotLinked", String(err?.type ?? err));

console.log("== AFTER: with allowDangerousEmailAccountLinking ==");
const r = await handleLoginOrRegister(undefined, profile("ada@x.com"), google("g-ada"), opts(true));
check("Google login now signs in as the SAME user", String(r.user.id) === String(emailUser.id) && r.isNewUser === false, JSON.stringify({ id: r.user.id, isNew: r.isNewUser }));
check("no duplicate user was created", (await q("select count(*)::int c from users"))[0].c === 1);
const acc = await q('select provider, type, "providerAccountId", "userId" from accounts');
check("the Google account is linked to that user in the accounts table (real adapter INSERT works)", acc.length === 1 && acc[0].provider === "google" && String(acc[0].userId) === String(emailUser.id), JSON.stringify(acc));

console.log("== later logins & brand-new people ==");
const r2 = await handleLoginOrRegister(undefined, profile("ada@x.com"), google("g-ada"), opts(true));
check("second Google login finds the linked account (still one user, one account)", String(r2.user.id) === String(emailUser.id) && (await q("select count(*)::int c from accounts"))[0].c === 1);
const r3 = await handleLoginOrRegister(undefined, profile("new@x.com"), google("g-new"), opts(true));
check("a brand-new Google user is created normally", r3.isNewUser === true && (await q("select count(*)::int c from users"))[0].c === 2);

console.log("\nRESULT:", ok, "passed,", bad, "failed");
await pool.end();
process.exit(bad ? 1 : 0);
