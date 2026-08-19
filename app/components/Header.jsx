"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import LogoMark from "./LogoMark";
import { ChevronDown } from "lucide-react";

const FEATURE_GROUPS = [
  {
    label: "Analysis",
    items: [
      { title: "Screenshot Analysis", desc: "13 categories, 4 lenses" },
      { title: "ASO / Store Listing Review", desc: "Title, description & keywords" },
      { title: "Update Risk Check", desc: "Flags risky review signals" },
      { title: "Visual Annotation", desc: "Findings marked on screenshots" },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Real App Store Reviews", desc: "Real, public reviews in real time" },
      { title: "Quick Wins", desc: "High impact, low effort fixes" },
      { title: "Code-Level Suggestions", desc: "Sample CSS, Swift, Kotlin" },
      { title: "History & Trend", desc: "Track your score over time" },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { title: "Detailed Comparison", desc: "Benchmark competitors" },
      { title: "My Apps Dashboard", desc: "All tracked apps, one place" },
      { title: "Weekly Email Digest", desc: "Reviews in your inbox" },
      { title: "PDF Export", desc: "Share your report instantly" },
    ],
  },
];

const USE_CASE_GROUPS = [
  {
    label: "Who it's for",
    items: [
      { title: "Product Managers", desc: "Prioritize the roadmap" },
      { title: "Indie Developers", desc: "Ship with confidence" },
      { title: "Designers", desc: "Spot UI/UX issues fast" },
    ],
  },
];

const RESOURCES_GROUPS = [
  {
    label: "Learn",
    items: [
      { title: "Guides", desc: "ASO and app health playbooks" },
      { title: "Blog", desc: "Product updates and insights" },
      { title: "Customer Stories", desc: "How teams use Kick My Apps" },
    ],
  },
  {
    label: "Support",
    items: [
      { title: "Help Center", desc: "Answers to common questions" },
      { title: "Product Updates", desc: "What's new and shipped" },
    ],
  },
];

function NavDropdown({ label, groups, open, onEnter, onLeave }) {
  const anchorRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(false); // DOM'da mı (animasyon çıkışı için)
  const [visible, setVisible] = useState(false); // animasyon durumu

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let hideTimer;
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 26, left: rect.left + rect.width / 2 });
      setRendered(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      hideTimer = setTimeout(() => setRendered(false), 200);
    }
    return () => clearTimeout(hideTimer);
  }, [open]);

  const columns = groups.length;

  return (
    <div className="kma-navdrop" ref={anchorRef} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <span className="kma-header-navitem kma-header-navitem-clickable">
        {label}
        <ChevronDown size={14} className={`kma-navdrop-chevron ${open ? "kma-navdrop-chevron-open" : ""}`} />
      </span>
      {mounted && rendered &&
        createPortal(
          <div className={`kma-navdrop-backdrop ${visible ? "kma-navdrop-backdrop-visible" : ""}`} />,
          document.body
        )}
      {mounted && rendered && coords &&
        createPortal(
          <div
            className={`kma-navdrop-panel ${visible ? "kma-navdrop-panel-visible" : ""}`}
            style={{ top: coords.top, left: coords.left, minWidth: columns * 230 + 150 }}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
          >
            {groups.map((group) => (
              <div className="kma-navdrop-col" key={group.label}>
                <div className="kma-navdrop-col-label" lang="en">{group.label}</div>
                {group.items.map((item) => (
                  <div className="kma-navdrop-item" key={item.title}>
                    <div className="kma-navdrop-item-title">{item.title}</div>
                    <div className="kma-navdrop-item-desc">{item.desc}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

export default function Header() {
  const [openMenu, setOpenMenu] = useState(null); // "features" | "usecases" | null
  const closeTimer = useRef(null);

  const openWithDelay = (key) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenMenu(key);
  };

  const closeWithDelay = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 180);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <div className="kma-header-wrap">
      <style>{`
        .kma-header-wrap {
          position: sticky;
          top: 0;
          z-index: 160;
          padding: 24px 40px 110px;
          margin-bottom: -110px;
          pointer-events: none;
          background: transparent;
        }
        .kma-header-blur-bg {
          position: absolute; inset: 0;
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 20%, transparent 100%);
          mask-image: linear-gradient(to bottom, black 0%, black 20%, transparent 100%);
          pointer-events: none;
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
          display: flex; align-items: center; gap: 6px;
          font-size: 15px;
          font-weight: 500;
          color: var(--chalk);
          user-select: none;
          white-space: nowrap;
        }
        .kma-header-navitem-clickable { cursor: pointer; }
        .kma-navdrop-chevron {
          color: var(--muted); transition: transform 0.25s ease, color 0.2s ease;
        }
        .kma-navdrop-chevron-open { transform: rotate(180deg); color: #533AFE; }
        .kma-navdrop { position: relative; }
      `}</style>

      <div className="kma-header-blur-bg" />
      <div className="kma-header-inner">
        <Link href="/" className="kma-header-logo">
          <LogoMark size={86} />
        </Link>

        <div className="kma-header-spacer" />

        <nav className="kma-header-nav">
          <NavDropdown
            label="Features"
            groups={FEATURE_GROUPS}
            open={openMenu === "features"}
            onEnter={() => openWithDelay("features")}
            onLeave={closeWithDelay}
          />
          <NavDropdown
            label="Use Cases"
            groups={USE_CASE_GROUPS}
            open={openMenu === "usecases"}
            onEnter={() => openWithDelay("usecases")}
            onLeave={closeWithDelay}
          />
          <NavDropdown
            label="Resources"
            groups={RESOURCES_GROUPS}
            open={openMenu === "resources"}
            onEnter={() => openWithDelay("resources")}
            onLeave={closeWithDelay}
          />
        </nav>

        <div className="kma-header-right">
          <button className="kma-header-signin">Sign in</button>
        </div>
      </div>

      <style>{`
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
          background: #533AFE;
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

        .kma-navdrop-backdrop {
          position: fixed; inset: 0; z-index: 150; opacity: 0;
          background: rgba(20,33,61,0.06);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          transition: opacity 0.25s ease; pointer-events: none;
        }
        .kma-navdrop-backdrop-visible { opacity: 1; }
        .kma-navdrop-panel {
          position: fixed; transform: translateX(-50%) translateY(-8px); opacity: 0;
          background: var(--ink-2);
          border-radius: 4px; padding: 30px;
          z-index: 200; display: flex; gap: 8px;
          transition: opacity 0.18s ease, transform 0.18s ease;
          pointer-events: none;
        }
        .kma-navdrop-panel-visible {
          opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto;
        }
        .kma-navdrop-col { display: flex; flex-direction: column; gap: 11px; flex: 1; min-width: 200px; }
        .kma-navdrop-col-label {
          font-size: 10.5px; font-weight: 700; letter-spacing: 0.07em; color: var(--muted);
          text-transform: uppercase; padding: 6px 12px 10px;
        }
        .kma-navdrop-item {
          position: relative; display: flex; flex-direction: column; padding: 10px 12px 16px; border-radius: 10px;
          transition: background 0.15s ease;
        }
        .kma-navdrop-item-title { font-size: 13.5px; font-weight: 600; color: var(--chalk); transition: color 0.15s ease; }
        .kma-navdrop-item:hover .kma-navdrop-item-title { color: #533AFE; }
        .kma-navdrop-item::after {
          content: ""; position: absolute; left: 12px; right: 12px; bottom: 4px; height: 1px;
          background: linear-gradient(90deg, #533AFE, #A78BFA);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .kma-navdrop-item:hover::after { transform: scaleX(1); }
        .kma-navdrop-item-desc { font-size: 12px; color: var(--muted); margin-top: 1px; }
      `}</style>
    </div>
  );
}
