import { sql } from "@vercel/postgres";
import { fetchAppStoreReviews, computeReviewAnalytics } from "../../../lib/reviews";

export const runtime = "nodejs";

async function sendEmail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || "Kick My Apps <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend hatası: ${res.status} ${errText}`);
  }
  return res.json();
}

function buildDigestHtml({ appName, analytics }) {
  const stars = "★".repeat(Math.round(analytics.avgRating)) + "☆".repeat(5 - Math.round(analytics.avgRating));
  const distributionRows = analytics.ratingDistribution
    .slice()
    .reverse()
    .map(
      (r) =>
        `<tr><td style="padding:4px 8px;color:#697386;font-size:13px;">${r.star}★</td><td style="padding:4px 8px;font-size:13px;">${r.count} yorum</td></tr>`
    )
    .join("");

  const negativeBlock = analytics.mostHelpfulNegative
    ? `<p style="font-size:13px;color:#1A1F36;background:#F6F8FA;padding:12px;border-radius:8px;">
         <strong>En çok oy alan olumsuz yorum:</strong><br/>
         ${(analytics.mostHelpfulNegative.content || "").slice(0, 220)}
       </p>`
    : "";

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#1A1F36;">${appName} — Haftalık Yorum Özeti</h2>
      <p style="color:#697386;font-size:14px;">Son ${analytics.totalReviews} yorum üzerinden, ortalama <strong>${analytics.avgRating}</strong> ${stars}</p>
      <table>${distributionRows}</table>
      ${negativeBlock}
      <p style="margin-top:20px;">
        <a href="https://kick-my-apps.vercel.app" style="background:#F5433A;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px;">
          Tam Analizi Gör
        </a>
      </p>
      <p style="color:#9AA2B1;font-size:11px;margin-top:24px;">Bu e-postayı Kick My Apps üzerinden bu uygulamayı takip ettiğin için alıyorsun.</p>
    </div>
  `;
}

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
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
        const html = buildDigestHtml({ appName: subscribers[0].app_name, analytics });

        for (const sub of subscribers) {
          await sendEmail({
            to: sub.email,
            subject: `${sub.app_name} — Haftalık Yorum Özeti`,
            html,
          });
        }
        results.push({ storeUrl, sent: subscribers.length });
      } catch (err) {
        results.push({ storeUrl, error: err.message });
      }
    }

    return Response.json({ ok: true, results });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Haftalık gönderim başarısız: " + err.message }, { status: 500 });
  }
}
