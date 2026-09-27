"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import UploadFlow from "./UploadFlow";
import HealthReport from "./HealthReport";
import DashboardSection from "./DashboardSection";
import CustomersSection from "./CustomersSection";
import FeaturesSection from "./FeaturesSection";
import AudienceSection from "./AudienceSection";
import PricingSection from "./PricingSection";
import VideoFeatureGrid from "./VideoFeatureGrid";
import LegacyFaqSection from "./LegacyFaqSection";
import MarketingSections from "./MarketingSections";

export default function AppFlow({ showMarketing = true }) {
  const router = useRouter();
  const [stage, setStage] = useState("upload"); // upload | report (report is a rare fallback only)
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reportData, setReportData] = useState(null);
  const [appLabel, setAppLabel] = useState("Your App");
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

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.status === 413
            ? "The uploaded screenshots are too large. Please try again with fewer or smaller images."
            : `Got an unexpected response from the server (${res.status}). Please try again.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      const badCount = (data.findings || []).filter((f) => f.status === "bad").length;
      const warnCount = (data.findings || []).filter((f) => f.status === "warn").length;
      const goodCount = (data.findings || []).filter((f) => f.status === "good").length;

      let savedScanId = null;
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

      // Report ready — always land on its own dedicated page (/console/reports/[id]),
      // exactly like clicking into a report from the Reports list. Never show it as an
      // overlay on top of whichever page (home or Dashboard) the query started from.
      if (savedScanId) {
        router.push(`/console/reports/${savedScanId}`);
        return;
      }

      // Rare fallback: the scan couldn't be saved (e.g. a database hiccup), so there's no
      // id to route to. Show the report inline here rather than losing the result entirely.
      const screenshotObjectUrls = files.map((f) => URL.createObjectURL(f));
      setReportData(data);
      setAppLabel(appName);
      setScanStoreUrl(storeUrl || "");
      setScreenshotUrls(screenshotObjectUrls);
      setHistory([]);
      setScanId(null);
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
          <UploadFlow onAnalyze={handleAnalyze} analyzing={analyzing} errorMessage={errorMessage} variant="dark" />
          {showMarketing && (
            <>
              <DashboardSection />
              <CustomersSection />
              <FeaturesSection />
              <AudienceSection />
              <PricingSection />
              <VideoFeatureGrid />
              <LegacyFaqSection />
              <MarketingSections />
            </>
          )}
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
