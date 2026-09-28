import { ensurePulseSchema } from "../../../lib/pulse/schema";
import { checkDueMonitors } from "../../../lib/pulse/check";
import { errorText } from "../../../lib/secrets";

export const runtime = "nodejs";
// Only takes effect off Vercel Hobby (which hard-caps every function, cron included, at 10s with
// no override) -- on Pro this raises the ceiling to 60s. Either way, checkDueMonitors' own
// budgetMs (see app/lib/pulse/check.js) is what actually decides how long a run keeps going,
// and defaults conservatively for the 10s case.
export const maxDuration = 60;

export async function GET(req) {
  // Fails closed: without a configured CRON_SECRET nobody can trigger this. Vercel sends
  // "Authorization: Bearer <CRON_SECRET>" on its own once the variable exists; if this ever runs
  // from a different scheduler (e.g. after moving off Vercel), point it at the same header.
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await ensurePulseSchema();
    const summary = await checkDueMonitors();
    console.log("Pulse cron:", JSON.stringify(summary));
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    console.error("Pulse cron failed:", errorText(err, 1000));
    return Response.json({ error: "Pulse check run failed: " + errorText(err) }, { status: 500 });
  }
}
