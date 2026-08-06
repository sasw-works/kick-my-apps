"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, FileText, GitCompare, Loader2 } from "lucide-react";

function AppIcon({ name, size = 40 }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  const hue = Array.from(name || "").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.38,
        background: `hsl(${hue}, 65%, 45%)`,
      }}
    >
      {letter}
    </div>
  );
}

export default function ConsoleReportsPage() {
  const [scans, setScans] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | individual | comparison

  useEffect(() => {
    Promise.all([
      fetch("/api/history?all=true").then((r) => r.json()),
      fetch("/api/history/compare?all=true").then((r) => r.json()),
    ])
      .then(([scanData, compareData]) => {
        setScans(scanData.scans || []);
        setComparisons(compareData.comparisons || []);
      })
      .catch(() => {
        setScans([]);
        setComparisons([]);
      });
  }, []);

  const individualRows = (scans || []).map((s) => ({
    kind: "individual",
    id: s.id,
    title: s.app_name,
    subtitle: null,
    reviewCount: s.review_count,
    createdAt: s.created_at,
    href: `/history/${s.id}`,
    icon: <AppIcon name={s.app_name} />,
  }));

  const comparisonRows = comparisons.map((c) => ({
    kind: "comparison",
    id: c.id,
    title: `${c.app_name_a} vs ${c.app_name_b}`,
    subtitle: `${c.app_name_a} vs ${c.app_name_b}`,
    reviewCount: null,
    createdAt: c.created_at,
    href: `/history/compare/${c.id}`,
    icon: (
      <div style={{ display: "flex" }}>
        <AppIcon name={c.app_name_a} size={40} />
        <div style={{ marginLeft: -12 }}>
          <AppIcon name={c.app_name_b} size={40} />
        </div>
      </div>
    ),
  }));

  let rows = [];
  if (filter === "all") rows = [...comparisonRows, ...individualRows];
  else if (filter === "individual") rows = individualRows;
  else if (filter === "comparison") rows = comparisonRows;

  rows = rows
    .filter((r) => !query || r.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <main className="reports-page">
      <style>{`
        .reports-page { padding: 32px 40px; max-width: 1300px; margin: 0 auto; }
        .reports-toolbar { display: flex; align-items: center; gap: 12px; background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 14px; padding: 10px 16px; margin-bottom: 24px; }
        .reports-search { flex: 1; display: flex; align-items: center; gap: 10px; }
        .reports-search input { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; color: var(--chalk); }
        .reports-tabs { display: flex; gap: 4px; background: var(--ink); border-radius: 10px; padding: 3px; }
        .reports-tab { border: none; background: transparent; padding: 7px 14px; border-radius: 8px; font-size: 13px; color: var(--muted); cursor: pointer; }
        .reports-tab-active { background: var(--chalk); color: var(--ink-2); font-weight: 600; }
        .reports-table { width: 100%; border-collapse: collapse; background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 14px; overflow: hidden; }
        .reports-table th {
          text-align: left; font-size: 11px; letter-spacing: 0.06em; color: var(--muted); font-weight: 600;
          padding: 14px 16px; border-bottom: 1px solid var(--ink-3); text-transform: uppercase;
        }
        .reports-table td { padding: 14px 16px; border-bottom: 1px solid var(--ink-3); font-size: 14px; color: var(--chalk); vertical-align: middle; }
        .reports-table tr:last-child td { border-bottom: none; }
        .reports-row-name { display: flex; align-items: center; gap: 12px; }
        .reports-row-title { font-weight: 600; }
        .reports-row-subtitle { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .reports-type-tag { display: inline-flex; align-items: center; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; width: fit-content; }
        .reports-type-individual { background: var(--ink-3); color: var(--muted); }
        .reports-type-comparison { background: color-mix(in srgb, var(--brand) 15%, transparent); color: var(--brand); }
        .reports-empty { text-align: center; padding: 80px 20px; color: var(--muted); }
        .reports-view-link { font-size: 13px; color: var(--brand); font-weight: 600; text-decoration: none; }
      `}</style>

      <div className="reports-toolbar">
        <div className="reports-search">
          <Search size={16} color="var(--muted)" />
          <input placeholder="Search reports..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="reports-tabs">
          {[
            { key: "all", label: "All" },
            { key: "comparison", label: "Comparison" },
            { key: "individual", label: "Individual" },
          ].map((t) => (
            <button
              key={t.key}
              className={`reports-tab ${filter === t.key ? "reports-tab-active" : ""}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {scans === null ? (
        <div className="reports-empty">
          <Loader2 size={20} className="spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="reports-empty">
          <FileText size={28} color="var(--ink-3)" style={{ marginBottom: 10 }} />
          <div>Henüz bir sorgulama yapmadın.</div>
        </div>
      ) : (
        <table className="reports-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Type</th>
              <th>Reviews</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.kind}-${r.id}`}>
                <td>
                  <div className="reports-row-name">
                    {r.icon}
                    <div>
                      <div className="reports-row-title">{r.title}</div>
                      {r.subtitle && <div className="reports-row-subtitle">{r.subtitle}</div>}
                    </div>
                  </div>
                </td>
                <td>
                  {r.kind === "comparison" ? (
                    <span className="reports-type-tag reports-type-comparison">
                      <GitCompare size={11} style={{ marginRight: 4 }} />
                      Comparison
                    </span>
                  ) : (
                    <span className="reports-type-tag reports-type-individual">
                      <FileText size={11} style={{ marginRight: 4 }} />
                      Individual
                    </span>
                  )}
                </td>
                <td>{r.reviewCount ?? "—"}</td>
                <td>{new Date(r.createdAt).toLocaleDateString("tr-TR")}</td>
                <td>
                  <Link href={r.href} className="reports-view-link">
                    Detayı gör
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
