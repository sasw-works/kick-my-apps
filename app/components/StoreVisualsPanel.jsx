"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ImageIcon } from "lucide-react";

const RATING = {
  strong: { label: "Strong", color: "var(--teal)" },
  ok: { label: "Okay", color: "var(--yellow)" },
  weak: { label: "Weak", color: "var(--kick)" },
};
const ISSUE_COLOR = { none: "var(--teal)", low: "var(--muted)", medium: "var(--yellow)", high: "var(--kick)" };
const ISSUE_LABEL = { none: "Fine", low: "Minor", medium: "Worth fixing", high: "Fix first" };

function Pill({ rating }) {
  const r = RATING[rating] || RATING.ok;
  return (
    <span className="sv-pill" style={{ color: r.color, borderColor: r.color }}>
      {r.label}
    </span>
  );
}

// "Store visuals" panel: an on-demand AI review of the app's public icon and screenshots (taken from
// its store listing, not from what was uploaded). Shows the saved review if there is one.
export default function StoreVisualsPanel({ scanId }) {
  const [state, setState] = useState({ loading: true, available: false, visuals: null, error: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    fetch(`/api/history/visuals?id=${scanId}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (off) return;
        setState({ loading: false, available: ok && d.available, visuals: ok ? d.visuals : null, error: "" });
      })
      .catch(() => !off && setState({ loading: false, available: false, visuals: null, error: "" }));
    return () => {
      off = true;
    };
  }, [scanId]);

  async function run() {
    setBusy(true);
    setState((s) => ({ ...s, error: "" }));
    try {
      const res = await fetch(`/api/history/visuals?id=${scanId}`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Something went wrong.");
      setState({ loading: false, available: true, visuals: d.visuals, error: "" });
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    } finally {
      setBusy(false);
    }
  }

  if (state.loading || !state.available) return null;
  const v = state.visuals;

  return (
    <div className="panel" data-testid="store-visuals-panel">
      <div className="panel-title">Store visuals</div>
      <div className="panel-subtitle">An AI look at your public icon and store screenshots</div>
      <div className="risk-disclaimer">
        Design feedback on what is visible in your store listing, not conversion data. Only an A/B test
        (Apple Product Page Optimization, Google Store Listing Experiments) can show what actually
        persuades people to install.
      </div>

      {!v && (
        <div className="sv-empty">
          <ImageIcon size={18} color="var(--muted)" />
          <span>Review the icon and screenshots your store listing shows right now.</span>
        </div>
      )}

      {v && (
        <div className="sv-body">
          {v.icon && (
            <div className="sv-block">
              <div className="sv-head">
                Icon <Pill rating={v.icon.rating} />
              </div>
              {v.icon.notes.map((n, i) => (
                <div className="sv-note" key={i}>{n}</div>
              ))}
            </div>
          )}
          {v.firstImpression && (
            <div className="sv-block">
              <div className="sv-head">
                First impression <Pill rating={v.firstImpression.rating} />
              </div>
              <div className="sv-note">{v.firstImpression.note}</div>
            </div>
          )}
          {v.screenshots.length > 0 && (
            <div className="sv-block">
              <div className="sv-head">Screenshots ({v.screenshotCount} reviewed)</div>
              {v.screenshots.map((s) => (
                <div className="sv-shot" key={s.index}>
                  <span className="sv-num">#{s.index}</span>
                  <div>
                    <span className="sv-issue" style={{ color: ISSUE_COLOR[s.issue] }}>{ISSUE_LABEL[s.issue]}</span>
                    <div className="sv-note">{s.note}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {v.consistency && (
            <div className="sv-block">
              <div className="sv-head">Consistency &amp; story</div>
              <div className="sv-note">{v.consistency}</div>
            </div>
          )}
          {v.suggestions.length > 0 && (
            <div className="sv-block">
              <div className="sv-head">What to change</div>
              {v.suggestions.map((s, i) => (
                <div className="sig-suggestion" key={i}>{s}</div>
              ))}
            </div>
          )}
          <div className="sv-meta">Reviewed {new Date(v.generatedAt).toLocaleDateString()}</div>
        </div>
      )}

      {state.error && <div className="sv-error" role="alert">{state.error}</div>}
      <button className="sv-btn" onClick={run} disabled={busy}>
        {busy ? (<><Loader2 size={14} className="sv-spin" /> Reviewing…</>) : v ? "Review again" : "Review store visuals"}
      </button>

      <style>{`
        .sv-empty { display: flex; gap: 10px; align-items: center; font-size: 14px; color: var(--muted); margin-bottom: 14px; }
        .sv-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; }
        .sv-head { font-size: 13px; font-weight: 600; color: var(--chalk); margin-bottom: 6px; display: flex; gap: 8px; align-items: center; }
        .sv-pill { font-size: 11px; font-weight: 600; border: 1px solid; border-radius: 999px; padding: 1px 8px; font-family: var(--font-mono); }
        .sv-note { font-size: 13.5px; color: var(--muted); line-height: 1.5; }
        .sv-shot { display: flex; gap: 10px; padding: 8px 0; border-top: 1px solid var(--ink-3); }
        .sv-num { font-family: var(--font-mono); font-size: 12px; color: var(--muted); min-width: 24px; padding-top: 2px; }
        .sv-issue { font-size: 11px; font-weight: 600; font-family: var(--font-mono); }
        .sv-meta { font-size: 12px; color: var(--muted); }
        .sv-error { font-size: 13px; color: var(--kick); margin-bottom: 10px; }
        .sv-btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .sv-btn:disabled { opacity: 0.6; cursor: default; }
        .sv-spin { animation: sv-rot 1s linear infinite; }
        @keyframes sv-rot { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
