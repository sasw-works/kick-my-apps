import { sql } from "@vercel/postgres";
import { ensureScansSchema, ensureComparisonsSchema } from "../../../lib/ensureScansSchema";
import { getCurrentUser, unauthorized } from "../../../lib/requireUser";
import { errorText } from "../../../lib/secrets";
import { comparisonsLimit } from "../../../lib/plans";
import { countComparisonsThisMonth } from "../../../lib/usage";

export const runtime = "nodejs";

// Sign-in required on every method. Comparisons belong to the user who made them, and can only
// be built from scans that user owns -- previously any caller could pass arbitrary scan ids
// and get full report contents back.

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await ensureScansSchema();
    await ensureComparisonsSchema();
    const { scanIdA, scanIdB, appNameA, appNameB } = await req.json();
    const a = Number(scanIdA);
    const b = Number(scanIdB);
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      return Response.json({ error: "scanIdA and scanIdB are required." }, { status: 400 });
    }

    // Both scans must exist and belong to the caller.
    const wanted = [...new Set([a, b])];
    const { rows: owned } = await sql`
      SELECT id FROM scans WHERE id = ANY(${wanted}) AND user_email = ${user.email};
    `;
    if (owned.length !== wanted.length) {
      return Response.json({ error: "One of those reports wasn't found." }, { status: 404 });
    }

    // Plan limit, checked before writing the row: counts comparisons actually saved this
    // calendar month.
    const limit = comparisonsLimit(user);
    if (limit !== null) {
      const used = await countComparisonsThisMonth(user.email);
      if (used >= limit) {
        return Response.json(
          {
            error: `You've used all ${limit} comparison${limit === 1 ? "" : "s"} included in your plan this month. It resets on the 1st, or you can upgrade for more.`,
            code: "PLAN_LIMIT",
          },
          { status: 403 }
        );
      }
    }

    const { rows } = await sql`
      INSERT INTO comparisons (scan_id_a, scan_id_b, app_name_a, app_name_b, user_email)
      VALUES (${a}, ${b}, ${appNameA || ""}, ${appNameB || ""}, ${user.email})
      RETURNING id;
    `;
    return Response.json({ ok: true, id: rows[0]?.id });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not save comparison: " + errorText(err) }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await ensureComparisonsSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) {
      return Response.json({ error: "id is required." }, { status: 400 });
    }
    const { rowCount } = await sql`
      DELETE FROM comparisons WHERE id = ${id} AND user_email = ${user.email};
    `;
    if (rowCount === 0) {
      return Response.json({ error: "Comparison not found, or you don't have permission to delete it." }, { status: 404 });
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
    await ensureComparisonsSchema();
    const { searchParams } = new URL(req.url);
    const idsParam = (searchParams.get("ids") || "").trim();
    const comparisonId = searchParams.get("comparisonId");
    const all = searchParams.get("all");

    if (all) {
      const { rows } = await sql`
        SELECT c.id, c.app_name_a, c.app_name_b, c.created_at,
               sa.icon_url AS icon_url_a, sb.icon_url AS icon_url_b
        FROM comparisons c
        LEFT JOIN scans sa ON sa.id = c.scan_id_a
        LEFT JOIN scans sb ON sb.id = c.scan_id_b
        WHERE c.user_email = ${user.email}
        ORDER BY c.created_at DESC
        LIMIT 100;
      `;
      return Response.json({ comparisons: rows });
    }

    if (comparisonId) {
      // A saved comparison: readable by its owner (or an admin). Anyone else gets "not found",
      // the same as for a missing id.
      if (!/^\d+$/.test(comparisonId)) {
        return Response.json({ error: "Comparison not found." }, { status: 404 });
      }
      const { rows } = await sql`
        SELECT scan_id_a, scan_id_b, user_email FROM comparisons WHERE id = ${comparisonId} LIMIT 1;
      `;
      const row = rows[0];
      if (!row || (row.user_email !== user.email && !user.isAdmin)) {
        return Response.json({ error: "Comparison not found." }, { status: 404 });
      }
      const ids = [row.scan_id_a, row.scan_id_b];
      const { rows: scans } = await sql`
        SELECT id, app_name, health_score, bad_count, warn_count, good_count, result_json, created_at
        FROM scans
        WHERE id = ANY(${ids})
        ORDER BY created_at ASC;
      `;
      return Response.json({ scans });
    }

    const ids = idsParam
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n))
      .slice(0, 10);

    if (ids.length === 0) {
      return Response.json({ error: "ids are required." }, { status: 400 });
    }

    // Only the caller's own scans come back, whatever ids were asked for.
    const { rows } = await sql`
      SELECT id, app_name, health_score, bad_count, warn_count, good_count, result_json, created_at
      FROM scans
      WHERE id = ANY(${ids}) AND user_email = ${user.email}
      ORDER BY created_at ASC;
    `;

    return Response.json({ scans: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not retrieve comparison data: " + errorText(err) }, { status: 500 });
  }
}
