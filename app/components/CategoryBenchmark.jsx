"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// "How you compare": rating and rating count versus the top free apps of the same App Store category.
export default function CategoryBenchmark({ monitorId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/pulse/monitors/${monitorId}/benchmark`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!ok || d.error) throw new Error(d.error || "Could not compare."); setData(d); })
      .catch((e) => setError(e.message));
  }, [monitorId]);

  if (data && data.supported === false) return null;
  return (
    <div className="pmd-panel" data-testid="category-benchmark">
      <div className="pmd-panel-title">How you compare{data?.category ? ` · ${data.category}` : ""}</div>
      {error ? (
        <div className="pmd-empty" role="alert">{error}</div>
      ) : !data ? (
        <div className="pmd-empty"><Loader2 size={16} className="cb-spin" /></div>
      ) : (
        <>
          <div className="cb-sub">Against the {data.peerCount} top free apps in this category in the same store country, read from Apple just now. It says where you stand among those, not among all apps.</div>
          <div className="cb-grid">
            <div className="cb-box" data-testid="cb-rating">
              <div className="cb-lab">Average rating</div>
              <div className="cb-big">{data.rating.value !== null ? `${data.rating.value.toFixed(1)}★` : "—"}</div>
              <div className="cb-mut">median {data.rating.median !== null ? `${data.rating.median.toFixed(2)}★` : "—"}{data.rank ? ` · rank ${data.rank} of ${data.ratedPeers + 1}` : ""}</div>
              {data.rating.percentile !== null && <div className="cb-pct">better than {data.rating.percentile}% of them</div>}
            </div>
            <div className="cb-box" data-testid="cb-count">
              <div className="cb-lab">Number of ratings</div>
              <div className="cb-big">{data.count.value.toLocaleString("en-US")}</div>
              <div className="cb-mut">median {data.count.median.toLocaleString("en-US")}</div>
              {data.count.percentile !== null && <div className="cb-pct">more than {data.count.percentile}% of them</div>}
            </div>
          </div>
          {data.notes.map((n) => <div className="cb-note" key={n}>{n}</div>)}
          {data.best.length > 0 && <div className="cb-note">Best rated here: {data.best.map((b) => `${b.name} ${b.rating.toFixed(1)}★`).join(" · ")}</div>}
        </>
      )}
      <style>{`
        .cb-sub { font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 14px; }
        .cb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .cb-box { border: 1px solid var(--ink-3); border-radius: 12px; padding: 12px 14px; }
        .cb-lab { font-size: 12px; color: var(--muted); }
        .cb-big { font-size: 26px; color: var(--chalk); font-family: var(--font-mono); margin: 2px 0; }
        .cb-mut { font-size: 12.5px; color: var(--muted); }
        .cb-pct { font-size: 13px; color: var(--teal); font-weight: 600; margin-top: 4px; }
        .cb-note { font-size: 13px; color: var(--chalk); margin-top: 12px; line-height: 1.5; }
        .cb-spin { animation: cb-rot 1s linear infinite; } @keyframes cb-rot { to { transform: rotate(360deg); } }
        @media (max-width: 600px) { .cb-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
