"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, Lightbulb, FileText, Download, Trash2 } from "lucide-react";
import { SkeletonBlock } from "../../components/Skeleton";
import { reportPath } from "../../lib/reportPath";

// One app's work list inside its Checklist box: every issue and suggestion from the latest report, each with
// a status (To do, In progress, Done, Skip). What the person ticks is kept per app, across re-scans.
const STATUSES = [
  { key: "todo", label: "To do" },
  { key: "inprogress", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "wontdo", label: "Skip" },
];

export default function ProjectChecklist({ projectKey, onCounts, onRemoved }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("todo");
  const [saveError, setSaveError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/tasks?project=${encodeURIComponent(projectKey)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Could not load the checklist.");
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [projectKey]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (data && onCounts) onCounts(data.counts); }, [data, onCounts]);

  // Optimistic: the item moves at once; rolled back if the server refuses.
  const setStatus = async (key, status) => {
    const before = data;
    setSaveError("");
    setData((d) => {
      const tasks = d.tasks.map((t) => (t.key === key ? { ...t, status, reappeared: false } : t));
      const counts = { ...d.counts, todo: 0, inprogress: 0, done: 0, wontdo: 0 };
      for (const t of tasks) counts[t.status] += 1;
      return { ...d, tasks, counts };
    });
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project: projectKey, key, status }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Could not save.");
    } catch (e) {
      setData(before);
      setSaveError(e.message);
    }
  };

  // Takes the app off the Checklist (its ticks are deleted; the reports stay and it comes back, fresh, with the next report).
  const remove = async () => {
    setBusy(true); setSaveError("");
    try {
      const res = await fetch("/api/tasks", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ projects: [projectKey] }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Could not remove it.");
      if (onRemoved) onRemoved();
    } catch (e) { setSaveError(e.message); setBusy(false); setConfirmRemove(false); }
  };

  const css = `
    .pt-meta { font-size: 13px; color: var(--muted); margin-bottom: 24px; display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
    .pt-meta a { color: var(--brand); text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
    .pt-export { display: inline-flex; align-items: center; gap: 8px; }
    .pt-export a { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 999px; padding: 3px 12px; font-size: 12px; color: var(--chalk); }
    .pt-export a:hover { border-color: var(--brand); text-decoration: none; }
    .pt-progress { margin-bottom: 24px; }
    .pt-progress-text { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
    .pt-progress-text b { color: var(--teal); font-family: var(--font-mono); }
    .pt-bar { height: 6px; border-radius: 999px; background: var(--ink-3); overflow: hidden; }
    .pt-bar-fill { height: 100%; background: var(--teal); border-radius: 999px; transition: width .25s ease; }
    .pt-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .pt-tab { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 999px; padding: 9px 16px; font-size: 13px; color: var(--muted); cursor: pointer; }
    .pt-tab:hover { border-color: var(--brand); }
    .pt-tab-on { background: var(--ink-3); border-color: var(--brand); color: var(--chalk); font-weight: 600; }
    .pt-tab-n { font-family: var(--font-mono); font-size: 11px; opacity: .7; margin-left: 6px; }
    .pt-list { display: flex; flex-direction: column; gap: 12px; }
    .pt-task { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 16px 18px; }
    .pt-task-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .pt-task-title { font-weight: 600; font-size: 15px; color: var(--chalk); }
    .pt-pill { font-size: 11px; font-family: var(--font-mono); border-radius: 999px; padding: 2px 8px; background: var(--ink-3); color: var(--muted); }
    .pt-pill-bad { color: var(--kick); background: color-mix(in srgb, var(--kick) 14%, transparent); }
    .pt-pill-warn { color: var(--yellow); background: color-mix(in srgb, var(--yellow) 14%, transparent); }
    .pt-pill-new { color: var(--brand); background: color-mix(in srgb, var(--brand) 14%, transparent); }
    .pt-text { font-size: 13.5px; line-height: 1.5; color: var(--muted); margin: 0 0 8px; }
    .pt-sugg { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; line-height: 1.45; color: var(--chalk); background: var(--ink); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; }
    .pt-sugg svg { flex-shrink: 0; margin-top: 2px; }
    .pt-seg { display: inline-flex; border: 1px solid var(--ink-3); border-radius: 999px; overflow: hidden; }
    .pt-seg button { background: transparent; border: 0; padding: 7px 14px; font-size: 12.5px; color: var(--muted); cursor: pointer; }
    .pt-seg button + button { border-left: 1px solid var(--ink-3); }
    .pt-seg button:hover { color: var(--chalk); }
    .pt-seg button[aria-pressed="true"] { background: color-mix(in srgb, var(--brand) 16%, transparent); color: var(--brand); font-weight: 600; }
    .pt-empty { text-align: center; padding: 56px 24px; color: var(--muted); border: 1px dashed var(--ink-3); border-radius: 12px; }
    .pt-verified { margin-top: 32px; }
    .pt-verified h2 { font-size: 15px; font-weight: 600; color: var(--chalk); margin: 0 0 4px; }
    .pt-verified p { font-size: 13px; color: var(--muted); margin: 0 0 12px; }
    .pt-ver-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--chalk); padding: 10px 14px; border-radius: 8px; background: color-mix(in srgb, var(--teal) 10%, var(--surface)); margin-bottom: 8px; }
    .pt-err { color: var(--kick); font-size: 13px; margin-bottom: 12px; }
    .pt-remove { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 0; color: var(--muted); font: inherit; font-size: 13px; cursor: pointer; margin-left: auto; }
    .pt-remove:hover { color: var(--kick); }
    .pt-confirm { display: inline-flex; gap: 8px; align-items: center; margin-left: auto; font-size: 13px; color: var(--chalk); }
    .pt-confirm button { border: 1px solid var(--ink-3); background: var(--surface); color: var(--chalk); border-radius: 999px; padding: 4px 12px; font: inherit; font-size: 12.5px; cursor: pointer; }
    .pt-confirm .pt-danger { background: var(--kick); border-color: var(--kick); color: #fff; }
    .pt-bar-fill { background: var(--teal); }
    .pt-bar-wip { height: 100%; background: var(--brand); transition: width .25s ease; }
    .pt-bar { display: flex; }
    .pt-seg button { padding: 7px 12px; }
    @media (max-width: 700px) { .pt-seg { flex-wrap: wrap; } }
  `;

  if (error) return <div className="pt-empty" role="alert"><style>{css}</style>{error}</div>;
  if (!data) return <div><style>{css}</style><SkeletonBlock height={24} width={260} radius={8} /><div style={{ height: 16 }} /><SkeletonBlock height={120} radius={12} /></div>;

  const { project, tasks, verified, counts } = data;
  const total = counts.todo + counts.inprogress + counts.done + counts.wontdo;
  const pct = total ? Math.round((counts.done / total) * 100) : 0;
  const wipPct = total ? Math.round((counts.inprogress / total) * 100) : 0;
  const shown = tasks.filter((t) => t.status === tab);
  const emptyText = {
    todo: total === 0 ? "No open issues in the latest report. Nothing to do." : "Nothing left to start. Nice.",
    inprogress: "Nothing in progress.",
    done: "Nothing marked done yet.",
    wontdo: "Nothing skipped.",
  }[tab];

  return (
    <div data-testid="project-checklist">
      <style>{css}</style>
      <div className="pt-meta">
        <span>From the latest of {project.reportCount} {project.reportCount === 1 ? "report" : "reports"} · {new Date(project.latestScanDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        <Link href={reportPath(project.latestScanId, project.appName)}><FileText size={14} /> Open the report</Link>
        <span className="pt-export" data-testid="export-links">
          <Download size={14} /> Export
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=md`} download>Markdown</a>
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=csv`} download>CSV</a>
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=linear`} download title="CSV for Linear's importer: unfinished items only">Linear</a>
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=jira`} download title="CSV for Jira's importer: unfinished items only">Jira</a>
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=github`} download title="A script that files the unfinished items as GitHub issues with the gh CLI">GitHub issues</a>
        </span>
        {confirmRemove ? (
          <span className="pt-confirm" role="alertdialog" aria-label="Remove this app from the checklist">
            Remove {project.appName} and its progress?
            <button type="button" className="pt-danger" disabled={busy} onClick={remove}>Remove</button>
            <button type="button" disabled={busy} onClick={() => setConfirmRemove(false)}>Cancel</button>
          </span>
        ) : (
          <button type="button" className="pt-remove" onClick={() => setConfirmRemove(true)}><Trash2 size={13} /> Remove from checklist</button>
        )}
      </div>

      {total > 0 && (
        <div className="pt-progress" data-testid="project-progress">
          <div className="pt-progress-text"><b>{counts.done}</b> of {total} done{counts.inprogress > 0 ? ` · ${counts.inprogress} in progress` : ""}{counts.wontdo > 0 ? ` · ${counts.wontdo} skipped` : ""}</div>
          <div className="pt-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div className="pt-bar-fill" style={{ width: `${pct}%` }} /><div className="pt-bar-wip" style={{ width: `${wipPct}%` }} /></div>
        </div>
      )}

      <div className="pt-tabs" role="tablist">
        {STATUSES.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`pt-tab ${tab === t.key ? "pt-tab-on" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}<span className="pt-tab-n">{counts[t.key]}</span>
          </button>
        ))}
      </div>
      {saveError && <div className="pt-err" role="alert">{saveError}</div>}

      {shown.length === 0 ? (
        <div className="pt-empty">{emptyText}</div>
      ) : (
        <div className="pt-list">
          {shown.map((t) => (
            <div className="pt-task" key={t.key} data-testid={`task-${t.key}`}>
              <div className="pt-task-top">
                <span className="pt-task-title">{t.title}</span>
                <span className={`pt-pill ${t.severity === "bad" ? "pt-pill-bad" : "pt-pill-warn"}`}>{t.severity === "bad" ? "Critical" : "Attention"}</span>
                {t.isNew && <span className="pt-pill pt-pill-new">New</span>}
                {t.reappeared && <span className="pt-pill pt-pill-bad">Came back</span>}
                {t.source === "review" && <span className="pt-pill pt-pill-new">From reviews</span>}
              </div>
              <p className="pt-text">{t.finding}</p>
              {t.suggestion && <div className="pt-sugg"><Lightbulb size={13} color="var(--yellow)" /><span>{t.suggestion}</span></div>}
              <div className="pt-seg" role="group" aria-label={`Status of ${t.title}`}>
                {STATUSES.map((s) => (
                  <button key={s.key} type="button" aria-pressed={t.status === s.key} onClick={() => t.status !== s.key && setStatus(t.key, s.key)}>{s.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {verified.length > 0 && (
        <div className="pt-verified" data-testid="verified">
          <h2>Fixed, confirmed by a newer scan</h2>
          <p>The latest report no longer flags these.</p>
          {verified.map((v) => (
            <div className="pt-ver-row" key={v.key}><CheckCircle2 size={16} color="var(--teal)" /> {v.title}</div>
          ))}
        </div>
      )}
    </div>
  );
}
