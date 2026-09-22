"use client";

// Restored verbatim from the original site (commit 0d16a60, MarketingSections.jsx "FAQ"):
// real product questions + the FaqItem accordion, in place of the Figma-template FaqSection
// (which used the design's placeholder cookie-consent copy).

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";

const FAQ = [
  {
    q: "What data do you collect?",
    a: "We only analyze public App Store reviews and the screenshots you upload. We never access any private or hidden user data.",
  },
  {
    q: "How fresh are the reviews?",
    a: "We pull them from the App Store in real time on every analysis — no caching, so you always see the latest reviews.",
  },
  {
    q: "Can I compare against competitor apps?",
    a: "Yes — you can compare any two scans side by side, including your own app against a competitor.",
  },
  {
    q: "How are findings prioritized?",
    a: "Every finding is tagged critical/warning/good, and the 'Quick Wins' panel automatically highlights the high-impact, low-effort items.",
  },
  {
    q: "How does the weekly digest work?",
    a: "Once you start tracking an app, you'll get an email every week summarizing its new App Store reviews.",
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-row">
      <button className="faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className={`faq-toggle ${open ? "faq-toggle-open" : ""}`}>
          {open ? <X size={22} color="#FFFFFF" /> : <Plus size={22} color="var(--muted)" />}
        </span>
      </button>
      <div className={`faq-a-wrap ${open ? "faq-a-wrap-open" : ""}`}>
        <div className="faq-a-inner">
          <div className="faq-a">{a}</div>
        </div>
      </div>
    </div>
  );
}

export default function LegacyFaqSection() {
  return (
    <div className="mkt-reveal">
      <style>{`
        /* Headline matches every other KMA Dark section: 42/57.6 title, 18/28 sub below it. */
        .faq-headline { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; margin-top: 150px; margin-bottom: 48px; }
        .mkt-section-title { margin: 0; font-size: 42px; line-height: 57.6px; font-weight: 400; color: #ffffff; }
        .mkt-section-sub { margin: 0; font-size: var(--fs-18); line-height: 28px; font-weight: 400; color: #dedede; }
        .faq-list { max-width: 720px; margin: 0 auto 48px; border-top: 1px solid var(--ink-3); }
        .faq-row { border-bottom: 1px solid var(--ink-3); }
        .faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 24px;
          background: none; border: none; cursor: pointer; padding: 24px 4px;
          font-size: 20px; font-weight: 500; color: var(--chalk); text-align: left;
          transition: color 0.2s ease;
        }
        .faq-q:hover { color: var(--brand); }
        .faq-toggle {
          width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--ink-3); transition: background 0.2s ease, transform 0.3s ease;
        }
        .faq-toggle-open { background: #533AFE; transform: rotate(180deg); }
        .faq-a-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .faq-a-wrap-open { grid-template-rows: 1fr; }
        .faq-a-inner { overflow: hidden; }
        .faq-a {
          font-size: 16px; font-family: var(--font-body); color: var(--muted); line-height: 1.7; padding: 0 4px 24px; max-width: 560px;
          opacity: 0; transform: translateY(-6px);
          transition: opacity 0.3s ease 0.05s, transform 0.3s ease 0.05s;
        }
        .faq-a-wrap-open .faq-a { opacity: 1; transform: translateY(0); }
        .faq-support-btn {
          display: flex; align-items: center; justify-content: center;
          width: fit-content; height: 56px; margin: 0 auto;
          background: #533AFE; color: #FFFFFF;
          font-weight: 600; font-size: 16px; padding: 0 32px; border-radius: 999px; border: none; cursor: pointer;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .faq-support-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
      `}</style>
      <div className="faq-headline">
        <h2 className="mkt-section-title">Frequently asked questions</h2>
        <p className="mkt-section-sub">We&apos;re happy to answer your questions</p>
      </div>
      <div className="faq-list">
        {FAQ.map((f) => (
          <FaqItem key={f.q} q={f.q} a={f.a} />
        ))}
      </div>
      <Link href="/support" className="faq-support-btn" style={{ textDecoration: "none" }}>
        Support Page
      </Link>
    </div>
  );
}
