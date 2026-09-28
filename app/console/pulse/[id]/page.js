"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Bell, AlertTriangle, TrendingUp, TrendingDown, Info, Loader2, RefreshCw, Pause, Play, Trash2, ExternalLink,
} from "lucide-react";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}
function fullDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function RatingChart({ snapshots, width = 640, height = 140 }) {
  const withRating = snapshots.filter((s) => s.avg_rating != null);
  if (withRating.length < 2) return null;

  const ratings = withRating.map((s) => Number(s.avg_rating));
  const min = Math.min(...ratings) - 0.05;
  const max = Math.max(...ratings) + 0.05;
  const range = max - min || 1;
  const padX = 8;
  const drawW = width - padX * 2;

  const points = withRating.map((s, i) => {
    const x = padX + (i / (withRating.length - 1)) * drawW;
    const y = height - ((Number(s.avg_rating) - min) / range) * height;
    return { x, y, s };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 24}`} preserveAspectRatio="xMidYMid meet">
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill="var(--brand)" opacity={i === points.length - 1 ? 1 : 0.55}>
          <title>{`${Number(p.s.avg_rating).toFixed(2)}★ — ${fullDate(p.s.taken_at)}`}</title>
        </circle>
      ))}
      {[points[0], points[points.length - 1]].map((p, i) => (
        <text key={i} x={p.x} y={height + 18} textAnchor={i === 0 ? "start" : "end"} style={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--muted)" }}>
          {new Date(p.s.taken_at).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" })}
        </text>
      ))}
    </svg>
  );
}

const SEVERITY_ICON = { critical: AlertTriangle, warn: AlertTriangle, info: Info };
const SEVERITY_COLOR = { critical: "var(--kick)", warn: "var(--yellow)", info: "var(--muted)" };

export default function PulseMonitorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewsShown, setReviewsShown] = useState(8);

  const load = () => {
    fetch(`/api/pulse/monitors/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function togglePause() {
    if (!data) return;
    setBusy(true);
    const nextStatus = data.monitor.status === "paused" ? "active" : "paused";
    try {
      await fetch(`/api/pulse/monitors/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setData((d) => ({ ...d, monitor: { ...d.monitor, status: nextStatus } }));
    } finally {
      setBusy(false);
    }
  }

  async function checkNow() {
    setBusy(true);
    try {
      const res = await fetch(`/api/pulse/monitors/${id}/check`, { method: "POST" });
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
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!data) return;
    if (!confirm(`Stop monitoring ${data.monitor.app_name}? This removes its history too.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/pulse/monitors/${id}`, { method: "DELETE" });
      router.push("/console/pulse");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="pmd-page">
        <style>{pmdStyles}</style>
        <Link href="/console/pulse" className="pmd-back"><ArrowLeft size={14} />Back to Pulse</Link>
        <div className="pmd-error">{error}</div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="pmd-page">
        <style>{pmdStyles}</style>
        <div className="pmd-loading"><Loader2 size={20} className="spin" /></div>
      </main>
    );
  }

  const { monitor: m, snapshots, reviews, alerts } = data;
  const hasError = m.last_check_ok === false;

  return (
    <main className="pmd-page">
      <style>{pmdStyles}</style>

      <Link href="/console/pulse" className="pmd-back"><ArrowLeft size={14} />Back to Pulse</Link>

      <div className="pmd-header">
        {m.icon_url ? <img src={m.icon_url} alt="" className="pmd-icon" /> : <div className="pmd-icon pmd-icon-fallback">{(m.app_name || "?")[0]}</div>}
        <div className="pmd-header-main">
          <div className="pmd-name-row">
            <span className="pmd-name">{m.app_name}</span>
            <span className="pmd-country">{m.country}</span>
          </div>
          <div className="pmd-dev">{m.developer}</div>
        </div>
        <div className="pmd-actions">
          {m.store_url && (
            <a href={m.store_url} target="_blank" rel="noopener noreferrer" className="pmd-action-btn" aria-label="Open in App Store">
              <ExternalLink size={15} />
            </a>
          )}
          <button className="pmd-action-btn" onClick={checkNow} disabled={busy} aria-label="Check now"><RefreshCw size={15} /></button>
          <button className="pmd-action-btn" onClick={togglePause} disabled={busy} aria-label={m.status === "paused" ? "Resume" : "Pause"}>
            {m.status === "paused" ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button className="pmd-action-btn pmd-action-danger" onClick={remove} disabled={busy} aria-label="Remove"><Trash2 size={15} /></button>
        </div>
      </div>

      {m.status === "paused" && <div className="pmd-banner">Monitoring is paused for this app.</div>}
      {hasError && <div className="pmd-banner pmd-banner-error">{m.last_error || "The last check failed."}</div>}

      <div className="pmd-stats">
        <div className="pmd-stat-card">
          <div className="pmd-stat-label">Average rating</div>
          <div className="pmd-stat-num">{m.avg_rating != null ? Number(m.avg_rating).toFixed(2) : "—"}{m.avg_rating != null && "★"}</div>
          <div className="pmd-stat-sub">{(m.rating_count ?? 0).toLocaleString()} ratings</div>
        </div>
        <div className="pmd-stat-card">
          <div className="pmd-stat-label">Current version</div>
          <div className="pmd-stat-num pmd-stat-num-small">{m.version || "—"}</div>
          <div className="pmd-stat-sub">{m.last_snapshot_at ? `as of ${timeAgo(m.last_snapshot_at)}` : ""}</div>
        </div>
        <div className="pmd-stat-card">
          <div className="pmd-stat-label">Last checked</div>
          <div className="pmd-stat-num pmd-stat-num-small">{timeAgo(m.last_checked_at)}</div>
          <div className="pmd-stat-sub">Daily automatic checks</div>
        </div>
      </div>

      {snapshots.length >= 2 && (
        <div className="pmd-panel">
          <div className="pmd-panel-title">Rating trend</div>
          <RatingChart snapshots={snapshots} />
        </div>
      )}

      <div className="pmd-panel">
        <div className="pmd-panel-title">Alerts</div>
        {alerts.length === 0 ? (
          <div className="pmd-empty">No alerts yet. You'll see version releases, rating shifts, and unusual review activity here.</div>
        ) : (
          <div className="pmd-alert-list">
            {alerts.map((a) => {
              const Icon = SEVERITY_ICON[a.severity] || Info;
              return (
                <div className="pmd-alert-row" key={a.id}>
                  <Icon size={16} color={SEVERITY_COLOR[a.severity]} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div className="pmd-alert-main">
                    <div className="pmd-alert-title">{a.title}</div>
                    {a.detail && <div className="pmd-alert-detail">{a.detail}</div>}
                  </div>
                  <div className="pmd-alert-time">{timeAgo(a.created_at)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pmd-panel">
        <div className="pmd-panel-title">Recent reviews</div>
        {m.reviews_ok === false && (
          <div className="pmd-note">The review feed couldn't be read on the last check — this list may be incomplete.</div>
        )}
        {reviews.length === 0 ? (
          <div className="pmd-empty">No reviews seen yet.</div>
        ) : (
          <>
            <div className="pmd-review-list">
              {reviews.slice(0, reviewsShown).map((r) => (
                <div className="pmd-review-row" key={r.id}>
                  <div className="pmd-review-top">
                    <span className="pmd-review-rating">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    {r.version && <span className="pmd-review-version">v{r.version}</span>}
                    <span className="pmd-review-time">{timeAgo(r.reviewed_at)}</span>
                  </div>
                  {r.title && <div className="pmd-review-title">{r.title}</div>}
                  {r.content && <div className="pmd-review-content">{r.content}</div>}
                </div>
              ))}
            </div>
            {reviewsShown < reviews.length && (
              <button className="pmd-show-more" onClick={() => setReviewsShown((n) => n + 10)}>
                Show more ({reviews.length - reviewsShown} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}

const pmdStyles = `
  .pmd-page { padding: 40px 48px 120px; max-width: 900px; margin: 0 auto; }
  .pmd-loading, .pmd-error { padding: 80px 0; text-align: center; color: var(--muted); font-size: 14px; }
  .pmd-error { color: var(--kick); }
  .pmd-back { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); text-decoration: none; font-size: 13.5px; margin-bottom: 24px; }
  .pmd-back:hover { color: var(--chalk); }

  .pmd-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
  .pmd-icon, .pmd-icon-fallback { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; flex-shrink: 0; }
  .pmd-icon-fallback { background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 22px; }
  .pmd-header-main { flex: 1; min-width: 0; }
  .pmd-name-row { display: flex; align-items: center; gap: 10px; }
  .pmd-name { font-size: 22px; font-weight: 700; color: var(--chalk); }
  .pmd-country { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: var(--muted); border: 1px solid var(--ink-3); border-radius: 5px; padding: 2px 6px; text-transform: uppercase; }
  .pmd-dev { font-size: 13.5px; color: var(--muted); margin-top: 2px; }
  .pmd-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .pmd-action-btn {
    width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--ink-3); background: var(--surface);
    color: var(--muted); display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none;
  }
  .pmd-action-btn:hover { background: var(--ink); color: var(--chalk); }
  .pmd-action-danger:hover { color: var(--kick); }

  .pmd-banner { background: var(--ink); border: 1px solid var(--ink-3); border-radius: 10px; padding: 10px 14px; font-size: 13.5px; color: var(--muted); margin-bottom: 20px; }
  .pmd-banner-error { color: var(--kick); border-color: color-mix(in srgb, var(--kick) 30%, var(--ink-3)); }

  .pmd-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .pmd-stat-card { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 16px; }
  .pmd-stat-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; }
  .pmd-stat-num { font-family: var(--font-display); font-size: 26px; font-weight: 700; color: var(--chalk); }
  .pmd-stat-num-small { font-size: 17px; }
  .pmd-stat-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }

  .pmd-panel { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 20px 22px; margin-bottom: 16px; }
  .pmd-panel-title { font-size: 15px; font-weight: 700; color: var(--chalk); margin-bottom: 14px; }
  .pmd-empty { font-size: 13.5px; color: var(--muted); padding: 8px 0; }
  .pmd-note { font-size: 12.5px; color: var(--yellow); margin-bottom: 12px; }

  .pmd-alert-list, .pmd-review-list { display: flex; flex-direction: column; }
  .pmd-alert-row { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-top: 1px solid var(--ink-3); }
  .pmd-alert-row:first-child { border-top: none; padding-top: 0; }
  .pmd-alert-main { flex: 1; min-width: 0; }
  .pmd-alert-title { font-size: 13.5px; font-weight: 600; color: var(--chalk); }
  .pmd-alert-detail { font-size: 12.5px; color: var(--muted); margin-top: 3px; }
  .pmd-alert-time { font-size: 11.5px; color: var(--muted); white-space: nowrap; flex-shrink: 0; }

  .pmd-review-row { padding: 14px 0; border-top: 1px solid var(--ink-3); }
  .pmd-review-row:first-child { border-top: none; padding-top: 0; }
  .pmd-review-top { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
  .pmd-review-rating { color: var(--yellow); font-size: 13px; letter-spacing: 1px; }
  .pmd-review-version { font-size: 11px; color: var(--muted); border: 1px solid var(--ink-3); border-radius: 5px; padding: 1px 5px; }
  .pmd-review-time { font-size: 11.5px; color: var(--muted); margin-left: auto; }
  .pmd-review-title { font-size: 13.5px; font-weight: 600; color: var(--chalk); margin-bottom: 3px; }
  .pmd-review-content { font-size: 13px; color: var(--muted); line-height: 1.5; }
  .pmd-show-more {
    width: 100%; margin-top: 14px; padding: 10px; border-radius: 10px; border: 1px solid var(--ink-3);
    background: transparent; color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .pmd-show-more:hover { background: var(--ink); color: var(--chalk); }

  @media (max-width: 640px) {
    .pmd-page { padding: 32px 20px 80px; }
    .pmd-stats { grid-template-columns: 1fr; }
    .pmd-header { flex-wrap: wrap; }
  }
`;
