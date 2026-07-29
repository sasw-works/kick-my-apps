import React from "react";
import { ChevronDown } from "lucide-react";

const NAV_ITEMS = [
  { label: "Özellikler", hasDropdown: true },
  { label: "Kaynaklar", hasDropdown: true },
  { label: "Kullanım Alanları", hasDropdown: true },
  { label: "Fiyatlandırma", hasDropdown: false },
  { label: "Blog", hasDropdown: false },
];

export default function Header() {
  return (
    <div className="kma-header-wrap">
      <style>{`
        .kma-header-wrap {
          position: sticky;
          top: 0;
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
          padding: 10px 12px 10px 18px;
          box-shadow: var(--shadow);
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
          margin-right: 8px;
          white-space: nowrap;
        }
        .kma-header-mark {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          background: var(--kick);
          flex-shrink: 0;
        }
        .kma-header-nav {
          display: flex;
          align-items: center;
          gap: 22px;
          flex: 1;
        }
        .kma-header-navitem {
          display: flex;
          align-items: center;
          gap: 3px;
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
          gap: 16px;
          white-space: nowrap;
        }
        .kma-header-signin {
          font-size: 14px;
          font-weight: 500;
          color: var(--chalk);
          cursor: default;
          user-select: none;
        }
        .kma-header-cta {
          background: var(--kick);
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 600;
          padding: 9px 18px;
          border-radius: 999px;
          border: none;
          cursor: default;
        }

        @media (max-width: 780px) {
          .kma-header-nav { display: none; }
        }
      `}</style>

      <div className="kma-header-pill">
        <div className="kma-header-logo">
          <div className="kma-header-mark" />
          Kick My Apps
        </div>

        <nav className="kma-header-nav">
          {NAV_ITEMS.map((item) => (
            <span className="kma-header-navitem" key={item.label}>
              {item.label}
              {item.hasDropdown && <ChevronDown size={13} strokeWidth={2} />}
            </span>
          ))}
        </nav>

        <div className="kma-header-right">
          <span className="kma-header-signin">Giriş Yap</span>
          <button className="kma-header-cta">Başla</button>
        </div>
      </div>
    </div>
  );
}
