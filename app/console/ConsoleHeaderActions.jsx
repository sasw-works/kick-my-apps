"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "../components/ThemeProvider";

// Top-right of every Console page, after Figma 4262:2481: two 58px glass circles, the bell (with a red
// count badge) and the light/dark switch. The bell opens the notifications as a side panel (Figma 4271:672):
// a dimmed, slightly blurred page and a full-height window sliding in from the right.

const KIND = {
  report: { color: "#2b59ff", label: "R" },
  comparison: { color: "#7c6bff", label: "C" },
  rival: { color: "#2dd4bf", label: "M" },
  alert_critical: { color: "#ff5050", label: "!" },
  alert_warn: { color: "#f5a623", label: "!" },
  alert_info: { color: "#2b59ff", label: "i" },
  brief: { color: "#2dd4bf", label: "W" },
};

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function ConsoleHeaderActions() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const wrap = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items || []);
      setUnread(d.unread || 0);
      setLoaded(true);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [load]);

  const bell = useRef(null);
  const closeBtn = useRef(null);
  useEffect(() => {
    if (!open) return;
    load();
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const bellEl = bell.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      bellEl?.focus();
    };
  }, [open, load]);

  async function markRead(body) {
    try {
      const r = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { const d = await r.json(); setUnread(d.unread ?? 0); }
    } catch {}
  }
  function markAll() {
    setItems((xs) => xs.map((x) => ({ ...x, read: true })));
    setUnread(0);
    markRead({ all: true });
  }
  function openItem(n) {
    if (!n.read) {
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      markRead({ ids: [n.id] });
    }
    setOpen(false);
    if (n.href) router.push(n.href);
  }
  async function clearAll() {
    setItems([]); setUnread(0);
    try { await fetch("/api/notifications", { method: "DELETE" }); } catch {}
  }

  return (
    <div className="kma-hdr" ref={wrap}>
      <style>{`
        .kma-hdr { position: absolute; top: 100px; left: 50px; right: 50px; z-index: 30; display: flex; justify-content: center; pointer-events: none; }
        .kma-hdr-inner { width: 100%; max-width: 1120px; display: flex; justify-content: flex-end; align-items: flex-start; gap: 20px; }
        .kma-hdr-slot { position: relative; pointer-events: auto; }
        .kma-hdr-btn {
          position: relative; width: 58px; height: 58px; border-radius: 50%; padding: 0; cursor: pointer;
          display: flex; align-items: center; justify-content: center; color: var(--chalk);
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .kma-hdr-btn:hover, .kma-hdr-btn[aria-expanded="true"] { border-color: #2b59ff; }
        .kma-hdr-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .kma-hdr-btn svg { display: block; }
        .kma-hdr-badge {
          position: absolute; top: -1px; left: 42px; min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box;
          border-radius: 1000px; background: #ff5050; color: #fff; font-size: 13px; line-height: 20px; font-weight: 500;
          text-align: center; pointer-events: none;
        }
        .kma-np-overlay {
          position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(2.5px); -webkit-backdrop-filter: blur(2.5px); animation: kma-np-fade 0.2s ease;
        }
        .kma-np {
          position: fixed; top: 0; right: 0; bottom: 0; z-index: 61; width: min(631px, 100vw); box-sizing: border-box;
          display: flex; flex-direction: column; background: var(--surface); animation: kma-np-slide 0.25s ease;
          font-family: var(--font-inter), sans-serif; letter-spacing: -0.2px; box-shadow: -24px 0 60px rgba(0, 0, 0, 0.35);
        }
        .kma-console.kma-dark .kma-np { background: #0d1117; }
        @keyframes kma-np-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kma-np-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .kma-np-overlay, .kma-np { animation: none; } }
        .kma-np-close {
          position: absolute; top: 100px; right: 75px; width: 58px; height: 58px; border-radius: 50%; padding: 0; cursor: pointer;
          display: flex; align-items: center; justify-content: center; color: var(--chalk);
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); transition: border-color 0.15s ease;
        }
        .kma-np-close:hover { border-color: #2b59ff; }
        .kma-np-close:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .kma-np-close-x {
          width: 15px; height: 15px; background: currentColor;
          -webkit-mask: url(/console/close.svg) center / 15px 15px no-repeat; mask: url(/console/close.svg) center / 15px 15px no-repeat;
        }
        .kma-np-head { padding: 100px 150px 24px 50px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
        .kma-np-title { margin: 0; font-family: Helvetica, Arial, sans-serif; font-size: 48px; line-height: 52px; font-weight: 700; letter-spacing: -1.44px; color: var(--chalk); }
        .kma-np-link { background: none; border: 0; padding: 4px 0; cursor: pointer; font-size: 15px; line-height: 24px; color: #5b8cff; font-family: inherit; letter-spacing: -0.2px; }
        .kma-np-link:hover { text-decoration: underline; }
        .kma-np-link:disabled { color: var(--muted); cursor: default; text-decoration: none; }
        .kma-np-list { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 50px 24px; display: flex; flex-direction: column; gap: 8px; }
        .kma-np-item {
          display: flex; gap: 16px; align-items: flex-start; width: 100%; text-align: left; cursor: pointer; font-family: inherit;
          padding: 16px 20px; border: 1px solid transparent; border-radius: 8px; background: var(--surface); color: var(--chalk);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .kma-console.kma-dark .kma-np-item { background: rgba(255, 255, 255, 0.03); }
        .kma-console:not(.kma-dark) .kma-np-item { border-color: var(--ink-3); }
        .kma-console.kma-dark .kma-np-item:hover, .kma-console.kma-dark .kma-np-item:focus-visible { background: rgba(255, 255, 255, 0.06); border-color: rgba(43, 89, 255, 0.35); }
        .kma-console:not(.kma-dark) .kma-np-item:hover, .kma-np-item:focus-visible { border-color: var(--brand); }
        .kma-np-item:focus-visible { outline: none; }
        .kma-np-ico { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px; font-weight: 600; }
        .kma-np-text { flex: 1; min-width: 0; }
        .kma-np-row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
        .kma-np-name { font-size: 15px; line-height: 22px; font-weight: 500; }
        .kma-np-item.unread .kma-np-name { font-weight: 600; }
        .kma-np-time { font-size: 13px; color: var(--muted); white-space: nowrap; }
        .kma-np-body { margin-top: 2px; font-size: 14px; line-height: 21px; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .kma-np-dot { flex-shrink: 0; width: 8px; height: 8px; margin-top: 8px; border-radius: 50%; background: #2b59ff; }
        .kma-np-empty { padding: 24px 50px; color: var(--muted); font-size: 15px; line-height: 24px; }
        .kma-np-empty b { display: block; color: var(--chalk); font-size: 17px; margin-bottom: 4px; font-weight: 600; }
        .kma-np-foot { padding: 12px 50px 24px; display: flex; justify-content: flex-start; }

        @media (max-width: 900px) {
          .kma-hdr { position: fixed; top: 6px; left: auto; right: 12px; z-index: 46; }
          .kma-hdr-inner { gap: 10px; }
          .kma-hdr-btn { width: 44px; height: 44px; }
          .kma-hdr-btn svg.kma-hdr-glyph { width: 44px; height: 44px; }
          .kma-hdr-badge { left: 30px; top: -4px; }
          .kma-np-close { top: 12px; right: 12px; width: 44px; height: 44px; }
          .kma-np-head { padding: 20px 68px 12px 20px; }
          .kma-np-title { font-size: 28px; line-height: 32px; letter-spacing: -0.8px; }
          .kma-np-list { padding: 8px 16px 16px; }
          .kma-np-empty { padding: 16px 20px; }
          .kma-np-foot { padding: 8px 20px 20px; }
          .kma-np-item { padding: 14px 16px; gap: 12px; }
        }
      `}</style>
      <div className="kma-hdr-inner">
        <div className="kma-hdr-slot">
          <button
            type="button"
            ref={bell}
            className="kma-hdr-btn"
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg className="kma-hdr-glyph" width="58" height="58" viewBox="0 0 58 58" fill="none" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
              <path d="M29.3947 20.7507L29.4065 21.6437M24.1524 25.8269C24.6212 24.002 25.9957 22.5318 27.7731 21.9297C28.8655 21.5596 30.0585 21.5433 31.1584 21.8906C32.9194 22.4466 34.2805 23.8607 34.7746 25.6477L34.8328 25.8585C35.1531 27.017 35.222 28.2312 35.0347 29.4188L35.0151 29.543C34.9967 29.66 35.058 29.7755 35.1618 29.8318C35.7744 30.1641 36.1944 30.8111 36.2042 31.5601C36.2167 32.5078 35.563 33.3331 34.6411 33.5336L34.3152 33.6044C31.1885 34.2844 27.9577 34.3269 24.8142 33.7295L24.4866 33.6672C23.5597 33.4911 22.8845 32.6833 22.8721 31.7356C22.8621 30.979 23.2732 30.3154 23.8871 29.9699C23.9788 29.9183 24.031 29.8141 24.0118 29.7102L23.9902 29.5936C23.7683 28.3926 23.8107 27.1572 24.1145 25.9744L24.1524 25.8269ZM26.9107 34.032C28.68 34.2074 30.4633 34.1839 32.2274 33.962C32.2172 34.134 32.1924 34.305 32.1535 34.4731L32.0845 34.7703C31.8685 35.7016 31.1528 36.4336 30.2299 36.6673C29.8199 36.7711 29.3913 36.7767 28.9787 36.6837C28.05 36.4745 27.3153 35.7616 27.0748 34.8363L26.9981 34.5409C26.9547 34.3739 26.9255 34.2037 26.9107 34.032Z" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </button>
          {unread > 0 && <span className="kma-hdr-badge" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}

          {open && createPortal(
            <>
              <div className="kma-np-overlay" onClick={() => setOpen(false)} aria-hidden="true" />
              <div className="kma-np" role="dialog" aria-modal="true" aria-label="Notifications">
                <button type="button" ref={closeBtn} className="kma-np-close" aria-label="Close notifications" onClick={() => setOpen(false)}>
                  <span className="kma-np-close-x" aria-hidden="true" />
                </button>
                <div className="kma-np-head">
                  <h2 className="kma-np-title">Notifications</h2>
                  <button type="button" className="kma-np-link" onClick={markAll} disabled={unread === 0}>Mark all as read</button>
                </div>
                {!loaded ? (
                  <div className="kma-np-empty">Loading…</div>
                ) : items.length === 0 ? (
                  <div className="kma-np-empty"><b>You’re all caught up</b>New reports, monitor alerts and rival changes will show up here.</div>
                ) : (
                  <>
                    <div className="kma-np-list">
                      {items.map((n) => {
                        const k = KIND[n.kind] || { color: "#2b59ff", label: "•" };
                        return (
                          <button key={n.id} type="button" className={`kma-np-item ${n.read ? "" : "unread"}`} onClick={() => openItem(n)}>
                            <span className="kma-np-ico" style={{ background: k.color }}>{k.label}</span>
                            <span className="kma-np-text">
                              <span className="kma-np-row">
                                <span className="kma-np-name">{n.title}</span>
                                <span className="kma-np-time">{ago(n.createdAt)}</span>
                              </span>
                              {n.body && <span className="kma-np-body" style={{ display: "-webkit-box" }}>{n.body}</span>}
                            </span>
                            {!n.read && <span className="kma-np-dot" aria-label="Unread" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="kma-np-foot">
                      <button type="button" className="kma-np-link" onClick={clearAll}>Clear all</button>
                    </div>
                  </>
                )}
              </div>
            </>,
            wrap.current?.closest(".kma-console") || document.body
          )}
        </div>

        <div className="kma-hdr-slot">
          <button type="button" className="kma-hdr-btn" aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} onClick={toggleTheme}>
            {/* Like the home page, the icon shows the mode a click switches TO: a sun while dark, a moon while light. */}
            {theme === "light" ? (
              <svg className="kma-hdr-glyph" width="58" height="58" viewBox="0 0 58 58" fill="none" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
                <path d="M29.22 24.2095C29.22 22.9826 29.4941 21.8229 29.9723 20.7772C29.7939 20.7651 29.6159 20.75 29.4345 20.75C25.0525 20.75 21.5 24.3318 21.5 28.75C21.5 33.1682 25.0525 36.75 29.4345 36.75C32.5199 36.75 35.1876 34.9705 36.5 32.3777C32.4084 31.9401 29.22 28.4512 29.22 24.2095Z" stroke="currentColor" strokeMiterlimit="10" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="kma-hdr-glyph" width="58" height="58" viewBox="0 0 58 58" fill="none" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
                <path transform="translate(1 1)" d="M28.5 18V20M28.5 36V38M21.43 20.93L22.84 22.34M34.16 33.66L35.57 35.07M18.5 28H20.5M36.5 28H38.5M22.84 33.66L21.43 35.07M35.57 20.93L34.16 22.34M32.5 28C32.5 30.2091 30.7091 32 28.5 32C26.2909 32 24.5 30.2091 24.5 28C24.5 25.7909 26.2909 24 28.5 24C30.7091 24 32.5 25.7909 32.5 28Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
