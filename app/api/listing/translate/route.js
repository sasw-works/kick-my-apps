import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";
import { aiConfigured, generateText } from "../../../lib/textModel";
import { languageName, fieldsToTranslate, buildPrompt, parseTranslation } from "../../../lib/listingTranslate";
import { STORES } from "../../../lib/submissionCheck";

export const runtime = "nodejs";

// POST { store, language, fields } -> { fields, over }. Nothing is stored.
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    let body;
    try { body = await req.json(); } catch { body = null; }
    const store = body?.store;
    const language = languageName(body?.language);
    if (!STORES[store] || !language) return Response.json({ error: "Choose a store and a language." }, { status: 400 });
    const list = fieldsToTranslate(store, body?.fields);
    if (!list.length) return Response.json({ error: "Write some listing text first." }, { status: 400 });
    if (!aiConfigured()) return Response.json({ error: "Translation isn't set up on this server." }, { status: 503 });
    const r = await rateLimit(`listing:translate:${user.id}`, { limit: 20, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

    let raw;
    try {
      raw = await generateText(buildPrompt(store, language, list), { json: true, maxTokens: 3000 });
    } catch (err) {
      console.error(err);
      return Response.json({ error: "The translation failed. Try again in a moment." }, { status: 502 });
    }
    const parsed = parseTranslation(raw, store, list);
    if (!parsed) return Response.json({ error: "The translation came back unusable. Try again." }, { status: 502 });
    return Response.json({ ok: true, language, ...parsed });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not translate." }, { status: 500 });
  }
}
