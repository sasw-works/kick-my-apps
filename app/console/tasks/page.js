"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import AppIcon from "../../components/AppIcon";
import { SkeletonBlock } from "../../components/Skeleton";

export default function TasksPage() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Could not load tasks.");
        setProjects(d.projects || []);
      })
      .catch((e) => { setError(e.message); setProjects([]); });
  }, []);

  return (
    <main className="tasks-page">
      <style>{`
        .tasks-page { padding: 0 0 120px; max-width: 1120px; margin: 0 auto; }
        .tasks-page h1 { margin: 0 0 8px; font-family: Helvetica, Arial, sans-serif; font-size: 48px; line-height: 52px; font-weight: 700; letter-spacing: -1.44px; color: var(--chalk); }
        .tasks-lede { margin: 0 0 50px; font-size: 15px; line-height: 32px; letter-spacing: -0.2px; font-weight: 400; color: var(--muted); }
        .tasks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
        .tasks-card { display: block; background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 20px; text-decoration: none; color: var(--chalk); transition: border-color .15s ease; }
        .tasks-card:hover { border-color: var(--brand); }
        .tasks-card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .tasks-card-name { font-weight: 600; font-size: 16px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tasks-card-sub { font-size: 12px; color: var(--muted); }
        .tasks-bar { height: 6px; border-radius: 999px; background: var(--ink-3); overflow: hidden; margin-bottom: 12px; }
        .tasks-bar-fill { height: 100%; background: var(--teal); border-radius: 999px; }
        .tasks-counts { display: flex; flex-wrap: wrap; gap: 6px; }
        .tasks-chip { font-size: 12px; border-radius: 999px; padding: 4px 10px; background: var(--ink); color: var(--muted); font-family: var(--font-mono); }
        .tasks-chip b { color: var(--chalk); }
        .tasks-chip-todo b { color: var(--yellow); }
        .tasks-chip-done b { color: var(--teal); }
        .tasks-empty { text-align: center; padding: 96px 24px; color: var(--muted); border: 1px dashed var(--ink-3); border-radius: 12px; }
        @media (max-width: 900px) { .tasks-page { padding: 0 0 96px; } .tasks-page h1 { font-size: 34px; line-height: 40px; letter-spacing: -1px; } .tasks-grid { grid-template-columns: 1fr; } }
      `}</style>

      <h1>Tasks</h1>
      <p className="tasks-lede">Your to-do list for each app, built from its latest report. It stays with the app when you re-scan.</p>

      {error && <div className="tasks-empty" role="alert">{error}</div>}

      {projects === null ? (
        <div className="tasks-grid">
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} height={150} radius={12} />)}
        </div>
      ) : projects.length === 0 && !error ? (
        <div className="tasks-empty">
          <ListChecks size={28} style={{ marginBottom: 12 }} />
          <div>No projects yet. Analyze an app and its to-do list will appear here.</div>
        </div>
      ) : (
        <div className="tasks-grid">
          {projects.map((p) => {
            const total = p.counts.todo + p.counts.done + p.counts.wontdo;
            const pct = total ? Math.round((p.counts.done / total) * 100) : 0;
            return (
              <Link key={p.key} href={`/console/tasks/${encodeURIComponent(p.key)}`} className="tasks-card">
                <div className="tasks-card-top">
                  <AppIcon name={p.appName} storeUrl={p.storeUrl} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="tasks-card-name">{p.appName}</div>
                    <div className="tasks-card-sub">{p.reportCount} {p.reportCount === 1 ? "report" : "reports"}</div>
                  </div>
                  <ChevronRight size={18} color="var(--muted)" />
                </div>
                <div className="tasks-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                  <div className="tasks-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="tasks-counts">
                  <span className="tasks-chip tasks-chip-todo"><b>{p.counts.todo}</b> to do</span>
                  <span className="tasks-chip tasks-chip-done"><b>{p.counts.done}</b> done</span>
                  {p.counts.wontdo > 0 && <span className="tasks-chip"><b>{p.counts.wontdo}</b> won&apos;t do</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
