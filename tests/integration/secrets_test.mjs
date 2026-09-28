// Unit test for app/lib/secrets.js (no server or database needed):  node tests/integration/secrets_test.mjs
import { readSecret, redactSecrets, errorText } from "../../app/lib/secrets.js";
let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };

const KEY = "sk-or-v1-0123456789abcdefFAKE";
console.log("== readSecret");
process.env.T_KEY = KEY;                       check("a normal key is returned as is", readSecret("T_KEY") === KEY);
process.env.T_KEY = `  ${KEY}\n`;             check("surrounding whitespace/newlines are trimmed", readSecret("T_KEY") === KEY);
process.env.T_KEY = `${KEY}\n${KEY}\n${KEY}`; check("the same key pasted 3 times (newlines) -> one key", readSecret("T_KEY") === KEY);
process.env.T_KEY = `${KEY} ${KEY}`;          check("...or separated by spaces -> one key", readSecret("T_KEY") === KEY);
process.env.T_KEY = "   \n ";                  check("blank -> treated as not set", readSecret("T_KEY") === null);
delete process.env.T_KEY;                      check("unset -> null", readSecret("T_KEY") === null);

console.log("== redactSecrets / errorText");
process.env.MY_API_KEY = "totally-custom-format-9f8e7d6c5b4a";   // a format no pattern knows about
process.env.SOME_PASSWORD = "hunter2hunter2";
process.env.POSTGRES_URL = "postgres://user:s3cretpw@db.example.com/app";
const msg = `Headers.append: "Bearer ${KEY}\n${KEY}" is invalid; also totally-custom-format-9f8e7d6c5b4a and hunter2hunter2 and ${process.env.POSTGRES_URL}`;
const out = redactSecrets(msg);
check("a key inside a 'Bearer …' header error is removed", !out.includes(KEY), out);
check("...even a secret in a format no pattern knows (matched by env VALUE)", !out.includes("totally-custom-format"), out);
check("passwords and connection strings are removed", !out.includes("hunter2") && !out.includes("s3cretpw"), out);
check("the rest of the message survives, so it stays diagnosable", out.includes("is invalid") && out.includes("Headers.append"), out);
check("keys we don't hold are caught by shape (OpenRouter / Google / Resend / GitHub)",
  !redactSecrets("a sk-or-v1-AAAAAAAAAAAAAAAAAAAA b AIzaSyA1234567890123456789012345 c re_123456789012345678 d github_pat_11ABCDEF_xyz").match(/sk-or-v1-A|AIzaSy|re_1234|github_pat_11/));
check("innocent text is untouched", redactSecrets("Resend error: 401 validation_error") === "Resend error: 401 validation_error");
check("short env values aren't treated as secrets (no mangling of ordinary words)", (() => { process.env.SHORT_TOKEN = "abc"; return redactSecrets("abc def") === "abc def"; })());
check("errorText truncates long messages", errorText(new Error("x".repeat(1000)), 50).length === 51);
check("errorText redacts inside Error objects", !errorText(new Error(`k=${KEY}`)).includes(KEY));

console.log(`\nRESULT: ${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
