import { readSecret, errorText } from "./secrets";

// One short plain-text answer from whichever AI provider is configured: Gemini first, then
// OpenRouter as the fallback (the same providers and keys the report analysis uses).
// GEMINI_API_BASE exists so tests can point it at a local stand-in; it defaults to Google.

// images: [{ mediaType, base64 }], each labelled "Image #n" so the prompt can refer to them.
function geminiParts(prompt, images) {
  const parts = [{ text: prompt }];
  images.forEach((img, i) => {
    parts.push({ text: `Image #${i + 1}:` });
    parts.push({ inline_data: { mime_type: img.mediaType, data: img.base64 } });
  });
  return parts;
}

function openRouterContent(prompt, images) {
  if (!images.length) return prompt;
  const content = [{ type: "text", text: prompt }];
  images.forEach((img, i) => {
    content.push({ type: "text", text: `Image #${i + 1}:` });
    content.push({ type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.base64}` } });
  });
  return content;
}

const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];

async function viaGemini(prompt, { images = [], json = false, maxTokens = 600 } = {}) {
  const base = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
  let lastErr;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`${base}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": readSecret("GEMINI_API_KEY") },
        body: JSON.stringify({
          contents: [{ parts: geminiParts(prompt, images) }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: json ? 0.3 : 0.6, ...(json ? { responseMimeType: "application/json" } : {}) },
        }),
        signal: AbortSignal.timeout(images.length ? 45000 : 20000),
      });
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (!text.trim()) throw new Error("Gemini returned no text");
      return text;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function viaOpenRouter(prompt, { images = [], maxTokens = 600 } = {}) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${readSecret("OPENROUTER_API_KEY")}` },
    body: JSON.stringify({ model: "openrouter/free", messages: [{ role: "user", content: openRouterContent(prompt, images) }], max_tokens: maxTokens }),
    signal: AbortSignal.timeout(images.length ? 50000 : 25000),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!String(text).trim()) throw new Error("OpenRouter returned no text");
  return String(text);
}

export function aiConfigured() {
  return Boolean(readSecret("GEMINI_API_KEY") || readSecret("OPENROUTER_API_KEY"));
}

// options: { images, json, maxTokens }. With no options it behaves exactly as before (short text).
export async function generateText(prompt, options = {}) {
  const hasGemini = Boolean(readSecret("GEMINI_API_KEY"));
  const hasOpenRouter = Boolean(readSecret("OPENROUTER_API_KEY"));
  if (!hasGemini && !hasOpenRouter) throw new Error("MISSING_KEYS");
  if (hasGemini) {
    try {
      return await viaGemini(prompt, options);
    } catch (err) {
      if (!hasOpenRouter) throw err;
      console.error("Gemini failed for a text draft, trying OpenRouter:", errorText(err, 500));
    }
  }
  return viaOpenRouter(prompt, options);
}
