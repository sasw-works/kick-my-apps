"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HistoryList from "../components/HistoryList";
import CompareView from "../components/CompareView";

function HistoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectId = searchParams.get("preselect");
  const appNameFilter = searchParams.get("appName");
  const [stage, setStage] = useState("list"); // list | compare
  const [compareScans, setCompareScans] = useState([]);
  const [compareError, setCompareError] = useState("");

  const handleCompare = async (ids) => {
    setCompareError("");
    try {
      const res = await fetch(`/api/history/compare?ids=${ids.join(",")}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Karşılaştırma verisi alınamadı.");
      setCompareScans(data.scans || []);
      setStage("compare");
    } catch (err) {
      setCompareError(err.message);
    }
  };

  return (
    <main
      className="min-h-screen px-4 pb-4 md:px-8 md:pb-8"
      style={{ background: "var(--ink)", paddingTop: 100 }}
    >
      <div className="max-w-6xl mx-auto">
        {stage === "list" && (
          <HistoryList
            onBack={() => router.push("/")}
            onCompare={handleCompare}
            preselectId={preselectId}
            appNameFilter={appNameFilter}
          />
        )}
        {stage === "compare" && compareScans.length === 2 && (
          <CompareView scans={compareScans} onBack={() => setStage("list")} />
        )}
        {compareError && (
          <div style={{ color: "var(--kick)", fontSize: 13, textAlign: "center", marginTop: 12 }}>
            {compareError}
          </div>
        )}
      </div>
    </main>
  );
}

export default HistoryPageContent;
