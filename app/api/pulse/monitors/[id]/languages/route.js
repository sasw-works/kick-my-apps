import { sql } from "@vercel/postgres";
import { getCurrentUser, unauthorized } from "../../../../../lib/requireUser";
import { ensurePulseSchema } from "../../../../../lib/pulse/schema";
import { computeLanguageBreakdown } from "../../../../../lib/reviewLanguages";
import { errorText } from "../../../../../lib/secrets";

export const runtime = "nodejs";

// Which languages the stored reviews of one of the caller's own apps are written in, and how each
// group rates the app. Counts come straight from stored reviews.
export async function GET(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await ensurePulseSchema();
    const { id } = await params;
    if (!/^\d+$/.test(String(id))) return Response.json({ error: "Monitor not found." }, { status: 404 });
    const { rows: m } = await sql`SELECT id FROM pulse_monitors WHERE id = ${id} AND user_email = ${user.email} AND kind = 'mine' LIMIT 1`;
    if (!m[0]) return Response.json({ error: "Monitor not found." }, { status: 404 });
    const { rows } = await sql`
      SELECT rating, title, content FROM pulse_reviews WHERE monitor_id = ${m[0].id} ORDER BY first_seen_at DESC, review_id DESC LIMIT 300`;
    return Response.json(computeLanguageBreakdown(rows));
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load languages: " + errorText(err) }, { status: 500 });
  }
}
