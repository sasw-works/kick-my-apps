// Admin access is controlled by a comma-separated ADMIN_EMAILS env var, e.g.
// ADMIN_EMAILS="owner@example.com,cofounder@example.com" -- no separate DB role needed.
export function isAdminEmail(email) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
