import { sql } from "@vercel/postgres";
import { ensureScansSchema } from "../../../lib/ensureScansSchema";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";
import { errorText } from "../../../lib/secrets";
import { generateText, aiConfigured } from "../../../lib/textModel";
import { buildVisualPrompt, parseVisualJson, normalizeVisual, mergeVisual, sniffImage, MAX_SCREENS, MAX_RUNS, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "../../../lib/addScreens";

export const runtime = "nodejs";
export const maxDuration = 60;

// Screenshots added to a report afterwards. GET: the stored screenshots (the owner, or an admin
// looking at a report). POST: the owner uploads 1-8 screenshots; a visual-only analysis runs on
// them and is merged into the report. Re-uploading replaces the previous screenshots, and a report
// accepts MAX_RUNS additions in total.

const idOf = (req) => {
  const id = new URL(req.url).searchParams.get("id");
  return id && /^\d+$/.test(id) ? id : null;
};
const notFound = () => Response.json({ error: "Report not found." }, { status: 404 });

export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const id = idOf(req);
    if (!id) return notFound();
    await ensureScansSchema();
    const { rows } = await sql`SELECT user_email, screens_json FROM scans WHERE id = ${id}`;
    const row = rows[0];
    if (!row || (row.user_email !== user.email && !user.isAdmin)) return notFound();
    return Response.json({ screens: Array.isArray(row.screens_json) ? row.screens_json : [] });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load the screenshots: " + errorText(err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const id = idOf(req);
    if (!id) return notFound();
    await ensureScansSchema();
    const { rows } = await sql`SELECT app_name, result_json FROM scans WHERE id = ${id} AND user_email = ${user.email}`;
    const row = rows[0];
    if (!row) return notFound();
    const stored = row.result_json && typeof row.result_json === "object" ? row.result_json : {};
    if ((Number(stored.visualAdded?.runs) || 0) >= MAX_RUNS) {
      return Response.json({ error: `Screenshots can be added to a report ${MAX_RUNS} times. Make a new report to analyze different screens.`, code: "SCREENS_LIMIT" }, { status: 403 });
    }
    if (!aiConfigured()) return Response.json({ error: "Visual analysis isn't set up on this server." }, { status: 503 });

    let form;
    try { form = await req.formData(); } catch { return Response.json({ error: "Upload the screenshots as files." }, { status: 400 }); }
    const files = form.getAll("files").filter((f) => typeof f !== "string");
    if (files.length < 1 || files.length > MAX_SCREENS) {
      return Response.json({ error: `Add between 1 and ${MAX_SCREENS} screenshots.` }, { status: 400 });
    }
    const images = [];
    let total = 0;
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) return Response.json({ error: "One of the screenshots is too large." }, { status: 413 });
      const buf = Buffer.from(await f.arrayBuffer());
      total += buf.length;
      const type = sniffImage(buf);
      if (!type) return Response.json({ error: "Only JPEG, PNG or WebP images can be added." }, { status: 400 });
      images.push({ mediaType: type, base64: buf.toString("base64") });
    }
    if (total > MAX_TOTAL_BYTES) return Response.json({ error: "The screenshots are too large together." }, { status: 413 });

    // Only requests that would really spend AI quota count; rejected uploads are cheap.
    const r = await rateLimit(`screens:hour:${user.id}`, { limit: 6, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

    const base = stored._base || stored;
    const prompt = buildVisualPrompt({
      appName: row.app_name,
      genre: stored.asoReview?.genre,
      existingTitles: (Array.isArray(base.findings) ? base.findings : []).map((f) => f?.title).filter(Boolean),
      count: images.length,
    });
    let raw;
    try {
      raw = await generateText(prompt, { images, json: true, maxTokens: 6000 });
    } catch (err) {
      console.error("Add screenshots failed:", errorText(err, 500));
      return Response.json({ error: "The visual analysis failed. Try again in a moment." }, { status: 502 });
    }
    const visual = normalizeVisual(parseVisualJson(raw), images.length);
    if (!visual) return Response.json({ error: "The visual analysis came back unusable. Try again." }, { status: 502 });

    const { result, counts } = mergeVisual(stored, visual, { screenCount: images.length });
    const screens = images.map((i) => `data:${i.mediaType};base64,${i.base64}`);
    await sql`
      UPDATE scans SET result_json = ${JSON.stringify(result)}::jsonb, health_score = ${counts.healthScore},
        bad_count = ${counts.bad}, warn_count = ${counts.warn}, good_count = ${counts.good},
        screens_json = ${JSON.stringify(screens)}::jsonb
      WHERE id = ${id} AND user_email = ${user.email}`;
    return Response.json({ ok: true, added: visual.findings.length, scoreBefore: result.visualAdded.scoreBefore, scoreAfter: result.visualAdded.scoreAfter, runs: result.visualAdded.runs });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not add the screenshots." }, { status: 500 });
  }
}
