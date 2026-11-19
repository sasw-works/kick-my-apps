"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, TrendingDown, TrendingUp, Minus, HelpCircle } from "lucide-react";

const VERDICT = {
  better: { label: "Looks better", color: "var(--teal)", Icon: TrendingUp },
  worse: { label: "Looks worse", color: "var(--kick)", Icon: TrendingDown },
  flat: { label: "No clear change", color: "var(--muted)", Icon: Minus },
  unclear: { label: "Not enough reviews yet", color: "var(--muted)", Icon: HelpCircle },
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

// "Did the release help?" on one of your apps' Pulse pages: each version next to the one before it,
// with the tasks you marked done around that release. Wording stays careful on purpose: reviews are
// a sample, and shipping a fix near a release isn't proof it caused anything.
export default function ReleaseImpact({ monitorId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    fetch(`/api/pulse/monitors/${monitorId}/impact`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (off) return;
        if (!ok) throw new Error(d.error || "Could not load release impact.");
        setData(d);
      })
      .catch((e) => !off && setError(e.message));
    return () => {
      off = true;
    };
  }, [monitorId]);

  return (
    <div className="pmd-panel" data-testid="release-impact">
      <div className="pmd-panel-title">Did the release help?</div>
      <div className="ri-sub">
        Each version&apos;s written reviews next to the version before it. Reviews are a sample, and a fix shipped around a
        release isn&apos;t proof it caused the change.
      </div>
      {error ? (
        <div className="pmd-empty" role="alert">{error}</div>
      ) : !data ? (
        <div className="pmd-empty"><Loader2 size={16} className="ri-spin" /></div>
      ) : data.releases.length === 0 ? (
        <div className="pmd-empty">
          Nothing to compare yet. Once a new version is released and reviews of it come in, you&apos;ll see how it did here.
        </div>
      ) : (
        <div className="ri-list">
          {data.releases.map((r) => {
            const v = VERDICT[r.verdict] || VERDICT.unclear;
            return (
              <div className="ri-row" key={r.version} data-testid={`release-${r.version}`}>
                <div className="ri-top">
                  <div>
                    <span className="ri-version">{r.version}</span>
                    <span className="ri-date"> · released {fmtDate(r.releasedAt)} · vs {r.previousVersion}</span>
                  </div>
                  <span className="ri-verdict" style={{ color: v.color, borderColor: v.color }}>
                    <v.Icon size={12} /> {v.label}
                  </span>
                </div>
                <div className="ri-cols">
                  <div>
                    <div className="ri-col-title">Reviews of {r.previousVersion}</div>
                    <div className="ri-num">{r.before.n ? `${r.before.negPct}% 1–2★` : "—"}</div>
                    <div className="ri-meta">{r.before.n} review{r.before.n === 1 ? "" : "s"}{r.before.n ? ` · avg ${r.before.avgRating}★` : ""}</div>
                  </div>
                  <div>
                    <div className="ri-col-title">Reviews of {r.version}</div>
                    <div className="ri-num">{r.after.n ? `${r.after.negPct}% 1–2★` : "—"}</div>
                    <div className="ri-meta">{r.after.n} review{r.after.n === 1 ? "" : "s"}{r.after.n ? ` · avg ${r.after.avgRating}★` : ""}</div>
                  </div>
                  <div>
                    <div className="ri-col-title">Store average</div>
                    <div className="ri-num">
                      {r.ratingBefore != null && r.ratingAfter != null ? `${r.ratingBefore.toFixed(2)} → ${r.ratingAfter.toFixed(2)}` : "—"}
                    </div>
                    <div className="ri-meta">moves slowly</div>
                  </div>
                </div>
                {!r.enough && (
                  <div className="ri-meta">Needs at least 8 reviews of each version before we call it better or worse.</div>
                )}
                {r.changes.length > 0 && (
                  <div className="ri-changes">
                    {r.changes.map((c) => (
                      <span className="ri-chip" key={c.key} style={{ color: c.delta < 0 ? "var(--teal)" : "var(--kick)" }}>
                        {c.label}: {c.beforePct}% → {c.afterPct}% of reviews
                      </span>
                    ))}
                  </div>
                )}
                {r.tasks.length > 0 && (
                  <div className="ri-tasks">
                    <div className="ri-col-title">Marked done around this release</div>
                    {r.tasks.map((t) => (
                      <div className="ri-task" key={t.key}>✓ {t.title}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {data && !data.hasReports && (
        <div className="ri-meta" style={{ marginTop: 10 }}>
          Make a report of this app from its store link and mark fixes done in <Link href="/console/tasks">Tasks</Link>: they&apos;ll show up next to the release they shipped with.
        </div>
      )}
      <style>{`
        .ri-sub { font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 14px; }
        .ri-list { display: flex; flex-direction: column; gap: 14px; }
        .ri-row { border: 1px solid var(--ink-3); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .ri-top { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: center; }
        .ri-version { font-weight: 700; font-family: var(--font-mono); color: var(--chalk); }
        .ri-date { font-size: 12.5px; color: var(--muted); }
        .ri-verdict { display: inline-flex; gap: 5px; align-items: center; font-size: 11.5px; font-weight: 600; border: 1px solid; border-radius: 999px; padding: 2px 10px; }
        .ri-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .ri-col-title { font-size: 11.5px; color: var(--muted); margin-bottom: 3px; }
        .ri-num { font-size: 16px; font-weight: 600; color: var(--chalk); }
        .ri-meta { font-size: 12px; color: var(--muted); }
        .ri-changes { display: flex; flex-wrap: wrap; gap: 6px; }
        .ri-chip { font-size: 12px; background: var(--ink); border-radius: 999px; padding: 3px 10px; font-family: var(--font-mono); }
        .ri-task { font-size: 13.5px; color: var(--chalk); padding: 2px 0; }
        .ri-spin { animation: ri-rot 1s linear infinite; } @keyframes ri-rot { to { transform: rotate(360deg); } }
        @media (max-width: 560px) { .ri-cols { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
