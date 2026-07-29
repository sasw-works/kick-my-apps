"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, GitCompare, Loader2 } from "lucide-react";

const STATUS_COLOR = (score) => {
  if (score >= 75) return "var(--teal)";
  if (score >= 50) return "var(--yellow)";
  return "var(--kick)";
};

export default function HistoryList({ onBack, onCompare }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/history?all=true");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Geçmiş alınamadı.");
        setScans(data.scans || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // en fazla 2 seçim, en eskisini düş
      return [...prev, id];
    });
  };

  return (
    <div className="history-root">
      <style>{`
        .history-root {
          --ink: #F6F8FA;
          --ink-2: #FFFFFF;
          --ink-3: #E3E8EF;
          --chalk: #1A1F36;
          --muted: #697386;
          --kick: #F5433A;
          --yellow: #F5A623;
          --teal: #0EA5A0;
          --shadow: 0 1px 2px rgba(26,31,54,0.04), 0 8px 24px rgba(26,31,54,0.06);
          --font-display: 'Anton', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;

          background: var(--ink);
          color: var(--chalk);
          font-family: var(--font-body);
          min-height: 100%;
          border-radius: 12px;
          padding: 28px 32px;
        }
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .history-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .history-title { font-family: var(--font-display); font-size: 22px; }
        .back-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--ink-2); border: 1px solid var(--ink-3); color: var(--chalk);
          font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;
        }
        .compare-btn {
          display: flex; align-items: center; gap: 8px;
          background: var(--kick); color: var(--ink); font-weight: 700; font-size: 13.5px;
          padding: 10px 18px; border-radius: 8px; border: none; cursor: pointer;
        }
        .compare-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .scan-list { display: flex; flex-direction: column; gap: 8px; }
        .scan-row {
          display: flex; align-items: center; gap: 14px;
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 10px;
          padding: 12px 16px; cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-shadow: var(--shadow);
        }
        .scan-row-selected { border-color: var(--kick); }
        .scan-checkbox {
          width: 18px; height: 18px; border-radius: 5px; border: 2px solid var(--muted);
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        }
        .scan-checkbox-on { background: var(--kick); border-color: var(--kick); }
        .scan-score {
          font-family: var(--font-mono); font-weight: 700; font-size: 16px; width: 36px; text-align: center;
        }
        .scan-info { flex: 1; min-width: 0; }
        .scan-name { font-size: 13.5px; font-weight: 600; }
        .scan-date { font-size: 11.5px; color: var(--muted); font-family: var(--font-mono); }
        .scan-counts { font-size: 11.5px; color: var(--muted); font-family: var(--font-mono); }

        .empty-state { color: var(--muted); font-size: 14px; text-align: center; padding: 40px 0; }
        .hint { font-size: 12px; color: var(--muted); margin-bottom: 14px; }
        .spin { animation: hist-spin 0.9s linear infinite; }
        @keyframes hist-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="history-header">
        <div className="history-title">Geçmiş Analizlerim</div>
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={15} />
          Geri
        </button>
      </div>

      <div className="hint">Karşılaştırmak için en fazla 2 tarama seç.</div>

      {loading ? (
        <div className="empty-state">
          <Loader2 size={20} className="spin" style={{ margin: "0 auto 8px" }} />
          Yükleniyor…
        </div>
      ) : error ? (
        <div className="empty-state" style={{ color: "var(--kick)" }}>{error}</div>
      ) : scans.length === 0 ? (
        <div className="empty-state">Henüz hiç analiz yapılmamış.</div>
      ) : (
        <>
          <div className="scan-list">
            {scans.map((s) => {
              const isSelected = selected.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={`scan-row ${isSelected ? "scan-row-selected" : ""}`}
                  onClick={() => toggleSelect(s.id)}
                >
                  <div className={`scan-checkbox ${isSelected ? "scan-checkbox-on" : ""}`} />
                  <div className="scan-score" style={{ color: STATUS_COLOR(s.health_score) }}>
                    {s.health_score}
                  </div>
                  <div className="scan-info">
                    <div className="scan-name">{s.app_name}</div>
                    <div className="scan-date">
                      {new Date(s.created_at).toLocaleString("tr-TR")}
                    </div>
                  </div>
                  <div className="scan-counts">
                    {s.bad_count} kritik · {s.warn_count} dikkat · {s.good_count} sorunsuz
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="compare-btn"
            style={{ marginTop: 20 }}
            disabled={selected.length !== 2}
            onClick={() => onCompare(selected)}
          >
            <GitCompare size={16} />
            Karşılaştır {selected.length === 2 ? "" : `(${selected.length}/2 seçildi)`}
          </button>
        </>
      )}
    </div>
  );
}
