"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Download, Trash2, X } from "lucide-react";
import { reportPath } from "../../lib/reportPath";
import { SkeletonBlock } from "../../components/Skeleton";
import AppIcon from "../../components/AppIcon";

export default function ConsoleReportsPage() {
  const router = useRouter();
  const [scans, setScans] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | individual | comparison
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadAll = () => {
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
  };

  useEffect(() => {
    loadAll();
  }, []);

  const individualRows = (scans || []).map((s) => ({
    kind: "individual",
    id: s.id,
    key: `individual-${s.id}`,
    title: s.app_name,
    subtitle: null,
    reviewCount: s.review_count,
    createdAt: s.created_at,
    href: reportPath(s.id, s.app_name),
    deleteUrl: `/api/history?id=${s.id}`,
    icon: <AppIcon name={s.app_name} size={55} radius={16} iconUrl={s.icon_url} storeUrl={s.store_url} />,
  }));

  const comparisonRows = comparisons.map((c) => ({
    kind: "comparison",
    id: c.id,
    key: `comparison-${c.id}`,
    title: `${c.app_name_a} vs ${c.app_name_b}`,
    subtitle: `${c.app_name_a} vs ${c.app_name_b}`,
    reviewCount: null,
    createdAt: c.created_at,
    href: `/console/compare/${c.id}`,
    deleteUrl: `/api/history/compare?id=${c.id}`,
    icon: (
      <div style={{ display: "flex" }}>
        <AppIcon name={c.app_name_a} size={55} radius={16} iconUrl={c.icon_url_a} />
        <div style={{ marginLeft: -23 }}>
          <AppIcon name={c.app_name_b} size={55} radius={16} iconUrl={c.icon_url_b} />
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

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.key));

  const toggleRow = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(rows.map((r) => r.key));
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectedRows = rows.filter((r) => selected.has(r.key));

  const handleDeleteOne = async (row) => {
    if (!confirm(`Delete "${row.title}"? This action cannot be undone.`)) return;
    await fetch(row.deleteUrl, { method: "DELETE" });
    loadAll();
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(row.key);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;
    if (!confirm(`Delete ${selectedRows.length} report(s)? This action cannot be undone.`)) return;
    setDeleting(true);
    await Promise.all(selectedRows.map((r) => fetch(r.deleteUrl, { method: "DELETE" })));
    setDeleting(false);
    clearSelection();
    loadAll();
  };

  const handleDownloadSelected = () => {
    // Bulk/instant PDF generation doesn't exist yet; we open each report on its own page (with the real "Download PDF" there).
    selectedRows.forEach((r) => window.open(r.href, "_blank"));
  };

  return (
    <main className="reports-page">
      <style>{`
        .reports-page { padding: 0 0 120px; max-width: 1120px; margin: 0 auto; }
        .reports-header { text-align: left; margin-bottom: 50px; display: flex; flex-direction: column; gap: 8px; }
        .reports-header h1 { margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 48px; line-height: 52px; font-weight: 700; letter-spacing: -1.44px; color: var(--chalk); }
        .reports-header p { margin: 0; font-size: 15px; line-height: 32px; letter-spacing: -0.2px; font-weight: 400; color: var(--muted); }
        .reports-toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 50px; }
        .reports-search {
          flex: 1; min-width: 0; display: flex; align-items: center; gap: 24px;
          background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 114px; padding: 0 42px;
          backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
          height: 58px; box-sizing: border-box;
        }
        .reports-search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 15px; letter-spacing: -0.2px; color: var(--chalk); }
        .reports-search input::placeholder { color: var(--chalk); opacity: 1; }
        .reports-search:focus-within { border-color: var(--brand); }
        .reports-tabs { display: flex; gap: 16px; flex-wrap: wrap; flex-shrink: 0; }
        .reports-tab {
          display: flex; align-items: center; justify-content: center; background: var(--glass-bg); border: 1px solid var(--glass-border);
          border-radius: 114px; padding: 0 42px; font-size: 15px; letter-spacing: -0.2px; color: var(--chalk); cursor: pointer; white-space: nowrap;
          backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
          transition: border-color 0.15s ease, background 0.15s ease;
          height: 58px; box-sizing: border-box; width: 175px; padding-left: 0; padding-right: 0;
        }
        .reports-tab:hover { border-color: var(--brand); }
        .reports-tab:focus { outline: none; }
        .reports-tab:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .reports-tab-active { background: rgba(43, 89, 255, 0.5); border-color: #2b59ff; }
        .reports-table-scroll { width: 100%; overflow-x: auto; }
        /* Figma 4242:598: every row is its own 8px-rounded card, 2px apart; the header row is a slightly lighter card. */
        .reports-table { width: 100%; min-width: 760px; border-collapse: separate; border-spacing: 0 2px; }
        .reports-table th {
          text-align: left; font-size: 15px; letter-spacing: -0.2px; color: var(--chalk); font-weight: 500;
          padding: 16px 0; height: 80px; box-sizing: border-box; background: var(--ink-2);
        }
        .reports-table td { padding: 16px 0; font-size: 15px; letter-spacing: -0.2px; color: var(--muted); vertical-align: middle; height: 80px; box-sizing: border-box; background: var(--surface); transition: background 0.1s ease; }
        .reports-table th:first-child, .reports-table td:first-child { padding-left: 32px; border-radius: 8px 0 0 8px; }
        .reports-table th:last-child, .reports-table td:last-child { padding-right: 32px; border-radius: 0 8px 8px 0; }
        @media (max-width: 900px) {
          .reports-page { padding: 0 0 120px; }
          .reports-toolbar { flex-wrap: wrap; }
          .reports-search { flex: 1 1 100%; padding: 0 24px; }
          .reports-tabs { flex: 1 1 100%; gap: 8px; }
          .reports-tab { flex: 1 1 0; min-width: 0; width: auto; padding: 0 8px; font-size: 13px; }
        }
        .reports-col-center, th.reports-col-center, td.reports-col-center { text-align: center; }
        .reports-table tbody tr:hover td { background: var(--ink-2); }
        .reports-table tbody tr.reports-row-selected td { background: color-mix(in srgb, var(--brand) 12%, var(--surface)); }
        .reports-row-name { display: flex; align-items: center; gap: 19px; }
        .reports-row-name-clickable { cursor: pointer; width: fit-content; }
        .reports-row-title { font-weight: 500; color: var(--chalk); }
        .reports-row-subtitle { font-size: 13px; color: var(--muted); margin-top: 2px; }
        .reports-type-tag { display: inline-flex; align-items: center; font-size: 13px; line-height: 32px; font-weight: 400; padding: 0 18px; border-radius: 100px; width: fit-content; }
        .reports-type-individual { background: rgba(255, 255, 255, 0.05); color: var(--muted); }
        .reports-type-comparison { background: rgba(43, 89, 255, 0.1); color: #2b59ff; }
        .reports-empty { text-align: center; padding: 96px 24px; color: var(--muted); }
        /* Selection control drawn like the Figma radio (4247:744): 24px ring, blue ring + dot when on. Still a checkbox
           underneath, so several rows can be selected at once. */
        .reports-checkbox {
          appearance: none; -webkit-appearance: none;
          width: 24px; height: 24px; border-radius: 50%; cursor: pointer; margin: 0; flex-shrink: 0;
          background: transparent; border: 1px solid var(--glass-border);
          display: inline-block; vertical-align: middle;
          transition: border-color 0.12s ease;
        }
        .reports-checkbox:hover { border-color: var(--brand); }
        .reports-checkbox:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .reports-checkbox:checked { border-color: #2b59ff; background: radial-gradient(circle, #2b59ff 0 6px, transparent 6.5px); }
        .reports-row-actions { display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0; transition: opacity 0.12s ease; }
        .reports-table tbody tr:hover .reports-row-actions { opacity: 1; }
        .reports-action-btn {
          width: 30px; height: 30px; border-radius: 8px; border: none; background: var(--ink-3);
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--chalk);
          transition: background 0.12s ease;
        }
        .reports-action-btn:hover { background: color-mix(in srgb, var(--brand) 18%, transparent); color: var(--brand); }
        .reports-action-btn-danger:hover { background: color-mix(in srgb, var(--kick) 18%, transparent); color: var(--kick); }
        .reports-selection-bar {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          background: #14151A; color: #fff; border-radius: 999px; padding: 12px 12px 12px 24px;
          display: flex; align-items: center; gap: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 50;
        }
        .reports-selection-count {
          display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;
        }
        .reports-selection-badge {
          background: var(--teal); color: #fff; width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
        }
        .reports-selection-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.2); }
        .reports-selection-actions { display: flex; align-items: center; gap: 4px; }
        .reports-selection-btn {
          width: 34px; height: 34px; border-radius: 50%; border: none; background: transparent; color: #fff;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .reports-selection-btn:hover { background: rgba(255,255,255,0.12); }
      `}</style>

      <div className="reports-header">
        <h1>Manage insights</h1>
        <p>Manage all the reports you’ve generated, keeping them organized and easy to find whenever you need them.</p>
      </div>

      <div className="reports-toolbar">
        <div className="reports-search">
          <img src="/console/search.svg" alt="" width={16} height={16} style={{ display: "block", flexShrink: 0 }} />
          <input placeholder="Search reports" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="reports-tabs">
          {[
            { key: "all", label: "All reports", count: individualRows.length + comparisonRows.length },
            { key: "comparison", label: "Comparison", count: comparisonRows.length },
            { key: "individual", label: "Individual", count: individualRows.length },
          ].map((t) => (
            <button
              key={t.key}
              className={`reports-tab ${filter === t.key ? "reports-tab-active" : ""}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      </div>

      {scans === null ? (
        <div className="reports-table-scroll">
          <table className="reports-table" lang="en">
            <thead>
              <tr>
                <th style={{ width: 24 }} />
                <th style={{ paddingLeft: 32 }}>Report</th>
                <th lang="en" className="reports-col-center" style={{ width: 175 }}>Inquiry Type</th>
                <th lang="en" className="reports-col-center" style={{ width: 175 }}>Reviews</th>
                <th lang="en" className="reports-col-center" style={{ width: 175 }}>Created on</th>
                <th lang="en" className="reports-col-center" style={{ width: 175 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td>
                    <SkeletonBlock width={16} height={16} radius={4} />
                  </td>
                  <td>
                    <div className="reports-row-name">
                      <SkeletonBlock width={55} height={55} radius={16} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <SkeletonBlock width={140} height={14} />
                        <SkeletonBlock width={90} height={10} />
                      </div>
                    </div>
                  </td>
                  <td className="reports-col-center">
                    <SkeletonBlock width={84} height={22} radius={999} style={{ margin: "0 auto" }} />
                  </td>
                  <td className="reports-col-center">
                    <SkeletonBlock width={22} height={14} style={{ margin: "0 auto" }} />
                  </td>
                  <td className="reports-col-center">
                    <SkeletonBlock width={72} height={14} style={{ margin: "0 auto" }} />
                  </td>
                  <td className="reports-col-center">
                    <SkeletonBlock width={60} height={14} style={{ margin: "0 auto" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : rows.length === 0 ? (
        <div className="reports-empty">
          <div>You haven't run any queries yet.</div>
        </div>
      ) : (
        <div className="reports-table-scroll">
          <table className="reports-table" lang="en">
          <thead>
            <tr>
              <th style={{ width: 24 }}>
                <input type="checkbox" className="reports-checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th style={{ paddingLeft: 32 }}>Report</th>
              <th lang="en" className="reports-col-center" style={{ width: 175 }}>Inquiry Type</th>
              <th lang="en" className="reports-col-center" style={{ width: 175 }}>Reviews</th>
              <th lang="en" className="reports-col-center" style={{ width: 175 }}>Created on</th>
              <th lang="en" className="reports-col-center" style={{ width: 175 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={selected.has(r.key) ? "reports-row-selected" : ""}>
                <td>
                  <input
                    type="checkbox"
                    className="reports-checkbox"
                    checked={selected.has(r.key)}
                    onChange={() => toggleRow(r.key)}
                  />
                </td>
                <td>
                  <div
                    className="reports-row-name reports-row-name-clickable"
                    onClick={() => router.push(r.href)}
                  >
                    {r.icon}
                    <div>
                      <div className="reports-row-title">{r.title}</div>
                      {r.subtitle && <div className="reports-row-subtitle">{r.subtitle}</div>}
                    </div>
                  </div>
                </td>
                <td className="reports-col-center">
                  {r.kind === "comparison" ? (
                    <span className="reports-type-tag reports-type-comparison">
                      Comparison
                    </span>
                  ) : (
                    <span className="reports-type-tag reports-type-individual">
                      Individual
                    </span>
                  )}
                </td>
                <td className="reports-col-center">{r.reviewCount ?? "—"}</td>
                <td className="reports-col-center">{new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="reports-col-center">
                  <div className="reports-row-actions">
                    <button className="reports-action-btn" onClick={() => router.push(r.href)} aria-label="View">
                      <Eye size={14} />
                    </button>
                    <button className="reports-action-btn" onClick={() => window.open(r.href, "_blank")} aria-label="Download">
                      <Download size={14} />
                    </button>
                    <button
                      className="reports-action-btn reports-action-btn-danger"
                      onClick={() => handleDeleteOne(r)}
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}

      {selected.size > 0 && (
        <div className="reports-selection-bar">
          <div className="reports-selection-count">
            <span className="reports-selection-badge">{selected.size}</span>
            Selected
          </div>
          <div className="reports-selection-divider" />
          <div className="reports-selection-actions">
            <button className="reports-selection-btn" onClick={handleDownloadSelected} aria-label="Download">
              <Download size={16} />
            </button>
            <button className="reports-selection-btn" onClick={handleDeleteSelected} disabled={deleting} aria-label="Delete">
              <Trash2 size={16} />
            </button>
            <button className="reports-selection-btn" onClick={clearSelection} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
