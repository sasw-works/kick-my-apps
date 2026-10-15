// Same CANONICAL_HOST pattern app/api/cron/weekly-digest/route.js already uses, so this tracks
// the real production domain once that env var is set instead of hardcoding it twice.
const HOST = process.env.CANONICAL_HOST || "kick-my-apps.vercel.app";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything behind sign-in, plus API routes and the legacy pre-/console pages -- no
      // SEO value, and some require auth a crawler will never have.
      disallow: ["/api/", "/console/", "/dashboard", "/report", "/history", "/unsubscribe"],
    },
    sitemap: `https://${HOST}/sitemap.xml`,
  };
}
