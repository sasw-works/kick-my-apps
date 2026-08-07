"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CompareView from "../../../components/CompareView";

export default function SavedComparisonPage() {
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
    <main className="min-h-screen px-4 pb-4 md:px-8 md:pb-8" style={{ background: "var(--ink)", paddingTop: 100 }}>
      <div className="max-w-[1240px] mx-auto">
        {error && <div style={{ color: "var(--kick)", fontSize: 13, textAlign: "center", marginTop: 12 }}>{error}</div>}
        {scans && scans.length === 2 && <CompareView scans={scans} onBack={() => router.push("/history")} />}
      </div>
    </main>
  );
}
