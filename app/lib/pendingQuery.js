// A signed-out visitor who presses "analyze" hits the sign-up gate instead of an analysis. To keep
// "sign up free to generate" honest, we remember what they asked for and run it as soon as they're
// signed in -- otherwise they'd have to type the app name (and re-upload every screenshot) again.
//
// The sign-in flow leaves the page (Google redirects away; the email-code flow reloads to
// /console), so the query can't live in React state. The small part (app name / store URL) goes in
// sessionStorage; screenshots are files, which sessionStorage can't hold, so they go in IndexedDB.
// Everything expires after 30 minutes and is removed the moment it's read.

const KEY = "kma-pending-query";
const DB_NAME = "kma-pending";
const STORE = "files";
const TTL_MS = 30 * 60 * 1000;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const result = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(result?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function savePendingQuery({ appName, storeUrl, files = [] }) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ appName: appName || "", storeUrl: storeUrl || "", fileCount: files.length, ts: Date.now() })
    );
    await idb("readwrite", (s) => {
      s.clear();
      files.forEach((f, i) => s.put({ name: f.name, type: f.type, blob: f }, i));
    });
  } catch {
    // Storage can be unavailable (private browsing, quota). The app name still survives in
    // sessionStorage above if that part worked; only the screenshots are lost.
  }
}

export async function clearPendingQuery() {
  try {
    sessionStorage.removeItem(KEY);
    await idb("readwrite", (s) => s.clear());
  } catch {
    // nothing to clean up
  }
}

// Reads and removes the pending query in one step, so it can never run twice.
export async function takePendingQuery() {
  let meta;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    meta = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!meta || Date.now() - meta.ts > TTL_MS) {
    await clearPendingQuery();
    return null;
  }

  let files = [];
  if (meta.fileCount > 0) {
    try {
      const rows = await idb("readonly", (s) => s.getAll());
      files = (rows || []).map((r) => new File([r.blob], r.name, { type: r.type }));
    } catch {
      files = [];
    }
  }
  try {
    await idb("readwrite", (s) => s.clear());
  } catch {
    // ignore
  }

  // They uploaded screenshots but we couldn't get them back and there's no app to fall back on:
  // nothing sensible to run.
  if (meta.fileCount > 0 && files.length === 0 && !meta.storeUrl) return null;

  return { appName: meta.appName, storeUrl: meta.storeUrl, files };
}
