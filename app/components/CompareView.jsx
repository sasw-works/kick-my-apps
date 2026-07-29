"use client";

import React from "react";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Minus } from "lucide-react";

const STATUS_META = {
  good: { color: "var(--teal)", Icon: CheckCircle2, label: "Sorunsuz" },
  warn: { color: "var(--yellow)", Icon: AlertTriangle, label: "Dikkat" },
  bad: { color: "var(--kick)", Icon: XCircle, label: "Kritik" },
};

const SCORE_COLOR = (score) => (score >= 75 ? "var(--teal)" : score >= 50 ? "var(--yellow)" : "var(--kick)");

function findingsByKey(scan) {
  const map = {};
  const findings = scan?.result_json?.findings || [];
  for (const f of findings) map[f.key] = f;
  return map;
}

export default function CompareView({ scans, onBack }) {
  const [a, b] = scans;
  const findingsA = findingsByKey(a);
  const findingsB = findingsByKey(b);
  const allKeys = Array.from(new Set([...Object.keys(findingsA), ...Object.keys(findingsB)]));

  const delta = (b?.health_score ?? 0) - (a?.health_score ?? 0);

  return (
    <div className="cmp-root">
      <style>{`
        .cmp-root {
          --ink: #F6F8FA;
          --ink-2: #FFFFFF;
          --ink-3: #E3E8EF;
          --chalk: #1A1F36;
          --muted: #697386;
          --kick: #F5433A;
          --yellow: #F5A623;
          --teal: #0EA5A0;
          --shadow: 0 1px 2px rgba(26,31,54,0.04), 0 8px 24px rgba(26,31,54,0.06);
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

        .cmp-score-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 18px; align-items: center; margin-bottom: 26px; }
        .cmp-score-card { background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 14px; padding: 20px; text-align: center; box-shadow: var(--shadow); }
        .cmp-score-name { font-size: 13px; color: var(--muted); margin-bottom: 4px; }
        .cmp-score-date { font-size: 11px; color: var(--muted); font-family: var(--font-mono); margin-bottom: 10px; }
        .cmp-score-value { font-family: var(--font-display); font-size: 44px; font-weight: 500; letter-spacing: -0.02em; }
        .cmp-delta { text-align: center; font-family: var(--font-mono); }
        .cmp-delta-value { font-size: 20px; font-weight: 700; }
        .cmp-delta-label { font-size: 10.5px; color: var(--muted); letter-spacing: 0.08em; }

        .cmp-table { width: 100%; border-collapse: collapse; }
        .cmp-table th {
          text-align: left; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em;
          color: var(--muted); padding: 8px 10px; border-bottom: 1px solid var(--ink-3);
        }
        .cmp-table td { padding: 10px; border-bottom: 1px solid var(--ink-3); font-size: 13px; vertical-align: middle; }
        .cmp-cat-name { font-weight: 600; }
        .status-cell { display: flex; align-items: center; gap: 6px; }
        .missing-cell { color: var(--muted); display: flex; align-items: center; gap: 4px; }
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

      {allKeys.length > 0 ? (
        <table className="cmp-table">
          <thead>
            <tr>
              <th>KATEGORİ</th>
              <th>{a.app_name}</th>
              <th>{b.app_name}</th>
            </tr>
          </thead>
          <tbody>
            {allKeys.map((key) => {
              const fa = findingsA[key];
              const fb = findingsB[key];
              return (
                <tr key={key}>
                  <td className="cmp-cat-name">{fa?.title || fb?.title || key}</td>
                  <td>
                    {fa ? (
                      <div className="status-cell" style={{ color: STATUS_META[fa.status]?.color }}>
                        {(() => {
                          const I = STATUS_META[fa.status]?.Icon;
                          return I ? <I size={14} /> : null;
                        })()}
                        {STATUS_META[fa.status]?.label}
                      </div>
                    ) : (
                      <div className="missing-cell">
                        <Minus size={14} /> veri yok
                      </div>
                    )}
                  </td>
                  <td>
                    {fb ? (
                      <div className="status-cell" style={{ color: STATUS_META[fb.status]?.color }}>
                        {(() => {
                          const I = STATUS_META[fb.status]?.Icon;
                          return I ? <I size={14} /> : null;
                        })()}
                        {STATUS_META[fb.status]?.label}
                      </div>
                    ) : (
                      <div className="missing-cell">
                        <Minus size={14} /> veri yok
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Bu taramalar için detaylı bulgu verisi kayıtlı değil (eski taramalar sadece skor içerir).
        </div>
      )}
    </div>
  );
}
