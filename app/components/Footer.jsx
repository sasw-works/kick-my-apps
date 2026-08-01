import React from "react";
import Link from "next/link";
import LogoMark from "./LogoMark";

const COLUMNS = [
  {
    title: "ÜRÜN",
    links: [
      { label: "Ekran Analizi" },
      { label: "Duygu Analizi" },
      { label: "Uygulamalarım", href: "/dashboard" },
      { label: "Karşılaştırma" },
      { label: "Geçmiş Analizlerim", href: "/history" },
    ],
  },
  {
    title: "KAYNAKLAR",
    links: [{ label: "App Store" }, { label: "Play Store (yakında)" }],
  },
  {
    title: "KULLANIM ALANLARI",
    links: [{ label: "Ürün Yöneticileri" }, { label: "Bağımsız Geliştiriciler" }, { label: "Küçük Ekipler" }],
  },
  {
    title: "ŞİRKET",
    links: [{ label: "Fiyatlandırma" }, { label: "Blog" }, { label: "Hakkımızda" }, { label: "İletişim" }],
  },
];

const LEGAL_LINKS = ["Gizlilik", "Şartlar", "Güvenlik", "Çerezler"];

export default function Footer() {
  return (
    <footer className="kma-footer">
      <style>{`
        .kma-footer {
          background: var(--ink);
          font-family: 'Inter', sans-serif;
          border-top: 1px solid var(--ink-3);
          margin-top: 40px;
          padding: 48px 24px 24px;
        }
        .kma-footer-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .kma-footer-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr;
          gap: 24px;
          padding-bottom: 32px;
        }
        .kma-footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 15px;
          color: var(--chalk);
          letter-spacing: -0.01em;
          margin-bottom: 12px;
        }
        .kma-footer-mark {
          display: flex;
          align-items: center;
          color: var(--chalk);
        }
        .kma-footer-desc {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.6;
          max-width: 240px;
        }
        .kma-footer-coltitle {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--muted);
          margin-bottom: 14px;
        }
        .kma-footer-link {
          display: block;
          font-size: 13.5px;
          color: var(--chalk);
          margin-bottom: 11px;
          cursor: default;
          user-select: none;
          text-decoration: none;
        }
        .kma-footer-link-real:hover { color: var(--brand); cursor: pointer; }
        .kma-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          border-top: 1px solid var(--ink-3);
          padding-top: 20px;
          font-size: 12.5px;
          color: var(--muted);
        }
        .kma-footer-legal { display: flex; gap: 18px; }
        .kma-footer-legal span { cursor: default; user-select: none; }

        @media (max-width: 780px) {
          .kma-footer-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="kma-footer-inner">
        <div className="kma-footer-grid">
          <div>
            <div className="kma-footer-brand">
              <div className="kma-footer-mark">
                <LogoMark size={41} />
              </div>
            </div>
            <p className="kma-footer-desc">
              Herkese açık App Store ve Play Store yorumlarını, net ve önceliklendirilmiş bir
              geri bildirim raporuna dönüştürür.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="kma-footer-coltitle">{col.title}</div>
              {col.links.map((link) =>
                link.href ? (
                  <Link href={link.href} className="kma-footer-link kma-footer-link-real" key={link.label}>
                    {link.label}
                  </Link>
                ) : (
                  <span className="kma-footer-link" key={link.label}>
                    {link.label}
                  </span>
                )
              )}
            </div>
          ))}
        </div>

        <div className="kma-footer-bottom">
          <span>© 2026 Kick My Apps. Tüm hakları saklıdır.</span>
          <div className="kma-footer-legal">
            {LEGAL_LINKS.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
