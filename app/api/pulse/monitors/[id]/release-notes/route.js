import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../lib/pulse/schema";
import { ensureScansSchema } from "../../../../../lib/ensureScansSchema";
import { rateLimit, tooManyRequests } from "../../../../../lib/rateLimit";
import { loadUserScans } from "../../../../../lib/taskData";
import { projectKey } from "../../../../../lib/projects";
import { storeOfAppId } from "../../../../../lib/pulse/appStore";
import { generateText, aiConfigured } from "../../../../../lib/textModel";
import { buildReleaseNotesPrompt, cleanReleaseNotes, limitFor } from "../../../../../lib/releaseNotes";
import { errorText } from "../../../../../lib/secrets";

export const runtime = "nodejs";

// Release notes for the NEXT release of one of the caller's own apps: built from the tasks they
// marked done since the version Pulse last saw was released. GET lists those tasks; POST writes the
// notes from the chosen ones (keys are checked against that same list, titles never come from the
// browser) plus an optional note of their own. Nothing is published anywhere.

async function load(id, email) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await sql`SELECT id, app_id, app_name FROM pulse_monitors WHERE id = ${id} AND user_email = ${email} AND kind = 'mine' LIMIT 1`;
  const monitor = rows[0];
  if (!monitor) return null;

  const { rows: snaps } = await sql`
    SELECT version, version_released_at, taken_at FROM pulse_snapshots WHERE monitor_id = ${id} AND version IS NOT NULL ORDER BY taken_at DESC, id DESC LIMIT 1
  `;
  const last = snaps[0] || null;
  const sinceMs = last ? new Date(last.version_released_at || last.taken_at).getTime() : Date.now() - 30 * 86_400_000;

  const pk = `app:${String(monitor.app_id).toLowerCase()}`;
  const scans = (await loadUserScans(email)).filter((s) => projectKey(s.app_name, s.store_url) === pk);
  const titles = new Map();
  for (const s of [...scans].reverse()) for (const f of Array.isArray(s.findings) ? s.findings : []) if (f?.key) titles.set(f.key, f.title);
  const { rows: custom } = await sql`SELECT task_key, title FROM custom_tasks WHERE user_email = ${email} AND project_key = ${pk}`;
  for (const c of custom) titles.set(c.task_key, c.title);

  const { rows: done } = await sql`
    SELECT finding_key, updated_at FROM task_status WHERE user_email = ${email} AND project_key = ${pk} AND status = 'done' ORDER BY updated_at DESC
  `;
  const tasks = done
    .filter((r) => new Date(r.updated_at).getTime() >= sinceMs && titles.has(r.finding_key))
    .map((r) => ({ key: r.finding_key, title: String(titles.get(r.finding_key)).slice(0, 160), doneAt: r.updated_at }));
  return { monitor, lastVersion: last?.version || null, sinceMs, tasks };
}

export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    await ensureScansSchema();
    const { id } = await params;
    const d = await load(id, user.email);
    if (!d) return Response.json({ error: "Monitor not found." }, { status: 404 });
    const store = storeOfAppId(d.monitor.app_id);
    return Response.json({
      lastVersion: d.lastVersion,
      since: new Date(d.sinceMs).toISOString(),
      store,
      maxChars: limitFor(store),
      tasks: d.tasks,
      aiAvailable: aiConfigured(),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load release notes data: " + errorText(err) }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`release-notes:${user.id}`, { limit: 20, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

    let body;
    try { body = await req.json(); } catch { body = null; }
    const keys = body?.taskKeys;
    if (keys != null && (!Array.isArray(keys) || keys.length > 50 || keys.some((k) => typeof k !== "string"))) return Response.json({ error: "taskKeys must be a list of task keys." }, { status: 400 });
    for (const f of ["extra", "language"]) if (body?.[f] != null && typeof body[f] !== "string") return Response.json({ error: `${f} must be text.` }, { status: 400 });
    const extra = (body?.extra || "").trim();
    const language = (body?.language || "").trim();
    if (language.length > 40 || extra.length > 800) return Response.json({ error: "Language or note too long." }, { status: 400 });

    await ensurePulseSchema();
    await ensureScansSchema();
    const { id } = await params;
    const d = await load(id, user.email);
    if (!d) return Response.json({ error: "Monitor not found." }, { status: 404 });

    const chosen = d.tasks.filter((t) => (keys == null ? true : keys.includes(t.key)));
    if (!chosen.length && !extra) return Response.json({ error: "Pick at least one finished task or write what changed.", code: "NOTHING_TO_WRITE" }, { status: 400 });

    if (!aiConfigured()) {
      console.error("Release notes unavailable: neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set.");
      return Response.json({ error: "Writing release notes isn't available right now." }, { status: 503 });
    }
    const store = storeOfAppId(d.monitor.app_id);
    const max = limitFor(store);
    let notes;
    try {
      notes = cleanReleaseNotes(await generateText(buildReleaseNotesPrompt({ appName: d.monitor.app_name, store, language, items: chosen.map((t) => t.title), extra })), max);
    } catch (err) {
      console.error("Release notes failed:", errorText(err, 500));
      return Response.json({ error: "Couldn't write the notes right now. Please try again." }, { status: 502 });
    }
    if (!notes) return Response.json({ error: "Couldn't write the notes right now. Please try again." }, { status: 502 });
    return Response.json({ notes, maxChars: max, used: chosen.length });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not write release notes: " + errorText(err) }, { status: 500 });
  }
}
