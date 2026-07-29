import React from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = ["Özellikler", "Kaynaklar", "Kullanım Alanları", "Fiyatlandırma", "Blog"];

export default function Header() {
  return (
    <div className="kma-header-wrap">
      <style>{`
        .kma-header-wrap {
          position: sticky;
          top: 25px;
          z-index: 50;
          display: flex;
          justify-content: center;
          padding: 16px 20px 0;
          background: linear-gradient(to bottom, var(--ink) 60%, transparent);
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .kma-header-pill {
          width: 100%;
          max-width: 1100px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 999px;
          padding: 15px 12px 15px 18px;
          font-family: 'Inter', sans-serif;
        }
        .kma-header-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 15px;
          color: var(--chalk);
          letter-spacing: -0.01em;
          white-space: nowrap;
          text-decoration: none;
          cursor: pointer;
        }
        .kma-header-mark {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          background: var(--kick);
          flex-shrink: 0;
        }
        .kma-header-spacer { flex: 1; }
        .kma-header-nav {
          display: flex;
          align-items: center;
          gap: 22px;
        }
        .kma-header-navitem {
          font-size: 14px;
          font-weight: 500;
          color: var(--chalk);
          cursor: default;
          user-select: none;
          white-space: nowrap;
        }
        .kma-header-right {
          display: flex;
          align-items: center;
          gap: 18px;
          white-space: nowrap;
          margin-left: 22px;
        }
        .kma-header-history {
          font-size: 13.5px;
          font-weight: 500;
          color: var(--chalk);
          text-decoration: none;
          white-space: nowrap;
        }
        .kma-header-history:hover { text-decoration: underline; }

        @media (max-width: 780px) {
          .kma-header-nav { display: none; }
        }
      `}</style>

      <div className="kma-header-pill">
        <Link href="/" className="kma-header-logo">
          <div className="kma-header-mark" />
          Kick My Apps
        </Link>

        <div className="kma-header-spacer" />

        <nav className="kma-header-nav">
          {NAV_ITEMS.map((label) => (
            <span className="kma-header-navitem" key={label}>
              {label}
            </span>
          ))}
        </nav>

        <div className="kma-header-right">
          <Link href="/history" className="kma-header-history">
            Geçmiş Analizlerim
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
