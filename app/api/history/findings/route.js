import { sql } from "@vercel/postgres";
import { ensureScansSchema } from "../../../lib/ensureScansSchema";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { rateLimit, tooManyRequests } from "../../../lib/rateLimit";
import { errorText } from "../../../lib/secrets";
import { TRACK_STATUSES } from "../../../lib/findingProgress";

export const runtime = "nodejs";

// Marks one finding of the caller's OWN report as fixed / won't fix / open again. Owner only.
// The category must be one that report actually contains, so the stored map can't be stuffed with
// arbitrary keys.
export async function PATCH(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const r = await rateLimit(`findings:${user.id}`, { limit: 600, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

    const id = new URL(req.url).searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) return Response.json({ error: "id is required." }, { status: 400 });
    let body;
    try { body = await req.json(); } catch { body = null; }
    const key = body?.key;
    const status = body?.status;
    if (typeof key !== "string" || !(status === "open" || TRACK_STATUSES.includes(status))) {
      return Response.json({ error: "key and a valid status are required." }, { status: 400 });
    }

    await ensureScansSchema();
    const { rows } = await sql`SELECT result_json FROM scans WHERE id = ${id} AND user_email = ${user.email}`;
    if (!rows[0]) return Response.json({ error: "Report not found." }, { status: 404 });
    const findings = Array.isArray(rows[0].result_json?.findings) ? rows[0].result_json.findings : [];
    if (!findings.some((f) => f?.key === key)) {
      return Response.json({ error: "That finding isn't part of this report." }, { status: 400 });
    }

    const { rows: out } = status === "open"
      ? await sql`
          UPDATE scans SET finding_status = COALESCE(finding_status, '{}'::jsonb) - ${key}::text
          WHERE id = ${id} AND user_email = ${user.email} RETURNING finding_status;`
      : await sql`
          UPDATE scans SET finding_status = jsonb_set(COALESCE(finding_status, '{}'::jsonb), ARRAY[${key}::text], to_jsonb(${status}::text))
          WHERE id = ${id} AND user_email = ${user.email} RETURNING finding_status;`;
    return Response.json({ findingStatus: out[0]?.finding_status || {} });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not save: " + errorText(err) }, { status: 500 });
  }
}
