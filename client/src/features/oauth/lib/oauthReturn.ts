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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Signed-out users who open the consent page (/oauth/authorize?request_id=...) are sent to the login page.
// Password, email code, Google and GitHub sign-in all finish on "/" (Google/GitHub via the server), so the
// consent URL is kept in this tab's sessionStorage and RequireAuth sends the user back to it once signed in.

const STORAGE_KEY = "cg_oauth_consent_return";
// The pending sign-in on the server expires after 10 minutes, so an older return is useless
const MAX_AGE_MS = 10 * 60 * 1000;
export const OAUTH_CONSENT_PATH = "/oauth/authorize";

// Only our own consent page, as a same-site path (never "//host" or a full URL)
function isConsentReturnPath(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= 2048
    && (value === OAUTH_CONSENT_PATH || value.startsWith(`${OAUTH_CONSENT_PATH}?`));
}

export function rememberOAuthConsentReturn(pathWithSearch: string) {
  if (!isConsentReturnPath(pathWithSearch)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ path: pathWithSearch, at: Date.now() }));
  } catch {
    // storage blocked: the user starts the connection again from the app
  }
}

// The saved consent URL, or null. Read-only (safe to call while rendering): the consent page clears it.
export function peekOAuthConsentReturn(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved.at !== "number" || Date.now() - saved.at > MAX_AGE_MS) return null;
    return isConsentReturnPath(saved.path) ? saved.path : null;
  } catch {
    return null;
  }
}

export function clearOAuthConsentReturn() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: nothing was saved
  }
}
