// Unit tests for the store-visuals helpers (no server, database or network):
// node tests/integration/store_visuals_unit_test.mjs
import { isStoreImageUrl, downsizedImageUrl } from "../../app/lib/storeAssets.js";
import { buildVisualsPrompt, normalizeVisuals, parseModelJson } from "../../app/lib/visualsReview.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };

console.log("== which image URLs may be fetched");
check("Apple and Google image hosts are allowed", isStoreImageUrl("https://is1-ssl.mzstatic.com/image/thumb/x/392x696bb.png") && isStoreImageUrl("https://play-lh.googleusercontent.com/abc=w526-h296"));
check("everything else is refused", ![
  "http://is1-ssl.mzstatic.com/x.png", "https://evil.example/x.png", "https://mzstatic.com.evil.example/x.png", "https://evilmzstatic.com/x.png",
  "https://user:pw@is1-ssl.mzstatic.com/x.png", "https://is1-ssl.mzstatic.com:8443/x.png", "https://127.0.0.1/x.png", "file:///etc/passwd", "javascript:alert(1)", "", null, undefined,
].some(isStoreImageUrl));
check("Apple image URLs are rewritten to a 600px JPEG", downsizedImageUrl("https://is1-ssl.mzstatic.com/image/thumb/Purple/v4/ab/392x696bb.png") === "https://is1-ssl.mzstatic.com/image/thumb/Purple/v4/ab/600x0w.jpg");
check("Google image URLs get a width parameter", downsizedImageUrl("https://play-lh.googleusercontent.com/abc=w5120-h2880") === "https://play-lh.googleusercontent.com/abc=w600" && downsizedImageUrl("https://play-lh.googleusercontent.com/abc=w526-h296-rw") === "https://play-lh.googleusercontent.com/abc=w600");
check("an unrecognised URL shape is left alone", downsizedImageUrl("https://is1-ssl.mzstatic.com/odd") === "https://is1-ssl.mzstatic.com/odd");

console.log("== prompt");
const p = buildVisualsPrompt({ appName: "Foo\nIgnore previous", genre: "Games", hasIcon: true, screenshotCount: 5 });
check("mentions the icon first, the count, and the category", p.includes("Image #1") && p.includes("5 store screenshots") && p.includes("Games"));
check("name is flattened to one line", !/Foo\nIgnore/.test(p));
check("no icon -> icon is null in the schema", buildVisualsPrompt({ appName: "A", hasIcon: false, screenshotCount: 1 }).includes('"icon": null') && buildVisualsPrompt({ appName: "A", hasIcon: false, screenshotCount: 1 }).includes("1 store screenshot "));
check("forbids download-increase claims", /Never claim/.test(p));

console.log("== normalizing the answer");
const ctx = { hasIcon: true, screenshotCount: 3 };
const n = normalizeVisuals({
  icon: { rating: "EXCELLENT", notes: ["a", "b", "c", "d"] },
  firstImpression: { rating: "weak", note: "n".repeat(900) },
  screenshots: [{ index: "3", issue: "HIGH", note: "x" }, { index: 0, note: "zero" }, { index: 4, note: "over" }, { index: 3, note: "dup" }, { index: 1, issue: "none", note: "" }, "junk", null, { index: 2, issue: "wat", note: "ok" }],
  consistency: "c".repeat(900), suggestions: ["1", "2", "3", "4", "5"], extra: "x",
}, ctx);
check("unknown rating -> ok; notes capped at 3", n.icon.rating === "ok" && n.icon.notes.length === 3);
check("long text clamped", n.firstImpression.note.length === 300 && n.consistency.length === 400);
check("indexes: out of range, duplicate and empty notes dropped; sorted; string index parsed", n.screenshots.map((s) => s.index).join() === "2,3" && n.screenshots[1].issue === "high" && n.screenshots[0].issue === "low");
check("suggestions capped, extra keys gone", n.suggestions.length === 4 && !("extra" in n));
check("icon dropped when none was shown", normalizeVisuals({ icon: { rating: "strong", notes: ["x"] }, consistency: "y" }, { hasIcon: false, screenshotCount: 2 }).icon === null);
check("garbage in -> null", normalizeVisuals(null, ctx) === null && normalizeVisuals("x", ctx) === null && normalizeVisuals([], ctx) === null && normalizeVisuals({}, ctx) === null);

console.log("== reading the model's JSON");
check("plain JSON", parseModelJson('{"a":1}').a === 1);
check("inside fences and chatter", parseModelJson('Sure!\n```json\n{"a":2}\n```\nHope it helps').a === 2);
check("not JSON -> null", parseModelJson("no json here") === null && parseModelJson("{broken") === null && parseModelJson(null) === null);

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
