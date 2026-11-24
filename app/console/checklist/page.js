"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, Circle, ChevronRight } from "lucide-react";
import AppIcon from "../../components/AppIcon";
import { STORES, checkSubmission } from "../../lib/submissionCheck";
import ListingTranslate from "../../components/ListingTranslate";
import AppChecklist from "./AppChecklist";

const KEY = "kma-submission-draft-v1"; // before: one draft for everyone; now one per app (KEY:<project key>)
const ICON = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle, todo: Circle, info: Circle };

// One app's whole checklist: what Tasks and your pins say, your own items, and its store listing draft.
function AppPanel({ pk, onCount }) {
  const [draft, setDraft] = useState({ store: "apple", fields: {}, screenshots: "", confirms: {} });
  const [loaded, setLoaded] = useState(false);

  // Each app has its own draft, kept in this browser. The one old shared draft goes to the first app that opens.
  useEffect(() => {
    if (!pk) return;
    setLoaded(false);
    try {
      let raw = localStorage.getItem(`${KEY}:${pk}`);
      if (raw === null && localStorage.getItem(KEY) !== null) { raw = localStorage.getItem(KEY); localStorage.removeItem(KEY); }
      const saved = JSON.parse(raw || "null");
      setDraft({ store: "apple", fields: {}, screenshots: "", confirms: {}, ...(saved && typeof saved === "object" ? saved : {}) });
    } catch { setDraft({ store: "apple", fields: {}, screenshots: "", confirms: {} }); }
    setLoaded(true);
  }, [pk]);
  useEffect(() => {
    if (!loaded || !pk) return;
    try { localStorage.setItem(`${KEY}:${pk}`, JSON.stringify(draft)); } catch {}
  }, [draft, loaded, pk]);

  const spec = STORES[draft.store] || STORES.apple;
  const result = useMemo(() => checkSubmission({ ...draft, screenshots: draft.screenshots === "" ? 0 : Number(draft.screenshots) }), [draft]);
  const setField = (k, v) => setDraft((d) => ({ ...d, fields: { ...d.fields, [k]: v } }));
  const toggle = (k) => setDraft((d) => ({ ...d, confirms: { ...d.confirms, [k]: !d.confirms[k] } }));
  const groups = ["Listing text", "Screenshots", "Before you submit"];
  const s = result.summary;

  return (
    <>
      <AppChecklist projectKey={pk} onCount={onCount} />

      <>
      <div className="cl-grid">
        <section className="cl-card" aria-label="Draft">
          <div className="cl-tabs">
            {Object.entries(STORES).map(([k, v]) => (
              <button key={k} type="button" className="cl-tab" aria-pressed={draft.store === k} onClick={() => setDraft((d) => ({ ...d, store: k, confirms: {} }))}>{v.label}</button>
            ))}
          </div>
          {spec.fields.map((f) => {
            const v = draft.fields[f.key] || "";
            const n = v.trim().length;
            return (
              <div className="cl-field" key={f.key}>
                <label htmlFor={`cl-${f.key}`}>{f.label}{f.required ? " *" : ""}<span className={`cl-count ${n > f.max ? "cl-over" : ""}`}>{n}/{f.max}</span></label>
                {f.long ? (
                  <textarea id={`cl-${f.key}`} className="cl-input" rows={4} value={v} onChange={(e) => setField(f.key, e.target.value)} />
                ) : (
                  <input id={`cl-${f.key}`} className="cl-input" value={v} onChange={(e) => setField(f.key, e.target.value)} />
                )}
              </div>
            );
          })}
          <div className="cl-field">
            <label htmlFor="cl-shots">Number of screenshots ({spec.screenshots.min}–{spec.screenshots.max})</label>
            <input id="cl-shots" className="cl-input" type="number" min="0" max="50" value={draft.screenshots} onChange={(e) => setDraft((d) => ({ ...d, screenshots: e.target.value }))} />
          </div>
          <div className="cl-group" style={{ marginTop: 20 }}>Confirm</div>
          {spec.confirms.map((q) => (
            <label className="cl-check" key={q.key}>
              <input type="checkbox" checked={!!draft.confirms[q.key]} onChange={() => toggle(q.key)} /> {q.label}
            </label>
          ))}
        </section>

        <section className="cl-card" aria-label="Result" data-testid="checklist-result">
          <div className="cl-sum" data-testid="checklist-verdict">{s.verdict}</div>
          <div className="cl-chips">
            <span className="cl-chip"><b>{s.fail}</b> to fix</span>
            <span className="cl-chip"><b>{s.warn}</b> to look at</span>
            <span className="cl-chip"><b>{s.todo}</b> to confirm</span>
            <span className="cl-chip"><b>{s.pass}</b> ok</span>
          </div>
          {groups.map((g) => {
            const list = result.items.filter((i) => i.group === g && (g !== "Before you submit" || i.status !== "pass"));
            if (!list.length) return null;
            return (
              <div key={g}>
                <div className="cl-group">{g}</div>
                {list.map((i) => {
                  const Icon = ICON[i.status];
                  return (
                    <div className={`cl-item cl-${i.status}`} key={i.id} data-status={i.status}>
                      <Icon size={16} aria-hidden />
                      <div>{i.title}{i.detail && <small>{i.detail}</small>}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="cl-note">These are the stores&apos; published field limits and the most common reasons listings get sent back. Passing them doesn&apos;t guarantee approval. The review guidelines are the final word.</div>
        </section>
      </div>
      <ListingTranslate store={draft.store} fields={draft.fields} />
      </>
    </>
  );
}

const STYLES = `
        .cl-page { padding: 0 0 120px; max-width: 1120px; margin: 0 auto; }
        .cl-page h1 { margin: 0 0 8px; font-family: Helvetica, Arial, sans-serif; font-size: 48px; line-height: 52px; font-weight: 700; letter-spacing: -1.44px; color: var(--chalk); }
        .cl-lede { margin: 0 0 50px; font-size: 15px; line-height: 32px; letter-spacing: -0.2px; font-weight: 400; color: var(--muted); max-width: 720px; }
        .cl-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: start; }
        .cl-card { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 20px; }
        .cl-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .cl-tab { height: 34px; padding: 0 14px; border-radius: 9px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--muted); font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
        .cl-tab[aria-pressed="true"] { color: var(--chalk); border-color: var(--brand); }
        .cl-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
        .cl-field label { font-size: 13px; color: var(--chalk); font-weight: 600; display: flex; justify-content: space-between; gap: 8px; }
        .cl-count { font-family: var(--font-mono); font-weight: 400; color: var(--muted); font-size: 12px; }
        .cl-over { color: var(--kick); }
        .cl-input { border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 14px; width: 100%; box-sizing: border-box; }
        .cl-sum { font-size: 16px; font-weight: 600; color: var(--chalk); margin-bottom: 4px; }
        .cl-chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 16px; }
        .cl-chip { font-size: 12px; border-radius: 999px; padding: 4px 10px; background: var(--ink); color: var(--muted); font-family: var(--font-mono); }
        .cl-chip b { color: var(--chalk); }
        .cl-group { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 16px 0 6px; }
        .cl-item { display: flex; gap: 10px; padding: 8px 0; border-top: 1px solid var(--ink-3); font-size: 14px; color: var(--chalk); }
        .cl-item small { display: block; color: var(--muted); font-size: 12.5px; line-height: 1.45; margin-top: 2px; }
        .cl-pass svg { color: var(--teal); } .cl-warn svg { color: var(--yellow); } .cl-fail svg { color: var(--kick); } .cl-todo svg, .cl-info svg { color: var(--muted); }
        .cl-item svg { flex: none; margin-top: 2px; }
        .cl-check { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; font-size: 14px; color: var(--chalk); cursor: pointer; }
        .cl-note { font-size: 12px; color: var(--muted); margin-top: 14px; line-height: 1.5; }
        @media (max-width: 900px) { .cl-page { padding: 0 0 96px; } .cl-page h1 { font-size: 34px; line-height: 40px; letter-spacing: -1px; } .cl-grid { grid-template-columns: 1fr; } }
      
        .cl-list { display: flex; flex-direction: column; gap: 12px; }
        .cl-box { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 8px; }
        .cl-box-open { border-color: color-mix(in srgb, var(--brand) 40%, var(--ink-3)); }
        .cl-box-card { padding: 20px 24px; display: flex; align-items: center; gap: 16px; cursor: pointer; border-radius: 8px; color: inherit; }
        .cl-box-card:hover { background: rgba(255, 255, 255, 0.03); }
        .cl-box-card:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; }
        .cl-chev { color: var(--muted); flex-shrink: 0; transition: transform .15s ease; }
        .cl-chev-open { transform: rotate(90deg); }
        .cl-box-main { flex: 1; min-width: 0; }
        .cl-box-name { font-size: 16px; font-weight: 600; color: var(--chalk); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cl-box-meta { font-size: 13px; color: var(--muted); margin-top: 2px; }
        .cl-badge { flex-shrink: 0; font-size: 12px; font-weight: 600; border-radius: 999px; padding: 4px 11px; background: color-mix(in srgb, var(--kick) 16%, transparent); color: var(--kick); }
        .cl-badge-ok { background: color-mix(in srgb, var(--teal) 16%, transparent); color: var(--teal); }
        .cl-box-body { border-top: 1px solid var(--ink-3); padding: 24px; }
        .cl-link { font-size: 12.5px; color: var(--brand); text-decoration: none; white-space: nowrap; }
        .cl-link:hover { text-decoration: underline; }
        .cl-empty { font-size: 13.5px; color: var(--muted); line-height: 1.5; }
        @media (max-width: 900px) { .cl-box-card { padding: 16px; } .cl-box-body { padding: 16px; } }
`;

export default function ChecklistPage() {
  const [projects, setProjects] = useState(null); // one per app the person made a report of
  const [openKey, setOpenKey] = useState(null);
  const [counts, setCounts] = useState({}); // project key -> how many items are still open

  useEffect(() => {
    fetch("/api/checklist").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d.projects) ? d.projects : [];
      setProjects(list);
      setCounts(Object.fromEntries(list.map((p) => [p.key, p.open])));
    }).catch(() => setProjects([]));
  }, []);

  return (
    <main className="cl-page">
      <style>{STYLES}</style>
      <h1>Pre-submission checklist</h1>
      <p className="cl-lede">Every app you made a report of has its own checklist. Open one to see what still blocks a release, then fill in its store listing draft and tick what you have confirmed. Each app's listing draft stays in this browser; pinned and your own items are saved to your account.</p>

      {projects === null ? null : projects.length === 0 ? (
        <section className="cl-card" data-testid="app-checklist">
          <p className="cl-empty" style={{ margin: 0 }}>Every app you make a report of gets its own checklist: its critical issues, the findings you pin and a store listing check. Make a report first, then come back here. <Link href="/console" className="cl-link">Make a report</Link></p>
        </section>
      ) : (
        <div className="cl-list">
          {projects.map((p) => {
            const isOpen = openKey === p.key;
            const n = counts[p.key] ?? p.open;
            return (
              <div key={p.key} className={`cl-box ${isOpen ? "cl-box-open" : ""}`} data-testid="checklist-box">
                <div
                  className="cl-box-card"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => setOpenKey(isOpen ? null : p.key)}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); setOpenKey(isOpen ? null : p.key); } }}
                >
                  <ChevronRight size={18} className={`cl-chev ${isOpen ? "cl-chev-open" : ""}`} />
                  <AppIcon name={p.appName} storeUrl={p.storeUrl} iconUrl={p.iconUrl} size={44} radius={12} />
                  <div className="cl-box-main">
                    <div className="cl-box-name">{p.appName}</div>
                    <div className="cl-box-meta">{n === 0 ? "Nothing open" : `${n} still open`}</div>
                  </div>
                  <span className={`cl-badge ${n === 0 ? "cl-badge-ok" : ""}`} data-testid="checklist-badge">{n === 0 ? "All clear" : `${n} open`}</span>
                </div>
                {isOpen && (
                  <div className="cl-box-body">
                    <AppPanel pk={p.key} onCount={(c) => setCounts((o) => ({ ...o, [p.key]: c }))} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
