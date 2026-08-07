"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Clock, Loader2 } from "lucide-react";

function AppIcon({ name, size = 44, iconUrl, storeUrl }) {
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
        style={{ borderRadius: 10, flexShrink: 0, objectFit: "cover", border: "1px solid var(--ink-3)", boxSizing: "border-box" }}
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

export default function ConsoleComparePage() {
  const router = useRouter();
  const [scans, setScans] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [selected, setSelected] = useState([]); // en fazla 2 scan id
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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

  const toggleSelect = (id) => {
    setError("");
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selected.length !== 2) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/history/compare?ids=${selected.join(",")}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Karşılaştırma verisi alınamadı.");
      if (!data.scans || data.scans.length !== 2) throw new Error("İki tarama da bulunamadı.");

      const saveRes = await fetch("/api/history/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scanIdA: data.scans[0].id,
          scanIdB: data.scans[1].id,
          appNameA: data.scans[0].app_name,
          appNameB: data.scans[1].app_name,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Karşılaştırma kaydedilemedi.");

      router.push(`/console/compare/${saveData.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <main className="compare-page">
      <style>{`
        .compare-page { padding: 48px 40px 100px; max-width: 1240px; margin: 0 auto; }
        .compare-header { text-align: center; margin-bottom: 44px; }
        .compare-header-icon {
          width: 48px; height: 48px; border-radius: 50%; background: color-mix(in srgb, var(--brand) 12%, transparent);
          display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--brand);
        }
        .compare-header h1 { font-family: var(--font-inter), sans-serif; font-size: 30px; font-weight: 800; color: var(--chalk); margin-bottom: 8px; }
        .compare-header p { font-size: 14.5px; color: var(--muted); }
        .compare-section-label { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 14px; text-transform: uppercase; }
        .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 48px; }
        .compare-card {
          display: flex; align-items: center; gap: 14px; background: var(--ink-2); border: 2px solid var(--ink-3);
          border-radius: 14px; padding: 16px; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease;
        }
        .compare-card:hover { border-color: color-mix(in srgb, var(--brand) 40%, var(--ink-3)); }
        .compare-card-selected { border-color: var(--brand); background: color-mix(in srgb, var(--brand) 6%, var(--ink-2)); }
        .compare-card-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .compare-recent-row {
          display: flex; align-items: center; gap: 14px; background: var(--ink-2); border: 1px solid var(--ink-3);
          border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; text-decoration: none; color: inherit;
          transition: border-color 0.15s ease;
        }
        .compare-recent-row:hover { border-color: var(--brand); }
        .compare-recent-icons { display: flex; align-items: center; }
        .compare-recent-vs { font-size: 11px; color: var(--muted); margin: 0 8px; font-weight: 600; }
        .compare-empty { text-align: center; color: var(--muted); padding: 40px 0; }
        .compare-cta-bar {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          background: #14151A; color: #fff; border-radius: 999px; padding: 10px 10px 10px 20px;
          display: flex; align-items: center; gap: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 50;
        }
        .compare-cta-btn {
          background: var(--brand); color: #fff; border: none; border-radius: 999px; padding: 10px 20px;
          font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;
        }
        .compare-cta-btn:disabled { opacity: 0.6; cursor: default; }
        .compare-error { color: var(--kick); font-size: 13px; text-align: center; margin-top: 12px; }
      `}</style>

      <div className="compare-header">
        <div className="compare-header-icon">
          <ArrowLeftRight size={22} />
        </div>
        <h1>Compare Apps</h1>
        <p>Pick two reports to generate a head-to-head competitive benchmark.</p>
      </div>

      {scans === null ? (
        <div className="compare-empty">
          <Loader2 size={20} className="spin" />
        </div>
      ) : (
        <>
          <div className="compare-section-label">Your Reports ({scans.length})</div>
          {scans.length === 0 ? (
            <div className="compare-empty">Henüz bir sorgulama yapmadın.</div>
          ) : (
            <div className="compare-grid">
              {scans.map((s) => {
                const isSelected = selected.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className={`compare-card ${isSelected ? "compare-card-selected" : ""}`}
                    onClick={() => toggleSelect(s.id)}
                  >
                    <AppIcon name={s.app_name} iconUrl={s.icon_url} storeUrl={s.store_url} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{s.app_name}</div>
                      <div className="compare-card-meta">{new Date(s.created_at).toLocaleDateString("tr-TR")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {comparisons.length > 0 && (
            <>
              <div className="compare-section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={12} />
                Recent Comparisons
              </div>
              {comparisons.map((c) => (
                <a key={c.id} href={`/console/compare/${c.id}`} className="compare-recent-row">
                  <div className="compare-recent-icons">
                    <AppIcon name={c.app_name_a} size={32} iconUrl={c.icon_url_a} />
                    <span className="compare-recent-vs">vs</span>
                    <AppIcon name={c.app_name_b} size={32} iconUrl={c.icon_url_b} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {c.app_name_a} vs {c.app_name_b}
                    </div>
                    <div className="compare-card-meta">{new Date(c.created_at).toLocaleDateString("tr-TR")}</div>
                  </div>
                </a>
              ))}
            </>
          )}
        </>
      )}

      {error && <div className="compare-error">{error}</div>}

      {selected.length > 0 && (
        <div className="compare-cta-bar">
          <span style={{ fontSize: 13.5 }}>{selected.length}/2 seçildi</span>
          <button className="compare-cta-btn" onClick={handleCompare} disabled={selected.length !== 2 || creating}>
            {creating ? <Loader2 size={14} className="spin" /> : <ArrowLeftRight size={14} />}
            {creating ? "Hazırlanıyor…" : "Karşılaştır"}
          </button>
        </div>
      )}
    </main>
  );
}
