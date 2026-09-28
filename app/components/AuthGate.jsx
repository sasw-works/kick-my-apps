"use client";

import React from "react";
import { Sparkles, BarChart3, AlertTriangle, Zap, Code2, MessageSquare, FileDown, ArrowLeft } from "lucide-react";

// Every chip below is something the report really contains -- this screen is a sales pitch, so it
// must not promise anything the product doesn't do.
const FEATURES = [
  { icon: BarChart3, label: "Category scores" },
  { icon: AlertTriangle, label: "Critical issues" },
  { icon: Zap, label: "Quick wins" },
  { icon: Code2, label: "Code suggestions" },
  { icon: MessageSquare, label: "Review insights" },
  { icon: FileDown, label: "PDF export" },
];

export default function AuthGate({ appName, onSignUp, onBack }) {
  return (
    <section className="ag-wrap" aria-labelledby="ag-title">
      <style>{`
        .ag-wrap { max-width: 760px; margin: 0 auto; padding: 170px 24px 120px; text-align: center; }
        .ag-icon {
          width: 88px; height: 88px; margin: 0 auto 36px; border-radius: 26px;
          display: flex; align-items: center; justify-content: center;
          background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--chalk);
        }
        .ag-title { margin: 0 0 20px; font-size: 40px; line-height: 1.15; font-weight: 600; color: var(--chalk); }
        .ag-body { margin: 0 auto; max-width: 600px; font-size: 18px; line-height: 1.6; color: var(--muted); }
        .ag-pending { margin: 18px auto 0; font-size: 15px; color: var(--muted); }
        .ag-pending strong { color: var(--chalk); font-weight: 600; }
        .ag-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin: 36px auto 40px; max-width: 620px; }
        .ag-chip {
          display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          font-size: 15px; color: var(--chalk);
        }
        .ag-chip svg { color: var(--muted); flex-shrink: 0; }
        .ag-cta {
          height: 60px; padding: 0 44px; border: none; border-radius: 999px; cursor: pointer;
          background: var(--blue-100); color: #fff; font-size: 18px; font-weight: 500; font-family: inherit;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .ag-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .ag-signin { margin: 22px 0 0; font-size: 15px; color: var(--muted); }
        .ag-link { background: none; border: none; padding: 0; font: inherit; font-weight: 600; color: var(--blue-100); cursor: pointer; }
        .ag-link:hover { text-decoration: underline; }
        .ag-back {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 44px;
          background: none; border: none; cursor: pointer; font: inherit; font-size: 14px; color: var(--muted);
        }
        .ag-back:hover { color: var(--chalk); }
        @media (max-width: 640px) {
          .ag-wrap { padding: 130px 20px 80px; }
          .ag-title { font-size: 30px; }
          .ag-body { font-size: 16px; }
          .ag-cta { width: 100%; padding: 0 20px; }
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

      <div className="ag-chips">
        {FEATURES.map(({ icon: Icon, label }) => (
          <span className="ag-chip" key={label}>
            <Icon size={16} />
            {label}
          </span>
        ))}
      </div>

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
