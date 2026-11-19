// Review language detection and breakdown. Run: node tests/integration/review_languages_test.mjs
import { detectLanguage as d, computeLanguageBreakdown } from "../../app/lib/reviewLanguages.js";

let ok = 0, bad = 0;
const check = (n, c, x = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, x)));

console.log("== 1. detection");
const cases = {
  en: "This app is very good and I love it", es: "La aplicación es muy buena, pero no funciona bien", pt: "Eu gosto muito do aplicativo, mas não funciona",
  fr: "Très bonne application mais je n'aime pas la mise à jour", de: "Die App ist sehr gut aber funktioniert nicht mehr", it: "Bella applicazione ma non funziona più bene",
  tr: "Uygulama çok güzel ama çalışmıyor", ar: "التطبيق ممتاز جدا ولكن لا يعمل", ru: "Отличное приложение но не работает", ja: "とても良いアプリですが動きません",
  ko: "정말 좋은 앱이지만 작동하지 않아요", zh: "这个应用很好用但是打不开了", th: "แอปดีมากแต่เปิดไม่ได้", id: "Aplikasi ini sangat bagus tapi tidak bisa dibuka",
  nl: "Zeer goede app maar werkt niet meer", pl: "Bardzo dobra aplikacja ale nie działa", hi: "यह ऐप बहुत अच्छा है लेकिन काम नहीं करता",
};
const wrong = Object.entries(cases).filter(([k, v]) => d(v) !== k).map(([k, v]) => `${k}->${d(v)}`);
check("17 languages recognised", wrong.length === 0, wrong.join());
check("Japanese with kanji is not Chinese; Ukrainian is not Russian", d("このアプリは本当に便利で毎日使っています") === "ja" && d("Дуже гарний додаток, але не працює їжак") === "uk");
check("too short, numbers, empty, junk -> unclear (null)", d("ok") === null && d("12345 67890") === null && d("") === null && d(null) === null && d("zzz qqq xxx www") === null);

console.log("== 2. breakdown");
const rv = (rating, content) => ({ rating, title: "", content });
const reviews = [
  ...Array.from({ length: 6 }, () => rv(5, "This app is very good and I love it")),
  ...Array.from({ length: 5 }, () => rv(1, "Uygulama çok güzel ama çalışmıyor")),
  rv(4, "ok"), rv(3, ""), rv(2, "Bella applicazione ma non funziona più bene"),
];
const b = computeLanguageBreakdown(reviews);
check("sample counts written reviews only, unclear counted", b.sample === 13 && b.unclear === 1, JSON.stringify(b));
const en = b.rows.find((r) => r.code === "en"), tr = b.rows.find((r) => r.code === "tr");
check("counts, shares, averages", en.count === 6 && tr.count === 5 && en.avgRating === 5 && tr.avgRating === 1 && tr.lowPct === 100 && en.pct === 46);
check("sorted by size", b.rows[0].code === "en");
check("big groups get a gap versus all; small ones don't", tr.gap < -0.5 && en.gap > 0.5 && b.rows.find((r) => r.code === "it").gap === null);
check("junk input is safe", computeLanguageBreakdown(null).sample === 0 && computeLanguageBreakdown([null, {}]).rows.length === 0 && computeLanguageBreakdown([]).overall === null);

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
