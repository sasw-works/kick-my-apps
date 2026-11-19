// Downloads a store listing's icon and screenshots so the AI can look at them.
//
// The image URLs come from Apple's / Google's own listing data, never from the browser, and are
// still checked against an allowlist of store image hosts before anything is fetched (so this can't
// be turned into a general "fetch any URL" proxy). Redirects are refused, size and type are capped,
// and one broken image never fails the whole set.

import { fetchAppStoreListing } from "./reviews.js";

const MAX_SCREENSHOTS = 6;
const MAX_BYTES = 3 * 1024 * 1024;
const OK_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function isStoreImageUrl(url) {
  try {
    const u = new URL(String(url ?? ""));
    if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
    const h = u.hostname.toLowerCase();
    return /(^|\.)mzstatic\.com$/.test(h) || /(^|\.)googleusercontent\.com$/.test(h);
  } catch {
    return false;
  }
}

// Ask the store's image server for a smaller copy: Apple ".../392x696bb.png" and Google ".../xyz=w5120-h2880".
// Smaller files download faster and cost fewer tokens, and are plenty to judge a screenshot's layout.
export function downsizedImageUrl(url) {
  const s = String(url ?? "");
  if (/mzstatic\.com/i.test(s)) return s.replace(/\/\d+x\d+[a-z]*\.(png|jpg|jpeg|webp)$/i, "/600x0w.jpg");
  if (/googleusercontent\.com/i.test(s)) return s.replace(/=[a-z]\d+(-[a-z]\d+)*(-[a-z]+)*$/i, "=w600");
  return s;
}

async function fetchImage(url) {
  try {
    if (!isStoreImageUrl(url)) return null;
    const res = await fetch(downsizedImageUrl(url), { redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const mediaType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!OK_TYPES.includes(mediaType)) return null;
    const declared = Number(res.headers.get("content-length"));
    if (declared > MAX_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return null;
    return { mediaType, base64: buf.toString("base64") };
  } catch {
    return null;
  }
}

// { icon: image|null, screenshots: image[], listing } or null when the listing can't be read.
export async function fetchStoreAssets(storeUrl) {
  let listing;
  try {
    listing = await fetchAppStoreListing(storeUrl);
  } catch {
    return null;
  }
  if (!listing) return null;
  const urls = (Array.isArray(listing.screenshotUrls) ? listing.screenshotUrls : []).slice(0, MAX_SCREENSHOTS);
  const [icon, ...shots] = await Promise.all([fetchImage(listing.iconUrl), ...urls.map(fetchImage)]);
  return { listing, icon, screenshots: shots.filter(Boolean) };
}
