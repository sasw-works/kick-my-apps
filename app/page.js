"use client";

import React, { useState } from "react";
import UploadFlow from "./components/UploadFlow";
import HealthReport from "./components/HealthReport";
import HistoryList from "./components/HistoryList";
import CompareView from "./components/CompareView";

export default function Home() {
  const [stage, setStage] = useState("upload"); // upload | report | history | compare
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reportData, setReportData] = useState(null);
  const [appLabel, setAppLabel] = useState("Uygulaman");
  const [history, setHistory] = useState([]);
  const [compareScans, setCompareScans] = useState([]);
  const [compareError, setCompareError] = useState("");

  const handleAnalyze = async (files, storeUrl, appName) => {
    setAnalyzing(true);
    setErrorMessage("");
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      if (storeUrl) formData.append("storeUrl", storeUrl);
      formData.append("appName", appName);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analiz başarısız oldu.");
      }

      setReportData(data);
      setAppLabel(appName);

      const badCount = (data.findings || []).filter((f) => f.status === "bad").length;
      const warnCount = (data.findings || []).filter((f) => f.status === "warn").length;
      const goodCount = (data.findings || []).filter((f) => f.status === "good").length;

      try {
        await fetch("/api/history", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            appName,
            healthScore: data.healthScore,
            badCount,
            warnCount,
            goodCount,
            resultJson: data,
          }),
        });
      } catch {
        // sessizce yut, geçmiş kaydı ürünün ana akışını bloklamamalı
      }

      try {
        const histRes = await fetch(`/api/history?appName=${encodeURIComponent(appName)}`);
        const histData = await histRes.json();
        setHistory(histData.scans || []);
      } catch {
        setHistory([]);
      }

      setStage("report");
    } catch (err) {
      setErrorMessage(err.message || "Bir şeyler ters gitti, tekrar dener misin?");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setStage("upload");
    setReportData(null);
    setErrorMessage("");
    setHistory([]);
  };

  const handleViewHistory = () => {
    setStage("history");
  };

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
    <main className="min-h-screen bg-[#F6F8FA] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {stage === "upload" && (
          <UploadFlow
            onAnalyze={handleAnalyze}
            analyzing={analyzing}
            errorMessage={errorMessage}
            onViewHistory={handleViewHistory}
          />
        )}
        {stage === "report" && (
          <HealthReport
            data={reportData}
            appLabel={appLabel}
            onReset={handleReset}
            history={history}
            onViewHistory={handleViewHistory}
          />
        )}
        {stage === "history" && (
          <HistoryList onBack={() => setStage("upload")} onCompare={handleCompare} />
        )}
        {stage === "compare" && compareScans.length === 2 && (
          <CompareView scans={compareScans} onBack={() => setStage("history")} />
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
