import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  Sparkles,
  Layers,
  MousePointerClick,
  MessageSquare,
  TrendingUp,
  Download,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Layers,
    title: "Onboarding & Erişilebilirlik",
    desc: "Ekran görüntülerini yükle, AI onboarding uzunluğunu, dokunma alanlarını ve daha fazlasını denetlesin.",
  },
  {
    icon: MousePointerClick,
    title: "CTA & Dönüşüm Analizi",
    desc: "Buton görünürlüğü, renk kontrastı ve dönüşüm kaybına yol açan ekranlar otomatik tespit edilir.",
  },
  {
    icon: MessageSquare,
    title: "App Store Yorum Analizi",
    desc: "Gerçek kullanıcı yorumların taranır, en çok şikayet edilen konular ve önerilen roadmap çıkarılır.",
  },
  {
    icon: TrendingUp,
    title: "Geçmiş & Trend Takibi",
    desc: "Her tarama kaydedilir — uygulamanın sağlık skorunun zaman içindeki değişimini gör.",
  },
  {
    icon: Download,
    title: "PDF Rapor",
    desc: "Bulguları tek tıkla dışa aktar, ekibinle veya müşterinle paylaş.",
  },
  {
    icon: Sparkles,
    title: "AI App Health Score",
    desc: "Tüm bulgular tek bir skor altında birleşir — uygulamanın genel sağlığını bir bakışta gör.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);
  return (
    <div className="landing-root">
      <style>{`
        .landing-root {
          --ink: #14151a;
          --ink-2: #1c1e26;
          --ink-3: #24262f;
          --chalk: #f5f3ee;
          --muted: #8a8f9c;
          --kick: #ff4a32;
          --yellow: #ffc93c;
          --teal: #2dd4bf;
          --font-display: 'Anton', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;

          background: var(--ink);
          color: var(--chalk);
          font-family: var(--font-body);
          min-height: 100vh;
        }
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 32px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .nav-logo { font-family: var(--font-display); font-size: 20px; }
        .nav-logo span { color: var(--kick); }
        .nav-link {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--chalk);
          border: 1px solid var(--ink-3);
          padding: 9px 16px;
          border-radius: 8px;
          text-decoration: none;
          transition: border-color 0.15s ease;
        }
        .nav-link:hover { border-color: var(--muted); }

        .hero {
          max-width: 780px;
          margin: 0 auto;
          text-align: center;
          padding: 80px 24px 60px;
        }
        .hero-kicker {
          font-family: var(--font-mono);
          font-size: 11.5px;
          letter-spacing: 0.16em;
          color: var(--yellow);
          margin-bottom: 18px;
        }
        .hero-title {
          font-family: var(--font-display);
          font-size: 52px;
          line-height: 1.05;
          margin-bottom: 20px;
        }
        .hero-title span { color: var(--kick); }
        .hero-sub {
          font-size: 16px;
          color: var(--muted);
          max-width: 540px;
          margin: 0 auto 32px;
          line-height: 1.6;
        }
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--kick);
          color: var(--ink);
          font-weight: 700;
          font-size: 15px;
          padding: 15px 26px;
          border-radius: 10px;
          text-decoration: none;
        }
        .cta-hint {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--muted);
          margin-top: 14px;
        }

        .feature-grid {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px 24px 100px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .feature-card {
          background: var(--ink-2);
          border: 1px solid var(--ink-3);
          border-radius: 14px;
          padding: 22px 20px;
        }
        .feature-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: var(--ink-3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .feature-title { font-size: 14.5px; font-weight: 600; margin-bottom: 6px; }
        .feature-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }

        @media (max-width: 720px) {
          .hero-title { font-size: 36px; }
          .feature-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav className="nav">
        <div className="nav-logo">
          KICK MY APPS<span>.</span>
        </div>
        {isSignedIn ? (
          <Link href="/app" className="nav-link">
            Panele Git
          </Link>
        ) : (
          <Link href="/sign-in" className="nav-link">
            Sign In
          </Link>
        )}
      </nav>

      <section className="hero">
        <div className="hero-kicker">AI DESTEKLİ MOBİL UYGULAMA SAĞLIK RAPORU</div>
        <h1 className="hero-title">
          Uygulamanı yayınlamadan önce <span>kick</span> at.
        </h1>
        <p className="hero-sub">
          Ekran görüntülerini yükle veya App Store linkini yapıştır. AI; onboarding, kontrast, CTA
          görünürlüğü, erişilebilirlik ve kullanıcı yorumlarını analiz edip sana somut, uygulanabilir
          bir rapor çıkarsın.
        </p>

        {isSignedIn ? (
          <Link href="/app" className="cta-btn">
            Panele Git
            <ArrowRight size={17} />
          </Link>
        ) : (
          <Link href="/sign-up" className="cta-btn">
            Get Started
            <ArrowRight size={17} />
          </Link>
        )}

        <div className="cta-hint">Kredi kartı gerekmiyor · İlk analiz ücretsiz</div>
      </section>

      <section className="feature-grid">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">
                <Icon size={17} color="var(--yellow)" strokeWidth={2.2} />
              </div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
