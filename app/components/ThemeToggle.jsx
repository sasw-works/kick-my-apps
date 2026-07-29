"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const applyTheme = (next) => {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("kma-theme", next);
    } catch {
      // localStorage erişilemezse sessizce yoksay — tema hâlâ bu oturumda çalışır
    }
  };

  return (
    <div className="theme-toggle">
      <style>{`
        .theme-toggle { display: flex; align-items: center; gap: 6px; }
        .theme-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--ink-3);
          background: var(--ink-2);
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .theme-btn-active { border-color: var(--kick); }
      `}</style>
      <button
        className={`theme-btn ${theme === "light" ? "theme-btn-active" : ""}`}
        onClick={() => applyTheme("light")}
        aria-label="Açık tema"
        aria-pressed={theme === "light"}
      >
        <Sun size={14} color={theme === "light" ? "var(--kick)" : "var(--muted)"} strokeWidth={2} />
      </button>
      <button
        className={`theme-btn ${theme === "dark" ? "theme-btn-active" : ""}`}
        onClick={() => applyTheme("dark")}
        aria-label="Koyu tema"
        aria-pressed={theme === "dark"}
      >
        <Moon size={14} color={theme === "dark" ? "var(--kick)" : "var(--muted)"} strokeWidth={2} />
      </button>
    </div>
  );
}
