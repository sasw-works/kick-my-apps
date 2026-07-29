"use client";

import React from "react";
import Link from "next/link";
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
  Lock,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
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
// Health Dial — same signature gauge, now reads as overall AI Health Score
// ---------------------------------------------------------------------------

function HealthDial({ score = 58, size = 220 }) {
  const angle = -90 + (score / 100) * 180;
  const rad = (deg) => (deg * Math.PI) / 180;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const r = size / 2 - 18;
  const zoneColor = score >= 75 ? "var(--teal)" : score >= 50 ? "var(--yellow)" : "var(--kick)";
  const needleLen = r - 14;
  const nx = cx + needleLen * Math.cos(rad(angle));
  const ny = cy + needleLen * Math.sin(rad(angle));

  const arc = (startDeg, endDeg, color, width = 14) => {
    const s = rad(startDeg);
    const e = rad(endDeg);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return (
      <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} stroke={color} strokeWidth={width} fill="none" strokeLinecap="butt" />
    );
  };

  return (
    <svg width={size} height={size / 2 + 46} viewBox={`0 0 ${size} ${size / 2 + 46}`}>
      {arc(-90, -20, "var(--kick)")}
      {arc(-20, 15, "var(--yellow)")}
      {arc(15, 90, "var(--teal)")}
      <circle cx={cx} cy={cy} r={5} fill="var(--chalk)" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--chalk)" strokeWidth={3} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${zoneColor})` }} />
      <text x={cx} y={cy - 26} textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: 44, fill: "var(--chalk)" }}>{score}</text>
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.14em", fill: "var(--muted)" }}>APP HEALTH SCORE</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// UI pieces
// ---------------------------------------------------------------------------

function FindingCard({ f }) {
  const meta = STATUS_META[f.status];
  const StatusIcon = meta.Icon;
  const Icon = f.icon;
  return (
    <div className="finding-card">
      <div className="finding-top">
        <div className="finding-title-group">
          <Icon size={16} strokeWidth={2.2} color="var(--muted)" />
          <span className="finding-title">{f.title}</span>
        </div>
        <span className="finding-status" style={{ color: meta.color }}>
          <StatusIcon size={14} strokeWidth={2.2} />
          {meta.label}
        </span>
      </div>
      <p className="finding-text">{f.finding}</p>
      {f.status !== "good" && (
        <div className="finding-suggestion">
          <Lightbulb size={13} strokeWidth={2.2} color="var(--yellow)" />
          <span>{f.suggestion}</span>
        </div>
      )}
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

const ICON_MAP = {
  onboarding: Layers,
  cta: MousePointerClick,
  contrast: Palette,
  typography: Type,
  accessibility: Accessibility,
  permissions: ShieldAlert,
  conversion: TrendingDown,
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function KickMyAppsHealthReport({ data, appLabel = "Uygulaman", onReset }) {
  const usingRealData = Boolean(data);

  const healthScore = usingRealData ? data.healthScore : HEALTH_SCORE;
  const findings = usingRealData
    ? (data.findings || []).map((f) => ({ ...f, icon: ICON_MAP[f.key] || Sparkles }))
    : FINDINGS;
  const reviewSummary = usingRealData ? data.reviewSummary : REVIEW_STATS;

  const badCount = findings.filter((f) => f.status === "bad").length;
  const warnCount = findings.filter((f) => f.status === "warn").length;
  const goodCount = findings.filter((f) => f.status === "good").length;

  return (
    <div className="kma-root">
      <style>{`
        .kma-root {
          --ink: #14151a;
          --ink-2: #1c1e26;
          --ink-3: #24262f;
          --chalk: #f5f3ee;
          --muted: #8a8f9c;
          --kick: #ff4a32;
          --yellow: #ffc93c;
          --teal: #2dd4bf;
          --font-display: 'Anton', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;

          background: var(--ink);
          color: var(--chalk);
          font-family: var(--font-body);
          min-height: 100%;
          border-radius: 12px;
          overflow: hidden;
        }
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .kma-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px;
          border-bottom: 1px solid var(--ink-3);
        }
        .kma-logo { font-family: var(--font-display); font-size: 22px; display: flex; align-items: baseline; gap: 8px; }
        .kma-logo span.dot { color: var(--kick); }
        .app-picker {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--font-mono); font-size: 13px; color: var(--muted);
          background: var(--ink-2); border: 1px solid var(--ink-3);
          padding: 7px 12px; border-radius: 8px;
        }

        .kma-main { padding: 24px 28px 32px; display: flex; flex-direction: column; gap: 22px; }

        .upload-panel {
          background: var(--ink-2);
          border: 1px dashed var(--ink-3);
          border-radius: 12px;
          padding: 20px 22px;
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 16px;
          align-items: center;
        }
        .upload-slot {
          display: flex; align-items: center; gap: 10px;
          background: var(--ink-3); border-radius: 8px; padding: 12px 14px;
          font-size: 13px; color: var(--muted);
        }
        .upload-slot strong { color: var(--chalk); font-weight: 600; }
        .analyze-btn {
          display: flex; align-items: center; gap: 8px;
          background: var(--kick); color: var(--ink); font-weight: 700; font-size: 13.5px;
          padding: 12px 20px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap;
        }

        .panel { background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 12px; padding: 18px 20px; }
        .panel-title { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; color: var(--muted); margin-bottom: 12px; }

        .top-grid { display: grid; grid-template-columns: 260px 1fr; gap: 18px; }
        .dial-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .dial-caption { font-size: 12px; color: var(--muted); text-align: center; margin-top: 4px; }

        .summary-list { display: flex; flex-direction: column; gap: 8px; justify-content: center; height: 100%; }
        .summary-row { display: flex; align-items: center; gap: 10px; font-size: 13.5px; }
        .summary-count { font-family: var(--font-mono); font-weight: 700; width: 20px; }

        .finding-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .finding-card { background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
        .finding-top { display: flex; align-items: center; justify-content: space-between; }
        .finding-title-group { display: flex; align-items: center; gap: 8px; }
        .finding-title { font-size: 13.5px; font-weight: 600; }
        .finding-status { display: flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.04em; }
        .finding-text { font-size: 13px; color: var(--muted); line-height: 1.45; margin: 0; }
        .finding-suggestion {
          display: flex; align-items: flex-start; gap: 8px;
          background: var(--ink-3); border-radius: 6px; padding: 9px 10px;
          font-size: 12.5px; color: var(--muted); line-height: 1.4;
        }
        .finding-suggestion span { flex: 1; }

        .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        .review-meta { display: flex; align-items: baseline; gap: 14px; margin-bottom: 14px; }
        .review-count { font-family: var(--font-display); font-size: 28px; }
        .review-rating { font-family: var(--font-mono); color: var(--yellow); font-size: 13px; }
        .complaint-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .complaint-label { font-size: 12.5px; width: 150px; color: var(--chalk); flex-shrink: 0; }
        .complaint-track { flex: 1; height: 6px; background: var(--ink-3); border-radius: 3px; overflow: hidden; }
        .complaint-fill { height: 100%; background: var(--kick); border-radius: 3px; }
        .complaint-pct { font-family: var(--font-mono); font-size: 12px; color: var(--muted); width: 34px; text-align: right; }

        .roadmap-list { display: flex; flex-direction: column; gap: 10px; }
        .roadmap-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; }
        .roadmap-num {
          font-family: var(--font-mono); font-size: 11px; color: var(--ink);
          background: var(--teal); width: 18px; height: 18px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
        }

        .soon-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .soon-card {
          border: 1px solid var(--ink-3); border-radius: 12px; padding: 16px 18px;
          display: flex; align-items: center; gap: 12px; opacity: 0.65;
        }
        .soon-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--ink-3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .soon-title { font-size: 13.5px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .soon-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .soon-badge { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; color: var(--muted); border: 1px solid var(--ink-3); padding: 2px 6px; border-radius: 4px; }
      `}</style>

      <div className="kma-header">
        <div className="kma-logo">KICK MY APPS<span className="dot">.</span></div>
        <div className="app-picker">
          {appLabel}
          <ChevronDown size={14} />
        </div>
      </div>

      <div className="kma-main">
        <div className="upload-panel">
          <div className="upload-slot">
            <UploadCloud size={18} color="var(--yellow)" />
            <span>Analiz {usingRealData ? "tamamlandı" : "örnek veriyle gösteriliyor"}</span>
          </div>
          <div className="upload-slot">
            <Link2 size={18} color="var(--yellow)" />
            <span>{reviewSummary ? `${reviewSummary.totalReviews} yorum incelendi` : "Yorum verisi yok"}</span>
          </div>
          <button className="analyze-btn" onClick={onReset}>
            <Sparkles size={16} strokeWidth={2.3} />
            {onReset ? (
              "Yeni Analiz"
            ) : (
              <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
                Yeni Analiz
              </Link>
            )}
          </button>
        </div>

        <div className="top-grid">
          <div className="panel dial-panel">
            <HealthDial score={healthScore} />
            <div className="dial-caption">
              {findings.length} bulgudan {badCount} kritik, {warnCount} dikkat gerektiriyor
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">ÖZET</div>
            <div className="summary-list">
              <div className="summary-row"><span className="summary-count" style={{ color: "var(--kick)" }}>{badCount}</span> Kritik seviyede sorun</div>
              <div className="summary-row"><span className="summary-count" style={{ color: "var(--yellow)" }}>{warnCount}</span> Dikkat gerektiren bulgu</div>
              <div className="summary-row"><span className="summary-count" style={{ color: "var(--teal)" }}>{goodCount}</span> Sorunsuz alan</div>
              {reviewSummary && (
                <div className="summary-row"><span className="summary-count" style={{ color: "var(--chalk)" }}>{reviewSummary.totalReviews}</span> App Store yorumu ayrıca analiz edildi</div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="panel-title" style={{ marginBottom: 14 }}>BULGULAR</div>
          <div className="finding-grid">
            {findings.map((f) => (
              <FindingCard key={f.key} f={f} />
            ))}
          </div>
        </div>

        {reviewSummary && (
        <div className="panel">
          <div className="panel-title">APP STORE YORUM ANALİZİ</div>
          <div className="review-grid">
            <div>
              <div className="review-meta">
                <span className="review-count">{reviewSummary.totalReviews.toLocaleString("tr-TR")}</span>
                <span className="review-rating">★ {reviewSummary.avgRating} ortalama</span>
              </div>
              {reviewSummary.topComplaints.map((c) => (
                <ComplaintBar key={c.label} label={c.label} pct={c.pct} />
              ))}
            </div>
            <div>
              <div className="panel-title" style={{ marginBottom: 10 }}>
                <MessageSquare size={12} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                ÖNERİLEN ROADMAP
              </div>
              <div className="roadmap-list">
                {reviewSummary.roadmap.map((item, i) => (
                  <div className="roadmap-item" key={i}>
                    <span className="roadmap-num">{i + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        <div>
          <div className="panel-title" style={{ marginBottom: 14 }}>YAKINDA</div>
          <div className="soon-strip">
            {COMING_SOON.map((s) => (
              <div className="soon-card" key={s.title}>
                <div className="soon-icon"><Lock size={15} color="var(--muted)" /></div>
                <div>
                  <div className="soon-title">{s.title} <ArrowUpRight size={13} color="var(--muted)" /></div>
                  <div className="soon-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
