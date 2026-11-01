// Desktop app only: every chat is also kept on this computer (desktop/chats.js), so the user can read it when
// the internet is down. On the website none of this runs (window.classgridDesktop.saveChat isn't there).
import { fetchWithRescue } from "./rescue";

export const OFFLINE_CHAT_NOTE = "Offline — showing the copy saved on this computer";

type SavedChat = { id: string; title: string; projectId: string | null; pinned?: boolean; createdAt: string; updatedAt: string; details?: any; messages: any[] };
type DesktopChats = {
  saveChat: (chat: { id: string; details: any; messages: any[] }) => Promise<any>;
  listChats: () => Promise<Omit<SavedChat, "details" | "messages">[]>;
  readChat: (id: string) => Promise<SavedChat | null>;
  removeChat?: (id: string) => Promise<any>;
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

// Keep a chat as the server sent it: details = GET /api/ai/sessions/:id, messages = GET .../messages
export function saveChatCopy(id: string | null | undefined, details: any, messages: any) {
  const d = desktop();
  if (!d || !id || !Array.isArray(messages)) return;
  d.saveChat({ id, details: details || null, messages }).catch(() => { /* kept next time */ });
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

// Saved chats for the chat list, shaped like the server's list. listQuery is the list's ?mode=agent / ?project=...
export async function listChatCopies(listQuery: string): Promise<any[] | null> {
  const d = desktop();
  if (!d) return null;
  const chats = await d.listChats().catch(() => null);
  if (!chats) return null;
  const q = new URLSearchParams(listQuery.replace(/^\?/, ""));
  const project = q.get("project");
  return chats
    .filter((c) => {
      if (q.get("mode") === "agent") return !c.projectId;
      if (project === "all") return q.get("studio") === "1" || !!c.projectId; // Studio also lists chats with no project
      return !project || c.projectId === project;
    })
    .map((c) => ({ id: c.id, title: c.title, created_at: c.createdAt, updated_at: c.updatedAt, pinned: !!c.pinned, offline: true }));
}

export function removeChatCopy(id: string | null | undefined) {
  if (id) desktop()?.removeChat?.(id).catch(() => { /* removed next time */ });
}
