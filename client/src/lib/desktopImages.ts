// Desktop app only: a chat picture goes to the AI inside the chat request (a data: URL), like Claude Code does, and
// is never uploaded to storage. The server keeps only a placeholder in the chat:
//   desktop-image:<id>/<name> (sent from the desktop app, not stored)
// so the picture itself is kept on this computer (IndexedDB) and shown again from here, also in the offline copy of
// the chat. <id> is the first 16 hex characters of the SHA-256 of the data URL; the server works it out the same
// way (server/src/utils/inline-images.js). On the website nothing here runs: pictures are uploaded as before.
import { onDesktop } from "@/features/superadmin/utils/projectCopies";

export const INLINE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
// Only the picture types the AI models read; other pictures (HEIC, SVG, BMP...) are uploaded as before
const INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const PREFIX = "desktop-image:";
const NOTE = " (sent from the desktop app, not stored)";
/** mimeType given to a placeholder whose picture isn't on this computer: shown as a chip, not as a broken image */
export const LOCAL_IMAGE_MISSING = "application/x-classgrid-local-image";

/** A file the desktop app sends inside the chat request instead of uploading it */
export const sendsInline = (file: { type?: string; size?: number }) =>
  onDesktop() && INLINE_TYPES.has(String(file.type || "").toLowerCase()) && Number(file.size) > 0 && Number(file.size) <= INLINE_IMAGE_MAX_BYTES;

export const readAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error || new Error("Could not read the file"));
    r.readAsDataURL(file);
  });

export const isLocalImagePlaceholder = (url: unknown): url is string => typeof url === "string" && url.startsWith(PREFIX);
const idOf = (url: string) => /^desktop-image:([0-9a-f]{16})\//.exec(url)?.[1] || null;
const nameOf = (url: string) => (url.slice(url.indexOf("/") + 1).replace(NOTE, "").trim() || "image");
const MIME_BY_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };

const memory = new Map<string, string>(); // id -> data URL
const looked = new Set<string>(); // ids already looked up on this computer

// ── IndexedDB (kept per computer; the newest MAX_KEPT pictures) ──
const DB_NAME = "classgrid-chat-images";
const STORE = "images";
const MAX_KEPT = 300;
let dbPromise: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const store = req.result.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("at", "at");
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  return dbPromise;
}

async function idFor(dataUrl: string): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(dataUrl));
    return Array.from(new Uint8Array(digest).slice(0, 8)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch { return null; }
}

/** Keep a picture sent from this computer, so the chat shows it again after the server's copy comes back */
export async function keepLocalImage(dataUrl: string): Promise<void> {
  if (!onDesktop() || !dataUrl.startsWith("data:image/")) return;
  const id = await idFor(dataUrl);
  if (!id) return;
  memory.set(id, dataUrl);
  const d = await db();
  if (!d) return;
  try {
    const tx = d.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.put({ id, dataUrl, at: Date.now() });
    const count = store.count();
    count.onsuccess = () => {
      let extra = count.result - MAX_KEPT;
      if (extra <= 0) return;
      const cursor = store.index("at").openKeyCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c || extra-- <= 0) return;
        store.delete(c.primaryKey);
        c.continue();
      };
    };
  } catch { /* storage unavailable: shown as a chip later */ }
}

/** Looks up the pictures of these placeholders on this computer. True when a new one was found */
export async function loadLocalImages(urls: string[]): Promise<boolean> {
  const ids = [...new Set(urls.filter(isLocalImagePlaceholder).map(idOf).filter((id): id is string => !!id && !memory.has(id) && !looked.has(id)))];
  if (ids.length === 0) return false;
  ids.forEach((id) => looked.add(id));
  const d = await db();
  if (!d) return false;
  const found = await Promise.all(ids.map((id) => new Promise<boolean>((resolve) => {
    try {
      const req = d.transaction(STORE, "readonly").objectStore(STORE).get(id);
      req.onsuccess = () => {
        const v = req.result as { dataUrl?: string } | undefined;
        if (v?.dataUrl) { memory.set(id, v.dataUrl); resolve(true); } else resolve(false);
      };
      req.onerror = () => resolve(false);
    } catch { resolve(false); }
  })));
  return found.some(Boolean);
}

/**
 * Attachments as the chat shows them: a placeholder whose picture is on this computer becomes that picture;
 * one that isn't gets LOCAL_IMAGE_MISSING (an "image (only on this PC)" chip). Others are unchanged.
 */
export function showLocalImages<T extends { url: string; name: string; mimeType: string }>(attachments: T[]): T[] {
  if (!attachments.some((a) => isLocalImagePlaceholder(a.url))) return attachments;
  return attachments.map((a) => {
    if (!isLocalImagePlaceholder(a.url)) return a;
    const name = nameOf(a.url);
    const id = idOf(a.url);
    const dataUrl = id ? memory.get(id) : undefined;
    if (dataUrl) return { ...a, url: dataUrl, name, mimeType: /^data:([^;,]+)/.exec(dataUrl)?.[1] || MIME_BY_EXT[name.split(".").pop()?.toLowerCase() || ""] || "image/png" };
    return { ...a, name, mimeType: LOCAL_IMAGE_MISSING };
  });
}
