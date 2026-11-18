"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { reportPath } from "../lib/reportPath";

// Score over time for one app: overall health plus the four lenses. history is oldest -> newest,
// [{ id, health_score, created_at, lens: { UI, UX, Accessibility, Product } }]. Points link to the
// report they came from; the report being viewed is ringed.

const SERIES = [
  { key: "overall", label: "Overall", pick: (p) => p.health_score },
  { key: "UI", label: "UI", pick: (p) => p.lens?.UI ?? null },
  { key: "UX", label: "UX", pick: (p) => p.lens?.UX ?? null },
  { key: "Accessibility", label: "Accessibility", pick: (p) => p.lens?.Accessibility ?? null },
  { key: "Product", label: "Product", pick: (p) => p.lens?.Product ?? null },
];

const W = 640, H = 220, PAD = { l: 34, r: 16, t: 16, b: 30 };
const colorFor = (v) => (v >= 75 ? "var(--teal)" : v >= 50 ? "var(--yellow)" : "var(--kick)");
const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function ScoreTrend({ history, currentId, appLabel }) {
  const [seriesKey, setSeriesKey] = useState("overall");
  const points = useMemo(() => (Array.isArray(history) ? history.slice(-24) : []), [history]);

  // Only offer a lens when it has at least two scored scans (otherwise there's no trend to show).
  const available = SERIES.filter((s) => points.filter((p) => s.pick(p) != null).length >= 2);
  const active = available.find((s) => s.key === seriesKey) || available[0];

  if (points.length === 0) return null;

  if (points.length < 2 || !active) {
    return (
      <div className="panel" data-testid="score-trend">
        <div className="panel-title">Health Score Trend</div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8 }}>
          This is the first scan of this app. A trend appears after the next one.
        </div>
      </div>
    );
  }

  const vals = points.map((p) => active.pick(p));
  const known = vals.filter((v) => v != null);
  const first = known[0];
  const last = known[known.length - 1];
  const delta = last - first;
  const best = Math.max(...known);

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const x = (i) => PAD.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => PAD.t + innerH - (v / 100) * innerH;

  // The line is broken wherever a value is missing rather than drawn across a gap.
  const segments = [];
  let cur = [];
  vals.forEach((v, i) => {
    if (v == null) { if (cur.length) segments.push(cur); cur = []; } else cur.push([x(i), y(v)]);
  });
  if (cur.length) segments.push(cur);

  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="panel" data-testid="score-trend">
      <style>{`
        .st-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
        .st-big { font-family: var(--font-mono); font-size: 40px; line-height: 1.1; color: var(--chalk); }
        .st-delta { font-size: 13px; font-weight: 600; margin-left: 10px; }
        .st-sub { font-size: 12.5px; color: var(--muted); margin-top: 4px; }
        .st-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .st-tab { background: var(--ink); border: 1px solid var(--ink-3); border-radius: 999px; padding: 6px 12px; font-size: 12px; color: var(--muted); cursor: pointer; }
        .st-tab:hover { border-color: var(--brand); }
        .st-tab[aria-pressed="true"] { background: var(--ink-3); border-color: var(--brand); color: var(--chalk); font-weight: 600; }
        .st-svg { width: 100%; height: auto; display: block; overflow: visible; }
        .st-dot { cursor: pointer; transition: r .12s ease; }
        .st-dot:hover, a:focus .st-dot { r: 7; }
        .st-axis { font-family: var(--font-mono); font-size: 10px; fill: var(--muted); }
      `}</style>
      <div className="st-head">
        <div>
          <div className="panel-title">Health Score Trend</div>
          <div className="st-big">
            {last}
            <span className="st-delta" style={{ color: delta >= 0 ? "var(--teal)" : "var(--kick)" }}>
              {delta >= 0 ? "+" : ""}{delta} since the first scan
            </span>
          </div>
          <div className="st-sub">Latest score · {points.length} scans of {appLabel} · best {best}</div>
        </div>
        <div className="st-tabs" role="group" aria-label="Score to show">
          {available.map((s) => (
            <button key={s.key} type="button" className="st-tab" aria-pressed={active.key === s.key} onClick={() => setSeriesKey(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <svg className="st-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${active.label} score over ${points.length} scans, from ${first} to ${last}`}>
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray={g === 0 ? "0" : "3 4"} />
            <text className="st-axis" x={PAD.l - 8} y={y(g) + 3} textAnchor="end">{g}</text>
          </g>
        ))}
        {segments.map((seg, i) => (
          <polyline key={i} points={seg.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) => {
          const v = vals[i];
          if (v == null) return null;
          const isCurrent = String(p.id) === String(currentId);
          const dot = (
            <g>
              {isCurrent && <circle cx={x(i)} cy={y(v)} r="10" fill="none" stroke="var(--chalk)" strokeWidth="1.5" />}
              <circle className="st-dot" cx={x(i)} cy={y(v)} r="5" fill={colorFor(v)} stroke="var(--surface)" strokeWidth="2" />
              <title>{`${fmt(p.created_at)}: ${v}${isCurrent ? " (this report)" : ""}`}</title>
            </g>
          );
          return isCurrent ? <g key={p.id ?? i}>{dot}</g> : (
            <Link key={p.id ?? i} href={reportPath(p.id, appLabel)} aria-label={`Open the report from ${fmt(p.created_at)}, score ${v}`}>{dot}</Link>
          );
        })}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={"l" + i} className="st-axis" x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>{fmt(p.created_at)}</text>
          ) : null
        )}
      </svg>
    </div>
  );
}
