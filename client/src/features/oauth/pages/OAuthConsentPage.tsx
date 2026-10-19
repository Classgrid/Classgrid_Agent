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
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { AlertTriangle, Lock, ExternalLink, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { clearOAuthConsentReturn } from "@/features/oauth/lib/oauthReturn";
import { LoginGridBackground } from "@/features/public-chat/components/LoginGridBackground";
import { fetchWithRescue } from "@/lib/rescue";

// Same look as the chat.classgrid.in login page: flat card on the grid, black/white buttons, no accent colour
const PRIMARY_BUTTON = "flex h-12 w-full items-center justify-center rounded-lg bg-[#111] px-5 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-black active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 dark:bg-[#f1f1f1] dark:text-[#111] dark:hover:bg-white";
const SECONDARY_BUTTON = "flex h-12 w-full items-center justify-center rounded-lg bg-[#f1f1ef] px-5 text-[15px] font-semibold text-slate-900 transition-colors duration-200 hover:bg-[#e7e7e4] active:scale-[0.98] disabled:opacity-50 dark:bg-[#1f1f1f] dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]";

// Desktop apps such as Cursor receive the sign-in on a local address of this computer (e.g. localhost:8787)
function isLoopbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const name = (host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0]) ?? "";
  return LOOPBACK_HOSTS.has((name ?? "").toLowerCase());
}

const CARD_PAD = "px-6 sm:px-10";
const SCROLL_AREA = "min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]";

function ConsentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] overflow-hidden text-foreground flex flex-col relative font-sans">
      <LoginGridBackground />
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center p-4">
        <div className="flex w-full max-w-[440px] max-h-full flex-col bg-white text-slate-900 dark:bg-[#141414] dark:text-[#f1f1f1]">
          {children}
        </div>
      </div>
    </div>
  );
}

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";

// Same rule as the server: https, loopback http (desktop MCP clients) or Cursor's own callback
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
function isSafeRedirectUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "cursor:") return url.host === "anysphere.cursor-mcp" && url.pathname === "/oauth/callback";
    if (url.username || url.password) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

// From GET /oauth/client-details. clientKind "dynamic" = the app registered itself (unverified).
interface OAuthClientDetails {
  name: string;
  clientId: string;
  clientKind?: "registered" | "dynamic";
  redirectHost?: string | null;
}

// From GET /oauth/request-details: the permissions the app asked for (labels come from the server).
// locked = always granted (profile:read), shown ticked and disabled.
interface OAuthScopeOption {
  scope: string;
  label: string;
  sensitive: boolean;
  defaultChecked: boolean;
  locked?: boolean;
}

const OFFLINE_ACCESS_SCOPE = "offline_access";

// Shown inside another site's frame, a hidden consent page could be clicked without the user knowing
// (clickjacking). vercel.json also sends frame-ancestors 'none'; this covers hosts that miss the header.
function isFramed(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true; // reading a cross-origin top throws: we are framed
  }
}

// The consent calls also send the stored login token, for users signed in without the cookie
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // storage blocked: the cookie is still sent
  }
  return headers;
}

// Local dev only (/oauth/preview): sample data so the screen can be looked at without a login or server
const PREVIEW_CLIENT: OAuthClientDetails = { name: "Cursor", clientId: "preview", clientKind: "dynamic", redirectHost: "localhost:8787" };
const PREVIEW_SCOPES: OAuthScopeOption[] = [
  { scope: "profile:read", label: "Read your profile", sensitive: false, defaultChecked: true, locked: true },
  { scope: "schedules:read", label: "Read your schedules", sensitive: false, defaultChecked: true },
  { scope: "schedules:write", label: "Create, edit and delete your schedules", sensitive: true, defaultChecked: false },
  { scope: "grid:read", label: "Read your Grid chats and groups", sensitive: false, defaultChecked: true },
  { scope: "grid:write", label: "Send messages in Grid and chats", sensitive: true, defaultChecked: false },
  { scope: "apps:use", label: "Use your connected apps (Gmail, Drive, Notion…)", sensitive: true, defaultChecked: false },
  { scope: "offline_access", label: "Stay connected (refresh access)", sensitive: false, defaultChecked: true },
];

export function OAuthConsentPage({ preview = false }: { preview?: boolean } = {}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();

  const [clientData, setClientData] = useState<OAuthClientDetails | null>(preview ? PREVIEW_CLIENT : null);
  const [scopeOptions, setScopeOptions] = useState<OAuthScopeOption[]>(preview ? PREVIEW_SCOPES : []);
  const [checkedScopes, setCheckedScopes] = useState<Set<string>>(() => new Set(preview ? PREVIEW_SCOPES.filter((o) => o.locked || o.defaultChecked).map((o) => o.scope) : []));
  const [isLoading, setIsLoading] = useState(!preview);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [framed] = useState(isFramed);
  const { setTheme } = useTheme();

  // Same as the chat login page: follow the computer's light/dark setting
  useEffect(() => {
    setTheme("system");
  }, [setTheme]);

  // New sign-ins carry only request_id (the app's request is stored on the server); older links carry client_id
  const requestId = searchParams.get("request_id");
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  // Back on the consent page after signing in: the saved return URL (see RequireAuth) is no longer needed
  useEffect(() => {
    clearOAuthConsentReturn();
  }, []);

  useEffect(() => {
    if (framed || preview) return;
    if (isUserLoading) return;

    if (!user) {
      // The RequireAuth wrapper handles redirecting to login,
      // but we add this safeguard.
      return;
    }

    if (!requestId && !clientId) {
      setLoadError("This link is missing its request_id. Start the connection again from the app.");
      setIsLoading(false);
      return;
    }

    const fetchClientDetails = async () => {
      try {
        if (requestId) {
          const res = await fetchWithRescue(`${backendUrl}/oauth/request-details?${new URLSearchParams({ request_id: requestId }).toString()}`, {
            method: "GET",
            headers: authHeaders(),
            credentials: "include"
          });
          const data = await res.json();
          if (res.ok) {
            const options: OAuthScopeOption[] = Array.isArray(data.scopes) ? data.scopes : [];
            setScopeOptions(options);
            setCheckedScopes(new Set(options.filter((o) => o.locked || o.defaultChecked).map((o) => o.scope)));
            setClientData(data.client);
          } else {
            setLoadError(data.error_description || data.message || data.error || "Failed to load app details");
          }
          return;
        }

        const queryParams = new URLSearchParams({
          client_id: clientId as string,
        });
        if (redirectUri) queryParams.append("redirect_uri", redirectUri);

        // Fetch using generic cookies since it's an authenticated route on the backend
        // Note: The backend uses `isAuthenticated` which reads from Bearer token or cookies.
        // `useCurrentUser` typically means we have standard session management via cookies.
        const res = await fetchWithRescue(`${backendUrl}/oauth/client-details?${queryParams.toString()}`, {
          method: "GET",
          headers: authHeaders(),
          credentials: "include" // Important for sending the auth cookie
        });

        const data = await res.json();
        if (res.ok) {
          setClientData(data.client);
        } else {
          setLoadError(data.error_description || data.message || data.error || "Failed to load app details");
        }
      } catch (err) {
        setLoadError("Connection error. Check your internet and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientDetails();
  }, [framed, requestId, clientId, redirectUri, user, isUserLoading]);

  const toggleScope = (option: OAuthScopeOption, checked: boolean) => {
    if (option.locked) return;
    setCheckedScopes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(option.scope);
      else next.delete(option.scope);
      return next;
    });
  };

  // "Stay connected" alone grants nothing, so Allow needs at least one real permission
  const hasPermissionChecked = scopeOptions.some((o) => o.scope !== OFFLINE_ACCESS_SCOPE && (o.locked || checkedScopes.has(o.scope)));
  const canAllow = !requestId || hasPermissionChecked;

  const handleConsent = async (allow: boolean) => {
    if (framed) return;
    if (preview) {
      toast.message(allow ? "Preview: Allow clicked" : "Preview: Cancel clicked");
      return;
    }
    setIsSubmitting(true);
    try {
      const body = requestId
        ? { request_id: requestId, allow, scopes: scopeOptions.filter((o) => o.locked || checkedScopes.has(o.scope)).map((o) => o.scope) }
        : { client_id: clientId, redirect_uri: redirectUri, state, allow };
      const res = await fetchWithRescue(`${backendUrl}/oauth/authorize`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.redirect_url) {
        // Never navigate to anything but a normal web address (a "javascript:" URL would run as script here)
        if (!isSafeRedirectUrl(data.redirect_url)) {
          toast.error("This app has an unsafe return address, so access was not granted.");
          setIsSubmitting(false);
          return;
        }
        window.location.href = data.redirect_url;
      } else {
        toast.error(data.error_description || data.message || data.error || "Failed to process authorization");
        setIsSubmitting(false);
      }
    } catch (err) {
      toast.error("Failed to process authorization");
      setIsSubmitting(false);
    }
  };

  if (framed) {
    return (
      <ConsentShell>
        <div className={`${SCROLL_AREA} ${CARD_PAD} py-8 sm:py-10`}>
        <img src="/logo.png" alt="Classgrid" className="mb-6 h-10 w-10 object-contain" />
        <h1 className="text-[30px] leading-tight font-medium tracking-tight">Open this page directly</h1>
        <p className="mt-2 text-[15px] text-slate-600 dark:text-[#9a9a9a]">
          For your safety, app connections can't be approved inside another website. Open chat.classgrid.in in its own tab and start the connection again.
        </p>
        </div>
      </ConsentShell>
    );
  }

  if (!preview && (isUserLoading || isLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (!clientData) {
    return (
      <ConsentShell>
        <div className={`${SCROLL_AREA} ${CARD_PAD} py-8 sm:py-10`}>
        <img src="/logo.png" alt="Classgrid" className="mb-6 h-10 w-10 object-contain" />
        <h1 className="text-[30px] leading-tight font-medium tracking-tight">Can't connect this app</h1>
        <p className="mt-2 mb-8 text-[15px] text-slate-600 dark:text-[#9a9a9a]">
          {loadError || "We couldn't verify the application requesting access. Please ensure the link is correct."}
        </p>
        <button type="button" onClick={() => navigate("/")} className={SECONDARY_BUTTON}>
          Back to Classgrid
        </button>
        </div>
      </ConsentShell>
    );
  }

  const isUnverified = clientData.clientKind === "dynamic";
  // A local address means the app on this computer (Cursor, Claude Desktop…), not a website
  const returnsToThisComputer = isLoopbackHost(clientData.redirectHost);

  return (
    <ConsentShell>
      <div className={`${SCROLL_AREA} ${CARD_PAD} pt-8 sm:pt-10`}>
      <img src="/logo.png" alt="Classgrid" className="mb-6 h-10 w-10 object-contain" />
      <h1 className="text-[30px] leading-tight font-medium tracking-tight break-words">
        {clientData.name} wants to access your Classgrid account
      </h1>
      {(preview ? "you@example.com" : user?.email) ? (
        <p className="mt-2 text-[15px] text-slate-600 dark:text-[#9a9a9a] break-all">Signed in as {preview ? "you@example.com" : user?.email}</p>
      ) : null}

      {/* The app's name is chosen by the app itself, so show where access is really sent */}
      <div className="mt-5 mb-7 space-y-2 text-[13px] text-slate-500 dark:text-[#888]">
        <div className="flex flex-wrap items-center gap-2">
          {clientData.redirectHost ? (
            <span className="inline-flex flex-wrap items-center gap-1" title={clientData.redirectHost}>
              <ExternalLink className="w-3.5 h-3.5" />
              {returnsToThisComputer ? (
                <>Returns you to <span className="font-medium text-slate-900 dark:text-[#f1f1f1]">{clientData.name} on this computer</span></>
              ) : (
                <>Returns you to <span className="font-medium text-slate-900 dark:text-[#f1f1f1] break-all">{clientData.redirectHost}</span></>
              )}
            </span>
          ) : null}
          {isUnverified ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 font-medium text-slate-700 dark:border-[#333] dark:text-[#cfcfcf]"
              title="This app registered itself. Classgrid has not checked who made it."
            >
              <AlertTriangle className="w-3 h-3" />
              Unverified app
            </span>
          ) : null}
        </div>
        {isUnverified ? (
          <p>
            Only allow access if you started this connection yourself{returnsToThisComputer ? "." : ` and trust ${clientData.redirectHost || "this app"}.`}
          </p>
        ) : null}
      </div>

      {scopeOptions.length > 0 ? (
        <div className="mb-3">
          <h2 className="mb-3 text-[15px] font-medium break-words">Choose what {clientData.name} can do</h2>
          <div className="space-y-1">
            {scopeOptions.map((option) => {
              const checked = Boolean(option.locked) || checkedScopes.has(option.scope);
              const disabled = isSubmitting || Boolean(option.locked);
              return (
                <button
                  key={option.scope}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={disabled}
                  onClick={() => toggleScope(option, !checked)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] transition-colors ${option.locked ? "cursor-default" : "hover:bg-[#f1f1ef] dark:hover:bg-[#1f1f1f]"} disabled:opacity-100`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${checked
                      ? "border-[#111] bg-[#111] text-white dark:border-[#f1f1f1] dark:bg-[#f1f1f1] dark:text-[#111]"
                      : "border-slate-300 bg-white dark:border-[#444] dark:bg-[#161616]"} ${option.locked ? "opacity-60" : ""}`}
                  >
                    {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex-1">{option.label}</span>
                  {option.locked ? (
                    <span className="inline-flex items-center gap-1 text-[13px] text-slate-500 dark:text-[#888]" title="Needed so the app knows whose account it is">
                      <Lock className="w-3 h-3" />
                      Required
                    </span>
                  ) : option.sensitive ? (
                    <span className="text-[13px] text-slate-500 dark:text-[#888]" title="This lets the app change things or act for you">
                      Can make changes
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {!hasPermissionChecked ? (
            <p className="mt-2 text-[13px] text-slate-500 dark:text-[#888]">Tick at least one permission to allow access.</p>
          ) : null}
        </div>
      ) : (
        <p className="mb-7 text-[15px] text-slate-600 dark:text-[#9a9a9a]">
          This app will be able to read your profile and use Classgrid on your behalf.
        </p>
      )}
      </div>

      <div className={`shrink-0 ${CARD_PAD} pb-8 pt-4 sm:pb-10`}>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={SECONDARY_BUTTON} onClick={() => handleConsent(false)} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="button" className={PRIMARY_BUTTON} onClick={() => handleConsent(true)} disabled={isSubmitting || !canAllow}>
          {isSubmitting ? <Spinner className="w-4 h-4 mr-2 text-inherit" /> : null}
          Allow
        </button>
      </div>

      <p className="mt-4 text-[13px] text-slate-500 dark:text-[#888]">
        You can remove this access any time from Connected apps in Classgrid's AI Plugins.
      </p>
      </div>
    </ConsentShell>
  );
}
