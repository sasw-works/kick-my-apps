import Link from "next/link";

export const metadata = { title: "Page not found — Kick My Apps" };

export default function NotFound() {
  return (
    <main className="notfound-page">
      <style>{`
        .notfound-page {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 96px 24px 120px;
          font-family: var(--font-inter), sans-serif;
        }
        .notfound-code {
          font-size: 96px;
          line-height: 1;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--chalk);
          margin: 0 0 8px;
        }
        .notfound-title { font-size: 22px; font-weight: 600; color: var(--chalk); margin: 0 0 10px; }
        .notfound-sub { font-size: 16px; color: var(--muted); max-width: 420px; margin: 0 0 32px; line-height: 1.6; }
        .notfound-cta {
          display: inline-flex; align-items: center; justify-content: center;
          height: 48px; padding: 0 28px; border-radius: 999px;
          background: var(--brand); color: #fff; font-size: 15px; font-weight: 600;
          text-decoration: none; transition: filter 0.2s ease, transform 0.2s ease;
        }
        .notfound-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }
      `}</style>
      <div className="notfound-code">404</div>
      <div className="notfound-title">This page doesn&apos;t exist</div>
      <p className="notfound-sub">
        The link might be broken, or the page may have moved. Let&apos;s get you back on track.
      </p>
      <Link href="/" className="notfound-cta">
        Back to home
      </Link>
    </main>
  );
}
