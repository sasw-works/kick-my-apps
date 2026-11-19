"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// "Who writes your reviews": the languages of the stored written reviews with their average rating.
export default function ReviewLanguages({ monitorId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/pulse/monitors/${monitorId}/languages`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!ok) throw new Error(d.error || "Could not load languages."); setData(d); })
      .catch((e) => setError(e.message));
  }, [monitorId]);

  const rows = data?.rows || [];
  return (
    <div className="pmd-panel" data-testid="review-languages">
      <div className="pmd-panel-title">Review languages</div>
      <div className="rl-sub">
        The language of the {data ? data.sample : "…"} most recent written reviews Pulse has stored, and how each group rates the app.
        A language you have no store listing for but many reviews in is a good one to translate into.
      </div>
      {error ? (
        <div className="pmd-empty" role="alert">{error}</div>
      ) : !data ? (
        <div className="pmd-empty"><Loader2 size={16} className="rl-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="pmd-empty">No written reviews to read yet.</div>
      ) : (
        <div className="rl-list">
          {rows.map((r) => (
            <div className="rl-row" key={r.code} data-testid={`lang-${r.code}`}>
              <div className="rl-name">{r.name}</div>
              <div className="rl-bar" aria-hidden><div className="rl-fill" style={{ width: `${Math.max(r.pct, 2)}%` }} /></div>
              <div className="rl-num">{r.count} <span className="rl-mut">({r.pct}%)</span></div>
              <div className="rl-num">{r.avgRating !== null ? `${r.avgRating.toFixed(1)}★` : "—"}</div>
              <div className={`rl-gap ${r.gap !== null && r.gap <= -0.5 ? "rl-neg" : r.gap !== null && r.gap >= 0.5 ? "rl-pos" : ""}`}>
                {r.gap !== null && Math.abs(r.gap) >= 0.5 ? `${r.gap > 0 ? "+" : ""}${r.gap.toFixed(1)} vs all` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.unclear > 0 && <div className="rl-note">{data.unclear} review{data.unclear === 1 ? " was" : "s were"} too short or mixed to tell. Languages with fewer than {data.minGroup} reviews aren&apos;t compared with the average.</div>}
      <style>{`
        .rl-sub { font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 14px; }
        .rl-list { display: flex; flex-direction: column; gap: 8px; }
        .rl-row { display: grid; grid-template-columns: 110px minmax(40px, 1fr) 80px 48px 90px; gap: 10px; align-items: center; font-size: 13.5px; color: var(--chalk); }
        .rl-bar { height: 6px; border-radius: 999px; background: var(--ink-3); overflow: hidden; }
        .rl-fill { height: 100%; background: var(--teal); border-radius: 999px; }
        .rl-num { font-family: var(--font-mono); text-align: right; }
        .rl-mut { color: var(--muted); font-size: 12px; }
        .rl-gap { font-size: 12px; font-family: var(--font-mono); text-align: right; color: var(--muted); }
        .rl-neg { color: var(--kick); } .rl-pos { color: var(--teal); }
        .rl-note { font-size: 12px; color: var(--muted); margin-top: 12px; }
        .rl-spin { animation: rl-rot 1s linear infinite; } @keyframes rl-rot { to { transform: rotate(360deg); } }
        @media (max-width: 600px) { .rl-row { grid-template-columns: 90px 1fr 64px 44px; } .rl-gap { display: none; } }
      `}</style>
    </div>
  );
}
