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
    }));
}

const SCHEMA_INSTRUCTIONS = `Sen bir mobil UX denetçisisin. Sana verilen ekran görüntülerini ve/veya kullanıcı
yorumlarını analiz et ve SADECE aşağıdaki JSON şemasında bir cevap döndür. Başka hiçbir açıklama,
markdown işareti veya ön/art metin ekleme.

{
  "healthScore": <0-100 arası tam sayı, genel sağlık skoru>,
  "findings": [
    {
      "key": "<onboarding|cta|contrast|typography|accessibility|permissions|conversion içinden biri>",
      "title": "<Türkçe kısa başlık>",
      "status": "<good|warn|bad>",
      "finding": "<gözlemi 1 cümlede açıkla>",
      "suggestion": "<somut, uygulanabilir bir öneri>"
    }
  ],
  "reviewSummary": {
    "topComplaints": [{ "label": "<kısa şikayet başlığı>", "pct": <0-100 arası tahmini yüzde> }],
    "roadmap": ["<öncelik sırasına göre 3 aksiyon önerisi>"]
  }
}

Kurallar:
- Ekran görüntüsü verilmediyse görsel kategoriler (cta, contrast, typography, accessibility) hakkında tahmin YAPMA, findings listesine ekleme.
- Yorum verisi verilmediyse reviewSummary alanını null yap.
- En az 3, en fazla 7 finding döndür.
- Skorları abartma; gerçekten gördüğün sorunlara göre dürüst bir değerlendirme yap.`;

async function analyzeWithGemini({ images, reviews }) {
  const parts = [{ text: SCHEMA_INSTRUCTIONS }];

  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mediaType, data: img.base64 } });
  }

  if (reviews?.length) {
    const reviewText = reviews
      .map((r) => `[${r.rating}★] ${r.title}: ${r.content}`)
      .join("\n---\n")
      .slice(0, 12000);
    parts.push({ text: `Kullanıcı yorumları (App Store):\n${reviewText}` });
  }

  const model = "gemini-2.5-flash";
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
          maxOutputTokens: 2000,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API hatası: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
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
      const avgRating =
        reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
      result.reviewSummary.totalReviews = reviews.length;
      result.reviewSummary.avgRating = Math.round(avgRating * 10) / 10;
      result.reviewSummary.sampleNote =
        "En son " + reviews.length + " yorum örneklendi (Apple RSS feed limiti)";
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
