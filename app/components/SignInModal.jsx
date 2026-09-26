"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import LogoMark from "./LogoMark";
import { useTheme } from "./ThemeProvider";
import { useSignInModal } from "./SignInModalProvider";
import SignInForm from "./SignInForm";

export default function SignInModal() {
  const { isOpen, close } = useSignInModal();
  const { status } = useSession();
  const { theme } = useTheme();
  const light = theme === "light";

  // Close automatically once a sign-in actually completes (session goes from
  // unauthenticated/loading to authenticated while the panel is open).
  useEffect(() => {
    if (isOpen && status === "authenticated") close();
  }, [isOpen, status, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  const c = light
    ? { panel: "#FFFFFF", sub: "#697386", title: "#1A2B3B", border: "#E3E8EF" }
    : { panel: "#141416", sub: "#A1A1AA", title: "#FFFFFF", border: "#2A2C36" };

  return (
    <>
      <style>{`
        .signin-modal-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(10, 12, 16, 0.5);
          backdrop-filter: blur(2px);
          opacity: ${isOpen ? 1 : 0};
          pointer-events: ${isOpen ? "auto" : "none"};
          transition: opacity 0.25s ease;
        }
        .signin-modal-panel {
          position: fixed; top: 0; right: 0; bottom: 0; z-index: 201;
          width: min(690px, 100vw);
          background: ${c.panel};
          box-shadow: -20px 0 60px rgba(0,0,0,0.25);
          transform: translateX(${isOpen ? "0" : "100%"});
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex; flex-direction: column;
          overflow-y: auto;
        }
        .signin-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 24px 75px 0; flex-shrink: 0; }
        .signin-modal-close {
          width: 36px; height: 36px; border-radius: 50%; border: 1px solid ${c.border}; background: transparent;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${c.title};
        }
        .signin-modal-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 75px 40px; }
        .signin-modal-logo { margin-bottom: 28px; }
        .signin-modal-legal { padding: 20px 75px; font-size: 12px; color: ${c.sub}; text-align: center; flex-shrink: 0; }
        .signin-modal-legal a { color: ${c.sub}; text-decoration: underline; }
        @media (max-width: 480px) {
          .signin-modal-panel { width: 100vw; }
          .signin-modal-head { padding-left: 24px; padding-right: 24px; }
          .signin-modal-body { padding-left: 24px; padding-right: 24px; }
          .signin-modal-legal { padding-left: 24px; padding-right: 24px; }
        }
      `}</style>

      <div className="signin-modal-backdrop" onClick={close} aria-hidden={!isOpen} />

      <aside className="signin-modal-panel" role="dialog" aria-modal="true" aria-hidden={!isOpen}>
        <div className="signin-modal-head">
          <button type="button" className="signin-modal-close" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="signin-modal-body">
          <div className="signin-modal-logo">
            <LogoMark size={80} color={c.title} />
          </div>
          <SignInForm callbackUrl="/console" onJoinFree={close} />
        </div>
        <div className="signin-modal-legal">
          By signing in, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
        </div>
      </aside>
    </>
  );
}
