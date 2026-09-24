"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import { useTheme } from "./ThemeProvider";

export default function ConditionalChrome({ children }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isConsole = pathname?.startsWith("/console");
  const isDark = theme === "dark";

  if (isConsole) return children;

  return (
    <div className={isDark ? "kma-dark" : ""}>
      {isDark && <div className="kma-glow" aria-hidden="true" />}
      <Header />
      {children}
      <Footer />
    </div>
  );
}
