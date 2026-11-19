"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

const MAX = 8;
const MAX_SIDE = 1280;

// Shrinks a picked image in the browser (longest side 1280px, JPEG) so uploads stay small and fast.
async function shrink(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.82));
  if (!blob) throw new Error("Could not read one of the images.");
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

// Card on a report's page: add the app's own screenshots to a report that has none (or replace them).
export default function AddScreens({ scanId, hasVisual, runs = 0, maxRuns = 2, onDone }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const input = useRef(null);
  const left = Math.max(0, maxRuns - runs);

  function pick(e) {
    const list = [...e.target.files].filter((f) => f.type.startsWith("image/")).slice(0, MAX);
    setFiles(list); setError(""); setNote("");
    e.target.value = "";
  }
  async function send() {
    setBusy(true); setError(""); setNote("");
    try {
      const form = new FormData();
      for (const f of files) form.append("files", await shrink(f));
      const res = await fetch(`/api/history/screens?id=${scanId}`, { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Could not add the screenshots.");
      setFiles([]);
      setNote(`Added ${d.added} visual finding${d.added === 1 ? "" : "s"}. Health score ${d.scoreBefore ?? "—"} → ${d.scoreAfter}.`);
      onDone?.();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (hasVisual && left === 0) return null;
  return (
    <section className="as-card" aria-label="Add screenshots" data-testid="add-screens">
      <div className="as-title"><ImagePlus size={16} /> {hasVisual ? "Replace the screenshots" : "Add screenshots to this report"}</div>
      <div className="as-sub">
        {hasVisual
          ? `Upload different screens and the visual findings are redone. ${left} change${left === 1 ? "" : "s"} left for this report.`
          : "This report was made without screenshots, so it has no visual analysis (UI, accessibility, navigation, approval risks). Add 1–8 screens of the app and those sections are added here, without a new report."}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={pick} data-testid="screens-input" />
      <div className="as-row">
        <button type="button" className="as-btn" onClick={() => input.current?.click()} disabled={busy}>Choose screenshots</button>
        {files.length > 0 && (
          <>
            <span className="as-count">{files.length} selected</span>
            <button type="button" className="as-btn as-go" onClick={send} disabled={busy}>
              {busy ? <Loader2 size={14} className="as-spin" /> : null} Analyze
            </button>
            <button type="button" className="as-x" aria-label="Clear" onClick={() => setFiles([])} disabled={busy}><X size={14} /></button>
          </>
        )}
      </div>
      {busy && <div className="as-note">Analyzing the screens, this takes up to a minute…</div>}
      {error && <div className="as-err" role="alert">{error}</div>}
      {note && <div className="as-note" role="status">{note}</div>}
      <style>{`
        .as-card { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; }
        .as-title { display: flex; gap: 8px; align-items: center; font-weight: 600; color: var(--chalk); }
        .as-sub { font-size: 13px; color: var(--muted); line-height: 1.5; margin: 6px 0 12px; max-width: 720px; }
        .as-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .as-btn { display: inline-flex; gap: 6px; align-items: center; height: 34px; padding: 0 14px; border-radius: 9px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); font: inherit; font-weight: 600; font-size: 13px; cursor: pointer; }
        .as-go { border-color: var(--brand); }
        .as-btn:disabled { opacity: .5; cursor: default; }
        .as-count { font-size: 13px; color: var(--muted); }
        .as-x { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 4px; }
        .as-note { font-size: 13px; color: var(--muted); margin-top: 10px; }
        .as-err { font-size: 13px; color: var(--kick); margin-top: 10px; }
        .as-spin { animation: as-rot 1s linear infinite; } @keyframes as-rot { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
