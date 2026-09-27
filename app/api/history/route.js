import { sql } from "@vercel/postgres";
import { fetchAppStoreListing } from "../../lib/reviews";
import { auth } from "../../../auth";
import { ensureScansSchema } from "../../lib/ensureScansSchema";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    await ensureScansSchema();
    const { appName, healthScore, badCount, warnCount, goodCount, resultJson, storeUrl } = await req.json();

    if (!appName || typeof healthScore !== "number") {
      return Response.json({ error: "appName and healthScore are required." }, { status: 400 });
    }

    const normalized = appName.trim();

    let iconUrl = null;
    if (storeUrl) {
      try {
        const listing = await fetchAppStoreListing(storeUrl);
        iconUrl = listing?.iconUrl || null;
      } catch {
        iconUrl = null;
      }
    }

    // Anonymous scans (not signed in) are still allowed -- user_email is simply null then,
    // and won't show up under any account in the admin panel.
    const session = await auth();
    const userEmail = session?.user?.email || null;

    const { rows } = await sql`
      INSERT INTO scans (app_name, health_score, bad_count, warn_count, good_count, result_json, store_url, icon_url, user_email)
      VALUES (${normalized}, ${healthScore}, ${badCount ?? 0}, ${warnCount ?? 0}, ${goodCount ?? 0}, ${JSON.stringify(resultJson ?? null)}, ${storeUrl || null}, ${iconUrl}, ${userEmail})
      RETURNING id;
    `;

    return Response.json({ ok: true, id: rows[0]?.id });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not save history: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await ensureScansSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ error: "id is required." }, { status: 400 });
    }
    // Only the scan's own owner can delete it (anonymous scans -- user_email null -- can only
    // be deleted by another anonymous request, matching the same "no owner" state).
    const session = await auth();
    const userEmail = session?.user?.email || null;
    const { rowCount } = await sql`
      DELETE FROM scans WHERE id = ${id} AND user_email IS NOT DISTINCT FROM ${userEmail};
    `;
    if (rowCount === 0) {
      return Response.json({ error: "Report not found, or you don't have permission to delete it." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not delete: " + err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await ensureScansSchema();
    const { searchParams } = new URL(req.url);
    const appName = (searchParams.get("appName") || "").trim();
    const all = searchParams.get("all");
    const apps = searchParams.get("apps");
    const id = searchParams.get("id");

    // Every list/portfolio view below is scoped to the signed-in user's own scans, so one
    // person never sees another's reports. The single-id lookup further down stays
    // unrestricted -- it's used for direct report links (e.g. from the Admin panel, or a
    // shared report URL), which intentionally isn't limited to the current viewer.
    const session = await auth();
    const userEmail = session?.user?.email || null;

    if (id) {
      const { rows } = await sql`
        SELECT id, app_name, health_score, bad_count, warn_count, good_count, result_json, store_url, created_at
        FROM scans
        WHERE id = ${id}
        LIMIT 1;
      `;
      if (rows.length === 0) {
        return Response.json({ error: "Scan not found." }, { status: 404 });
      }
      return Response.json({ scan: rows[0] });
    }

    if (apps) {
      // Portfolio dashboard: each app's latest scan + total scan count, scoped to this user.
      const { rows: latest } = await sql`
        SELECT DISTINCT ON (app_name) app_name, health_score, bad_count, warn_count, good_count, created_at
        FROM scans
        WHERE user_email IS NOT DISTINCT FROM ${userEmail}
        ORDER BY app_name, created_at DESC;
      `;
      const { rows: counts } = await sql`
        SELECT app_name, COUNT(*)::int AS scan_count
        FROM scans
        WHERE user_email IS NOT DISTINCT FROM ${userEmail}
        GROUP BY app_name;
      `;
      const countMap = Object.fromEntries(counts.map((c) => [c.app_name, c.scan_count]));
      const merged = latest
        .map((row) => ({ ...row, scan_count: countMap[row.app_name] ?? 1 }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return Response.json({ apps: merged });
    }

    if (all) {
      // For the comparison screen and Reports tab: a summary list of this user's own scans.
      const { rows: scanRows } = await sql`
        SELECT id, app_name, health_score, bad_count, warn_count, good_count, store_url, icon_url, created_at,
               (result_json -> 'reviewSummary' ->> 'totalReviews')::int AS review_count
        FROM scans
        WHERE user_email IS NOT DISTINCT FROM ${userEmail}
        ORDER BY created_at DESC
        LIMIT 100;
      `;
      let comparisonRows = [];
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS comparisons (
            id SERIAL PRIMARY KEY,
            scan_id_a INTEGER NOT NULL,
            scan_id_b INTEGER NOT NULL,
            app_name_a TEXT NOT NULL,
            app_name_b TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
          );
        `;
        const { rows } = await sql`
          SELECT id, scan_id_a, scan_id_b, app_name_a, app_name_b, created_at
          FROM comparisons
          ORDER BY created_at DESC
          LIMIT 100;
        `;
        comparisonRows = rows;
      } catch {
        comparisonRows = [];
      }
      return Response.json({ scans: scanRows, comparisons: comparisonRows });
    }

    if (!appName) {
      return Response.json({ error: "appName is required." }, { status: 400 });
    }

    const { rows } = await sql`
      SELECT id, health_score, bad_count, warn_count, good_count, created_at
      FROM scans
      WHERE app_name = ${appName} AND user_email IS NOT DISTINCT FROM ${userEmail}
      ORDER BY created_at ASC
      LIMIT 20;
    `;

    return Response.json({ scans: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not retrieve history: " + err.message }, { status: 500 });
  }
}

