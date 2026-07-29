"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("kma-theme", next);
    } catch {
      // localStorage erişilemezse sessizce yoksay — tema hâlâ bu oturumda çalışır
    }
  };

  return (
    <button className="theme-toggle-btn" onClick={toggle} aria-label="Temayı değiştir">
      <style>{`
        .theme-toggle-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--ink-3);
          background: var(--ink-2);
          cursor: pointer;
          flex-shrink: 0;
        }
      `}</style>
      {theme === "dark" ? (
        <Sun size={25} color="var(--muted)" strokeWidth={2} />
      ) : (
        <Moon size={25} color="var(--muted)" strokeWidth={2} />
      )}
    </button>
  );
}
