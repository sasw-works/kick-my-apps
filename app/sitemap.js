import { ALL_MARKETING_PAGES } from "./lib/marketingPages";

const HOST = process.env.CANONICAL_HOST || "kick-my-apps.vercel.app";
const BASE = `https://${HOST}`;

export default function sitemap() {
  const now = new Date();

  const staticEntries = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/support`, changeFrequency: "monthly", priority: 0.4 },
  ].map((e) => ({ ...e, lastModified: now }));

  // Features / Use Cases / Resources dropdown pages all come from the same slug map the
  // Header's dropdowns read from (app/lib/marketingPages.js), so a new entry there shows up
  // here automatically instead of needing a second list kept in sync by hand.
  const marketingEntries = Object.entries(ALL_MARKETING_PAGES).flatMap(([section, pages]) =>
    Object.keys(pages).map((slug) => ({
      url: `${BASE}/${section}/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    }))
  );

  return [...staticEntries, ...marketingEntries];
}
