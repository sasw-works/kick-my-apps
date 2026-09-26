"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, Loader2 } from "lucide-react";
import { useTheme } from "./ThemeProvider";

function GoogleGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

// callbackUrl: where Auth.js redirects after a successful sign-in.
export default function SignInForm({ callbackUrl = "/console", onJoinFree }) {
  const { theme } = useTheme();
  const light = theme === "light";

  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const c = light
    ? { card: "#FFFFFF", border: "#E3E8EF", input: "#F6F8FA", title: "#1A2B3B", sub: "#697386", divider: "#E3E8EF" }
    : { card: "#17181F", border: "#2A2C36", input: "#22232C", title: "#FFFFFF", sub: "#A1A1AA", divider: "#2A2C36" };

  async function handleSendCode(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send the code.");
      setStep("code");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await signIn("email-code", { email: email.trim(), code: code.trim(), redirect: false });
      if (res?.error) {
        setError("That code isn't right, or it's expired. Try again.");
        setLoading(false);
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="signin-form">
      <style>{`
        .signin-form { width: 100%; display: flex; flex-direction: column; align-items: center; }
        .signin-title { margin: 0; font-size: 26px; font-weight: 700; color: ${c.title}; text-align: center; }
        .signin-sub { margin: 10px 0 58px; font-size: 14px; color: ${c.sub}; text-align: center; }
        .signin-google {
          width: 100%; height: 52px; display: flex; align-items: center; justify-content: center; gap: 10px;
          background: ${c.card}; border: 1px solid ${c.border}; border-radius: 999px;
          font-size: 14.5px; font-weight: 600; color: ${c.title}; cursor: pointer;
          transition: background 0.15s ease;
        }
        .signin-google:hover { background: ${light ? "#F6F8FA" : "#1f2029"}; }
        .signin-divider { display: flex; align-items: center; gap: 16px; width: 100%; margin: 50px 0; }
        .signin-divider::before, .signin-divider::after { content: ""; flex: 1; height: 1px; background: ${c.divider}; }
        .signin-divider span { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; color: ${c.sub}; }
        .signin-label { align-self: flex-start; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: ${c.sub}; margin-bottom: 8px; }
        .signin-input {
          width: 100%; height: 52px; padding: 0 16px; box-sizing: border-box;
          background: ${c.input}; border: 1px solid ${c.border}; border-radius: 999px;
          font-size: 14.5px; color: ${c.title}; font-family: inherit;
        }
        .signin-input::placeholder { color: ${c.sub}; }
        .signin-input:focus { outline: none; border-color: var(--blue-100); }
        .signin-code-input { text-align: center; font-size: 20px; letter-spacing: 0.3em; font-weight: 600; }
        .signin-submit {
          width: 100%; height: 52px; margin-top: 30px; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: ${light ? "#111827" : "#FFFFFF"}; color: ${light ? "#FFFFFF" : "#111827"};
          border: none; border-radius: 999px; font-size: 14.5px; font-weight: 700; cursor: pointer;
        }
        .signin-submit:disabled { opacity: 0.6; cursor: default; }
        .signin-foot { margin-top: 22px; font-size: 12.5px; color: ${c.sub}; text-align: center; line-height: 1.6; }
        .signin-foot a { color: var(--blue-100); font-weight: 600; text-decoration: none; cursor: pointer; }
        .signin-error { width: 100%; margin-top: 12px; padding: 10px 14px; border-radius: 10px; background: color-mix(in srgb, var(--kick) 12%, transparent); color: var(--kick); font-size: 12.5px; }
        .spin { animation: signin-spin 0.9s linear infinite; }
        @keyframes signin-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {step === "email" ? (
        <>
          <h2 className="signin-title">Sign in to continue</h2>
          <p className="signin-sub">Use Google or enter your email for a sign-in code</p>

          <button type="button" className="signin-google" onClick={() => signIn("google", { callbackUrl })}>
            <GoogleGlyph />
            Continue with Google
          </button>

          <div className="signin-divider"><span>OR</span></div>

          <form onSubmit={handleSendCode} style={{ width: "100%" }}>
            <input
              type="email"
              className="signin-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <button type="submit" className="signin-submit" disabled={loading || !email.trim()}>
              {loading ? <Loader2 size={18} className="spin" /> : <Mail size={18} />}
              Email me a code
            </button>
          </form>

          {error && <div className="signin-error">{error}</div>}

          <p className="signin-foot">
            We&apos;ll email you a 6-digit code to sign in instantly.
            <br />
            Don&apos;t have an account? <a onClick={onJoinFree}>Join free</a>
          </p>
        </>
      ) : (
        <>
          <h2 className="signin-title">Check your email</h2>
          <p className="signin-sub">Enter the 6-digit code we sent to {email}</p>

          <form onSubmit={handleVerifyCode} style={{ width: "100%" }}>
            <div className="signin-label">CODE</div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="signin-input signin-code-input"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            <button type="submit" className="signin-submit" disabled={loading || code.length !== 6}>
              {loading && <Loader2 size={18} className="spin" />}
              Verify and sign in
            </button>
          </form>

          {error && <div className="signin-error">{error}</div>}

          <p className="signin-foot">
            <a onClick={() => { setStep("email"); setCode(""); setError(""); }}>Use a different email</a>
          </p>
        </>
      )}
    </div>
  );
}
