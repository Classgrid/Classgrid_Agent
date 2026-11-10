// Sign in to the Classgrid extension (Classgrid Code, VS Code, Cursor) with this login page, like Antigravity and
// Claude Code. The editor opens /login?editor=1&state=..&challenge=..&callback=<scheme>://classgrid.classgrid/login.
// The request is kept in sessionStorage (it survives the Google / GitHub round trip); after ANY sign-in (Google, GitHub,
// email + password, OTP, sign-up, or a browser that was already signed in) the app goes to /editor-signed-in, which
// gets a one-time code tied to the editor's PKCE challenge and sends the browser back to the editor.
// Plan: plan/editor-sign-in.md

const KEY = "classgrid:editorSignIn";
const MAX_AGE_MS = 15 * 60 * 1000;
// Only real editors, only our extension's link
const SCHEMES = new Set(["classgrid-code", "vscode", "vscode-insiders", "cursor", "windsurf", "vscodium"]);

export type EditorSignIn = { state: string; challenge: string; callback: string; at: number };

const clean = (v: string | null, max: number) => (v || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, max);

export function isAllowedEditorCallback(raw: string): boolean {
  try {
    const u = new URL(raw);
    const scheme = u.protocol.replace(/:$/, "").toLowerCase();
    // Parsed as an opaque URL in some browsers: check the text as well
    return SCHEMES.has(scheme) && /^[a-z-]+:\/\/classgrid\.classgrid\/login$/i.test(`${scheme}://${u.host}${u.pathname}`) && !u.search && !u.hash;
  } catch {
    return false;
  }
}

// main.tsx, before the app renders: keep an editor's sign-in request from the address bar
export function captureEditorSignIn(): void {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get("editor") !== "1") return;
    const state = clean(p.get("state"), 128);
    const challenge = clean(p.get("challenge"), 128);
    const callback = p.get("callback") || "";
    if (state.length < 16 || challenge.length < 43 || !isAllowedEditorCallback(callback)) return;
    const req: EditorSignIn = { state, challenge, callback, at: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(req));
  } catch { /* storage blocked: the page is a normal login */ }
}

export function pendingEditorSignIn(): EditorSignIn | null {
  try {
    const req = JSON.parse(sessionStorage.getItem(KEY) || "null") as EditorSignIn | null;
    if (!req || Date.now() - req.at > MAX_AGE_MS || !isAllowedEditorCallback(req.callback)) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return req;
  } catch {
    return null;
  }
}

export function clearEditorSignIn(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function editorLink(req: EditorSignIn, code: string): string {
  return `${req.callback}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(req.state)}`;
}
