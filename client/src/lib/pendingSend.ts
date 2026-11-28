// A message sent from the website (classgrid.in/download: the visitor types in the demo's message box) opens
// chat.classgrid.in/c/studio?q=<text>&send=1 (owner, 2026-11-28: "it should go directly into the AI in Studio mode").
// The text is kept in this tab's sessionStorage, so it survives the login screen (password, email code, Google and
// GitHub sign-in all come back to this site in the same tab); after login RequireAuth goes to Studio instead of the
// account's usual first page, and Studio's chat sends it once, in a new chat (AskAiPanel). ?q= without send=1 only
// fills the message box (classgrid:pendingPrompt, router.tsx).

const STORAGE_KEY = "classgrid:pendingSend";
// A visitor who left the sign-in half done and came back much later did not mean to send it now
const MAX_AGE_MS = 30 * 60 * 1000;
const MAX_LENGTH = 20000;
export const PENDING_SEND_PATH = "/c/studio";

export function rememberPendingSend(text: string) {
  const t = String(text || "").trim().slice(0, MAX_LENGTH);
  if (!t) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ text: t, at: Date.now() }));
  } catch {
    // storage blocked: the link just opens Studio
  }
}

function read(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved.text !== "string" || typeof saved.at !== "number" || Date.now() - saved.at > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return saved.text.trim() || null;
  } catch {
    return null;
  }
}

// Is a message waiting to be sent? Read-only (safe while rendering): Studio's chat takes it
export const peekPendingSend = (): string | null => read();

// The waiting message, removed so it is sent only once (a refresh or Back doesn't send it again)
export function takePendingSend(): string | null {
  const text = read();
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ }
  return text;
}

// Takes ?q=<text>&send=1 out of the address and keeps the text; true when it did
export function catchPendingSendLink(): boolean {
  try {
    const query = new URLSearchParams(window.location.search);
    const q = query.get("q");
    if (!q || query.get("send") !== "1") return false;
    rememberPendingSend(q);
    query.delete("q");
    query.delete("send");
    const rest = query.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
    return true;
  } catch {
    return false;
  }
}
