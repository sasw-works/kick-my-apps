import { sql } from "@vercel/postgres";
import { fetchAppStoreReviews, computeReviewAnalytics } from "../../../lib/reviews";
import { readSecret, errorText } from "../../../lib/secrets";
import { ensureSubscriptionsTable, backfillMissingTokens } from "../../../lib/subscriptionsSchema";

export const runtime = "nodejs";

async function sendEmail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || "Kick My Apps <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${readSecret("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend error: ${res.status} ${errText}`);
  }
  return res.json();
}

function buildDigestHtml({ appName, analytics, unsubscribeUrl, homeUrl }) {
  const stars = "★".repeat(Math.round(analytics.avgRating)) + "☆".repeat(5 - Math.round(analytics.avgRating));
  const distributionRows = analytics.ratingDistribution
    .slice()
    .reverse()
    .map(
      (r) =>
        `<tr><td style="padding: 4px 8px;color:#697386;font-size: 14px;">${r.star}★</td><td style="padding: 4px 8px;font-size: 14px;">${r.count} reviews</td></tr>`
    )
    .join("");

  const negativeBlock = analytics.mostHelpfulNegative
    ? `<p style="font-size: 14px;color:#1A1F36;background:#F6F8FA;padding: 12px;border-radius: 8px;">
         <strong>Most-voted negative review:</strong><br/>
         ${(analytics.mostHelpfulNegative.content || "").slice(0, 220)}
       </p>`
    : "";

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#1A1F36;">${appName} — Weekly Review Summary</h2>
      <p style="color:#697386;font-size: 14px;">Based on the last ${analytics.totalReviews} reviews, average <strong>${analytics.avgRating}</strong> ${stars}</p>
      <table>${distributionRows}</table>
      ${negativeBlock}
      <p style="margin-top: 24px;">
        <a href="${homeUrl}" style="background:#F5433A;color:#fff;padding: 12px 16px;border-radius: 999px;text-decoration:none;font-size: 14px;">
          View Full Analysis
        </a>
      </p>
      <p style="color:#9AA2B1;font-size: 11px;margin-top: 24px;">
        You're receiving this email because you're tracking this app on Kick My Apps.
        <a href="${unsubscribeUrl}" style="color:#9AA2B1;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `;
}

export async function GET(req) {
  // Fails closed: without a configured CRON_SECRET nobody can trigger this. (It used to be open
  // whenever the secret was unset, which let anyone on the internet fire a mass email send.)
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" on its own once the variable exists.
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await ensureSubscriptionsTable();
    await backfillMissingTokens();
    const { rows: subs } = await sql`SELECT * FROM subscriptions;`;

    const byApp = {};
    for (const sub of subs) {
      if (!byApp[sub.store_url]) byApp[sub.store_url] = [];
      byApp[sub.store_url].push(sub);
    }

    const results = [];
    for (const [storeUrl, subscribers] of Object.entries(byApp)) {
      try {
        const reviews = await fetchAppStoreReviews(storeUrl);
        if (!reviews?.length) {
          results.push({ storeUrl, skipped: true });
          continue;
        }
        const analytics = computeReviewAnalytics(reviews);

        for (const sub of subscribers) {
          // Every recipient gets a link with their OWN token: opting out has to remove that one
          // person's subscription, not the whole batch (they may not even be the only person
          // watching this app).
          const canonicalHost = process.env.CANONICAL_HOST || "kick-my-apps.vercel.app";
          const unsubscribeUrl = `https://${canonicalHost}/unsubscribe?token=${sub.unsubscribe_token}`;
          const html = buildDigestHtml({ appName: subscribers[0].app_name, analytics, unsubscribeUrl, homeUrl: `https://${canonicalHost}` });
          await sendEmail({
            to: sub.email,
            subject: `${sub.app_name} — Weekly Review Summary`,
            html,
          });
        }
        results.push({ storeUrl, sent: subscribers.length });
      } catch (err) {
        results.push({ storeUrl, error: errorText(err) });
      }
    }

    return Response.json({ ok: true, results });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Weekly send failed: " + errorText(err) }, { status: 500 });
  }
}
