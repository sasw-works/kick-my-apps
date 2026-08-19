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
        .kma-footer {
          background: #000000;
          font-family: var(--font-inter), sans-serif;
          border-top: 1px solid rgba(255,255,255,0.12);
          padding: 24px;
        }
        .kma-footer-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12.5px;
          color: rgba(255,255,255,0.55);
        }
        .kma-footer-legal { display: flex; gap: 24px; }
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
