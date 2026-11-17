"use client";

import React, { useEffect, useRef, useState } from "react";
import { Link2, Check, Loader2 } from "lucide-react";

// Toolbar button + small popover for a report's public read-only link. Anyone with the link can
// view the report (no account needed); "Stop sharing" revokes it immediately.
export default function ShareButton({ scanId }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ loading: false, token: null, error: "" });
  const [copied, setCopied] = useState(false);
  const boxRef = useRef(null);

  const url = state.token && typeof window !== "undefined" ? `${window.location.origin}/r/${state.token}` : "";

  async function call(method) {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await fetch(`/api/history/share?id=${scanId}`, { method });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setState({ loading: false, token: data.token || null, error: "" });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }

  useEffect(() => {
    if (open) call("GET");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scanId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the link is still selectable in the field */
    }
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      {/* On phones the button can sit anywhere in a wrapped toolbar, so pin the popover to the screen instead. */}
      <style>{`@media (max-width: 640px) { .kma-share-pop { position: fixed !important; left: 16px !important; right: 16px !important; top: 84px !important; width: auto !important; } }`}</style>
      <button
        className="kma-toolbar-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: "var(--ink-2)", border: "1px solid var(--ink-3)", borderRadius: 999,
          padding: "0 14px", fontSize: 13.5, color: "var(--chalk)", height: 44, boxSizing: "border-box",
        }}
      >
        <Link2 size={15} /> Share
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Share report"
          className="kma-share-pop"
          style={{
            position: "absolute", top: 52, right: 0, zIndex: 40, width: 320,
            background: "var(--ink-2)", border: "1px solid var(--ink-3)", borderRadius: 12, padding: 16,
            boxShadow: "var(--shadow, 0 8px 30px rgba(0,0,0,.25))", textAlign: "left",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--chalk)", marginBottom: 4 }}>Share this report</div>
          {state.token ? (
            <>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10, lineHeight: 1.45 }}>
                Anyone with this link can view this report, without an account. It can't be edited.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.target.select()}
                  aria-label="Share link"
                  style={{ flex: 1, minWidth: 0, background: "var(--ink)", border: "1px solid var(--ink-3)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--chalk)" }}
                />
                <button
                  onClick={copy}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--brand)", color: "#fff", border: 0, borderRadius: 8, padding: "0 12px", fontSize: 12.5, fontWeight: 600 }}
                >
                  {copied ? <Check size={14} /> : null}{copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => call("DELETE")}
                disabled={state.loading}
                style={{ marginTop: 12, background: "none", border: 0, padding: 0, fontSize: 12.5, color: "var(--kick)", textDecoration: "underline" }}
              >
                Stop sharing
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10, lineHeight: 1.45 }}>
                Create a private link anyone can open without signing in. You can turn it off at any time.
              </div>
              <button
                onClick={() => call("POST")}
                disabled={state.loading}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--brand)", color: "#fff", border: 0, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600 }}
              >
                {state.loading && <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />} Create link
              </button>
            </>
          )}
          {state.error && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--kick)" }}>{state.error}</div>}
        </div>
      )}
    </div>
  );
}
