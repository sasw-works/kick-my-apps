import { randomBytes } from "node:crypto";

// Unguessable (192 bits) so a shared report's link can't be found by trying addresses.
export function generateShareToken() {
  return randomBytes(24).toString("base64url");
}

// Cheap shape check before touching the database: anything else can't be a token we issued.
export function isShareToken(v) {
  return typeof v === "string" && /^[A-Za-z0-9_-]{32}$/.test(v);
}
