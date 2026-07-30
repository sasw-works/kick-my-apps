"use client";

import React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Minus,
  Trophy,
  Layers,
  MousePointerClick,
  Palette,
  Type,
  Accessibility,
  ShieldAlert,
  TrendingDown,
  Compass,
  Inbox,
  LayoutGrid,
  Loader2,
  AlignLeft,
  BadgeCheck,
  Sparkles,
  Lightbulb,
} from "lucide-react";

const STATUS_META = {
  good: { color: "var(--teal)", Icon: CheckCircle2, label: "Sorunsuz", rank: 0 },
  warn: { color: "var(--yellow)", Icon: AlertTriangle, label: "Dikkat", rank: 1 },
  bad: { color: "var(--kick)", Icon: XCircle, label: "Kritik", rank: 2 },
};

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

const LENS_MAP = {
  cta: "UI", contrast: "UI", typography: "UI", consistency: "UI",
  onboarding: "UX", navigation: "UX", empty_states: "UX", loading: "UX", copy: "UX",
  accessibility: "Erişilebilirlik",
  permissions: "Ürün", conversion: "Ürün", trust: "Ürün",
};
const LENS_ORDER = ["UI", "UX", "Erişilebilirlik", "Ürün"];

const SCORE_COLOR = (score) => (score >= 75 ? "var(--teal)" : score >= 50 ? "var(--yellow)" : "var(--kick)");

function findingsByKey(scan) {
  const map = {};
  const findings = scan?.result_json?.findings || [];
  for (const f of findings) map[f.key] = f;
  return map;
}

function lensSummaryFor(findings) {
  return LENS_ORDER.map((lens) => {
    const items = findings.filter((f) => LENS_MAP[f.key] === lens);
    if (items.length === 0) return { lens, total: 0 };
    const badCount = items.filter((f) => f.status === "bad").length;
    const warnCount = items.filter((f) => f.status === "warn").length;
    // Basit bir "mercek skoru": good=2, warn=1, bad=0 puan, ortalaması alınır.
    const points = items.reduce((sum, f) => sum + (f.status === "good" ? 2 : f.status === "warn" ? 1 : 0), 0);
    const avg = points / (items.length * 2);
    return { lens, total: items.length, badCount, warnCount, avg };
  });
}

function buildVerdict(a, b, lensA, lensB) {
  const delta = b.health_score - a.health_score;
  const stronger = delta === 0 ? null : delta > 0 ? b : a;
  const weaker = delta === 0 ? null : delta > 0 ? a : b;

  let text = "";
  if (!stronger) {
    text = `${a.app_name} ve ${b.app_name} genel skor olarak eşit (${a.health_score}).`;
  } else {
    text = `${stronger.app_name}, genel skorda ${weaker.app_name}'e göre ${Math.abs(delta)} puan önde (${stronger.health_score} / ${weaker.health_score}).`;
  }

  // Hangi mercekte kim daha iyi
  const lensNotes = [];
  LENS_ORDER.forEach((lens, i) => {
    const la = lensA[i];
    const lb = lensB[i];
    if (!la?.total || !lb?.total) return;
    if (la.avg > lb.avg + 0.15) lensNotes.push(`${a.app_name}, ${lens} konusunda daha güçlü`);
    else if (lb.avg > la.avg + 0.15) lensNotes.push(`${b.app_name}, ${lens} konusunda daha güçlü`);
  });

  return { text, lensNotes };
}

function FindingCompareBlock({ f, appName }) {
  if (!f) {
    return (
      <div className="fc-missing">
        <Minus size={14} /> Veri yok
      </div>
    );
  }
  const meta = STATUS_META[f.status];
  const Icon = meta.Icon;
  return (
    <div className="fc-block" style={{ borderLeftColor: meta.color }}>
      <div className="fc-status" style={{ color: meta.color }}>
        <Icon size={13} />
        {meta.label}
      </div>
      <p className="fc-text">{f.finding}</p>
      {f.status !== "good" && (
        <div className="fc-suggestion">
          <Lightbulb size={11} color="var(--yellow)" />
          <span>{f.suggestion}</span>
        </div>
      )}
    </div>
  );
}

export default function CompareView({ scans, onBack }) {
  const [a, b] = scans;
  const findingsAMap = findingsByKey(a);
  const findingsBMap = findingsByKey(b);
  const findingsAList = a?.result_json?.findings || [];
  const findingsBList = b?.result_json?.findings || [];
  const allKeys = Array.from(new Set([...Object.keys(findingsAMap), ...Object.keys(findingsBMap)]));

  const delta = (b?.health_score ?? 0) - (a?.health_score ?? 0);

  const lensA = lensSummaryFor(findingsAList);
  const lensB = lensSummaryFor(findingsBList);
  const verdict = buildVerdict(a, b, lensA, lensB);

  const reviewA = a?.result_json?.reviewSummary;
  const reviewB = b?.result_json?.reviewSummary;

  return (
    <div className="cmp-root">
      <style>{`
        .cmp-root {
          --font-display: 'Inter', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'Inter', sans-serif;

          background: var(--ink);
          color: var(--chalk);
          font-family: var(--font-body);
          min-height: 100%;
          border-radius: 12px;
          padding: 28px 32px;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .cmp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .cmp-title { font-family: var(--font-display); font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
        .back-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--ink-2); border: 1px solid var(--ink-3); color: var(--chalk);
          font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;
        }

        .cmp-score-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 18px; align-items: center; margin-bottom: 18px; }
        .cmp-score-card { background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 14px; padding: 20px; text-align: center; }
        .cmp-score-name { font-size: 13px; color: var(--muted); margin-bottom: 4px; }
        .cmp-score-date { font-size: 11px; color: var(--muted); font-family: var(--font-mono); margin-bottom: 10px; }
        .cmp-score-value { font-family: var(--font-display); font-size: 44px; font-weight: 500; letter-spacing: -0.02em; }
        .cmp-delta { text-align: center; font-family: var(--font-mono); }
        .cmp-delta-value { font-size: 20px; font-weight: 700; }
        .cmp-delta-label { font-size: 10.5px; color: var(--muted); letter-spacing: 0.08em; }

        .verdict-panel {
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 12px;
          padding: 16px 18px; margin-bottom: 26px; display: flex; gap: 12px;
        }
        .verdict-icon { flex-shrink: 0; }
        .verdict-text { font-size: 13.5px; line-height: 1.6; }
        .verdict-notes { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
        .verdict-note { font-size: 12.5px; color: var(--muted); }

        .cmp-section-title {
          font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em;
          color: var(--muted); margin: 26px 0 12px;
        }

        .lens-cmp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .lens-cmp-card { background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 10px; padding: 14px 16px; }
        .lens-cmp-name { font-size: 12.5px; font-weight: 700; margin-bottom: 10px; }
        .lens-cmp-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .lens-cmp-label { font-size: 11px; color: var(--muted); width: 70px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lens-cmp-bar { flex: 1; height: 6px; border-radius: 3px; background: var(--ink-3); overflow: hidden; }
        .lens-cmp-fill { height: 100%; }

        .fc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .fc-cat-header { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; margin-bottom: 8px; grid-column: 1 / -1; }
        .fc-block {
          background: var(--ink-2); border: 1px solid var(--ink-3); border-left: 3px solid var(--ink-3);
          border-radius: 8px; padding: 12px 14px;
        }
        .fc-status { display: flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: 11px; margin-bottom: 6px; }
        .fc-text { font-size: 12.5px; color: var(--chalk); line-height: 1.5; margin: 0; }
        .fc-suggestion { display: flex; gap: 6px; margin-top: 8px; background: var(--ink-3); border-radius: 6px; padding: 7px 9px; font-size: 11.5px; color: var(--muted); }
        .fc-missing {
          display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12.5px;
          background: var(--ink-2); border: 1px dashed var(--ink-3); border-radius: 8px; padding: 12px 14px;
        }

        .review-cmp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .review-cmp-card { background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 10px; padding: 16px 18px; }
        .review-cmp-app { font-size: 13px; font-weight: 700; margin-bottom: 10px; }
        .review-cmp-stat { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
        .review-cmp-num { font-family: var(--font-display); font-size: 26px; font-weight: 700; }
        .review-cmp-complaint { display: flex; align-items: center; gap: 8px; font-size: 11.5px; margin-bottom: 6px; }
        .review-cmp-complaint-label { flex: 1; color: var(--muted); }
      `}</style>

      <div className="cmp-header">
        <div className="cmp-title">Karşılaştırma</div>
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={15} />
          Geri
        </button>
      </div>

      <div className="cmp-score-grid">
        <div className="cmp-score-card">
          <div className="cmp-score-name">{a.app_name}</div>
          <div className="cmp-score-date">{new Date(a.created_at).toLocaleDateString("tr-TR")}</div>
          <div className="cmp-score-value" style={{ color: SCORE_COLOR(a.health_score) }}>
            {a.health_score}
          </div>
        </div>

        <div className="cmp-delta">
          <div className="cmp-delta-value" style={{ color: delta >= 0 ? "var(--teal)" : "var(--kick)" }}>
            {delta >= 0 ? "+" : ""}
            {delta}
          </div>
          <div className="cmp-delta-label">FARK</div>
        </div>

        <div className="cmp-score-card">
          <div className="cmp-score-name">{b.app_name}</div>
          <div className="cmp-score-date">{new Date(b.created_at).toLocaleDateString("tr-TR")}</div>
          <div className="cmp-score-value" style={{ color: SCORE_COLOR(b.health_score) }}>
            {b.health_score}
          </div>
        </div>
      </div>

      <div className="verdict-panel">
        <Trophy size={20} color="var(--yellow)" className="verdict-icon" />
        <div>
          <div className="verdict-text">{verdict.text}</div>
          {verdict.lensNotes.length > 0 && (
            <div className="verdict-notes">
              {verdict.lensNotes.map((n, i) => (
                <div className="verdict-note" key={i}>• {n}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mercek karşılaştırması */}
      <div className="cmp-section-title">MERCEK KARŞILAŞTIRMASI</div>
      <div className="lens-cmp-grid">
        {LENS_ORDER.map((lens, i) => {
          const la = lensA[i];
          const lb = lensB[i];
          if (!la?.total && !lb?.total) return null;
          return (
            <div className="lens-cmp-card" key={lens}>
              <div className="lens-cmp-name">{lens}</div>
              <div className="lens-cmp-row">
                <span className="lens-cmp-label">{a.app_name}</span>
                <div className="lens-cmp-bar">
                  {la?.total ? <div className="lens-cmp-fill" style={{ width: `${la.avg * 100}%`, background: SCORE_COLOR(la.avg * 100) }} /> : null}
                </div>
              </div>
              <div className="lens-cmp-row">
                <span className="lens-cmp-label">{b.app_name}</span>
                <div className="lens-cmp-bar">
                  {lb?.total ? <div className="lens-cmp-fill" style={{ width: `${lb.avg * 100}%`, background: SCORE_COLOR(lb.avg * 100) }} /> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detaylı bulgu karşılaştırması */}
      {allKeys.length > 0 && (
        <>
          <div className="cmp-section-title">BULGU BAZINDA DETAYLI KARŞILAŞTIRMA</div>
          {allKeys.map((key) => {
            const fa = findingsAMap[key];
            const fb = findingsBMap[key];
            const Icon = ICON_MAP[key] || Sparkles;
            const title = fa?.title || fb?.title || key;
            return (
              <div key={key} style={{ marginBottom: 18 }}>
                <div className="fc-cat-header">
                  <Icon size={15} color="var(--muted)" />
                  {title}
                </div>
                <div className="fc-grid">
                  <FindingCompareBlock f={fa} appName={a.app_name} />
                  <FindingCompareBlock f={fb} appName={b.app_name} />
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Yorum analizi karşılaştırması */}
      {(reviewA || reviewB) && (
        <>
          <div className="cmp-section-title">APP STORE YORUM KARŞILAŞTIRMASI</div>
          <div className="review-cmp-grid">
            {[{ scan: a, review: reviewA }, { scan: b, review: reviewB }].map(({ scan, review }, i) => (
              <div className="review-cmp-card" key={i}>
                <div className="review-cmp-app">{scan.app_name}</div>
                {review ? (
                  <>
                    <div className="review-cmp-stat">
                      <span className="review-cmp-num">★ {review.avgRating}</span>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{review.totalReviews} yorum</span>
                    </div>
                    {(review.topComplaints || []).slice(0, 4).map((c) => (
                      <div className="review-cmp-complaint" key={c.label}>
                        <span className="review-cmp-complaint-label">{c.label}</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>%{c.pct}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Yorum verisi yok</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
