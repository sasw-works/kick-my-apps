"use client";

// Figma "cards" (Pricing) 4159:769 — headline (same duplicated copy as Audience) + toggle + 3 cards.
// Monthly/Yearly prices are placeholders until real billing is wired up.

import { useState } from "react";
import { X } from "lucide-react";

// Prices are placeholders until real billing is wired up.
// Every plan shares the same feature rows (so all three cards stay the same height and
// checkmarks line up); each plan just marks a row active/inactive, or overrides its label
// with a plan-specific value (e.g. report counts). Kept short, and only lists features that
// actually exist today (no SSO / API / Slack yet).
const FEATURES = [
  { key: "ai", label: "AI reports per month", starter: "2 AI reports / month", professional: "10 AI reports / month", enterprise: "Unlimited AI reports" },
  { key: "compare", label: "Comparison reports per month", starter: "1 comparison report / month", professional: "3 comparison reports / month", enterprise: "Unlimited comparison reports" },
  { key: "pulse", label: "Pulse monitoring", starter: "Pulse alerts", professional: "2 Pulse monitors", enterprise: "Unlimited Pulse monitors" },
  { key: "share", label: "Report sharing & PDF export", starter: true, professional: true, enterprise: true },
  { key: "priority", label: "Priority support (24h response)", starter: false, professional: true, enterprise: true },
  { key: "seats", label: "Unlimited seats", starter: false, professional: false, enterprise: true },
];

const PLANS = [
  {
    tag: "Starter",
    key: "starter",
    monthly: { price: "€0", duration: "Free forever" },
    yearly: { price: "€0", duration: "Free forever" },
    desc: "For curious founders and designers testing the value of feedback intelligence.",
    cta: "Get started free",
    ctaStyle: "glass",
    highlight: false,
  },
  {
    tag: "Professional",
    key: "professional",
    monthly: { price: "€12", duration: "/ month" },
    yearly: { price: "€8", duration: "/ month" },
    desc: "For PMs, UX leads, and founders who need continuous competitive intelligence.",
    cta: "Upgrade to Pro",
    ctaStyle: "solid",
    highlight: true,
  },
  {
    tag: "Enterprise",
    key: "enterprise",
    monthly: { price: "Custom", duration: null },
    yearly: { price: "Custom", duration: null },
    desc: "For teams that need custom limits, unlimited seats, and dedicated support.",
    cta: "Contact us",
    ctaStyle: "glass",
    highlight: false,
  },
];

function Check() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img className="pr-check" src="/dark/pricing/check.svg" alt="" width={20} height={20} />
  );
}

export default function PricingSection() {
  const [yearly, setYearly] = useState(true);

  return (
    <section className="kma-pricing" aria-label="Pricing">
      <style>{`
        .kma-pricing {
          width: 100%;
          max-width: 1170px;
          margin: 90px auto 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 50px;
        }
        .pr-headline { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
        .pr-title { margin: 0; font-size: 42px; line-height: 57.6px; font-weight: 400; color: var(--chalk); max-width: 724px; }
        .pr-sub { margin: 0; font-size: var(--fs-18); line-height: 28px; font-weight: 400; color: var(--muted); }

        /* toggle: 400x60 glass pill, 250x48 blue pill slides between the two halves */
        .pr-tab {
          position: relative;
          width: 400px;
          height: 60px;
          border-radius: 114px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          -webkit-backdrop-filter: blur(var(--glass-blur));
          backdrop-filter: blur(var(--glass-blur));
        }
        .pr-tab-thumb {
          position: absolute;
          top: 5px;
          left: 5px;
          width: 194px;
          height: 48px;
          border-radius: 114px;
          background: var(--blue-100);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pr-tab.pr-tab-yearly .pr-tab-thumb { transform: translateX(194px); }
        .pr-tab-btn {
          position: absolute;
          top: 0;
          width: 194px;
          height: 60px;
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-inter), sans-serif;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          color: var(--chalk);
          cursor: pointer;
          z-index: 1;
        }
        /* the sliding thumb sits under whichever tab is active; that one needs white text
           regardless of theme, the other stays readable against the glass pill. */
        .pr-tab:not(.pr-tab-yearly) .pr-tab-btn:first-of-type { color: #ffffff; }
        .pr-tab.pr-tab-yearly .pr-tab-btn:last-of-type { color: #ffffff; }
        .kma-dark .pr-tab-btn { color: #ffffff; }
        .pr-tab-btn:first-of-type { left: 5px; }
        .pr-tab-btn:last-of-type { left: 199px; }

        .pr-cards { display: flex; align-items: stretch; gap: 32px; width: 100%; }
        .pr-card {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 32px;
          background: var(--surface);
          border: 1px solid var(--ink-3);
          border-radius: 24px;
          box-sizing: border-box;
        }
        .kma-dark .pr-card { background: var(--ink); }
        .pr-card-highlight { border-color: #6fd3fe; }
        .pr-tag {
          align-self: flex-start;
          padding: 16px 24px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 999px;
          font-size: 14px;
          line-height: 14px;
          color: var(--muted);
          white-space: nowrap;
        }
        .kma-dark .pr-tag { background: var(--ink); }
        .pr-price-row { display: flex; align-items: flex-end; gap: 8px; height: 66px; margin-top: 24px; }
        .pr-price { font-size: 60px; line-height: 66px; font-weight: 500; letter-spacing: 1px; color: var(--chalk); white-space: nowrap; }
        .pr-duration { padding-bottom: 6px; font-size: 16px; line-height: 24px; color: var(--muted); white-space: nowrap; }
        .pr-desc { margin: 10px 0 0; padding: 0 10px; font-size: 16px; line-height: 24px; color: var(--muted); }
        .pr-sep { margin: 32px 0 0; border: none; border-top: 1px solid var(--ink-3); }
        .pr-list { list-style: none; margin: 20px 0 0; padding: 0; display: flex; flex-direction: column; gap: 20px; width: 100%; }
        .pr-list li { display: flex; align-items: center; gap: 16px; font-size: 16px; line-height: 24px; color: var(--muted); white-space: nowrap; }
        .pr-list-inactive { color: color-mix(in srgb, var(--muted) 55%, transparent) !important; }
        .pr-x { flex-shrink: 0; display: block; color: color-mix(in srgb, var(--muted) 45%, transparent); }
        .pr-check { display: block; flex-shrink: 0; }
        .pr-cta-wrap { margin-top: 32px; }
        .pr-cta {
          width: 100%;
          height: 56px;
          border-radius: 114px;
          font-family: var(--font-inter), sans-serif;
          font-size: var(--fs-18);
          font-weight: 400;
          letter-spacing: var(--ls-body);
          line-height: 24px;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .pr-cta:hover { transform: translateY(-1px); }
        .pr-cta-glass {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          -webkit-backdrop-filter: blur(var(--glass-blur));
          backdrop-filter: blur(var(--glass-blur));
          color: var(--chalk);
        }
        .pr-cta-solid { background: var(--blue-100); border: none; color: #ffffff; }
        .pr-cta-solid:hover { filter: brightness(1.08); }

        @media (max-width: 1040px) {
          .pr-list li { font-size: 15px; }
        }
        @media (max-width: 900px) {
          .pr-cards { flex-wrap: wrap; }
          .pr-card { flex: 1 1 calc(50% - 16px); }
          .pr-list li { white-space: normal; font-size: 16px; }
        }
        @media (max-width: 720px) {
          .pr-title { font-size: 32px; line-height: 1.25; }
          .pr-sub { white-space: normal; }
          .pr-tab { width: 100%; max-width: 400px; }
          .pr-tab-thumb, .pr-tab-btn { width: calc(50% - 5px); }
          .pr-tab.pr-tab-yearly .pr-tab-thumb { transform: translateX(calc(100% + 0.5px)); }
          .pr-tab-btn:last-of-type { left: auto; right: 5px; }
          .pr-cards { flex-direction: column; }
          .pr-card { flex: 1 1 auto; }
        }
      `}</style>
      <div className="pr-headline">
        <h2 className="pr-title">Simple pricing, real answers</h2>
        <p className="pr-sub">
          Start free and see what&apos;s hurting your app today. Upgrade whenever you need deeper, more frequent insight.
        </p>
      </div>

      <div className={`pr-tab${yearly ? " pr-tab-yearly" : ""}`}>
        <div className="pr-tab-thumb" aria-hidden="true" />
        <button type="button" className="pr-tab-btn" onClick={() => setYearly(false)}>
          Monthly
        </button>
        <button type="button" className="pr-tab-btn" onClick={() => setYearly(true)}>
          Yearly - Save 33%
        </button>
      </div>

      <div className="pr-cards">
        {PLANS.map((p) => {
          const cycle = yearly ? p.yearly : p.monthly;
          return (
            <div className={`pr-card${p.highlight ? " pr-card-highlight" : ""}`} key={p.tag}>
              <span className="pr-tag">{p.tag}</span>
              <div className="pr-price-row">
                <span className="pr-price">{cycle.price}</span>
                {cycle.duration && <span className="pr-duration">{cycle.duration}</span>}
              </div>
              <p className="pr-desc">{p.desc}</p>
              <hr className="pr-sep" />
              <ul className="pr-list">
                {FEATURES.map((f) => {
                  const value = f[p.key];
                  const active = Boolean(value);
                  const text = typeof value === "string" ? value : f.label;
                  return (
                    <li key={f.key} className={active ? "" : "pr-list-inactive"}>
                      {active ? <Check /> : <X className="pr-x" size={20} />}
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="pr-cta-wrap">
                <button type="button" className={`pr-cta pr-cta-${p.ctaStyle}`}>
                  {p.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
