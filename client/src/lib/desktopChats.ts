// Desktop app only: every chat is also kept on this computer (desktop/chats.js), so the user can read it when
// the internet is down. On the website none of this runs (window.classgridDesktop.saveChat isn't there).
import { fetchWithRescue } from "./rescue";

export const OFFLINE_CHAT_NOTE = "Offline — showing the copy saved on this computer";

type SavedChat = { id: string; title: string; projectId: string | null; pinned?: boolean; createdAt: string; updatedAt: string; details?: any; messages: any[] };
type SavedAccount = { userId: string; email: string | null; name: string | null };
type DesktopChats = {
  saveChat: (chat: { id: string; details: any; messages: any[]; account?: any }) => Promise<any>;
  listChats: () => Promise<Omit<SavedChat, "details" | "messages">[]>;
  readChat: (id: string) => Promise<SavedChat | null>;
  removeChat?: (id: string) => Promise<any>;
  listOtherChats?: () => Promise<(SavedAccount & { chats: Omit<SavedChat, "details" | "messages">[] })[]>;
  readOtherChat?: (userId: string, id: string) => Promise<(SavedChat & { account: SavedAccount }) | null>;
};

const desktop = (): DesktopChats | null => {
  const d = typeof window !== "undefined" ? (window as any).classgridDesktop : null;
  return d?.saveChat ? d : null;
};

export const keepsChatCopies = () => !!desktop();

const apiBase = () => import.meta.env.VITE_API_URL || "https://api.classgrid.in";

// The server can't be reached (no internet, or our API is down): a failed request, or a 502/503/504
export const isUnreachable = (err?: any) =>
  (typeof navigator !== "undefined" && navigator.onLine === false) ||
  err instanceof TypeError ||
  [502, 503, 504].includes(Number(err?.status));

// The signed-in user as useCurrentUser keeps it in the desktop app ({ _id, email, name }), so the app knows whose
// chats folder it is
function signedInUser() {
  try {
    const u = JSON.parse(localStorage.getItem("cg_desktop_user") || "null");
    return u && (u._id || u.id) && u.email ? { _id: String(u._id || u.id), email: String(u.email), name: String(u.name || "") } : null;
  } catch { return null; }
}

// Keep a chat as the server sent it: details = GET /api/ai/sessions/:id, messages = GET .../messages
export function saveChatCopy(id: string | null | undefined, details: any, messages: any) {
  const d = desktop();
  if (!d || !id || !Array.isArray(messages)) return;
  d.saveChat({ id, details: details || null, messages, account: signedInUser() }).catch(() => { /* kept next time */ });
}

// Load a chat from the server again and keep it (after an answer finishes)
export async function syncChatCopy(id: string | null | undefined) {
  if (!desktop() || !id) return;
  const get = (url: string) => fetchWithRescue(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [details, data] = await Promise.all([get(`${apiBase()}/api/ai/sessions/${id}`), get(`${apiBase()}/api/ai/sessions/${id}/messages`)]);
  if (data?.messages) saveChatCopy(id, details, data.messages);
}

// The saved copy of a chat: { details, messages } in the same shape the server sends, or null
export async function readChatCopy(id: string | null | undefined): Promise<{ details: any; messages: any[] } | null> {
  const d = desktop();
  if (!d || !id) return null;
  const chat = await d.readChat(id).catch(() => null);
  if (!chat || !Array.isArray(chat.messages)) return null;
  return { details: chat.details || { session: { id: chat.id, title: chat.title, pinned: chat.pinned, created_at: chat.createdAt }, projectId: chat.projectId }, messages: chat.messages };
}

// Whether a saved chat belongs in the list asked for with listQuery (?mode=agent / ?project=...)
function inList(listQuery: string) {
  const q = new URLSearchParams(listQuery.replace(/^\?/, ""));
  const project = q.get("project");
  return (c: { projectId: string | null }) => {
    if (q.get("mode") === "agent") return !c.projectId;
    if (project === "all") return q.get("studio") === "1" || !!c.projectId; // Studio also lists chats with no project
    return !project || c.projectId === project;
  };
}

// Saved chats for the chat list, shaped like the server's list. listQuery is the list's ?mode=agent / ?project=...
export async function listChatCopies(listQuery: string): Promise<any[] | null> {
  const d = desktop();
  if (!d) return null;
  const chats = await d.listChats().catch(() => null);
  if (!chats) return null;
  return chats
    .filter(inList(listQuery))
    .map((c) => ({ id: c.id, title: c.title, created_at: c.createdAt, updated_at: c.updatedAt, pinned: !!c.pinned, offline: true }));
}

export function removeChatCopy(id: string | null | undefined) {
  if (id) desktop()?.removeChat?.(id).catch(() => { /* removed next time */ });
}

// ── Chats of the other accounts on this computer ──
// Someone who logs in here with another Classgrid account (for example after using up their limit) can go on with
// a chat the other account had: it opens from the copy on this computer, and the first message sent makes a new
// chat of this account with all its messages (POST /api/ai/sessions/import). Only who pays changes.

export type OtherAccountChats = { userId: string; email: string | null; name: string | null; chats: { id: string; title: string; created_at: string; updated_at: string }[] };
export type OtherChatRef = { userId: string; chatId: string; email: string | null; title: string };

const CONTINUED_KEY = "cg_continued_chats"; // { [new chat id]: { email, from: "<userId>/<chatId>", by: <this user's id> } }
const myId = () => signedInUser()?._id || null;
function continuedChats(): Record<string, { email: string | null; from: string; by: string }> {
  try { return JSON.parse(localStorage.getItem(CONTINUED_KEY) || "{}") || {}; } catch { return {}; }
}

// The chat this account already made from another account's chat, or null
export function continuedChatOf(userId: string, chatId: string): string | null {
  const me = myId();
  const found = Object.entries(continuedChats()).find(([, v]) => v.from === `${userId}/${chatId}` && v.by === me);
  return found ? found[0] : null;
}

// The email of the account a chat was continued from (null when it wasn't)
export function continuedFrom(sessionId: string | null | undefined): string | null {
  if (!sessionId || !desktop()) return null;
  const v = continuedChats()[sessionId];
  return v ? v.email || "another account" : null;
}

// The other accounts' chats for the chat list (the same lists as listChatCopies), leaving out the ones this account
// already continued (those are in its own list now)
export async function listOtherChatCopies(listQuery: string): Promise<OtherAccountChats[]> {
  const d = desktop();
  if (!d?.listOtherChats) return [];
  const accounts = await d.listOtherChats().catch(() => null);
  if (!Array.isArray(accounts)) return [];
  const fits = inList(listQuery);
  return accounts
    .map((a) => ({
      userId: a.userId, email: a.email || null, name: a.name || null,
      chats: (a.chats || [])
        .filter((c) => fits(c) && !continuedChatOf(a.userId, c.id))
        .map((c) => ({ id: c.id, title: c.title || "New chat", created_at: c.createdAt, updated_at: c.updatedAt })),
    }))
    .filter((a) => a.chats.length > 0);
}

// Another account's saved chat: { details, messages, email } in the server's shape, or null
export async function readOtherChatCopy(userId: string, chatId: string): Promise<{ details: any; messages: any[]; email: string | null } | null> {
  const d = desktop();
  if (!d?.readOtherChat) return null;
  const chat = await d.readOtherChat(userId, chatId).catch(() => null);
  if (!chat || !Array.isArray(chat.messages)) return null;
  return {
    details: chat.details || { session: { id: chat.id, title: chat.title, created_at: chat.createdAt }, projectId: chat.projectId },
    messages: chat.messages,
    email: chat.account?.email || null,
  };
}

// Make the chat a chat of this account (the server copies all its messages). Returns the new chat's id
export async function continueChatCopy(from: OtherChatRef, messages: any[]): Promise<string> {
  const res = await fetchWithRescue(`${apiBase()}/api/ai/sessions/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      title: from.title,
      messages: messages.slice(-300).map((m) => ({ role: m?.role, content: m?.content, file_urls: m?.file_urls || [], created_at: m?.created_at })),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.sessionId) throw new Error(data?.error || "Couldn't continue this chat. Please try again.");
  const me = myId();
  if (me) {
    const all = continuedChats();
    all[data.sessionId] = { email: from.email, from: `${from.userId}/${from.chatId}`, by: me };
    try { localStorage.setItem(CONTINUED_KEY, JSON.stringify(all)); } catch { /* storage full: only the note is lost */ }
  }
  return String(data.sessionId);
}
