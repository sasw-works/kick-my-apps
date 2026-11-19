"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Rocket, Image as ImageIcon, Type, Tag, LayoutGrid } from "lucide-react";

const ICONS = { version: Rocket, icon: ImageIcon, name: Type, screenshots: LayoutGrid, price: Tag };

function ago(d) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function Rows({ changes, showApp }) {
  return (
    <div className="rc-list">
      {changes.map((c) => {
        const Icon = ICONS[c.kind] || Rocket;
        return (
          <div className="rc-row" key={c.id} data-testid={`change-${c.kind}`}>
            <span className="rc-ic"><Icon size={15} /></span>
            <div className="rc-body">
              <div className="rc-title">
                {showApp && <Link href={`/console/pulse/${c.monitor_id}`} className="rc-app">{c.app_name}</Link>} {c.title}
                <span className="rc-time">{ago(c.detected_at)}</span>
              </div>
              {c.detail && <div className="rc-detail">{c.detail}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// What other people's apps changed on their store listing. With no props it shows the account-wide
// feed ("what your rivals did"); with `changes` it shows one app's own log.
export default function RivalChanges({ changes: given }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (given) return;
    setData(null);
    fetch(`/api/pulse/changes?days=${days}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!ok) throw new Error(d.error || "Could not load."); setData(d); setError(""); })
      .catch((e) => setError(e.message));
  }, [days, given]);

  const style = (
    <style>{`
      .rc-wrap { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; }
      .rc-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
      .rc-h { font-weight: 600; color: var(--chalk); font-size: 15px; }
      .rc-range { display: flex; gap: 6px; }
      .rc-range button { border: 1px solid var(--ink-3); background: transparent; color: var(--muted); border-radius: 999px; padding: 4px 11px; font-size: 12px; cursor: pointer; font-family: inherit; }
      .rc-range button[aria-pressed="true"] { color: var(--brand); border-color: var(--brand); font-weight: 600; }
      .rc-list { display: flex; flex-direction: column; gap: 12px; }
      .rc-row { display: flex; gap: 12px; align-items: flex-start; }
      .rc-ic { width: 28px; height: 28px; border-radius: 8px; background: var(--ink); border: 1px solid var(--ink-3); color: var(--muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .rc-body { min-width: 0; }
      .rc-title { font-size: 14px; color: var(--chalk); line-height: 1.4; }
      .rc-app { font-weight: 600; color: var(--chalk); text-decoration: none; }
      .rc-app:hover { color: var(--brand); }
      .rc-time { font-size: 12px; color: var(--muted); margin-left: 8px; }
      .rc-detail { font-size: 13px; color: var(--muted); line-height: 1.5; margin-top: 2px; white-space: pre-wrap; overflow-wrap: anywhere; }
      .rc-spin { animation: rcr 1s linear infinite; } @keyframes rcr { to { transform: rotate(360deg); } }
      .rc-empty { font-size: 13px; color: var(--muted); line-height: 1.5; }
    `}</style>
  );

  if (given) {
    return (
      <div className="pmd-panel" data-testid="rival-changes">
        <div className="pmd-panel-title">What this app changed</div>
        {given.length === 0 ? <div className="rc-empty">No changes spotted yet. Pulse compares its store listing at every daily check: new versions and notes, icon, name, screenshots and price.</div> : <Rows changes={given} />}
        {style}
      </div>
    );
  }
  if (error) return null;
  if (data && data.watching === 0) return null; // no rivals watched: nothing to say here
  return (
    <div className="rc-wrap" data-testid="rival-feed">
      <div className="rc-head">
        <div className="rc-h">What your rivals did</div>
        <div className="rc-range" role="group" aria-label="Period">
          {[7, 30].map((d) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{d === 7 ? "This week" : "30 days"}</button>)}
        </div>
      </div>
      {!data ? <Loader2 size={16} className="rc-spin" /> : data.changes.length === 0 ? (
        <div className="rc-empty">Nothing yet in the last {data.days} days from the {data.watching} app{data.watching === 1 ? "" : "s"} you watch. Pulse checks them daily and lists new versions, icon, name, screenshot and price changes here.</div>
      ) : <Rows changes={data.changes} showApp />}
      {style}
    </div>
  );
}
