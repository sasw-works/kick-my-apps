import React, { useRef } from "react";
import {
  Store,
  RefreshCw,
  LayoutGrid,
  Sparkles,
  Mail,
  GitCompare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code2,
  ImageIcon,
  History,
  LayoutDashboard,
  Download,
  ShieldQuestion,
  Search,
} from "lucide-react";

const SAMPLE_REVIEWS = [
  { stars: 5, title: "Yeni güncelleme harika!", body: "Her şey çok daha hızlı, arayüz de çok sadeleşmiş.", who: "Ayşe K. · 2 saat önce" },
  { stars: 2, title: "Ödeme ekranı donuyor", body: "Satın alma tamamlanırken uygulama sürekli kilitleniyor.", who: "Mert D. · 5 saat önce" },
  { stars: 4, title: "Karanlık tema gelse keşke", body: "Genel olarak çok iyi, tek eksik karanlık tema.", who: "Zeynep A. · 1 gün önce" },
  { stars: 5, title: "Destek çok hızlı", body: "Yazdım, dakikalar içinde dönüş yaptılar.", who: "Kerem T. · 1 gün önce" },
];

const PRIORITY_ITEMS = [
  { tag: "P1", title: "Giriş ekranında hata", meta: "342 bahsedilme · Yükseliyor ↑", color: "var(--kick)" },
  { tag: "P2", title: "Yavaş ödeme akışı", meta: "218 bahsedilme · Sabit", color: "var(--kick)" },
  { tag: "P3", title: "Karanlık tema eksik", meta: "156 bahsedilme · Yeni", color: "var(--yellow)" },
  { tag: "P4", title: "Müşteri desteği", meta: "96 bahsedilme · Yeni", color: "var(--yellow)" },
];

// Ürünün gerçekten sahip olduğu tüm özellikler — Stripe tarzı renkli ikon kutularıyla.
const ALL_FEATURES = [
  { icon: ImageIcon, title: "Ekran Görüntüsü Analizi", desc: "13 kategori, 4 mercek altında derinlemesine UI/UX incelemesi.", color: "var(--brand)", fill: "#8A7CFF" },
  { icon: Store, title: "Gerçek App Store Yorumları", desc: "Önbellek yok — her analizde canlı veri çekilir.", color: "var(--teal)", fill: "#79D9CC" },
  { icon: Search, title: "ASO / Mağaza İncelemesi", desc: "Başlık, açıklama ve mağaza listelemeni değerlendirir.", color: "var(--yellow)", fill: "#F3C468" },
  { icon: ShieldQuestion, title: "Güncelleme Riski Kontrolü", desc: "Bir sonraki incelemede sorun çıkarabilecek sinyalleri yakalar.", color: "var(--brand)", fill: "#8A7CFF" },
  { icon: Sparkles, title: "Hızlı Kazanımlar", desc: "Yüksek etki, düşük efor gerektiren düzeltmeleri öne çıkarır.", color: "var(--teal)", fill: "#79D9CC" },
  { icon: Code2, title: "Kod Seviyesinde Öneri", desc: "Bazı bulgular için örnek CSS/Swift/Kotlin kod parçacığı.", color: "var(--yellow)", fill: "#F3C468" },
  { icon: ImageIcon, title: "Görsel İşaretleme", desc: "Bulgular, yüklediğin ekran görüntüsü üzerinde işaretlenir.", color: "var(--brand)", fill: "#8A7CFF" },
  { icon: History, title: "Geçmiş & Trend", desc: "Her tarama kaydedilir, skorun zaman içindeki değişimini gör.", color: "var(--teal)", fill: "#79D9CC" },
  { icon: GitCompare, title: "Detaylı Karşılaştırma", desc: "İki taramayı (rakip dahil) kategori kategori kıyasla.", color: "var(--yellow)", fill: "#F3C468" },
  { icon: LayoutDashboard, title: "Uygulamalarım Paneli", desc: "Takip ettiğin tüm uygulamalar tek ekranda.", color: "var(--brand)", fill: "#8A7CFF" },
  { icon: Mail, title: "Haftalık E-posta Özeti", desc: "Yeni yorumların özetini her hafta otomatik al.", color: "var(--teal)", fill: "#79D9CC" },
  { icon: Download, title: "PDF Dışa Aktarma", desc: "Raporu tek tıkla indirip paylaşabilirsin.", color: "var(--yellow)", fill: "#F3C468" },
];

const FAQ = [
  {
    q: "Hangi verileri topluyorsunuz?",
    a: "Sadece herkese açık App Store yorumlarını ve senin yüklediğin ekran görüntülerini analiz ediyoruz. Hiçbir özel/gizli kullanıcı verisine erişmiyoruz.",
  },
  {
    q: "Yorumlar ne kadar taze?",
    a: "Her analizde App Store'dan gerçek zamanlı olarak çekiyoruz — önbellek kullanmıyoruz, her seferinde en güncel yorumları görürsün.",
  },
  {
    q: "Rakip uygulamalarla karşılaştırma yapabilir miyim?",
    a: "Evet — herhangi iki taramayı (kendi uygulaman ve bir rakibi dahil) yan yana karşılaştırabilirsin.",
  },
  {
    q: "Bulgular nasıl önceliklendiriliyor?",
    a: "Her bulgu kritik/dikkat/sorunsuz olarak etiketleniyor ve 'Hızlı Kazanımlar' paneli, yüksek etkili + düşük efor gerektiren maddeleri otomatik öne çıkarıyor.",
  },
  {
    q: "Haftalık özet nasıl çalışır?",
    a: "Bir uygulamayı takip etmeye başladığında, her hafta o uygulamanın yeni App Store yorumlarının özetini e-posta ile alırsın.",
  },
];

function useOnScreen(ref) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

function Reveal({ children, delay = 0 }) {
  const ref = React.useRef(null);
  const visible = useOnScreen(ref);
  return (
    <div ref={ref} className={`mkt-reveal ${visible ? "mkt-reveal-visible" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function zoneColorAt(pct) {
  const stops = [
    { p: 0, h: 6, s: 84, l: 58 },
    { p: 50, h: 37, s: 88, l: 55 },
    { p: 100, h: 175, s: 80, l: 34 },
  ];
  let a = stops[0];
  let b = stops[1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i].p && pct <= stops[i + 1].p) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const t = b.p === a.p ? 0 : (pct - a.p) / (b.p - a.p);
  const h = a.h + (b.h - a.h) * t;
  const s = a.s + (b.s - a.s) * t;
  const l = a.l + (b.l - a.l) * t;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function HeroDial({ targetScore = 82, size = 180 }) {
  const ref = React.useRef(null);
  const visible = useOnScreen(ref);
  const [score, setScore] = React.useState(0);

  React.useEffect(() => {
    if (!visible) return;
    let raf;
    const duration = 1300;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setScore(Math.round(eased * targetScore));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, targetScore]);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR - 14;
  const tickCount = 48;
  const gapDeg = 3.4;
  const rad = (deg) => (deg * Math.PI) / 180;
  const filledTicks = Math.round((score / 100) * tickCount);

  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = (360 / tickCount) * i - 90;
    const a1 = rad(angle + gapDeg / 2);
    const x1 = cx + innerR * Math.cos(a1);
    const y1 = cy + innerR * Math.sin(a1);
    const x2 = cx + outerR * Math.cos(a1);
    const y2 = cy + outerR * Math.sin(a1);
    const isFilled = i < filledTicks;
    const color = isFilled ? zoneColorAt((i / tickCount) * 100) : "var(--ink-3)";
    return (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4} strokeLinecap="round" opacity={isFilled ? 1 : 0.5} />
    );
  });

  return (
    <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {ticks}
      <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "var(--font-display)", fontSize: size * 0.24, fontWeight: 500, fill: "var(--chalk)" }}>
        {score}
      </text>
      <text x={cx} y={cy + size * 0.15} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.13em", fill: "var(--muted)" }}>
        APP HEALTH SCORE
      </text>
    </svg>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="faq-item">
      <button className="faq-q" onClick={() => setOpen(!open)}>
        {q}
        <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

export default function MarketingSections() {
  const carouselRef = useRef(null);
  const scrollCarousel = (dir) => {
    carouselRef.current?.scrollBy({ left: dir * 380, behavior: "smooth" });
  };
  return (
    <div className="mkt-root">
      <style>{`
        .mkt-root { width: 100%; max-width: 1000px; margin: 90px auto 0; font-family: 'Inter', sans-serif; }
        .mkt-reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .mkt-reveal-visible { opacity: 1; transform: translateY(0); }
        .mkt-section-title { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: var(--chalk); text-align: center; margin-bottom: 10px; }
        .mkt-section-sub { font-size: 14px; color: var(--muted); text-align: center; max-width: 480px; margin: 0 auto 40px; }

        .mkt-bento {
          display: grid; grid-template-columns: 1.3fr 1fr 1fr; grid-template-rows: auto auto;
          grid-template-areas: "big mid1 mid1" "big mid2 mid3";
          gap: 16px; margin-bottom: 90px;
        }
        .mkt-bento-big { grid-area: big; display: flex; flex-direction: column; }
        .mkt-bento-mid1 { grid-area: mid1; }
        .mkt-bento-mid2 { grid-area: mid2; }
        .mkt-bento-mid3 { grid-area: mid3; }
        @media (max-width: 780px) {
          .mkt-bento { grid-template-columns: 1fr; grid-template-areas: "big" "mid1" "mid2" "mid3"; }
        }

        .mkt-browser-frame {
          border: 1px solid var(--ink-3); border-radius: 14px; overflow: hidden;
          box-shadow: var(--shadow); margin-bottom: 90px;
        }
        .mkt-browser-topbar {
          display: flex; align-items: center; gap: 14px;
          background: var(--ink-2); border-bottom: 1px solid var(--ink-3); padding: 12px 16px;
        }
        .mkt-browser-dots { display: flex; gap: 7px; }
        .mkt-browser-dots span { width: 11px; height: 11px; border-radius: 50%; display: block; }
        .mkt-browser-url {
          font-family: var(--font-mono); font-size: 11.5px; color: var(--muted);
          background: var(--ink); border-radius: 999px; padding: 5px 14px; flex: 1; max-width: 260px;
        }
        .mkt-preview-card {
          background: var(--ink-2); padding: 28px;
        }
        .mkt-preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .mkt-preview-score { display: flex; align-items: center; gap: 14px; }
        .mkt-preview-score-num { font-family: var(--font-display); font-size: 40px; font-weight: 700; color: var(--teal); }
        .mkt-preview-findings { display: flex; flex-direction: column; gap: 8px; }
        .mkt-preview-row { display: flex; align-items: center; gap: 10px; background: var(--ink); border-radius: 8px; padding: 10px 14px; font-size: 13px; }
        .mkt-preview-row span { flex: 1; color: var(--chalk); }

        .mkt-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 90px; }
        .mkt-feature-card {
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 16px;
          box-shadow: var(--shadow); padding: 26px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .mkt-feature-card:hover { transform: translateY(-3px); border-color: var(--brand); }
        .mkt-feature-icon {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        .mkt-feature-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
        .mkt-feature-desc { font-size: 13.5px; color: var(--muted); line-height: 1.6; margin-bottom: 18px; }

        .mkt-ticker { max-height: 168px; overflow: hidden; -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent); mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent); }
        .mkt-ticker-track { display: flex; flex-direction: column; gap: 8px; animation: ticker-scroll 14s linear infinite; }
        @keyframes ticker-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }

        .mkt-live-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--teal); flex-shrink: 0;
          animation: live-pulse 1.6s ease-in-out infinite;
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(14,165,160,0.4); }
          50% { opacity: 0.5; box-shadow: 0 0 0 4px rgba(14,165,160,0); }
        }

        .mkt-spin-slow { animation: spin-slow 3s linear infinite; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .mkt-tag-pulse { animation: tag-pulse 1.8s ease-in-out infinite; }
        @keyframes tag-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }

        .mkt-bounce { animation: mkt-bounce 2s ease-in-out infinite; }
        @keyframes mkt-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .mkt-pulse-scale { animation: pulse-scale 1.8s ease-in-out infinite; }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }
        .mkt-review-card { background: var(--ink); border-radius: 8px; padding: 10px 12px; }
        .mkt-review-stars { color: var(--yellow); font-size: 11px; margin-bottom: 3px; }
        .mkt-review-title { font-size: 12.5px; font-weight: 600; color: var(--chalk); }
        .mkt-review-body { font-size: 11.5px; color: var(--muted); margin-top: 2px; }

        .mkt-priority-list { display: flex; flex-direction: column; gap: 8px; }
        .mkt-priority-row { display: flex; align-items: center; gap: 10px; background: var(--ink); border-radius: 8px; padding: 8px 12px; }
        .mkt-priority-tag { font-family: var(--font-mono); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
        .mkt-priority-title { font-size: 12.5px; font-weight: 600; color: var(--chalk); flex: 1; }
        .mkt-priority-meta { font-size: 10.5px; color: var(--muted); font-family: var(--font-mono); }

        .mkt-showcase { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 90px; }
        .mkt-showcase-visual {
          background: var(--ink); border-radius: 10px; padding: 20px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-height: 120px;
        }

        .mkt-fullbleed {
          width: 100vw; position: relative; left: 50%; right: 50%;
          margin-left: -50vw; margin-right: -50vw; padding: 0 40px; box-sizing: border-box;
        }
        .mkt-carousel {
          display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory;
          padding-bottom: 8px; margin-bottom: 22px; scrollbar-width: none;
        }
        .mkt-carousel::-webkit-scrollbar { display: none; }
        .mkt-carousel-card {
          position: relative; overflow: hidden;
          flex: 0 0 calc((100% - 40px) / 5); max-width: 400px; height: 365px;
          scroll-snap-align: start;
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 16px;
          box-shadow: var(--shadow);
        }
        @media (max-width: 1400px) {
          .mkt-carousel-card { flex-basis: calc((100% - 30px) / 4); }
        }
        @media (max-width: 1100px) {
          .mkt-carousel-card { flex-basis: calc((100% - 20px) / 3); }
        }
        @media (max-width: 780px) {
          .mkt-carousel-card { flex-basis: calc((100% - 10px) / 2); height: 300px; }
        }
        @media (max-width: 520px) {
          .mkt-carousel-card { flex-basis: 85%; height: 280px; }
        }
        .mkt-carousel-fill {
          position: absolute; left: 0; right: 0; bottom: 0; height: 0;
          background: var(--fill-color); transition: height 0.4s ease; z-index: 0;
        }
        .mkt-carousel-card:hover .mkt-carousel-fill { height: 100%; }
        .mkt-carousel-content { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; padding: 24px; }
        .mkt-carousel-icon {
          width: 36px; height: 36px; border-radius: 10px; margin-bottom: 26px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .mkt-carousel-headline {
          font-size: 19px; font-weight: 500; line-height: 1.35; color: var(--chalk);
          flex: 1; transition: color 0.3s ease;
        }
        .mkt-carousel-card:hover .mkt-carousel-headline { color: #1A1F36; }
        .mkt-carousel-footer {
          font-size: 12.5px; color: var(--muted); margin-top: 20px; transition: color 0.3s ease;
        }
        .mkt-carousel-card:hover .mkt-carousel-footer { color: #1A1F36; opacity: 0.7; }

        .mkt-carousel-nav-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 90px; }
        .mkt-carousel-tagline { font-size: 20px; color: var(--chalk); }
        .mkt-carousel-arrows { display: flex; gap: 8px; }
        .mkt-carousel-arrow {
          width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--ink-3);
          background: var(--ink-2); color: var(--chalk); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: border-color 0.15s ease;
        }
        .mkt-carousel-arrow:hover { border-color: var(--brand); }

        .faq-list { max-width: 640px; margin: 0 auto 90px; display: flex; flex-direction: column; gap: 10px; }
        .faq-item { background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 12px; padding: 4px 20px; transition: border-color 0.2s ease; }
        .faq-item:hover { border-color: var(--brand); }
        .faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          background: none; border: none; cursor: pointer; padding: 16px 0;
          font-size: 14px; font-weight: 600; color: var(--chalk); text-align: left;
        }
        .faq-a { font-size: 13.5px; color: var(--muted); line-height: 1.6; padding-bottom: 16px; }

        @media (max-width: 780px) {
          .mkt-grid-2, .mkt-showcase { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Rapor önizlemesi */}
      <Reveal>
      <div>
        <div className="mkt-section-title">Gerçek raporu keşfet</div>
        <div className="mkt-section-sub">Ekran görüntülerin ve yorumların, tek ve net bir sağlık raporuna dönüşür.</div>
        <div className="mkt-browser-frame">
          <div className="mkt-browser-topbar">
            <div className="mkt-browser-dots">
              <span style={{ background: "#FF5F57" }} />
              <span style={{ background: "#FFBD2E" }} />
              <span style={{ background: "#28C840" }} />
            </div>
            <div className="mkt-browser-url">kickmyapps.com/report</div>
          </div>
          <div className="mkt-preview-card">
            <div className="mkt-preview-header" style={{ justifyContent: "center", marginBottom: 8 }}>
              <HeroDial targetScore={82} size={170} />
            </div>
            <div className="mkt-preview-findings">
              <div className="mkt-preview-row"><CheckCircle2 size={15} color="var(--teal)" /><span>Font hiyerarşisi net ve tutarlı</span></div>
              <div className="mkt-preview-row"><AlertTriangle size={15} color="var(--yellow)" /><span>Onboarding 7 ekran — biraz uzun</span></div>
              <div className="mkt-preview-row"><XCircle size={15} color="var(--kick)" /><span>CTA butonu düşük kontrastta</span></div>
            </div>
          </div>
        </div>
      </div>
      </Reveal>

      {/* Her mağaza tek yerde + Her zaman taze */}
      <Reveal>
      <div>
        <div className="mkt-section-title">Yorumların sana anlattığı her şey</div>
        <div className="mkt-section-sub">Ekran görüntüsü analizi ve gerçek kullanıcı yorumları, aynı raporda buluşuyor.</div>
        <div className="mkt-grid-2">
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "var(--brand)" }}><Store size={18} color="#FFFFFF" /></div>
            <div className="mkt-feature-title">Gerçek App Store verisi</div>
            <div className="mkt-feature-desc">Uydurma değil — herkese açık App Store yorumlarını doğrudan analiz ediyoruz.</div>
            <div className="mkt-priority-row" style={{ justifyContent: "center", gap: 8 }}>
              <span className="mkt-live-dot" />
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>★★★★☆ · 1.240 yorum analiz edildi</span>
            </div>
          </div>
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "var(--teal)" }}><RefreshCw size={18} color="#FFFFFF" className="mkt-spin-slow" /></div>
            <div className="mkt-feature-title">Her zaman taze</div>
            <div className="mkt-feature-desc">Önbellek yok — her analizde yorumlar gerçek zamanlı çekilir.</div>
            <div className="mkt-ticker">
              <div className="mkt-ticker-track">
                {[...SAMPLE_REVIEWS, ...SAMPLE_REVIEWS].map((r, i) => (
                  <div className="mkt-review-card" key={i}>
                    <div className="mkt-review-stars">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
                    <div className="mkt-review-title">{r.title}</div>
                    <div className="mkt-review-body">{r.body} — {r.who}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </Reveal>

      {/* Derinlemesine + Hiçbir şeyi kaçırma — birleşik bento grid */}
      <Reveal>
      <div>
        <div className="mkt-section-title">Derinlemesine, hiçbir şeyi kaçırmadan</div>
        <div className="mkt-section-sub">13 kategori, önceliklendirme, haftalık özet ve rakip karşılaştırması — hepsi bir arada.</div>
        <div className="mkt-bento">
          <div className="mkt-feature-card mkt-bento-big">
            <div className="mkt-feature-icon" style={{ background: "var(--yellow)" }}><LayoutGrid size={18} color="#1A1F36" /></div>
            <div className="mkt-feature-title">13 kategori, 4 mercek</div>
            <div className="mkt-feature-desc">Onboarding'den erişilebilirliğe, her bulgu UI / UX / Erişilebilirlik / Ürün merceklerinden birine bağlanır.</div>
            <div className="mkt-priority-list" style={{ marginTop: "auto" }}>
              <div className="mkt-priority-row"><span style={{ fontSize: 12.5, color: "var(--chalk)", fontWeight: 600, width: 90 }}>UI</span><span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>2 kritik · 1 dikkat</span></div>
              <div className="mkt-priority-row"><span style={{ fontSize: 12.5, color: "var(--chalk)", fontWeight: 600, width: 90 }}>UX</span><span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>1 dikkat</span></div>
              <div className="mkt-priority-row"><span style={{ fontSize: 12.5, color: "var(--chalk)", fontWeight: 600, width: 90 }}>Erişilebilirlik</span><span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Sorunsuz</span></div>
              <div className="mkt-priority-row"><span style={{ fontSize: 12.5, color: "var(--chalk)", fontWeight: 600, width: 90 }}>Ürün</span><span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>1 kritik</span></div>
            </div>
          </div>

          <div className="mkt-feature-card mkt-bento-mid1">
            <div className="mkt-feature-icon" style={{ background: "var(--brand)" }}><Sparkles size={18} color="#FFFFFF" /></div>
            <div className="mkt-feature-title">Etkiye göre önceliklendirilmiş</div>
            <div className="mkt-feature-desc">Hangisini önce düzeltmen gerektiğini, yüksek etki + düşük efor eşleştirmesiyle söylüyoruz.</div>
            <div className="mkt-priority-list">
              {PRIORITY_ITEMS.slice(0, 2).map((p) => (
                <div className="mkt-priority-row" key={p.tag}>
                  <span className={`mkt-priority-tag ${p.color === "var(--kick)" ? "mkt-tag-pulse" : ""}`} style={{ color: p.color, background: "var(--ink-3)" }}>{p.tag}</span>
                  <span className="mkt-priority-title">{p.title}</span>
                  <span className="mkt-priority-meta">{p.meta}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mkt-feature-card mkt-bento-mid2">
            <div className="mkt-feature-icon" style={{ background: "var(--teal)" }}><Mail size={18} color="#FFFFFF" /></div>
            <div className="mkt-feature-title">Haftalık yorum özeti</div>
            <div className="mkt-feature-desc">Yeni yorumların özetini her hafta e-postana alırsın.</div>
            <div className="mkt-showcase-visual">
              <Mail size={20} color="var(--muted)" className="mkt-bounce" />
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Her Pazartesi</span>
            </div>
          </div>

          <div className="mkt-feature-card mkt-bento-mid3">
            <div className="mkt-feature-icon" style={{ background: "var(--yellow)" }}><GitCompare size={18} color="#1A1F36" /></div>
            <div className="mkt-feature-title">Rakiple karşılaştır</div>
            <div className="mkt-feature-desc">Skorlar ve bulgular tek ekranda.</div>
            <div className="mkt-showcase-visual" style={{ flexDirection: "row", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--teal)" }}>78</div>
              </div>
              <GitCompare size={14} color="var(--muted)" className="mkt-pulse-scale" />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--yellow)" }}>61</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </Reveal>

      {/* Tüm özellikler */}
      <Reveal>
      <div className="mkt-fullbleed">
        <div className="mkt-section-title">Artık gerçekten çok şey yapıyor</div>
        <div className="mkt-section-sub">Kick My Apps'te şu an aktif olan tüm özellikler, tek bakışta.</div>
        <div className="mkt-carousel" ref={carouselRef}>
          {ALL_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div className="mkt-carousel-card" key={f.title} style={{ "--fill-color": f.fill }}>
                <div className="mkt-carousel-fill" />
                <div className="mkt-carousel-content">
                  <div className="mkt-carousel-icon" style={{ background: f.color }}>
                    <Icon size={18} color="#FFFFFF" />
                  </div>
                  <div className="mkt-carousel-headline">{f.title}</div>
                  <div className="mkt-carousel-footer">{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mkt-carousel-nav-row">
          <span className="mkt-carousel-tagline">Her kategoride derinlemesine.</span>
          <div className="mkt-carousel-arrows">
            <button className="mkt-carousel-arrow" onClick={() => scrollCarousel(-1)} aria-label="Önceki">
              <ChevronLeft size={16} />
            </button>
            <button className="mkt-carousel-arrow" onClick={() => scrollCarousel(1)} aria-label="Sonraki">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      </Reveal>

      {/* FAQ */}
      <Reveal>
      <div>
        <div className="mkt-section-title">Sorular? Cevaplar.</div>
        <div className="mkt-section-sub">&nbsp;</div>
        <div className="faq-list">
          {FAQ.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
      </Reveal>
    </div>
  );
}
