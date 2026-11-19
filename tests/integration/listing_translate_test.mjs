// Listing translation rules. Run: node tests/integration/listing_translate_test.mjs
import { LANGUAGES, languageName, fieldsToTranslate, buildPrompt, parseTranslation } from "../../app/lib/listingTranslate.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));

console.log("== 1. inputs");
check("language codes map to names, unknown -> null", languageName("tr") === "Turkish" && languageName("xx") === null && languageName(5) === null && LANGUAGES.length >= 15);
const list = fieldsToTranslate("apple", { name: " Plan Week ", subtitle: "", keywords: "plan,week", bogus: "x", description: "a".repeat(5000) });
check("only known fields with text, trimmed, input capped", list.map((f) => f.key).join() === "name,keywords,description" && list[0].text === "Plan Week" && list[2].text.length === 4000);
check("limits come from the store", list[0].max === 30 && fieldsToTranslate("play", { short: "hi" })[0].max === 80);
check("unknown store or junk -> nothing", fieldsToTranslate("x", { name: "a" }).length === 0 && fieldsToTranslate("apple", null).length === 0);

console.log("== 2. prompt");
const p = buildPrompt("apple", "Turkish", list);
check("names language, limits, keys and marks text as data", /Turkish/.test(p) && /at most 30 characters/.test(p) && /"keywords"/.test(p) && /DATA/.test(p) && /<<<\nPlan Week\n>>>/.test(p));
check("keyword rule only for App Store keywords", /no spaces after the commas/.test(p) && !/no spaces after the commas/.test(buildPrompt("play", "Turkish", fieldsToTranslate("play", { name: "x" }))));

console.log("== 3. parsing");
let r = parseTranslation('```json\n{"fields":{"name":"Hafta Planı","keywords":"plan, hafta ,takvim","description":"x","subtitle":"ignored"}}\n```', "apple", list);
check("fenced JSON parsed, unrequested fields dropped", r && r.fields.name === "Hafta Planı" && !("subtitle" in r.fields));
check("apple keywords normalised (no spaces)", r.fields.keywords === "plan,hafta,takvim");
r = parseTranslation(JSON.stringify({ fields: { name: "x".repeat(31), description: "ok" } }), "apple", list);
check("fields over the limit are flagged, not cut", r.over.join() === "name" && r.fields.name.length === 31);
check("counts characters, not UTF-16 units", parseTranslation(JSON.stringify({ fields: { name: "😀".repeat(30) } }), "apple", list).over.length === 0);
check("garbage, empty or non-string values -> null", parseTranslation("no", "apple", list) === null && parseTranslation('{"fields":{}}', "apple", list) === null && parseTranslation('{"fields":{"name":5}}', "apple", list) === null && parseTranslation(null, "apple", list) === null);

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
