"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Trash2, Loader2, ShieldOff, FileText } from "lucide-react";
import { reportPath } from "../../lib/reportPath";

function timeAgo(dateStr) {
  if (!dateStr) return "Never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} weeks ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [userScans, setUserScans] = useState({});
  const [scansLoading, setScansLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setUsers(d.users);
      })
      .catch((err) => setError(err.message));
  }, [status]);

  async function toggleExpand(u) {
    if (expanded === u.email) {
      setExpanded(null);
      return;
    }
    setExpanded(u.email);
    if (!userScans[u.email]) {
      setScansLoading(true);
      try {
        const res = await fetch(`/api/admin/user-scans?email=${encodeURIComponent(u.email)}`);
        const d = await res.json();
        setUserScans((prev) => ({ ...prev, [u.email]: d.scans || [] }));
      } catch {
        setUserScans((prev) => ({ ...prev, [u.email]: [] }));
      } finally {
        setScansLoading(false);
      }
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Delete ${u.email}? This also deletes all of their reports. This action cannot be undone.`)) return;
    setDeletingId(u.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: u.id, email: u.email }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (status === "loading") {
    return (
      <main className="admin-page">
        <style>{adminStyles}</style>
        <div className="admin-empty"><Loader2 size={20} className="spin" /></div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="admin-page">
        <style>{adminStyles}</style>
        <div className="admin-denied">
          <ShieldOff size={28} color="var(--muted)" />
          <div>You need to sign in to view this page.</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="admin-page">
        <style>{adminStyles}</style>
        <div className="admin-denied">
          <ShieldOff size={28} color="var(--kick)" />
          <div>{error === "Forbidden." ? "You don't have access to this page." : error}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <style>{adminStyles}</style>
      <div className="admin-header">
        <div className="admin-title">Admin</div>
        <div className="admin-sub">Registered users and their reports.</div>
      </div>

      {users === null ? (
        <div className="admin-empty"><Loader2 size={20} className="spin" /></div>
      ) : users.length === 0 ? (
        <div className="admin-empty">No registered users yet.</div>
      ) : (
        <div className="admin-list">
          {users.map((u) => (
            <div className="admin-user-card" key={u.id}>
              <div className="admin-user-row" onClick={() => toggleExpand(u)}>
                {expanded === u.email ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {u.image ? (
                  <img src={u.image} alt="" className="admin-avatar-img" />
                ) : (
                  <div className="admin-avatar">{(u.name || u.email)[0].toUpperCase()}</div>
                )}
                <div className="admin-user-info">
                  <div className="admin-user-name">{u.name || u.email}</div>
                  <div className="admin-user-email">{u.email}</div>
                </div>
                <div className="admin-user-meta">
                  <div className="admin-meta-item">
                    <span className="admin-meta-label">Joined</span>
                    {timeAgo(u.created_at)}
                  </div>
                  <div className="admin-meta-item">
                    <span className="admin-meta-label">Last login</span>
                    {timeAgo(u.last_login)}
                  </div>
                  <div className="admin-meta-item">
                    <span className="admin-meta-label">Reports</span>
                    {u.scan_count}
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDelete(u); }}
                  disabled={deletingId === u.id}
                  aria-label="Delete user"
                >
                  {deletingId === u.id ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                </button>
              </div>

              {expanded === u.email && (
                <div className="admin-scans">
                  {scansLoading && !userScans[u.email] ? (
                    <div className="admin-scans-loading"><Loader2 size={16} className="spin" /></div>
                  ) : userScans[u.email]?.length === 0 ? (
                    <div className="admin-scans-empty">No reports from this user yet.</div>
                  ) : (
                    userScans[u.email]?.map((s) => (
                      <Link href={reportPath(s.id, s.app_name)} key={s.id} className="admin-scan-row">
                        <FileText size={14} color="var(--muted)" />
                        <span className="admin-scan-name">{s.app_name}</span>
                        <span className="admin-scan-score">{s.health_score}</span>
                        <span className="admin-scan-date">{timeAgo(s.created_at)}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const adminStyles = `
  .admin-page { padding: 32px 40px; }
  .admin-header { margin-bottom: 28px; }
  .admin-title { font-size: 32px; font-weight: 700; color: var(--chalk); }
  .admin-sub { font-size: 14px; color: var(--muted); margin-top: 6px; }
  .admin-empty { padding: 60px 0; text-align: center; color: var(--muted); font-size: 14px; }
  .admin-denied { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 0; color: var(--muted); font-size: 14px; }
  .admin-list { display: flex; flex-direction: column; gap: 10px; }
  .admin-user-card { background: var(--surface); border: 1px solid var(--ink-3); border-radius: 12px; overflow: hidden; }
  .admin-user-row { display: flex; align-items: center; gap: 14px; padding: 14px 18px; cursor: pointer; color: var(--muted); }
  .admin-avatar, .admin-avatar-img { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
  .admin-avatar { background: linear-gradient(135deg, var(--brand), #7C6BFF); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
  .admin-user-info { flex: 1; min-width: 0; }
  .admin-user-name { font-size: 14.5px; font-weight: 600; color: var(--chalk); }
  .admin-user-email { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
  .admin-user-meta { display: flex; gap: 28px; flex-shrink: 0; }
  .admin-meta-item { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: var(--chalk); min-width: 80px; }
  .admin-meta-label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; color: var(--muted); text-transform: uppercase; }
  .admin-delete-btn {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--ink-3); background: transparent;
    display: flex; align-items: center; justify-content: center; color: var(--kick); cursor: pointer; flex-shrink: 0;
  }
  .admin-delete-btn:hover { background: color-mix(in srgb, var(--kick) 12%, transparent); }
  .admin-scans { border-top: 1px solid var(--ink-3); padding: 8px 18px 14px 62px; display: flex; flex-direction: column; gap: 2px; }
  .admin-scans-loading, .admin-scans-empty { padding: 12px 0; font-size: 13px; color: var(--muted); }
  .admin-scan-row {
    display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px;
    text-decoration: none; color: var(--chalk); font-size: 13px;
  }
  .admin-scan-row:hover { background: var(--ink); }
  .admin-scan-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .admin-scan-score { font-weight: 700; width: 32px; text-align: right; }
  .admin-scan-date { color: var(--muted); width: 110px; text-align: right; }
  @media (max-width: 700px) {
    .admin-page { padding: 24px 16px; }
    .admin-user-row { flex-wrap: wrap; row-gap: 34px; }
    /* Delete button moves up beside the avatar/name (order + a forced line break on the meta
       row below), instead of wrapping down on its own -- same technique as the report toolbar's
       close button: info's max-width leaves exactly enough room for the delete button + the gap
       on either side of it, so it never grows wide enough to push delete to the next line. */
    .admin-avatar, .admin-avatar-img { order: 1; }
    .admin-user-info { order: 2; max-width: calc(100% - 130px); }
    .admin-delete-btn { order: 3; }
    .admin-user-meta { order: 4; width: 100%; padding-left: 50px; box-sizing: border-box; gap: 20px; justify-content: space-between; }
    .admin-scans { padding-left: 16px; }
  }
`;
