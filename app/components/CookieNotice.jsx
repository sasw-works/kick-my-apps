"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";

const STORAGE_KEY = "kma-cookie-notice-dismissed";

// What this actually says matches the Cookie Policy (/cookies): essential cookies only (keeping
// you signed in), no third-party advertising or tracking cookies. That's also why this is a
// plain notice, not a consent gate with accept/reject options -- there's nothing non-essential
// here to ask permission for, and nothing on the site is blocked while this is showing.
export default function CookieNotice() {
  const { theme } = useTheme();
  const light = theme === "light";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      // Storage can throw (private mode, blocked site data, etc.) -- show it rather than crash;
      // worst case it reappears next visit, which is harmless.
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Nothing to do -- it'll just show again next time, same as a normal browser without
      // persistent storage.
    }
  }

  if (!visible) return null;

  return (
    <div className="kma-cookie-notice" role="note" aria-label="Cookie notice">
      <style>{`
        .kma-cookie-notice {
          position: fixed;
          left: 16px;
          right: 16px;
          bottom: 16px;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          max-width: 640px;
          margin: 0 auto;
          padding: 16px 20px;
          border-radius: 16px;
          background: ${light ? "#FFFFFF" : "#1C1E26"};
          border: 1px solid ${light ? "#E3E8EF" : "#2A2C36"};
          box-shadow: 0 12px 32px rgba(0, 0, 0, ${light ? "0.12" : "0.4"});
          font-family: var(--font-inter), sans-serif;
        }
        .kma-cookie-notice-text {
          flex: 1;
          min-width: 220px;
          font-size: 13px;
          line-height: 1.5;
          color: ${light ? "#697386" : "#9096A3"};
        }
        .kma-cookie-notice-text a {
          color: ${light ? "#533AFD" : "#7C6BFF"};
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .kma-cookie-notice-actions {
          flex-shrink: 0;
          margin-left: auto;
        }
        .kma-cookie-notice-btn {
          display: inline-flex;
          align-items: center;
          background: ${light ? "#533AFD" : "#7C6BFF"};
          color: #fff;
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .kma-cookie-notice-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
        @media (max-width: 480px) {
          .kma-cookie-notice { left: 12px; right: 12px; bottom: 12px; padding: 16px; }
          .kma-cookie-notice-actions { margin-left: 0; width: 100%; }
          .kma-cookie-notice-btn { width: 100%; justify-content: center; }
        }
      `}</style>
      <div className="kma-cookie-notice-text">
        We use essential cookies to keep you signed in. No advertising or tracking cookies.{" "}
        <Link href="/cookies">Learn more</Link>
      </div>
      <div className="kma-cookie-notice-actions">
        <button type="button" className="kma-cookie-notice-btn" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
