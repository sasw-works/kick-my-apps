import { sql } from "@vercel/postgres";
import { lookupApp, fetchRecentReviews } from "./appStore.js";

// One check of one monitor. Data sources are injectable (deps) so the logic can be tested with
// exact, invented Apple responses instead of whatever the real store says today.

export const RULES = {
  ratingDropWarn: 0.1, // average rating fell by at least this since the last check
  ratingDropCritical: 0.25,
  ratingRise: 0.1,
  negativeMin: 3, // new 1-2 star reviews in one check ...
  negativeCriticalMin: 8,
  negativeVsTypical: 2, // ... and at least this many times the app's own usual number
  minRatingsForReviewFeed: 20, // an empty feed is only "no reviews" for an app this small
  keepSnapshots: 90,
  keepReviews: 300,
};

const defaultDeps = { lookupApp, fetchRecentReviews };

const round3 = (n) => Math.round(n * 1000) / 1000;
const clip = (s, n) => (String(s ?? "").length > n ? String(s).slice(0, n - 1) + "…" : String(s ?? ""));
const snippet = (r) => `“${clip(r.title || r.content, 90)}” (${r.rating}★)`;

// Atomically takes the right to check a monitor now: succeeds only if it hasn't been checked within
// the last minIntervalSeconds. Whoever wins runs the check; a concurrent cron run or a double click
// gets null and does nothing, so one monitor never gets two snapshots for one moment.
export async function claimMonitor(id, { minIntervalSeconds }) {
  const { rows } = await sql`
    UPDATE pulse_monitors SET last_checked_at = now()
    WHERE id = ${id}
      AND (last_checked_at IS NULL OR last_checked_at <= now() - (${minIntervalSeconds}::int * interval '1 second'))
    RETURNING *
  `;
  return rows[0] || null;
}

export async function secondsUntilCheckAllowed(id, { minIntervalSeconds }) {
  const { rows } = await sql`
    SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (last_checked_at + (${minIntervalSeconds}::int * interval '1 second') - now()))))::int AS wait
    FROM pulse_monitors WHERE id = ${id}
  `;
  return rows[0]?.wait ?? 0;
}

async function recordReviews(monitorId, reviews) {
  if (reviews.length === 0) return [];
  const { rows } = await sql`
    INSERT INTO pulse_reviews (monitor_id, review_id, rating, title, content, version, reviewed_at)
    SELECT ${monitorId}::int, t.review_id, t.rating, t.title, t.content, t.version, t.reviewed_at
    FROM unnest(
      ${reviews.map((r) => r.id)}::text[],
      ${reviews.map((r) => r.rating)}::int[],
      ${reviews.map((r) => r.title)}::text[],
      ${reviews.map((r) => r.content)}::text[],
      ${reviews.map((r) => r.version)}::text[],
      ${reviews.map((r) => r.reviewedAt)}::timestamptz[]
    ) AS t(review_id, rating, title, content, version, reviewed_at)
    ON CONFLICT (monitor_id, review_id) DO NOTHING
    RETURNING review_id
  `;
  // Whatever the table didn't already have is new.
  const inserted = new Set(rows.map((r) => r.review_id));
  return reviews.filter((r) => inserted.has(r.id));
}

export async function runCheck(monitor, deps = defaultDeps, { reviewAttempts = 1 } = {}) {
  const found = await deps.lookupApp(monitor.app_id, monitor.country);
  if (!found.ok) {
    const error =
      found.reason === "not_found"
        ? "This app is no longer listed in this store."
        : "The App Store didn't respond. We'll try again.";
    await sql`UPDATE pulse_monitors SET last_check_ok = false, last_error = ${error} WHERE id = ${monitor.id}`;
    return { ok: false, error };
  }
  const app = found.app;

  const feed = await deps.fetchRecentReviews(monitor.app_id, monitor.country, { attempts: reviewAttempts });
  // An empty feed means "nothing new" only for a tiny app; for one with real ratings it means we
  // couldn't read it, and we say so instead of reporting a false zero.
  const reviewsOk = feed.ok || app.ratingCount < RULES.minRatingsForReviewFeed;

  const { rows: prevRows } = await sql`
    SELECT * FROM pulse_snapshots WHERE monitor_id = ${monitor.id} ORDER BY taken_at DESC, id DESC LIMIT 1
  `;
  const prev = prevRows[0] || null;
  const baseline = !prev; // first ever check: record where things stand, alert on nothing

  let typicalNegatives = 0;
  if (!baseline) {
    const { rows } = await sql`
      SELECT AVG(new_negative_count)::float AS typical FROM (
        SELECT new_negative_count FROM pulse_snapshots
        WHERE monitor_id = ${monitor.id} AND is_baseline = false AND reviews_ok = true
        ORDER BY taken_at DESC LIMIT 7
      ) t
    `;
    typicalNegatives = rows[0]?.typical || 0;
  }

  const fresh = await recordReviews(monitor.id, feed.reviews);
  const newCount = baseline ? 0 : fresh.length;
  const negatives = baseline ? [] : fresh.filter((r) => r.rating <= 2);

  const { rows: snapRows } = await sql`
    INSERT INTO pulse_snapshots
      (monitor_id, version, version_released_at, avg_rating, rating_count, reviews_ok, new_review_count, new_negative_count, is_baseline)
    VALUES
      (${monitor.id}, ${app.version}, ${app.releasedAt}, ${app.avgRating}, ${app.ratingCount}, ${reviewsOk}, ${newCount}, ${negatives.length}, ${baseline})
    RETURNING id
  `;

  const alerts = [];
  if (!baseline) {
    if (app.version && prev.version && app.version !== prev.version) {
      alerts.push({
        kind: "new_version",
        severity: "info",
        title: `Version ${app.version} released`,
        detail: app.releaseNotes ? clip(app.releaseNotes, 300) : "No release notes were published.",
      });
    }

    if (app.avgRating != null && prev.avg_rating != null) {
      const delta = round3(app.avgRating - prev.avg_rating);
      const now = app.avgRating.toFixed(2);
      const was = prev.avg_rating.toFixed(2);
      if (delta <= -RULES.ratingDropCritical) {
        alerts.push({ kind: "rating_drop", severity: "critical", title: `Average rating fell to ${now} (from ${was})`, detail: `A drop of ${Math.abs(delta).toFixed(2)} stars since the last check.` });
      } else if (delta <= -RULES.ratingDropWarn) {
        alerts.push({ kind: "rating_drop", severity: "warn", title: `Average rating fell to ${now} (from ${was})`, detail: `A drop of ${Math.abs(delta).toFixed(2)} stars since the last check.` });
      } else if (delta >= RULES.ratingRise) {
        alerts.push({ kind: "rating_rise", severity: "info", title: `Average rating rose to ${now} (from ${was})`, detail: `Up ${delta.toFixed(2)} stars since the last check.` });
      }
    }

    if (reviewsOk && negatives.length >= RULES.negativeMin && negatives.length >= RULES.negativeVsTypical * typicalNegatives) {
      const critical = negatives.length >= RULES.negativeCriticalMin && negatives.length >= 3 * typicalNegatives;
      alerts.push({
        kind: "negative_burst",
        severity: critical ? "critical" : "warn",
        title: `${negatives.length} new 1–2★ reviews since the last check`,
        detail: negatives.slice(0, 2).map(snippet).join("  ·  "),
      });
    }
  }

  for (const a of alerts) {
    await sql`
      INSERT INTO pulse_alerts (monitor_id, user_email, kind, severity, title, detail)
      VALUES (${monitor.id}, ${monitor.user_email}, ${a.kind}, ${a.severity}, ${a.title}, ${a.detail})
    `;
  }

  // Keep history bounded.
  await sql`
    DELETE FROM pulse_snapshots WHERE monitor_id = ${monitor.id}
      AND id NOT IN (SELECT id FROM pulse_snapshots WHERE monitor_id = ${monitor.id} ORDER BY taken_at DESC, id DESC LIMIT ${RULES.keepSnapshots})
  `;
  await sql`
    DELETE FROM pulse_reviews WHERE monitor_id = ${monitor.id}
      AND review_id NOT IN (SELECT review_id FROM pulse_reviews WHERE monitor_id = ${monitor.id} ORDER BY first_seen_at DESC, reviewed_at DESC NULLS LAST LIMIT ${RULES.keepReviews})
  `;

  await sql`
    UPDATE pulse_monitors SET
      last_check_ok = true, last_error = NULL,
      app_name = ${app.name || monitor.app_name},
      developer = ${app.developer || monitor.developer},
      icon_url = COALESCE(${app.iconUrl}, icon_url)
    WHERE id = ${monitor.id}
  `;

  return { ok: true, baseline, snapshotId: snapRows[0].id, alerts, newReviews: newCount, reviewsOk };
}

// Claim, then check. Returns { skipped: true } when someone else got there first / it was checked recently.
// reviewAttempts is forwarded to runCheck -- pass 2 from a single-monitor, user-triggered check
// (its own function invocation, worth the extra try); the cron path leaves it at 1 (see
// fetchRecentReviews for why).
export async function claimAndCheck(id, { minIntervalSeconds, deps = defaultDeps, reviewAttempts = 1 }) {
  const monitor = await claimMonitor(id, { minIntervalSeconds });
  if (!monitor) return { skipped: true };
  try {
    return await runCheck(monitor, deps, { reviewAttempts });
  } catch (err) {
    await sql`UPDATE pulse_monitors SET last_check_ok = false, last_error = ${"Check failed unexpectedly. We'll try again."} WHERE id = ${id}`;
    throw err;
  }
}

// What the daily job runs: every active monitor not checked in the last ~20 hours, oldest first,
// a few at a time, stopping before the function's time limit. Anything left over is simply first in
// line at the next run -- checked oldest-first, so it rotates fairly over several days rather than
// starving the same monitors.
//
// budgetMs/concurrency default conservatively for Vercel Hobby's hard 10s function timeout (no
// override available there). Once this runs somewhere without that ceiling (its own server, or
// Vercel Pro), raise PULSE_CRON_BUDGET_MS / PULSE_CRON_CONCURRENCY -- no code change needed.
export async function checkDueMonitors({
  budgetMs = Number(process.env.PULSE_CRON_BUDGET_MS) || 7000,
  concurrency = Number(process.env.PULSE_CRON_CONCURRENCY) || 3,
  minIntervalSeconds = 20 * 3600,
  limit = 500,
  deps = defaultDeps,
} = {}) {
  const started = Date.now();
  const { rows: due } = await sql`
    SELECT id FROM pulse_monitors
    WHERE status = 'active' AND (last_checked_at IS NULL OR last_checked_at <= now() - (${minIntervalSeconds}::int * interval '1 second'))
    ORDER BY last_checked_at ASC NULLS FIRST, id ASC
    LIMIT ${limit}
  `;

  const summary = { due: due.length, checked: 0, skipped: 0, failed: 0, remaining: 0 };
  const queue = due.map((r) => r.id);

  async function worker() {
    while (queue.length > 0) {
      if (Date.now() - started > budgetMs) return;
      const id = queue.shift();
      try {
        const r = await claimAndCheck(id, { minIntervalSeconds, deps, reviewAttempts: 1 });
        if (r.skipped) summary.skipped++;
        else if (r.ok) summary.checked++;
        else summary.failed++;
      } catch (err) {
        console.error("Pulse check crashed for monitor", id, err?.message);
        summary.failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  summary.remaining = queue.length;
  return summary;
}
