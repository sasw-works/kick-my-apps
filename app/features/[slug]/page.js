import { notFound } from "next/navigation";
import { FEATURES_PAGES } from "../../lib/marketingPages";
import MarketingSubpage from "../../components/MarketingSubpage";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = FEATURES_PAGES[slug];
  if (!page) return {};
  return { title: `${page.title} — Kick My Apps`, description: page.subtitle };
}

export default async function FeaturePage({ params }) {
  const { slug } = await params;
  const page = FEATURES_PAGES[slug];
  if (!page) notFound();
  return <MarketingSubpage page={page} />;
}
