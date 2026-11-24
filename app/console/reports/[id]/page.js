"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectKey } from "../../../lib/projects";
import HealthReport from "../../../components/HealthReport";
import AddScreens from "../../../components/AddScreens";
import { reportPath, parseReportId } from "../../../lib/reportPath";
import { Loader2 } from "lucide-react";

export default function ConsoleReportDetailPage() {
  const { id: idParam } = useParams();
  const router = useRouter();
  const [scan, setScan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [taskStatus, setTaskStatus] = useState({});
  const [history, setHistory] = useState([]);
  const [screens, setScreens] = useState([]);
  const [reload, setReload] = useState(0);
  const [isOwner, setIsOwner] = useState(true);
  const [error, setError] = useState("");
  // "43-instagram" -> 43. Only the number is ever looked up; the name part is cosmetic.
  const id = parseReportId(idParam);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/history?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setScan(d.scan);
        setIsOwner(d.isOwner !== false);
        setProgress(d.progress || null);
        setTaskStatus(d.taskStatus || {});
        setHistory(d.history || []);
        // Old /reports/43 links, or a stale/wrong name: show the canonical address. replaceState, not a
        // navigation -- nothing reloads, and the effect depends on the number, so it doesn't refetch.
        const canonical = reportPath(d.scan.id, d.scan.app_name);
        if (window.location.pathname !== canonical) window.history.replaceState(null, "", canonical);
      })
      .catch((err) => setError(err.message));
  }, [id, reload]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/history/screens?id=${id}`).then((r) => r.json()).then((d) => setScreens(Array.isArray(d.screens) ? d.screens : [])).catch(() => setScreens([]));
  }, [id, reload]);

  // An address that isn't a report number at all (/reports/abc) is a "not found" we can tell without asking the server.
  const message = id ? error : "Report not found.";
  if (message) {
    return (
      <main className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
        <div style={{ color: "var(--kick)", fontSize: 14 }}>{message}</div>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
        <Loader2 size={22} className="spin" color="var(--muted)" />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-[1120px] mx-auto kma-rpt-wrap">
        <style>{`.kma-rpt-wrap { margin-top: -24px; }`}</style>
        <HealthReport
          data={scan.result_json}
          appLabel={scan.app_name}
          onReset={() => router.push("/console")}
          history={history}
          scanId={scan.id}
          storeUrl={scan.store_url}
          taskStatus={taskStatus}
          tasksHref="/console/checklist"
          progress={progress}
          screenshots={screens}
          onClose={() => router.push("/console/reports")}
          topExtra={isOwner && scan.result_json && (
            <AddScreens
              inGrid
              scanId={scan.id}
              runs={scan.result_json.visualAdded?.runs || 0}
              hasVisual={!!scan.result_json.visualAdded || (scan.result_json.findings || []).some((f) => f.screenshotIndex) || !!scan.result_json.accessibilityChecks}
              onDone={() => setReload((n) => n + 1)}
            />
          )}
        />
      </div>
    </main>
  );
}
