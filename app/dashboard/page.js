"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";

const STATUS_COLOR = (score) => {
  if (score >= 75) return "var(--teal)";
  if (score >= 50) return "var(--yellow)";
  return "var(--kick)";
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} weeks ago`;
  return new Date(dateStr).toLocaleDateString("en-US");
}

export default function DashboardPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/history?apps=true");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not retrieve dashboard data.");
        setApps(data.apps || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main
      className="min-h-screen px-4 pb-4 md:px-8 md:pb-8"
      style={{ background: "var(--ink)", paddingTop: 100 }}
    >
      <div className="dash-root">
        <style>{`
          .dash-root {
            max-width: 1000px;
            margin: 0 auto;
            font-family: var(--font-inter), sans-serif;
            color: var(--chalk);
          }
          .dash-title { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 8px; }
          .dash-sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }
          .dash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
          .dash-card {
            background: var(--ink-2);
            border: 1px solid var(--ink-3);
            border-radius: 8px;
            padding: 24px;
            text-decoration: none;
            color: inherit;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: border-color 0.15s ease;
          }
          .dash-card:hover { border-color: var(--brand); }
          .dash-card-top { display: flex; align-items: flex-start; justify-content: space-between; }
          .dash-card-name { font-size: 16px; font-weight: 600; }
          .dash-card-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
          .dash-score {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.02em;
          }
          .dash-card-bottom {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: var(--muted);
          }
          .dash-empty { text-align: center; padding: 64px 0; color: var(--muted); }
          .spin { animation: dash-spin 0.9s linear infinite; }
          @keyframes dash-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .dash-cta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
            background: var(--brand);
            color: #FFFFFF;
            font-weight: 600;
            font-size: 14px;
            padding: 12px 16px;
            border-radius: 999px;
            text-decoration: none;
          }
        `}</style>

        <div className="dash-title">My Apps</div>
        <div className="dash-sub">The latest health score for every app you track, at a glance.</div>

        {loading ? (
          <div className="dash-empty">
            <Loader2 size={22} className="spin" style={{ margin: "0 auto 8px" }} />
            Loading…
          </div>
        ) : error ? (
          <div className="dash-empty" style={{ color: "var(--kick)" }}>{error}</div>
        ) : apps.length === 0 ? (
          <div className="dash-empty">
            No apps are being tracked yet.
            <br />
            <Link href="/" className="dash-cta">
              Run Your First Analysis
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="dash-grid">
            {apps.map((app) => (
              <Link key={app.app_name} href={`/history?appName=${encodeURIComponent(app.app_name)}`} className="dash-card">
                <div className="dash-card-top">
                  <div>
                    <div className="dash-card-name">{app.app_name}</div>
                    <div className="dash-card-meta">{app.scan_count} scans · last {timeAgo(app.created_at)}</div>
                  </div>
                  <div className="dash-score" style={{ color: STATUS_COLOR(app.health_score) }}>
                    {app.health_score}
                  </div>
                </div>
                <div className="dash-card-bottom">
                  <span>{app.bad_count} critical · {app.warn_count} attention · {app.good_count} good</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
