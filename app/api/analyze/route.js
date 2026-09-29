import { fetchAppStoreReviews, fetchAppStoreListing, computeReviewAnalytics } from "../../lib/reviews";
import { computeLensScores } from "../../lib/lensScores";
import { getCurrentUser, unauthorized } from "../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../lib/rateLimit";
import { readSecret, errorText } from "../../lib/secrets";
import { reportsLimit } from "../../lib/plans";
import { countReportsThisMonth } from "../../lib/usage";

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
        "x-goog-api-key": readSecret("GEMINI_API_KEY"),
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

// Builds the shared prompt pieces (instructions + screenshots + reviews + listing) once,
// then each provider's function converts them into that provider's own request shape.
function buildPromptPieces({ images, reviews, listing }) {
  const textBlocks = [SCHEMA_INSTRUCTIONS];

  if (reviews?.length) {
    const reviewText = reviews
      .map((r) => `[${r.rating}★${r.version ? ` v${r.version}` : ""}] ${r.title}: ${r.content}`)
      .join("\n---\n")
      .slice(0, 12000);
    textBlocks.push(`User reviews (App Store):\n${reviewText}`);
  }

  if (listing) {
    textBlocks.push(
      `Store listing info:\nTitle: ${listing.trackName}\nCategory: ${listing.genre}\nDescription:\n${(listing.description || "").slice(0, 4000)}`
    );
  }

  return { textBlocks, images };
}

async function analyzeWithGemini({ images, reviews, listing }) {
  if (!readSecret("GEMINI_API_KEY")) throw new Error("GEMINI_API_KEY not set");

  const { textBlocks } = buildPromptPieces({ images, reviews, listing });
  const parts = [{ text: textBlocks.join("\n\n") }];

  images.forEach((img, i) => {
    parts.push({ text: `Screenshot #${i + 1}:` });
    parts.push({ inline_data: { mime_type: img.mediaType, data: img.base64 } });
  });

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

// Fallback provider: used only if every Gemini attempt above failed (key missing, quota,
// outage, etc.). OpenRouter aggregates many underlying model providers behind one API/key,
// so this is a genuinely different failure domain from Google's — not just a second model
// on the same platform. "openrouter/free" is OpenRouter's own auto-router: it picks among
// the currently-available free models that support vision + structured JSON output, so we
// don't have to hardcode one specific free model that might get deprecated or rate-limited.
async function callOpenRouterModel(model, textPrompt, images) {
  const content = [{ type: "text", text: textPrompt }];
  images.forEach((img, i) => {
    content.push({ type: "text", text: `Screenshot #${i + 1}:` });
    content.push({ type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.base64}` } });
  });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${readSecret("OPENROUTER_API_KEY")}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
      max_tokens: 8192,
    }),
  });
  return res;
}

async function analyzeWithOpenRouter({ images, reviews, listing }) {
  if (!readSecret("OPENROUTER_API_KEY")) throw new Error("OPENROUTER_API_KEY not set");

  const { textBlocks } = buildPromptPieces({ images, reviews, listing });
  const textPrompt = textBlocks.join("\n\n");

  const modelsToTry = ["openrouter/free"];
  const maxAttemptsPerModel = 4; // the auto-router picks a different underlying model each call, so
  // a few extra attempts meaningfully raise the odds of landing on one that actually follows
  // the JSON+vision instructions, rather than an unrelated model (observed in real testing).

  let lastError;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      const res = await callOpenRouterModel(model, textPrompt, images);

      if (res.ok) {
        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content ?? "{}";
        const cleaned = raw.replace(/```json|```/g, "").trim();
        try {
          const parsed = JSON.parse(cleaned);
          // Sanity check: the auto-router occasionally lands on a model that ignores the
          // JSON instruction entirely (e.g. a safety/moderation model unrelated to the task).
          // Treat that the same as a transient failure and retry -- a fresh call may route
          // to a different, capable model.
          if (parsed && typeof parsed === "object" && ("healthScore" in parsed || "findings" in parsed)) {
            return parsed;
          }
          lastError = new Error(
            `OpenRouter model (${data?.model || "unknown"}) returned a JSON response that doesn't match the expected schema`
          );
        } catch (parseErr) {
          lastError = new Error(
            `OpenRouter model returned malformed/incomplete JSON (likely cut off mid-response, or routed to a non-compliant model): ${parseErr.message}`
          );
        }
        await sleep(attempt * 500);
        continue;
      }

      const errText = await res.text();
      lastError = new Error(`OpenRouter API error: ${res.status} ${errText}`);

      if (res.status === 503 || res.status === 429) {
        await sleep(attempt * 800);
        continue;
      }
      break;
    }
  }

  throw lastError;
}

// Tries Gemini first (primary, already-proven provider), and only reaches for OpenRouter
// -- a different provider on a different platform -- if every Gemini attempt failed. This
// keeps the service answering even during a full Gemini-side outage or an invalid/expired key.
async function analyzeApp({ images, reviews, listing }) {
  const hasGemini = !!readSecret("GEMINI_API_KEY");
  const hasOpenRouter = !!readSecret("OPENROUTER_API_KEY");

  if (!hasGemini && !hasOpenRouter) {
    throw new Error("MISSING_KEYS");
  }

  if (hasGemini) {
    try {
      const result = await analyzeWithGemini({ images, reviews, listing });
      return { result, provider: "gemini" };
    } catch (geminiErr) {
      if (!hasOpenRouter) throw geminiErr;
      console.error("Gemini failed, falling back to OpenRouter:", errorText(geminiErr, 1000));
      const result = await analyzeWithOpenRouter({ images, reviews, listing });
      return { result, provider: "openrouter" };
    }
  }

  const result = await analyzeWithOpenRouter({ images, reviews, listing });
  return { result, provider: "openrouter" };
}

export async function POST(req) {
  let user = null;
  try {
    // Signed-in users only. Checked first, before anything else, so an anonymous caller can't
    // burn AI quota and doesn't even learn how the server is configured.
    user = await getCurrentUser();
    if (!user) return unauthorized();

    // Abuse guard: each analysis spends AI quota, and sign-up is free and instant. Generous
    // enough that normal use never notices; the plan limit below is the real per-billing-month cap.
    for (const [key, opts] of [
      [`analyze:hour:${user.id}`, { limit: 15, windowSeconds: 3600 }],
      [`analyze:day:${user.id}`, { limit: 40, windowSeconds: 86400 }],
    ]) {
      const r = await rateLimit(key, opts);
      if (!r.allowed) return tooManyRequests(r);
    }

    // Plan limit, checked before the AI is ever called (so a blocked analysis doesn't burn quota).
    // Counts scans actually saved this calendar month -- an analysis that fails after this point
    // doesn't count against the limit, only a completed, saved report does.
    const limit = reportsLimit(user);
    if (limit !== null) {
      const used = await countReportsThisMonth(user.email);
      if (used >= limit) {
        return Response.json(
          {
            error: `You've used all ${limit} reports included in your plan this month. It resets on the 1st, or you can upgrade for more.`,
            code: "PLAN_LIMIT",
          },
          { status: 403 }
        );
      }
    }

    if (!readSecret("GEMINI_API_KEY") && !readSecret("OPENROUTER_API_KEY")) {
      console.error("Analysis unavailable: neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set.");
      return analysisFailure(user, "No AI provider key is configured (GEMINI_API_KEY / OPENROUTER_API_KEY).");
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

    if (images.length === 0 && !reviews && !listing) {
      return Response.json(
        {
          error:
            "Analysis needs at least one screenshot or a valid App Store link (Play Store links are not yet supported).",
        },
        { status: 400 }
      );
    }

    const { result, provider } = await analyzeApp({ images, reviews, listing });
    result.lensScores = computeLensScores(result.findings);
    result._provider = provider;
    console.log(`Analysis via ${provider}: ${result.findings?.length ?? 0} findings, ${images.length} images, ${reviews?.length ?? 0} reviews`);

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
    // Log it (redacted -- logs get screenshotted and shared too), but never send raw error text to
    // the browser: provider and runtime errors can contain request headers, i.e. API keys. That
    // is exactly how a malformed OPENROUTER_API_KEY once showed the key on screen.
    console.error("Analysis failed:", errorText(err, 1000));
    return analysisFailure(user, errorText(err));
  }
}

// What a visitor sees when analysis fails. Admins additionally get the (redacted) reason, so the
// person who can fix it doesn't have to dig through logs.
function analysisFailure(user, detail) {
  const base = "We couldn't complete the analysis right now. Please try again in a few minutes.";
  return Response.json(
    { error: user?.isAdmin ? `${base} [admin detail: ${detail}]` : base, code: "ANALYSIS_FAILED" },
    { status: 500 }
  );
}
