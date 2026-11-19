// Exact, deterministic counts over the sampled App Store reviews: how many mention slowness,
// crashes, battery drain and so on, and which devices / iOS versions people name. Like
// computeReviewAnalytics, this is plain counting (no AI arithmetic), so the numbers shown in the
// report are always right; the AI only writes the interpretation around them.
//
// This reads what users SAY about performance and compatibility. It is not a measurement: memory
// leaks, request patterns or per-device behaviour need real profiling / device testing.
//
// Keyword lists cover English plus common Turkish/German/Spanish/French phrasing, since the
// reviews are read in their original language.

export const PERFORMANCE_TOPICS = [
  {
    key: "slow",
    label: "Slow / laggy",
    re: /\b(slow(er|ly)?|sluggish|laggy|lag(s|ging)?|takes (forever|too long|ages)|unresponsive|langsam|ruckelt|lento|lenta|tarda|lent|lente)\b|yavaş|kasıyor|kasma|gecikme|geç açıl/,
  },
  {
    key: "crash",
    label: "Crashes / won't open",
    re: /\b(crash(es|ed|ing)?|force[- ]?clos\w*|keeps? (closing|quitting)|closes (itself|by itself)|won'?t (open|launch|start)|doesn'?t (open|launch)|absturz|stürzt|se cierra|cierra sola|se cuelga|plante|se ferme)\b|çök|kapanıyor|açılmıyor|açılmadı/,
  },
  {
    key: "freeze",
    label: "Freezes / hangs",
    re: /\b(freez(e|es|ing)|frozen|hangs?|hanging|hängt|congela|se bloque)\b|donuyor|donma|takılıyor|kilitleniyor/,
  },
  {
    key: "battery",
    label: "Battery / heat",
    re: /\b(battery|drain(s|ed|ing)?|overheat\w*|gets? (very |too )?hot|heats? up|akku|batería|bateria|batterie|calienta|chauffe)\b|\bpil\b|şarj|ısın/,
  },
  {
    key: "loading",
    label: "Loading / spinner",
    re: /\b(never loads?|won'?t load|(keeps?|stuck) (on )?loading|infinite(ly)? load\w*|spinner|spinning wheel|lädt nicht|no carga)\b|yüklenm|yükleniyor/,
  },
  {
    key: "storage",
    label: "Storage / app size",
    re: /\b(storage|app size|huge app|takes? up (\w+ ){0,2}space|gigabytes|speicher|almacenamiento|stockage)\b|depolama|yer kaplıyor/,
  },
  {
    key: "network",
    label: "Connection / sync errors",
    re: /\b(sync(ing)? (issues?|errors?|fails?)|offline|(no|lost|poor) (internet|connection)|can'?t connect|cannot connect|timeouts?|server (error|down)|verbindung|conexión|connexion)\b|bağlantı|senkron|sunucu/,
  },
];

const IPHONE_RE = /\biphone ?(\d{1,2}|x[rs]?|se)( ?(pro max|pro|plus|mini|max))?\b/g;
const IOS_RE = /\b(ios|ipados) ?(\d{1,2})(\.\d+)*\b/g;

const DEVICE_PATTERNS = [
  { name: "iPad", re: /\bipad\b/ },
  { name: "Apple Watch", re: /\bapple ?watch\b/ },
  { name: "Mac", re: /\b(macbook|macos|imac|mac mini|apple silicon|m[1-4] (mac|macbook|chip))\b/ },
  { name: "CarPlay", re: /\bcar ?play\b/ },
  { name: "Vision Pro", re: /\bvision ?pro\b/ },
  { name: "Android", re: /\bandroid\b/ },
];

const AFTER_UPDATE_RE =
  /\b(after|since|ever since|with) (the |this |your |a )?(last |latest |recent |new |newest )?(update|upgrade|version)\b|\b(latest|newest|new) (update|version) (broke|ruined|made)|güncelleme(den sonra| sonrası|den beri|yle)|seit dem update|desde (la )?(última )?actualización/;

const LAYOUT_RE =
  /\b(landscape|rotat(e|es|ion)|dark mode|light mode|dynamic island|notch|small(er)? screen|screen size|text (is )?(cut|clipped|overlap\w*)|cut ?off|overlap(s|ping)?|keyboard (covers?|hides?|blocks?))\b|yatay|karanlık mod|ekrana sığmıyor/;

function pct(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function topEntries(map, limit) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function formatIphone(match) {
  const model = match[1].toUpperCase();
  const tier = (match[2] || "").trim();
  const tierLabel = tier
    ? " " + tier.replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
  return `iPhone ${model === "SE" ? "SE" : model}${tierLabel}`;
}

export function computeReviewSignals(reviews) {
  const list = Array.isArray(reviews) ? reviews : [];
  const total = list.length;

  const topicCounts = Object.fromEntries(PERFORMANCE_TOPICS.map((t) => [t.key, 0]));
  const deviceCounts = new Map();
  const osCounts = new Map();
  let affected = 0;
  let afterUpdate = 0;
  let layoutIssues = 0;
  const exampleCandidates = [];

  for (const r of list) {
    const text = `${r?.title ?? ""} ${r?.content ?? ""}`.toLowerCase();
    if (!text.trim()) continue;

    let hit = false;
    for (const t of PERFORMANCE_TOPICS) {
      if (t.re.test(text)) {
        topicCounts[t.key] += 1;
        hit = true;
      }
    }
    if (hit) {
      affected += 1;
      exampleCandidates.push(r);
    }

    // Count each device / OS once per review, however many times it's repeated in the text.
    const devicesInReview = new Set();
    for (const d of DEVICE_PATTERNS) if (d.re.test(text)) devicesInReview.add(d.name);
    for (const m of text.matchAll(IPHONE_RE)) devicesInReview.add(formatIphone(m));
    for (const name of devicesInReview) deviceCounts.set(name, (deviceCounts.get(name) || 0) + 1);

    const osInReview = new Set();
    for (const m of text.matchAll(IOS_RE)) osInReview.add(`${m[1] === "ipados" ? "iPadOS" : "iOS"} ${m[2]}`);
    for (const name of osInReview) osCounts.set(name, (osCounts.get(name) || 0) + 1);

    if (AFTER_UPDATE_RE.test(text)) afterUpdate += 1;
    if (LAYOUT_RE.test(text)) layoutIssues += 1;
  }

  const topics = PERFORMANCE_TOPICS.map((t) => ({
    key: t.key,
    label: t.label,
    count: topicCounts[t.key],
    pct: pct(topicCounts[t.key], total),
  }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  // Lowest-rated matching reviews first: those are the clearest illustrations of the problem.
  const examples = exampleCandidates
    .slice()
    .sort((a, b) => (a.rating || 0) - (b.rating || 0) || (b.helpfulVotes || 0) - (a.helpfulVotes || 0))
    .slice(0, 3)
    .map((r) => ({
      rating: Number(r.rating) || 0,
      text: String(r.content || r.title || "").slice(0, 200),
    }));

  return {
    totalReviews: total,
    performance: { affected, affectedPct: pct(affected, total), topics, examples },
    compatibility: {
      devices: topEntries(deviceCounts, 6),
      osVersions: topEntries(osCounts, 4),
      afterUpdate,
      layoutIssues,
    },
  };
}
