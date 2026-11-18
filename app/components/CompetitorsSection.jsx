"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, Plus, Trash2, Loader2, TrendingUp, TrendingDown } from "lucide-react";

// "Competitors" block on a monitored app's page: your numbers next to each tracked competitor's.
// Their data comes from the same daily check as yours; it's the public store rating, version,
// and the recent written reviews we've seen -- not their private analytics.

const ago = (d) => {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days < 1 ? "today" : days < 60 ? `${days}d ago` : new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
const stars = (v) => (v == null ? "—" : `${v.toFixed(2)}★`);

export default function CompetitorsSection({ monitorId, country, appId }) {
  // Competitors are searched in the same store as the app they're compared with.
  const isPlay = /^[A-Za-z]/.test(String(appId || ""));
  const storeLabel = isPlay ? "Google Play" : "the App Store";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [formError, setFormError] = useState("");
  const timer = useRef(null);

  const load = useCallback(() => {
    fetch(`/api/pulse/monitors/${monitorId}/competitors`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!ok) throw new Error(d.error || "Could not load competitors."); setData(d); setError(""); })
      .catch((e) => setError(e.message));
  }, [monitorId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (query.trim().length < 3) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/search-app?term=${encodeURIComponent(query)}&country=${country}&store=${isPlay ? "play" : "appstore"}`);
        setResults((await r.json()).results || []);
      } catch { setResults([]); } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query, country, isPlay]);

  async function add(app) {
    setBusyId(String(app.trackId)); setFormError("");
    try {
      const res = await fetch(`/api/pulse/monitors/${monitorId}/competitors`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ appId: String(app.trackId), country }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not add it.");
      setAdding(false); setQuery(""); setResults([]); load();
    } catch (e) { setFormError(e.message); } finally { setBusyId(null); }
  }

  async function remove(c) {
    if (!confirm(`Stop tracking ${c.app_name}? Its history is removed too.`)) return;
    setBusyId(c.id);
    try { await fetch(`/api/pulse/monitors/${c.id}`, { method: "DELETE" }); load(); } finally { setBusyId(null); }
  }

  const competitors = data?.competitors || [];
  const limit = data?.limit;
  const full = limit != null && competitors.length >= limit;

  return (
    <section className="cmp" data-testid="competitors">
      <style>{`
        .cmp { margin-top: 32px; }
        .cmp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
        .cmp h2 { margin: 0; font-size: 18px; font-weight: 600; color: var(--chalk); }
        .cmp-sub { font-size: 13px; color: var(--muted); margin: 0 0 16px; }
        .cmp-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--brand); color: #fff; border: 0; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .cmp-btn:disabled { opacity: .5; cursor: not-allowed; }
        .cmp-scroll { overflow-x: auto; border: 1px solid var(--ink-3); border-radius: 12px; background: var(--surface); }
        .cmp-table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 13.5px; }
        .cmp-table th { text-align: left; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); font-weight: 600; padding: 12px 14px; border-bottom: 1px solid var(--ink-3); }
        .cmp-table td { padding: 14px; border-bottom: 1px solid var(--ink-3); color: var(--chalk); vertical-align: top; }
        .cmp-table tr:last-child td { border-bottom: 0; }
        .cmp-self td { background: color-mix(in srgb, var(--brand) 6%, transparent); }
        .cmp-app { display: flex; align-items: center; gap: 10px; min-width: 170px; }
        .cmp-icon { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: var(--ink-3); }
        .cmp-name { font-weight: 600; }
        .cmp-tag { font-size: 10.5px; font-family: var(--font-mono); color: var(--brand); }
        .cmp-muted { color: var(--muted); font-size: 12px; }
        .cmp-gap { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-family: var(--font-mono); margin-top: 2px; }
        .cmp-chip { display: inline-block; font-size: 11.5px; background: var(--ink); color: var(--muted); border-radius: 999px; padding: 2px 8px; margin: 0 4px 4px 0; }
        .cmp-icon-btn { background: none; border: 0; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; }
        .cmp-icon-btn:hover { color: var(--kick); background: var(--ink); }
        .cmp-empty { border: 1px dashed var(--ink-3); border-radius: 12px; padding: 28px; text-align: center; color: var(--muted); font-size: 14px; }
        .cmp-add { margin: 0 0 16px; background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 14px; }
        .cmp-input { width: 100%; height: 42px; border-radius: 10px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); font-size: 14px; padding: 0 12px 0 34px; box-sizing: border-box; }
        .cmp-input-wrap { position: relative; } .cmp-input-wrap svg { position: absolute; left: 11px; top: 13px; color: var(--muted); }
        .cmp-result { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; width: 100%; background: none; border: 0; color: var(--chalk); cursor: pointer; text-align: left; font-size: 14px; }
        .cmp-result:hover { background: var(--ink); } .cmp-result:disabled { opacity: .6; }
        .spin { animation: cmpspin 1s linear infinite; } @keyframes cmpspin { to { transform: rotate(360deg); } }
        .cmp-err { color: var(--kick); font-size: 13px; margin-top: 8px; }
      `}</style>

      <div className="cmp-head">
        <h2>Competitors</h2>
        <button className="cmp-btn" onClick={() => { setAdding((a) => !a); setFormError(""); }} disabled={!data || full} title={full ? `Your plan includes ${limit} per app` : undefined}>
          <Plus size={14} /> Add competitor
        </button>
      </div>
      <p className="cmp-sub">
        Public {isPlay ? "Google Play" : "App Store"} numbers, checked daily alongside yours{limit != null ? ` · ${competitors.length} of ${limit} used` : ""}. Review topics come from the recent written reviews we&apos;ve seen, not every review.
      </p>

      {adding && (
        <div className="cmp-add">
          <div className="cmp-input-wrap">
            <Search size={15} />
            <input className="cmp-input" autoFocus placeholder={`Search ${storeLabel} for a competitor…`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search for a competitor" />
          </div>
          {searching && <div className="cmp-muted" style={{ marginTop: 10 }}><Loader2 size={13} className="spin" /> Searching…</div>}
          {query.trim().length >= 3 && results.slice(0, 6).map((app) => (
            <button key={app.trackId} className="cmp-result" onClick={() => add(app)} disabled={busyId === String(app.trackId)}>
              {app.icon ? <img src={app.icon} alt="" className="cmp-icon" /> : <div className="cmp-icon" />}
              <span><span className="cmp-name">{app.name}</span><br /><span className="cmp-muted">{app.developer}</span></span>
            </button>
          ))}
          {formError && <div className="cmp-err" role="alert">{formError}</div>}
        </div>
      )}

      {error ? (
        <div className="cmp-empty" role="alert">{error}</div>
      ) : !data ? (
        <div className="cmp-empty"><Loader2 size={18} className="spin" /></div>
      ) : competitors.length === 0 ? (
        <div className="cmp-empty">No competitors yet. Add one to see how its rating, releases and review complaints compare with yours.</div>
      ) : (
        <div className="cmp-scroll">
          <table className="cmp-table">
            <thead>
              <tr><th>App</th><th>Rating</th><th>Version</th><th>1–2★ reviews</th><th>Top complaints</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {[{ ...data.self, isSelf: true }, ...competitors].map((a) => (
                <tr key={a.id} className={a.isSelf ? "cmp-self" : ""} data-testid={a.isSelf ? "cmp-self" : `cmp-row-${a.id}`}>
                  <td>
                    <div className="cmp-app">
                      {a.icon_url ? <img src={a.icon_url} alt="" className="cmp-icon" /> : <div className="cmp-icon" />}
                      <div><div className="cmp-name">{a.app_name}</div>{a.isSelf && <div className="cmp-tag">YOUR APP</div>}</div>
                    </div>
                  </td>
                  <td>
                    <div>{stars(a.avgRating)}</div>
                    <div className="cmp-muted">{a.ratingCount != null ? `${a.ratingCount.toLocaleString()} ratings` : ""}</div>
                    {!a.isSelf && a.ratingGap != null && (
                      <div className="cmp-gap" style={{ color: a.ratingGap > 0 ? "var(--kick)" : a.ratingGap < 0 ? "var(--teal)" : "var(--muted)" }}>
                        {a.ratingGap > 0 ? <TrendingUp size={12} /> : a.ratingGap < 0 ? <TrendingDown size={12} /> : null}
                        {a.ratingGap === 0 ? "level with you" : `${a.ratingGap > 0 ? "+" : ""}${a.ratingGap.toFixed(2)} vs you`}
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{a.version || "—"}</div>
                    <div className="cmp-muted">released {ago(a.versionReleasedAt)}</div>
                    {a.updatesSeen > 0 && <div className="cmp-muted">{a.updatesSeen} update{a.updatesSeen === 1 ? "" : "s"} since {ago(a.trackedSince)}</div>}
                  </td>
                  <td>
                    {a.negativePct != null ? <>{a.negativePct}%<div className="cmp-muted">of {a.reviewSample} recent reviews</div></> : <span className="cmp-muted">no reviews read yet</span>}
                  </td>
                  <td>
                    {a.topComplaints.length ? a.topComplaints.map((t) => <span className="cmp-chip" key={t.label}>{t.label} · {t.count}</span>) : <span className="cmp-muted">none spotted</span>}
                  </td>
                  <td>
                    {!a.isSelf && (
                      <button className="cmp-icon-btn" onClick={() => remove(a)} disabled={busyId === a.id} aria-label={`Stop tracking ${a.app_name}`}><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
