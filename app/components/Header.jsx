import React from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import LogoMark from "./LogoMark";

const NAV_ITEMS = ["Özellikler", "Kullanım Alanları", "Fiyatlandırma", "Blog"];

export default function Header() {
  return (
    <div className="kma-header-wrap">
      <style>{`
        .kma-header-wrap {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 24px 40px;
          background: var(--ink);
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .kma-header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
        }
        .kma-header-logo {
          display: flex;
          align-items: center;
          color: var(--chalk);
          flex-shrink: 0;
          text-decoration: none;
          cursor: pointer;
        }
        .kma-header-spacer { flex: 1; }
        .kma-header-nav {
          display: flex;
          align-items: center;
          gap: 34px;
          margin-right: 34px;
        }
        .kma-header-navitem {
          font-size: 15px;
          font-weight: 500;
          color: var(--chalk);
          cursor: default;
          user-select: none;
          white-space: nowrap;
        }
        .kma-header-right {
          display: flex;
          align-items: center;
          gap: 20px;
          white-space: nowrap;
        }
        .kma-header-signin {
          background: var(--chalk);
          color: var(--ink);
          font-size: 14.5px;
          font-weight: 600;
          padding: 11px 22px;
          border-radius: 999px;
          border: none;
          cursor: default;
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          .kma-header-nav { display: none; }
        }
      `}</style>

      <div className="kma-header-inner">
        <Link href="/" className="kma-header-logo">
          <LogoMark size={86} />
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
          <ThemeToggle />
          <button className="kma-header-signin">Sign in</button>
        </div>
      </div>
    </div>
  );
}
