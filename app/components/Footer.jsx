import React from "react";

const LEGAL_LINKS = ["Privacy Policy", "Terms of Service", "Cookie Policy"];

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
        .kma-footer-legal span { cursor: default; user-select: none; }
      `}</style>

      <div className="kma-footer-inner">
        <span>© 2026 Kick My Apps. All rights reserved.</span>
        <div className="kma-footer-legal">
          {LEGAL_LINKS.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
