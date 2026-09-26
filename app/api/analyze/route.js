import { fetchAppStoreReviews, fetchAppStoreListing, computeReviewAnalytics } from "../../lib/reviews";
import { computeLensScores } from "../../lib/lensScores";

export const runtime = "nodejs";

const SCHEMA_INSTRUCTIONS = `You are an experienced mobile UX auditor. Deeply analyze the screenshots and/or
user reviews and/or store listing text you are given, and return ONLY a response in the following JSON
schema. Do not add any other explanation, markdown markers, or leading/trailing text.

IMPORTANT: Write every piece of text you generate in English, no matter what language the input
screenshots, user reviews, or store listing are in. The user reviews you are given may be in Turkish,
German, or any other language -- read and understand them in their original language, but ALL of your
own output (aiSummary, every finding's title/finding/suggestion, topComplaints, roadmap, asoReview
feedback, approvalRisks) must be written in English. Never respond in Turkish or any language other
than English.

{
  "healthScore": <integer 0-100, overall health score>,
  "aiSummary": "<A warm but professional 2-3 sentence summary of the app's overall health, the top 1-2 issues, and roughly what score could be reached if they're fixed. Don't make firm/confident numeric promises; use words like 'roughly', 'likely'.>,
  "findings": [
    {
      "key": "<one of onboarding|cta|contrast|typography|accessibility|permissions|conversion|navigation|empty_states|consistency|loading|copy|trust>",
      "title": "<short English title>",
      "status": "<good|warn|bad>",
      "finding": "<explain the observation concretely in 1-2 sentences, stating what you saw on which screen>",
      "suggestion": "<a concrete, actionable suggestion>",
      "screenshotIndex": <the 1-based index of the screenshot this finding is based on; null if not based on a screenshot>,
      "boundingBox": { "x": <% from the left edge, 0-100>, "y": <% from the top edge, 0-100>, "width": <% width, 0-100>, "height": <% height, 0-100> } or null (fill in only if screenshotIndex is set and you can estimate the issue's location on screen with reasonable confidence),
      "codeSnippet": { "language": "<css|swift|kotlin>", "code": "<a short, illustrative/starter code snippet>" } or null
    }
  ],
  "reviewSummary": {
    "topComplaints": [{ "label": "<short complaint title>", "pct": <estimated percentage, 0-100> }],
    "roadmap": ["<3-4 action suggestions in priority order>"]
  },
  "asoReview": {
    "titleFeedback": "<1-2 sentences on the title's clarity/keyword usage>",
    "descriptionFeedback": "<1-2 sentences on the description text's structure/clarity>",
    "suggestions": ["<1-3 concrete ASO suggestions>"]
  },
  "approvalRisks": [
    { "issue": "<a concrete observed risk>", "guideline": "<the relevant Apple/Google review guideline category, e.g. 'Completeness' or 'Misleading Content'>", "severity": "<high|medium>" }
  ]
}

Category guide (if screenshots were provided, try to evaluate all of them):
- onboarding: length/complexity of the first-use flow
- cta: visibility and clarity of primary action buttons
- contrast: text/background color contrast (WCAG-style)
- typography: clarity of the heading/body/label hierarchy
- accessibility: touch target sizes, readability
- permissions: number and timing of requested permissions (if any)
- conversion (product/business perspective — through a Product Owner's eyes): friction points in the
  checkout/signup flow, whether the value proposition is clear in the first screens, missing/poorly
  placed CTAs, whether there's a visible upsell/premium opportunity, whether an important feature is
  hidden/positioned so it's easy to miss
- navigation: clarity of the bottom/top navigation, risk of the user getting lost
- empty_states: whether empty/error states guide the user
- consistency (design-system health): consistency of the spacing scale across screens, whether buttons
  serving the same function use different styles, whether the icon set follows a single style, whether
  the color palette is a limited, repeating system or used randomly, whether card/component designs
  repeat each other
- loading: whether there's feedback during loading/waiting moments
- copy: clarity/consistency of button and guidance text
- trust (product/business perspective): presence of trust signals (ratings, security badges, social
  proof) and whether they're placed in a way that boosts user motivation

Rules:
- If no screenshots were given, do NOT guess about visual categories — don't add them to the findings list.
- If no review data was given, set the reviewSummary field to null.
- If no store listing text (title/description) was given, set the asoReview field to null.
- Return at least 5, at most 11 findings — be realistic based on the number of images given, don't invent detail.
- Don't inflate scores; give an honest assessment based on the issues you actually see.
- You may extract more than one different-category finding from the same screenshot.
- For conversion/trust/permissions findings, address the business impact (e.g. "this friction could lose
  the user midway through signup") but never give a made-up percentage/number — base it on observation only.
- For consistency findings, compare at least two different screens to give a concrete example of an
  inconsistency (e.g. "the button corner radius on screen 1 differs from screen 4").
- Only fill in codeSnippet for findings that can genuinely be illustrated with a short code snippet, like
  contrast, touch target size, or spacing (leave null for non-code topics like an onboarding flow).
  The code is always a GENERIC/EXAMPLE starting point — you don't have access to the user's actual code —
  don't assume otherwise, just give a short example along the lines of "try an approach like this."
- Your boundingBox estimate should be APPROXIMATE; if unsure, leave it null rather than inventing coordinates.
- approvalRisks: this app is ALREADY live, so this isn't "initial approval" risk — Apple/Google re-review
  on EVERY update and can flag or remove existing apps later too. So frame these as signals that "could
  cause an issue at the next update or a random review." List ONLY concrete, visual-evidence-based risks
  you actually see in the screenshots (e.g. placeholder/lorem ipsum text, an empty/broken-looking screen,
  a half-finished feature, misleading exaggerated claims). If reviews mention a lot of crash/error
  complaints, you can add that as a risk too.
  If there's no concrete evidence, return an empty array — don't invent a risk.
- Final reminder: regardless of the language of the reviews or any other input, every string you write
  in the response (titles, findings, suggestions, summaries, labels) must be in English.`;

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
    parts.push({ text: `Screenshot #${i + 1}:` });
    parts.push({ inline_data: { mime_type: img.mediaType, data: img.base64 } });
  });

  if (reviews?.length) {
    const reviewText = reviews
      .map((r) => `[${r.rating}★${r.version ? ` v${r.version}` : ""}] ${r.title}: ${r.content}`)
      .join("\n---\n")
      .slice(0, 12000);
    parts.push({ text: `User reviews (App Store):\n${reviewText}` });
  }

  if (listing) {
    parts.push({
      text: `Store listing info:\nTitle: ${listing.trackName}\nCategory: ${listing.genre}\nDescription:\n${(listing.description || "").slice(0, 4000)}`,
    });
  }

  // Primary model + a fallback to fall back to under load.
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
            `Model returned malformed/incomplete JSON (likely cut off mid-response): ${parseErr.message}`
          );
        }
      }

      const errText = await res.text();
      lastError = new Error(`Gemini API error: ${res.status} ${errText}`);

      // 503 (overloaded) and 429 (rate limit) are transient errors — wait briefly and retry.
      if (res.status === 503 || res.status === 429) {
        await sleep(attempt * 800);
        continue;
      }

      // Any other kind of error (400, 403, 404, etc.) won't be fixed by retrying — move to the next model.
      break;
    }
  }

  throw lastError;
}

export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "GEMINI_API_KEY is not defined on the server. Add it from the Vercel project settings." },
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
            "Analysis needs at least one screenshot or a valid App Store link (Play Store links are not yet supported).",
        },
        { status: 400 }
      );
    }

    const result = await analyzeWithGemini({ images, reviews, listing });
    result.lensScores = computeLensScores(result.findings);

    if (reviews?.length && result.reviewSummary) {
      const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
      const analytics = computeReviewAnalytics(reviews);

      result.reviewSummary.totalReviews = reviews.length;
      result.reviewSummary.avgRating = Math.round(avgRating * 10) / 10;
      result.reviewSummary.sampleNote =
        "The " + reviews.length + " most recent reviews were sampled (Apple RSS feed limit)";
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
      { error: "An error occurred during analysis: " + (err.message || "unknown error") },
      { status: 500 }
    );
  }
}
