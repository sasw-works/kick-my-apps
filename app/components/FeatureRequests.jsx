"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Plus, Check, Sparkles } from "lucide-react";

// "What users ask for": feature requests found in the stored written reviews of one of your apps,
// counted per feature, with one-click add to Tasks and optional AI grouping of the leftovers.
export default function FeatureRequests({ monitorId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch(`/api/pulse/monitors/${monitorId}/feature-requests`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Could not load feature requests.");
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [monitorId]);
  useEffect(() => { load(); }, [load]);

  async function post(body, key) {
    setBusy(key);
    setMsg("");
    try {
      const res = await fetch(`/api/pulse/monitors/${monitorId}/feature-requests`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "That didn't work.");
      if (body.action === "group" && d.groups === 0) setMsg("The AI didn't find any clear groups among the rest.");
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  const topics = data?.topics || [];
  return (
    <div className="pmd-panel" data-testid="feature-requests">
      <div className="pmd-panel-title">What users ask for</div>
      <div className="fr-sub">
        Reviews that ask for something (“please add…”, “would be great if…”), counted per feature from the {data ? data.sample : "…"} most
        recent written reviews Pulse has stored. {data ? `${data.requestCount} of them are requests.` : ""}
      </div>
      {error ? (
        <div className="pmd-empty" role="alert">{error}</div>
      ) : !data ? (
        <div className="pmd-empty"><Loader2 size={16} className="fr-spin" /></div>
      ) : topics.length === 0 ? (
        <div className="pmd-empty">No feature requests spotted yet.</div>
      ) : (
        <div className="fr-list">
          {topics.map((t) => (
            <div className="fr-row" key={t.key} data-testid={`feature-${t.key}`}>
              <div className="fr-top">
                <div className="fr-name">{t.label}{t.ai && <span className="fr-ai" title="Grouped by AI">AI</span>}</div>
                <div className="fr-count">{t.count} <span className="fr-pct">({t.pct}%)</span></div>
              </div>
              {t.examples[0] && <div className="fr-quote">{"★".repeat(t.examples[0].rating)} “{t.examples[0].text}”</div>}
              <div className="fr-actions">
                {t.added ? (
                  <Link href="/console/tasks" className="fr-added"><Check size={13} /> In Tasks</Link>
                ) : (
                  <button className="fr-btn" onClick={() => post({ key: t.key }, t.key)} disabled={!t.canAdd || busy === t.key || !data.hasReports} title={!t.canAdd ? "At least 3 reviews need to ask for it" : !data.hasReports ? "Make a report of this app first" : undefined}>
                    {busy === t.key ? <Loader2 size={13} className="fr-spin" /> : <Plus size={13} />} Add to Tasks
                  </button>
                )}
                {!t.canAdd && !t.added && <span className="fr-note">needs 3+ requests</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data?.canGroup && (
        <div className="fr-group">
          <button className="fr-btn" onClick={() => post({ action: "group" }, "group")} disabled={busy === "group"}>
            {busy === "group" ? <Loader2 size={13} className="fr-spin" /> : <Sparkles size={13} />} Group the other {data.ungrouped} requests with AI
          </button>
        </div>
      )}
      {data && !data.hasReports && topics.length > 0 && (
        <div className="fr-note" style={{ marginTop: 10 }}>To add requests to Tasks, make a report of this app from its store link first.</div>
      )}
      {msg && <div className="fr-err" role="alert">{msg}</div>}
      <style>{`
        .fr-sub { font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 14px; }
        .fr-list { display: flex; flex-direction: column; gap: 10px; }
        .fr-row { border: 1px solid var(--ink-3); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
        .fr-top { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .fr-name { font-weight: 600; color: var(--chalk); font-size: 14.5px; display: flex; gap: 8px; align-items: center; }
        .fr-ai { font-size: 10px; font-family: var(--font-mono); border: 1px solid var(--ink-3); border-radius: 6px; padding: 1px 5px; color: var(--muted); }
        .fr-count { font-family: var(--font-mono); color: var(--chalk); font-weight: 600; }
        .fr-pct { color: var(--muted); font-weight: 400; font-size: 12px; }
        .fr-quote { font-size: 12.5px; color: var(--muted); font-style: italic; border-left: 2px solid var(--muted); padding-left: 10px; line-height: 1.45; }
        .fr-actions { display: flex; align-items: center; gap: 10px; }
        .fr-group { margin-top: 12px; }
        .fr-btn { display: inline-flex; gap: 5px; align-items: center; height: 32px; padding: 0 12px; border-radius: 9px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .fr-btn:disabled { opacity: 0.5; cursor: default; }
        .fr-added { display: inline-flex; gap: 5px; align-items: center; font-size: 13px; font-weight: 600; color: var(--teal); text-decoration: none; }
        .fr-note { font-size: 12px; color: var(--muted); }
        .fr-err { font-size: 13px; color: var(--kick); margin-top: 10px; }
        .fr-spin { animation: fr-rot 1s linear infinite; } @keyframes fr-rot { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
