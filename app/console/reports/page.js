"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, FileText, Loader2 } from "lucide-react";

function AppIcon({ name }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  const hue = Array.from(name || "").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: 15,
        background: `hsl(${hue}, 65%, 45%)`,
      }}
    >
      {letter}
    </div>
  );
}

export default function ConsoleReportsPage() {
  const [scans, setScans] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | individual | comparison

  useEffect(() => {
    fetch("/api/history?all=true")
      .then((r) => r.json())
      .then((d) => setScans(d.scans || []))
      .catch(() => setScans([]));
  }, []);

  const filtered = (scans || []).filter((s) => {
    if (query && !s.app_name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "comparison") return false; // Henüz kalıcı karşılaştırma raporu üretmiyoruz.
    return true;
  });

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
        .reports-type-tag { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--ink-3); color: var(--muted); width: fit-content; }
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
            { key: "individual", label: "Individual" },
            { key: "comparison", label: "Comparison" },
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
      ) : filtered.length === 0 ? (
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
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="reports-row-name">
                    <AppIcon name={s.app_name} />
                    <span style={{ fontWeight: 600 }}>{s.app_name}</span>
                  </div>
                </td>
                <td>
                  <span className="reports-type-tag">
                    <FileText size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                    Individual
                  </span>
                </td>
                <td>{s.review_count ?? "—"}</td>
                <td>{new Date(s.created_at).toLocaleDateString("tr-TR")}</td>
                <td>
                  <Link href={`/history/${s.id}`} className="reports-view-link">
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
