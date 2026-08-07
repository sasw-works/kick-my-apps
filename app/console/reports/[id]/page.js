"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import HealthReport from "../../../components/HealthReport";
import { Loader2 } from "lucide-react";

export default function ConsoleReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [scan, setScan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/history?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setScan(d.scan);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--ink)" }}>
        <div style={{ color: "var(--kick)", fontSize: 14 }}>{error}</div>
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
