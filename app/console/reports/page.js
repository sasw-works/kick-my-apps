"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, FileText, GitCompare, Loader2, Eye, Download, Trash2, X } from "lucide-react";

function AppIcon({ name, size = 40, iconUrl, storeUrl }) {
  const [fetchedUrl, setFetchedUrl] = useState(null);
  const src = iconUrl || fetchedUrl;

  useEffect(() => {
    if (iconUrl || !storeUrl) return;
    let cancelled = false;
    fetch(`/api/app-icon?storeUrl=${encodeURIComponent(storeUrl)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.iconUrl) setFetchedUrl(d.iconUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [iconUrl, storeUrl]);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{
          borderRadius: 10,
          flexShrink: 0,
          objectFit: "cover",
          border: "1px solid var(--ink-3)",
          boxSizing: "border-box",
        }}
      />
    );
  }

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
    href: `/console/reports/${s.id}`,
    deleteUrl: `/api/history?id=${s.id}`,
    icon: <AppIcon name={s.app_name} iconUrl={s.icon_url} storeUrl={s.store_url} />,
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
        <AppIcon name={c.app_name_a} size={40} iconUrl={c.icon_url_a} />
        <div style={{ marginLeft: -12 }}>
          <AppIcon name={c.app_name_b} size={40} iconUrl={c.icon_url_b} />
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
    if (!confirm(`"${row.title}" silinsin mi? Bu işlem geri alınamaz.`)) return;
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
    if (!confirm(`${selectedRows.length} rapor silinsin mi? Bu işlem geri alınamaz.`)) return;
    setDeleting(true);
    await Promise.all(selectedRows.map((r) => fetch(r.deleteUrl, { method: "DELETE" })));
    setDeleting(false);
    clearSelection();
    loadAll();
  };

  const handleDownloadSelected = () => {
    // Toplu/anlık PDF üretimi henüz yok; her raporu kendi sayfasında (gerçek "PDF İndir" ile) açıyoruz.
    selectedRows.forEach((r) => window.open(r.href, "_blank"));
  };

  return (
    <main className="reports-page">
      <style>{`
        .reports-page { padding: 32px 40px 120px; max-width: 1300px; margin: 0 auto; }
        .reports-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 24px; }
        .reports-search {
          flex: 1; max-width: 640px; display: flex; align-items: center; gap: 10px;
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 999px; padding: 11px 18px;
        }
        .reports-search input { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; color: var(--chalk); }
        .reports-tabs { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
        .reports-tab {
          display: flex; align-items: center; gap: 6px; background: var(--ink-2); border: 1px solid var(--ink-3);
          border-radius: 999px; padding: 6px 14px; font-size: 12.5px; color: var(--muted); cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .reports-tab:hover { border-color: var(--brand); }
        .reports-tab-active { background: var(--ink-3); border-color: var(--chalk); color: var(--chalk); font-weight: 600; }
        .reports-tab-count { font-family: var(--font-mono); font-size: 11px; opacity: 0.7; }
        .reports-table { width: 100%; border-collapse: collapse; background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 14px; overflow: hidden; }
        .reports-table th {
          text-align: left; font-size: 11px; letter-spacing: 0.06em; color: var(--muted); font-weight: 600;
          padding: 14px 16px; border-bottom: 1px solid var(--ink-3); text-transform: uppercase;
        }
        .reports-table td { padding: 14px 16px; border-bottom: 1px solid var(--ink-3); font-size: 14px; color: var(--chalk); vertical-align: middle; }
        .reports-table tr:last-child td { border-bottom: none; }
        .reports-table tr { transition: background 0.1s ease; }
        .reports-table tbody tr:hover { background: var(--ink); }
        .reports-row-selected { background: color-mix(in srgb, var(--brand) 6%, transparent) !important; }
        .reports-row-name { display: flex; align-items: center; gap: 12px; }
        .reports-row-title { font-weight: 600; }
        .reports-row-subtitle { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .reports-type-tag { display: inline-flex; align-items: center; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; width: fit-content; }
        .reports-type-individual { background: var(--ink-3); color: var(--muted); }
        .reports-type-comparison { background: color-mix(in srgb, var(--brand) 15%, transparent); color: var(--brand); }
        .reports-empty { text-align: center; padding: 80px 20px; color: var(--muted); }
        .reports-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--brand); }
        .reports-row-actions { display: flex; align-items: center; gap: 6px; opacity: 0; transition: opacity 0.12s ease; }
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
          background: #14151A; color: #fff; border-radius: 999px; padding: 12px 12px 12px 20px;
          display: flex; align-items: center; gap: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 50;
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

      <div className="reports-toolbar">
        <div className="reports-search">
          <Search size={16} color="var(--muted)" />
          <input placeholder="Search reports..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="reports-tabs">
          {[
            { key: "all", label: "All", count: individualRows.length + comparisonRows.length },
            { key: "comparison", label: "Comparison", count: comparisonRows.length },
            { key: "individual", label: "Individual", count: individualRows.length },
          ].map((t) => (
            <button
              key={t.key}
              className={`reports-tab ${filter === t.key ? "reports-tab-active" : ""}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label} <span className="reports-tab-count">{t.count}</span>
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
              <th style={{ width: 40 }}>
                <input type="checkbox" className="reports-checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th>Report</th>
              <th>Type</th>
              <th>Reviews</th>
              <th>Created</th>
              <th>Actions</th>
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
                  <div className="reports-row-actions">
                    <button className="reports-action-btn" onClick={() => router.push(r.href)} aria-label="Görüntüle">
                      <Eye size={14} />
                    </button>
                    <button className="reports-action-btn" onClick={() => window.open(r.href, "_blank")} aria-label="İndir">
                      <Download size={14} />
                    </button>
                    <button
                      className="reports-action-btn reports-action-btn-danger"
                      onClick={() => handleDeleteOne(r)}
                      aria-label="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected.size > 0 && (
        <div className="reports-selection-bar">
          <div className="reports-selection-count">
            <span className="reports-selection-badge">{selected.size}</span>
            Selected
          </div>
          <div className="reports-selection-divider" />
          <div className="reports-selection-actions">
            <button className="reports-selection-btn" onClick={handleDownloadSelected} aria-label="İndir">
              <Download size={16} />
            </button>
            <button className="reports-selection-btn" onClick={handleDeleteSelected} disabled={deleting} aria-label="Sil">
              <Trash2 size={16} />
            </button>
            <button className="reports-selection-btn" onClick={clearSelection} aria-label="Kapat">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
