// Which languages do the stored reviews use, and how happy is each group? Detection is deliberately
// simple and honest: writing systems that identify a language on their own (Arabic, Thai, Korean…)
// are decided by script, Latin-script languages by common-word counts. A review that doesn't clearly
// belong to one language is counted as "unclear" instead of being guessed.

export const LANG_NAMES = {
  en: "English", es: "Spanish", pt: "Portuguese", fr: "French", de: "German", it: "Italian", tr: "Turkish", nl: "Dutch",
  id: "Indonesian", pl: "Polish", sv: "Swedish", ar: "Arabic", ru: "Russian", uk: "Ukrainian", zh: "Chinese", ja: "Japanese",
  ko: "Korean", th: "Thai", hi: "Hindi", he: "Hebrew", el: "Greek", vi: "Vietnamese",
};

const WORDS = {
  en: "the and is it this that with for you to of in app very not but are was have good great love like just can its my so",
  es: "el la los las es en un una que con para por muy pero no se de del lo como mi me muy más está bien aplicación",
  pt: "o a os as é em um uma que com para por muito mas não se de do da como meu minha mais está bem aplicativo você",
  fr: "le la les est en un une que avec pour par très mais pas se de du des comme mon ma plus bien application je il",
  de: "der die das ist in ein eine dass mit für von sehr aber nicht sich und zu den dem wie mein mehr gut funktioniert ich",
  it: "il lo la gli le è in un una che con per molto ma non si di del della come mio più bene applicazione io sono",
  tr: "bir ve bu çok için ama değil de da ile uygulama gibi daha ben çalışmıyor iyi güzel olsun oldu ne var",
  nl: "de het een is in dat met voor van zeer maar niet zich en te den hoe mijn meer goed werkt ik je ook",
  id: "yang dan di ini itu dengan untuk dari sangat tetapi tidak aplikasi saya bagus tapi bisa ada lebih sudah kok",
  pl: "i w nie to jest na się z do że jak ale bardzo aplikacja dla mi tak już tylko po",
  sv: "och i att det är en som på för med inte men av har jag den ett mycket appen bra",
};
const SETS = Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, new Set(v.split(" "))]));
// words shared by several languages carry no signal on their own
const SHARED = new Map();
for (const [k, s] of Object.entries(SETS)) for (const w of s) SHARED.set(w, (SHARED.get(w) || 0) + 1);

const SCRIPTS = [
  ["ja", /[぀-ヿ]/g],
  ["ko", /[가-힯]/g],
  ["zh", /[一-鿿]/g],
  ["th", /[฀-๿]/g],
  ["ar", /[؀-ۿ]/g],
  ["he", /[֐-׿]/g],
  ["hi", /[ऀ-ॿ]/g],
  ["el", /[Ͱ-Ͽ]/g],
  ["ru", /[Ѐ-ӿ]/g],
];

export function detectLanguage(text) {
  const t = String(text ?? "").toLowerCase();
  const letters = (t.match(/\p{L}/gu) || []).length;
  if (letters < 6) return null;
  const counts = SCRIPTS.map(([code, re]) => [code, (t.match(re) || []).length]);
  const ja = counts.find(([c]) => c === "ja")[1];
  const zh = counts.find(([c]) => c === "zh")[1];
  if (ja >= 2) return "ja"; // kana present: Japanese even with kanji
  const [bestScript, n] = counts.sort((a, b) => b[1] - a[1])[0];
  if (n / letters >= 0.5) {
    if (bestScript === "ru" && /[іїєґ]/.test(t)) return "uk";
    return bestScript;
  }
  if (zh && zh / letters >= 0.5) return "zh";

  const words = t.match(/[\p{L}']+/gu) || [];
  if (words.length < 3) return null;
  const score = {};
  for (const w of words) {
    for (const [code, set] of Object.entries(SETS)) {
      if (set.has(w)) score[code] = (score[code] || 0) + (SHARED.get(w) > 1 ? 0.4 : 1);
    }
  }
  if (/[ğşı]/.test(t)) score.tr = (score.tr || 0) + 2;
  if (/[ąęłńśźż]/.test(t)) score.pl = (score.pl || 0) + 2;
  if (/[ãõ]/.test(t)) score.pt = (score.pt || 0) + 2;
  if (/ñ|¿|¡/.test(t)) score.es = (score.es || 0) + 2;
  if (/ß/.test(t)) score.de = (score.de || 0) + 2;
  if (/[ăơưđ]/.test(t)) score.vi = (score.vi || 0) + 3;
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;
  const [top, topScore] = ranked[0];
  const second = ranked[1]?.[1] || 0;
  if (topScore < 1.5 || topScore - second < 0.8) return null;
  return top;
}

export const MIN_GROUP = 5;

// reviews: [{ rating, title, content }]. Returns groups sorted by size plus how many were unclear.
export function computeLanguageBreakdown(reviews) {
  const list = (Array.isArray(reviews) ? reviews : []).filter((r) => r && `${r.title ?? ""}${r.content ?? ""}`.trim());
  const groups = new Map();
  let unclear = 0;
  for (const r of list) {
    const code = detectLanguage(`${r.title ?? ""}. ${r.content ?? ""}`);
    if (!code) { unclear++; continue; }
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(Number(r.rating) || 0);
  }
  const all = list.map((r) => Number(r.rating) || 0).filter(Boolean);
  const overall = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
  const rows = [...groups.entries()].map(([code, ratings]) => {
    const rated = ratings.filter(Boolean);
    const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
    return {
      code,
      name: LANG_NAMES[code] || code,
      count: ratings.length,
      pct: Math.round((ratings.length / Math.max(list.length, 1)) * 100),
      avgRating: avg === null ? null : Math.round(avg * 10) / 10,
      lowPct: rated.length ? Math.round((rated.filter((x) => x <= 2).length / rated.length) * 100) : null,
      // a group is only called out when it is big enough to mean something
      gap: avg !== null && overall !== null && ratings.length >= MIN_GROUP ? Math.round((avg - overall) * 10) / 10 : null,
    };
  }).sort((a, b) => b.count - a.count);
  return { sample: list.length, unclear, overall: overall === null ? null : Math.round(overall * 10) / 10, rows, minGroup: MIN_GROUP };
}
