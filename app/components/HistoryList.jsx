"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitCompare, Loader2, Eye } from "lucide-react";

const STATUS_COLOR = (score) => {
  if (score >= 75) return "var(--teal)";
  if (score >= 50) return "var(--yellow)";
  return "var(--kick)";
};

export default function HistoryList({ onBack, onCompare, preselectId, appNameFilter }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(preselectId ? [Number(preselectId)] : []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/history?all=true");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Geçmiş alınamadı.");
        const all = data.scans || [];
        setScans(appNameFilter ? all.filter((s) => s.app_name === appNameFilter) : all);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [appNameFilter]);

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
          --font-display: var(--font-inter), sans-serif;
          --font-body: var(--font-inter), sans-serif;
          --font-mono: var(--font-inter), sans-serif;

          background: var(--ink);
          color: var(--chalk);
          font-family: var(--font-body);
          min-height: 100%;
          border-radius: 12px;
          padding: 28px 32px;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .history-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .history-title { font-family: var(--font-display); font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
        .back-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--ink-2); border: 1px solid var(--ink-3); color: var(--chalk);
          font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;
        }
        .compare-btn {
          display: flex; align-items: center; gap: 8px;
          background: var(--brand); color: var(--ink); font-weight: 700; font-size: 13.5px;
          padding: 10px 18px; border-radius: 8px; border: none; cursor: pointer;
          transition: transform 0.15s ease;
        }
        .compare-btn:not(:disabled):hover { transform: translateY(-2px); }
        .compare-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .scan-list { display: flex; flex-direction: column; gap: 8px; }
        .scan-row {
          display: flex; align-items: center; gap: 14px;
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 10px;
          padding: 12px 16px; cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-shadow: var(--shadow);
        }
        .scan-row-selected { border-color: var(--brand); }
        .scan-checkbox {
          width: 18px; height: 18px; border-radius: 5px; border: 2px solid var(--muted);
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        }
        .scan-checkbox-on { background: var(--brand); border-color: var(--brand); }
        .scan-score {
          font-family: var(--font-mono); font-weight: 700; font-size: 16px; width: 36px; text-align: center;
        }
        .scan-info { flex: 1; min-width: 0; }
        .scan-name { font-size: 13.5px; font-weight: 600; }
        .scan-date { font-size: 11.5px; color: var(--muted); font-family: var(--font-mono); }
        .scan-counts { font-size: 11.5px; color: var(--muted); font-family: var(--font-mono); }
        .scan-view-btn {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 50%;
          background: var(--ink); border: 1px solid var(--ink-3);
          flex-shrink: 0; margin-left: 8px;
        }
        .scan-view-btn:hover { border-color: var(--kick); }

        .empty-state { color: var(--muted); font-size: 14px; text-align: center; padding: 40px 0; }
        .hint { font-size: 12px; color: var(--muted); margin-bottom: 14px; }
        .spin { animation: hist-spin 0.9s linear infinite; }
        @keyframes hist-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .sticky-compare-bar {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
          background: var(--ink-2); border-top: 1px solid var(--ink-3);
          padding: 16px 24px;
        }
        .sticky-compare-inner {
          max-width: 720px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .sticky-compare-hint { font-size: 13px; color: var(--muted); }
        @media (max-width: 560px) {
          .sticky-compare-inner { flex-direction: column; align-items: stretch; gap: 10px; }
          .sticky-compare-hint { text-align: center; }
        }
      `}</style>

      <div className="history-header">
        <div className="history-title">{appNameFilter ? `${appNameFilter} — Geçmiş` : "Geçmiş Analizlerim"}</div>
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={15} />
          Geri
        </button>
      </div>

      <div className="hint">
        {preselectId
          ? "Mevcut taraman seçili — şimdi karşılaştırmak istediğin ikinci taramayı (örn. rakibinin) seç."
          : "Karşılaştırmak için en fazla 2 tarama seç."}
      </div>

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
          <div className="scan-list" style={{ paddingBottom: 90 }}>
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
                  <Link
                    href={`/history/${s.id}`}
                    className="scan-view-btn"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Detayı gör"
                  >
                    <Eye size={16} color="var(--muted)" strokeWidth={2} />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="sticky-compare-bar">
            <div className="sticky-compare-inner">
              <span className="sticky-compare-hint">
                {selected.length === 2 ? "2 tarama seçildi" : `${selected.length}/2 tarama seçildi`}
              </span>
              <button
                className="compare-btn"
                disabled={selected.length !== 2}
                onClick={() => onCompare(selected)}
              >
                <GitCompare size={16} />
                Karşılaştır
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
