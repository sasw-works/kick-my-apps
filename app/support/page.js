"use client";

import React, { useState } from "react";
import { Search, Plus, X, Mail } from "lucide-react";

const SUPPORT_FAQ = [
  {
    q: "How does the analysis work?",
    a: "You submit a store URL or upload screenshots, and our AI reviews your app across 13 categories — from onboarding and contrast to accessibility and trust — then generates a full report with a health score and prioritized findings.",
  },
  {
    q: "What's the difference between App Store and Play Store analysis?",
    a: "Right now we pull real, public reviews from the App Store. Google Play review analysis is on our roadmap but not yet available.",
  },
  {
    q: "How many screenshots should I upload?",
    a: "We recommend 3-8 screenshots covering your key screens (onboarding, home, and any core flows). More screenshots generally means more thorough findings.",
  },
  {
    q: "How is the App Health Score calculated?",
    a: "The score reflects the overall ratio of critical, warning, and healthy findings across all 13 categories, weighted by severity.",
  },
  {
    q: "What do the UI / UX / Accessibility / Product lenses mean?",
    a: "Every finding is tagged to one of four lenses so you can quickly see whether an issue is a visual/design problem (UI), a flow/usability problem (UX), an accessibility gap, or a product/conversion concern.",
  },
  {
    q: "Can I export my report as a PDF?",
    a: "Yes — every report has a 'PDF İndir' button that generates a shareable, downloadable version of your full analysis.",
  },
  {
    q: "Can I compare my app against a competitor?",
    a: "Yes. Pick any two of your saved reports from the Compare tab, and we'll generate a side-by-side benchmark of scores and findings.",
  },
  {
    q: "How often can I re-analyze the same app?",
    a: "As often as you like within your plan's monthly report limit. Each new analysis is saved separately so you can track your score over time.",
  },
  {
    q: "What's included in the Free plan?",
    a: "The Free plan includes a limited number of AI reports and comparison reports per month, report sharing via link, and email support.",
  },
  {
    q: "How does annual billing work?",
    a: "Annual billing is charged once a year at a discounted rate compared to paying monthly — details are on our Pricing section.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel your subscription at any time with no cancellation fee.",
  },
  {
    q: "Do you offer refunds?",
    a: "Reach out to our support team and we'll review your situation on a case-by-case basis.",
  },
  {
    q: "Is my app data kept private?",
    a: "Yes. Your screenshots and reports are only accessible to your account — we don't share your data with third parties.",
  },
  {
    q: "How do I delete a saved report?",
    a: "Open the Reports tab, select the report(s) you want to remove, and use the delete action in the selection bar at the bottom.",
  },
  {
    q: "Do you store my screenshots?",
    a: "Screenshots are used to generate your report and are associated with your saved analysis so you can revisit the annotated findings later.",
  },
  {
    q: "How do I share a report with my team?",
    a: "Every report can be shared via a direct link — anyone with the link can view a read-only version of the analysis.",
  },
];

function SupportFaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="support-faq-row">
      <button className="support-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className={`support-faq-toggle ${open ? "support-faq-toggle-open" : ""}`}>
          {open ? <X size={16} color="#FFFFFF" /> : <Plus size={16} color="var(--muted)" />}
        </span>
      </button>
      <div className="support-faq-a-wrap" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="support-faq-a-inner">
          <p className="support-faq-a">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <main className="support-page">
      <style>{`
        .support-page { max-width: 760px; margin: 0 auto; padding: 90px 24px 120px; font-family: var(--font-inter), sans-serif; }
        .support-hero { text-align: center; margin-bottom: 48px; }
        .support-title { font-size: 34px; font-weight: 500; letter-spacing: -0.02em; color: var(--chalk); margin-bottom: 12px; }
        .support-sub { font-size: 15px; color: var(--muted); margin-bottom: 32px; }
        .support-search {
          max-width: 480px; margin: 0 auto; display: flex; align-items: center; gap: 10px;
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 999px; padding: 14px 20px;
        }
        .support-search input { flex: 1; border: none; outline: none; background: transparent; font-size: 15px; color: var(--chalk); }

        .support-faq-list { border-top: 1px solid var(--ink-3); margin-bottom: 56px; }
        .support-faq-row { border-bottom: 1px solid var(--ink-3); }
        .support-faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px;
          background: none; border: none; cursor: pointer; padding: 22px 4px;
          font-size: 16px; font-weight: 500; color: var(--chalk); text-align: left;
          transition: color 0.2s ease;
        }
        .support-faq-q:hover { color: var(--brand); }
        .support-faq-toggle {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--ink-3); transition: background 0.2s ease, transform 0.3s ease;
        }
        .support-faq-toggle-open { background: var(--brand); transform: rotate(180deg); }
        .support-faq-a-wrap { display: grid; transition: grid-template-rows 0.3s ease; overflow: hidden; }
        .support-faq-a-inner { overflow: hidden; }
        .support-faq-a { font-size: 14.5px; color: var(--muted); line-height: 1.6; padding: 0 4px 22px; }

        .support-contact {
          text-align: center; background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 16px; padding: 40px;
        }
        .support-contact-title { font-size: 19px; font-weight: 500; color: var(--chalk); margin-bottom: 8px; }
        .support-contact-sub { font-size: 15px; color: var(--muted); margin-bottom: 20px; }
        .support-contact-btn {
          display: inline-flex; align-items: center; gap: 8px; background: var(--chalk); color: var(--ink-2);
          padding: 12px 24px; border-radius: 999px; font-size: 14.5px; font-weight: 600; text-decoration: none;
        }
      `}</style>

      <div className="support-hero">
        <div className="support-title">How can we help?</div>
        <div className="support-sub">Browse common questions below, or reach out to our team.</div>
        <div className="support-search">
          <Search size={16} color="var(--muted)" />
          <input placeholder="Search for help..." />
        </div>
      </div>

      <div className="support-faq-list">
        {SUPPORT_FAQ.map((item) => (
          <SupportFaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>

      <div className="support-contact">
        <div className="support-contact-title">Still need help?</div>
        <div className="support-contact-sub">Our team typically responds within 24 hours.</div>
        <a href="mailto:support@kickmyapps.com" className="support-contact-btn">
          <Mail size={16} />
          Email support
        </a>
      </div>
    </main>
  );
}
