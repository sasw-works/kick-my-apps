"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import UploadFlow from "./UploadFlow";
import AuthGate from "./AuthGate";
import { useSignInModal } from "./SignInModalProvider";
import { savePendingQuery, takePendingQuery, clearPendingQuery } from "../lib/pendingQuery";
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
  const [stage, setStage] = useState("upload"); // upload | gate (sign-up wall) | report (rare fallback only)
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reportData, setReportData] = useState(null);
  const [appLabel, setAppLabel] = useState("Your App");
  const [history, setHistory] = useState([]);
  const [scanId, setScanId] = useState(null);
  const [scanStoreUrl, setScanStoreUrl] = useState("");
  const [screenshotUrls, setScreenshotUrls] = useState([]);
  const [gateApp, setGateApp] = useState("");
  const pathname = usePathname();
  const { status } = useSession();
  const { open: openSignIn } = useSignInModal();
  const pendingChecked = useRef(false);

  // Nothing in the product runs without an account. A signed-out visitor who tries to analyze
  // lands on the sign-up screen instead; their query is remembered and runs right after sign-in.
  const sendToGate = async (files, storeUrl, appName) => {
    await savePendingQuery({ files, storeUrl, appName });
    setGateApp(appName);
    setStage("gate");
  };

  const handleAnalyze = async (files, storeUrl, appName) => {
    if (status === "loading") return; // session not known yet; ignore rather than guess
    if (status !== "authenticated") {
      await sendToGate(files, storeUrl, appName);
      return;
    }

    setAnalyzing(true);
    setErrorMessage("");
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      if (storeUrl) formData.append("storeUrl", storeUrl);
      formData.append("appName", appName);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });

      if (res.status === 401) {
        await sendToGate(files, storeUrl, appName);
        return;
      }

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

  // The gate replaces a long page, and the visitor pressed "analyze" from wherever they had
  // scrolled to (on a phone, far down the hero). Bring the gate itself into view.
  useEffect(() => {
    if (stage === "gate") window.scrollTo(0, 0);
  }, [stage]);

  // Just signed up / in and landed on the Dashboard: run what they asked for before the gate.
  // (Only in the Console -- that's where every sign-in flow lands.)
  useEffect(() => {
    if (status !== "authenticated" || !pathname?.startsWith("/console") || pendingChecked.current) return;
    pendingChecked.current = true;
    takePendingQuery().then((q) => {
      if (q) handleAnalyze(q.files, q.storeUrl, q.appName);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pathname]);

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
      {stage === "gate" ? (
        <AuthGate
          appName={gateApp}
          onSignUp={openSignIn}
          onBack={() => {
            clearPendingQuery();
            setStage("upload");
          }}
        />
      ) : stage === "upload" ? (
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
