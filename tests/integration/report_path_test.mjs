// Unit test for app/lib/reportPath.js (no server needed):  node tests/integration/report_path_test.mjs
import { slugify, reportPath, parseReportId } from "../../app/lib/reportPath.js";
let ok = 0, bad = 0;
const eq = (n, got, want) => (got === want ? (ok++, console.log("  ok  ", n, "->", JSON.stringify(got))) : (bad++, console.log("  FAIL", n, "\n        got ", JSON.stringify(got), "\n        want", JSON.stringify(want))));

console.log("== slugify");
eq("plain name", slugify("Instagram"), "instagram");
eq("spaces and punctuation", slugify("Trendyol - Online Shopping"), "trendyol-online-shopping");
eq("Turkish letters", slugify("Trendyol - Alışveriş & Fırsatlar"), "trendyol-alisveris-and-firsatlar");
eq("Turkish capitals incl. dotted İ", slugify("İstanbul Şehir Çağrı Öğrenci Üniversite"), "istanbul-sehir-cagri-ogrenci-universite");
eq("accents (é, ñ, ü)", slugify("Café Señor Müller"), "cafe-senor-muller");
eq("symbols and emoji are dropped", slugify("🔥 Fire!!! (Beta) ™"), "fire-beta");
eq("digits kept", slugify("2048 Puzzle 3D"), "2048-puzzle-3d");
eq("no leading/trailing dashes", slugify("  --Hello--  "), "hello");
eq("long names are cut at 40 without a dangling dash", slugify("A very long application name that keeps going and going forever"), "a-very-long-application-name-that-keeps");
eq("only non-Latin script -> empty slug", slugify("抖音"), "");
eq("only emoji -> empty slug", slugify("🎮🎮"), "");
eq("missing name", slugify(null), "");

console.log("== reportPath");
eq("normal", reportPath(43, "Instagram"), "/console/reports/43-instagram");
eq("Turkish", reportPath(7, "Getir: Yemek & Market"), "/console/reports/7-getir-yemek-and-market");
eq("unusable name falls back to the bare number", reportPath(43, "抖音"), "/console/reports/43");
eq("missing name falls back to the bare number", reportPath(43, undefined), "/console/reports/43");

console.log("== parseReportId");
eq("bare number (old links)", parseReportId("43"), "43");
eq("number + slug", parseReportId("43-instagram"), "43");
eq("wrong slug still resolves by number", parseReportId("43-something-else-entirely"), "43");
eq("slug with digits", parseReportId("12-2048-puzzle"), "12");
eq("no number -> not a report", parseReportId("instagram"), null);
eq("name before number is not a report", parseReportId("instagram-43"), null);
eq("empty", parseReportId(""), null);
eq("SQL-ish junk", parseReportId("1;drop table scans"), null);
eq("number + junk after a dash is still just the number", parseReportId("5-;drop"), "5");
eq("absurdly long number is refused", parseReportId("9".repeat(30)), null);

console.log(`\nRESULT: ${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
