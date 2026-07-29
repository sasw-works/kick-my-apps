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

  const handleAnalyze = async (files, storeUrl) => {
    setAnalyzing(true);
    setErrorMessage("");
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      if (storeUrl) formData.append("storeUrl", storeUrl);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analiz başarısız oldu.");
      }

      setReportData(data);
      setAppLabel(storeUrl ? new URL(storeUrl).pathname.split("/").filter(Boolean).pop() || "Uygulaman" : "Yüklenen Ekranlar");
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
  };

  return (
    <main className="min-h-screen bg-[#14151a] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {stage === "upload" ? (
          <UploadFlow onAnalyze={handleAnalyze} analyzing={analyzing} errorMessage={errorMessage} />
        ) : (
          <HealthReport data={reportData} appLabel={appLabel} onReset={handleReset} />
        )}
      </div>
    </main>
  );
}
