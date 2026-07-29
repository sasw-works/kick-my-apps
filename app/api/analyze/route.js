export const runtime = "nodejs";

// Apple's public RSS review feed — no auth needed, real data.
// (Play Store has no equivalent public feed; that's a known v1 gap, see README.)
async function fetchAppStoreReviews(storeUrl) {
  const idMatch = storeUrl.match(/id(\d+)/);
  if (!idMatch) return null;
  const appId = idMatch[1];
  const countryMatch = storeUrl.match(/apps\.apple\.com\/([a-z]{2})\//i);
  const country = countryMatch ? countryMatch[1] : "us";

  const rssUrl = `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/sortby=mostrecent/json`;
  const res = await fetch(rssUrl);
  if (!res.ok) return null;

  const data = await res.json();
  const entries = data?.feed?.entry;
  if (!entries || !Array.isArray(entries)) return null;

  return entries
    .filter((e) => e.content?.label)
    .slice(0, 50)
    .map((e) => ({
      rating: Number(e["im:rating"]?.label ?? 0),
      title: e.title?.label ?? "",
      content: e.content?.label ?? "",
      version: e["im:version"]?.label ?? null,
      helpfulVotes: Number(e["im:voteSum"]?.label ?? 0),
    }));
}

// ---------------------------------------------------------------------------
// Deterministic review analytics — computed from real data, not the model,
// so these numbers are always exactly accurate (no AI arithmetic/hallucination).
// ---------------------------------------------------------------------------
function computeReviewAnalytics(reviews) {
  const ratingDistribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const negativeReviews = reviews.filter((r) => r.rating <= 2);
  const mostHelpfulNegative = negativeReviews.length
    ? negativeReviews.reduce((best, r) => (r.helpfulVotes > (best?.helpfulVotes ?? -1) ? r : best), null)
    : null;

  // Sürüme göre grupla, en az 2 farklı sürüm varsa trend hesapla.
  const byVersion = {};
  for (const r of reviews) {
    if (!r.version) continue;
    if (!byVersion[r.version]) byVersion[r.version] = [];
    byVersion[r.version].push(r.rating);
  }
  const versions = Object.keys(byVersion);
  let versionTrend = null;
  if (versions.length >= 2) {
    const avgByVersion = versions
      .map((v) => ({
        version: v,
        avg: byVersion[v].reduce((a, b) => a + b, 0) / byVersion[v].length,
        count: byVersion[v].length,
      }))
      .filter((v) => v.count >= 2);
    if (avgByVersion.length >= 2) {
      versionTrend = avgByVersion.slice(0, 4);
    }
  }

  return { ratingDistribution, mostHelpfulNegative, versionTrend };
}

const SCHEMA_INSTRUCTIONS = `Sen deneyimli bir mobil UX denetçisisin. Sana verilen ekran görüntülerini ve/veya
kullanıcı yorumlarını DERİNLEMESİNE analiz et ve SADECE aşağıdaki JSON şemasında bir cevap döndür.
Başka hiçbir açıklama, markdown işareti veya ön/art metin ekleme.

{
  "healthScore": <0-100 arası tam sayı, genel sağlık skoru>,
  "findings": [
    {
      "key": "<onboarding|cta|contrast|typography|accessibility|permissions|conversion|navigation|empty_states|consistency|loading|copy|trust içinden biri>",
      "title": "<Türkçe kısa başlık>",
      "status": "<good|warn|bad>",
      "finding": "<gözlemi 1-2 cümlede somut şekilde açıkla, hangi ekranda ne gördüğünü belirt>",
      "suggestion": "<somut, uygulanabilir bir öneri>",
      "screenshotIndex": <bu bulgunun dayandığı ekran görüntüsünün sırası, 1'den başlar; ekran görüntüsüne dayanmıyorsa null>
    }
  ],
  "reviewSummary": {
    "topComplaints": [{ "label": "<kısa şikayet başlığı>", "pct": <0-100 arası tahmini yüzde> }],
    "roadmap": ["<öncelik sırasına göre 3-4 aksiyon önerisi>"]
  }
}

Kategori rehberi (ekran görüntüsü verildiyse hepsini değerlendirmeye çalış):
- onboarding: ilk kullanım akışının uzunluğu/karmaşıklığı
- cta: birincil aksiyon butonlarının görünürlüğü ve netliği
- contrast: metin/arka plan renk kontrastı (WCAG mantığıyla)
- typography: başlık/gövde/etiket hiyerarşisinin netliği
- accessibility: dokunma alanı boyutları, okunabilirlik
- permissions: istenen izinlerin sayısı ve zamanlaması (varsa)
- conversion: ödeme/kayıt gibi kritik akışlarda sürtünme noktaları
- navigation: alt/üst navigasyonun netliği, kullanıcının kaybolma riski
- empty_states: boş/hata durumlarının kullanıcıya yol gösterip göstermediği
- consistency: ekranlar arası görsel tutarlılık (boşluk, ikon stili, renk kullanımı)
- loading: yükleme/bekleme anlarında geri bildirim olup olmadığı
- copy: buton ve yönlendirme metinlerinin netliği/tutarlılığı
- trust: güven sinyalleri (değerlendirme, güvenlik rozeti, sosyal kanıt) varlığı

Kurallar:
- Ekran görüntüsü verilmediyse görsel kategoriler hakkında tahmin YAPMA, findings listesine ekleme.
- Yorum verisi verilmediyse reviewSummary alanını null yap.
- En az 5, en fazla 11 finding döndür — verilen görsel sayısına göre gerçekçi ol, uydurma detay ekleme.
- Skorları abartma; gerçekten gördüğün sorunlara göre dürüst bir değerlendirme yap.
- Aynı ekran görüntüsünden birden fazla farklı kategori bulgusu çıkarabilirsin.`;

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

async function analyzeWithGemini({ images, reviews }) {
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
    if (storeUrl) {
      try {
        reviews = await fetchAppStoreReviews(storeUrl);
      } catch {
        reviews = null;
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

    const result = await analyzeWithGemini({ images, reviews });

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

    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Analiz sırasında bir hata oluştu: " + (err.message || "bilinmeyen hata") },
      { status: 500 }
    );
  }
}
