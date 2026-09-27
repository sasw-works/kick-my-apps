"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  User,
  Mail,
  Calendar,
  ShieldCheck,
  Pencil,
  Check,
  X,
  Zap,
  FileText,
  GitCompare,
  Radio,
  MessageCircle,
  HelpCircle,
  ScrollText,
  FileCheck2,
  Shield,
  Trash2,
  LogOut,
  ChevronRight,
  Loader2,
} from "lucide-react";

function formatMonthYear(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function AccountPage() {
  const { status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setUser(d.user);
      })
      .catch((err) => setError(err.message));
  }, [status]);

  async function saveName() {
    setSavingName(true);
    try {
      const res = await fetch("/api/account/update-name", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nameDraft }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setUser((prev) => ({ ...prev, name: d.name }));
      setEditingName(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Delete your account and all of your reports permanently? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && !user && !error)) {
    return (
      <main className="account-page">
        <style>{accountStyles}</style>
        <div className="account-loading"><Loader2 size={20} className="spin" /></div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="account-page">
        <style>{accountStyles}</style>
        <div className="account-loading">You need to sign in to view this page.</div>
      </main>
    );
  }

  return (
    <main className="account-page">
      <style>{accountStyles}</style>
      <div className="account-title">Account</div>

      {error && <div className="account-error">{error}</div>}

      {/* Profile */}
      <div className="account-card">
        <div className="account-card-head">
          <User size={16} color="var(--muted)" />
          <span>Profile</span>
        </div>

        <div className="account-profile-row">
          {user?.image ? (
            <img src={user.image} alt="" className="account-avatar-img" />
          ) : (
            <div className="account-avatar">{(user?.name || user?.email || "?")[0].toUpperCase()}</div>
          )}
          <div className="account-profile-info">
            {editingName ? (
              <div className="account-name-edit">
                <input
                  className="account-name-input"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                />
                <button type="button" className="account-name-btn" onClick={saveName} disabled={savingName} aria-label="Save">
                  {savingName ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                </button>
                <button type="button" className="account-name-btn" onClick={() => setEditingName(false)} aria-label="Cancel">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="account-name-row">
                <span className="account-name">{user?.name || "No name set"}</span>
                <button
                  type="button"
                  className="account-edit-btn"
                  onClick={() => { setNameDraft(user?.name || ""); setEditingName(true); }}
                  aria-label="Edit name"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <div className="account-email-row">
              <Mail size={13} color="var(--muted)" />
              {user?.email}
            </div>
          </div>
        </div>

        <div className="account-meta-row">
          <span className="account-meta-item">
            <Calendar size={13} />
            Member since {formatMonthYear(user?.created_at)}
          </span>
          <span className="account-badge">
            <ShieldCheck size={12} />
            Email verified
          </span>
        </div>
      </div>

      {/* Plan */}
      <div className="account-card">
        <div className="account-card-head">
          <Zap size={16} color="var(--muted)" />
          <span>Plan</span>
        </div>
        <div className="account-plan-badge">Free</div>

        <div className="account-usage-grid">
          <div className="account-usage-item">
            <div className="account-usage-head"><FileText size={14} color="var(--muted)" />Reports</div>
            <div className="account-usage-num"><span className="account-usage-current">3</span> / 10</div>
            <div className="account-usage-bar"><div className="account-usage-fill" style={{ width: "30%" }} /></div>
          </div>
          <div className="account-usage-item">
            <div className="account-usage-head"><GitCompare size={14} color="var(--muted)" />Comparisons</div>
            <div className="account-usage-num"><span className="account-usage-current">1</span> / 5</div>
            <div className="account-usage-bar"><div className="account-usage-fill" style={{ width: "20%" }} /></div>
          </div>
          <div className="account-usage-item">
            <div className="account-usage-head"><Radio size={14} color="var(--muted)" />Pulse monitors</div>
            <div className="account-usage-num"><span className="account-usage-current">2</span> max</div>
            <div className="account-usage-bar"><div className="account-usage-fill" style={{ width: "40%" }} /></div>
          </div>
        </div>
        <div className="account-usage-note">Usage resets monthly. Current billing period started the 1st.</div>
      </div>

      {/* Contact */}
      <a href="mailto:support@kickmyapps.com" className="account-link-card">
        <MessageCircle size={16} color="var(--muted)" />
        <span>Contact</span>
        <ChevronRight size={16} color="var(--muted)" className="account-link-chevron" />
      </a>

      {/* Learn more */}
      <div className="account-section-label">Learn more</div>
      <div className="account-card account-link-group">
        <Link href="/support" target="_blank" rel="noopener noreferrer" className="account-link-row">
          <HelpCircle size={16} color="var(--muted)" />
          <span>FAQ</span>
          <ChevronRight size={16} color="var(--muted)" className="account-link-chevron" />
        </Link>
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="account-link-row">
          <ScrollText size={16} color="var(--muted)" />
          <span>Privacy Policy</span>
          <ChevronRight size={16} color="var(--muted)" className="account-link-chevron" />
        </Link>
        <Link href="/terms" target="_blank" rel="noopener noreferrer" className="account-link-row">
          <FileCheck2 size={16} color="var(--muted)" />
          <span>Terms &amp; Conditions</span>
          <ChevronRight size={16} color="var(--muted)" className="account-link-chevron" />
        </Link>
      </div>

      {/* Data & privacy */}
      <div className="account-card">
        <div className="account-card-head">
          <Shield size={16} color="var(--muted)" />
          <span>Data &amp; Privacy</span>
        </div>
        <p className="account-privacy-text">
          Your data is stored securely and is never shared with third parties. You can permanently delete your
          account and all associated data at any time.
        </p>
        <button type="button" className="account-delete-btn" onClick={handleDeleteAccount} disabled={deleting}>
          {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
          Delete Account
        </button>
      </div>

      <button
        type="button"
        className="account-signout-btn"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </main>
  );
}

const accountStyles = `
  .account-page { max-width: 640px; margin: 0 auto; padding: 32px 24px 60px; }
  .account-title { font-size: 28px; font-weight: 700; color: var(--chalk); margin-bottom: 20px; }
  .account-loading { padding: 80px 0; text-align: center; color: var(--muted); font-size: 14px; }
  .account-error { padding: 10px 14px; border-radius: 10px; background: color-mix(in srgb, var(--kick) 12%, transparent); color: var(--kick); font-size: 13px; margin-bottom: 16px; }

  .account-card { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
  .account-card-head { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--chalk); margin-bottom: 18px; }

  .account-profile-row { display: flex; align-items: center; gap: 14px; }
  .account-avatar, .account-avatar-img { width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
  .account-avatar { background: linear-gradient(135deg, var(--brand), #7C6BFF); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; }
  .account-profile-info { flex: 1; min-width: 0; }
  .account-name-row { display: flex; align-items: center; gap: 8px; }
  .account-name { font-size: 16px; font-weight: 700; color: var(--chalk); }
  .account-edit-btn { width: 24px; height: 24px; border-radius: 6px; border: none; background: transparent; color: var(--muted); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .account-edit-btn:hover { background: var(--ink); }
  .account-name-edit { display: flex; align-items: center; gap: 6px; }
  .account-name-input { flex: 1; height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); font-size: 14px; font-family: inherit; }
  .account-name-btn { width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--ink-3); background: var(--ink); color: var(--chalk); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .account-email-row { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); margin-top: 4px; }

  .account-meta-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--ink-3); }
  .account-meta-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); }
  .account-badge { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--teal); background: color-mix(in srgb, var(--teal) 12%, transparent); padding: 4px 10px; border-radius: 999px; }

  .account-plan-badge { display: inline-block; font-size: 13px; font-weight: 700; color: var(--yellow); background: color-mix(in srgb, var(--yellow) 15%, transparent); padding: 6px 14px; border-radius: 999px; margin-bottom: 18px; }
  .account-usage-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .account-usage-item { background: var(--ink); border-radius: 12px; padding: 14px; }
  .account-usage-head { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); margin-bottom: 10px; }
  .account-usage-num { font-size: 15px; margin-bottom: 8px; }
  .account-usage-current { font-weight: 700; color: var(--chalk); }
  .account-usage-bar { height: 5px; border-radius: 999px; background: var(--ink-3); overflow: hidden; }
  .account-usage-fill { height: 100%; background: var(--blue-100); border-radius: 999px; }
  .account-usage-note { font-size: 12px; color: var(--muted); margin-top: 16px; }

  .account-link-card {
    display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--ink-3);
    border-radius: 16px; padding: 16px 20px; margin-bottom: 16px; text-decoration: none; color: var(--chalk);
    font-size: 14px; font-weight: 600;
  }
  .account-link-chevron { margin-left: auto; }

  .account-section-label { font-size: 13px; font-weight: 700; color: var(--muted); margin: 4px 0 10px 4px; }
  .account-link-group { padding: 6px; }
  .account-link-row {
    display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px;
    text-decoration: none; color: var(--chalk); font-size: 14px;
  }
  .account-link-row:hover { background: var(--ink); }

  .account-privacy-text { font-size: 13px; color: var(--muted); line-height: 1.6; margin: 0 0 16px; }
  .account-delete-btn {
    display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px;
    background: transparent; border: 1px solid color-mix(in srgb, var(--kick) 40%, transparent); color: var(--kick);
    font-size: 13.5px; font-weight: 600; cursor: pointer;
  }
  .account-delete-btn:hover { background: color-mix(in srgb, var(--kick) 10%, transparent); }
  .account-delete-btn:disabled { opacity: 0.6; cursor: default; }

  .account-signout-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 14px; border-radius: 16px; background: var(--surface); border: 1px solid var(--ink-3);
    color: var(--chalk); font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .account-signout-btn:hover { background: var(--ink); }

  @media (max-width: 600px) {
    .account-usage-grid { grid-template-columns: 1fr; }
  }
`;
