"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Copy, Check, FileText } from "lucide-react";

// "Write my release notes": the tasks you marked done since the last release, picked and turned
// into store-ready "What's new" text. A draft only: it is shown in an editable box and you paste
// it into App Store Connect or the Play Console yourself.
export default function ReleaseNotes({ monitorId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState({});
  const [extra, setExtra] = useState("");
  const [language, setLanguage] = useState("English");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/pulse/monitors/${monitorId}/release-notes`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Could not load.");
        setData(d);
        setPicked(Object.fromEntries(d.tasks.map((t) => [t.key, true])));
      })
      .catch((e) => setError(e.message));
  }, [monitorId]);

  const keys = (data?.tasks || []).filter((t) => picked[t.key]).map((t) => t.key);

  async function write() {
    setBusy(true); setError(""); setCopied(false);
    try {
      const res = await fetch(`/api/pulse/monitors/${monitorId}/release-notes`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskKeys: keys, extra: extra.trim() || undefined, language: language.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Could not write the notes.");
      setNotes(d.notes);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(notes); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* select the text instead */ }
  }

  return (
    <div className="pmd-panel" data-testid="release-notes">
      <div className="pmd-panel-title">Write my release notes</div>
      <div className="rn-sub">
        Built from the tasks you marked done in Tasks since {data?.lastVersion ? `version ${data.lastVersion} was released` : "the last 30 days"}. Pick what to include, add anything else, and get store-ready text.
      </div>
      {!data && !error ? <Loader2 size={16} className="rn-spin" /> : data && (
        <>
          {data.tasks.length === 0 ? (
            <div className="rn-empty">No finished tasks since then. Mark tasks done in Tasks as you ship them, or just describe the changes below.</div>
          ) : (
            <div className="rn-list">
              {data.tasks.map((t) => (
                <label className="rn-item" key={t.key}>
                  <input type="checkbox" checked={!!picked[t.key]} onChange={(e) => setPicked({ ...picked, [t.key]: e.target.checked })} /> {t.title}
                </label>
              ))}
            </div>
          )}
          <label className="rn-label" htmlFor={`rn-extra-${monitorId}`}>Anything else that changed? (optional)</label>
          <textarea id={`rn-extra-${monitorId}`} className="rn-in" rows={2} maxLength={800} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. Dark mode is now available on the settings screen" />
          <div className="rn-row">
            <label className="rn-label" htmlFor={`rn-lang-${monitorId}`}>Language</label>
            <input id={`rn-lang-${monitorId}`} className="rn-lang" maxLength={40} value={language} onChange={(e) => setLanguage(e.target.value)} />
            <button type="button" className="rn-btn" onClick={write} disabled={busy || data.aiAvailable === false || (!keys.length && !extra.trim())}>
              {busy ? <Loader2 size={14} className="rn-spin" /> : <FileText size={14} />} {busy ? "Writing…" : notes ? "Write again" : "Write release notes"}
            </button>
          </div>
        </>
      )}
      {error && <div className="rn-err" role="alert">{error}</div>}
      {notes && (
        <>
          <textarea className="rn-out" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Release notes draft" rows={8} />
          <div className="rn-row">
            <button type="button" className="rn-btn rn-ghost" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}</button>
            <span className="rn-meta" data-over={notes.length > (data?.maxChars || 4000)}>{notes.length} / {data?.maxChars} characters ({data?.store === "play" ? "Google Play" : "App Store"} limit)</span>
          </div>
          <div className="rn-sub">AI-written draft from your finished tasks. Check it before you publish it.</div>
        </>
      )}
      <style>{`
        .rn-sub { font-size: 13px; color: var(--muted); line-height: 1.5; margin: 0 0 12px; }
        .rn-empty { font-size: 13px; color: var(--muted); margin-bottom: 12px; }
        .rn-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .rn-item { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; color: var(--chalk); cursor: pointer; }
        .rn-label { font-size: 12px; font-weight: 600; color: var(--muted); display: block; margin: 4px 0 6px; }
        .rn-in, .rn-out, .rn-lang { width: 100%; box-sizing: border-box; border: 1px solid var(--ink-3); background: var(--surface); color: var(--chalk); border-radius: 10px; font-size: 13.5px; font-family: inherit; padding: 9px 12px; line-height: 1.5; }
        .rn-lang { width: 160px; }
        .rn-out { margin-top: 14px; resize: vertical; }
        .rn-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
        .rn-row .rn-label { margin: 0; }
        .rn-btn { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; background: var(--brand); color: #fff; font-family: inherit; }
        .rn-ghost { background: var(--surface); color: var(--chalk); border: 1px solid var(--ink-3); }
        .rn-btn:disabled { opacity: .55; cursor: not-allowed; }
        .rn-meta { font-size: 12px; color: var(--muted); margin-left: auto; } .rn-meta[data-over="true"] { color: var(--kick); }
        .rn-err { color: var(--kick); font-size: 13px; margin-top: 10px; }
        .rn-spin { animation: rnr 1s linear infinite; } @keyframes rnr { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
