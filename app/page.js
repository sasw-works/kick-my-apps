"use client";

import AppFlow from "./components/AppFlow";

export default function Home() {
  return (
    <main className="min-h-screen px-4 md:px-8" style={{ background: "var(--ink)" }}>
      <div className="max-w-6xl mx-auto">
        <AppFlow showMarketing={true} />
      </div>
    </main>
  );
}
