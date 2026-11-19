import { sql } from "@vercel/postgres";
import { ensureScansSchema } from "../../../lib/ensureScansSchema";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";
import { errorText } from "../../../lib/secrets";
import { generateText, aiConfigured } from "../../../lib/textModel";
import { fetchStoreAssets } from "../../../lib/storeAssets";
import { buildVisualsPrompt, normalizeVisuals, parseModelJson } from "../../../lib/visualsReview";

export const runtime = "nodejs";
export const maxDuration = 60;

// Store visuals review for one of the caller's reports: downloads the app's public icon and
// screenshots from its store listing and has the AI critique them. Owner-only (an admin can't
// generate on someone else's report -- it costs the owner's quota and isn't theirs to change).
// GET returns the saved review (no AI call); POST makes a fresh one and saves it.

async function owner(req, key, opts) {
  const user = await getCurrentUser();
  if (!user) return { res: unauthorized() };
  const r = await rateLimit(`${key}:${user.id}`, opts);
  if (!r.allowed) return { res: tooManyRequests(r) };
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) return { res: Response.json({ error: "id is required." }, { status: 400 }) };
  await ensureScansSchema();
  return { user, id };
}

const notFound = () => Response.json({ error: "Report not found." }, { status: 404 });

export async function GET(req) {
  try {
    const o = await owner(req, "visuals-read", { limit: 120, windowSeconds: 3600 });
    if (o.res) return o.res;
    const { rows } = await sql`SELECT store_url, visuals_json FROM scans WHERE id = ${o.id} AND user_email = ${o.user.email}`;
    if (!rows[0]) return notFound();
    return Response.json({ available: !!rows[0].store_url, visuals: rows[0].visuals_json || null });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load the review: " + errorText(err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const o = await owner(req, "visuals", { limit: 10, windowSeconds: 3600 });
    if (o.res) return o.res;
    const { rows } = await sql`SELECT app_name, store_url FROM scans WHERE id = ${o.id} AND user_email = ${o.user.email}`;
    const scan = rows[0];
    if (!scan) return notFound();
    if (!scan.store_url) {
      return Response.json(
        { error: "This report wasn't made from a store link, so there are no store visuals to review." },
        { status: 400 }
      );
    }
    if (!aiConfigured()) {
      return Response.json({ error: "The visuals review isn't available right now." }, { status: 503 });
    }

    const assets = await fetchStoreAssets(scan.store_url);
    if (!assets) {
      return Response.json({ error: "Couldn't read the store listing. Please try again later." }, { status: 502 });
    }
    const images = [...(assets.icon ? [assets.icon] : []), ...assets.screenshots];
    if (assets.screenshots.length === 0) {
      return Response.json(
        { error: "Couldn't download this app's store screenshots, so there is nothing to review." },
        { status: 502 }
      );
    }
    const ctx = { hasIcon: !!assets.icon, screenshotCount: assets.screenshots.length };

    let raw;
    try {
      raw = await generateText(
        buildVisualsPrompt({ appName: assets.listing.trackName || scan.app_name, genre: assets.listing.genre, ...ctx }),
        { images, json: true, maxTokens: 2500 }
      );
    } catch (err) {
      console.error("Store visuals model call failed:", errorText(err, 500));
      return Response.json({ error: "The review couldn't be written right now. Please try again." }, { status: 502 });
    }
    const result = normalizeVisuals(parseModelJson(raw), ctx);
    if (!result) {
      return Response.json({ error: "The review couldn't be written right now. Please try again." }, { status: 502 });
    }

    const visuals = { ...result, screenshotCount: ctx.screenshotCount, iconReviewed: ctx.hasIcon, generatedAt: new Date().toISOString() };
    await sql`UPDATE scans SET visuals_json = ${JSON.stringify(visuals)}::jsonb WHERE id = ${o.id} AND user_email = ${o.user.email}`;
    return Response.json({ available: true, visuals });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not review the visuals: " + errorText(err) }, { status: 500 });
  }
}
