import { createHash } from "node:crypto";

// What changed on another app's store listing between two checks. Pure: takes the previous
// snapshot row and the app as the store reports it now.
//
// Every field is compared only when the previous snapshot actually knew it (NULL = "not recorded
// yet", e.g. snapshots from before this existed), so turning this on never reports a pile of fake
// changes. Icons and screenshots are compared by their image path, not the full URL: stores add
// sizing and cache parameters that change without the picture changing.

const clip = (s, n) => (String(s ?? "").length > n ? String(s).slice(0, n - 1) + "…" : String(s ?? ""));

export function assetKey(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    // Apple: .../Purple126/v4/ab/cd/ef/<hash>/<file>.png/100x100bb.jpg  -> drop the sizing tail.
    // Google: lh3.googleusercontent.com/<id>=w240-h480 -> drop the "=..." size suffix.
    return (u.pathname.replace(/\/[^/]*\d+x\d+[^/]*$/, "").split("=")[0]) || null;
  } catch {
    return null;
  }
}

export function screensKey(urls) {
  const keys = (Array.isArray(urls) ? urls : []).map(assetKey).filter(Boolean);
  if (!keys.length) return { key: null, count: 0 };
  return { key: createHash("sha1").update(keys.join("|")).digest("hex").slice(0, 16), count: keys.length };
}

// The values to store on the snapshot, so the next check can compare against them.
export function listingFingerprint(app) {
  const s = screensKey(app.screenshots);
  return {
    releaseNotes: app.releaseNotes ? String(app.releaseNotes).slice(0, 4000) : null,
    listingName: app.name ? String(app.name).trim().slice(0, 200) : null,
    iconKey: assetKey(app.iconUrl),
    screensKey: s.key,
    screensCount: s.count || null,
    price: app.price ? String(app.price).slice(0, 40) : null,
  };
}

export function detectChanges(prev, app) {
  if (!prev || !app) return [];
  const now = listingFingerprint(app);
  const out = [];

  if (app.version && prev.version && app.version !== prev.version) {
    out.push({
      kind: "version",
      title: `Released version ${app.version}`,
      detail: app.releaseNotes ? clip(app.releaseNotes, 600) : "No release notes were published.",
    });
  }
  if (prev.listing_name && now.listingName && prev.listing_name !== now.listingName) {
    out.push({ kind: "name", title: "Changed its store name", detail: `“${clip(prev.listing_name, 80)}” → “${clip(now.listingName, 80)}”` });
  }
  if (prev.icon_key && now.iconKey && prev.icon_key !== now.iconKey) {
    out.push({ kind: "icon", title: "Changed its app icon", detail: "The icon image on the store listing is different now." });
  }
  if (prev.screens_key && now.screensKey && prev.screens_key !== now.screensKey) {
    const was = prev.screens_count, nowN = now.screensCount;
    out.push({
      kind: "screenshots",
      title: "Updated its screenshots",
      detail: was && was !== nowN ? `${nowN} screenshots now (was ${was}).` : `The ${nowN} screenshots on the store listing are different now.`,
    });
  }
  if (prev.price && now.price && prev.price !== now.price) {
    out.push({ kind: "price", title: "Changed its price", detail: `${prev.price} → ${now.price}` });
  }
  return out;
}
