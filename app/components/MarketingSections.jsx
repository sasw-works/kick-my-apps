import React, { useRef } from "react";
import {
  Store,
  RefreshCw,
  LayoutGrid,
  Sparkles,
  Mail,
  GitCompare,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
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

function StoreRibbonIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M34.61 11.28C34.3252 10.8117 33.8975 10.4471 33.39 10.24L8.53999 0.200004C8.14817 0.0402949 7.72299 -0.0202062 7.30218 0.0238719C6.88137 0.0679501 6.47795 0.215244 6.12773 0.452678C5.77752 0.690111 5.49134 1.01034 5.29461 1.38493C5.09788 1.75953 4.99668 2.1769 4.99999 2.6V15C4.99999 16.05 5.63999 17 6.60999 17.4L13.05 20L34.61 28.72C34.87 28.32 35.01 27.84 35 27.36V12.64C35 12.16 34.87 11.68 34.61 11.27V11.28Z" fill="url(#paint0_linear_1_96)" />
      <path d="M34.63 11.28L13.06 20L6.60999 22.6C6.13272 22.7936 5.72434 23.1257 5.43741 23.5534C5.15048 23.9811 4.99813 24.485 4.99999 25V37.42C5.00076 37.8414 5.10474 38.2562 5.30283 38.6281C5.50092 39 5.78709 39.3178 6.13633 39.5535C6.48558 39.7893 6.88726 39.936 7.30627 39.9807C7.72528 40.0254 8.14886 39.9668 8.53999 39.81L33.4 29.76C33.9 29.55 34.33 29.19 34.61 28.72C34.87 28.31 35.01 27.84 35 27.36V12.64C35 12.16 34.88 11.69 34.63 11.28Z" fill="#9966FF" />
      <path d="M34.62 11.28L34.72 11.45C34.9 11.82 35 12.22 35 12.64V12.61V27.36C35 27.84 34.87 28.31 34.61 28.72L13.06 20L34.62 11.28Z" fill="url(#paint1_linear_1_96)" />
      <defs>
        <linearGradient id="paint0_linear_1_96" x1="20" y1="4.13" x2="20" y2="21.13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#11EFE3" />
          <stop offset="1" stopColor="#21CFE0" />
        </linearGradient>
        <linearGradient id="paint1_linear_1_96" x1="35" y1="11.28" x2="35" y2="28.72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0048E5" />
          <stop offset="1" stopColor="#9B66FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NotebookIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_1_106)">
        <path d="M36.98 14.05L30.67 15.41L9.33 20L1.98 21.58C1.41738 21.7034 0.914018 22.0159 0.55375 22.4653C0.193481 22.9147 -0.00195139 23.474 -7.97581e-07 24.05V37.47C-7.97581e-07 38.87 1.12 40 2.5 40H37.5C38.88 40 40 38.87 40 37.47V16.53C40 15.76 39.66 15.04 39.07 14.56C38.7814 14.3253 38.4438 14.1584 38.082 14.0719C37.7202 13.9853 37.3436 13.9813 36.98 14.06V14.05Z" fill="#9B66FF" />
        <path d="M28.59 1.47283e-05H11.58C11.2464 -0.00527969 10.9151 0.0551894 10.6049 0.177968C10.2947 0.300747 10.0117 0.483431 9.77214 0.715586C9.53256 0.94774 9.34106 1.22482 9.20857 1.53099C9.07608 1.83717 9.00521 2.16645 9 2.50001V27.5C9 28.88 10.15 30 11.58 30H28.42C28.7536 30.0053 29.0849 29.9448 29.3951 29.8221C29.7053 29.6993 29.9883 29.5166 30.2279 29.2844C30.4674 29.0523 30.6589 28.7752 30.7914 28.469C30.9239 28.1629 30.9948 27.8336 31 27.5V2.50001C31.0004 1.85228 30.7494 1.22966 30.2999 0.763322C29.8503 0.296984 29.2373 0.0233332 28.59 1.47283e-05Z" fill="url(#paint0_linear_1_106)" />
        <path d="M31 15.34V27.5C31 28.88 29.85 30 28.42 30H11.58C11.2464 30.0053 10.9151 29.9448 10.6049 29.822C10.2947 29.6993 10.0117 29.5166 9.77214 29.2844C9.53256 29.0523 9.34106 28.7752 9.20857 28.469C9.07608 28.1628 9.00521 27.8336 9 27.5V20.07L9.33 20L30.67 15.41L31 15.34Z" fill="url(#paint1_linear_1_106)" />
      </g>
      <defs>
        <linearGradient id="paint0_linear_1_106" x1="20" y1="1.97001" x2="20" y2="17.6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#11EFE3" />
          <stop offset="0.33" stopColor="#15E8E2" />
          <stop offset="0.74" stopColor="#1FD3E0" />
          <stop offset="1" stopColor="#21CFE0" />
        </linearGradient>
        <linearGradient id="paint1_linear_1_106" x1="31" y1="22.67" x2="5.34" y2="22.67" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0048E5" />
          <stop offset="0.64" stopColor="#625AF5" />
          <stop offset="1" stopColor="#8A62FC" />
        </linearGradient>
        <clipPath id="clip0_1_106">
          <rect width="40" height="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function PieCardIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_1_98)">
        <path d="M26 2.46C26 1.1 24.9 0 23.53 0H2.46999C1.81664 -5.35452e-06 1.1899 0.258853 0.726967 0.719907C0.264038 1.18096 0.0026396 1.80665 -5.56895e-06 2.46V32.54C-0.0011603 32.9515 0.100909 33.3566 0.296859 33.7184C0.492809 34.0802 0.776379 34.3871 1.12161 34.611C1.46685 34.8348 1.86272 34.9685 2.27299 34.9998C2.68325 35.0311 3.09482 34.9589 3.46999 34.79L13.67 30.26L24.53 25.43C25.43 25.03 26 24.16 26 23.18V2.46Z" fill="url(#paint0_linear_1_98)" />
        <path d="M26.5 39C30.0804 39 33.5142 37.5777 36.0459 35.0459C38.5777 32.5142 40 29.0804 40 25.5C40 21.9196 38.5777 18.4858 36.0459 15.9541C33.5142 13.4223 30.0804 12 26.5 12C22.9196 12 19.4858 13.4223 16.9541 15.9541C14.4223 18.4858 13 21.9196 13 25.5C13 29.0804 14.4223 32.5142 16.9541 35.0459C19.4858 37.5777 22.9196 39 26.5 39Z" fill="#00D924" />
        <path d="M26 12V23.18C26 24.16 25.43 25.04 24.53 25.43L13.83 30.19C13.0864 28.1871 12.8288 26.0362 13.0783 23.9143C13.3279 21.7924 14.0775 19.76 15.2656 17.9843C16.4536 16.2086 18.0462 14.7402 19.9123 13.6998C21.7785 12.6595 23.8649 12.0769 26 12Z" fill="url(#paint1_linear_1_98)" />
      </g>
      <defs>
        <linearGradient id="paint0_linear_1_98" x1="13" y1="6.35" x2="13" y2="35.03" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD748" />
          <stop offset="1" stopColor="#FFC148" />
        </linearGradient>
        <linearGradient id="paint1_linear_1_98" x1="19.5" y1="12.01" x2="19.5" y2="30.19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00A600" />
          <stop offset="1" stopColor="#00D924" />
        </linearGradient>
        <clipPath id="clip0_1_98">
          <rect width="40" height="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function BagIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.9 5.93C14.1045 5.11166 14.5708 4.38254 15.2279 3.85363C15.885 3.32471 16.6969 3.02496 17.54 3H37.53C39.19 3 40.25 4.31 39.91 5.93L33.71 35.04C33.5757 35.5841 33.2679 36.0697 32.833 36.4234C32.3982 36.777 31.8601 36.9794 31.3 37H7.32001L13.9 5.93Z" fill="url(#paint0_linear_1_103)" />
      <path d="M0.100001 21.93C-0.239999 20.31 0.820001 19 2.48 19H22.47C23.3097 19.0292 24.117 19.3309 24.7701 19.8595C25.4231 20.3881 25.8864 21.1149 26.09 21.93L28.88 35.04C29.0143 35.5841 29.3221 36.0697 29.757 36.4234C30.1918 36.777 30.7299 36.9794 31.29 37H5.31C4.21 37 3.12 36.12 2.89 35.04L0.100001 21.94V21.93Z" fill="#9A66FF" />
      <path d="M31.3 37C30.19 37 29.1 36.12 28.88 35.04L26.09 21.94C25.8883 21.123 25.4258 20.394 24.7726 19.8635C24.1193 19.333 23.311 19.0298 22.47 19H11.14L7.33 37H31.29H31.3Z" fill="url(#paint1_linear_1_103)" />
      <defs>
        <linearGradient id="paint0_linear_1_103" x1="23.65" y1="2.99" x2="23.65" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF5091" />
          <stop offset="1" stopColor="#E03071" />
        </linearGradient>
        <linearGradient id="paint1_linear_1_103" x1="19.31" y1="19" x2="19.31" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6E00F5" />
          <stop offset="1" stopColor="#9860FE" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="faq-row">
      <button className="faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className={`faq-toggle ${open ? "faq-toggle-open" : ""}`}>
          {open ? <X size={16} color="#FFFFFF" /> : <Plus size={16} color="var(--muted)" />}
        </span>
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}

export default function MarketingSections() {
  const carouselRef = useRef(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollStart: 0, moved: false });

  const scrollCarousel = (dir) => {
    carouselRef.current?.scrollBy({ left: dir * 380, behavior: "smooth" });
  };

  const onDragStart = (e) => {
    const el = carouselRef.current;
    if (!el) return;
    dragState.current = { isDown: true, startX: e.pageX, scrollStart: el.scrollLeft, moved: false };
    el.classList.add("mkt-carousel-dragging");
  };
  const onDragMove = (e) => {
    const el = carouselRef.current;
    if (!el || !dragState.current.isDown) return;
    const dx = e.pageX - dragState.current.startX;
    if (Math.abs(dx) > 4) dragState.current.moved = true;
    el.scrollLeft = dragState.current.scrollStart - dx;
  };
  const endDrag = () => {
    const el = carouselRef.current;
    dragState.current.isDown = false;
    el?.classList.remove("mkt-carousel-dragging");
  };
  return (
    <div className="mkt-root">
      <style>{`
        .mkt-root { width: 100%; max-width: 1000px; margin: 90px auto 0; font-family: 'Inter', sans-serif; }
        .mkt-section-title { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: var(--chalk); text-align: center; margin-bottom: 10px; }
        .mkt-section-sub { font-size: 14px; color: var(--muted); text-align: center; max-width: 480px; margin: 0 auto 40px; }
        .mkt-title-card {
          background: var(--ink);
          border-radius: 20px;
          padding: 24px 32px;
          margin: 0 auto 40px;
          width: fit-content;
          max-width: 90%;
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
          cursor: grab;
        }
        .mkt-carousel::-webkit-scrollbar { display: none; }
        .mkt-carousel-dragging { cursor: grabbing; scroll-snap-type: none; user-select: none; }
        .mkt-carousel-dragging * { pointer-events: none; }
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

        .faq-eyebrow { font-size: 13.5px; color: var(--muted); text-align: center; margin-bottom: 8px; }
        .faq-list { max-width: 720px; margin: 0 auto 40px; border-top: 1px solid var(--ink-3); }
        .faq-row { border-bottom: 1px solid var(--ink-3); }
        .faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px;
          background: none; border: none; cursor: pointer; padding: 26px 4px;
          font-size: 19px; color: var(--chalk); text-align: left;
        }
        .faq-toggle {
          width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--ink-3); transition: background 0.2s ease;
        }
        .faq-toggle-open { background: var(--brand); }
        .faq-a { font-size: 14.5px; color: var(--muted); line-height: 1.7; padding: 0 4px 26px; max-width: 560px; }
        .faq-support-btn {
          display: block; margin: 0 auto; background: var(--brand); color: #FFFFFF;
          font-weight: 600; font-size: 14.5px; padding: 13px 28px; border-radius: 999px; border: none; cursor: default;
        }

        @media (max-width: 780px) {
          .mkt-grid-2, .mkt-showcase { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Rapor önizlemesi */}
      <div>
        <div className="mkt-title-card">
          <div className="mkt-section-title" style={{ marginBottom: 8 }}>Gerçek raporu keşfet</div>
          <div className="mkt-section-sub" style={{ marginBottom: 0 }}>Ekran görüntülerin ve yorumların, tek ve net bir sağlık raporuna dönüşür.</div>
        </div>
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
            <div className="mkt-preview-header">
              <div className="mkt-preview-score">
                <div className="mkt-preview-score-num">82</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>APP HEALTH SCORE</div>
              </div>
            </div>
            <div className="mkt-preview-findings">
              <div className="mkt-preview-row"><CheckCircle2 size={15} color="var(--teal)" /><span>Font hiyerarşisi net ve tutarlı</span></div>
              <div className="mkt-preview-row"><AlertTriangle size={15} color="var(--yellow)" /><span>Onboarding 7 ekran — biraz uzun</span></div>
              <div className="mkt-preview-row"><XCircle size={15} color="var(--kick)" /><span>CTA butonu düşük kontrastta</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Her mağaza tek yerde + Her zaman taze */}
      <div>
        <div className="mkt-section-title">Yorumların sana anlattığı her şey</div>
        <div className="mkt-section-sub">Ekran görüntüsü analizi ve gerçek kullanıcı yorumları, aynı raporda buluşuyor.</div>
        <div className="mkt-grid-2">
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "transparent" }}><StoreRibbonIcon size={36} /></div>
            <div className="mkt-feature-title">Gerçek App Store verisi</div>
            <div className="mkt-feature-desc">Uydurma değil — herkese açık App Store yorumlarını doğrudan analiz ediyoruz.</div>
            <div className="mkt-priority-row" style={{ justifyContent: "center", gap: 8 }}>
              <span className="mkt-live-dot" />
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>★★★★☆ · 1.240 yorum analiz edildi</span>
            </div>
          </div>
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "transparent" }}><img src="/icon-refresh.png" alt="" className="mkt-spin-slow" style={{ width: 36, height: 36 }} /></div>
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

      {/* 13 kategori + Hızlı Kazanımlar */}
      <div>
        <div className="mkt-section-title">Derinlemesine, ama dağınık değil</div>
        <div className="mkt-section-sub">13 kategori altında toplanan bulgular, tek bakışta önceliklendirilir.</div>
        <div className="mkt-grid-2">
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "var(--yellow)" }}><LayoutGrid size={18} color="#1A1F36" /></div>
            <div className="mkt-feature-title">13 kategori, 4 mercek</div>
            <div className="mkt-feature-desc">Onboarding'den erişilebilirliğe, her bulgu UI / UX / Erişilebilirlik / Ürün merceklerinden birine bağlanır.</div>
            <div className="mkt-priority-row"><span style={{ fontSize: 12.5, color: "var(--chalk)", fontWeight: 600 }}>UI</span><span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>2 kritik · 1 dikkat</span></div>
          </div>
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "transparent" }}><NotebookIcon size={36} /></div>
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
        </div>
      </div>

      {/* Haftalık özet + Compare */}
      <div>
        <div className="mkt-section-title">Hiçbir şeyi kaçırma</div>
        <div className="mkt-section-sub">Haftalık özetler ve rakip karşılaştırmasıyla, sürekli takipte kal.</div>
        <div className="mkt-showcase">
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "transparent" }}><PieCardIcon size={36} /></div>
            <div className="mkt-feature-title">Haftalık yorum özeti</div>
            <div className="mkt-feature-desc">Takip ettiğin bir uygulamanın yeni yorumlarının özetini her hafta e-postana alırsın.</div>
            <div className="mkt-showcase-visual">
              <Mail size={22} color="var(--muted)" className="mkt-bounce" />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Her Pazartesi, otomatik</span>
            </div>
          </div>
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "transparent" }}><BagIcon size={36} /></div>
            <div className="mkt-feature-title">Rakiple karşılaştır</div>
            <div className="mkt-feature-desc">Kendi uygulamanı bir rakiple yan yana koy — skorlar ve bulgular tek ekranda.</div>
            <div className="mkt-showcase-visual" style={{ flexDirection: "row", gap: 24 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--teal)" }}>78</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>Sen</div>
              </div>
              <GitCompare size={16} color="var(--muted)" className="mkt-pulse-scale" />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--yellow)" }}>61</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>Rakip</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tüm özellikler */}
      <div className="mkt-fullbleed">
        <div className="mkt-section-title">Artık gerçekten çok şey yapıyor</div>
        <div className="mkt-section-sub">Kick My Apps'te şu an aktif olan tüm özellikler, tek bakışta.</div>
        <div
          className="mkt-carousel"
          ref={carouselRef}
          onMouseDown={onDragStart}
          onMouseMove={onDragMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
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

      {/* FAQ */}
      <div>
        <div className="faq-eyebrow">Sorularını yanıtlamaktan mutluluk duyarız</div>
        <div className="mkt-section-title" style={{ fontSize: 34 }}>Sık sorulan sorular</div>
        <div className="mkt-section-sub">&nbsp;</div>
        <div className="faq-list">
          {FAQ.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
        <button className="faq-support-btn">Destek Sayfası</button>
      </div>
    </div>
  );
}
