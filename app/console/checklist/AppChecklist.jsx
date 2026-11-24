"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, MinusCircle, Plus, X, ListChecks } from "lucide-react";

// The per-app part of the Checklist: what still blocks a release for the app you pick.
//  - Critical issues: open critical tasks, read live from Tasks (tick them there and they leave this list).
//  - From your reports: findings you pinned with "Add to Checklist" on a report, with their state from Tasks.
//  - Your own items: anything you want to remember before submitting.
const APP_KEY = "kma-checklist-app-v1";

export default function AppChecklist() {
  const [projects, setProjects] = useState(null);
  const [key, setKey] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/checklist").then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) throw new Error(d.error || "Could not load your apps.");
      setProjects(d.projects);
      let saved = "";
      try { saved = localStorage.getItem(APP_KEY) || ""; } catch {}
      setKey(d.projects.some((p) => p.key === saved) ? saved : d.projects[0]?.key || "");
    }).catch((e) => { setError(e.message); setProjects([]); });
  }, []);

  const load = useCallback((k) => {
    if (!k) return;
    fetch(`/api/checklist?project=${encodeURIComponent(k)}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) throw new Error(d.error || "Could not load the checklist.");
      setData(d); setError("");
    }).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { setData(null); load(key); }, [key, load]);

  async function call(method, body) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/checklist", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Something went wrong.");
      load(key);
      return true;
    } catch (e) { setError(e.message); return false; } finally { setBusy(false); }
  }
  // Show the tick at once; the server's answer confirms it (and puts it back if it failed).
  async function tick(id, checked) {
    setData((d) => ({ ...d, custom: d.custom.map((c) => (c.id === id ? { ...c, checked } : c)) }));
    if (!(await call("PATCH", { id, checked }))) load(key);
  }
  async function add(e) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    if (await call("POST", { projectKey: key, title })) setTitle("");
  }

  if (projects === null) return null;
  const pick = (k) => { setKey(k); try { localStorage.setItem(APP_KEY, k); } catch {} };
  const open = data ? data.critical.length + data.pinned.filter((p) => p.status === "todo").length + data.custom.filter((c) => !c.checked).length : 0;

  return (
    <section className="cl-card cl-app" aria-label="Your app" data-testid="app-checklist">
      <style>{`
        .cl-app { margin-bottom: 24px; }
        .cl-app-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
        .cl-app-title { font-size: 16px; font-weight: 600; color: var(--chalk); display: flex; align-items: center; gap: 8px; margin-right: auto; }
        .cl-app-select { border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 14px; max-width: 100%; }
        .cl-app-sub { font-size: 13px; color: var(--muted); margin: 0 0 12px; line-height: 1.5; }
        .cl-app-sum { font-size: 13px; color: var(--muted); margin-bottom: 4px; }
        .cl-app-sum b { color: var(--chalk); }
        .cl-row { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-top: 1px solid var(--ink-3); font-size: 14px; color: var(--chalk); }
        .cl-row small { display: block; color: var(--muted); font-size: 12.5px; line-height: 1.45; margin-top: 2px; }
        .cl-row svg { flex: none; margin-top: 2px; }
        .cl-row-body { flex: 1; min-width: 0; }
        .cl-row-done .cl-row-title { text-decoration: line-through; color: var(--muted); }
        .cl-row-fail svg { color: var(--kick); } .cl-row-ok svg { color: var(--teal); } .cl-row-skip svg { color: var(--muted); }
        .cl-x { background: none; border: 0; color: var(--muted); cursor: pointer; padding: 2px; border-radius: 6px; line-height: 0; }
        .cl-x:hover { color: var(--chalk); }
        .cl-link { font-size: 12.5px; color: var(--brand); text-decoration: none; white-space: nowrap; }
        .cl-link:hover { text-decoration: underline; }
        .cl-add { display: flex; gap: 8px; margin-top: 12px; }
        .cl-add .cl-input { flex: 1; }
        .cl-add-btn { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 8px; padding: 0 14px; background: var(--brand); color: #fff; font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
        .cl-add-btn:disabled { opacity: .55; cursor: default; }
        .cl-err { color: var(--kick); font-size: 13px; margin-top: 8px; }
        .cl-empty { font-size: 13.5px; color: var(--muted); line-height: 1.5; }
      `}</style>
      <div className="cl-app-head">
        <div className="cl-app-title"><ListChecks size={17} /> Your app</div>
        {projects.length > 0 && (
          <select className="cl-app-select" aria-label="App" value={key} onChange={(e) => pick(e.target.value)}>
            {projects.map((p) => <option key={p.key} value={p.key}>{p.appName}{p.openCritical ? ` (${p.openCritical} critical open)` : ""}</option>)}
          </select>
        )}
      </div>
      {projects.length === 0 ? (
        <p className="cl-empty">Make a report of your app and its critical issues show up here, ready to tick off before you submit. <Link href="/console" className="cl-link">Make a report</Link></p>
      ) : !data ? (
        error ? <div className="cl-err" role="alert">{error}</div> : null
      ) : (
        <>
          <p className="cl-app-sub">Critical issues from your latest report, findings you pinned, and your own items. Tick issues off in Tasks and they update here.</p>
          <div className="cl-app-sum" data-testid="app-checklist-summary">{open === 0 ? <><b>All clear</b> for {data.project.appName}: nothing open here.</> : <><b>{open}</b> still open for {data.project.appName}.</>}</div>

          <div className="cl-group">Critical issues still open</div>
          {data.critical.length === 0 ? <div className="cl-empty" data-testid="critical-none">{data.criticalTotal > 0 ? "All critical issues are dealt with in Tasks." : "No critical issues in the latest report."}</div> : data.critical.map((c) => (
            <div className="cl-row cl-row-fail" key={c.key} data-testid="critical-item">
              <Circle size={16} aria-hidden />
              <div className="cl-row-body"><span className="cl-row-title">{c.title}</span>{c.suggestion && <small>{c.suggestion}</small>}</div>
              <Link href={data.tasksHref} className="cl-link">Open in Tasks</Link>
            </div>
          ))}

          {data.pinned.length > 0 && <div className="cl-group">From your reports</div>}
          {data.pinned.map((p) => {
            const done = p.status === "done", skip = p.status === "wontdo";
            const Icon = done ? CheckCircle2 : skip ? MinusCircle : Circle;
            return (
              <div className={`cl-row ${done ? "cl-row-ok cl-row-done" : skip ? "cl-row-skip cl-row-done" : "cl-row-fail"}`} key={p.id} data-testid="pinned-item" data-status={p.status}>
                <Icon size={16} aria-hidden />
                <div className="cl-row-body"><span className="cl-row-title">{p.title}</span><small>{done ? (p.confirmedByScan ? "Fixed: your latest report no longer shows it." : "Done in Tasks.") : skip ? "Marked won't do in Tasks." : "Still open in Tasks."}</small></div>
                {!done && !skip && <Link href={data.tasksHref} className="cl-link">Open in Tasks</Link>}
                <button type="button" className="cl-x" aria-label={`Remove ${p.title}`} onClick={() => call("DELETE", { id: p.id })}><X size={14} /></button>
              </div>
            );
          })}

          <div className="cl-group">Your own items</div>
          {data.custom.map((c) => (
            <div className={`cl-row ${c.checked ? "cl-row-done" : ""}`} key={c.id} data-testid="custom-item">
              <input type="checkbox" checked={c.checked} aria-label={c.title} style={{ marginTop: 3 }} onChange={(e) => tick(c.id, e.target.checked)} />
              <div className="cl-row-body"><span className="cl-row-title">{c.title}</span></div>
              <button type="button" className="cl-x" aria-label={`Remove ${c.title}`} onClick={() => call("DELETE", { id: c.id })}><X size={14} /></button>
            </div>
          ))}
          <form className="cl-add" onSubmit={add}>
            <input className="cl-input" maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add an item, e.g. Re-record the onboarding screenshots" aria-label="New checklist item" />
            <button type="submit" className="cl-add-btn" disabled={busy || !title.trim()}><Plus size={14} /> Add</button>
          </form>
          {error && <div className="cl-err" role="alert">{error}</div>}
        </>
      )}
    </section>
  );
}
