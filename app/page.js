"use client";

import React, { useState } from "react";
import UploadFlow from "./components/UploadFlow";
import HealthReport from "./components/HealthReport";
import MarketingSections from "./components/MarketingSections";

export default function Home() {
  const [stage, setStage] = useState("upload"); // upload | report
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reportData, setReportData] = useState(null);
  const [appLabel, setAppLabel] = useState("Uygulaman");
  const [history, setHistory] = useState([]);
  const [scanId, setScanId] = useState(null);
  const [scanStoreUrl, setScanStoreUrl] = useState("");
  const [screenshotUrls, setScreenshotUrls] = useState([]);

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
      setScanStoreUrl(storeUrl || "");
      setScreenshotUrls(files.map((f) => URL.createObjectURL(f)));

      const badCount = (data.findings || []).filter((f) => f.status === "bad").length;
      const warnCount = (data.findings || []).filter((f) => f.status === "warn").length;
      const goodCount = (data.findings || []).filter((f) => f.status === "good").length;

      try {
        const saveRes = await fetch("/api/history", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            appName,
            healthScore: data.healthScore,
            badCount,
            warnCount,
            goodCount,
            resultJson: data,
            storeUrl,
          }),
        });
        const saveData = await saveRes.json();
        setScanId(saveData.id ?? null);
      } catch {
        setScanId(null);
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
    setScanId(null);
    setScanStoreUrl("");
    screenshotUrls.forEach((url) => URL.revokeObjectURL(url));
    setScreenshotUrls([]);
  };

  return (
    <main className="min-h-screen px-4 pb-4 md:px-8 md:pb-8" style={{ background: "var(--ink)" }}>
      <style>{`
        @keyframes page-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-fade { animation: page-fade-in 0.35s ease; }
      `}</style>
      <div className="max-w-6xl mx-auto">
        <div key={stage} className="page-fade">
          {stage === "upload" ? (
            <>
              <UploadFlow onAnalyze={handleAnalyze} analyzing={analyzing} errorMessage={errorMessage} />
              <MarketingSections />
            </>
          ) : (
            <HealthReport
              data={reportData}
              appLabel={appLabel}
              onReset={handleReset}
              history={history}
              scanId={scanId}
              storeUrl={scanStoreUrl}
              screenshots={screenshotUrls}
            />
          )}
        </div>
      </div>
    </main>
  );
}
