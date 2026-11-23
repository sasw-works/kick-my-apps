"use client";

import React, { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import ReplyDraft from "./ReplyDraft";

const stars = (n) => "★".repeat(n) + "☆".repeat(3 - Math.min(n, 3));
const hoursText = (h) => (h == null ? "–" : h < 48 ? `${h}h` : `${Math.round(h / 24)}d`);

// Reviews of your own apps (1-3 stars, with text) that nobody has dealt with yet. The store doesn't
// tell us whether you replied (except Google Play), so "Mark replied" is your own tick.
export default function ReplyInbox({ monitorId = null, onChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = () =>
    fetch(monitorId ? `/api/pulse/inbox?monitorId=${monitorId}` : "/api/pulse/inbox").then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!ok) throw new Error(d.error || "Could not load."); setData(d); setError(""); if (onChange) onChange(d.byMonitor || {}); })
      .catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function mark(item, status) {
    setData((d) => ({ ...d, open: d.open.filter((x) => !(x.monitorId === item.monitorId && x.reviewId === item.reviewId)), openTotal: d.openTotal - 1 }));
    try {
      const res = await fetch("/api/pulse/inbox", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ monitorId: item.monitorId, reviewId: item.reviewId, status }) });
      if (!res.ok) throw new Error();
      load(); // refreshes the reply stats
    } catch { load(); }
  }

  if (error || !data || data.watching === 0) return null;
  const { stats } = data;
  const list = showAll ? data.open : data.open.slice(0, 5);

  return (
    <div className={`ri-wrap${monitorId ? " ri-embedded" : ""}`} data-testid="reply-inbox">
      <div className="ri-head">
        <div className="ri-h"><Inbox size={16} /> {monitorId ? "Waiting for a reply" : "Reviews waiting for a reply"} <span className="ri-count">{data.openTotal}</span></div>
        {stats.lowTotal > 0 && (
          <div className="ri-stats" title={`Low-rated reviews with text from the last ${stats.windowDays} days`}>
            Last {stats.windowDays} days: replied to {stats.replied} of {stats.lowTotal}{stats.rate != null ? ` (${stats.rate}%)` : ""} · median time to reply {hoursText(stats.medianHours)}
          </div>
        )}
      </div>
      {data.openTotal === 0 ? (
        <div className="ri-empty">All caught up. New 1–3★ reviews of your apps show up here after Pulse's daily check.</div>
      ) : (
        <>
          <div className="ri-note ri-bar">Drafts are only suggestions. Copy one into App Store Connect or the Play Console, then tick “Mark replied”.</div>
          <div className="ri-list">
            {list.map((x) => (
              <div className="ri-item" key={`${x.monitorId}:${x.reviewId}`} data-testid="inbox-item">
                <div className="ri-meta"><span className="ri-stars">{stars(x.rating)}</span> {x.appName}{x.version ? ` · v${x.version}` : ""} · {x.ageDays === 0 ? "today" : `${x.ageDays}d ago`}</div>
                <div className="ri-text">{x.title ? <strong>{x.title}. </strong> : null}{String(x.content || "").slice(0, 400)}</div>
                <ReplyDraft monitorId={x.monitorId} review={{ id: x.reviewId, rating: x.rating }}>
                  <button type="button" className="ri-btn" onClick={() => mark(x, "replied")}>Mark replied</button>
                  <button type="button" className="ri-btn ri-ghost" onClick={() => mark(x, "skipped")}>Skip</button>
                </ReplyDraft>
              </div>
            ))}
          </div>
          {data.openTotal > 5 && !showAll && <button type="button" className="ri-more" onClick={() => setShowAll(true)}>Show all {data.open.length}{data.openTotal > data.open.length ? ` (of ${data.openTotal})` : ""}</button>}
        </>
      )}
      <style>{`
        .ri-wrap { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; }
        .ri-wrap.ri-embedded { margin: 0 0 24px; }
        .ri-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
        .ri-h { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--chalk); font-size: 15px; }
        .ri-count { background: var(--kick, #f5433a); color: #fff; border-radius: 999px; font-size: 12px; padding: 1px 8px; }
        .ri-stats, .ri-note, .ri-empty { font-size: 12.5px; color: var(--muted); line-height: 1.5; }
        .ri-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
        .ri-list { display: flex; flex-direction: column; gap: 12px; }
        .ri-item { background: color-mix(in srgb, var(--chalk) 4%, transparent); border-radius: 12px; padding: 16px 20px; min-width: 0; }
        .ri-meta { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
        .ri-stars { color: #e0a82e; letter-spacing: 1px; }
        .ri-text { font-size: 14px; color: var(--chalk); line-height: 1.5; overflow-wrap: anywhere; }
        .ri-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .ri-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid transparent; border-radius: 999px; padding: 7px 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; background: var(--brand); color: #fff; font-family: inherit; }
        .ri-ghost { background: var(--surface); color: var(--chalk); border: 1px solid var(--ink-3); }
        .ri-btn:disabled { opacity: .55; cursor: not-allowed; }
        .ri-more { margin-top: 14px; background: none; border: 0; color: var(--brand); font-size: 13px; cursor: pointer; font-family: inherit; padding: 0; }
      `}</style>
    </div>
  );
}
