"use client";

import React, { useState } from "react";
import { Loader2, Languages, Copy, Check } from "lucide-react";
import { LANGUAGES } from "../lib/listingTranslate";
import { STORES } from "../lib/submissionCheck";

// Translates the checklist draft into another language, field by field, inside the store's limits.
export default function ListingTranslate({ store, fields }) {
  const [lang, setLang] = useState("es");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const spec = STORES[store];

  async function run() {
    setBusy(true); setError(""); setRes(null);
    try {
      const r = await fetch("/api/listing/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ store, language: lang, fields }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not translate.");
      setRes(d);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function copy(key, text) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch {}
  }

  return (
    <section className="lt-card" aria-label="Translate listing" data-testid="listing-translate">
      <div className="lt-title"><Languages size={16} /> Translate this listing</div>
      <div className="lt-sub">Rewrites your draft in another language, keeping each field inside the store&apos;s limit. Have a native speaker read it before you publish.</div>
      <div className="lt-row">
        <label htmlFor="lt-lang" className="lt-sr">Language</label>
        <select id="lt-lang" className="lt-sel" value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGUAGES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        <button type="button" className="lt-btn" onClick={run} disabled={busy}>{busy ? <Loader2 size={14} className="lt-spin" /> : <Languages size={14} />} Translate</button>
      </div>
      {error && <div className="lt-err" role="alert">{error}</div>}
      {res && spec.fields.filter((f) => res.fields[f.key]).map((f) => {
        const t = res.fields[f.key]; const n = [...t].length; const over = res.over.includes(f.key);
        return (
          <div className="lt-out" key={f.key} data-testid={`lt-${f.key}`}>
            <div className="lt-lab">{f.label}<span className={over ? "lt-over" : "lt-cnt"}>{n}/{f.max}{over ? " · too long, shorten it" : ""}</span></div>
            <div className="lt-text">{t}</div>
            <button type="button" className="lt-copy" onClick={() => copy(f.key, t)}>{copied === f.key ? <Check size={13} /> : <Copy size={13} />} {copied === f.key ? "Copied" : "Copy"}</button>
          </div>
        );
      })}
      <style>{`
        .lt-card { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 20px; margin-top: 24px; }
        .lt-title { display: flex; gap: 8px; align-items: center; font-weight: 600; color: var(--chalk); }
        .lt-sub { font-size: 13px; color: var(--muted); line-height: 1.5; margin: 6px 0 14px; }
        .lt-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .lt-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
        .lt-sel { height: 34px; border-radius: 9px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); padding: 0 10px; font: inherit; font-size: 13px; }
        .lt-btn { display: inline-flex; gap: 6px; align-items: center; height: 34px; padding: 0 14px; border-radius: 9px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
        .lt-btn:disabled { opacity: .5; cursor: default; }
        .lt-out { border-top: 1px solid var(--ink-3); margin-top: 14px; padding-top: 12px; }
        .lt-lab { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 600; color: var(--chalk); margin-bottom: 6px; }
        .lt-cnt { font-family: var(--font-mono); font-weight: 400; color: var(--muted); font-size: 12px; }
        .lt-over { font-family: var(--font-mono); font-weight: 600; color: var(--kick); font-size: 12px; }
        .lt-text { white-space: pre-wrap; font-size: 14px; color: var(--chalk); line-height: 1.5; }
        .lt-copy { display: inline-flex; gap: 5px; align-items: center; margin-top: 8px; border: 0; background: none; color: var(--teal); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 0; }
        .lt-err { color: var(--kick); font-size: 13px; margin-top: 10px; }
        .lt-spin { animation: lt-rot 1s linear infinite; } @keyframes lt-rot { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
