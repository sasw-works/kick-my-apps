"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import HealthReport from "../../../components/HealthReport";
import { reportPath, parseReportId } from "../../../lib/reportPath";
import { Loader2 } from "lucide-react";

export default function ConsoleReportDetailPage() {
  const { id: idParam } = useParams();
  const router = useRouter();
  const [scan, setScan] = useState(null);
  const [error, setError] = useState("");
  // "43-instagram" -> 43. Only the number is ever looked up; the name part is cosmetic.
  const id = parseReportId(idParam);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/history?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setScan(d.scan);
        // Old /reports/43 links, or a stale/wrong name: show the canonical address. replaceState, not a
        // navigation -- nothing reloads, and the effect depends on the number, so it doesn't refetch.
        const canonical = reportPath(d.scan.id, d.scan.app_name);
        if (window.location.pathname !== canonical) window.history.replaceState(null, "", canonical);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  // An address that isn't a report number at all (/reports/abc) is a "not found" we can tell without asking the server.
  const message = id ? error : "Report not found.";
  if (message) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--ink)" }}>
        <div style={{ color: "var(--kick)", fontSize: 14 }}>{message}</div>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--ink)" }}>
        <Loader2 size={22} className="spin" color="var(--muted)" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8" style={{ background: "var(--ink)" }}>
      <div className="max-w-[1240px] mx-auto">
        <HealthReport
          data={scan.result_json}
          appLabel={scan.app_name}
          onReset={() => router.push("/console")}
          history={[]}
          scanId={scan.id}
          storeUrl={scan.store_url}
          screenshots={[]}
          onClose={() => router.push("/console/reports")}
        />
      </div>
    </main>
  );
}
