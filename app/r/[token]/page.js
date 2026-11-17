import { notFound } from "next/navigation";
import { sql } from "@vercel/postgres";
import HealthReport from "../../components/HealthReport";
import { ensureScansSchema } from "../../lib/ensureScansSchema";
import { isShareToken } from "../../lib/shareToken";

export const dynamic = "force-dynamic";

// Shared reports are for the person holding the link, not for search engines.
export const metadata = {
  title: "Shared report | Kick My Apps",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharedReportPage({ params }) {
  const { token } = await params;
  if (!isShareToken(token)) notFound();

  await ensureScansSchema();
  // Deliberately selects no owner column: nothing about who made the report is sent to the page.
  const { rows } = await sql`
    SELECT app_name, result_json FROM scans WHERE share_token = ${token} LIMIT 1;
  `;
  const scan = rows[0];
  if (!scan || !scan.result_json) notFound();

  return (
    <main className="min-h-screen px-4 pb-4 md:px-8 md:pb-8" style={{ background: "var(--ink)", paddingTop: 100 }}>
      <div className="max-w-[1240px] mx-auto">
        <HealthReport data={scan.result_json} appLabel={scan.app_name} readOnly />
      </div>
    </main>
  );
}
