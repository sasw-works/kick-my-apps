"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UploadFlow from "./UploadFlow";
import HealthReport from "./HealthReport";
import MarketingSections from "./MarketingSections";

export default function AppFlow({ showMarketing = true, handoffToConsole = false }) {
  const router = useRouter();
  const [stage, setStage] = useState("upload"); // upload | report
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reportData, setReportData] = useState(null);
  const [appLabel, setAppLabel] = useState("Uygulaman");
  const [history, setHistory] = useState([]);
  const [scanId, setScanId] = useState(null);
  const [scanStoreUrl, setScanStoreUrl] = useState("");
  const [screenshotUrls, setScreenshotUrls] = useState([]);

  // /console tarafında: sessionStorage'da bekleyen bir rapor var mı diye bak, varsa hemen göster.
  useEffect(() => {
    if (handoffToConsole) return; // Bu instance handoff YAPAN taraf (anasayfa), alıcı değil.
    try {
      const pending = sessionStorage.getItem("kma-pending-report");
      if (pending) {
        const parsed = JSON.parse(pending);
        setReportData(parsed.reportData);
        setAppLabel(parsed.appLabel);
        setHistory(parsed.history || []);
        setScanId(parsed.scanId ?? null);
        setScanStoreUrl(parsed.scanStoreUrl || "");
        setScreenshotUrls(parsed.screenshotUrls || []);
        setStage("report");
        sessionStorage.removeItem("kma-pending-report");
      }
    } catch {
      // yoksay
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async (files, storeUrl, appName) => {
    setAnalyzing(true);
    setErrorMessage("");
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      if (storeUrl) formData.append("storeUrl", storeUrl);
      formData.append("appName", appName);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.status === 413
            ? "Yüklenen ekran görüntüleri çok büyük. Lütfen daha az veya daha küçük boyutlu görsellerle tekrar dene."
            : `Sunucudan beklenmeyen bir yanıt geldi (${res.status}). Lütfen tekrar dene.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      const screenshotObjectUrls = files.map((f) => URL.createObjectURL(f));

      const badCount = (data.findings || []).filter((f) => f.status === "bad").length;
      const warnCount = (data.findings || []).filter((f) => f.status === "warn").length;
      const goodCount = (data.findings || []).filter((f) => f.status === "good").length;

      let savedScanId = null;
      let savedHistory = [];
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
        savedScanId = saveData.id ?? null;
      } catch {
        savedScanId = null;
      }

      try {
        const histRes = await fetch(`/api/history?appName=${encodeURIComponent(appName)}`);
        const histData = await histRes.json();
        savedHistory = histData.scans || [];
      } catch {
        savedHistory = [];
      }

      if (handoffToConsole) {
        // Rapor hazır — sol menülü /console görünümüne devret.
        try {
          sessionStorage.setItem(
            "kma-pending-report",
            JSON.stringify({
              reportData: data,
              appLabel: appName,
              history: savedHistory,
              scanId: savedScanId,
              scanStoreUrl: storeUrl || "",
              screenshotUrls: screenshotObjectUrls,
            })
          );
        } catch {
          // yoksay
        }
        router.push("/console");
        return;
      }

      setReportData(data);
      setAppLabel(appName);
      setScanStoreUrl(storeUrl || "");
      setScreenshotUrls(screenshotObjectUrls);
      setHistory(savedHistory);
      setScanId(savedScanId);
      setStage("report");
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong, want to try again?");
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
    <div key={stage} className="page-fade">
      <style>{`
        @keyframes page-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-fade { animation: page-fade-in 0.35s ease; }
      `}</style>
      {stage === "upload" ? (
        <>
          <UploadFlow onAnalyze={handleAnalyze} analyzing={analyzing} errorMessage={errorMessage} />
          {showMarketing && <MarketingSections />}
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
          onClose={() => router.push("/console/reports")}
        />
      )}
    </div>
  );
}
