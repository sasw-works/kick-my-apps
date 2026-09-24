// Figma "Dashboard" 4155:192 — 1170x700 card + blurred 5-colour light underneath.
export default function DashboardSection() {
  return (
    <section className="kma-dashboard" aria-label="Dashboard preview">
      <style>{`
        /* hero bottom (y=733) -> dashboard top (y=883) = 150 */
        .kma-dashboard {
          position: relative;
          width: 100%;
          max-width: 1170px;
          aspect-ratio: 1170 / 700;
          margin: 150px auto 0;
        }
        /* 4155:193 — sized to bleed past the card's own edges (Figma's box sat fully inside the
           card, so it never showed through the opaque card on top of it); opacity boosted for
           the dark page background too. */
        .kma-dashboard-shadow {
          position: absolute;
          left: -8%;
          top: 10%;
          width: 116%;
          height: 100%;
          filter: blur(60px);
          background-image: linear-gradient(90deg,
            rgba(68, 255, 154, 0.6) 0.54765%,
            rgba(68, 176, 255, 0.6) 22.864%,
            rgba(139, 68, 255, 0.6) 48.357%,
            rgba(255, 102, 68, 0.6) 73.33%,
            rgba(235, 255, 112, 0.6) 99.343%);
          pointer-events: none;
        }
        /* 4155:194 */
        .kma-dashboard-card {
          position: absolute;
          inset: 0;
          background: #17181F;
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
        <img src="/dark/dashboard/dashboard.svg" alt="Kick My Apps dashboard preview" />
      </div>
    </section>
  );
}
