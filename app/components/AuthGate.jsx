"use client";

import React, { useEffect } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";

// The sign-up screen is a single fixed screen: the header on top, this centred in whatever is left,
// nothing to scroll. While it's mounted the page scroll is locked and the footer is hidden (they
// would otherwise push the page taller than the viewport); both come back when it unmounts.
//
// The header takes 150px of flow (see .kma-header-wrap), so the gate is exactly "viewport - 150px".
// On short screens the content steps down in size instead of overflowing; the wrapper only scrolls
// as a last resort (e.g. a phone held sideways).
export default function AuthGate({ appName, onSignUp, onBack }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("kma-gate-open");
    return () => root.classList.remove("kma-gate-open");
  }, []);

  return (
    <section className="ag-wrap" aria-labelledby="ag-title">
      <style>{`
        html.kma-gate-open, html.kma-gate-open body { overflow: hidden; }
        html.kma-gate-open .kma-footer { display: none; }
        html.kma-gate-open main.min-h-screen { min-height: 0 !important; }

        .ag-wrap {
          box-sizing: border-box; width: 100%; max-width: 760px; margin: 0 auto;
          height: calc(100vh - 150px); height: calc(100dvh - 150px);
          padding: 0 24px 24px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; overflow-y: auto;
        }
        .ag-icon {
          flex-shrink: 0; width: 88px; height: 88px; margin: 0 auto 32px; border-radius: 26px;
          display: flex; align-items: center; justify-content: center;
          background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--chalk);
        }
        .ag-title { margin: 0 0 18px; font-size: 40px; line-height: 1.15; font-weight: 600; color: var(--chalk); }
        .ag-body { margin: 0 auto; max-width: 600px; font-size: 18px; line-height: 1.6; color: var(--muted); }
        .ag-pending { margin: 16px auto 0; font-size: 15px; color: var(--muted); }
        .ag-pending strong { color: var(--chalk); font-weight: 600; }
        .ag-cta {
          margin-top: 40px; flex-shrink: 0;
          height: 60px; padding: 0 44px; border: none; border-radius: 999px; cursor: pointer;
          background: var(--blue-100); color: #fff; font-size: 18px; font-weight: 500; font-family: inherit;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .ag-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .ag-signin { margin: 20px 0 0; font-size: 15px; color: var(--muted); }
        .ag-link { background: none; border: none; padding: 0; font: inherit; font-weight: 600; color: var(--blue-100); cursor: pointer; }
        .ag-link:hover { text-decoration: underline; }
        .ag-back {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 32px;
          background: none; border: none; cursor: pointer; font: inherit; font-size: 14px; color: var(--muted);
        }
        .ag-back:hover { color: var(--chalk); }

        @media (max-width: 640px) {
          .ag-wrap { padding: 0 20px 16px; }
          .ag-title { font-size: 30px; }
          .ag-body { font-size: 16px; }
          .ag-cta { width: 100%; padding: 0 20px; }
        }
        /* Shorter screens: same layout, tighter. */
        @media (max-height: 820px) {
          .ag-icon { width: 64px; height: 64px; margin-bottom: 22px; border-radius: 20px; }
          .ag-icon svg { width: 28px; height: 28px; }
          .ag-title { margin-bottom: 12px; }
          .ag-cta { margin-top: 28px; height: 54px; }
          .ag-signin { margin-top: 16px; }
          .ag-back { margin-top: 18px; }
        }
        @media (max-height: 700px) {
          .ag-icon { display: none; }
          .ag-title { font-size: 28px; }
          .ag-body { font-size: 15px; line-height: 1.5; }
          .ag-pending { margin-top: 10px; font-size: 14px; }
          .ag-cta { margin-top: 22px; height: 50px; font-size: 17px; }
          .ag-signin { margin-top: 12px; font-size: 14px; }
          .ag-back { margin-top: 10px; }
        }
        @media (max-height: 600px) {
          .ag-title { font-size: 24px; margin-bottom: 8px; }
          .ag-body { font-size: 14px; }
          .ag-pending { display: none; }
          .ag-cta { margin-top: 16px; height: 46px; }
        }
      `}</style>

      <div className="ag-icon" aria-hidden="true">
        <Sparkles size={36} />
      </div>

      <h1 id="ag-title" className="ag-title">Sign up free to see your full report</h1>
      <p className="ag-body">
        Get a complete health report for your app: scores across 13 categories, prioritized fixes, and real
        App Store review insights, powered by AI.
      </p>
      {appName && (
        <p className="ag-pending">
          Your analysis of <strong>{appName}</strong>{" "}
          starts as soon as you&apos;re signed in.
        </p>
      )}

      <button type="button" className="ag-cta" onClick={onSignUp}>
        Sign up free to generate
      </button>
      <p className="ag-signin">
        Already have an account?{" "}
        <button type="button" className="ag-link" onClick={onSignUp}>
          Sign in
        </button>
      </p>

      <button type="button" className="ag-back" onClick={onBack}>
        <ArrowLeft size={14} />
        Back to search
      </button>
    </section>
  );
}
