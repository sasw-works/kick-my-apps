"use client";

import React from "react";
import { Activity, Bell, TrendingUp, TrendingDown, Plus, MoreHorizontal } from "lucide-react";

const SAMPLE_MONITORS = [
  {
    name: "Wallet Pro",
    color: "#F5433A",
    status: "active",
    lastChecked: "2 saat önce",
    newReviews: 14,
    sentimentDelta: 6,
    alert: null,
  },
  {
    name: "ShopEasy",
    color: "#7CB342",
    status: "active",
    lastChecked: "5 saat önce",
    newReviews: 3,
    sentimentDelta: -12,
    alert: "Duyarlılık bu hafta %12 düştü",
  },
  {
    name: "MetroBank",
    color: "#29B6F6",
    status: "active",
    lastChecked: "1 gün önce",
    newReviews: 22,
    sentimentDelta: 2,
    alert: null,
  },
  {
    name: "TransitGo",
    color: "#7E57C2",
    status: "paused",
    lastChecked: "4 gün önce",
    newReviews: 0,
    sentimentDelta: 0,
    alert: null,
  },
];

export default function ConsolePulsePage() {
  return (
    <main className="pulse-page">
      <style>{`
        .pulse-page { padding: 32px 40px 120px; max-width: 1240px; margin: 0 auto; }
        .pulse-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 28px; flex-wrap: wrap; }
        .pulse-title { font-size: 26px; font-weight: 700; font-family: var(--font-display); color: var(--chalk); margin-bottom: 6px; }
        .pulse-subtitle { font-size: 14px; color: var(--muted); max-width: 520px; line-height: 1.5; }
        .pulse-add-btn {
          display: flex; align-items: center; gap: 8px; background: var(--brand); color: #fff;
          border: none; border-radius: 999px; padding: 12px 20px; font-size: 13.5px; font-weight: 600; cursor: pointer;
          white-space: nowrap;
        }

        .pulse-list { display: flex; flex-direction: column; gap: 12px; }
        .pulse-card {
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 14px; padding: 20px 22px;
          display: flex; align-items: center; gap: 18px;
        }
        .pulse-card-paused { opacity: 0.55; }
        .pulse-avatar {
          width: 42px; height: 42px; border-radius: 10px; color: #fff; font-weight: 700; font-size: 16px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .pulse-card-main { flex: 1; min-width: 0; }
        .pulse-card-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .pulse-card-name { font-size: 15px; font-weight: 600; color: var(--chalk); }
        .pulse-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .pulse-status-active { background: var(--teal); }
        .pulse-status-paused { background: var(--muted); }
        .pulse-card-meta { font-size: 12.5px; color: var(--muted); }

        .pulse-stat { text-align: center; min-width: 74px; }
        .pulse-stat-num { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--chalk); }
        .pulse-stat-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

        .pulse-sentiment { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; min-width: 60px; justify-content: center; }
        .pulse-sentiment-up { color: var(--teal); }
        .pulse-sentiment-down { color: var(--kick); }
        .pulse-sentiment-flat { color: var(--muted); }

        .pulse-alert {
          display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--kick);
          background: color-mix(in srgb, var(--kick) 12%, transparent); padding: 4px 10px; border-radius: 999px; white-space: nowrap;
        }

        .pulse-more-btn {
          width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--ink-3); background: transparent;
          color: var(--muted); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
        }

        @media (max-width: 900px) {
          .pulse-card { flex-wrap: wrap; }
          .pulse-stat, .pulse-sentiment { min-width: 0; }
        }
      `}</style>

      <div className="pulse-header">
        <div>
          <div className="pulse-title">Pulse</div>
          <div className="pulse-subtitle">Track your apps for new reviews, sentiment shifts, and version updates — automatically, in the background.</div>
        </div>
        <button className="pulse-add-btn">
          <Plus size={16} />
          Add Monitor
        </button>
      </div>

      <div className="pulse-list">
        {SAMPLE_MONITORS.map((m) => (
          <div className={`pulse-card ${m.status === "paused" ? "pulse-card-paused" : ""}`} key={m.name}>
            <div className="pulse-avatar" style={{ background: m.color }}>{m.name[0]}</div>
            <div className="pulse-card-main">
              <div className="pulse-card-name-row">
                <span className={`pulse-status-dot ${m.status === "active" ? "pulse-status-active" : "pulse-status-paused"}`} />
                <span className="pulse-card-name">{m.name}</span>
                {m.alert && (
                  <span className="pulse-alert">
                    <Bell size={11} />
                    {m.alert}
                  </span>
                )}
              </div>
              <div className="pulse-card-meta">
                {m.status === "active" ? `Son kontrol: ${m.lastChecked}` : "Duraklatıldı"}
              </div>
            </div>

            <div className="pulse-stat">
              <div className="pulse-stat-num">{m.newReviews}</div>
              <div className="pulse-stat-label">Yeni yorum</div>
            </div>

            <div className={`pulse-sentiment ${m.sentimentDelta > 0 ? "pulse-sentiment-up" : m.sentimentDelta < 0 ? "pulse-sentiment-down" : "pulse-sentiment-flat"}`}>
              {m.sentimentDelta > 0 && <TrendingUp size={14} />}
              {m.sentimentDelta < 0 && <TrendingDown size={14} />}
              {m.sentimentDelta === 0 ? "—" : `${m.sentimentDelta > 0 ? "+" : ""}${m.sentimentDelta}%`}
            </div>

            <button className="pulse-more-btn" aria-label="Daha fazla">
              <MoreHorizontal size={16} />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
