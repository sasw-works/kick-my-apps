"use client";

import AppFlow from "../components/AppFlow";

export default function ConsoleDashboardPage() {
  return (
    <main className="min-h-screen px-6 py-8" style={{ background: "var(--ink)" }}>
      <div className="max-w-[1240px] mx-auto">
        <AppFlow showMarketing={false} />
      </div>
    </main>
  );
}
