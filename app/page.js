"use client";

import React, { useState } from "react";
import UploadFlow from "./components/UploadFlow";
import HealthReport from "./components/HealthReport";

export default function Home() {
  const [stage, setStage] = useState("upload"); // upload | report
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reportData, setReportData] = useState(null);
  const [appLabel, setAppLabel] = useState("Uygulaman");
  const [history, setHistory] = useState([]);

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

      // Sonucu geçmişe kaydet (başarısız olursa raporu göstermeye devam ederiz — kritik değil)
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
          }),
        });
      } catch {
        // sessizce yut, geçmiş kaydı ürünün ana akışını bloklamamalı
      }

      // Bu uygulama için geçmiş taramaları çek
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

  return (
    <main className="min-h-screen bg-[#14151a] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {stage === "upload" ? (
          <UploadFlow onAnalyze={handleAnalyze} analyzing={analyzing} errorMessage={errorMessage} />
        ) : (
          <HealthReport data={reportData} appLabel={appLabel} onReset={handleReset} history={history} />
        )}
      </div>
    </main>
  );
}
