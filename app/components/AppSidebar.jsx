"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, X } from "lucide-react";
import LogoMark from "./LogoMark";
import { useTheme } from "./ThemeProvider";
import { useSession } from "next-auth/react";
import { SkeletonBlock } from "./Skeleton";

// Icons come straight from the Figma file (4240:171); they are white line art, so the light theme
// inverts them with CSS.
const NAV_ITEMS = [
  { href: "/console", label: "Dashboard", icon: "/console/nav-dashboard.svg", size: 18 },
  { href: "/console/reports", label: "Insights", icon: "/console/nav-reports.svg", size: 16 },
  { href: "/console/tasks", label: "Tasks", icon: "/console/nav-tasks.svg", size: 17 },
  { href: "/console/compare", label: "Compare", icon: "/console/nav-compare.svg", size: 18 },
  { href: "/console/pulse", label: "Monitor", icon: "/console/nav-monitor.svg", size: 17 },
  { href: "/console/checklist", label: "Checklist", icon: "/console/nav-checklist.svg", size: 16 },
];
const ADMIN_ITEM = { href: "/console/admin", label: "Admin", icon: "/console/nav-admin.svg", size: 15 };

export default function AppSidebar({ mobileOpen = false, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();
  const sessionLoading = status === "loading";
  const navItems = session?.user?.isAdmin
    ? [...NAV_ITEMS, ADMIN_ITEM]
    : NAV_ITEMS;
  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "Guest";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className={`kma-sidebar ${mobileOpen ? "kma-sidebar-mobile-open" : ""}`}>
      <style>{`
        /* Figma 4240:185 "Sidebar": 280px wide, 50px in from the top/left/bottom, white at 3%, 8px corners. */
        .kma-sidebar {
          width: 280px; flex-shrink: 0;
          position: fixed; top: 50px; left: 50px; bottom: 50px; z-index: 46;
          background: rgba(255, 255, 255, 0.03); border-radius: 8px;
          display: flex; flex-direction: column;
          font-family: var(--font-inter), sans-serif; letter-spacing: -0.2px;
          overflow-y: auto;
        }
        .kma-console:not(.kma-dark) .kma-sidebar { background: var(--surface); box-shadow: 0 0 0 1px var(--ink-3); }
        .kma-console:not(.kma-dark) .kma-sidebar-icon { filter: invert(1); }
        .kma-sidebar-close { display: none; }
        .kma-sidebar-logo { display: flex; align-items: center; justify-content: space-between; padding: 40px 40px 64px; color: var(--chalk); }
        .kma-sidebar-nav { display: flex; flex-direction: column; gap: 24px; padding: 0 24px; flex: 1; }
        .kma-sidebar-link {
          display: flex; align-items: center; gap: 12px; height: 44px; box-sizing: border-box; padding: 0 16px;
          border-radius: 99px; border: 1px solid transparent;
          font-size: 15px; line-height: 32px; color: var(--chalk); text-decoration: none;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .kma-sidebar-link:hover { background: rgba(255, 255, 255, 0.05); }
        .kma-console:not(.kma-dark) .kma-sidebar-link:hover { background: var(--ink); }
        .kma-sidebar-link:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .kma-sidebar-link-active, .kma-sidebar-link-active:hover {
          background: rgba(43, 89, 255, 0.25); border-color: rgba(43, 89, 255, 0.5);
          backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
        }
        .kma-sidebar-icon-box { width: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .kma-sidebar-icon { display: block; max-width: none; }
        .kma-sidebar-profile { padding: 0 16px 24px; display: flex; flex-direction: column; gap: 24px; }
        .kma-sidebar-sep { display: block; width: 100%; height: 1px; border: 0; border-top: 1px dashed rgba(255, 255, 255, 0.22); margin: 0; }
        .kma-console:not(.kma-dark) .kma-sidebar-sep { border-top-color: var(--ink-3); }
        .kma-sidebar-user { display: flex; align-items: center; gap: 12px; }
        .kma-sidebar-user-info { display: flex; align-items: center; gap: 15px; flex: 1; min-width: 0; padding-left: 16px; cursor: pointer; }
        .kma-sidebar-avatar {
          width: 50px; height: 50px; border-radius: 50%; flex-shrink: 0; background: #2b59ff;
          color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 500; font-size: 16px;
        }
        .kma-sidebar-avatar-img { width: 50px; height: 50px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
        .kma-sidebar-name { font-size: 15px; line-height: 20px; color: var(--chalk); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .kma-sidebar-plan { font-size: 13px; line-height: 20px; color: var(--muted); }
        .kma-sidebar-chevron { flex-shrink: 0; width: 20px; height: 20px; display: block; }
        .kma-console:not(.kma-dark) .kma-sidebar-chevron { filter: invert(1); }
        .kma-sidebar-theme {
          flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
        }
        .kma-sidebar-theme-light { background: #ffffff; border: none; }
        @media (max-width: 900px) {
          .kma-sidebar {
            /* 100vh can include the area behind Safari's own address/tab bar, which is what was
               pushing the user row behind it. 100dvh tracks the actual visible viewport instead. */
            top: 0; left: 0; bottom: auto; height: 100dvh; border-radius: 0;
            background: var(--surface);
            transform: translateX(-100%); transition: transform 0.25s ease;
            box-shadow: 20px 0 40px rgba(0,0,0,0.15);
          }
          .kma-sidebar-mobile-open { transform: translateX(0); }
          .kma-sidebar-logo { padding: 28px 24px 32px; }
          .kma-sidebar-close {
            display: flex; align-items: center; justify-content: center;
            width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent;
            color: var(--chalk); cursor: pointer;
          }
          .kma-sidebar-close:hover { background: var(--ink); }
          .kma-sidebar-profile {
            /* Genuinely pinned to the bottom of the visible panel (not just last in the flex
               flow), and padded past the safe area so it clears the browser's own bottom bar /
               home indicator on every screen size instead of sitting behind it. */
            position: sticky; bottom: 0; z-index: 2; background: var(--surface);
            padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>

      <div className="kma-sidebar-logo">
        {/* The mark's viewBox leaves empty room to the right of the wordmark; crop it so the artwork is the 200px wide the Figma logo is. */}
        <div style={{ width: 200, height: 46, overflow: "hidden", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <LogoMark size={65} color="currentColor" />
        </div>
        <button type="button" className="kma-sidebar-close" aria-label="Close menu" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <nav className="kma-sidebar-nav">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/console" && pathname.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href} className={`kma-sidebar-link ${active ? "kma-sidebar-link-active" : ""}`} onClick={onClose}>
              <span className="kma-sidebar-icon-box">
                <img src={item.icon} alt="" width={item.size} height={item.size} className="kma-sidebar-icon" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="kma-sidebar-profile">
        <hr className="kma-sidebar-sep" />
        <div className="kma-sidebar-user">
          <div className="kma-sidebar-user-info" onClick={() => session && router.push("/console/account")} title={session ? "Account" : ""}>
            {sessionLoading ? (
              <SkeletonBlock width={50} height={50} radius={999} />
            ) : session?.user?.image ? (
              <img src={session.user.image} alt="" className="kma-sidebar-avatar-img" />
            ) : (
              <div className="kma-sidebar-avatar">{initial}</div>
            )}
            {sessionLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <SkeletonBlock width={90} height={12} />
                <SkeletonBlock width={50} height={12} />
              </div>
            ) : (
              <div style={{ minWidth: 0 }}>
                <div className="kma-sidebar-name">{displayName}</div>
                <div className="kma-sidebar-plan">{session ? "Free Plan" : "Not signed in"}</div>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`kma-sidebar-theme ${theme === "light" ? "kma-sidebar-theme-light" : ""}`}
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {theme === "light" ? <Moon size={16} color="#1A2B3B" /> : <Sun size={16} color="var(--chalk)" />}
          </button>
          <img src="/console/chevron.svg" alt="" className="kma-sidebar-chevron" />
        </div>
      </div>
    </aside>
  );
}
