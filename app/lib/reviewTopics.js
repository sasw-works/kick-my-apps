import { PERFORMANCE_TOPICS } from "./reviewSignals.js";

// What people complain about, by topic, in the written reviews Pulse has stored: the performance
// topics from reviewSignals plus the everyday ones (login, payments, ads, bugs, notifications,
// support, confusing design). Plain keyword counting, like the rest of the review numbers, so the
// counts are exact and a topic's number is always "reviews that mention it", never an AI estimate.
// Keyword lists cover English plus common Turkish/German/Spanish/French phrasing.
//
// Only 1-3 star reviews count: a 5-star "love it, no ads!" is not a complaint.

const EXTRA_TOPICS = [
  {
    key: "login",
    label: "Login / account",
    re: /\b(log ?in|sign ?in|password|verification code|(can'?t|cannot|unable to) (log|sign)|account (locked|blocked|deleted)|anmelden|iniciar sesión|connexion)\b|giriş yap|şifre|hesabıma|hesabım/,
  },
  {
    key: "payment",
    label: "Payments / subscription",
    re: /\b(payment|charged|refund|subscription|subscribe|billing|paywall|scam|overpriced|expensive|abbonamento|suscripción|abonnement)\b|ücret|abonelik|iade|pahalı/,
  },
  { key: "ads", label: "Too many ads", re: /\b(ads?|adverts?|advertis\w*|commercials?|werbung|anuncios|publicité)\b|reklam/ },
  {
    key: "bugs",
    label: "Bugs / not working",
    re: /\b(bugs?|buggy|glitch\w*|broken|doesn'?t work|not working|stopped working|error|fehler|no funciona|ne marche pas)\b|çalışmıyor|hata|bozuk/,
  },
  { key: "notifications", label: "Notifications", re: /\b(notifications?|notif|spammy)\b|bildirim/ },
  {
    key: "support",
    label: "Support doesn't answer",
    re: /\b(customer service|customer support|no (reply|response)|never (replied|respond\w*)|kundenservice)\b|müşteri hizmet|destek ekib|destek yok/,
  },
  {
    key: "design",
    label: "Confusing / ugly design",
    re: /\b(confusing|hard to use|can'?t find|unintuitive|ugly|cluttered|terrible (ui|design)|redesign|new design)\b|karışık|anlaşılmıyor|tasarım/,
  },
];

const FIX_HINT = {
  slow: "Profile the slow screens and cold start on a mid-range device; check for work on the main thread and oversized images or lists.",
  crash: "Find the crash in your crash reporter for the versions users name; reproduce on the oldest supported OS and device.",
  freeze: "Look for blocking calls on the main thread and long-running work without a progress state.",
  battery: "Check background work, location and network polling, and anything that keeps the CPU awake.",
  loading: "Add timeouts, retry and a visible error state to the screens that wait on the network.",
  storage: "Check app size and cache growth; add a way to clear cached data.",
  network: "Test on a slow or offline connection; handle failures with a clear message and retry.",
  login: "Walk through sign-in and password reset on a fresh install; check error messages and the verification-code flow.",
  payment: "Check the purchase and restore flow, make pricing clear before the paywall, and make cancelling easy to find.",
  ads: "Review ad frequency and placement; avoid interrupting the main task.",
  bugs: "Group the reports by screen and version, reproduce the top ones, and fix the most frequent first.",
  notifications: "Let people choose which notifications they get and how often; avoid promotional pings by default.",
  support: "Reply to reviews and support mail faster, and add an obvious in-app way to reach you.",
  design: "Run a quick usability pass on the screens people mention; simplify the first-run flow.",
};

export const REVIEW_TOPICS = [...PERFORMANCE_TOPICS, ...EXTRA_TOPICS].map((t) => ({ key: t.key, label: t.label, re: t.re, fix: FIX_HINT[t.key] || "" }));
export const topicByKey = (key) => REVIEW_TOPICS.find((t) => t.key === key) || null;

const MIN_MENTIONS_TO_ADD = 3;

// reviews: [{ rating, title, content }] NEWEST FIRST. Returns the complaint topics with exact counts.
export function computeReviewTopics(reviews) {
  const list = (Array.isArray(reviews) ? reviews : []).filter((r) => r && Number(r.rating) >= 1 && Number(r.rating) <= 3);
  const complaints = list.filter((r) => `${r.title ?? ""}${r.content ?? ""}`.trim());
  const n = complaints.length;
  const half = Math.floor(n / 2);

  const topics = [];
  for (const t of REVIEW_TOPICS) {
    const hits = [];
    complaints.forEach((r, i) => {
      if (t.re.test(`${r.title ?? ""} ${r.content ?? ""}`.toLowerCase())) hits.push({ r, i });
    });
    if (!hits.length) continue;
    const recent = hits.filter((h) => h.i < half).length; // newer half
    const older = hits.length - recent;
    const examples = hits
      .slice()
      .sort((a, b) => (a.r.rating || 0) - (b.r.rating || 0))
      .slice(0, 2)
      .map((h) => ({ rating: Number(h.r.rating) || 0, text: String(h.r.content || h.r.title || "").slice(0, 200) }));
    topics.push({
      key: t.key,
      label: t.label,
      count: hits.length,
      pct: Math.round((hits.length / n) * 100),
      trend: half >= 2 && recent > older + 1 ? "up" : half >= 2 && older > recent + 1 ? "down" : "flat",
      examples,
      suggestion: t.fix,
      canAdd: hits.length >= MIN_MENTIONS_TO_ADD,
    });
  }
  topics.sort((a, b) => b.count - a.count);
  return { sample: n, topics };
}

// The task a topic becomes. Everything is rebuilt server-side from stored reviews, never from what
// the browser sends.
export function taskFromTopic(topic, sample) {
  const quote = topic.examples[0]?.text ? ` Example: “${topic.examples[0].text.slice(0, 140)}”` : "";
  return {
    key: `rev:${topic.key}`,
    title: `Reviews: ${topic.label}`,
    severity: topic.pct >= 25 ? "bad" : "warn",
    finding: `${topic.count} of the ${sample} most recent 1–3★ reviews (${topic.pct}%) mention this.${quote}`.slice(0, 600),
    suggestion: topic.suggestion,
  };
}
