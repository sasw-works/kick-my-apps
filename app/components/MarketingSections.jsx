import React from "react";
import {
  Store,
  RefreshCw,
  LayoutGrid,
  Sparkles,
  Mail,
  GitCompare,
  ChevronDown,
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
  { icon: ImageIcon, title: "Ekran Görüntüsü Analizi", desc: "13 kategori, 4 mercek altında derinlemesine UI/UX incelemesi.", color: "var(--brand)" },
  { icon: Store, title: "Gerçek App Store Yorumları", desc: "Önbellek yok — her analizde canlı veri çekilir.", color: "var(--teal)" },
  { icon: Search, title: "ASO / Mağaza İncelemesi", desc: "Başlık, açıklama ve mağaza listelemeni değerlendirir.", color: "var(--yellow)" },
  { icon: ShieldQuestion, title: "Güncelleme Riski Kontrolü", desc: "Bir sonraki incelemede sorun çıkarabilecek sinyalleri yakalar.", color: "var(--brand)" },
  { icon: Sparkles, title: "Hızlı Kazanımlar", desc: "Yüksek etki, düşük efor gerektiren düzeltmeleri öne çıkarır.", color: "var(--teal)" },
  { icon: Code2, title: "Kod Seviyesinde Öneri", desc: "Bazı bulgular için örnek CSS/Swift/Kotlin kod parçacığı.", color: "var(--yellow)" },
  { icon: ImageIcon, title: "Görsel İşaretleme", desc: "Bulgular, yüklediğin ekran görüntüsü üzerinde işaretlenir.", color: "var(--brand)" },
  { icon: History, title: "Geçmiş & Trend", desc: "Her tarama kaydedilir, skorun zaman içindeki değişimini gör.", color: "var(--teal)" },
  { icon: GitCompare, title: "Detaylı Karşılaştırma", desc: "İki taramayı (rakip dahil) kategori kategori kıyasla.", color: "var(--yellow)" },
  { icon: LayoutDashboard, title: "Uygulamalarım Paneli", desc: "Takip ettiğin tüm uygulamalar tek ekranda.", color: "var(--brand)" },
  { icon: Mail, title: "Haftalık E-posta Özeti", desc: "Yeni yorumların özetini her hafta otomatik al.", color: "var(--teal)" },
  { icon: Download, title: "PDF Dışa Aktarma", desc: "Raporu tek tıkla indirip paylaşabilirsin.", color: "var(--yellow)" },
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
  return (
    <div className="mkt-root">
      <style>{`
        .mkt-root { width: 100%; max-width: 1000px; margin: 90px auto 0; font-family: 'Inter', sans-serif; }
        .mkt-section-title { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: var(--chalk); text-align: center; margin-bottom: 10px; }
        .mkt-section-sub { font-size: 14px; color: var(--muted); text-align: center; max-width: 480px; margin: 0 auto 40px; }

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

        .mkt-all-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 90px; }
        .mkt-all-card {
          background: var(--ink-2); border: 1px solid var(--ink-3);
          border-radius: 14px; padding: 20px; box-shadow: var(--shadow);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .mkt-all-card:hover { transform: translateY(-3px); border-color: var(--brand); }
        .mkt-all-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .mkt-all-desc { font-size: 12.5px; color: var(--muted); line-height: 1.5; }

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
          .mkt-all-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Rapor önizlemesi */}
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
        </div>
      </div>

      {/* Haftalık özet + Compare */}
      <div>
        <div className="mkt-section-title">Hiçbir şeyi kaçırma</div>
        <div className="mkt-section-sub">Haftalık özetler ve rakip karşılaştırmasıyla, sürekli takipte kal.</div>
        <div className="mkt-showcase">
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "var(--teal)" }}><Mail size={18} color="#FFFFFF" /></div>
            <div className="mkt-feature-title">Haftalık yorum özeti</div>
            <div className="mkt-feature-desc">Takip ettiğin bir uygulamanın yeni yorumlarının özetini her hafta e-postana alırsın.</div>
            <div className="mkt-showcase-visual">
              <Mail size={22} color="var(--muted)" className="mkt-bounce" />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Her Pazartesi, otomatik</span>
            </div>
          </div>
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "var(--yellow)" }}><GitCompare size={18} color="#1A1F36" /></div>
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
      <div>
        <div className="mkt-section-title">Artık gerçekten çok şey yapıyor</div>
        <div className="mkt-section-sub">Kick My Apps'te şu an aktif olan tüm özellikler, tek bakışta.</div>
        <div className="mkt-all-grid">
          {ALL_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div className="mkt-all-card" key={f.title}>
                <div style={{ width: 34, height: 34, borderRadius: 9, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", background: f.color }}>
                  <Icon size={17} color="#FFFFFF" />
                </div>
                <div className="mkt-all-title">{f.title}</div>
                <div className="mkt-all-desc">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="mkt-section-title">Sorular? Cevaplar.</div>
        <div className="mkt-section-sub">&nbsp;</div>
        <div className="faq-list">
          {FAQ.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </div>
  );
}
