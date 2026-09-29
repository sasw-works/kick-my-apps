"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BellOff, Loader2, CheckCircle2 } from "lucide-react";

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState(() => (token ? "loading" : "error")); // loading | found | notfound | done | error
  const [info, setInfo] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setInfo(d);
        setStatus(d.found ? "found" : "notfound");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function confirm() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`, { method: "DELETE" });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setStatus("done");
    } catch {
      setStatus("error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <main className="unsub-page">
      <style>{unsubStyles}</style>
      <div className="unsub-card">
        <div className="unsub-icon">
          {status === "done" ? <CheckCircle2 size={28} /> : <BellOff size={28} />}
        </div>

        {status === "loading" && <Loader2 size={22} className="spin" />}

        {status === "found" && (
          <>
            <h1 className="unsub-title">Unsubscribe from {info.appName}?</h1>
            <p className="unsub-body">
              You&apos;ll stop receiving the weekly review summary for {info.appName} at {info.email}. You can
              re-subscribe any time from that app&apos;s report page.
            </p>
            <button className="unsub-btn" onClick={confirm} disabled={removing}>
              {removing ? <Loader2 size={16} className="spin" /> : "Unsubscribe"}
            </button>
          </>
        )}

        {status === "done" && (
          <>
            <h1 className="unsub-title">You&apos;re unsubscribed</h1>
            <p className="unsub-body">You won&apos;t get any more weekly summaries for this app.</p>
          </>
        )}

        {status === "notfound" && (
          <>
            <h1 className="unsub-title">Already unsubscribed</h1>
            <p className="unsub-body">This link has already been used, or the subscription no longer exists.</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="unsub-title">This link isn&apos;t valid</h1>
            <p className="unsub-body">Please use the unsubscribe link from a recent email, or manage your subscriptions from your account.</p>
          </>
        )}

        <Link href="/" className="unsub-home-link">Back to Kick My Apps</Link>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}

const unsubStyles = `
  .unsub-page { min-height: 70vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
  .unsub-card { max-width: 420px; text-align: center; }
  .unsub-icon {
    width: 64px; height: 64px; margin: 0 auto 20px; border-radius: 18px;
    background: var(--glass-bg, var(--surface)); border: 1px solid var(--glass-border, var(--ink-3));
    display: flex; align-items: center; justify-content: center; color: var(--chalk);
  }
  .unsub-title { font-size: 24px; font-weight: 600; color: var(--chalk); margin: 0 0 12px; }
  .unsub-body { font-size: 15px; line-height: 1.6; color: var(--muted); margin: 0 0 24px; }
  .unsub-btn {
    height: 48px; padding: 0 32px; border: none; border-radius: 999px; cursor: pointer;
    background: var(--blue-100); color: #fff; font-size: 15px; font-weight: 500; font-family: inherit;
  }
  .unsub-btn:disabled { opacity: 0.6; cursor: default; }
  .unsub-home-link { display: block; margin-top: 28px; font-size: 13.5px; color: var(--muted); text-decoration: none; }
  .unsub-home-link:hover { color: var(--chalk); }
`;
