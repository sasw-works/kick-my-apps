"use client";

import React, { useLayoutEffect } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";

// The sign-up screen is a single fixed screen: header on top, footer at the bottom, and this
// centred in whatever is left. Nothing scrolls. While it's mounted the page scroll is locked; that
// is released when it unmounts.
//
// Available height = viewport - header (150px; slimmed to 88px on short screens) - footer. The footer's height isn't constant (on a
// phone its links stack), so it's measured and exposed as --kma-footer-h rather than guessed.
// The content then steps down in size according to the height it actually has (container queries
// on the wrapper) instead of the window's: icon shrinks then hides, type tightens, and only on
// the very smallest screens does the description drop. The wrapper scrolls only as a last resort.
export default function AuthGate({ appName, onSignUp, onBack }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const footer = document.querySelector(".kma-footer");
    root.classList.add("kma-gate-open");

    const measure = () => {
      let h = 0;
      if (footer) {
        const cs = getComputedStyle(footer);
        h = footer.getBoundingClientRect().height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
      }
      root.style.setProperty("--kma-footer-h", `${Math.ceil(h)}px`);
    };
    measure();
    const observer = footer && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer) observer.observe(footer);
    window.addEventListener("resize", measure);

    return () => {
      root.classList.remove("kma-gate-open");
      root.style.removeProperty("--kma-footer-h");
      if (observer) observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section className="ag-wrap" aria-labelledby="ag-title">
      <style>{`
        html.kma-gate-open, html.kma-gate-open body { overflow: hidden; }
        html.kma-gate-open main.min-h-screen { min-height: 0 !important; }

        .ag-wrap {
          box-sizing: border-box; width: 100%; max-width: 760px; margin: 0 auto;
          height: calc(100vh - var(--ag-top, 150px) - var(--kma-footer-h, 0px));
          height: calc(100dvh - var(--ag-top, 150px) - var(--kma-footer-h, 0px));
          container: ag / size;
          padding: 0 24px 16px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; overflow-y: auto;
        }
        /* Short screens: give the gate more room by slimming the header (150px -> 88px) -- only while the
           gate is open. The mobile menu panel is anchored under the header, so it moves up with it. */
        @media (max-height: 620px) {
          html.kma-gate-open { --ag-top: 88px; }
          /* the wrap's bottom padding is only the blur's fade-out room (cancelled by the negative margin, so
             the net height is 16 + 72 = 88px); shorten it so the fade doesn't wash out the gate's title */
          html.kma-gate-open .kma-header-wrap { padding-top: 16px; padding-bottom: 20px; margin-bottom: -20px; }
          html.kma-gate-open .kma-header-inner { height: 72px; }
          html.kma-gate-open .kma-mobile-panel { top: 88px; }
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
        /* Less room (small screens, or a tall footer): same layout, tighter -- keyed to the gate's own height. */
        @container ag (max-height: 570px) {
          .ag-icon { width: 60px; height: 60px; margin-bottom: 18px; border-radius: 18px; }
          .ag-icon svg { width: 26px; height: 26px; }
          .ag-title { margin-bottom: 12px; }
          .ag-cta { margin-top: 26px; height: 54px; }
          .ag-signin { margin-top: 14px; }
          .ag-back { margin-top: 12px; }
        }
        @container ag (max-height: 470px) {
          .ag-icon { display: none; }
          .ag-title { font-size: 28px; }
          .ag-body { font-size: 15px; line-height: 1.5; }
          .ag-pending { margin-top: 10px; font-size: 14px; }
          .ag-cta { margin-top: 20px; height: 50px; font-size: 17px; }
          .ag-signin { margin-top: 12px; font-size: 14px; }
          .ag-back { margin-top: 8px; }
        }
        @container ag (max-height: 380px) {
          .ag-title { font-size: 24px; margin-bottom: 8px; }
          .ag-body { font-size: 14px; }
          .ag-pending { display: none; }
          .ag-cta { margin-top: 14px; height: 46px; }
        }
        @container ag (max-height: 260px) {
          .ag-body { display: none; }
        }
        @container ag (max-height: 200px) {
          .ag-title { font-size: 20px; margin-bottom: 4px; }
          .ag-cta { margin-top: 10px; height: 42px; font-size: 16px; }
          .ag-signin { margin-top: 8px; font-size: 13px; }
          .ag-back { margin-top: 6px; font-size: 13px; }
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
