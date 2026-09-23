"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function ConditionalChrome({ children }) {
  const pathname = usePathname();
  const isConsole = pathname?.startsWith("/console");

  if (isConsole) return children;

  // Every non-console page uses the "KMA Dark" shell (Figma 4071:2).
  return (
    <div className="kma-dark">
      <div className="kma-glow" aria-hidden="true" />
      <Header />
      {children}
      <Footer />
    </div>
  );
}
