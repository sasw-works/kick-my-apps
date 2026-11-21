"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lightbulb, FileText, Download } from "lucide-react";
import AppIcon from "../../../components/AppIcon";
import { SkeletonBlock } from "../../../components/Skeleton";
import { reportPath } from "../../../lib/reportPath";

const TABS = [
  { key: "todo", label: "To do" },
  { key: "done", label: "Done" },
  { key: "wontdo", label: "Won't do" },
];

export default function ProjectTasksPage() {
  const params = useParams();
  const projectKey = decodeURIComponent(String(params.project || ""));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("todo");
  const [saveError, setSaveError] = useState("");

  const load = useCallback(() => {
    fetch(`/api/tasks?project=${encodeURIComponent(projectKey)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Could not load tasks.");
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [projectKey]);

  useEffect(() => { load(); }, [load]);

  // Optimistic: the task moves at once; rolled back if the server refuses.
  const setStatus = async (key, status) => {
    const before = data;
    setSaveError("");
    setData((d) => {
      const tasks = d.tasks.map((t) => (t.key === key ? { ...t, status, reappeared: false } : t));
      const counts = { ...d.counts, todo: 0, done: 0, wontdo: 0 };
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

  const css = `
    .pt-page { padding: 0 0 120px; max-width: 1120px; margin: 0 auto; }
    .pt-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); text-decoration: none; margin-bottom: 20px; }
    .pt-back:hover { color: var(--chalk); }
    .pt-head { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
    .pt-head h1 { margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 40px; line-height: 46px; font-weight: 700; letter-spacing: -1.2px; color: var(--chalk); }
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
    @media (max-width: 900px) { .pt-page { padding: 0 0 96px; } .pt-head h1 { font-size: 30px; line-height: 36px; } }
  `;

  if (error) {
    return (
      <main className="pt-page"><style>{css}</style>
        <Link href="/console/tasks" className="pt-back"><ArrowLeft size={14} /> All projects</Link>
        <div className="pt-empty" role="alert">{error}</div>
      </main>
    );
  }
  if (!data) {
    return <main className="pt-page"><style>{css}</style><SkeletonBlock height={40} width={260} radius={8} /><div style={{ height: 16 }} /><SkeletonBlock height={160} radius={12} /></main>;
  }

  const { project, tasks, verified, counts } = data;
  const total = counts.todo + counts.done + counts.wontdo;
  const pct = total ? Math.round((counts.done / total) * 100) : 0;
  const shown = tasks.filter((t) => t.status === tab);
  const emptyText = {
    todo: total === 0 ? "No open issues in the latest report. Nothing to do." : "Everything is done or set aside. Nice.",
    done: "Nothing marked done yet.",
    wontdo: "Nothing set aside.",
  }[tab];

  return (
    <main className="pt-page">
      <style>{css}</style>
      <Link href="/console/tasks" className="pt-back"><ArrowLeft size={14} /> All projects</Link>
      <div className="pt-head">
        <AppIcon name={project.appName} storeUrl={project.storeUrl} size={48} />
        <h1>{project.appName}</h1>
      </div>
      <div className="pt-meta">
        <span>From the latest of {project.reportCount} {project.reportCount === 1 ? "report" : "reports"} · {new Date(project.latestScanDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        <Link href={reportPath(project.latestScanId, project.appName)}><FileText size={14} /> Open the report</Link>
        <span className="pt-export" data-testid="export-links">
          <Download size={14} /> Export
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=md`} download>Markdown</a>
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=csv`} download>CSV</a>
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=linear`} download title="CSV for Linear's importer: open tasks only">Linear</a>
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=jira`} download title="CSV for Jira's importer: open tasks only">Jira</a>
          <a href={`/api/tasks/export?project=${encodeURIComponent(project.key)}&format=github`} download title="A script that files the open tasks as GitHub issues with the gh CLI">GitHub issues</a>
        </span>
      </div>

      {total > 0 && (
        <div className="pt-progress" data-testid="project-progress">
          <div className="pt-progress-text"><b>{counts.done}</b> of {total} done{counts.wontdo > 0 ? ` · ${counts.wontdo} won't do` : ""}</div>
          <div className="pt-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div className="pt-bar-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      )}

      <div className="pt-tabs" role="tablist">
        {TABS.map((t) => (
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
                {TABS.map((s) => (
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
    </main>
  );
}
