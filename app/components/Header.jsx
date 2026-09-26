"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import LogoMark from "./LogoMark";
import { useTheme } from "./ThemeProvider";
import { Moon } from "lucide-react";
import { useSession } from "next-auth/react";

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
  const [portalRoot, setPortalRoot] = useState(null); // inside .kma-dark when present, so the panel gets the dark tokens
  const [rendered, setRendered] = useState(false); // mounted in the DOM (for exit animation)
  const [visible, setVisible] = useState(false); // animasyon durumu

  useEffect(() => setPortalRoot(anchorRef.current?.closest(".kma-dark") || document.body), []);

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
        <span className={`kma-navdrop-chevron ${open ? "kma-navdrop-chevron-open" : ""}`} aria-hidden="true">
          <img src="/dark/header-arrow.svg" alt="" width={12.2632} height={9.56178} />
        </span>
      </span>
      {portalRoot && rendered &&
        createPortal(
          <div className={`kma-navdrop-backdrop ${visible ? "kma-navdrop-backdrop-visible" : ""}`} />,
          portalRoot
        )}
      {portalRoot && rendered && coords &&
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
          portalRoot
        )}
    </div>
  );
}

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();
  const [openMenu, setOpenMenu] = useState(null); // "features" | "usecases" | "resources" | null
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState(null);
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

  // Auto-close the mobile menu if the viewport grows past the breakpoint where it's used.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1000) {
        setMobileOpen(false);
        setMobileSection(null);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const MOBILE_GROUPS = [
    { key: "features", label: "Features", groups: FEATURE_GROUPS },
    { key: "usecases", label: "Use Cases", groups: USE_CASE_GROUPS },
    { key: "resources", label: "Resources", groups: RESOURCES_GROUPS },
  ];

  return (
    <div className="kma-header-wrap">
      <style>{`
        /* Figma "Header" 4071:585 — 1170x100, sits 50px from the top of the page. */
        .kma-header-wrap {
          position: sticky;
          top: 0;
          z-index: 160;
          padding: 50px 24px 64px;
          margin-bottom: -64px; /* the 64px is only room for the blur fade; hero starts 150px below the header */
          pointer-events: none;
          background: transparent;
        }
        .kma-header-blur-bg {
          position: absolute; inset: 0; z-index: 0;
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 20%, transparent 100%);
          mask-image: linear-gradient(to bottom, black 0%, black 20%, transparent 100%);
          pointer-events: none;
        }

        .kma-header-inner {
          position: relative;
          z-index: 1;
          pointer-events: auto;
          max-width: 1170px;
          height: 100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
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

        /* right: 721px = navigation 471 + action 250 */
        .kma-header-right {
          display: flex;
          align-items: center;
          width: 721px;
          flex-shrink: 0;
        }
        .kma-header-nav {
          display: flex;
          align-items: center;
          gap: 48px;
          flex: 1 1 0;
          min-width: 0;
        }
        .kma-navdrop { position: relative; flex: 1 1 0; display: flex; justify-content: center; min-width: 0; }
        .kma-header-navitem {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          font-size: var(--fs-18);
          font-weight: 400;
          line-height: 32px;
          letter-spacing: var(--ls-body);
          color: var(--chalk);
          user-select: none;
          white-space: nowrap;
        }
        .kma-header-navitem-clickable { cursor: pointer; }
        /* arrow: 11.571 x 8.87 box, the 12.26 x 9.56 asset overflows it exactly as in Figma */
        .kma-navdrop-chevron {
          position: relative; display: block; flex-shrink: 0;
          width: 11.571px; height: 8.87px;
          transition: transform 0.25s ease;
        }
        .kma-navdrop-chevron img { position: absolute; top: 0; left: -0.346px; display: block; max-width: none; filter: invert(1); } /* asset is white: darken it on light pages */
        .kma-dark .kma-navdrop-chevron img { filter: none; }
        .kma-navdrop-chevron-open { transform: rotate(180deg); }

        .kma-header-action {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
          width: 250px;
          flex-shrink: 0;
          white-space: nowrap;
        }
        /* Theme toggle. Dark mode: existing glass-dark circle (sun icon baked into the asset).
           Light mode: plain white circle + gray border, with a Moon icon (shows the mode you'd switch TO). */
        .kma-header-theme {
          display: flex; align-items: center; justify-content: center;
          padding: 0; border: none; background: transparent;
          width: 56px; height: 56px; flex-shrink: 0; border-radius: 50%;
          cursor: pointer;
        }
        .kma-header-theme img { display: block; }
        .kma-header-theme-light {
          background: #ffffff; border: none; color: #1A2B3B;
        }
        .kma-header-signin {
          display: flex; align-items: center; justify-content: center;
          width: 138px; height: 56px;
          background: var(--blue-100);
          color: #FFFFFF;
          font-family: var(--font-inter), sans-serif;
          font-size: var(--fs-18);
          font-weight: 400;
          letter-spacing: var(--ls-body);
          border-radius: 999px;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          text-decoration: none;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .kma-header-signin:hover { filter: brightness(1.08); transform: translateY(-1px); }

        @media (max-width: 1240px) {
          .kma-header-right { width: auto; }
          .kma-header-nav { flex: 0 0 auto; margin-right: 32px; gap: 32px; }
          .kma-navdrop { flex: 0 0 auto; }
          .kma-header-action { width: auto; }
          .kma-header-logo svg { width: 300px; height: auto; }
        }
        .kma-mobile-toggle {
          display: none;
          padding: 0; border: none; background: transparent;
          width: 44px; height: 44px; flex-shrink: 0;
          position: relative; cursor: pointer;
        }
        .kma-mobile-toggle span, .kma-mobile-toggle span::before, .kma-mobile-toggle span::after {
          position: absolute; left: 50%; width: 22px; height: 2px; border-radius: 1px;
          background: var(--chalk); transform: translateX(-50%);
          transition: transform 0.25s ease, opacity 0.2s ease, top 0.25s ease;
        }
        .kma-mobile-toggle span { top: 50%; margin-top: -1px; }
        .kma-mobile-toggle span::before { content: ""; top: -8px; }
        .kma-mobile-toggle span::after { content: ""; top: 8px; }
        .kma-mobile-toggle-open span { background: transparent; }
        .kma-mobile-toggle-open span::before { top: 0; transform: translateX(-50%) rotate(45deg); }
        .kma-mobile-toggle-open span::after { top: 0; transform: translateX(-50%) rotate(-45deg); }

        .kma-mobile-panel {
          position: fixed; left: 0; right: 0; top: 150px; bottom: 0;
          z-index: 155; background: var(--ink-2); overflow-y: auto;
          padding: 8px 24px 32px;
          opacity: 0; transform: translateY(-8px); pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .kma-mobile-panel-open { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .kma-mobile-group { border-bottom: 1px solid var(--ink-3); }
        .kma-mobile-group-head {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          background: none; border: none; cursor: pointer; padding: 20px 4px;
          font-family: var(--font-inter), sans-serif; font-size: 20px; font-weight: 400; color: var(--chalk);
        }
        .kma-mobile-group-chevron { transition: transform 0.2s ease; color: var(--muted); }
        .kma-mobile-group-open .kma-mobile-group-chevron { transform: rotate(180deg); }
        .kma-mobile-group-body {
          display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease;
        }
        .kma-mobile-group-open .kma-mobile-group-body { grid-template-rows: 1fr; }
        .kma-mobile-group-body-inner { overflow: hidden; }
        .kma-mobile-item { padding: 12px 4px 16px 12px; }
        .kma-mobile-item-title { font-size: 15px; font-weight: 600; color: var(--chalk); }
        .kma-mobile-item-desc { font-size: 13px; color: var(--muted); margin-top: 2px; }
        .kma-mobile-theme-row {
          width: 100%; text-align: left; padding: 20px 4px; margin-top: 8px;
          background: none; border: none; cursor: pointer;
          font-family: var(--font-inter), sans-serif; font-size: 16px; font-weight: 500; color: var(--chalk);
        }

        @media (max-width: 1000px) {
          .kma-header-nav { display: none; }
          .kma-header-logo svg { width: 280px; }
          .kma-mobile-toggle { display: block; }
        }
        @media (min-width: 1001px) {
          .kma-mobile-panel, .kma-mobile-toggle { display: none !important; }
        }
        @media (max-width: 600px) {
          .kma-header-logo svg { width: 260px; }
          .kma-header-theme { display: none; }
          .kma-header-action { gap: 8px; }
          .kma-header-signin { width: auto; padding: 0 20px; }
        }
        @media (max-width: 400px) {
          .kma-header-wrap { padding-left: 12px; padding-right: 12px; }
          .kma-header-logo svg { width: 220px; }
          .kma-header-action { gap: 6px; }
          .kma-header-signin { padding: 0 16px; }
          .kma-mobile-toggle { width: 40px; height: 40px; }
        }
        @media (max-width: 340px) {
          .kma-header-logo svg { width: 190px; }
        }
        @media (max-width: 330px) {
          .kma-header-logo svg { width: 165px; }
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
          background: var(--surface);
          border-radius: 4px; padding: 32px;
          z-index: 200; display: flex; gap: 8px;
          transition: opacity 0.18s ease, transform 0.18s ease;
          pointer-events: none;
        }
        .kma-navdrop-panel-visible {
          opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto;
        }
        .kma-navdrop-col { display: flex; flex-direction: column; gap: 12px; flex: 1; min-width: 200px; }
        .kma-navdrop-col-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.07em; color: var(--muted);
          text-transform: uppercase; padding: 8px 12px 12px;
        }
        .kma-navdrop-item {
          position: relative; display: flex; flex-direction: column; padding: 12px 12px 16px; border-radius: 8px;
          transition: background 0.15s ease;
        }
        .kma-navdrop-item-title { font-size: 14px; font-weight: 600; color: var(--chalk); transition: color 0.15s ease; }
        .kma-navdrop-item:hover .kma-navdrop-item-title { color: #533AFE; }
        .kma-navdrop-item::after {
          content: ""; position: absolute; left: 12px; right: 12px; bottom: 4px; height: 1px;
          background: linear-gradient(90deg, #533AFE, #A78BFA);
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .kma-navdrop-item:hover::after { transform: scaleX(1); }
        .kma-navdrop-item-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }
      `}</style>

      <div className="kma-header-blur-bg" />
      <div className="kma-header-inner">
        <Link href="/" className="kma-header-logo" aria-label="Kick my apps">
          <LogoMark size={100} color="currentColor" />
        </Link>

        <div className="kma-header-right">
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

          <div className="kma-header-action">
            <button
              type="button"
              className={`kma-mobile-toggle ${mobileOpen ? "kma-mobile-toggle-open" : ""}`}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span />
            </button>
            <button
              type="button"
              className={`kma-header-theme ${theme === "light" ? "kma-header-theme-light" : ""}`}
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <Moon size={22} color="#1A2B3B" />
              ) : (
                <img src="/dark/header-theme-toggle.svg" alt="" width={56} height={56} />
              )}
            </button>
            <Link href={session ? "/console" : "/signin"} className="kma-header-signin">
              {status === "loading" ? "" : session ? "Console" : "Sign in"}
            </Link>
          </div>
        </div>
      </div>

      <div className={`kma-mobile-panel ${mobileOpen ? "kma-mobile-panel-open" : ""}`}>
        {MOBILE_GROUPS.map((section) => {
          const open = mobileSection === section.key;
          return (
            <div className={`kma-mobile-group ${open ? "kma-mobile-group-open" : ""}`} key={section.key}>
              <button
                type="button"
                className="kma-mobile-group-head"
                aria-expanded={open}
                onClick={() => setMobileSection(open ? null : section.key)}
              >
                {section.label}
                <svg className="kma-mobile-group-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="kma-mobile-group-body">
                <div className="kma-mobile-group-body-inner">
                  {section.groups.map((group) => (
                    <div key={group.label}>
                      {group.items.map((item) => (
                        <div className="kma-mobile-item" key={item.title}>
                          <div className="kma-mobile-item-title">{item.title}</div>
                          <div className="kma-mobile-item-desc">{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <button type="button" className="kma-mobile-theme-row" onClick={toggleTheme}>
          {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </button>
      </div>
    </div>
  );
}
