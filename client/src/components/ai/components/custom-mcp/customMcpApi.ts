// Custom connectors (custom MCP servers): calls to /api/custom-mcp and the login popup
import { fetchWithRescue } from "@/lib/rescue";

export interface McpTool { name: string; title?: string; description?: string; annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean } }
export interface CustomMcpServer {
  id: string;
  name: string;
  description: string;
  url: string;
  catalogId: string | null;
  iconUrl: string;
  invertInDarkMode?: boolean;
  authType: "oauth" | "api_key" | "none";
  apiKeyHeader?: string;
  hasApiKey?: boolean;
  status: "needs_login" | "connected" | "error";
  lastError: string;
  enabled: boolean;
  tools: McpTool[];
  toolsFetchedAt?: string | null;
  createdAt?: string;
}
export interface McpCatalogApp { id: string; name: string; description: string; url: string; auth: "oauth" | "api_key" | "none"; logo: string; invertInDarkMode?: boolean; askUrl?: { placeholder: string; hint: string }; keyHint?: string }

export const apiBase = () => (import.meta.env.VITE_API_URL || "https://api.classgrid.in");

async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithRescue(apiBase() + "/api/custom-mcp" + path, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.message || "Something went wrong.");
  return data;
}

export const mcpApi = {
  list: () => call<{ servers: CustomMcpServer[] }>("").then((d) => d.servers || []),
  catalog: () => call<{ apps: McpCatalogApp[] }>("/catalog").then((d) => d.apps || []),
  create: (body: any) => call<{ server: CustomMcpServer }>("", { method: "POST", body: JSON.stringify(body) }).then((d) => d.server),
  update: (id: string, body: any) => call<{ server: CustomMcpServer }>(`/${id}`, { method: "PATCH", body: JSON.stringify(body) }).then((d) => d.server),
  remove: (id: string) => call(`/${id}`, { method: "DELETE" }),
  refresh: (id: string) => call<{ server: CustomMcpServer }>(`/${id}/refresh`, { method: "POST" }).then((d) => d.server),
  logout: (id: string) => call<{ server: CustomMcpServer }>(`/${id}/logout`, { method: "POST" }).then((d) => d.server),
  loginUrl: (id: string) => call<{ url?: string; server?: CustomMcpServer }>(`/${id}/login`),
};

/**
 * Opens the server's login in a popup and waits until it's connected (or the popup closes / 3 minutes pass).
 * The popup is opened right away (before the network call) so the browser doesn't block it.
 */
export function openLoginPopup(): Window | null {
  const w = 600, h = 720;
  return window.open("about:blank", "classgrid-mcp-login", `width=${w},height=${h},left=${(window.innerWidth - w) / 2},top=${(window.innerHeight - h) / 2},scrollbars=yes`);
}

export async function loginToServer(id: string, openedPopup?: Window | null): Promise<CustomMcpServer | null> {
  const popup = openedPopup === undefined ? openLoginPopup() : openedPopup;
  let start: { url?: string; server?: CustomMcpServer };
  try {
    start = await mcpApi.loginUrl(id);
  } catch (err) {
    popup?.close();
    throw err;
  }
  if (!start.url) { popup?.close(); return start.server || null; }
  if (!popup) throw new Error("Popup blocked. Please allow popups for this site.");
  popup.location.href = start.url;
  const before = (await mcpApi.list().catch(() => [])).find((s) => s.id === id)?.toolsFetchedAt || null;
  const loggedIn = (s?: CustomMcpServer) => !!s && s.status === "connected" && (s.toolsFetchedAt || null) !== before;

  return new Promise((resolve) => {
    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMessage);
      clearInterval(timer);
      const list = await mcpApi.list().catch(() => []);
      resolve(list.find((s) => s.id === id) || null);
    };
    const onMessage = (e: MessageEvent) => { if (e.data?.type === "custom_mcp_login" && e.data?.id === id) finish(); };
    window.addEventListener("message", onMessage);
    const startedAt = Date.now();
    let closedAt = 0;
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > 180000) return finish();
      // A closed popup gets a few more seconds for the server to finish the login
      if (popup.closed && !closedAt) closedAt = Date.now();
      if (closedAt && Date.now() - closedAt > 6000) return finish();
      const list = await mcpApi.list().catch(() => []);
      if (loggedIn(list.find((s) => s.id === id))) finish();
    }, 2000);
  });
}

export const iconFilter = (invert?: boolean) => (invert ? "var(--icon-invert, none)" : "none");
