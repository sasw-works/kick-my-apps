// Her bulgu kategorisini bir "lens"e (bakış açısına) eşler.
const CATEGORY_TO_LENS = {
  contrast: "UI",
  typography: "UI",
  consistency: "UI",
  cta: "UI",

  onboarding: "UX",
  navigation: "UX",
  empty_states: "UX",
  loading: "UX",
  copy: "UX",

  accessibility: "Erişilebilirlik",

  conversion: "Ürün",
  trust: "Ürün",
  permissions: "Ürün",
};

const LENS_ORDER = ["UI", "UX", "Erişilebilirlik", "Ürün"];

// Bulgu listesinden lens başına 0-100 skor hesaplar.
// Bir lense hiç bulgu düşmediyse null döner (veri yok, "değerlendirilmedi" anlamında,
// uydurma bir skor göstermemek için).
export function computeLensScores(findings) {
  if (!Array.isArray(findings) || findings.length === 0) return null;

  const buckets = {};
  for (const lens of LENS_ORDER) buckets[lens] = { good: 0, warn: 0, bad: 0, total: 0 };

  for (const f of findings) {
    const lens = CATEGORY_TO_LENS[f?.key];
    if (!lens) continue;
    const status = f.status === "bad" ? "bad" : f.status === "warn" ? "warn" : "good";
    buckets[lens][status] += 1;
    buckets[lens].total += 1;
  }

  const scores = {};
  for (const lens of LENS_ORDER) {
    const b = buckets[lens];
    if (b.total === 0) {
      scores[lens] = null;
      continue;
    }
    const raw = (b.good * 100 + b.warn * 55 + b.bad * 0) / b.total;
    scores[lens] = Math.max(0, Math.min(100, Math.round(raw)));
  }

  return scores;
}

export { LENS_ORDER };
