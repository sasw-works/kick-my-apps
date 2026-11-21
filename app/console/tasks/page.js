"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListChecks, Trash2, X } from "lucide-react";
import AppIcon from "../../components/AppIcon";
import { SkeletonBlock } from "../../components/Skeleton";

// The progress meter from Figma: 49 thin bars, 2px wide on a 7px pitch. The finished share is coloured along a
// red -> yellow -> green ramp (the ramp is fixed to the bar's position, so a bit of progress is only red, more is
// red to yellow, all of it reaches green); the rest is the dim grey.
const TICKS = 49;
const RAMP = [[0, [255, 96, 96]], [0.484375, [246, 250, 66]], [1, [151, 255, 131]]];
function rampColor(t) {
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [a, ca] = RAMP[i - 1];
      const [b, cb] = RAMP[i];
      const f = (t - a) / (b - a);
      return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * f)).join(",")})`;
    }
  }
  return "rgb(151,255,131)";
}
const TICK_COLORS = Array.from({ length: TICKS }, (_, i) => rampColor(i / (TICKS - 1)));

function Progress({ pct }) {
  const filled = Math.round((pct / 100) * TICKS);
  return (
    <div className="tasks-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Tasks completed">
      {TICK_COLORS.map((c, i) => (
        <span key={i} className="tasks-tick" style={{ background: i < filled ? c : "#2e363e" }} />
      ))}
    </div>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);

  function load() {
    return fetch("/api/tasks")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Could not load tasks.");
        setProjects(d.projects || []);
      })
      .catch((e) => { setError(e.message); setProjects([]); });
  }

  useEffect(() => { load(); }, []);

  const toggle = (key) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const clearSelection = () => setSelected(new Set());

  async function deleteSelected() {
    const keys = [...selected];
    if (!keys.length) return;
    const names = (projects || []).filter((p) => selected.has(p.key)).map((p) => p.appName);
    const what = keys.length === 1 ? `"${names[0]}"` : `${keys.length} projects`;
    if (!confirm(`Remove ${what} from Tasks? Its progress is deleted. Your reports stay, and the list comes back if you analyze the app again.`)) return;
    setDeleting(true);
    try {
      const r = await fetch("/api/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projects: keys }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Could not delete.");
      setError("");
      clearSelection();
      await load();
    } catch (e) {
      setError(e.message);
    }
    setDeleting(false);
  }

  return (
    <main className="tasks-page">
      <style>{`
        .tasks-page { padding: 0 0 120px; max-width: 1120px; margin: 0 auto; }
        .tasks-page h1 { margin: 0 0 8px; font-family: Helvetica, Arial, sans-serif; font-size: 48px; line-height: 52px; font-weight: 700; letter-spacing: -1.44px; color: var(--chalk); }
        .tasks-lede { margin: 0 0 50px; font-size: 15px; line-height: 32px; letter-spacing: -0.2px; font-weight: 400; color: var(--muted); }
        /* Figma 4262:1719 "Content item": white at 3%, 8px corners, 24px padding, 48px between the three groups, 2px between rows. */
        .tasks-list { display: flex; flex-direction: column; gap: 2px; }
        .tasks-row {
          display: flex; align-items: center; gap: 48px; padding: 24px; border-radius: 8px; box-sizing: border-box;
          background: rgba(255, 255, 255, 0.03); color: var(--chalk); cursor: pointer; transition: background 0.12s ease;
        }
        .tasks-row:hover { background: rgba(255, 255, 255, 0.05); }
        .tasks-row-selected, .tasks-row-selected:hover { background: rgba(43, 89, 255, 0.12); }
        .kma-console:not(.kma-dark) .tasks-row { background: var(--surface); }
        .kma-console:not(.kma-dark) .tasks-row:hover { background: var(--ink-3); }
        .tasks-lead { display: flex; align-items: center; gap: 32px; width: 350px; flex-shrink: 0; min-width: 0; }
        .tasks-brand { display: flex; align-items: center; gap: 20px; min-width: 0; }
        .tasks-text { display: flex; flex-direction: column; min-width: 0; font-size: 15px; letter-spacing: -0.2px; line-height: 32px; }
        .tasks-name { font-weight: 500; color: var(--chalk); text-decoration: none; margin-bottom: -5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tasks-name:hover { text-decoration: underline; }
        .tasks-name:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
        .tasks-sub { color: var(--muted); }
        .tasks-progress { display: flex; justify-content: space-between; align-items: center; width: 338px; height: 20px; flex-shrink: 0; }
        .tasks-tick { display: block; width: 2px; height: 20px; border-radius: 1px; flex-shrink: 0; }
        .tasks-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; padding-left: 91px; flex: 1; min-width: 0; }
        .tasks-chips-3 { padding-left: 0; }
        .tasks-chip {
          display: inline-flex; align-items: center; height: 33px; padding: 0 18px; box-sizing: border-box; border-radius: 100px;
          background: rgba(255, 255, 255, 0.05); color: var(--muted); font-size: 13px; letter-spacing: -0.2px; white-space: nowrap;
        }
        .kma-console:not(.kma-dark) .tasks-chip { background: var(--ink); }
        /* Same 24px ring as the Reports list radio; still a checkbox underneath so several rows can be picked. */
        .tasks-checkbox {
          appearance: none; -webkit-appearance: none; flex-shrink: 0; margin: 0; cursor: pointer;
          width: 24px; height: 24px; border-radius: 50%; background: transparent; border: 1px solid var(--glass-border);
          display: inline-block; transition: border-color 0.12s ease;
        }
        .tasks-checkbox:hover { border-color: var(--brand); }
        .tasks-checkbox:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .tasks-checkbox:checked { border-color: #2b59ff; background: radial-gradient(circle, #2b59ff 0 6px, transparent 6.5px); }
        .tasks-empty { text-align: center; padding: 96px 24px; color: var(--muted); border: 1px dashed var(--ink-3); border-radius: 12px; }
        .tasks-selection-bar {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          background: #14151A; color: #fff; border-radius: 999px; padding: 12px 12px 12px 24px;
          display: flex; align-items: center; gap: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 50;
        }
        .tasks-selection-count { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
        .tasks-selection-badge { background: #2b59ff; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
        .tasks-selection-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.2); }
        .tasks-selection-actions { display: flex; align-items: center; gap: 4px; }
        .tasks-selection-btn { width: 34px; height: 34px; border-radius: 50%; border: none; background: transparent; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .tasks-selection-btn:hover { background: rgba(255,255,255,0.12); }
        .tasks-selection-btn:disabled { opacity: 0.5; cursor: default; }
        .tasks-selection-btn:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
        @media (max-width: 1100px) {
          .tasks-row { flex-wrap: wrap; gap: 20px 32px; }
          .tasks-lead { width: auto; flex: 1 1 300px; }
          .tasks-progress { flex: 1 1 280px; width: auto; max-width: 338px; }
          .tasks-chips { padding-left: 0; flex-basis: 100%; flex-wrap: wrap; }
        }
        @media (max-width: 900px) { .tasks-page { padding: 0 0 96px; } .tasks-page h1 { font-size: 34px; line-height: 40px; letter-spacing: -1px; } .tasks-row { padding: 20px; } .tasks-lead { gap: 20px; } }
      `}</style>

      <h1>Tasks</h1>
      <p className="tasks-lede">Your to-do list for each app, built from its latest report. It stays with the app when you re-scan.</p>

      {error && <div className="tasks-empty" role="alert" style={{ marginBottom: 16, padding: "24px" }}>{error}</div>}

      {projects === null ? (
        <div className="tasks-list">
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} height={107} radius={8} />)}
        </div>
      ) : projects.length === 0 && !error ? (
        <div className="tasks-empty">
          <ListChecks size={28} style={{ marginBottom: 12 }} />
          <div>No projects yet. Analyze an app and its to-do list will appear here.</div>
        </div>
      ) : (
        <div className="tasks-list">
          {projects.map((p) => {
            const total = p.counts.todo + p.counts.done + p.counts.wontdo;
            const pct = total ? Math.round((p.counts.done / total) * 100) : 0;
            const href = `/console/tasks/${encodeURIComponent(p.key)}`;
            const isSel = selected.has(p.key);
            return (
              <div key={p.key} className={`tasks-row ${isSel ? "tasks-row-selected" : ""}`} onClick={() => router.push(href)}>
                <div className="tasks-lead">
                  <input
                    type="checkbox"
                    className="tasks-checkbox"
                    checked={isSel}
                    onChange={() => toggle(p.key)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${p.appName}`}
                  />
                  <div className="tasks-brand">
                    <AppIcon name={p.appName} storeUrl={p.storeUrl} size={55} radius={16} />
                    <div className="tasks-text">
                      <Link href={href} className="tasks-name" onClick={(e) => e.stopPropagation()}>{p.appName}</Link>
                      <span className="tasks-sub">{p.reportCount} {p.reportCount === 1 ? "Report" : "Reports"}</span>
                    </div>
                  </div>
                </div>
                <Progress pct={pct} />
                <div className={`tasks-chips ${p.counts.wontdo > 0 ? "tasks-chips-3" : ""}`}>
                  <span className="tasks-chip">To do ({p.counts.todo})</span>
                  <span className="tasks-chip">Done ({p.counts.done})</span>
                  {p.counts.wontdo > 0 && <span className="tasks-chip">Won&apos;t do ({p.counts.wontdo})</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <div className="tasks-selection-bar" role="region" aria-label="Selection">
          <div className="tasks-selection-count">
            <span className="tasks-selection-badge">{selected.size}</span>
            Selected
          </div>
          <div className="tasks-selection-divider" />
          <div className="tasks-selection-actions">
            <button type="button" className="tasks-selection-btn" onClick={deleteSelected} disabled={deleting} aria-label="Delete">
              <Trash2 size={16} />
            </button>
            <button type="button" className="tasks-selection-btn" onClick={clearSelection} aria-label="Clear selection">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
