"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ClipboardList, GitCompare, Radio, Moon, Sun, X, ShieldCheck } from "lucide-react";
import LogoMark from "./LogoMark";
import { useTheme } from "./ThemeProvider";
import { useSession } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/console", label: "Dashboard", icon: LayoutDashboard },
  { href: "/console/reports", label: "Reports", icon: ClipboardList },
  { href: "/console/compare", label: "Compare", icon: GitCompare },
  { href: "/console/pulse", label: "Pulse", icon: Radio },
];

export default function AppSidebar({ mobileOpen = false, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const navItems = session?.user?.isAdmin
    ? [...NAV_ITEMS, { href: "/console/admin", label: "Admin", icon: ShieldCheck }]
    : NAV_ITEMS;
  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "Guest";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className={`kma-sidebar ${mobileOpen ? "kma-sidebar-mobile-open" : ""}`}>
      <style>{`
        .kma-sidebar {
          width: 290px; flex-shrink: 0; height: 100vh;
          background: var(--surface); border-right: 1px solid var(--ink-3);
          display: flex; flex-direction: column; padding: 24px 16px;
          font-family: var(--font-inter), sans-serif;
          position: fixed; top: 0; left: 0; overflow-y: auto; z-index: 46;
        }
        .kma-sidebar-close { display: none; }
        @media (max-width: 900px) {
          .kma-sidebar {
            /* 100vh can include the area behind Safari's own address/tab bar, which is what was
               pushing the user row behind it. 100dvh tracks the actual visible viewport instead. */
            height: 100dvh;
            padding-bottom: 0;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            box-shadow: 20px 0 40px rgba(0,0,0,0.15);
          }
          .kma-sidebar-mobile-open { transform: translateX(0); }
          .kma-sidebar-close {
            display: flex; align-items: center; justify-content: center;
            position: absolute; top: 24px; right: 16px;
            width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent;
            color: var(--chalk); cursor: pointer; z-index: 1;
          }
          .kma-sidebar-close:hover { background: var(--ink); }
        }
        .kma-sidebar-logo { display: flex; align-items: center; gap: 8px; padding: 0 8px; margin-bottom: 32px; }
        .kma-sidebar-section { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: var(--muted); padding: 0 8px; margin-bottom: 12px; }
        .kma-sidebar-nav { display: flex; flex-direction: column; gap: 16px; }
        .kma-sidebar-link {
          display: flex; align-items: center; gap: 12px; padding: 12px 12px; border-radius: 8px;
          font-size: 14px; color: var(--chalk); text-decoration: none; transition: background 0.15s ease;
        }
        .kma-sidebar-link:hover { background: var(--ink); }
        .kma-sidebar-link-active { background: color-mix(in srgb, var(--brand) 12%, transparent); color: var(--brand); font-weight: 600; }
        .kma-sidebar-spacer { flex: 1; }
        .kma-sidebar-user {
          display: flex; align-items: center; gap: 12px; padding: 12px 8px 0;
          border-top: 1px solid var(--ink-3); margin-top: 12px;
        }
        @media (max-width: 900px) {
          .kma-sidebar-user {
            /* Genuinely pinned to the bottom of the visible panel (not just last in the flex
               flow), and padded past the safe area so it clears the browser's own bottom bar /
               home indicator on every screen size instead of sitting behind it. */
            position: sticky; bottom: 0; z-index: 2;
            background: var(--surface);
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          }
        }
        .kma-sidebar-avatar {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, var(--brand), #7C6BFF);
          color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;
        }
        .kma-sidebar-avatar-img { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
        .kma-sidebar-user-info { cursor: pointer; }
        .kma-sidebar-plan {
          font-size: 11px; font-weight: 600; color: var(--yellow); background: color-mix(in srgb, var(--yellow) 15%, transparent);
          padding: 2px 8px; border-radius: 999px; width: fit-content; margin-top: 2px;
        }
        .kma-sidebar-theme {
          margin-left: auto; flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
        }
        .kma-sidebar-theme-light { background: #ffffff; border: none; }
      `}</style>

      <div className="kma-sidebar-logo">
        <LogoMark size={72} color="currentColor" />
        <button type="button" className="kma-sidebar-close" aria-label="Close menu" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <nav className="kma-sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`kma-sidebar-link ${active ? "kma-sidebar-link-active" : ""}`} onClick={onClose}>
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="kma-sidebar-spacer" />

      <div className="kma-sidebar-user">
        {session?.user?.image ? (
          <img src={session.user.image} alt="" className="kma-sidebar-avatar-img" />
        ) : (
          <div className="kma-sidebar-avatar">{initial}</div>
        )}
        <div className="kma-sidebar-user-info" onClick={() => session && router.push("/console/account")} title={session ? "Account" : ""}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--chalk)" }}>{displayName}</div>
          <div className="kma-sidebar-plan">{session ? "Free" : "Not signed in"}</div>
        </div>
        <button
          type="button"
          className={`kma-sidebar-theme ${theme === "light" ? "kma-sidebar-theme-light" : ""}`}
          aria-label="Toggle theme"
          onClick={toggleTheme}
        >
          {theme === "light" ? <Moon size={16} color="#1A2B3B" /> : <Sun size={16} color="var(--chalk)" />}
        </button>
      </div>
    </aside>
  );
}
