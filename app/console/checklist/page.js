"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AppIcon from "../../components/AppIcon";
import { SkeletonBlock } from "../../components/Skeleton";
import ProjectChecklist from "./ProjectChecklist";

const STYLES = `
  .cl-page { padding: 0 0 120px; max-width: 1120px; margin: 0 auto; }
  .cl-page h1 { margin: 0 0 8px; font-family: Helvetica, Arial, sans-serif; font-size: 48px; line-height: 52px; font-weight: 700; letter-spacing: -1.44px; color: var(--chalk); }
  .cl-lede { margin: 0 0 50px; font-size: 15px; line-height: 32px; letter-spacing: -0.2px; font-weight: 400; color: var(--muted); max-width: 720px; }
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
  .cl-card { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 20px; }
  .cl-link { color: var(--brand); text-decoration: none; }
  .cl-link:hover { text-decoration: underline; }
  .cl-empty { font-size: 14px; color: var(--muted); line-height: 1.5; margin: 0; }
  @media (max-width: 900px) { .cl-page { padding: 0 0 96px; } .cl-page h1 { font-size: 34px; line-height: 40px; letter-spacing: -1px; } .cl-box-card { padding: 16px; } .cl-box-body { padding: 16px; } }
`;

export default function ChecklistPage() {
  const [projects, setProjects] = useState(null); // one per app the person made a report of
  const [error, setError] = useState("");
  const [openKey, setOpenKey] = useState(null);
  const [counts, setCounts] = useState({}); // project key -> { todo, inprogress, done, wontdo }

  useEffect(() => {
    fetch("/api/tasks").then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (!ok) throw new Error(d.error || "Could not load your apps.");
      setProjects(d.projects);
      setCounts(Object.fromEntries(d.projects.map((p) => [p.key, p.counts])));
    }).catch((e) => { setError(e.message); setProjects([]); });
  }, []);

  return (
    <main className="cl-page">
      <style>{STYLES}</style>
      <h1>Checklist</h1>
      <p className="cl-lede">Every app you made a report of has its own checklist: the issues and suggestions from its latest report, ready to work through. Open an app and mark each one To do, In progress, Done or Skip.</p>

      {error ? (
        <div className="cl-card" role="alert" style={{ color: "var(--kick)" }}>{error}</div>
      ) : projects === null ? (
        <SkeletonBlock height={84} radius={8} />
      ) : projects.length === 0 ? (
        <section className="cl-card" data-testid="checklist-empty">
          <p className="cl-empty">Every app you make a report of gets its own checklist from its issues and suggestions. Make a report first, then come back here. <Link href="/console" className="cl-link">Make a report</Link></p>
        </section>
      ) : (
        <div className="cl-list">
          {projects.map((p) => {
            const isOpen = openKey === p.key;
            const c = counts[p.key] || p.counts;
            const n = c.todo + c.inprogress; // still to finish
            const total = n + c.done + c.wontdo;
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
                  <AppIcon name={p.appName} storeUrl={p.storeUrl} size={44} radius={12} />
                  <div className="cl-box-main">
                    <div className="cl-box-name">{p.appName}</div>
                    <div className="cl-box-meta">{total === 0 ? "No issues in the latest report" : `${c.done} of ${total} done${c.inprogress ? ` · ${c.inprogress} in progress` : ""}`}</div>
                  </div>
                  <span className={`cl-badge ${n === 0 ? "cl-badge-ok" : ""}`} data-testid="checklist-badge">{n === 0 ? "All clear" : `${n} open`}</span>
                </div>
                {isOpen && (
                  <div className="cl-box-body">
                    <ProjectChecklist
                      projectKey={p.key}
                      onCounts={(cc) => setCounts((o) => (o[p.key] && JSON.stringify(o[p.key]) === JSON.stringify(cc) ? o : { ...o, [p.key]: cc }))}
                      onRemoved={() => { setProjects((list) => list.filter((x) => x.key !== p.key)); setOpenKey(null); }}
                    />
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
