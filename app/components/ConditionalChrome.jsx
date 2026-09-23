"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function ConditionalChrome({ children }) {
  const pathname = usePathname();
  const isConsole = pathname?.startsWith("/console");
  // /support still has its own light-only pastel design (hardcoded colors, not
  // theme tokens) and needs a real dark redesign before it can join the dark shell.
  const needsLightShell = pathname === "/support";

  if (isConsole) return children;

  if (needsLightShell) {
    return (
      <>
        <Header />
        {children}
        <Footer />
      </>
    );
  }

  // Every other non-console page uses the "KMA Dark" shell (Figma 4071:2).
  return (
    <div className="kma-dark">
      <div className="kma-glow" aria-hidden="true" />
      <Header />
      {children}
      <Footer />
    </div>
  );
}
