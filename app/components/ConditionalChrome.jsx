"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function ConditionalChrome({ children }) {
  const pathname = usePathname();
  const isConsole = pathname?.startsWith("/console");
  const isHome = pathname === "/";

  if (isConsole) return children;

  // Home is migrating to the "KMA Dark" design section by section (Figma 4071:2).
  if (isHome) {
    return (
      <div className="kma-dark">
        <div className="kma-glow" aria-hidden="true" />
        <Header />
        {children}
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
