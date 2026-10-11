// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, X, AlertTriangle, Lock, ExternalLink } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Checkbox } from "@/components/marketing_ui/checkbox";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { clearOAuthConsentReturn } from "@/features/oauth/lib/oauthReturn";

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

export function OAuthConsentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();

  const [clientData, setClientData] = useState<OAuthClientDetails | null>(null);
  const [scopeOptions, setScopeOptions] = useState<OAuthScopeOption[]>([]);
  const [checkedScopes, setCheckedScopes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [framed] = useState(isFramed);

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
    if (framed) return;
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
          const res = await fetch(`${backendUrl}/oauth/request-details?${new URLSearchParams({ request_id: requestId }).toString()}`, {
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
        const res = await fetch(`${backendUrl}/oauth/client-details?${queryParams.toString()}`, {
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
    setIsSubmitting(true);
    try {
      const body = requestId
        ? { request_id: requestId, allow, scopes: scopeOptions.filter((o) => o.locked || checkedScopes.has(o.scope)).map((o) => o.scope) }
        : { client_id: clientId, redirect_uri: redirectUri, state, allow };
      const res = await fetch(`${backendUrl}/oauth/authorize`, {
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
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <img src="/logo.png" alt="Classgrid" className="mx-auto h-10 w-10 object-contain" />
          <X className="w-10 h-10 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Open this page directly</h1>
          <p className="text-muted-foreground text-sm">
            For your safety, app connections can't be approved inside another website. Open chat.classgrid.in in its own tab and start the connection again.
          </p>
        </div>
      </div>
    );
  }

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <img src="/logo.png" alt="Classgrid" className="mx-auto h-10 w-10 object-contain" />
          <X className="w-10 h-10 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Can't connect this app</h1>
          <p className="text-muted-foreground text-sm">
            {loadError || "We couldn't verify the application requesting access. Please ensure the link is correct."}
          </p>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full mt-2">
            Back to Classgrid
          </Button>
        </div>
      </div>
    );
  }

  const isUnverified = clientData.clientKind === "dynamic";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/logo.png" alt="Classgrid" className="h-9 w-9 object-contain" />
            <span className="text-lg font-semibold text-foreground">Classgrid</span>
          </div>

          <h1 className="text-xl font-semibold text-center text-foreground leading-snug break-words">
            <span className="font-bold">{clientData.name}</span> wants to access your Classgrid account
          </h1>
          {user?.email ? (
            <p className="mt-1 text-center text-sm text-muted-foreground break-all">({user.email})</p>
          ) : null}

          {/* The app's name is chosen by the app itself, so show where access is really sent */}
          <div className="mt-4 mb-6 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {clientData.redirectHost ? (
                <span className="inline-flex flex-wrap items-center justify-center gap-1 text-muted-foreground">
                  <ExternalLink className="w-3 h-3" />
                  Returns you to <span className="font-mono font-semibold text-foreground break-all">{clientData.redirectHost}</span>
                </span>
              ) : null}
              {isUnverified ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400"
                  title="This app registered itself. Classgrid has not checked who made it."
                >
                  <AlertTriangle className="w-3 h-3" />
                  Unverified app
                </span>
              ) : null}
            </div>
            {isUnverified ? (
              <p className="text-center text-muted-foreground">
                Only allow access if you started this connection yourself and trust {clientData.redirectHost || "this app"}.
              </p>
            ) : null}
          </div>

          {scopeOptions.length > 0 ? (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-medium text-foreground break-words">Choose what {clientData.name} can do</h2>
              <div className="divide-y divide-border rounded-xl border border-border">
                {scopeOptions.map((option) => {
                  const checked = Boolean(option.locked) || checkedScopes.has(option.scope);
                  const inputId = `oauth-scope-${option.scope.replace(":", "-")}`;
                  return (
                    <label
                      key={option.scope}
                      htmlFor={inputId}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm ${option.locked ? "cursor-default" : "cursor-pointer hover:bg-muted/40"}`}
                    >
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        disabled={isSubmitting || option.locked}
                        onCheckedChange={(value) => toggleScope(option, value === true)}
                      />
                      <span className="flex-1 text-foreground">{option.label}</span>
                      {option.locked ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Needed so the app knows whose account it is">
                          <Lock className="w-3 h-3" />
                          Required
                        </span>
                      ) : option.sensitive ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                          title="This lets the app change things or act for you"
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Can make changes
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
              {!hasPermissionChecked ? (
                <p className="mt-2 text-xs text-muted-foreground">Tick at least one permission to allow access.</p>
              ) : null}
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-border p-3 text-sm text-muted-foreground">
              This app will be able to read your profile and use Classgrid on your behalf.
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              variant="outline"
              className="w-full sm:flex-1"
              onClick={() => handleConsent(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => handleConsent(true)}
              disabled={isSubmitting || !canAllow}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Allow
            </Button>
          </div>
        </div>
        <div className="bg-muted/50 px-6 py-3 text-center text-xs text-muted-foreground border-t border-border">
          You can remove this access any time from Connected apps in Classgrid's AI Plugins.
        </div>
      </div>
    </div>
  );
}
