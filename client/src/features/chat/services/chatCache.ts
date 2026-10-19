// Grids chats saved in this browser (IndexedDB), so a chat opened before shows at once - even after a refresh -
// while the newest messages load. Everything that was loaded for a chat is kept, per user. Cleared on logout.
// Any storage problem (private window, blocked storage) just means nothing is saved.

const DB_NAME = "classgrid-chat-cache";
const STORE = "threads";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

const key = (userId: string, threadId: string) => `${userId}:${threadId}`;

export async function getCachedMessages<T>(userId: string, threadId: string): Promise<T[] | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key(userId, threadId));
      req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as T[]) : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function setCachedMessages<T>(userId: string, threadId: string, messages: T[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, "readwrite").objectStore(STORE).put(messages, key(userId, threadId));
  } catch {
    // e.g. storage full: the chat still works, it just isn't saved
  }
}

export async function clearChatCache(): Promise<void> {
  // An open connection would block the delete
  const open = dbPromise ? await dbPromise : null;
  open?.close();
  dbPromise = null;
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}
