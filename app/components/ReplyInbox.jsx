"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Copy, Check, Inbox, Sparkles } from "lucide-react";
import ReplyDraft from "./ReplyDraft";

const stars = (n) => "★".repeat(n) + "☆".repeat(3 - Math.min(n, 3));
const hoursText = (h) => (h == null ? "–" : h < 48 ? `${h}h` : `${Math.round(h / 24)}d`);

// Reviews of your own apps (1-3 stars, with text) that nobody has dealt with yet. The store doesn't
// tell us whether you replied (except Google Play), so "Mark replied" is your own tick.
export default function ReplyInbox() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [drafts, setDrafts] = useState({}); // reviewId -> text
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [copied, setCopied] = useState("");

  const load = () =>
    fetch("/api/pulse/inbox").then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!ok) throw new Error(d.error || "Could not load."); setData(d); setError(""); })
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

  async function bulk() {
    const first = data.open.filter((x) => !drafts[x.reviewId]).slice(0, 5);
    if (!first.length) return;
    setBulkBusy(true); setBulkMsg("");
    try {
      const res = await fetch("/api/pulse/inbox/drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: first.map((x) => ({ monitorId: x.monitorId, reviewId: x.reviewId })) }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Could not write the drafts.");
      const next = { ...drafts };
      let failed = 0;
      for (const r of d.results) { if (r.reply) next[r.reviewId] = r.reply; else failed++; }
      setDrafts(next);
      if (failed) setBulkMsg(`${failed} draft${failed === 1 ? "" : "s"} couldn't be written. Try those again one by one.`);
    } catch (e) { setBulkMsg(e.message); } finally { setBulkBusy(false); }
  }

  async function copy(id) {
    try { await navigator.clipboard.writeText(drafts[id]); setCopied(id); setTimeout(() => setCopied(""), 1800); } catch { /* select the text instead */ }
  }

  if (error || !data || data.watching === 0) return null;
  const { stats } = data;
  const list = showAll ? data.open : data.open.slice(0, 5);

  return (
    <div className="ri-wrap" data-testid="reply-inbox">
      <div className="ri-head">
        <div className="ri-h"><Inbox size={16} /> Reviews waiting for a reply <span className="ri-count">{data.openTotal}</span></div>
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
          <div className="ri-bar">
            <button type="button" className="ri-btn" onClick={bulk} disabled={bulkBusy || data.open.every((x) => drafts[x.reviewId])}>
              {bulkBusy ? <Loader2 size={14} className="ri-spin" /> : <Sparkles size={14} />} Draft replies for the first {Math.min(5, data.open.filter((x) => !drafts[x.reviewId]).length) || 5}
            </button>
            <span className="ri-note">Drafts are only suggestions. Copy one into App Store Connect or the Play Console, then tick “Mark replied”.</span>
          </div>
          {bulkMsg && <div className="ri-err" role="alert">{bulkMsg}</div>}
          <div className="ri-list">
            {list.map((x) => (
              <div className="ri-item" key={`${x.monitorId}:${x.reviewId}`} data-testid="inbox-item">
                <div className="ri-meta"><span className="ri-stars">{stars(x.rating)}</span> {x.appName}{x.version ? ` · v${x.version}` : ""} · {x.ageDays === 0 ? "today" : `${x.ageDays}d ago`}</div>
                <div className="ri-text">{x.title ? <strong>{x.title}. </strong> : null}{String(x.content || "").slice(0, 400)}</div>
                {drafts[x.reviewId] !== undefined ? (
                  <div className="ri-draft">
                    <textarea aria-label="Draft reply" value={drafts[x.reviewId]} onChange={(e) => setDrafts({ ...drafts, [x.reviewId]: e.target.value })} rows={4} />
                    <button type="button" className="ri-btn ri-ghost" onClick={() => copy(x.reviewId)}>{copied === x.reviewId ? <Check size={14} /> : <Copy size={14} />} {copied === x.reviewId ? "Copied" : "Copy"}</button>
                  </div>
                ) : <ReplyDraft monitorId={x.monitorId} review={{ id: x.reviewId, rating: x.rating }} />}
                <div className="ri-actions">
                  <button type="button" className="ri-btn" onClick={() => mark(x, "replied")}>Mark replied</button>
                  <button type="button" className="ri-btn ri-ghost" onClick={() => mark(x, "skipped")}>Skip</button>
                </div>
              </div>
            ))}
          </div>
          {data.openTotal > 5 && !showAll && <button type="button" className="ri-more" onClick={() => setShowAll(true)}>Show all {data.open.length}{data.openTotal > data.open.length ? ` (of ${data.openTotal})` : ""}</button>}
        </>
      )}
      <style>{`
        .ri-wrap { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; }
        .ri-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
        .ri-h { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--chalk); font-size: 15px; }
        .ri-count { background: var(--kick, #f5433a); color: #fff; border-radius: 999px; font-size: 12px; padding: 1px 8px; }
        .ri-stats, .ri-note, .ri-empty { font-size: 12.5px; color: var(--muted); line-height: 1.5; }
        .ri-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
        .ri-list { display: flex; flex-direction: column; gap: 14px; }
        .ri-item { border-top: 1px solid var(--ink-3); padding-top: 12px; min-width: 0; }
        .ri-meta { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
        .ri-stars { color: #e0a82e; letter-spacing: 1px; }
        .ri-text { font-size: 14px; color: var(--chalk); line-height: 1.5; overflow-wrap: anywhere; }
        .ri-draft { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
        .ri-draft textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); border-radius: 10px; font-size: 13.5px; font-family: inherit; padding: 9px 12px; line-height: 1.5; resize: vertical; }
        .ri-actions { display: flex; gap: 8px; margin-top: 10px; }
        .ri-btn { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; padding: 7px 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; background: var(--brand); color: #fff; font-family: inherit; }
        .ri-ghost { background: var(--surface); color: var(--chalk); border: 1px solid var(--ink-3); }
        .ri-btn:disabled { opacity: .55; cursor: not-allowed; }
        .ri-more { margin-top: 14px; background: none; border: 0; color: var(--brand); font-size: 13px; cursor: pointer; font-family: inherit; padding: 0; }
        .ri-err { color: var(--kick); font-size: 13px; margin-bottom: 10px; }
        .ri-spin { animation: rir 1s linear infinite; } @keyframes rir { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
