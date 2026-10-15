"use client";

import { useEffect } from "react";

// Catches a render/runtime error anywhere under the root layout and shows a friendly screen
// instead of Next's default error overlay. Doesn't cover a crash in the root layout itself --
// that's app/global-error.js, which has to render its own <html>/<body>.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="error-page">
      <style>{`
        .error-page {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 96px 24px 120px;
          font-family: var(--font-inter), sans-serif;
        }
        .error-title { font-size: 22px; font-weight: 600; color: var(--chalk); margin: 0 0 10px; }
        .error-sub { font-size: 16px; color: var(--muted); max-width: 420px; margin: 0 0 32px; line-height: 1.6; }
        .error-actions { display: flex; align-items: center; gap: 12px; }
        .error-btn {
          display: inline-flex; align-items: center; justify-content: center;
          height: 48px; padding: 0 28px; border-radius: 999px;
          font-size: 15px; font-weight: 600; text-decoration: none; cursor: pointer;
          border: none; transition: filter 0.2s ease, transform 0.2s ease;
        }
        .error-btn:hover { transform: translateY(-1px); }
        .error-btn-solid { background: var(--brand); color: #fff; }
        .error-btn-solid:hover { filter: brightness(1.08); }
        .error-btn-glass {
          background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--chalk);
          -webkit-backdrop-filter: blur(var(--glass-blur)); backdrop-filter: blur(var(--glass-blur));
        }
      `}</style>
      <div className="error-title">Something went wrong</div>
      <p className="error-sub">
        That&apos;s on us. Please try again, and if it keeps happening, let our support team know.
      </p>
      <div className="error-actions">
        <button type="button" className="error-btn error-btn-solid" onClick={() => reset()}>
          Try again
        </button>
        <a href="mailto:support@kickmyapps.com" className="error-btn error-btn-glass">
          Contact support
        </a>
      </div>
    </main>
  );
}
