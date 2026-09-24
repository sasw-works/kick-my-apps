"use client";

import AppSidebar from "../components/AppSidebar";
import { useTheme } from "../components/ThemeProvider";

export default function ConsoleLayout({ children }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={isDark ? "kma-dark" : ""}
      style={{ display: "flex", minHeight: "100vh", overflowX: "clip" }}
    >
      <AppSidebar />
      <div style={{ flex: 1, minWidth: 0, marginLeft: 290, background: "var(--ink)" }}>{children}</div>
    </div>
  );
}
