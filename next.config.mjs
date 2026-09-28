// One address for the site. Every Vercel deployment answers on several hostnames (the production
// alias, a team alias, a branch alias, and a unique URL per deployment -- e.g. what the dashboard's
// "Visit" button opens). Google sign-in only works on hosts registered as OAuth redirect URIs, so
// signing in from any of the others fails with redirect_uri_mismatch. In production, requests
// arriving on any other *.vercel.app host are sent to the canonical one.
//
// - Production builds only (VERCEL_ENV): preview deployments are left alone so unmerged work stays
//   testable on its own URL.
// - /api/cron is exempt: Vercel's scheduled jobs don't follow redirects, so a redirect there would
//   silently stop the weekly digest.
// - Only *.vercel.app hosts are touched, and never the canonical host itself, so it can't loop.
// When a real domain is attached, set CANONICAL_HOST to it (and add its /api/auth/callback/google
// to the Google OAuth client).
const CANONICAL_HOST = process.env.CANONICAL_HOST || "kick-my-apps.vercel.app";
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const rules = [
      // The original standalone pages duplicated the Console and read data through the same APIs.
      // Old links (bookmarks, emails) now land on the Console equivalents, which require sign-in.
      { source: "/dashboard", destination: "/console", permanent: false },
      { source: "/history", destination: "/console/reports", permanent: false },
      { source: "/history/compare/:id", destination: "/console/compare/:id", permanent: false },
      { source: "/history/:id", destination: "/console/reports/:id", permanent: false },
    ];

    if (process.env.VERCEL_ENV === "production") {
      rules.unshift({
        source: "/:path((?!api/cron).*)",
        has: [{ type: "host", value: `(?!${escapeRegex(CANONICAL_HOST)}$).+\\.vercel\\.app` }],
        destination: `https://${CANONICAL_HOST}/:path`,
        permanent: false,
      });
    }
    return rules;
  },
};

export default nextConfig;
