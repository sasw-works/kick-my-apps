import { notFound } from "next/navigation";
import { RESOURCES_PAGES } from "../../lib/marketingPages";
import MarketingSubpage from "../../components/MarketingSubpage";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = RESOURCES_PAGES[slug];
  if (!page) return {};
  return { title: `${page.title} — Kick My Apps`, description: page.subtitle };
}

export default async function ResourcePage({ params }) {
  const { slug } = await params;
  const page = RESOURCES_PAGES[slug];
  if (!page) notFound();
  return <MarketingSubpage page={page} />;
}
