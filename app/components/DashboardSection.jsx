"use client";

// Figma "Dashboard" — dark 4220:4947, light 4221:5279. 1170x700 card + blurred glow underneath.
import { useTheme } from "./ThemeProvider";

export default function DashboardSection() {
  const { theme } = useTheme();
  const light = theme === "light";
  return (
    <section className="kma-dashboard" aria-label="Dashboard preview">
      <style>{`
        /* hero bottom (y=733) -> dashboard top (y=883) = 150 */
        .kma-dashboard {
          position: relative;
          width: 100%;
          max-width: 1170px;
          aspect-ratio: 1600 / 978;
          margin: 150px auto 0;
        }
        @media (max-width: 780px) {
          .kma-dashboard { margin-top: 48px; }
        }
        /* originally 4155:193 — a single blurred glow sitting under the card; now wraps all
           4 sides as an animated rainbow aura peeking out from behind the card's edges. */
        .kma-dashboard-shadow {
          position: absolute;
          inset: -64px;
          border-radius: 36px;
          background-image: linear-gradient(120deg,
            rgba(68, 255, 154, 0.38) 0%,
            rgba(68, 176, 255, 0.38) 25%,
            rgba(139, 68, 255, 0.38) 50%,
            rgba(255, 102, 68, 0.38) 75%,
            rgba(235, 255, 112, 0.38) 100%);
          background-size: 300% 300%;
          filter: blur(64px) hue-rotate(0deg);
          opacity: 0.5;
          animation: kma-glow-pan 8s ease-in-out infinite, kma-glow-hue 11s linear infinite;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes kma-glow-pan {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes kma-glow-hue {
          0% { filter: blur(64px) hue-rotate(0deg); }
          100% { filter: blur(64px) hue-rotate(360deg); }
        }
        /* The side gutter around .kma-dashboard-card is exactly 16px below 780px, 32px from
           780px up to ~1298px, and only opens up past that — so the glow's inset is capped to
           what's actually available at each tier, or it would push a real horizontal scrollbar. */
        @media (max-width: 1298px) {
          .kma-dashboard-shadow { inset: -28px; border-radius: 24px; }
        }
        @media (max-width: 780px) {
          .kma-dashboard-shadow { inset: -14px; border-radius: 18px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .kma-dashboard-shadow { animation: none; }
        }
        /* 4155:194 */
        .kma-dashboard-card {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: ${light ? "#EFF1F4" : "#17181F"};
          border-radius: 8px;
          overflow: hidden;
        }
        .kma-dashboard-card img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }
      `}</style>
      <div className="kma-dashboard-shadow" aria-hidden="true" />
      <div className="kma-dashboard-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={light ? "/light/dashboard/dashboard.svg" : "/dark/dashboard/dashboard.svg"}
          alt="Kick My Apps dashboard preview"
        />
      </div>
    </section>
  );
}
