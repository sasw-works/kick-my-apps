"use client";

// Restored verbatim from the original site (commit 0d16a60, MarketingSections.jsx
// "All features — dark grid"): full-bleed video background with a 12-item feature grid.
// Placed on its own so it can sit right before the FAQ section in the KMA Dark page.

import {
  Store,
  Sparkles,
  Mail,
  GitCompare,
  Code2,
  ImageIcon,
  History,
  LayoutDashboard,
  Download,
  ShieldQuestion,
  Search,
} from "lucide-react";

const ALL_FEATURES = [
  { icon: ImageIcon, title: "Screenshot Analysis", desc: "Reviews every screenshot across 13 categories and 4 lenses.", color: "var(--brand)", fill: "#8A7CFF", bgImage: null },
  { icon: Store, title: "Real App Store Reviews", desc: "Pulls and analyzes real, public App Store reviews in real time.", color: "var(--teal)", fill: "#79D9CC", bgImage: null },
  { icon: Search, title: "ASO / Store Listing Review", desc: "Reviews your title, description, and keywords to boost visibility.", color: "var(--yellow)", fill: "#F3C468", bgImage: null },
  { icon: ShieldQuestion, title: "Update Risk Check", desc: "Flags visual signals that could cause trouble in your next review.", color: "var(--brand)", fill: "#8A7CFF", bgImage: null },
  { icon: Sparkles, title: "Quick Wins", desc: "Ranks fixes by high impact and low effort, so you know what's first.", color: "var(--teal)", fill: "#79D9CC", bgImage: null },
  { icon: Code2, title: "Code-Level Suggestions", desc: "Suggests sample CSS, Swift, or Kotlin snippets for quick fixes.", color: "var(--yellow)", fill: "#F3C468", bgImage: null },
  { icon: ImageIcon, title: "Visual Annotation", desc: "Marks each finding directly on your screenshot, showing exactly where.", color: "var(--brand)", fill: "#8A7CFF", bgImage: null },
  { icon: History, title: "History & Trend", desc: "Saves every scan so you can track your health score over time.", color: "var(--teal)", fill: "#79D9CC", bgImage: null },
  { icon: GitCompare, title: "Detailed Comparison", desc: "Compares two scans finding by finding to see who's ahead.", color: "var(--yellow)", fill: "#F3C468", bgImage: null },
  { icon: LayoutDashboard, title: "My Apps Dashboard", desc: "See every tracked app, its score, and history in one place.", color: "var(--brand)", fill: "#8A7CFF", bgImage: null },
  { icon: Mail, title: "Weekly Email Digest", desc: "Sends new App Store reviews to your inbox every week.", color: "var(--teal)", fill: "#79D9CC", bgImage: null },
  { icon: Download, title: "PDF Export", desc: "Download your full report as a PDF and share it instantly.", color: "var(--yellow)", fill: "#F3C468", bgImage: null },
];

export default function VideoFeatureGrid() {
  return (
    <>
      <style>{`
        .mkt-fullbleed {
          width: 100vw; position: relative; left: 50%; right: 50%;
          margin-left: -50vw; margin-right: -50vw; padding: 0 48px; box-sizing: border-box;
        }
        .mkt-grid-dark-wrap {
          background: #030B25; padding: 0 0 0 48px; margin-top: 90px;
          position: relative; overflow: hidden;
        }
        .mkt-grid-dark-video {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center bottom; z-index: 0;
        }
        .mkt-grid-dark-inner {
          max-width: 1500px; margin-left: auto; margin-right: 0; overflow-x: auto;
          border-top: 1px solid rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.5);
          position: relative; z-index: 2;
        }
        .mkt-grid-dark-row {
          display: flex;
        }
        .mkt-grid-dark-title {
          flex: 0 0 600px; box-sizing: border-box;
          padding: 64px 48px 48px 0; display: flex; flex-direction: column; justify-content: center;
        }
        .mkt-grid-dark-spacer { flex: 0 0 auto; }
        .mkt-grid-dark-spacer-md { flex-basis: 300px; }
        .mkt-grid-dark-spacer-sm { flex-basis: 0px; }
        .mkt-grid-dark-cell {
          position: relative; overflow: hidden; flex: 0 0 300px; width: 300px; height: 250px;
          border-left: 1px solid rgba(255,255,255,0.5); box-sizing: border-box;
        }
        .mkt-grid-dark-row:not(:first-child) .mkt-grid-dark-cell { border-top: 1px solid rgba(255,255,255,0.5); }
        .mkt-grid-dark-fill {
          position: absolute; inset: 0; background: var(--cell-fill);
          background-size: cover; background-position: center;
          opacity: 0; transition: opacity 0.35s ease; z-index: 0;
        }
        .mkt-grid-dark-cell:hover .mkt-grid-dark-fill { opacity: 1; }
        .mkt-grid-dark-content { position: relative; z-index: 1; padding: 32px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; }
        .mkt-grid-dark-headline {
          font-size: 16px; font-weight: 600; color: #FFFFFF; margin-bottom: 12px; transition: color 0.2s ease;
        }
        .mkt-grid-dark-desc {
          font-size: 14px; font-family: var(--font-body); color: rgba(255,255,255,0.5); line-height: 1.55;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          transition: color 0.2s ease;
        }
        .mkt-grid-dark-cell:hover .mkt-grid-dark-desc { color: rgba(255,255,255,0.75); }
        .mkt-grid-dark-cell:hover .mkt-grid-dark-headline { color: #FFFFFF; }
        @media (max-width: 1000px) {
          .mkt-grid-dark-inner {
            display: grid; grid-template-columns: repeat(2, 1fr); max-width: 100%;
            border: none;
          }
          .mkt-grid-dark-row { display: contents; }
          .mkt-grid-dark-title { display: none; }
          .mkt-grid-dark-spacer { display: none; }
          .mkt-grid-dark-cell {
            flex: none; width: auto; height: 220px; border: 1px solid rgba(255,255,255,0.5);
          }
        }
      `}</style>

      <div className="mkt-fullbleed mkt-grid-dark-wrap">
        <video className="mkt-grid-dark-video" autoPlay loop muted playsInline>
          <source src="/dark-grid-bg.mp4" type="video/mp4" />
        </video>
        <div className="mkt-grid-dark-inner">
          <div className="mkt-grid-dark-row">
            <div className="mkt-grid-dark-title" />
            {ALL_FEATURES.slice(0, 3).map((f) => (
              <div className="mkt-grid-dark-cell" key={f.title} style={{ "--cell-fill": "#533AFE" }}>
                <div className="mkt-grid-dark-fill" style={f.bgImage ? { backgroundImage: `url(${f.bgImage})` } : undefined} />
                <div className="mkt-grid-dark-content">
                  <div className="mkt-grid-dark-headline">{f.title}</div>
                  <div className="mkt-grid-dark-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mkt-grid-dark-row">
            <div className="mkt-grid-dark-spacer mkt-grid-dark-spacer-md" />
            {ALL_FEATURES.slice(3, 7).map((f) => (
              <div className="mkt-grid-dark-cell" key={f.title} style={{ "--cell-fill": "#533AFE" }}>
                <div className="mkt-grid-dark-fill" style={f.bgImage ? { backgroundImage: `url(${f.bgImage})` } : undefined} />
                <div className="mkt-grid-dark-content">
                  <div className="mkt-grid-dark-headline">{f.title}</div>
                  <div className="mkt-grid-dark-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mkt-grid-dark-row">
            <div className="mkt-grid-dark-spacer mkt-grid-dark-spacer-sm" />
            {ALL_FEATURES.slice(7, 12).map((f) => (
              <div className="mkt-grid-dark-cell" key={f.title} style={{ "--cell-fill": "#533AFE" }}>
                <div className="mkt-grid-dark-fill" style={f.bgImage ? { backgroundImage: `url(${f.bgImage})` } : undefined} />
                <div className="mkt-grid-dark-content">
                  <div className="mkt-grid-dark-headline">{f.title}</div>
                  <div className="mkt-grid-dark-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
