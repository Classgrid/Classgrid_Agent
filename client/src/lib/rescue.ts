/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
const RESCUE_PREFIX = "/api/rescue";
const MAIN_DOWN_STATUSES = new Set([502, 503, 504]);
const MAIN_DOWN_MEMORY_MS = 30000;

let mainDownUntil = 0;

export const markMainDown = () => {
  mainDownUntil = Date.now() + MAIN_DOWN_MEMORY_MS;
};

export const isMainDown = () => Date.now() < mainDownUntil;

export const isMainDownStatus = (status?: number) => status === undefined || MAIN_DOWN_STATUSES.has(status);

export const isRescueUrl = (url: string) => {
  try {
    return new URL(url, window.location.origin).pathname.startsWith(RESCUE_PREFIX);
  } catch {
    return false;
  }
};

export const toRescueUrl = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.pathname.startsWith(RESCUE_PREFIX)) return url;
    if (!parsed.pathname.startsWith("/api/") && !parsed.pathname.startsWith("/oauth/")) return url;
    parsed.pathname = RESCUE_PREFIX + parsed.pathname;
    return /^https?:\/\//i.test(url) ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
};

const requestUrl = (input: RequestInfo | URL) =>
  typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

export async function fetchWithRescue(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  if (isRescueUrl(url)) return fetch(input, init);
  const rescueUrl = toRescueUrl(url);
  if (rescueUrl === url) return fetch(input, init);

  if (isMainDown()) {
    try {
      const rescued = await fetch(rescueUrl, init);
      if (!MAIN_DOWN_STATUSES.has(rescued.status)) return rescued;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
    }
  }

  try {
    const response = await fetch(input, init);
    if (!MAIN_DOWN_STATUSES.has(response.status)) return response;
    markMainDown();
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    markMainDown();
  }
  return fetch(rescueUrl, init);
}

export async function resolveRescueNavigation(url: string): Promise<string> {
  const rescueUrl = toRescueUrl(url);
  if (rescueUrl === url) return url;
  if (isMainDown()) return rescueUrl;
  try {
    const origin = new URL(url, window.location.origin).origin;
    const response = await fetch(`${origin}/?_=${Date.now()}`, { method: "GET", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!MAIN_DOWN_STATUSES.has(response.status)) return url;
  } catch {
    markMainDown();
    return rescueUrl;
  }
  markMainDown();
  return rescueUrl;
}

export async function navigateWithRescue(url: string, { newTab = false }: { newTab?: boolean } = {}) {
  const target = await resolveRescueNavigation(url);
  if (newTab) window.open(target, "_blank");
  else window.location.href = target;
}

export const RESCUE_SOCKET_PATH = `${RESCUE_PREFIX}/socket.io`;
