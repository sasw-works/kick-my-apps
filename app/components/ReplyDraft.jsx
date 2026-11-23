"use client";

import React, { useState } from "react";
import { MessageSquareReply, Loader2, Copy, Check, RefreshCw } from "lucide-react";

// "Draft reply" for one review of your own app. The draft is only a starting point: it's shown in an
// editable box, nothing is posted, and you copy it into App Store Connect or the Play Console yourself.

const TONES = [
  { key: "friendly", label: "Friendly" },
  { key: "professional", label: "Professional" },
  { key: "empathetic", label: "Empathetic" },
];
const defaultTone = (rating) => (rating <= 2 ? "empathetic" : rating === 3 ? "professional" : "friendly");

// children: extra buttons shown on the same row as "Draft reply" (the reply box opens below the row).
export default function ReplyDraft({ monitorId, review, initialNote = "", children }) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState(defaultTone(review.rating));
  const [note, setNote] = useState(initialNote);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true); setError(""); setCopied(false);
    try {
      const res = await fetch(`/api/pulse/monitors/${monitorId}/reply-draft`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewId: review.id, tone, note: note.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Could not write a draft.");
      setReply(d.reply);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(reply); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* select the text instead */ }
  }

  return (
    <div className="rd">
      <style>{`
        .rd { margin-top: 8px; }
        .rd-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .rd-bar .rd-toggle { padding: 7px 13px; font-size: 12.5px; font-weight: 600; color: var(--chalk); }
        .rd-toggle { display: inline-flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--ink-3); border-radius: 999px; padding: 5px 12px; font-size: 12px; color: var(--muted); cursor: pointer; }
        .rd-toggle:hover { color: var(--chalk); border-color: var(--brand); }
        .rd-box { margin-top: 10px; background: var(--ink); border: 1px solid var(--ink-3); border-radius: 12px; padding: 14px; }
        .rd-label { font-size: 12px; font-weight: 600; color: var(--muted); margin: 0 0 6px; }
        .rd-tones { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .rd-tone { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 999px; padding: 5px 12px; font-size: 12px; color: var(--muted); cursor: pointer; }
        .rd-tone[aria-pressed="true"] { border-color: var(--brand); color: var(--brand); font-weight: 600; }
        .rd-input, .rd-text { width: 100%; box-sizing: border-box; border: 1px solid var(--ink-3); background: var(--surface); color: var(--chalk); border-radius: 10px; font-size: 13.5px; font-family: inherit; padding: 9px 12px; }
        .rd-text { min-height: 110px; resize: vertical; line-height: 1.5; margin-top: 12px; }
        .rd-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
        .rd-btn { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; background: var(--brand); color: #fff; }
        .rd-btn-ghost { background: var(--surface); color: var(--chalk); border: 1px solid var(--ink-3); }
        .rd-btn:disabled { opacity: .55; cursor: not-allowed; }
        .rd-meta { font-size: 11.5px; color: var(--muted); margin-left: auto; }
        .rd-err { color: var(--kick); font-size: 13px; margin-top: 10px; }
        .rd-note { font-size: 11.5px; color: var(--muted); margin-top: 10px; line-height: 1.4; }
        .rd-spin { animation: rdspin 1s linear infinite; } @keyframes rdspin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="rd-bar">
        <button type="button" className="rd-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <MessageSquareReply size={13} /> {open ? "Hide reply" : "Draft reply"}
        </button>
        {children}
      </div>
      {open && (
        <div className="rd-box">
          <div className="rd-label">Tone</div>
          <div className="rd-tones" role="group" aria-label="Tone of the reply">
            {TONES.map((t) => <button key={t.key} type="button" className="rd-tone" aria-pressed={tone === t.key} onClick={() => setTone(t.key)}>{t.label}</button>)}
          </div>
          <div className="rd-label">Anything the reply may say about your app? (optional)</div>
          <input className="rd-input" maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The login bug was fixed in version 2.4.1" aria-label="Note for the reply" />
          <div className="rd-row">
            <button type="button" className="rd-btn" onClick={generate} disabled={loading}>
              {loading ? <Loader2 size={14} className="rd-spin" /> : reply ? <RefreshCw size={14} /> : null}
              {loading ? "Writing…" : reply ? "Write another" : "Write a draft"}
            </button>
          </div>
          {error && <div className="rd-err" role="alert">{error}</div>}
          {reply && (
            <>
              <textarea className="rd-text" value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Draft reply" />
              <div className="rd-row">
                <button type="button" className="rd-btn rd-btn-ghost" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}</button>
                <span className="rd-meta">{reply.length} characters</span>
              </div>
              <div className="rd-note">AI-written draft. Check it before you post it: it can't know your app&apos;s facts beyond your note.</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
