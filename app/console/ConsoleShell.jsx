"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import { useTheme } from "../components/ThemeProvider";

export default function ConsoleShell({ children }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={isDark ? "kma-dark" : ""}>
      <style>{`
        .kma-console-shell { display: flex; min-height: 100vh; overflow-x: clip; }
        .kma-console-main { flex: 1; min-width: 0; margin-left: 290px; background: var(--ink); }
        .kma-console-topbar { display: none; }
        .kma-console-backdrop { display: none; }

        @media (max-width: 900px) {
          .kma-console-main { margin-left: 0; padding-top: 56px; }
          .kma-console-topbar {
            display: flex; align-items: center; gap: 12px;
            position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 45;
            padding: 0 16px; background: var(--surface); border-bottom: 1px solid var(--ink-3);
          }
          .kma-console-topbar button {
            display: flex; align-items: center; justify-content: center;
            width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent;
            color: var(--chalk); cursor: pointer;
          }
          .kma-console-topbar button:hover { background: var(--ink); }
          .kma-console-backdrop.open {
            display: block; position: fixed; inset: 0; z-index: 39;
            background: rgba(10, 12, 16, 0.45);
          }
        }
      `}</style>

      <div className="kma-console-topbar" style={{ display: mobileOpen ? "none" : undefined }}>
        <button type="button" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
        </button>
      </div>

      <div className="kma-console-shell">
        <div className={`kma-console-backdrop ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)} />
        <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="kma-console-main">{children}</div>
      </div>
    </div>
  );
}
