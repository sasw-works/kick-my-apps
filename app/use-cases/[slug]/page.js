import { notFound } from "next/navigation";
import { USE_CASES_PAGES } from "../../lib/marketingPages";
import MarketingSubpage from "../../components/MarketingSubpage";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = USE_CASES_PAGES[slug];
  if (!page) return {};
  return { title: `${page.title} — Kick My Apps`, description: page.subtitle };
}

export default async function UseCasePage({ params }) {
  const { slug } = await params;
  const page = USE_CASES_PAGES[slug];
  if (!page) notFound();
  return <MarketingSubpage page={page} />;
}
