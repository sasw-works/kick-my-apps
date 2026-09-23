"use client";

import AppFlow from "../components/AppFlow";

export default function ConsoleDashboardPage() {
  return (
    <main
      className="min-h-screen px-6 py-8"
      style={{ background: "var(--ink)", position: "relative", isolation: "isolate", overflow: "hidden" }}
    >
      <div className="kma-glow" aria-hidden="true" />
      <div className="max-w-[1240px] mx-auto" style={{ position: "relative", zIndex: 1 }}>
        <AppFlow showMarketing={false} />
      </div>
    </main>
  );
}
