import { fetchAppStoreReviews, fetchAppStoreListing, computeReviewAnalytics } from "../../lib/reviews";

export const runtime = "nodejs";

const SCHEMA_INSTRUCTIONS = `Sen deneyimli bir mobil UX denetçisisin. Sana verilen ekran görüntülerini ve/veya
kullanıcı yorumlarını ve/veya mağaza listeleme metnini DERİNLEMESİNE analiz et ve SADECE aşağıdaki JSON
şemasında bir cevap döndür. Başka hiçbir açıklama, markdown işareti veya ön/art metin ekleme.

{
  "healthScore": <0-100 arası tam sayı, genel sağlık skoru>,
  "findings": [
    {
      "key": "<onboarding|cta|contrast|typography|accessibility|permissions|conversion|navigation|empty_states|consistency|loading|copy|trust içinden biri>",
      "title": "<Türkçe kısa başlık>",
      "status": "<good|warn|bad>",
      "finding": "<gözlemi 1-2 cümlede somut şekilde açıkla, hangi ekranda ne gördüğünü belirt>",
      "suggestion": "<somut, uygulanabilir bir öneri>",
      "screenshotIndex": <bu bulgunun dayandığı ekran görüntüsünün sırası, 1'den başlar; ekran görüntüsüne dayanmıyorsa null>,
      "boundingBox": { "x": <sol kenardan % olarak, 0-100>, "y": <üst kenardan % olarak, 0-100>, "width": <genişlik %, 0-100>, "height": <yükseklik %, 0-100> } veya null (sadece screenshotIndex doluysa ve sorunun ekrandaki yerini makul bir güvenle tahmin edebiliyorsan doldur),
      "codeSnippet": { "language": "<css|swift|kotlin>", "code": "<kısa, örnek/başlangıç niteliğinde kod>" } veya null
    }
  ],
  "reviewSummary": {
    "topComplaints": [{ "label": "<kısa şikayet başlığı>", "pct": <0-100 arası tahmini yüzde> }],
    "roadmap": ["<öncelik sırasına göre 3-4 aksiyon önerisi>"]
  },
  "asoReview": {
    "titleFeedback": "<başlığın netliği/anahtar kelime kullanımı hakkında 1-2 cümle>",
    "descriptionFeedback": "<açıklama metninin yapısı/netliği hakkında 1-2 cümle>",
    "suggestions": ["<1-3 somut ASO önerisi>"]
  },
  "approvalRisks": [
    { "issue": "<gözlemlenen somut risk>", "guideline": "<ilgili Apple/Google inceleme kuralı kategorisi, örn. 'Eksiksizlik' veya 'Yanıltıcı İçerik'>", "severity": "<high|medium>" }
  ]
}

Kategori rehberi (ekran görüntüsü verildiyse hepsini değerlendirmeye çalış):
- onboarding: ilk kullanım akışının uzunluğu/karmaşıklığı
- cta: birincil aksiyon butonlarının görünürlüğü ve netliği
- contrast: metin/arka plan renk kontrastı (WCAG mantığıyla)
- typography: başlık/gövde/etiket hiyerarşisinin netliği
- accessibility: dokunma alanı boyutları, okunabilirlik
- permissions: istenen izinlerin sayısı ve zamanlaması (varsa)
- conversion (ürün/iş bakışı — Product Owner gözüyle): ödeme/kayıt akışındaki sürtünme noktaları,
  değer önerisinin ilk ekranlarda net olup olmadığı, eksik/zayıf yerleştirilmiş CTA'lar, üst satışa
  (upsell/premium) dair bir fırsat görülüp görülmediği, önemli bir özelliğin gözden kaçacak kadar
  gizli/görünmez konumlandırılmış olması
- navigation: alt/üst navigasyonun netliği, kullanıcının kaybolma riski
- empty_states: boş/hata durumlarının kullanıcıya yol gösterip göstermediği
- consistency (tasarım sistemi sağlığı): ekranlar arası boşluk/spacing skalasının tutarlılığı, aynı işlevi
  gören butonların farklı stillerde olup olmadığı, ikon setinin tek bir tarzda olup olmadığı, renk
  paletinin sınırlı ve tekrar eden bir sistem mi yoksa rastgele mi kullanıldığı, kart/bileşen
  tasarımlarının birbirini tekrar edip etmediği
- loading: yükleme/bekleme anlarında geri bildirim olup olmadığı
- copy: buton ve yönlendirme metinlerinin netliği/tutarlılığı
- trust (ürün/iş bakışı): güven sinyalleri (değerlendirme, güvenlik rozeti, sosyal kanıt) varlığı ve
  bunların kullanıcı motivasyonunu artıracak şekilde yerleştirilip yerleştirilmediği

Kurallar:
- Ekran görüntüsü verilmediyse görsel kategoriler hakkında tahmin YAPMA, findings listesine ekleme.
- Yorum verisi verilmediyse reviewSummary alanını null yap.
- Mağaza listeleme metni (başlık/açıklama) verilmediyse asoReview alanını null yap.
- En az 5, en fazla 11 finding döndür — verilen görsel sayısına göre gerçekçi ol, uydurma detay ekleme.
- Skorları abartma; gerçekten gördüğün sorunlara göre dürüst bir değerlendirme yap.
- Aynı ekran görüntüsünden birden fazla farklı kategori bulgusu çıkarabilirsin.
- conversion/trust/permissions bulgularında iş etkisine değin (ör. "bu sürtünme kullanıcıyı kayıt
  akışının ortasında kaybettirebilir") ama asla uydurma yüzde/rakam verme — sadece gözleme dayan.
- consistency bulgularında en az iki farklı ekranı karşılaştırarak somut bir tutarsızlık örneği ver
  (ör. "1. ekrandaki buton köşe yarıçapı 4. ekrandakinden farklı").
- codeSnippet SADECE kontrast, dokunma alanı boyutu, boşluk/spacing gibi gerçekten kısa bir kod
  parçasıyla örneklenebilecek bulgular için doldur (onboarding akışı gibi kod-dışı konularda null bırak).
  Kod her zaman GENEL/ÖRNEK bir başlangıç noktasıdır, kullanıcının gerçek koduna erişimin yok — bunu
  varsayma, sadece "böyle bir yaklaşım dene" niteliğinde kısa bir örnek ver.
- boundingBox tahminin YAKLAŞIK olmalı; emin değilsen null bırak, uydurma koordinat verme.
- approvalRisks: SADECE ekran görüntülerinde gerçekten gördüğün somut, görsel kanıta dayalı riskleri
  listele (ör. placeholder/lorem ipsum metin, boş/kırık görünen ekran, yarım kalmış özellik, yanıltıcı
  abartılı iddialar). Yorumlarda çökme/hata şikayeti yoğunsa bunu da bir risk olarak ekleyebilirsin.
  Hiçbir somut kanıt yoksa boş dizi döndür — riski UYDURMA.`;

async function callGeminiModel(model, parts) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      }),
    }
  );
  return res;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function analyzeWithGemini({ images, reviews, listing }) {
  const parts = [{ text: SCHEMA_INSTRUCTIONS }];

  images.forEach((img, i) => {
    parts.push({ text: `Ekran görüntüsü #${i + 1}:` });
    parts.push({ inline_data: { mime_type: img.mediaType, data: img.base64 } });
  });

  if (reviews?.length) {
    const reviewText = reviews
      .map((r) => `[${r.rating}★${r.version ? ` v${r.version}` : ""}] ${r.title}: ${r.content}`)
      .join("\n---\n")
      .slice(0, 12000);
    parts.push({ text: `Kullanıcı yorumları (App Store):\n${reviewText}` });
  }

  if (listing) {
    parts.push({
      text: `Mağaza listeleme bilgisi:\nBaşlık: ${listing.trackName}\nKategori: ${listing.genre}\nAçıklama:\n${(listing.description || "").slice(0, 4000)}`,
    });
  }

  // Ana model + yoğunluk anında düşülecek yedek model.
  const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];
  const maxAttemptsPerModel = 2;

  let lastError;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      const res = await callGeminiModel(model, parts);

      if (res.ok) {
        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
        const cleaned = raw.replace(/```json|```/g, "").trim();
        try {
          return JSON.parse(cleaned);
        } catch (parseErr) {
          throw new Error(
            `Model cevabı bozuk/eksik JSON döndürdü (muhtemelen yarıda kesildi): ${parseErr.message}`
          );
        }
      }

      const errText = await res.text();
      lastError = new Error(`Gemini API hatası: ${res.status} ${errText}`);

      // 503 (yoğunluk) ve 429 (rate limit) geçici hatalardır — kısa bekleyip tekrar dene.
      if (res.status === 503 || res.status === 429) {
        await sleep(attempt * 800);
        continue;
      }

      // Başka türde bir hata (400, 403, 404 vb.) tekrar denemekle düzelmez, sıradaki modele geç.
      break;
    }
  }

  throw lastError;
}

export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Sunucuda GEMINI_API_KEY tanımlı değil. Vercel proje ayarlarından ekle." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("files");
    const storeUrl = (formData.get("storeUrl") || "").toString().trim();

    const images = [];
    for (const file of files) {
      if (typeof file === "string") continue;
      const buf = Buffer.from(await file.arrayBuffer());
      images.push({ mediaType: file.type || "image/png", base64: buf.toString("base64") });
    }

    let reviews = null;
    let listing = null;
    if (storeUrl) {
      try {
        reviews = await fetchAppStoreReviews(storeUrl);
      } catch {
        reviews = null;
      }
      try {
        listing = await fetchAppStoreListing(storeUrl);
      } catch {
        listing = null;
      }
    }

    if (images.length === 0 && !reviews) {
      return Response.json(
        {
          error:
            "Analiz için en az bir ekran görüntüsü veya geçerli bir App Store linki gerekiyor (Play Store linkleri henüz desteklenmiyor).",
        },
        { status: 400 }
      );
    }

    const result = await analyzeWithGemini({ images, reviews, listing });

    if (reviews?.length && result.reviewSummary) {
      const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
      const analytics = computeReviewAnalytics(reviews);

      result.reviewSummary.totalReviews = reviews.length;
      result.reviewSummary.avgRating = Math.round(avgRating * 10) / 10;
      result.reviewSummary.sampleNote =
        "En son " + reviews.length + " yorum örneklendi (Apple RSS feed limiti)";
      result.reviewSummary.ratingDistribution = analytics.ratingDistribution;
      result.reviewSummary.mostHelpfulNegative = analytics.mostHelpfulNegative;
      result.reviewSummary.versionTrend = analytics.versionTrend;
    }

    if (listing && result.asoReview) {
      result.asoReview.trackName = listing.trackName;
      result.asoReview.genre = listing.genre;
      result.asoReview.screenshotCount = listing.screenshotCount;
      result.asoReview.version = listing.version;
      result.asoReview.storeAvgRating = listing.averageRating;
      result.asoReview.storeRatingCount = listing.ratingCount;
    }

    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Analiz sırasında bir hata oluştu: " + (err.message || "bilinmeyen hata") },
      { status: 500 }
    );
  }
}
