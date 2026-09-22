"use client";

// Figma "__FAQ" 4158:582 — headline, 5-row accordion (one row expanded), Support Page CTA below.
// Questions are the template's placeholder cookie-consent copy — swap for real FAQ content later.

import { useState } from "react";

const ROWS = [
  { q: "Audit your website", a: null },
  { q: "Automatically categorize cookies and trackers", a: null },
  { q: "Easily configure the consent experience", a: null },
  {
    q: "Enable cookie auto-blocking to ensure compliance",
    a: "Use no-code cookie blocking, tag manager integrations, or script re-writing to block trackers until explicit consent is gained. Enable support for industry frameworks and vendor-specific opt-outs.",
  },
  { q: "Automate scanning and maintain records", a: null },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(3);

  return (
    <section className="kma-faq" aria-label="Frequently asked questions">
      <style>{`
        .kma-faq {
          width: 100%;
          max-width: 1170px;
          margin: 90px auto 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 46px;
        }
        .faq-headline { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
        .faq-title { margin: 0; font-size: 42px; line-height: 57.6px; font-weight: 400; color: #ffffff; max-width: 724px; }
        .faq-sub { margin: 0; font-size: var(--fs-18); line-height: 28px; font-weight: 400; color: #dedede; }

        .faq-list { width: 100%; border-top: 1px solid #484848; }
        .faq-row { border-bottom: 1px solid #484848; }
        .faq-row-head {
          width: 100%;
          padding: 40px 0;
          background: none;
          border: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          cursor: pointer;
          text-align: left;
        }
        .faq-q { margin: 0; font-family: var(--font-inter), sans-serif; font-size: 30px; line-height: 46px; font-weight: 400; color: #ffffff; }
        .faq-toggle { position: relative; flex-shrink: 0; width: 70px; height: 70px; border-radius: 999px; background: #262626; border: 1px solid #484848; }
        .faq-toggle span, .faq-toggle span::before {
          position: absolute; top: 50%; left: 50%; width: 15.4px; height: 2px; border-radius: 1px;
          background: #ffffff; transform: translate(-50%, -50%); transition: transform 0.2s ease, background 0.2s ease;
        }
        .faq-toggle span::before { content: ""; transform: translate(-50%, -50%) rotate(90deg); }
        .faq-row-open .faq-toggle { background: var(--blue-100); border-color: var(--blue-100); }
        .faq-row-open .faq-toggle span { transform: translate(-50%, -50%) rotate(45deg); }
        .faq-row-open .faq-toggle span::before { transform: translate(-50%, -50%) rotate(-45deg); }

        .faq-body-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.25s ease; }
        .faq-row-open .faq-body-wrap { grid-template-rows: 1fr; }
        .faq-body-inner { overflow: hidden; }
        .faq-a { margin: 0 0 40px; max-width: 848px; font-family: var(--font-inter), sans-serif; font-size: var(--fs-18); line-height: 28px; font-weight: 400; color: #dedede; }

        .faq-cta {
          height: 55px;
          padding: 0 40px;
          border-radius: 50px;
          border: none;
          background: var(--blue-100);
          color: #ffffff;
          font-family: var(--font-inter), sans-serif;
          font-size: 20px;
          font-weight: 500;
          line-height: 32px;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .faq-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }

        @media (max-width: 720px) {
          .faq-title { font-size: 32px; line-height: 1.25; }
          .faq-q { font-size: 22px; line-height: 1.35; }
          .faq-row-head { padding: 28px 0; gap: 16px; }
          .faq-toggle { width: 48px; height: 48px; }
        }
      `}</style>
      <div className="faq-headline">
        <h2 className="faq-title">Frequently asked questions</h2>
        <p className="faq-sub">We&rsquo;re happy to answer your questions</p>
      </div>

      <div className="faq-list">
        {ROWS.map((row, i) => {
          const open = i === openIndex;
          return (
            <div className={`faq-row${open ? " faq-row-open" : ""}`} key={row.q}>
              <button
                type="button"
                className="faq-row-head"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? -1 : i)}
              >
                <h3 className="faq-q">{row.q}</h3>
                <span className="faq-toggle" aria-hidden="true">
                  <span />
                </span>
              </button>
              <div className="faq-body-wrap">
                <div className="faq-body-inner">{row.a && <p className="faq-a">{row.a}</p>}</div>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="faq-cta">
        Support Page
      </button>
    </section>
  );
}
