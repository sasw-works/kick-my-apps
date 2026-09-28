"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Bell, Plus, MoreHorizontal, X, Loader2, Search, Pause, Play, RefreshCw, Trash2, ChevronRight,
} from "lucide-react";

const COUNTRIES = [
  { code: "tr", label: "Turkey" },
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "ae", label: "United Arab Emirates" },
  { code: "sa", label: "Saudi Arabia" },
  { code: "es", label: "Spain" },
  { code: "it", label: "Italy" },
  { code: "nl", label: "Netherlands" },
];

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function initials(name) {
  return (name || "?")[0]?.toUpperCase() || "?";
}
function colorFor(seed) {
  const palette = ["#F5433A", "#7CB342", "#29B6F6", "#7E57C2", "#FF7043", "#26A69A", "#EC407A", "#5C6BC0"];
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export default function ConsolePulsePage() {
  const [monitors, setMonitors] = useState(null);
  const [limit, setLimit] = useState(null);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [menuId, setMenuId] = useState(null);

  const load = useCallback(() => {
    fetch("/api/pulse/monitors")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setMonitors(d.monitors);
        setLimit(d.limit);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Closing on any outside click, including the toggle button's own click (native listeners
    // on document run independently of React's synthetic stopPropagation), so this only closes
    // when the click is genuinely outside the open menu and its toggle button.
    const onDocClick = (e) => {
      if (e.target.closest(".pulse-menu, .pulse-more-btn")) return;
      setMenuId(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function handleAdded(monitor) {
    setShowAdd(false);
    setMonitors((prev) => [...(prev || []), monitor]);
    load(); // refresh counts/limit from the server
  }

  async function togglePause(m) {
    setBusyId(m.id);
    setMenuId(null);
    const nextStatus = m.status === "paused" ? "active" : "paused";
    try {
      const res = await fetch(`/api/pulse/monitors/${m.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setMonitors((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: nextStatus } : x)));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function checkNow(m) {
    setBusyId(m.id);
    setMenuId(null);
    try {
      const res = await fetch(`/api/pulse/monitors/${m.id}/check`, { method: "POST" });
      const d = await res.json();
      if (d.error) {
        if (d.code === "TOO_SOON") {
          const mins = Math.ceil((d.retryAfterSeconds || 0) / 60);
          alert(`This monitor was checked recently. Try again in about ${mins < 60 ? `${mins} min` : `${Math.ceil(mins / 60)}h`}.`);
        } else {
          alert(d.error);
        }
        return;
      }
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(m) {
    setMenuId(null);
    if (!confirm(`Stop monitoring ${m.app_name}? This removes its history too.`)) return;
    setBusyId(m.id);
    try {
      const res = await fetch(`/api/pulse/monitors/${m.id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setMonitors((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const atLimit = limit !== null && monitors && monitors.length >= limit;

  return (
    <main className="pulse-page">
      <style>{`
        .pulse-page { padding: 48px 48px 120px; max-width: 1240px; margin: 0 auto; }
        .pulse-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 12px; flex-wrap: wrap; }
        .pulse-title { margin: 0; font-family: var(--font-inter), sans-serif; font-size: 42px; line-height: 57.6px; font-weight: 400; color: var(--chalk); }
        .pulse-subtitle { margin: 0; font-size: var(--fs-18); line-height: 28px; font-weight: 400; color: var(--muted); max-width: 560px; }
        .pulse-add-btn {
          display: flex; align-items: center; gap: 8px; background: var(--brand); color: #fff;
          border: none; border-radius: 999px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer;
          white-space: nowrap;
        }
        .pulse-add-btn:disabled { opacity: 0.5; cursor: default; }
        .pulse-limit-note { font-size: 13px; color: var(--muted); margin: 0 0 28px; }
        .pulse-limit-note a { color: var(--brand); font-weight: 600; text-decoration: none; }

        .pulse-empty {
          border: 1px dashed var(--ink-3); border-radius: 12px; padding: 64px 24px; text-align: center; color: var(--muted);
        }
        .pulse-empty-title { color: var(--chalk); font-weight: 600; font-size: 16px; margin-bottom: 6px; }

        .pulse-list { display: flex; flex-direction: column; gap: 12px; }
        .pulse-card {
          background: var(--surface); border: 1px solid var(--ink-3); border-radius: 8px; padding: 20px 24px;
          display: flex; align-items: center; gap: 16px; text-decoration: none; color: inherit; position: relative;
        }
        .pulse-card-clickable { cursor: pointer; }
        .pulse-card-clickable:hover { border-color: color-mix(in srgb, var(--brand) 40%, var(--ink-3)); }
        .pulse-card-paused { opacity: 0.6; }
        .pulse-card-busy { opacity: 0.5; pointer-events: none; }
        .pulse-avatar-img, .pulse-avatar {
          width: 42px; height: 42px; border-radius: 10px; color: #fff; font-weight: 700; font-size: 16px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; object-fit: cover;
        }
        .pulse-card-main { flex: 1; min-width: 0; }
        .pulse-card-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
        .pulse-card-name { font-size: 16px; font-weight: 600; color: var(--chalk); }
        .pulse-country-tag { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--muted); border: 1px solid var(--ink-3); border-radius: 5px; padding: 1px 5px; text-transform: uppercase; }
        .pulse-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .pulse-status-active { background: var(--teal); }
        .pulse-status-paused { background: var(--muted); }
        .pulse-status-error { background: var(--kick); }
        .pulse-card-meta { font-size: 12px; color: var(--muted); }

        .pulse-unread { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--kick); background: color-mix(in srgb, var(--kick) 12%, transparent); padding: 2px 8px; border-radius: 999px; }

        .pulse-stat { text-align: center; min-width: 64px; }
        .pulse-stat-num { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--chalk); }
        .pulse-stat-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

        .pulse-more-btn {
          width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--ink-3); background: transparent;
          color: var(--muted); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
        }
        .pulse-more-btn:hover { background: var(--ink); }
        .pulse-menu {
          position: absolute; right: 24px; top: 60px; z-index: 20; background: var(--surface); border: 1px solid var(--ink-3);
          border-radius: 10px; padding: 6px; min-width: 180px; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }
        .pulse-menu-item {
          display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border-radius: 7px; border: none;
          background: transparent; color: var(--chalk); font-size: 13.5px; text-align: left; cursor: pointer;
        }
        .pulse-menu-item:hover { background: var(--ink); }
        .pulse-menu-item-danger { color: var(--kick); }

        .pulse-chevron { color: var(--muted); flex-shrink: 0; }

        .pulse-card-top, .pulse-card-bottom { display: contents; }
        .pulse-chevron-mobile { display: none; }

        @media (max-width: 900px) {
          .pulse-card { flex-wrap: wrap; }
        }
        @media (max-width: 640px) {
          .pulse-card { padding: 16px; flex-direction: column; align-items: stretch; gap: 12px; }
          .pulse-card-top { display: flex; align-items: center; gap: 14px; width: 100%; }
          .pulse-card-name-row { row-gap: 6px; }
          .pulse-chevron-desktop { display: none; }
          .pulse-card-bottom {
            display: flex; align-items: center; gap: 24px; width: 100%;
            padding-left: 58px; box-sizing: border-box;
          }
          .pulse-stat { text-align: left; min-width: 0; }
          .pulse-chevron-mobile { display: block; margin-left: auto; }
          .pulse-more-btn { position: absolute; top: 16px; right: 16px; }
        }
        }
      `}</style>

      <div className="pulse-header">
        <div>
          <div className="pulse-title">Pulse</div>
          <div className="pulse-subtitle">Track your apps for new reviews, rating shifts, and version updates — automatically, in the background.</div>
        </div>
        <button className="pulse-add-btn" onClick={() => setShowAdd(true)} disabled={atLimit}>
          <Plus size={16} />
          Add Monitor
        </button>
      </div>

      {limit !== null && monitors && (
        <p className="pulse-limit-note">
          {monitors.length} / {limit} monitor{limit === 1 ? "" : "s"} used on your plan.
          {atLimit && (
            <>
              {" "}
              <Link href="/console/account">Upgrade</Link> for more.
            </>
          )}
        </p>
      )}

      {error && <div style={{ color: "var(--kick)", fontSize: 14, marginBottom: 16 }}>{error}</div>}

      {monitors === null ? (
        <div className="pulse-empty"><Loader2 size={20} className="spin" /></div>
      ) : monitors.length === 0 ? (
        <div className="pulse-empty">
          <div className="pulse-empty-title">No apps being watched yet</div>
          Add one to get a daily check for new reviews, rating changes, and version updates.
        </div>
      ) : (
        <div className="pulse-list">
          {monitors.map((m) => {
            const hasError = m.last_check_ok === false;
            const statusClass = m.status === "paused" ? "pulse-status-paused" : hasError ? "pulse-status-error" : "pulse-status-active";
            const lastChecked = timeAgo(m.last_checked_at);
            return (
              <Link
                href={`/console/pulse/${m.id}`}
                key={m.id}
                className={`pulse-card pulse-card-clickable ${m.status === "paused" ? "pulse-card-paused" : ""} ${busyId === m.id ? "pulse-card-busy" : ""}`}
              >
                <div className="pulse-card-top">
                  {m.icon_url ? (
                    <img src={m.icon_url} alt="" className="pulse-avatar-img" />
                  ) : (
                    <div className="pulse-avatar" style={{ background: colorFor(m.app_id) }}>{initials(m.app_name)}</div>
                  )}
                  <div className="pulse-card-main">
                    <div className="pulse-card-name-row">
                      <span className={`pulse-status-dot ${statusClass}`} />
                      <span className="pulse-card-name">{m.app_name}</span>
                      <span className="pulse-country-tag">{m.country}</span>
                      {m.unread_alerts > 0 && (
                        <span className="pulse-unread">
                          <Bell size={11} />
                          {m.unread_alerts} new
                        </span>
                      )}
                    </div>
                    <div className="pulse-card-meta">
                      {m.status === "paused"
                        ? "Paused"
                        : hasError
                        ? m.last_error || "Last check failed"
                        : lastChecked
                        ? `Last checked ${lastChecked}`
                        : "Checking for the first time…"}
                    </div>
                  </div>
                  <ChevronRight size={18} className="pulse-chevron pulse-chevron-desktop" />
                </div>

                <div className="pulse-card-bottom">
                  {m.avg_rating != null && (
                    <div className="pulse-stat">
                      <div className="pulse-stat-num">{Number(m.avg_rating).toFixed(1)}★</div>
                      <div className="pulse-stat-label">{(m.rating_count ?? 0).toLocaleString()} ratings</div>
                    </div>
                  )}
                  {m.new_review_count > 0 && (
                    <div className="pulse-stat">
                      <div className="pulse-stat-num">{m.new_review_count}</div>
                      <div className="pulse-stat-label">New review{m.new_review_count === 1 ? "" : "s"}</div>
                    </div>
                  )}
                  <ChevronRight size={18} className="pulse-chevron pulse-chevron-mobile" />
                </div>

                <button
                  className="pulse-more-btn"
                  aria-label="More"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuId(menuId === m.id ? null : m.id);
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {menuId === m.id && (
                  <div className="pulse-menu" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                    <button className="pulse-menu-item" onClick={() => checkNow(m)}>
                      <RefreshCw size={14} />
                      Check now
                    </button>
                    <button className="pulse-menu-item" onClick={() => togglePause(m)}>
                      {m.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
                      {m.status === "paused" ? "Resume" : "Pause"}
                    </button>
                    <button className="pulse-menu-item pulse-menu-item-danger" onClick={() => remove(m)}>
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {showAdd && <AddMonitorModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
    </main>
  );
}

function AddMonitorModal({ onClose, onAdded }) {
  const [country, setCountry] = useState("tr");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);
  const shownResults = query.trim().length < 3 ? [] : results;
  const isSearching = searching && query.trim().length >= 3;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      // Nothing to clear via setState here: shownResults below already treats a short query as
      // "no results" without needing results itself to change.
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search-app?term=${encodeURIComponent(query)}&country=${country}`);
        const d = await res.json();
        setResults(d.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, country]);

  async function handleAdd() {
    if (!selected) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/pulse/monitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appId: String(selected.trackId), country }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      onAdded(d.monitor);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="pulse-modal-overlay" onClick={onClose}>
      <style>{`
        .pulse-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .pulse-modal { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 16px; width: 100%; max-width: 460px; padding: 24px; }
        .pulse-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .pulse-modal-title { font-size: 18px; font-weight: 700; color: var(--chalk); }
        .pulse-modal-close { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; }
        .pulse-modal-label { font-size: 12.5px; font-weight: 600; color: var(--muted); margin: 14px 0 6px; }
        .pulse-modal-select, .pulse-modal-input {
          width: 100%; height: 44px; border-radius: 10px; border: 1px solid var(--ink-3); background: var(--ink);
          color: var(--chalk); font-size: 14px; padding: 0 12px; box-sizing: border-box; font-family: inherit;
        }
        .pulse-search-wrap { position: relative; }
        .pulse-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); }
        .pulse-modal-input { padding-left: 36px; }
        .pulse-results { margin-top: 10px; max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
        .pulse-result-row {
          display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; cursor: pointer; border: 1px solid transparent;
        }
        .pulse-result-row:hover { background: var(--ink); }
        .pulse-result-row-selected { border-color: var(--brand); background: color-mix(in srgb, var(--brand) 8%, transparent); }
        .pulse-result-icon { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; object-fit: cover; }
        .pulse-result-name { font-size: 13.5px; font-weight: 600; color: var(--chalk); }
        .pulse-result-dev { font-size: 12px; color: var(--muted); }
        .pulse-modal-error { color: var(--kick); font-size: 13px; margin-top: 10px; }
        .pulse-modal-submit {
          width: 100%; height: 48px; border-radius: 999px; border: none; background: var(--brand); color: #fff;
          font-size: 14px; font-weight: 600; margin-top: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .pulse-modal-submit:disabled { opacity: 0.5; cursor: default; }
      `}</style>
      <div className="pulse-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pulse-modal-head">
          <div className="pulse-modal-title">Add Monitor</div>
          <button className="pulse-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="pulse-modal-label">Store</div>
        <select className="pulse-modal-select" value={country} onChange={(e) => { setCountry(e.target.value); setSelected(null); }}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>

        <div className="pulse-modal-label">App</div>
        <div className="pulse-search-wrap">
          <Search size={15} className="pulse-search-icon" />
          <input
            className="pulse-modal-input"
            placeholder="Search any app…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          />
        </div>

        {isSearching && <div style={{ padding: "10px 4px", color: "var(--muted)", fontSize: 13 }}>Searching…</div>}

        {shownResults.length > 0 && (
          <div className="pulse-results">
            {shownResults.map((r) => (
              <div
                key={r.trackId}
                className={`pulse-result-row ${selected?.trackId === r.trackId ? "pulse-result-row-selected" : ""}`}
                onClick={() => setSelected(r)}
              >
                <img src={r.icon} alt="" className="pulse-result-icon" />
                <div>
                  <div className="pulse-result-name">{r.name}</div>
                  <div className="pulse-result-dev">{r.developer}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="pulse-modal-error">{error}</div>}

        <button className="pulse-modal-submit" onClick={handleAdd} disabled={!selected || adding}>
          {adding ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
          {adding ? "Adding…" : "Add Monitor"}
        </button>
      </div>
    </div>
  );
}
