"use client";

import AppFlow from "../components/AppFlow";

// The shell already paints the Console's radial light and ground colour (see ConsoleShell), so this page
// only supplies the content column.
export default function ConsoleDashboardPage() {
  return (
    <main style={{ position: "relative", isolation: "isolate", margin: "-52px -50px 0", padding: "0 24px 32px" }}>
      <div className="max-w-[1240px] mx-auto" style={{ position: "relative", zIndex: 1 }}>
        <AppFlow showMarketing={false} />
      </div>
    </main>
  );
}
