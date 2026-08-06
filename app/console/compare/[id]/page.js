"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CompareView from "../../../components/CompareView";

export default function ConsoleSavedComparisonPage() {
  const { id } = useParams();
  const router = useRouter();
  const [scans, setScans] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/history/compare?comparisonId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setScans(d.scans || []);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <main className="min-h-screen px-6 py-8" style={{ background: "var(--ink)" }}>
      <div className="max-w-6xl mx-auto">
        {error && (
          <div style={{ color: "var(--kick)", fontSize: 13, textAlign: "center", marginTop: 12 }}>{error}</div>
        )}
        {scans && scans.length === 2 && (
          <CompareView scans={scans} onBack={() => router.push("/console/compare")} />
        )}
      </div>
    </main>
  );
}
