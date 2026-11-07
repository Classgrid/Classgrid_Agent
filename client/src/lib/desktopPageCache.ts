// Desktop app: pages open with their last data at once and refresh it quietly, instead of grey loading bars each time.
// Two parts: the data of react-query (Settings and others) is kept on this computer and put back when the app starts,
// and pages that fetch by themselves (Schedule, Library) keep their last answer here (readPageCache / writePageCache).
// While the welcome screen plays, Schedule and Library are fetched in advance (warmPages), so even their first visit
// is instant. Everything is kept per account (cg_desktop_user), so another account never sees it.
import { dehydrate, hydrate, type QueryClient } from "@tanstack/react-query";

export const PAGE_CACHE_ON = import.meta.env.VITE_DESKTOP === "1";
const API = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
// The signed-in account's id (cg_desktop_user is the saved user, useCurrentUser.ts)
export const desktopUserId = () => {
  try { const u = JSON.parse(localStorage.getItem("cg_desktop_user") || "null"); return String(u?._id || u?.id || ""); } catch { return ""; }
};
const who = desktopUserId;
const pageKey = (key: string) => `cg_page_cache:${who()}:${key}`;
const memory = new Map<string, unknown>();

export function readPageCache<T>(key: string): T | undefined {
  if (!PAGE_CACHE_ON) return undefined;
  const k = pageKey(key);
  if (memory.has(k)) return memory.get(k) as T;
  try { const raw = localStorage.getItem(k); if (raw) { const v = JSON.parse(raw) as T; memory.set(k, v); return v; } } catch { /* nothing kept */ }
  return undefined;
}
export function writePageCache(key: string, value: unknown) {
  if (!PAGE_CACHE_ON) return;
  const k = pageKey(key);
  memory.set(k, value);
  try { const s = JSON.stringify(value); if (s.length < 400_000) localStorage.setItem(k, s); } catch { /* storage full */ }
}

// The react-query data, kept on this computer between runs (only answers that arrived, and not huge ones)
export function keepQueryData(client: QueryClient) {
  if (!PAGE_CACHE_ON) return;
  const key = () => `cg_query_cache:${who()}`;
  try { const raw = localStorage.getItem(key()); if (raw) hydrate(client, JSON.parse(raw)); } catch { /* nothing kept */ }
  let t: ReturnType<typeof setTimeout> | null = null;
  client.getQueryCache().subscribe(() => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      try {
        // (an answer that can't be written as text is skipped, instead of stopping the whole save)
        const fits = (q: { state: { status: string; data?: unknown } }) => { try { return q.state.status === "success" && JSON.stringify(q.state.data ?? null).length < 200_000; } catch { return false; } };
        const state = dehydrate(client, { shouldDehydrateQuery: fits });
        localStorage.setItem(key(), JSON.stringify(state));
      } catch { /* storage full */ }
    }, 1500);
  });
}

// Every page's first data, fetched while the welcome screen plays (the same addresses and react-query keys the pages
// ask for first): Schedule, Library, Settings (the profile), Requests and Audit Logs. The chat list and the chats are
// kept by AgentSidebar and the chat copies on this computer.
export function warmPages(client: QueryClient) {
  if (!PAGE_CACHE_ON) return;
  const get = (url: string) => fetch(`${API}${url}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  void get("/api/ai/schedules?status=all").then((d) => { if (d?.success) writePageCache("schedules:all", d.schedules); });
  void get("/api/ai/library?sort=newest").then((d) => { if (d?.files) writePageCache("library:newest:all", { files: d.files, quota: d.quota || null }); });
  const warm = (key: unknown[], url: string, pick: (d: any) => unknown) =>
    void get(url).then((d) => { if (d) client.setQueryData(key, pick(d)); });
  // Settings and the profile page: the profile, the email and privacy switches and the verified domain (each card's
  // own data; the profile page keeps the whole answers under its own keys)
  void get("/api/user/profile").then((d) => { if (d?.user) { client.setQueryData(["user-profile"], d.user); client.setQueryData(["global-profile"], d); } });
  void get("/api/user/email-preferences").then((d) => {
    if (!d) return;
    client.setQueryData(["privacy-settings"], { hideEmail: !!d.privacySettings?.hideEmail, hideHobbies: !!d.privacySettings?.hideHobbies, hideBio: !!d.privacySettings?.hideBio });
    if (d.emailNotifications) client.setQueryData(["email-preferences"], d.emailNotifications);
    client.setQueryData(["global-settings"], d);
  });
  warm(["user-verified-domain"], "/api/user/domain", (d) => d);
  warm(["group-audit-logs", { page: "1", pageSize: "50" }], "/api/group-chat/audit-logs?page=1&pageSize=50", (d) => d);
  void import("@/features/chat/services/chatApi").then((m) => m.fetchUnifiedRequests()).then((d) => client.setQueryData(["join-requests", "unified"], d)).catch(() => {});
}
