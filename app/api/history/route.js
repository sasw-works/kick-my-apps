import { sql } from "@vercel/postgres";
import { fetchAppStoreListing } from "../../lib/reviews";
import { ensureScansSchema, ensureComparisonsSchema } from "../../lib/ensureScansSchema";
import { getCurrentUser, unauthorized } from "../../lib/requireUser";
import { errorText } from "../../lib/secrets";

export const runtime = "nodejs";

// Every handler here requires a signed-in user, and every list is scoped to that user's own
// scans. There is no "anonymous" scan any more -- nothing in the product is reachable
// without an account.

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

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

    const { rows } = await sql`
      INSERT INTO scans (app_name, health_score, bad_count, warn_count, good_count, result_json, store_url, icon_url, user_email)
      VALUES (${normalized}, ${healthScore}, ${badCount ?? 0}, ${warnCount ?? 0}, ${goodCount ?? 0}, ${JSON.stringify(resultJson ?? null)}, ${storeUrl || null}, ${iconUrl}, ${user.email})
      RETURNING id;
    `;

    return Response.json({ ok: true, id: rows[0]?.id });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not save history: " + errorText(err) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await ensureScansSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) {
      return Response.json({ error: "id is required." }, { status: 400 });
    }
    // Only the owner can delete a scan.
    const { rowCount } = await sql`
      DELETE FROM scans WHERE id = ${id} AND user_email = ${user.email};
    `;
    if (rowCount === 0) {
      return Response.json({ error: "Report not found, or you don't have permission to delete it." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not delete: " + errorText(err) }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await ensureScansSchema();
    const { searchParams } = new URL(req.url);
    const appName = (searchParams.get("appName") || "").trim();
    const all = searchParams.get("all");
    const apps = searchParams.get("apps");
    const id = searchParams.get("id");

    if (id) {
      // One report: readable by its owner, or by an admin (the Admin panel links straight to
      // any user's report). Anyone else gets the same "not found" as for a missing id, so ids
      // (which are sequential) can't be probed to learn which reports exist.
      if (!/^\d+$/.test(id)) {
        return Response.json({ error: "Scan not found." }, { status: 404 });
      }
      const { rows } = await sql`
        SELECT id, app_name, health_score, bad_count, warn_count, good_count, result_json, store_url, created_at, user_email
        FROM scans
        WHERE id = ${id}
        LIMIT 1;
      `;
      const row = rows[0];
      if (!row || (row.user_email !== user.email && !user.isAdmin)) {
        return Response.json({ error: "Scan not found." }, { status: 404 });
      }
      const { user_email: _owner, ...scan } = row;
      return Response.json({ scan });
    }

    if (apps) {
      // Portfolio dashboard: each app's latest scan + total scan count for this user.
      const { rows: latest } = await sql`
        SELECT DISTINCT ON (app_name) app_name, health_score, bad_count, warn_count, good_count, created_at
        FROM scans
        WHERE user_email = ${user.email}
        ORDER BY app_name, created_at DESC;
      `;
      const { rows: counts } = await sql`
        SELECT app_name, COUNT(*)::int AS scan_count
        FROM scans
        WHERE user_email = ${user.email}
        GROUP BY app_name;
      `;
      const countMap = Object.fromEntries(counts.map((c) => [c.app_name, c.scan_count]));
      const merged = latest
        .map((row) => ({ ...row, scan_count: countMap[row.app_name] ?? 1 }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return Response.json({ apps: merged });
    }

    if (all) {
      // Reports tab / comparison picker: this user's own scans and comparisons.
      const { rows: scanRows } = await sql`
        SELECT id, app_name, health_score, bad_count, warn_count, good_count, store_url, icon_url, created_at,
               (result_json -> 'reviewSummary' ->> 'totalReviews')::int AS review_count
        FROM scans
        WHERE user_email = ${user.email}
        ORDER BY created_at DESC
        LIMIT 100;
      `;
      let comparisonRows = [];
      try {
        await ensureComparisonsSchema();
        const { rows } = await sql`
          SELECT id, scan_id_a, scan_id_b, app_name_a, app_name_b, created_at
          FROM comparisons
          WHERE user_email = ${user.email}
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
      WHERE app_name = ${appName} AND user_email = ${user.email}
      ORDER BY created_at ASC
      LIMIT 20;
    `;

    return Response.json({ scans: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not retrieve history: " + errorText(err) }, { status: 500 });
  }
}
