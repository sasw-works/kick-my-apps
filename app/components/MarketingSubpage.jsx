import Link from "next/link";
import { Squircle, ArrowRight } from "lucide-react";

export default function MarketingSubpage({ page }) {
  return (
    <main className="msp-page">
      <style>{`
        .msp-page { max-width: 780px; margin: 0 auto; padding: 160px 24px 100px; }
        .msp-pill {
          display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
          border: 1px solid var(--glass-border); background: var(--glass-bg); border-radius: 999px;
          font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 24px;
        }
        .msp-title { font-size: 48px; line-height: 1.1; font-weight: 400; color: var(--chalk); margin: 0 0 20px; }
        .msp-subtitle { font-size: 19px; line-height: 1.5; color: var(--muted); max-width: 620px; margin: 0 0 56px; }
        .msp-section { padding: 32px 0; border-top: 1px solid var(--ink-3); }
        .msp-section:first-of-type { border-top: 1px solid var(--ink-3); }
        .msp-section-heading { font-size: 20px; font-weight: 600; color: var(--chalk); margin: 0 0 10px; }
        .msp-section-body { font-size: 16px; line-height: 1.7; color: var(--muted); margin: 0; max-width: 620px; }
        .msp-cta {
          display: inline-flex; align-items: center; gap: 8px; margin-top: 56px;
          height: 56px; padding: 0 28px; border-radius: 999px; background: var(--blue-100); color: #fff;
          font-size: 16px; font-weight: 500; text-decoration: none;
        }
        .msp-cta:hover { filter: brightness(1.08); }
        @media (max-width: 640px) {
          .msp-page { padding: 130px 20px 70px; }
          .msp-title { font-size: 34px; }
          .msp-subtitle { font-size: 16px; }
        }
      `}</style>

      <div className="msp-pill">
        <Squircle size={14} />
        {page.pill}
      </div>
      <h1 className="msp-title">{page.title}</h1>
      <p className="msp-subtitle">{page.subtitle}</p>

      {page.sections.map((s) => (
        <div className="msp-section" key={s.heading}>
          <h2 className="msp-section-heading">{s.heading}</h2>
          <p className="msp-section-body">{s.body}</p>
        </div>
      ))}

      <Link href="/" className="msp-cta">
        Try it free
        <ArrowRight size={16} />
      </Link>
    </main>
  );
}
