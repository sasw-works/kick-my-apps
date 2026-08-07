"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, GitCompare, Radio } from "lucide-react";
import LogoMark from "./LogoMark";

const NAV_ITEMS = [
  { href: "/console", label: "Dashboard", icon: LayoutDashboard },
  { href: "/console/reports", label: "Reports", icon: ClipboardList },
  { href: "/console/compare", label: "Compare", icon: GitCompare },
  { href: "/console/pulse", label: "Pulse", icon: Radio },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="kma-sidebar">
      <style>{`
        .kma-sidebar {
          width: 260px; flex-shrink: 0; height: 100vh;
          background: var(--ink-2); border-right: 1px solid var(--ink-3);
          display: flex; flex-direction: column; padding: 24px 16px;
          font-family: var(--font-inter), sans-serif;
          position: fixed; top: 0; left: 0; overflow-y: auto; z-index: 40;
        }
        .kma-sidebar-logo { display: flex; align-items: center; gap: 8px; padding: 0 8px; margin-bottom: 28px; }
        .kma-sidebar-section { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: var(--muted); padding: 0 8px; margin-bottom: 10px; }
        .kma-sidebar-nav { display: flex; flex-direction: column; gap: 7px; }
        .kma-sidebar-link {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px;
          font-size: 14.5px; color: var(--chalk); text-decoration: none; transition: background 0.15s ease;
        }
        .kma-sidebar-link:hover { background: var(--ink); }
        .kma-sidebar-link-active { background: color-mix(in srgb, var(--brand) 12%, transparent); color: var(--brand); font-weight: 600; }
        .kma-sidebar-spacer { flex: 1; }
        .kma-sidebar-user {
          display: flex; align-items: center; gap: 10px; padding: 12px 8px 0;
          border-top: 1px solid var(--ink-3); margin-top: 12px;
        }
        .kma-sidebar-avatar {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, var(--brand), #7C6BFF);
          color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;
        }
        .kma-sidebar-plan {
          font-size: 11px; font-weight: 600; color: var(--yellow); background: color-mix(in srgb, var(--yellow) 15%, transparent);
          padding: 1px 8px; border-radius: 999px; width: fit-content; margin-top: 2px;
        }
      `}</style>

      <div className="kma-sidebar-logo">
        <LogoMark size={67} />
      </div>

      <nav className="kma-sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`kma-sidebar-link ${active ? "kma-sidebar-link-active" : ""}`}>
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="kma-sidebar-spacer" />

      <div className="kma-sidebar-user">
        <div className="kma-sidebar-avatar">K</div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--chalk)" }}>Kullanıcı</div>
          <div className="kma-sidebar-plan">Ultimate</div>
        </div>
      </div>
    </aside>
  );
}
