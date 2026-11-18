import { readSecret, errorText } from "./secrets";

// One short plain-text answer from whichever AI provider is configured: Gemini first, then
// OpenRouter as the fallback (the same providers and keys the report analysis uses).
// GEMINI_API_BASE exists so tests can point it at a local stand-in; it defaults to Google.

const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];

async function viaGemini(prompt) {
  const base = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
  let lastErr;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`${base}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": readSecret("GEMINI_API_KEY") },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.6 },
        }),
        signal: AbortSignal.timeout(20000),
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

async function viaOpenRouter(prompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${readSecret("OPENROUTER_API_KEY")}` },
    body: JSON.stringify({ model: "openrouter/free", messages: [{ role: "user", content: prompt }], max_tokens: 600 }),
    signal: AbortSignal.timeout(25000),
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

export async function generateText(prompt) {
  const hasGemini = Boolean(readSecret("GEMINI_API_KEY"));
  const hasOpenRouter = Boolean(readSecret("OPENROUTER_API_KEY"));
  if (!hasGemini && !hasOpenRouter) throw new Error("MISSING_KEYS");
  if (hasGemini) {
    try {
      return await viaGemini(prompt);
    } catch (err) {
      if (!hasOpenRouter) throw err;
      console.error("Gemini failed for a text draft, trying OpenRouter:", errorText(err, 500));
    }
  }
  return viaOpenRouter(prompt);
}
