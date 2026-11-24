import { sql } from "@vercel/postgres";
import { ensurePulseSchema } from "./pulse/schema.js";
import { ensureScansSchema } from "./ensureScansSchema.js";
import { computeReviewTopics } from "./reviewTopics.js";
import { computeProjectTasks } from "./projects.js";
import { loadProjects, loadStatusMap, loadCustomTasks } from "./taskData.js";
import { escapeHtml } from "./resend.js";

// The weekly product brief: one page that pulls together what the rest of the product already
// knows. Built only from stored data and plain rules (no AI call), so it always works and every
// number in it is one the person can find again in the app.

const DAY = 86_400_000;
const host = () => process.env.CANONICAL_HOST || "kick-my-apps.vercel.app";
const SEV = { bad: "Critical", warn: "Needs attention" };

async function appSummary(m, now) {
  const { rows: snaps } = await sql`
    SELECT avg_rating, version, new_review_count, new_negative_count, taken_at FROM pulse_snapshots
    WHERE monitor_id = ${m.id} AND taken_at >= ${new Date(now - 16 * DAY).toISOString()} ORDER BY taken_at ASC, id ASC
  `;
  const week = snaps.filter((s) => new Date(s.taken_at).getTime() > now - 7 * DAY);
  const latest = snaps[snaps.length - 1];
  const before = snaps.filter((s) => new Date(s.taken_at).getTime() <= now - 6 * DAY).pop() || (snaps.length > 1 ? snaps[0] : null);
  let release = null;
  for (let i = 1; i < snaps.length; i++) {
    if (snaps[i].version && snaps[i - 1].version && snaps[i].version !== snaps[i - 1].version && new Date(snaps[i].taken_at).getTime() > now - 7 * DAY) release = snaps[i].version;
  }
  const { rows: revs } = await sql`SELECT rating, title, content FROM pulse_reviews WHERE monitor_id = ${m.id} ORDER BY first_seen_at DESC, review_id DESC LIMIT 300`;
  const { sample, topics } = computeReviewTopics(revs);
  const top = topics[0] && topics[0].count >= 3 ? { label: topics[0].label, count: topics[0].count, trend: topics[0].trend } : null;
  const rating = latest?.avg_rating != null ? Number(latest.avg_rating) : null;
  const was = before?.avg_rating != null ? Number(before.avg_rating) : null;
  return {
    id: m.id,
    name: m.app_name,
    rating,
    ratingDelta: rating != null && was != null ? Math.round((rating - was) * 100) / 100 : null,
    newReviews: week.reduce((a, s) => a + (s.new_review_count || 0), 0),
    newNegative: week.reduce((a, s) => a + (s.new_negative_count || 0), 0),
    release,
    topComplaint: top,
    complaintSample: sample,
  };
}

export async function buildBrief(email, now = Date.now()) {
  await ensurePulseSchema();
  await ensureScansSchema();
  const { rows: mine } = await sql`SELECT id, app_name FROM pulse_monitors WHERE user_email = ${email} AND kind = 'mine' AND status = 'active' ORDER BY id LIMIT 12`;
  const apps = [];
  for (const m of mine) apps.push(await appSummary(m, now));

  const { rows: ch } = await sql`
    SELECT c.title, c.detail, m.app_name FROM pulse_changes c JOIN pulse_monitors m ON m.id = c.monitor_id
    WHERE m.user_email = ${email} AND m.kind = 'other' AND c.detected_at >= ${new Date(now - 7 * DAY).toISOString()}
    ORDER BY c.detected_at DESC, c.id DESC LIMIT 8
  `;
  const rivals = ch.map((c) => ({ app: c.app_name, title: c.title, detail: c.detail ? String(c.detail).slice(0, 160) : null }));

  const todos = [];
  for (const p of (await loadProjects(email)).slice(0, 20)) {
    const { tasks } = computeProjectTasks(p.scans, await loadStatusMap(email, p.key), await loadCustomTasks(email, p.key));
    for (const t of tasks) if (t.status === "todo" || t.status === "inprogress") todos.push({ app: p.appName, title: t.title, severity: t.severity });
  }
  todos.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "bad" ? -1 : 1));

  return {
    generatedAt: new Date(now).toISOString(),
    from: new Date(now - 7 * DAY).toISOString(),
    apps,
    rivals,
    todos: todos.slice(0, 3),
    openTaskCount: todos.length,
    empty: !apps.length && !rivals.length && !todos.length,
  };
}

const arrow = (d) => (d == null || d === 0 ? "" : d > 0 ? ` (▲ ${d})` : ` (▼ ${Math.abs(d)})`);
const trendWord = (t) => (t === "up" ? ", rising" : t === "down" ? ", easing" : "");

function appLine(a) {
  const bits = [];
  if (a.rating != null) bits.push(`${a.rating.toFixed(2)} ★${arrow(a.ratingDelta)}`);
  bits.push(`${a.newReviews} new review${a.newReviews === 1 ? "" : "s"}${a.newNegative ? ` (${a.newNegative} negative)` : ""}`);
  if (a.release) bits.push(`version ${a.release} released`);
  return bits.join(", ");
}

// Plain text, also used for Slack / Discord / webhook.
export function briefToText(b) {
  const out = [];
  if (b.apps.length) {
    out.push("Your apps");
    for (const a of b.apps) {
      out.push(`• ${a.name}: ${appLine(a)}`);
      if (a.topComplaint) out.push(`   Most complained about: ${a.topComplaint.label} (${a.topComplaint.count} mentions${trendWord(a.topComplaint.trend)})`);
    }
  }
  if (b.rivals.length) {
    out.push("", "What your rivals did");
    for (const r of b.rivals) out.push(`• ${r.app}: ${r.title}`);
  }
  if (b.todos.length) {
    out.push("", `Do this first${b.openTaskCount > b.todos.length ? ` (${b.openTaskCount} open in total)` : ""}`);
    b.todos.forEach((t, i) => out.push(`${i + 1}. [${SEV[t.severity] || t.severity}] ${t.title} (${t.app})`));
  }
  return out.join("\n").trim();
}

export function briefToHtml(b, { unsubscribeUrl }) {
  const e = escapeHtml;
  const h = (t) => `<h3 style="color:#1A1F36;font-size:15px;margin:22px 0 8px;">${t}</h3>`;
  const li = (s) => `<li style="margin:0 0 6px;font-size:14px;color:#1A1F36;">${s}</li>`;
  let body = "";
  if (b.apps.length) {
    body += h("Your apps") + "<ul style=\"padding-left:18px;margin:0;\">" + b.apps.map((a) => li(`<strong>${e(a.name)}</strong>: ${e(appLine(a))}${a.topComplaint ? `<br/><span style="color:#697386;">Most complained about: ${e(a.topComplaint.label)} (${a.topComplaint.count} mentions${trendWord(a.topComplaint.trend)})</span>` : ""}`)).join("") + "</ul>";
  }
  if (b.rivals.length) body += h("What your rivals did") + "<ul style=\"padding-left:18px;margin:0;\">" + b.rivals.map((r) => li(`<strong>${e(r.app)}</strong>: ${e(r.title)}`)).join("") + "</ul>";
  if (b.todos.length) body += h(`Do this first${b.openTaskCount > b.todos.length ? ` <span style="color:#9AA2B1;font-weight:normal;">(${b.openTaskCount} open in total)</span>` : ""}`) + "<ol style=\"padding-left:18px;margin:0;\">" + b.todos.map((t) => li(`<strong>${e(SEV[t.severity] || t.severity)}:</strong> ${e(t.title)} <span style="color:#697386;">(${e(t.app)})</span>`)).join("") + "</ol>";
  const home = `https://${host()}`;
  return `<div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto;">
  <h2 style="color:#1A1F36;margin-bottom:4px;">Your week in apps</h2>
  <div style="color:#9AA2B1;font-size:12px;">Last 7 days, from Kick My Apps</div>
  ${body}
  <p style="margin-top: 24px;"><a href="${home}/console/pulse" style="background:#F5433A;color:#fff;padding: 12px 16px;border-radius: 999px;text-decoration:none;font-size: 14px;">Open Kick My Apps</a></p>
  <p style="color:#9AA2B1;font-size: 11px;margin-top: 24px;">You're getting this because you turned on the weekly brief in your account settings. <a href="${e(unsubscribeUrl)}" style="color:#9AA2B1;text-decoration:underline;">Turn it off</a></p>
</div>`;
}

export const briefUnsubscribeUrl = (token) => `https://${host()}/unsubscribe?type=brief&token=${encodeURIComponent(token)}`;
export const briefHomeUrl = () => `https://${host()}/console/pulse`;
