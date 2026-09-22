import React from "react";
import Link from "next/link";

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
];

export default function Footer() {
  return (
    <footer className="kma-footer">
      <style>{`
        /* Figma "Footer" 4161:1144 — the copyright/links row beneath the closing CTA banner. */
        .kma-footer {
          background: #18181b;
          font-family: var(--font-inter), sans-serif;
          border-top: 1px solid #484848;
          padding: 40px 24px;
        }
        .kma-footer-inner {
          max-width: 1170px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: var(--fs-18);
          line-height: 28px;
          color: #dedede;
        }
        .kma-footer-legal { display: flex; gap: 40px; }
        .kma-footer-legal a { color: inherit; text-decoration: none; cursor: pointer; }
        .kma-footer-legal a:hover { color: rgba(255,255,255,0.85); }
      `}</style>

      <div className="kma-footer-inner">
        <span>© 2026 Kick My Apps. All rights reserved.</span>
        <div className="kma-footer-legal">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.label} href={l.href}>{l.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
