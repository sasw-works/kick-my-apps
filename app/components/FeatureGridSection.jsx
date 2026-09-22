// Figma "Video" 4158:723 — a full-bleed, edge-to-edge 1728px-wide staircase grid: 5 columns x 3 rows
// of 325x250 cells, only the lower-right triangle (12 of 15 cells) filled — 3 cells in row 1, 4 in
// row 2, 5 in row 3. Each filled cell has a left border, a bottom border (except the last row), and
// a top border on the row's leftmost ("new") cell, matching Figma exactly.

const ROWS = [
  { cols: [2, 3, 4], bottom: true },
  { cols: [1, 2, 3, 4], bottom: true },
  { cols: [0, 1, 2, 3, 4], bottom: false },
];

const ITEMS = {
  "0-2": { title: "Screenshot Analysis", lines: ["Reviews every screenshot", "across 13 categories and 4 lenses."] },
  "0-3": { title: "Real App Store Reviews", lines: ["Pulls and analyzes real, public App", "Store reviews in real time."] },
  "0-4": { title: "ASO / Store Listing Review", lines: ["Reviews your title, description, and", "keywords to boost visibility."] },
  "1-1": { title: "Update Risk Check", lines: ["Flags visual signals that could", "cause trouble in your next review."] },
  "1-2": { title: "Quick Wins", lines: ["Ranks fixes by high impact and low", "effort, so you know what's first."] },
  "1-3": { title: "Code-Level Suggestions", lines: ["Suggests sample CSS, Swift, or", "Kotlin snippets for quick fixes."] },
  "1-4": { title: "Visual Annotation", lines: ["Marks each finding directly on", "your screenshot, showing exactly"] },
  "2-0": { title: "History & Trend", lines: ["Saves every scan so you can track", "your health score over time."] },
  "2-1": { title: "Detailed Comparison", lines: ["Compares two scans finding by", "finding to see who's ahead."] },
  "2-2": { title: "My Apps Dashboard", lines: ["See every tracked app, its score,", "and history in one place."] },
  "2-3": { title: "Weekly Email Digest", lines: ["Sends new App Store reviews to", "your inbox every week."] },
  "2-4": { title: "PDF Export", lines: ["Download your full report as a PDF", "and share it instantly."] },
};

export default function FeatureGridSection() {
  return (
    <section className="kma-fgrid" aria-label="All features">
      <style>{`
        .kma-fgrid {
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          width: min(1728px, 100vw);
          margin-top: 90px;
          background: #18181b;
        }
        .fg-fit { width: 100%; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
        .fg-cell { box-sizing: border-box; width: auto; height: 250px; border-left: 1px solid #484848; padding: 126px 0 0 31px; }
        .fg-cell-bottom { border-bottom: 1px solid #484848; }
        .fg-cell-top { border-top: 1px solid #484848; }
        .fg-title { margin: 0; font-family: var(--font-inter), sans-serif; font-size: 18px; line-height: 20px; font-weight: 400; color: #ffffff; }
        .fg-body { margin: 16px 0 0; font-family: var(--font-inter), sans-serif; font-size: 16px; line-height: 24px; font-weight: 400; color: #a1a1a1; }

        /* Exact Figma geometry only at the design's own width; narrower viewports fall back to the auto-fit grid above. */
        @media (min-width: 1728px) {
          .fg-fit { width: 1728px; grid-template-columns: repeat(5, 325px); }
          .fg-cell { width: 325px; padding: 126px 0 0 31px; }
        }
        @media (max-width: 640px) {
          .fg-fit { grid-template-columns: 1fr; }
          .fg-cell, .fg-cell-bottom { border: none; border-top: 1px solid #484848; }
          .kma-fgrid { margin-top: 64px; }
        }
      `}</style>
      <div className="fg-fit">
        {ROWS.map((row, r) =>
          Array.from({ length: 5 }, (_, col) => {
            const item = ITEMS[`${r}-${col}`];
            if (!row.cols.includes(col)) return <div key={col} aria-hidden="true" />;
            const isLeftmost = col === Math.min(...row.cols);
            return (
              <div
                key={col}
                className={`fg-cell${row.bottom ? " fg-cell-bottom" : ""}${isLeftmost && r > 0 ? " fg-cell-top" : ""}`}
              >
                <h3 className="fg-title">{item.title}</h3>
                <p className="fg-body">
                  {item.lines[0]}
                  <br />
                  {item.lines[1]}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
