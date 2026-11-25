// The browser half of signing in to the Classgrid extension (Classgrid Code, VS Code, Cursor). See editorHandoff.ts
// and plan/editor-sign-in.md.
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { clearEditorSignIn, editorLink, editorScheme, pendingEditorSignIn, type EditorSignIn } from "../editorHandoff";
import { DeviceLimitDevices } from "@/features/shared/components/settings/DeviceLimitDevices";
import { CODE_TTL_MINUTES } from "@/lib/codeLifetime";

const ON_WEBSITE = import.meta.env.VITE_EDITOR !== "1" && import.meta.env.VITE_DESKTOP !== "1";
const PAGE = "/editor-signed-in";
// Pages where a token may exist before sign-in is finished (onboarding steps), or where it is being removed
const WAIT_ON = /^\/(login|public-chat-login|onboarding|onboard|logout|signup|register)(\/|$)/;

// Rendered once next to <Routes>: when an editor asked for a sign-in and the browser now has a login, go hand it over
export function EditorSignInWatcher() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!ON_WEBSITE) return;
    const check = () => {
      if (window.location.pathname === PAGE || WAIT_ON.test(window.location.pathname)) return false;
      if (!pendingEditorSignIn()) return true; // nothing to do: stop checking
      // A Google / GitHub sign-in has just come back with its token in the address (?token=): that token is the one
      // handed over, saved first (as useCurrentUser saves it). The token still saved here is the browser's earlier
      // sign-in, which the new one has just replaced (one sign-in per browser), so handing it over failed with "Your
      // sign-in here has expired" (owner, 2026-11-19: every sign-in started from the editor in a browser that was
      // already signed in)
      const q = new URLSearchParams(window.location.search);
      const fresh = q.get("token") || q.get("sso_token");
      if (fresh) localStorage.setItem("token", fresh);
      if (!localStorage.getItem("token")) return false;
      navigate(PAGE, { replace: true });
      return true;
    };
    if (check()) return;
    // The token can arrive without a route change (Google / GitHub ?token= is saved with replaceState)
    const timer = window.setInterval(() => { if (check()) window.clearInterval(timer); }, 1000);
    return () => window.clearInterval(timer);
  }, [location.pathname, location.search, navigate]);
  return null;
}

// (ticket: the editor's sign-in was over the plan's devices; the account's devices are listed to log out one)
type Status = { kind: "working" } | { kind: "done"; code: string; link: string } | { kind: "none" } | { kind: "error"; message: string; relogin: boolean; ticket?: string };

export default function EditorSignedInPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>({ kind: "working" });
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const req: EditorSignIn | null = pendingEditorSignIn();
    if (!req) return setStatus({ kind: "none" });
    if (!localStorage.getItem("token")) return void navigate("/login", { replace: true });
    apiClient
      // (editor, device, app: which editor this is, for Settings > Devices)
      .post<{ code: string }>("/api/auth/editor-code", { challenge: req.challenge, editor: editorScheme(req), device: req.device, app: req.app })
      .then(({ data }) => {
        clearEditorSignIn();
        const link = editorLink(req, data.code);
        setStatus({ kind: "done", code: data.code, link });
        window.location.href = link;
      })
      .catch((err: { code?: string; status?: number; message?: string; ticket?: string }) => {
        const relogin = err?.status === 401 || err?.code === "401";
        setStatus({ kind: "error", relogin, ticket: typeof err?.ticket === "string" ? err.ticket : undefined, message: relogin ? "Your sign-in here has expired. Sign in again to finish." : err?.message || "Couldn't finish signing in to your editor." });
      });
  }, [navigate]);

  const signInAgain = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm text-center">
        {status.kind === "working" && <p className="text-sm text-muted-foreground">Signing in to your editor…</p>}
        {status.kind === "done" && (
          <>
            <h1 className="mb-2 text-xl font-semibold">You're signed in</h1>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">Go back to your editor. If it didn't open, click the button, or copy the code and run "Classgrid: Paste sign-in code" in the editor.</p>
            <a href={status.link} className="inline-block rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">Open editor</a>
            <button
              type="button"
              onClick={() => { void navigator.clipboard.writeText(status.code).then(() => setCopied(true)); }}
              className="mt-4 block w-full rounded-xl border border-border px-3 py-2.5 font-mono text-xs break-all text-muted-foreground"
              title="Copy the code"
            >
              {copied ? "Copied" : status.code}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">The code works for {CODE_TTL_MINUTES} minutes, once, and only in the editor that asked for it.</p>
          </>
        )}
        {status.kind === "none" && (
          <>
            <h1 className="mb-2 text-xl font-semibold">Nothing to sign in</h1>
            <p className="mb-5 text-sm text-muted-foreground">Start again from your editor: run "Classgrid: Sign in".</p>
            <a href="/" className="text-sm underline">Go to Classgrid</a>
          </>
        )}
        {status.kind === "error" && (
          <>
            <h1 className="mb-2 text-xl font-semibold">Sign-in didn't finish</h1>
            <p className="mb-5 text-sm text-muted-foreground">{status.message}</p>
            {status.ticket && <DeviceLimitDevices ticket={status.ticket} className="mb-5" />}
            {status.relogin
              ? <button type="button" onClick={signInAgain} className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">Sign in again</button>
              : <p className="text-sm text-muted-foreground">Start again from your editor: run "Classgrid: Sign in".</p>}
          </>
        )}
      </div>
    </div>
  );
}
