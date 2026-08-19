"use client";

import React from "react";
import Link from "next/link";
import { Search, FileText, CreditCard, Shield, Mail } from "lucide-react";

const TOPICS = [
  {
    icon: FileText,
    title: "Getting Started",
    items: [
      "How does the analysis work?",
      "What's the difference between App Store and Play Store analysis?",
      "How many screenshots should I upload?",
    ],
  },
  {
    icon: Search,
    title: "Reports & Findings",
    items: [
      "How is the App Health Score calculated?",
      "What do the UI / UX / Accessibility / Product lenses mean?",
      "Can I export my report as a PDF?",
    ],
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    items: [
      "What's included in the Free plan?",
      "How does annual billing work?",
      "Can I cancel anytime?",
    ],
  },
  {
    icon: Shield,
    title: "Account & Data",
    items: [
      "Is my app data kept private?",
      "How do I delete a saved report?",
      "Do you store my screenshots?",
    ],
  },
];

export default function SupportPage() {
  return (
    <main className="support-page">
      <style>{`
        .support-page { max-width: 900px; margin: 0 auto; padding: 90px 24px 120px; font-family: var(--font-inter), sans-serif; }
        .support-hero { text-align: center; margin-bottom: 56px; }
        .support-title { font-size: 34px; font-weight: 500; letter-spacing: -0.02em; color: var(--chalk); margin-bottom: 12px; }
        .support-sub { font-size: 15px; color: var(--muted); margin-bottom: 32px; }
        .support-search {
          max-width: 480px; margin: 0 auto; display: flex; align-items: center; gap: 10px;
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 999px; padding: 14px 20px;
        }
        .support-search input { flex: 1; border: none; outline: none; background: transparent; font-size: 15px; color: var(--chalk); }
        .support-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 64px; }
        @media (max-width: 700px) { .support-grid { grid-template-columns: 1fr; } }
        .support-card { background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 16px; padding: 28px; }
        .support-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .support-card-icon {
          width: 38px; height: 38px; border-radius: 10px; background: var(--ink-3); color: var(--brand);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .support-card-title { font-size: 17px; font-weight: 600; color: var(--chalk); }
        .support-item { font-size: 14.5px; color: var(--chalk); padding: 10px 0; border-top: 1px solid var(--ink-3); cursor: default; }
        .support-item:first-of-type { border-top: none; }
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
        <div className="support-sub">Search our help topics or browse by category below.</div>
        <div className="support-search">
          <Search size={16} color="var(--muted)" />
          <input placeholder="Search for help..." />
        </div>
      </div>

      <div className="support-grid">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <div className="support-card" key={topic.title}>
              <div className="support-card-head">
                <div className="support-card-icon"><Icon size={18} /></div>
                <div className="support-card-title">{topic.title}</div>
              </div>
              {topic.items.map((item) => (
                <div className="support-item" key={item}>{item}</div>
              ))}
            </div>
          );
        })}
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
