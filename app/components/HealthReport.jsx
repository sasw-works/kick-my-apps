"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { computeLensScores } from "../lib/lensScores";
import {
  UploadCloud,
  Link2,
  Sparkles,
  Layers,
  MousePointerClick,
  Palette,
  Type,
  Accessibility,
  ShieldAlert,
  TrendingDown,
  MessageSquare,
  ChevronDown,
  X,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Download,
  History,
  Compass,
  Inbox,
  LayoutGrid,
  Loader2,
  AlignLeft,
  BadgeCheck,
  GitCompare,
  Mail,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data — stands in for a real AI analysis pass over uploaded screenshots
// + a scraped App Store listing.
// ---------------------------------------------------------------------------

const FINDINGS = [
  {
    key: "onboarding",
    icon: Layers,
    title: "Onboarding Uzunluğu",
    status: "warn",
    finding: "7 ekranlık bir onboarding akışı tespit edildi.",
    suggestion: "Başarılı uygulamalarda ortalama 3-4 ekran var. İlk 3 ekranı birleştirip zorunlu olmayan adımları kayıt sonrasına ertele.",
  },
  {
    key: "cta",
    icon: MousePointerClick,
    title: "CTA Görünürlüğü",
    status: "bad",
    finding: "Ana ekrandaki \"Devam Et\" butonu arka planla çok düşük kontrastta.",
    suggestion: "Buton rengini artır; metin/arka plan kontrast oranını en az 4.5:1 seviyesine çek.",
  },
  {
    key: "contrast",
    icon: Palette,
    title: "Renk Kontrastı",
    status: "bad",
    finding: "5 ekranda WCAG AA eşiğinin altında metin kontrastı bulundu.",
    suggestion: "Gövde metni rengini koyulaştır, özellikle açık gri üzerine açık gri kullanımını kaldır.",
  },
  {
    key: "typography",
    icon: Type,
    title: "Font Hiyerarşisi",
    status: "good",
    finding: "Başlık / gövde / etiket ayrımı net ve tutarlı.",
    suggestion: "Bu alanda değişiklik gerekmiyor.",
  },
  {
    key: "accessibility",
    icon: Accessibility,
    title: "Erişilebilirlik",
    status: "warn",
    finding: "3 ekranda dokunma alanı önerilen 44pt sınırının altında.",
    suggestion: "Küçük ikon butonlarının (özellikle geri/kapat) dokunma alanını büyüt.",
  },
  {
    key: "permissions",
    icon: ShieldAlert,
    title: "İzin Fazlalığı",
    status: "warn",
    finding: "Uygulama 6 farklı izin istiyor; benzer uygulamalarda ortalama 3.",
    suggestion: "Konum ve kişi rehberi iznini ihtiyaç anına ertele, açılışta hepsini birden isteme.",
  },
  {
    key: "conversion",
    icon: TrendingDown,
    title: "Dönüşüm Kaybı Riski",
    status: "bad",
    finding: "Ödeme ekranındaki form uzunluğu ve adım sayısı yüksek terk oranına işaret ediyor.",
    suggestion: "Ödeme formunu tek ekrana indir, misafir ödeme seçeneği ekle.",
  },
];

const REVIEW_STATS = {
  totalReviews: 1240,
  avgRating: 3.4,
  topComplaints: [
    { label: "Uygulama çöküyor", pct: 34 },
    { label: "Yavaş yükleniyor", pct: 27 },
    { label: "Giriş yapılamıyor", pct: 18 },
    { label: "Bildirimler çok fazla", pct: 11 },
  ],
  roadmap: [
    "Çökme raporlarını önceliklendir — en çok şikayet edilen konu.",
    "Ana ekran yükleme süresini optimize et.",
    "Giriş akışındaki hata mesajlarını netleştir.",
  ],
};

const COMING_SOON = [
  { title: "Competitor Intelligence", desc: "Rakip uygulamalarla karşılaştırmalı analiz." },
  { title: "Runtime Performans İzleme", desc: "SDK ile gerçek zamanlı açılış süresi ve bellek takibi." },
];

const STATUS_META = {
  good: { color: "var(--teal)", Icon: CheckCircle2, label: "Sorun yok" },
  warn: { color: "var(--yellow)", Icon: AlertTriangle, label: "Dikkat" },
  bad: { color: "var(--kick)", Icon: XCircle, label: "Kritik" },
};

// score derived from findings mix — just for the mock
const HEALTH_SCORE = 58;

// ---------------------------------------------------------------------------
// Health Dial — full-circle radial tick gauge (Stripe-dashboard-style), reads as
// overall AI Health Score. Ticks are colored along a fixed red→yellow→teal scale;
// ticks beyond the current score fade to gray.
// ---------------------------------------------------------------------------

function ToolbarAppIcon({ name, storeUrl }) {
  const [iconUrl, setIconUrl] = useState(null);

  React.useEffect(() => {
    if (!storeUrl) return;
    let cancelled = false;
    fetch(`/api/app-icon?storeUrl=${encodeURIComponent(storeUrl)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.iconUrl) setIconUrl(d.iconUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storeUrl]);

  const letter = (name || "?").trim().charAt(0).toUpperCase();

  if (iconUrl) {
    return <img src={iconUrl} alt="" className="kma-toolbar-app-icon" />;
  }
  return (
    <div className="kma-toolbar-app-icon kma-toolbar-app-icon-fallback">{letter}</div>
  );
}


function QueriedAppBadge({ name, storeUrl }) {
  const [iconUrl, setIconUrl] = useState(null);

  React.useEffect(() => {
    if (!storeUrl) return;
    let cancelled = false;
    fetch(`/api/app-icon?storeUrl=${encodeURIComponent(storeUrl)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.iconUrl) setIconUrl(d.iconUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storeUrl]);

  const letter = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="kma-queried-app">
      {iconUrl ? (
        <img src={iconUrl} alt="" className="kma-queried-app-icon" />
      ) : (
        <div className="kma-queried-app-fallback">{letter}</div>
      )}
      <span className="kma-queried-app-name">{name}</span>
    </div>
  );
}

function zoneColorAt(pct) {
  // 3 durak: kırmızı (0%) → sarı (50%) → teal (100%), HSL üzerinde yumuşak geçiş.
  const stops = [
    { p: 0, h: 6, s: 84, l: 58 },
    { p: 50, h: 37, s: 88, l: 55 },
    { p: 100, h: 175, s: 80, l: 34 },
  ];
  let a = stops[0];
  let b = stops[1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i].p && pct <= stops[i + 1].p) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const t = b.p === a.p ? 0 : (pct - a.p) / (b.p - a.p);
  const h = a.h + (b.h - a.h) * t;
  const s = a.s + (b.s - a.s) * t;
  const l = a.l + (b.l - a.l) * t;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function HealthDial({ score = 58, size = 220, delta = null }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 10;
  const innerR = outerR - 16;
  const tickCount = 54;
  const gapDeg = 3.2; // tikler arası nefes payı
  const rad = (deg) => (deg * Math.PI) / 180;
  const filledTicks = Math.round((score / 100) * tickCount);

  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = (360 / tickCount) * i - 90; // -90: en üstten başla
    const a1 = rad(angle + gapDeg / 2);
    const a2 = rad(angle + 360 / tickCount - gapDeg / 2);
    const x1 = cx + innerR * Math.cos(a1);
    const y1 = cy + innerR * Math.sin(a1);
    const x2 = cx + outerR * Math.cos(a1);
    const y2 = cy + outerR * Math.sin(a1);
    const isFilled = i < filledTicks;
    const color = isFilled ? zoneColorAt((i / tickCount) * 100) : "var(--ink-3)";
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={isFilled ? 1 : 0.5}
      />
    );
  });

  const deltaColor = delta > 0 ? "var(--teal)" : delta < 0 ? "var(--kick)" : "var(--muted)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {ticks}
      <text x={cx} y={cy - (delta !== null ? 4 : 0)} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "var(--font-display)", fontSize: 46, fontWeight: 500, letterSpacing: "-0.02em", fill: "var(--chalk)" }}>
        {score}
      </text>
      {delta !== null && (
        <text x={cx} y={cy + 22} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, fill: deltaColor }}>
          {delta > 0 ? "+" : ""}
          {delta}
        </text>
      )}
      <text x={cx} y={cy + (delta !== null ? 44 : 30)} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.14em", fill: "var(--muted)" }}>
        APP HEALTH SCORE
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// UI pieces
// ---------------------------------------------------------------------------

function AnnotatedScreenshot({ url, index, findings }) {
  const relevant = findings.filter((f) => f.screenshotIndex === index && f.boundingBox);
  return (
    <div className="shot-frame">
      <div className="shot-index">Ekran #{index}</div>
      <div className="shot-img-wrap">
        <img src={url} alt={`Ekran görüntüsü ${index}`} />
        {relevant.map((f, i) => {
          const meta = STATUS_META[f.status];
          const bb = f.boundingBox;
          return (
            <div
              key={i}
              className="shot-highlight"
              style={{
                left: `${bb.x}%`,
                top: `${bb.y}%`,
                width: `${bb.width}%`,
                height: `${bb.height}%`,
                borderColor: meta.color,
              }}
              title={f.title}
            >
              <span className="shot-highlight-label" style={{ background: meta.color }}>
                {f.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FindingRow({ f }) {
  const meta = STATUS_META[f.status];
  const StatusIcon = meta.Icon;
  return (
    <div className="finding-row" style={{ background: `color-mix(in srgb, ${meta.color} 10%, var(--ink-2))` }}>
      <div className="finding-row-top">
        <span className="finding-title">{f.title}</span>
        {f.screenshotIndex && <span className="finding-shot-ref">Ekran #{f.screenshotIndex}</span>}
        <span className="finding-status" style={{ color: meta.color }}>
          <StatusIcon size={13} strokeWidth={2.2} />
          {meta.label}
        </span>
      </div>
      <p className="finding-text">{f.finding}</p>
      {f.status !== "good" && (
        <div className="finding-suggestion">
          <Lightbulb size={12} strokeWidth={2.2} color="var(--yellow)" />
          <span>{f.suggestion}</span>
        </div>
      )}
      {f.codeSnippet?.code && (
        <div className="finding-code">
          <div className="finding-code-lang">{f.codeSnippet.language}</div>
          <pre><code>{f.codeSnippet.code}</code></pre>
        </div>
      )}
    </div>
  );
}

function SubscribeForm({ appName, storeUrl }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), appName, storeUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kayıt başarısız oldu.");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="panel subscribe-panel">
      <div className="subscribe-icon">
        <Mail size={16} color="var(--muted)" />
      </div>
      <div className="subscribe-text">
        <div className="subscribe-title">Haftalık Yorum Özeti Al</div>
        <div className="subscribe-desc">
          {appName} için her hafta yeni App Store yorumlarının özetini e-posta ile al.
        </div>
      </div>
      {status === "done" ? (
        <div className="subscribe-done">Kaydedildi ✓</div>
      ) : (
        <div className="subscribe-form-row">
          <input
            type="email"
            placeholder="e-posta@ornek.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="subscribe-input"
          />
          <button className="subscribe-btn" onClick={handleSubmit} disabled={status === "sending"}>
            {status === "sending" ? "…" : "Abone Ol"}
          </button>
        </div>
      )}
      {status === "error" && <div className="subscribe-error">{errorMsg}</div>}
    </div>
  );
}

function ComplaintBar({ label, pct }) {
  return (
    <div className="complaint-row">
      <span className="complaint-label">{label}</span>
      <div className="complaint-track">
        <div className="complaint-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="complaint-pct">%{pct}</span>
    </div>
  );
}

function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="complaint-row">
      <span className="complaint-label" style={{ width: 42 }}>{star}★</span>
      <div className="complaint-track">
        <div className="complaint-fill" style={{ width: `${pct}%`, background: star >= 4 ? "var(--teal)" : star === 3 ? "var(--yellow)" : "var(--kick)" }} />
      </div>
      <span className="complaint-pct">{count}</span>
    </div>
  );
}

const ICON_MAP = {
  onboarding: Layers,
  cta: MousePointerClick,
  contrast: Palette,
  typography: Type,
  accessibility: Accessibility,
  permissions: ShieldAlert,
  conversion: TrendingDown,
  navigation: Compass,
  empty_states: Inbox,
  consistency: LayoutGrid,
  loading: Loader2,
  copy: AlignLeft,
  trust: BadgeCheck,
};

// Her kategori bir "mercek"e (UI / UX / Erişilebilirlik / Ürün) bağlanır — 6 ayrı
// rapor yerine tek raporda gruplu özet. Bilinçli bir sınırlama: klavye navigasyonu,
// ekran okuyucu uyumluluğu, animasyon performansı gibi gerçek cihaz/kod gerektiren
// kriterler burada YOK — ekran görüntüsünden dürüstçe değerlendirilemezler.
const LENS_MAP = {
  cta: "UI",
  contrast: "UI",
  typography: "UI",
  consistency: "UI",
  onboarding: "UX",
  navigation: "UX",
  empty_states: "UX",
  loading: "UX",
  copy: "UX",
  accessibility: "Erişilebilirlik",
  permissions: "Ürün",
  conversion: "Ürün",
  trust: "Ürün",
};

const LENS_ORDER = ["UI", "UX", "Erişilebilirlik", "Ürün"];
const LENS_DISPLAY_LABEL = { UI: "USER INTERFACE", UX: "USER EXPERIENCE", Erişilebilirlik: "ACCESSIBILITY", Ürün: "PRODUCT" };
const LENS_TITLE_LABEL = { UI: "User Interface", UX: "User Experience", Erişilebilirlik: "Accessibility", Ürün: "Product" };
const LENS_ICON = { UI: Palette, UX: Compass, Erişilebilirlik: Accessibility, Ürün: TrendingDown };
const LENS_SUBTITLE = {
  UI: "Tasarım sistemi & görsel tutarlılık",
  UX: "Akış ve kullanılabilirlik",
  Erişilebilirlik: "WCAG mantığıyla erişilebilirlik",
  Ürün: "Ürün sahibi (Product Owner) bakışı",
};

// Hızlı Kazanımlar (Impact × Effort) için efor tahmini — kaba ama tutarlı bir sezgisel.
const EFFORT_MAP = {
  cta: "low",
  contrast: "low",
  typography: "low",
  copy: "low",
  accessibility: "low",
  permissions: "low",
  consistency: "medium",
  navigation: "medium",
  loading: "medium",
  empty_states: "medium",
  trust: "medium",
  onboarding: "high",
  conversion: "high",
};

function HistoryBarChart({ points, width = 560, height = 120 }) {
  const shown = points.slice(-12); // en fazla son 12 tarama
  const slot = width / shown.length;
  const r = Math.min(22, slot * 0.32);
  const padTop = r + 4;
  const padBottom = r + 4;
  const drawH = height - padTop - padBottom;

  return (
    <svg width={width} height={height + 26} viewBox={`0 0 ${width} ${height + 26}`}>
      {shown.map((p, i) => {
        const cx = i * slot + slot / 2;
        const cy = padTop + drawH - (p.health_score / 100) * drawH;
        const color = p.health_score >= 75 ? "var(--teal)" : p.health_score >= 50 ? "var(--yellow)" : "var(--kick)";
        const dateLabel = new Date(p.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={color} opacity={i === shown.length - 1 ? 1 : 0.6} />
            <text x={cx} y={height + 18} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fill: "var(--muted)" }}>
              {dateLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HistoryPanel({ history }) {
  if (!history || history.length === 0) return null;

  const first = history[0];
  const last = history[history.length - 1];
  const delta = last.health_score - first.health_score;
  const deltaColor = delta >= 0 ? "var(--teal)" : "var(--kick)";

  return (
    <div className="panel">
      <div className="hist-header">
        <div className="panel-title">Sağlık Skoru Trendi</div>
        <div className="panel-subtitle">{history.length} tarama üzerinden zaman içindeki değişim</div>
      </div>
      {history.length >= 2 ? (
        <>
          <div className="hist-bignum">
            {last.health_score}
            <span className="hist-delta" style={{ color: deltaColor }}>
              ({delta >= 0 ? "+" : ""}
              {delta}) ilk taramadan bu yana
            </span>
          </div>
          <HistoryBarChart points={history} />
        </>
      ) : (
        <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
          Bu ilk tarama — bir sonraki taramadan sonra burada trend göreceksin.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function KickMyAppsHealthReport({ data, appLabel = "Uygulaman", onReset, history = [], onViewHistory, scanId, storeUrl, screenshots = [], onClose }) {
  const usingRealData = Boolean(data);
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [findingFilter, setFindingFilter] = useState("all");

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#14151a",
        scale: 2,
        ignoreElements: (el) => el.classList?.contains("no-print"),
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${appLabel || "kick-my-apps"}-saglik-raporu.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
    } finally {
      setExporting(false);
    }
  };

  const healthScore = usingRealData ? data.healthScore : HEALTH_SCORE;
  const findings = usingRealData
    ? (data.findings || []).map((f) => ({ ...f, icon: ICON_MAP[f.key] || Sparkles }))
    : FINDINGS;
  const reviewSummary = usingRealData ? data.reviewSummary : REVIEW_STATS;
  const asoReview = usingRealData ? data.asoReview : null;
  const approvalRisks = usingRealData ? data.approvalRisks || [] : [];
  const lensScores = usingRealData ? data.lensScores || computeLensScores(findings) : null;

  const badCount = findings.filter((f) => f.status === "bad").length;
  const warnCount = findings.filter((f) => f.status === "warn").length;
  const goodCount = findings.filter((f) => f.status === "good").length;

  const lensSummary = LENS_ORDER.map((lens) => {
    const items = findings.filter((f) => LENS_MAP[f.key] === lens);
    return {
      lens,
      bad: items.filter((f) => f.status === "bad").length,
      warn: items.filter((f) => f.status === "warn").length,
      good: items.filter((f) => f.status === "good").length,
      total: items.length,
    };
  }).filter((l) => l.total > 0);

  const lensSummaryFull = LENS_ORDER.map((lens) => {
    const items = findings.filter((f) => LENS_MAP[f.key] === lens);
    return {
      lens,
      bad: items.filter((f) => f.status === "bad").length,
      warn: items.filter((f) => f.status === "warn").length,
      good: items.filter((f) => f.status === "good").length,
      total: items.length,
    };
  });

  const dialCaption = `${findings.length} bulgudan ${badCount} kritik, ${warnCount} dikkat gerektiriyor`;
  const reportDateLabel = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }) +
    " · " + new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const IMPACT_RANK = { bad: 2, warn: 1, good: 0 };
  const priorityActions = findings
    .filter((f) => f.status !== "good")
    .sort((a, b) => IMPACT_RANK[b.status] - IMPACT_RANK[a.status])
    .slice(0, 3);

  const totalFindingsCount = findings.length;
  const frictionRatio = totalFindingsCount > 0 ? (badCount + warnCount) / totalFindingsCount : 0;
  const frictionLevel = frictionRatio > 0.5 ? "Yüksek" : frictionRatio > 0.25 ? "Orta" : "Düşük";
  const frictionColor = frictionLevel === "Yüksek" ? "var(--kick)" : frictionLevel === "Orta" ? "var(--yellow)" : "var(--teal)";
  const conversionRelatedBad = findings.filter((f) => ["conversion", "trust", "cta"].includes(f.key) && f.status !== "good").length;
  const conversionLevel = conversionRelatedBad >= 2 ? "Yüksek" : conversionRelatedBad === 1 ? "Orta" : "Düşük";
  const conversionColor = conversionLevel === "Yüksek" ? "var(--teal)" : conversionLevel === "Orta" ? "var(--yellow)" : "var(--muted)";
  const potentialScore = Math.min(96, healthScore + badCount * 5 + warnCount * 2);
  const EFFORT_RANK = { low: 0, medium: 1, high: 2 };
  const quickWins = findings
    .filter((f) => f.status !== "good" && (EFFORT_MAP[f.key] || "medium") !== "high")
    .sort((a, b) => {
      const impactDiff = IMPACT_RANK[b.status] - IMPACT_RANK[a.status];
      if (impactDiff !== 0) return impactDiff;
      return EFFORT_RANK[EFFORT_MAP[a.key] || "medium"] - EFFORT_RANK[EFFORT_MAP[b.key] || "medium"];
    })
    .slice(0, 5);

  return (
    <div className="kma-root" ref={reportRef}>
      <style>{`
        .kma-root {
          --font-display: var(--font-inter), sans-serif;
          --font-body: var(--font-inter), sans-serif;
          --font-mono: var(--font-inter), sans-serif;

          background: var(--ink);
          color: var(--chalk);
          font-family: var(--font-body);
          min-height: 100%;
          border-radius: 12px;
          overflow: hidden;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .kma-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px;
          border-bottom: 1px solid var(--ink-3);
        }
        .kma-queried-app { display: flex; align-items: center; gap: 10px; }
        .kma-queried-app-icon { width: 28px; height: 28px; border-radius: 8px; object-fit: cover; border: 1px solid var(--ink-3); }
        .kma-queried-app-fallback {
          width: 28px; height: 28px; border-radius: 8px; background: var(--brand); color: #fff;
          display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;
        }
        .kma-queried-app-name { font-family: var(--font-display); font-size: 17px; font-weight: 600; color: var(--chalk); }
        .app-picker {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-mono); font-size: 13.5px; color: var(--muted);
          background: var(--ink-2); border: 1px solid var(--ink-3);
          padding: 7px 12px; border-radius: 8px;
        }
        .kma-close-btn {
          width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--ink-3);
          background: var(--ink-2); color: var(--chalk); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease;
        }
        .kma-close-btn:hover { background: var(--ink-3); border-color: var(--brand); color: var(--brand); }

        .kma-main { padding: 24px 28px 32px; display: flex; flex-direction: column; gap: 32px; }

        .upload-panel {
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 12px;
          padding: 20px 22px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          box-shadow: var(--shadow);
        }
        .upload-slot-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .upload-slot {
          display: inline-flex; align-items: center; gap: 8px; width: fit-content;
          background: transparent; border: 1px solid var(--ink-3); border-radius: 999px;
          padding: 8px 14px; font-size: 12px; color: var(--muted);
        }
        .upload-slot strong { color: var(--chalk); font-weight: 600; }
        .kma-toolbar-btn {
          border: none; cursor: pointer; white-space: nowrap; font-family: inherit; font-size: inherit;
          margin: 0; box-sizing: border-box; line-height: normal;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .kma-toolbar-btn:hover { transform: translateY(-2px); }
        .kma-toolbar-btn:active { transform: translateY(0); }

        .panel { background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 12px; padding: 24px; box-shadow: var(--shadow); }
        .panel-title { font-family: var(--font-display); font-size: 17px; letter-spacing: 0; font-weight: 600; color: var(--chalk); margin-bottom: 4px; }
        .panel-subtitle { font-size: 12px; color: var(--muted); margin-bottom: 32px; }
        .panel-divider { height: 1px; background: var(--ink-3); margin-bottom: 16px; }

        .kma-toolbar-card {
          display: flex; align-items: center; gap: 12px; background: var(--ink-2); border: 1px solid var(--ink-3);
          border-radius: 16px; padding: 24px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .kma-toolbar-app { display: flex; align-items: center; gap: 12px; }
        .kma-toolbar-app-icon { width: 46px; height: 46px; border-radius: 12px; object-fit: cover; border: 1px solid var(--ink-3); }
        .kma-toolbar-app-icon-fallback {
          background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 17px;
        }
        .kma-toolbar-app-name { font-family: var(--font-display); font-size: 17px; font-weight: 700; color: var(--chalk); }
        .kma-toolbar-app-date { font-size: 12px; color: var(--muted); margin-top: 2px; }

        .summary-badge-list { display: flex; flex-direction: column; gap: 14px; }
        .summary-badge-row { display: flex; align-items: center; gap: 12px; }
        .summary-badge {
          width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 13.5px; flex-shrink: 0;
        }
        .summary-badge-title { font-size: 13.5px; font-weight: 400; color: var(--chalk); }

        .priority-action-row-v2 { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
        .priority-action-num-v2 {
          width: 26px; height: 26px; border-radius: 8px; background: var(--ink-3); color: var(--chalk);
          font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .priority-action-title-v2 { font-size: 13.5px; font-weight: 400; color: var(--chalk); }

        .impact-row-v2 { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; }
        .impact-label-v2 { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--chalk); }
        .impact-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brand); flex-shrink: 0; }
        .impact-pill { font-size: 12px; font-weight: 400; padding: 4px 12px; border-radius: 999px; white-space: nowrap; }

        .lens-count-row { display: flex; }
        .lens-count-item { flex: 1; text-align: center; padding: 0 12px; position: relative; }
        .lens-count-item-divided::before {
          content: ""; position: absolute; left: 0; top: 5px; bottom: 5px;
          border-left: 1px dashed var(--ink-3);
        }
        .lens-count-num { font-family: var(--font-display); font-size: 34px; font-weight: 800; color: var(--chalk); }
        .lens-count-label { font-size: 12px; font-weight: 600; letter-spacing: 0.05em; color: var(--muted); margin-top: 4px; }

        .waveform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 800px) { .waveform-grid { grid-template-columns: 1fr; } }

        .stackbar-list { display: flex; flex-direction: column; gap: 22px; }
        .stackbar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .stackbar-label { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: var(--chalk); }
        .stackbar-counts { font-size: 11px; font-family: var(--font-mono); color: var(--muted); }
        .stackbar-track { display: flex; height: 22px; border-radius: 6px; overflow: hidden; background: var(--ink-3); }
        .stackbar-seg {
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: var(--ink);
          transition: width 0.6s ease;
        }
        .ai-summary-text { font-size: 13.5px; line-height: 1.65; color: var(--chalk); }
        .priority-actions-list { display: flex; flex-direction: column; gap: 10px; }
        .priority-action-row { display: flex; align-items: center; gap: 8px; }
        .priority-action-num {
          width: 18px; height: 18px; border-radius: 50%; background: var(--ink-3); color: var(--chalk);
          font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .priority-action-title { font-size: 12px; color: var(--chalk); flex: 1; line-height: 1.4; }
        .priority-action-tag { font-size: 12px; font-weight: 400; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; white-space: nowrap; }
        .impact-list { display: flex; flex-direction: column; gap: 12px; }
        .impact-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .impact-label { font-size: 12px; color: var(--muted); }
        .impact-value { font-size: 13.5px; font-weight: 700; white-space: nowrap; }
        .impact-disclaimer { font-size: 12px; color: var(--muted); margin-top: 14px; line-height: 1.5; }
        .lens-score-row { display: flex; gap: 16px; flex-wrap: wrap; }
        .lens-score-item {
          flex: 1; min-width: 90px; text-align: center; background: var(--ink);
          border-radius: 12px; padding: 18px 10px;
        }
        .lens-score-num { font-family: var(--font-display); font-size: 32px; font-weight: 700; line-height: 1; }
        .lens-score-label { font-size: 12px; font-weight: 600; letter-spacing: 0.05em; color: var(--muted); margin-top: 6px; }

        .top-grid { display: grid; grid-template-columns: 330px 0.85fr 1.15fr; gap: 32px; }
        @media (max-width: 900px) {
          .top-grid { grid-template-columns: 1fr; }
        }
        .action-impact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        @media (max-width: 900px) {
          .action-impact-grid { grid-template-columns: 1fr; }
        }
        .dial-panel { display: flex; flex-direction: column; align-items: flex-start; }
        .dial-panel .dial-wrap { align-self: center; display: flex; flex-direction: column; align-items: center; }
        .dial-caption { font-size: 12px; color: var(--muted); text-align: center; margin-top: 4px; }

        .hist-header { margin-bottom: 10px; }
        .hist-bignum {
          font-family: var(--font-display); font-size: 32px; font-weight: 700; letter-spacing: -0.02em;
          color: var(--chalk); display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;
        }
        .hist-delta { font-family: var(--font-mono); font-size: 12px; font-weight: 600; }

        .summary-list { display: flex; flex-direction: column; gap: 8px; }
        .summary-row { display: flex; align-items: center; gap: 10px; font-size: 13.5px; }
        .summary-count { font-family: var(--font-mono); font-weight: 700; width: 20px; }

        .shot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .shot-frame { background: var(--ink); border: 1px solid var(--ink-3); border-radius: 10px; padding: 10px; }
        .shot-index { font-family: var(--font-mono); font-size: 12px; color: var(--muted); margin-bottom: 8px; }
        .shot-img-wrap { position: relative; }
        .shot-img-wrap img { width: 100%; display: block; border-radius: 6px; }
        .shot-highlight {
          position: absolute; border: 2px solid; border-radius: 4px;
        }
        .shot-highlight-label {
          position: absolute; bottom: calc(100% + 4px); left: -2px;
          white-space: normal; word-break: break-word; max-width: 220px;
          font-size: 12px; font-weight: 600; line-height: 1.35; color: #fff; padding: 3px 6px; border-radius: 4px;
          font-family: var(--font-mono); z-index: 2;
        }

        .lens-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .lens-name { font-size: 13.5px; font-weight: 600; margin-bottom: 8px; }
        .lens-bar { display: flex; height: 6px; border-radius: 3px; overflow: hidden; background: var(--ink-3); margin-bottom: 8px; }
        .lens-seg { height: 100%; }
        .lens-count { display: flex; gap: 10px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 12px; }

        .qw-list { display: flex; flex-direction: column; gap: 10px; }
        .qw-row { background: var(--ink); border-radius: 8px; padding: 12px 14px; }
        .qw-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
        .qw-title { font-size: 13.5px; font-weight: 600; }
        .qw-tags { display: flex; gap: 6px; }
        .qw-tag { font-family: var(--font-mono); font-size: 12px; padding: 3px 8px; border-radius: 999px; background: var(--ink-3); }
        .qw-impact-bad { color: var(--kick); }
        .qw-impact-warn { color: var(--yellow); }
        .qw-effort { color: var(--teal); }
        .qw-suggestion { font-size: 12px; color: var(--muted); margin: 0; line-height: 1.5; }

        .finding-list { display: flex; flex-direction: column; gap: 10px; }
        .bulgular-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .finding-filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .finding-filter-tab {
          display: flex; align-items: center; gap: 6px; background: var(--ink-2); border: 1px solid var(--ink-3);
          border-radius: 999px; padding: 6px 14px; font-size: 12px; color: var(--muted); cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .finding-filter-tab:hover { border-color: var(--brand); }
        .finding-filter-tab-active { background: var(--ink-3); border-color: var(--chalk); color: var(--chalk); font-weight: 400; }
        .finding-filter-count { font-family: var(--font-mono); font-size: 12px; opacity: 0.7; }
        .empty-state { color: var(--muted); font-size: 13.5px; padding: 24px 0; text-align: center; }
        .lens-group { margin-bottom: -13px; }
        .lens-group-product { margin-top: 50px; }
        .lens-group-product .lens-group-title { margin-top: 0; }
        .lens-group:last-child { margin-bottom: 0; }
        .lens-group-title { font-family: var(--font-display); font-size: 17px; letter-spacing: 0; font-weight: 600; color: var(--chalk); margin-bottom: 4px; }
        .lens-group-caption { font-size: 12px; color: var(--muted); margin-bottom: 20px; }
        .finding-row {
          background: var(--ink-2);
          border-radius: 8px;
          padding: 14px 16px;
          box-shadow: var(--shadow);
        }
        .finding-row-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .finding-title { font-size: 13.5px; font-weight: 600; flex: 1; }
        .finding-status { display: flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.04em; }
        .finding-shot-ref {
          font-family: var(--font-mono); font-size: 12px; color: var(--muted);
          background: var(--ink-3); padding: 2px 7px; border-radius: 999px;
        }
        .finding-text { font-size: 13.5px; color: var(--muted); line-height: 1.5; margin: 0; }
        .finding-suggestion {
          display: flex; align-items: flex-start; gap: 8px;
          background: #FFFFFF; border-radius: 6px; padding: 8px 10px;
          font-size: 12px; color: #4B5563; line-height: 1.4;
          margin: 8px 0 0 0;
        }
        .finding-suggestion {
          display: flex; align-items: flex-start; gap: 8px;
          background: #FFFFFF; border-radius: 6px; padding: 9px 10px;
          font-size: 12px; color: #4B5563; line-height: 1.4;
        }
        .finding-suggestion span { flex: 1; }

        .finding-code {
          margin: 8px 0 0 0;
          background: #14151a;
          border-radius: 6px;
          overflow: hidden;
        }
        .finding-code-lang {
          font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em;
          color: #8a8f9c; padding: 6px 10px 0;
        }
        .finding-code pre { margin: 0; padding: 4px 10px 10px; overflow-x: auto; }
        .finding-code code { font-family: var(--font-mono); font-size: 12px; color: #f5f3ee; white-space: pre; }

        .review-pair-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 32px; row-gap: 20px; align-items: center; }
        .review-pair-cell { display: flex; align-items: center; }
        .review-extra { margin-top: 14px; }
        .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        .review-meta { display: flex; align-items: baseline; gap: 14px; margin-bottom: 14px; }
        .review-count { font-family: var(--font-display); font-size: 28px; font-weight: 500; letter-spacing: -0.01em; }
        .review-rating { font-family: var(--font-mono); color: var(--yellow); font-size: 13.5px; }
        .complaint-row { display: flex; align-items: center; gap: 10px; margin-bottom: 30px; width: 100%; }
        .review-pair-cell .complaint-row { margin-bottom: 0; }
        .complaint-label { font-size: 12px; width: 150px; color: var(--chalk); flex-shrink: 0; }
        .complaint-track { flex: 1; height: 6px; background: var(--ink-3); border-radius: 3px; overflow: hidden; }
        .complaint-fill { height: 100%; background: var(--kick); border-radius: 3px; }
        .complaint-pct { font-family: var(--font-mono); font-size: 12px; color: var(--muted); width: 34px; text-align: right; }

        .review-subtitle {
          font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.1em;
          color: var(--muted); margin: 66px 0 33px;
        }

        .helpful-negative {
          margin-top: 16px; background: var(--ink); border-radius: 8px; padding: 12px 14px;
        }
        .helpful-negative-label {
          font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 6px;
        }
        .helpful-negative-stars { color: var(--yellow); font-size: 13.5px; margin-bottom: 6px; }
        .helpful-negative-text { font-size: 12px; color: var(--chalk); line-height: 1.5; margin: 0; }

        .version-trend { margin-top: 66px; }
        .version-trend .helpful-negative-label { margin-bottom: 33px; }
        .version-trend-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .version-chip {
          display: flex; align-items: center; gap: 6px; background: var(--ink-3);
          border-radius: 999px; padding: 5px 11px;
        }
        .version-chip-num { font-family: var(--font-mono); font-size: 12px; color: var(--muted); }
        .version-chip-avg { font-family: var(--font-mono); font-size: 12px; font-weight: 700; }

        .roadmap-list { display: flex; flex-direction: column; gap: 30px; }
        .roadmap-item { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--chalk); }

        .aso-meta { font-family: var(--font-mono); font-size: 12px; color: var(--muted); margin-bottom: 14px; display: flex; gap: 4px; flex-wrap: wrap; }
        .aso-row { margin-bottom: 12px; }
        .aso-label { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 3px; }
        .aso-text { font-size: 13.5px; color: var(--chalk); line-height: 1.5; }
        .aso-suggestions { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
        .aso-suggestion-row { display: flex; align-items: flex-start; gap: 8px; background: var(--ink); border-radius: 6px; padding: 8px 10px; font-size: 12px; color: var(--muted); }

        .risk-disclaimer { font-size: 12px; color: var(--muted); margin-bottom: 12px; font-style: italic; }
        .risk-list { display: flex; flex-direction: column; gap: 8px; }
        .risk-row { display: flex; gap: 10px; background: var(--ink); border-left: 3px solid var(--ink-3); border-radius: 6px; padding: 10px 12px; }
        .risk-issue { font-size: 13.5px; color: var(--chalk); font-weight: 600; margin-bottom: 2px; }
        .risk-guideline { font-size: 12px; color: var(--muted); font-family: var(--font-mono); }

        .subscribe-panel {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .subscribe-icon {
          width: 34px; height: 34px; border-radius: 9px; background: var(--ink-3);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .subscribe-text { flex: 1; min-width: 180px; }
        .subscribe-title { font-size: 13.5px; font-weight: 600; }
        .subscribe-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .subscribe-form-row { display: flex; gap: 8px; }
        .subscribe-input {
          background: var(--ink); border: 1px solid var(--ink-3); border-radius: 999px;
          padding: 9px 14px; font-size: 13.5px; color: var(--chalk); outline: none; width: 200px;
        }
        .subscribe-btn {
          background: var(--brand); color: #FFFFFF; font-weight: 600; font-size: 13.5px;
          padding: 9px 16px; border-radius: 999px; border: none; cursor: pointer; white-space: nowrap;
        }
        .subscribe-btn:disabled { opacity: 0.6; cursor: default; }
        .subscribe-done { font-size: 13.5px; color: var(--teal); font-weight: 600; }
        .subscribe-error { width: 100%; font-size: 12px; color: var(--kick); margin-top: 6px; }

        .soon-row {
          display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
          font-size: 12px; color: var(--muted); padding-top: 4px;
        }
        .soon-label { font-family: var(--font-mono); letter-spacing: 0.1em; font-size: 12px; margin-right: 4px; }
        .soon-item { display: inline-flex; align-items: center; gap: 5px; }
        .soon-dot { margin-left: 6px; opacity: 0.6; }
        .soon-badge { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em; color: var(--muted); border: 1px solid var(--ink-3); padding: 2px 6px; border-radius: 4px; }
      `}</style>

      <div className="kma-main">
        <div className="kma-toolbar-card no-print">
          <div className="kma-toolbar-app">
            <ToolbarAppIcon name={appLabel} storeUrl={storeUrl} />
            <div>
              <div className="kma-toolbar-app-name">{appLabel}</div>
              <div className="kma-toolbar-app-date">{reportDateLabel}</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            className="kma-toolbar-btn"
            onClick={handleExportPdf}
            disabled={exporting}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: "var(--ink-2)", border: "1px solid var(--ink-3)", borderRadius: 999,
              padding: "0 14px", fontSize: 13.5, color: "var(--chalk)", height: 44, boxSizing: "border-box",
              minWidth: 125, opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? "Hazırlanıyor…" : "PDF İndir"}
          </button>
          {scanId && (
            <Link
              href={`/history?preselect=${scanId}`}
              className="kma-toolbar-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: "var(--ink-2)", border: "1px solid var(--ink-3)", borderRadius: 999,
                padding: "0 14px", fontSize: 13.5, color: "var(--chalk)", height: 44, boxSizing: "border-box",
                minWidth: 125, textDecoration: "none",
              }}
            >
              Karşılaştır
            </Link>
          )}
          <button
            className="kma-toolbar-btn"
            onClick={onReset}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: "var(--brand)", border: "1px solid var(--brand)", borderRadius: 999,
              padding: "0 14px", fontSize: 12.5, fontWeight: 600, color: "#fff", height: 44, boxSizing: "border-box", minWidth: 125,
            }}
          >
            {onReset ? (
              "Yeni Analiz"
            ) : (
              <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
                Yeni Analiz
              </Link>
            )}
          </button>
          {onClose && (
            <button className="kma-close-btn" onClick={onClose} aria-label="Kapat">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="top-grid">
          <div className="panel dial-panel">
            <div className="panel-title">App Health Score</div>
            <div className="panel-subtitle">{dialCaption}</div>
            <div className="dial-wrap">
              <HealthDial score={healthScore} delta={history.length >= 2 ? healthScore - history[history.length - 2].health_score : null} />
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">Summary</div>
            <div className="panel-subtitle">{dialCaption}</div>
            <div className="summary-badge-list">
              <div className="summary-badge-row">
                <span className="summary-badge" style={{ background: "color-mix(in srgb, var(--kick) 15%, transparent)", color: "var(--kick)" }}>{badCount}</span>
                <div>
                  <div className="summary-badge-title">Kritik seviyede sorun</div>
                </div>
              </div>
              <div className="summary-badge-row">
                <span className="summary-badge" style={{ background: "color-mix(in srgb, var(--yellow) 15%, transparent)", color: "var(--yellow)" }}>{warnCount}</span>
                <div>
                  <div className="summary-badge-title">Dikkat gerektiren bulgu</div>
                </div>
              </div>
              <div className="summary-badge-row">
                <span className="summary-badge" style={{ background: "color-mix(in srgb, var(--teal) 15%, transparent)", color: "var(--teal)" }}>{goodCount}</span>
                <div>
                  <div className="summary-badge-title">Sorunsuz alan</div>
                </div>
              </div>
              {reviewSummary && (
                <div className="summary-badge-row">
                  <span className="summary-badge" style={{ background: "var(--ink-3)", color: "var(--chalk)" }}>{reviewSummary.totalReviews}</span>
                  <div>
                    <div className="summary-badge-title">App Store yorumu analiz edildi</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {usingRealData && data.aiSummary && (
            <div className="panel">
              <div className="panel-title">AI Summary</div>
              <div className="panel-subtitle">{dialCaption}</div>
              <p className="ai-summary-text">{data.aiSummary}</p>
            </div>
          )}
        </div>

        <div className="action-impact-grid">
          {priorityActions.length > 0 && (
            <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
              <div className="panel-title">Öncelikli Aksiyonlar</div>
              <div className="panel-subtitle">{dialCaption}</div>
              <div className="panel-divider" />
              <div className="priority-actions-list" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                {priorityActions.map((f, i) => {
                  const meta = STATUS_META[f.status];
                  return (
                    <div className="priority-action-row-v2" key={i}>
                      <span className="priority-action-num-v2">{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div className="priority-action-title-v2">{f.title}</div>
                      </div>
                      <span className="priority-action-tag" style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 15%, transparent)` }}>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {totalFindingsCount > 0 && (
            <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
              <div className="panel-title">Tahmini Etki</div>
              <div className="panel-subtitle">{dialCaption}</div>
              <div className="panel-divider" />
              <div className="impact-list" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="impact-row-v2">
                  <span className="impact-label-v2"><span className="impact-dot" />Sağlık Skoru (tahmini üst sınır)</span>
                  <span className="impact-pill" style={{ color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 15%, transparent)" }}>{healthScore} → ~{potentialScore}</span>
                </div>
                <div className="impact-row-v2">
                  <span className="impact-label-v2"><span className="impact-dot" />Dönüşüm potansiyeli</span>
                  <span className="impact-pill" style={{ color: conversionColor, background: `color-mix(in srgb, ${conversionColor} 15%, transparent)` }}>{conversionLevel}</span>
                </div>
                <div className="impact-row-v2">
                  <span className="impact-label-v2"><span className="impact-dot" />Kullanıcı sürtünmesi</span>
                  <span className="impact-pill" style={{ color: frictionColor, background: `color-mix(in srgb, ${frictionColor} 15%, transparent)` }}>{frictionLevel}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {lensSummaryFull.length > 0 && (
          <div className="panel">
            <div className="panel-title">Mercek Bazlı Skorlar</div>
            <div className="panel-subtitle">{dialCaption}</div>
            <div className="panel-divider" />
            <div className="lens-count-row">
              {lensSummaryFull.map((l, i) => (
                <div className={`lens-count-item ${i > 0 ? "lens-count-item-divided" : ""}`} key={l.lens}>
                  <div className="lens-count-num">{l.total}</div>
                  <div className="lens-count-label">{LENS_DISPLAY_LABEL[l.lens] || l.lens}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lensScores && (
          <div className="panel">
            <div className="panel-title">Mercek Bazlı Kalite Skoru</div>
            <div className="panel-subtitle">0-100 arası, o mercekteki bulguların ne kadarının sorunsuz olduğuna dayalı</div>
            <div className="lens-score-row">
              {LENS_ORDER.map((lens) => {
                const score = lensScores[lens];
                const color =
                  score == null ? "var(--muted)" : score >= 80 ? "var(--teal)" : score >= 50 ? "var(--yellow)" : "var(--kick)";
                return (
                  <div className="lens-score-item" key={lens}>
                    <div className="lens-score-num" style={{ color }}>{score ?? "—"}</div>
                    <div className="lens-score-label">{LENS_DISPLAY_LABEL[lens] || lens}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <HistoryPanel history={history} />

        {screenshots.length > 0 && (
          <div className="panel">
            <div className="panel-title">Ekran Görüntüleri (İşaretli)</div>
            <div className="panel-subtitle">Her bulgunun ekran üzerindeki yaklaşık konumu işaretlenmiştir</div>
            <div className="shot-grid">
              {screenshots.map((url, i) => (
                <AnnotatedScreenshot key={i} url={url} index={i + 1} findings={findings} />
              ))}
            </div>
          </div>
        )}

        {lensSummary.length > 0 && (
          <div className="panel">
            <div className="panel-title">Analiz Verileri</div>
            <div className="panel-subtitle">Mercek başına bulgu dağılımının görsel dökümü</div>
            <div className="panel-divider" />
            <div className="stackbar-list">
              {lensSummary.map((l) => {
                const total = l.bad + l.warn + l.good || 1;
                return (
                  <div className="stackbar-row" key={l.lens}>
                    <div className="stackbar-header">
                      <span className="stackbar-label">{(l.lens || "").toUpperCase()}</span>
                      <span className="stackbar-counts">
                        {l.bad > 0 && <span style={{ color: "var(--kick)" }}>{l.bad} Kritik</span>}
                        {l.bad > 0 && (l.warn > 0 || l.good > 0) && " · "}
                        {l.warn > 0 && <span style={{ color: "var(--yellow)" }}>{l.warn} Dikkat</span>}
                        {l.warn > 0 && l.good > 0 && " · "}
                        {l.good > 0 && <span style={{ color: "var(--teal)" }}>{l.good} Sorunsuz</span>}
                      </span>
                    </div>
                    <div className="stackbar-track">
                      {l.bad > 0 && (
                        <div className="stackbar-seg" style={{ width: `${(l.bad / total) * 100}%`, background: "var(--kick)" }}>
                          {l.bad}
                        </div>
                      )}
                      {l.warn > 0 && (
                        <div className="stackbar-seg" style={{ width: `${(l.warn / total) * 100}%`, background: "var(--yellow)" }}>
                          {l.warn}
                        </div>
                      )}
                      {l.good > 0 && (
                        <div className="stackbar-seg" style={{ width: `${(l.good / total) * 100}%`, background: "var(--teal)" }}>
                          {l.good}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="panel">
          <div className="bulgular-header">
            <div>
              <div className="panel-title">Bulgular</div>
              <div className="panel-subtitle">{dialCaption}</div>
            </div>
            <div className="finding-filter-tabs">
              <button className={`finding-filter-tab ${findingFilter === "all" ? "finding-filter-tab-active" : ""}`} onClick={() => setFindingFilter("all")}>
                Tümü <span className="finding-filter-count">{findings.length}</span>
              </button>
              <button className={`finding-filter-tab ${findingFilter === "bad" ? "finding-filter-tab-active" : ""}`} onClick={() => setFindingFilter("bad")} style={{ color: findingFilter === "bad" ? "var(--kick)" : undefined }}>
                Kritik <span className="finding-filter-count">{badCount}</span>
              </button>
              <button className={`finding-filter-tab ${findingFilter === "warn" ? "finding-filter-tab-active" : ""}`} onClick={() => setFindingFilter("warn")} style={{ color: findingFilter === "warn" ? "var(--yellow)" : undefined }}>
                Dikkat <span className="finding-filter-count">{warnCount}</span>
              </button>
              <button className={`finding-filter-tab ${findingFilter === "good" ? "finding-filter-tab-active" : ""}`} onClick={() => setFindingFilter("good")} style={{ color: findingFilter === "good" ? "var(--teal)" : undefined }}>
                Sorunsuz <span className="finding-filter-count">{goodCount}</span>
              </button>
            </div>
          </div>
          <div className="panel-divider" style={{ marginBottom: 51 }} />
          {(() => {
            const filteredFindings = findingFilter === "all" ? findings : findings.filter((f) => f.status === findingFilter);
            if (filteredFindings.length === 0) {
              return <div className="empty-state">Bu filtreye uyan bulgu yok.</div>;
            }
            return LENS_ORDER.filter((lens) => filteredFindings.some((f) => LENS_MAP[f.key] === lens)).map((lens) => {
              const items = filteredFindings.filter((f) => LENS_MAP[f.key] === lens);
              return (
                <div key={lens} className={`lens-group ${lens === "Ürün" ? "lens-group-product" : ""}`}>
                  <div className="lens-group-title">{LENS_TITLE_LABEL[lens] || lens}</div>
                  <div className="lens-group-caption">{items.length} bulgu · {LENS_SUBTITLE[lens]}</div>
                  <div className="finding-list">
                    {items.map((f) => (
                      <FindingRow key={f.key} f={f} />
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {quickWins.length > 0 && (
          <div className="panel">
            <div className="panel-title">Hızlı Kazanımlar</div>
            <div className="panel-subtitle">Yüksek etki, düşük efor · {dialCaption}</div>
            <div className="qw-list">
              {quickWins.map((f) => (
                <div className="qw-row" key={f.key}>
                  <div className="qw-top">
                    <span className="qw-title">{f.title}</span>
                    <span className="qw-tags">
                      <span className={`qw-tag qw-impact-${f.status}`}>
                        Etki: {f.status === "bad" ? "Yüksek" : "Orta"}
                      </span>
                      <span className="qw-tag qw-effort">
                        Efor: {EFFORT_MAP[f.key] === "low" ? "Düşük" : "Orta"}
                      </span>
                    </span>
                  </div>
                  <p className="qw-suggestion">{f.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {reviewSummary && (
        <div className="panel">
          <div className="panel-title">App Store Yorum Analizi</div>
          <div className="panel-subtitle">{reviewSummary.totalReviews} yorum üzerinden çıkarılan içgörüler</div>

          <div className="review-pair-grid">
            <div className="review-meta">
              <span className="review-count">{reviewSummary.totalReviews.toLocaleString("tr-TR")}</span>
              <span className="review-rating">★ {reviewSummary.avgRating} ortalama</span>
            </div>
            <div className="panel-title">Önerilen Roadmap</div>

            {Array.from({ length: Math.max(reviewSummary.topComplaints.length, reviewSummary.roadmap.length) }).map((_, i) => (
              <React.Fragment key={i}>
                <div className="review-pair-cell">
                  {reviewSummary.topComplaints[i] && (
                    <ComplaintBar label={reviewSummary.topComplaints[i].label} pct={reviewSummary.topComplaints[i].pct} />
                  )}
                </div>
                <div className="review-pair-cell">
                  {reviewSummary.roadmap[i] && (
                    <div className="roadmap-item">
                      <span>{reviewSummary.roadmap[i]}</span>
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="review-extra">
            {reviewSummary.ratingDistribution && (
              <>
                <div className="review-subtitle">YILDIZ DAĞILIMI</div>
                {reviewSummary.ratingDistribution
                  .slice()
                  .reverse()
                  .map((r) => (
                    <RatingBar key={r.star} star={r.star} count={r.count} total={reviewSummary.totalReviews} />
                  ))}
              </>
            )}

            {reviewSummary.mostHelpfulNegative && (
              <div className="helpful-negative">
                <div className="helpful-negative-label">EN ÇOK OY ALAN OLUMSUZ YORUM</div>
                <div className="helpful-negative-stars">{"★".repeat(reviewSummary.mostHelpfulNegative.rating)}{"☆".repeat(5 - reviewSummary.mostHelpfulNegative.rating)}</div>
                <p className="helpful-negative-text">
                  {(reviewSummary.mostHelpfulNegative.content || "").slice(0, 220)}
                  {(reviewSummary.mostHelpfulNegative.content || "").length > 220 ? "…" : ""}
                </p>
              </div>
            )}

            {reviewSummary.versionTrend && reviewSummary.versionTrend.length >= 2 && (
              <div className="version-trend">
                <div className="helpful-negative-label">SÜRÜME GÖRE PUAN TRENDİ</div>
                <div className="version-trend-row">
                  {reviewSummary.versionTrend
                    .slice()
                    .reverse()
                    .map((v) => (
                      <div className="version-chip" key={v.version}>
                        <span className="version-chip-num">v{v.version}</span>
                        <span
                          className="version-chip-avg"
                          style={{ color: v.avg >= 4 ? "var(--teal)" : v.avg >= 2.5 ? "var(--yellow)" : "var(--kick)" }}
                        >
                          {v.avg.toFixed(1)}★
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {asoReview && (
          <div className="panel">
          <div className="panel-title">App Store Listeleme (ASO)</div>
          <div className="panel-subtitle">App Store başlığı, açıklaması ve mağaza görselleri üzerine öneriler</div>
          <div className="aso-meta">
              {asoReview.version && <span>Sürüm {asoReview.version}</span>}
              {asoReview.genre && <span>· {asoReview.genre}</span>}
              {typeof asoReview.screenshotCount === "number" && <span>· {asoReview.screenshotCount} mağaza görseli</span>}
              {asoReview.storeAvgRating && <span>· ★ {asoReview.storeAvgRating.toFixed?.(1) ?? asoReview.storeAvgRating}</span>}
            </div>
            <div className="aso-row">
              <div className="aso-label">Başlık</div>
              <div className="aso-text">{asoReview.titleFeedback}</div>
            </div>
            <div className="aso-row">
              <div className="aso-label">Açıklama</div>
              <div className="aso-text">{asoReview.descriptionFeedback}</div>
            </div>
            {asoReview.suggestions?.length > 0 && (
              <div className="aso-suggestions">
                {asoReview.suggestions.map((s, i) => (
                  <div className="aso-suggestion-row" key={i}>
                    <Lightbulb size={12} color="var(--yellow)" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {approvalRisks.length > 0 && (
          <div className="panel">
            <div className="panel-title">Güncelleme / İnceleme Riski</div>
            <div className="panel-subtitle">Bir sonraki mağaza denetiminde sorun çıkarabilecek sinyaller</div>
            <div className="risk-disclaimer">
              Uygulama zaten yayında — bunlar "ilk onay" riski değil, bir sonraki güncellemede veya
              rastgele bir mağaza denetiminde sorun çıkarabilecek sinyaller. Kesin bir garanti değil.
            </div>
            <div className="risk-list">
              {approvalRisks.map((r, i) => (
                <div className="risk-row" key={i} style={{ borderLeftColor: r.severity === "high" ? "var(--kick)" : "var(--yellow)" }}>
                  <AlertTriangle size={14} color={r.severity === "high" ? "var(--kick)" : "var(--yellow)"} />
                  <div>
                    <div className="risk-issue">{r.issue}</div>
                    <div className="risk-guideline">{r.guideline}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {storeUrl && <SubscribeForm appName={appLabel} storeUrl={storeUrl} />}

        <div className="soon-row">
          <span className="soon-label">Yakında</span>
          {COMING_SOON.map((s, i) => (
            <span key={s.title} className="soon-item">
              <Lock size={11} color="var(--muted)" />
              {s.title}
              {i < COMING_SOON.length - 1 && <span className="soon-dot">·</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
