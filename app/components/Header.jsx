"use client";

import React, { useState } from "react";
import Link from "next/link";
import LogoMark from "./LogoMark";
import { Camera, Star, FileSearch, GitCompare, Mail, Users, Rocket, Palette } from "lucide-react";

const FEATURE_ITEMS = [
  { icon: Camera, title: "Screenshot Analysis", desc: "Find UI/UX issues automatically" },
  { icon: Star, title: "App Store Reviews", desc: "Real ratings & user feedback" },
  { icon: FileSearch, title: "ASO Review", desc: "Store listing insights" },
  { icon: GitCompare, title: "Compare", desc: "Benchmark competitors" },
  { icon: Mail, title: "Weekly Digest", desc: "Reviews in your inbox" },
];

const USE_CASE_ITEMS = [
  { icon: Users, title: "Product Managers", desc: "Prioritize the roadmap" },
  { icon: Rocket, title: "Indie Developers", desc: "Ship with confidence" },
  { icon: Palette, title: "Designers", desc: "Spot UI/UX issues fast" },
];

function NavDropdown({ label, items, open, onEnter, onLeave }) {
  return (
    <div className="kma-navdrop" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <span className="kma-header-navitem kma-header-navitem-clickable">{label}</span>
      {open && (
        <div className="kma-navdrop-panel">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div className="kma-navdrop-item" key={item.title}>
                <div className="kma-navdrop-icon"><Icon size={16} /></div>
                <div>
                  <div className="kma-navdrop-item-title">{item.title}</div>
                  <div className="kma-navdrop-item-desc">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [openMenu, setOpenMenu] = useState(null); // "features" | "usecases" | null

  return (
    <div className="kma-header-wrap">
      <style>{`
        .kma-header-wrap {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 24px 40px 110px;
          margin-bottom: -110px;
          pointer-events: none;
          background: transparent;
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 20%, transparent 100%);
          mask-image: linear-gradient(to bottom, black 0%, black 20%, transparent 100%);
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .kma-header-inner {
          pointer-events: auto;
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-inter), sans-serif;
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
          user-select: none;
          white-space: nowrap;
        }
        .kma-header-navitem-clickable { cursor: pointer; }
        .kma-navdrop { position: relative; }
        .kma-navdrop-panel {
          position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          margin-top: 18px; background: var(--ink-2); border: 1px solid var(--ink-3);
          border-radius: 14px; padding: 10px; box-shadow: 0 16px 40px rgba(20,33,61,0.14);
          min-width: 260px;
        }
        .kma-navdrop-item {
          display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: 10px;
        }
        .kma-navdrop-item:hover { background: var(--ink); }
        .kma-navdrop-icon {
          width: 32px; height: 32px; border-radius: 8px; background: var(--ink-3); color: var(--chalk);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .kma-navdrop-item-title { font-size: 13.5px; font-weight: 600; color: var(--chalk); }
        .kma-navdrop-item-desc { font-size: 12px; color: var(--muted); margin-top: 1px; }

        .kma-header-right {
          display: flex;
          align-items: center;
          gap: 20px;
          white-space: nowrap;
        }
        .kma-header-history {
          font-size: 14.5px;
          font-weight: 500;
          color: var(--chalk);
          text-decoration: none;
          white-space: nowrap;
        }
        .kma-header-signin {
          background: rgb(255, 0, 122);
          color: #FFFFFF;
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
          <NavDropdown
            label="Features"
            items={FEATURE_ITEMS}
            open={openMenu === "features"}
            onEnter={() => setOpenMenu("features")}
            onLeave={() => setOpenMenu(null)}
          />
          <NavDropdown
            label="Use Cases"
            items={USE_CASE_ITEMS}
            open={openMenu === "usecases"}
            onEnter={() => setOpenMenu("usecases")}
            onLeave={() => setOpenMenu(null)}
          />
          <span className="kma-header-navitem">Pricing</span>
          <span className="kma-header-navitem">Blog</span>
        </nav>

        <div className="kma-header-right">
          <Link href="/history" className="kma-header-history">Geçmiş Analizlerim</Link>
          <button className="kma-header-signin">Sign in</button>
        </div>
      </div>
    </div>
  );
}
