"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import HealthReport from "../../components/HealthReport";

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/history?id=${params.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Tarama alınamadı.");
        setScan(data.scan);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  return (
    <main
      className="min-h-screen px-4 pb-4 md:px-8 md:pb-8"
      style={{ background: "var(--ink)", paddingTop: 100 }}
    >
      <div className="max-w-[1240px] mx-auto">
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "60px 0" }}>
            <Loader2 size={22} style={{ margin: "0 auto 8px", animation: "spin 0.9s linear infinite" }} />
            Yükleniyor…
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", color: "var(--kick)", padding: "60px 0" }}>{error}</div>
        ) : scan ? (
          <HealthReport
            data={scan.result_json}
            appLabel={scan.app_name}
            onReset={() => router.push("/history")}
            history={[]}
            scanId={scan.id}
            storeUrl={scan.store_url || ""}
          />
        ) : null}
      </div>
    </main>
  );
}
