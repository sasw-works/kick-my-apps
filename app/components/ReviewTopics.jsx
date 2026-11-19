"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, TrendingDown, Plus, Check, MessageSquareReply } from "lucide-react";
import ReplyDraft from "./ReplyDraft";


// For a topic marked done in Tasks: the reviewers who complained about it, each with a reply draft
// that already carries "this was fixed in version X" (the developer confirms the version).
function FixedReplies({ monitorId, topic }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState("");

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || data) return;
    try {
      const res = await fetch(`/api/pulse/monitors/${monitorId}/topics/${topic.key}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Could not load the reviews.");
      setData(d);
      setVersion(d.latestVersion || "");
    } catch (e) { setError(e.message); }
  }
  const note = `The "${topic.label}" problem was fixed${version.trim() ? ` in version ${version.trim()}` : " in the latest update"}. Suggest they update the app.`;

  return (
    <div className="rt-fixed" data-testid={`fixed-${topic.key}`}>
      <button type="button" className="rt-btn" onClick={toggle} aria-expanded={open}>
        <MessageSquareReply size={13} /> Tell people it&apos;s fixed
      </button>
      {open && (
        <div className="rt-fixed-box">
          {error ? <div className="rt-err" role="alert">{error}</div> : !data ? <Loader2 size={16} className="rt-spin" /> : (
            <>
              <label className="rt-note" htmlFor={`fv-${topic.key}`}>Fixed in version</label>
              <input id={`fv-${topic.key}`} className="rt-ver" maxLength={30} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 2.4.1" />
              <div className="rt-note">{data.total} written review{data.total === 1 ? "" : "s"} mention this{data.total > 15 ? " (showing the newest 15)" : ""}. Each draft says the problem is fixed, so only use it once the fix is really live.</div>
              {data.reviews.map((r) => (
                <div className="rt-rev" key={r.id}>
                  <div className="rt-quote">{"★".repeat(r.rating)}{r.version ? ` · v${r.version}` : ""} {r.title ? `${r.title} — ` : ""}{String(r.content || "").slice(0, 220)}</div>
                  <ReplyDraft monitorId={monitorId} review={{ id: r.id, rating: r.rating }} initialNote={note} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// "What users complain about" on one of your apps' Pulse pages: complaint topics counted from the
// written 1-3 star reviews Pulse has stored, each with a one-click way to put it in Tasks.
export default function ReviewTopics({ monitorId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch(`/api/pulse/monitors/${monitorId}/topics`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Could not load review topics.");
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [monitorId]);
  useEffect(() => { load(); }, [load]);

  async function add(topic) {
    setBusy(topic.key);
    setMsg("");
    try {
      const res = await fetch(`/api/pulse/monitors/${monitorId}/topics`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: topic.key }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not add it.");
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  const topics = data?.topics || [];
  return (
    <div className="pmd-panel" data-testid="review-topics">
      <div className="pmd-panel-title">What users complain about</div>
      <div className="rt-sub">
        Counted from the {data ? data.sample : "…"} most recent written 1–3★ reviews Pulse has stored for this app. Exact counts,
        not a guess. Put a topic in Tasks to work on it like any other issue.
      </div>
      {error ? (
        <div className="pmd-empty" role="alert">{error}</div>
      ) : !data ? (
        <div className="pmd-empty"><Loader2 size={16} className="rt-spin" /></div>
      ) : topics.length === 0 ? (
        <div className="pmd-empty">No complaint topics spotted yet. They appear as low-rated written reviews come in.</div>
      ) : (
        <div className="rt-list">
          {topics.map((t) => (
            <div className="rt-row" key={t.key} data-testid={`topic-${t.key}`}>
              <div className="rt-top">
                <div className="rt-name">
                  {t.label}
                  {t.trend === "up" && <span className="rt-trend rt-up" title="More in the newer half of the reviews"><TrendingUp size={12} /> rising</span>}
                  {t.trend === "down" && <span className="rt-trend rt-down" title="Fewer in the newer half of the reviews"><TrendingDown size={12} /> easing</span>}
                </div>
                <div className="rt-count">{t.count} <span className="rt-pct">({t.pct}%)</span></div>
              </div>
              {t.examples[0] && <div className="rt-quote">{"★".repeat(t.examples[0].rating)} “{t.examples[0].text}”</div>}
              <div className="rt-actions">
                {t.added ? (
                  <Link href="/console/tasks" className="rt-added"><Check size={13} /> In Tasks</Link>
                ) : (
                  <button className="rt-btn" onClick={() => add(t)} disabled={!t.canAdd || busy === t.key || !data.hasReports} title={!t.canAdd ? "At least 3 reviews need to mention it" : !data.hasReports ? "Make a report of this app first" : undefined}>
                    {busy === t.key ? <Loader2 size={13} className="rt-spin" /> : <Plus size={13} />} Add to Tasks
                  </button>
                )}
                {!t.canAdd && !t.added && <span className="rt-note">needs 3+ mentions</span>}
              </div>
              {t.fixed && <FixedReplies monitorId={monitorId} topic={t} />}
            </div>
          ))}
        </div>
      )}
      {data && !data.hasReports && topics.length > 0 && (
        <div className="rt-note" style={{ marginTop: 10 }}>
          To add topics to Tasks, make a report of this app from its store link first. Tasks are kept per app, and the report gives them a home.
        </div>
      )}
      {msg && <div className="rt-err" role="alert">{msg}</div>}
      <style>{`
        .rt-sub { font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 14px; }
        .rt-list { display: flex; flex-direction: column; gap: 10px; }
        .rt-row { border: 1px solid var(--ink-3); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
        .rt-top { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .rt-name { font-weight: 600; color: var(--chalk); font-size: 14.5px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .rt-count { font-family: var(--font-mono); color: var(--chalk); font-weight: 600; }
        .rt-pct { color: var(--muted); font-weight: 400; font-size: 12px; }
        .rt-trend { display: inline-flex; gap: 3px; align-items: center; font-size: 11px; font-weight: 600; font-family: var(--font-mono); }
        .rt-up { color: var(--kick); } .rt-down { color: var(--teal); }
        .rt-quote { font-size: 12.5px; color: var(--muted); font-style: italic; border-left: 2px solid var(--muted); padding-left: 10px; line-height: 1.45; }
        .rt-actions { display: flex; align-items: center; gap: 10px; }
        .rt-btn { display: inline-flex; gap: 5px; align-items: center; height: 32px; padding: 0 12px; border-radius: 9px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .rt-btn:disabled { opacity: 0.5; cursor: default; }
        .rt-added { display: inline-flex; gap: 5px; align-items: center; font-size: 13px; font-weight: 600; color: var(--teal); text-decoration: none; }
        .rt-note { font-size: 12px; color: var(--muted); }
        .rt-err { font-size: 13px; color: var(--kick); margin-top: 10px; }
        .rt-fixed-box { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }
        .rt-ver { width: 140px; border: 1px solid var(--ink-3); background: var(--surface); color: var(--chalk); border-radius: 8px; padding: 6px 10px; font-size: 13px; font-family: inherit; }
        .rt-rev { border-top: 1px solid var(--ink-3); padding-top: 10px; }
        .rt-spin { animation: rt-rot 1s linear infinite; } @keyframes rt-rot { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
