// Figma "Section 04" 4153:1824 — headline + 4 equal-width role cards, 60x60 icon each.
// Card body text is kept verbatim from Figma, including its truncated template string
// ("...lack of  resources, and failed") — to be swapped for real copy later.

const A = "/dark/audience/";

function Icon({ pieces, dots, dotColor }) {
  return (
    <div className="au-icon">
      {pieces.map(([inset, src], i) => (
        <div key={i} className="au-icon-piece" style={{ inset }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={A + src} alt="" />
        </div>
      ))}
      {dots.map(([left, top], i) => (
        <span key={i} className="au-icon-dot" style={{ left, top, background: dotColor }} />
      ))}
    </div>
  );
}

const CARDS = [
  {
    title: "UX and UI Designers",
    body: "Identify issues, misconfigurations, lack of  resources, and failed",
    dotColor: "#95d3ff",
    dots: [
      [32, 32],
      [41, 32],
      [32, 41],
      [32, 14],
    ],
    pieces: [
      ["23px 32px 32px 23px", "a1-915e5.svg"],
      ["23px 41px 32px 14px", "a2-248df.svg"],
      ["23px 23px 32px 32px", "a2-248df.svg"],
      ["23px 14px 32px 41px", "a2-248df.svg"],
      ["14px 32px 41px 23px", "a3-a1186.svg"],
      ["32px 32px 23px 23px", "a4-e154c.svg"],
      ["32px 41px 23px 14px", "a5-a4191.svg"],
      ["41px 32px 14px 23px", "a4-e154c.svg"],
    ],
  },
  {
    title: "Product Owners",
    body: "Identify issues, misconfigurations, lack of  resources, and failed",
    dotColor: "#f4af88",
    dots: [
      [41, 32],
      [32, 41],
    ],
    pieces: [
      ["23px 41px 31px 14px", "a6-70d53.svg"],
      ["23px 23px 31px 32px", "a6-70d53.svg"],
      ["14px 14px 41px 41px", "a7-4437e.svg"],
      ["14px 32px 40px 23px", "a8-fd284.svg"],
      ["32px 32px 22px 23px", "a9-28013.svg"],
      ["41px 41px 14px 14px", "a10-16a55.svg"],
    ],
  },
  {
    title: "VoC Teams",
    body: "Identify issues, misconfigurations, lack of  resources, and failed",
    dotColor: null,
    dots: [],
    pieces: [
      ["24.5px 32.5px 29.5px 22.5px", "a11-241ba.svg"],
      ["19.5px 27.5px 34.5px 27.5px", "a11-241ba.svg"],
      ["29.5px 38.5px 24.5px 16.5px", "a12-cd895.svg"],
      ["34.5px 43.5px 19.5px 11.5px", "a12-cd895.svg"],
      ["24.5px 17.5px 29.5px 37.5px", "a11-241ba.svg"],
      ["19.5px 12.5px 34.5px 42.5px", "a11-241ba.svg"],
      ["29.5px 23.5px 24.5px 31.5px", "a12-cd895.svg"],
      ["34.5px 28.5px 19.5px 26.5px", "a12-cd895.svg"],
      ["34px 13px 20px 42px", "a12-cd895.svg"],
      ["19px 43px 35px 12px", "a12-cd895.svg"],
    ],
  },
  {
    title: "Developers",
    body: "Identify issues, misconfigurations, lack of  resources, and failed",
    dotColor: "#a2cead",
    dots: [
      [40, 40],
      [34, 28],
      [40, 16],
    ],
    pieces: [
      ["28px 33px 27px 22px", "a13-fc3f4.svg"],
      ["16px 39px 39px 16px", "a14-936f2.svg"],
      ["22px 27px 33px 28px", "a15-d79c2.svg"],
      ["40px 39px 15px 16px", "a16-2b3f3.svg"],
      ["34px 27px 21px 28px", "a16-2b3f3.svg"],
    ],
  },
];

export default function AudienceSection() {
  return (
    <section className="kma-audience" aria-label="Who it's for">
      <style>{`
        .kma-audience {
          width: 100%;
          max-width: 1170px;
          margin: 90px auto 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 50px;
        }
        .au-headline { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
        .au-title { margin: 0; font-size: 42px; line-height: 57.6px; font-weight: 400; color: #ffffff; max-width: 724px; }
        .au-sub { margin: 0; font-size: var(--fs-18); line-height: 28px; font-weight: 400; color: #dedede; }

        .au-cards { display: flex; align-items: stretch; gap: 17px; width: 100%; }
        .au-card {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding: 28px;
          background: #262626;
          border: 1px solid #484848;
          border-radius: 12px;
          box-sizing: border-box;
        }
        .au-icon { position: relative; flex-shrink: 0; width: 60px; height: 60px; background: #303030; border: 1px solid #606060; border-radius: 10px; box-sizing: border-box; }
        .au-icon-piece { position: absolute; overflow: hidden; }
        .au-icon-piece img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
        .au-icon-dot { position: absolute; width: 5px; height: 5px; border-radius: 1px; }
        .au-card-title { font-size: 18px; line-height: 20px; font-weight: 400; color: #ffffff; }
        .au-card-body { margin-top: 16px; font-size: 16px; line-height: 24px; font-weight: 400; color: #a1a1a1; }

        @media (max-width: 900px) {
          .au-cards { flex-wrap: wrap; }
          .au-card { flex: 1 1 calc(50% - 9px); }
        }
        @media (max-width: 560px) {
          .au-title { font-size: 32px; line-height: 1.25; }
          .au-sub { white-space: normal; }
          .au-cards { flex-direction: column; }
          .au-card { flex: 1 1 auto; }
        }
      `}</style>
      <div className="au-headline">
        <h2 className="au-title">A platform to benefit the entire team</h2>
        <p className="au-sub">
          Enter your app and - or upload screenshots to uncover UI issues, usability problems, and opportunities for improvement
          <br />
          with AI so you can make smarter decisions and build a better product
        </p>
      </div>
      <div className="au-cards">
        {CARDS.map((c) => (
          <div className="au-card" key={c.title}>
            <Icon pieces={c.pieces} dots={c.dots} dotColor={c.dotColor} />
            <div>
              <div className="au-card-title">{c.title}</div>
              <div className="au-card-body">{c.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
