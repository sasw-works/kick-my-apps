import { sql } from "@vercel/postgres";
import { addNotification } from "../../lib/inapp";
import { fetchAppStoreListing } from "../../lib/reviews";
import { ensureScansSchema, ensureComparisonsSchema } from "../../lib/ensureScansSchema";
import { getCurrentUser, unauthorized } from "../../lib/requireUser";
import { errorText } from "../../lib/secrets";
import { reportsLimit } from "../../lib/plans";
import { countReportsThisMonth } from "../../lib/usage";
import { rateLimit, tooManyRequests } from "../../lib/rateLimit";
import { computeProgress } from "../../lib/findingProgress";
import { projectKey } from "../../lib/projects";
import { computeLensScores } from "../../lib/lensScores";
import { migrateLegacyTracking, loadStatusMap } from "../../lib/taskData";

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

    // /api/analyze already checks this before spending AI quota, but the actual report is only
    // created here -- so this is the check that actually guarantees the plan limit, in case
    // anything ever calls this endpoint directly without going through /api/analyze first.
    const limit = reportsLimit(user);
    if (limit !== null) {
      const used = await countReportsThisMonth(user.email);
      if (used >= limit) {
        return Response.json(
          {
            error: `You've used all ${limit} reports included in your plan this month. It resets on the 1st, or you can upgrade for more.`,
            code: "PLAN_LIMIT",
          },
          { status: 403 }
        );
      }
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

    await addNotification(user.email, {
      kind: "report",
      title: `Report ready: ${normalized}`,
      body: `Health score ${healthScore}/100${(badCount ?? 0) ? ` · ${badCount} critical issue${badCount === 1 ? "" : "s"}` : ""}.`,
      href: `/console/reports/${rows[0]?.id}`,
    });
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

    const r = await rateLimit(`history:delete:${user.id}`, { limit: 60, windowSeconds: 3600 });
    if (!r.allowed) return tooManyRequests(r);

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
      // The report as it was before screenshots were added is internal bookkeeping; the page doesn't need it.
      if (scan.result_json && scan.result_json._base) { const { _base, ...rest } = scan.result_json; scan.result_json = rest; }

      // "Since your last scan": the same owner's previous report of the same app, if any.
      let progress = null;
      try {
        const { rows: prevRows } = await sql`
          SELECT id, health_score, created_at, result_json
          FROM scans
          WHERE user_email = ${row.user_email} AND app_name = ${row.app_name}
            AND (created_at < ${row.created_at} OR (created_at = ${row.created_at} AND id < ${row.id}))
          ORDER BY created_at DESC, id DESC
          LIMIT 1;
        `;
        const prev = prevRows[0];
        if (prev?.result_json?.findings && row.result_json?.findings) {
          progress = {
            previousId: prev.id,
            previousDate: prev.created_at,
            previousScore: prev.health_score,
            ...computeProgress(prev.result_json.findings, row.result_json.findings),
          };
        }
      } catch (e) {
        console.error("progress lookup failed:", errorText(e));
      }

      // The owner's task statuses for this app (managed on the Tasks page), shown read-only here.
      // "Won't do" is a standing decision about the app. A "done" tick made before this report
      // existed says nothing about it (the issue may have come back), so only newer ones count.
      let taskStatus = {};
      try {
        const { rows: legacy } = await sql`
          SELECT id, app_name, store_url, finding_status FROM scans
          WHERE user_email = ${row.user_email} AND finding_status IS NOT NULL;
        `;
        await migrateLegacyTracking(row.user_email, legacy);
        const map = await loadStatusMap(row.user_email, projectKey(row.app_name, row.store_url));
        for (const [k, v] of Object.entries(map)) {
          if (v.status === "wontdo" || new Date(v.updated_at) >= new Date(row.created_at)) taskStatus[k] = v.status;
        }
      } catch (e) {
        console.error("task status lookup failed:", errorText(e));
      }

      // Score history of this app (same owner, same project), oldest first, for the trend chart.
      let history = [];
      try {
        const { rows: all } = await sql`
          SELECT id, app_name, store_url, health_score, created_at, result_json->'findings' AS findings
          FROM scans WHERE user_email = ${row.user_email}
          ORDER BY created_at DESC, id DESC LIMIT 300;
        `;
        const pk = projectKey(row.app_name, row.store_url);
        history = all
          .filter((r) => projectKey(r.app_name, r.store_url) === pk)
          .slice(0, 24)
          .reverse()
          .map((r) => ({ id: r.id, health_score: r.health_score, created_at: r.created_at, lens: computeLensScores(r.findings) }));
      } catch (e) {
        console.error("history lookup failed:", errorText(e));
      }
      return Response.json({ scan, progress, taskStatus, history, isOwner: row.user_email === user.email });
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
