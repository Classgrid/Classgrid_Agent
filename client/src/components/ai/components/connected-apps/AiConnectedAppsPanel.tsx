// Connected apps (owner, 2026-11-14): outside apps (Claude, ChatGPT, Cursor…) the user allowed through the
// Classgrid consent page, laid out like Google's "Third-party apps & services" and GitHub's "Authorized apps":
// one row per app with its logo, whether Classgrid verified it, what it has access to, when access was given and
// when it was last active; opened, the row lists every permission, where the app sends you back and its id.
// From GET /oauth/grants; "Remove access" calls DELETE /oauth/grants/:clientId, which ends every token the app holds.
import React, { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Check, ChevronDown, ExternalLink, KeyRound, Laptop, Pencil, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { fetchWithRescue } from "@/lib/rescue";

interface ConnectedAppGrant {
  clientId: string;
  name: string;
  clientKind: "registered" | "dynamic";
  verified: boolean;
  logo: string | null;
  logoInvert: "light" | "dark" | null;
  website: string | null;
  redirectHosts: string[];
  returnsToThisComputer: boolean;
  scopes: { scope: string; label: string; sensitive: boolean }[];
  connectedAt: string;
  lastUsedAt: string;
}

const MCP_URL = "https://api.classgrid.in/mcp";

// The /oauth calls also send the stored login token, for users signed in without the cookie
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

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** "today", "yesterday", "3 days ago", else the date */
function agoText(value: string) {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "";
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return `on ${formatDate(value)}`;
}

function AppLogo({ grant, size = "w-11 h-11" }: { grant: ConnectedAppGrant; size?: string }) {
  const [broken, setBroken] = useState(false);
  if (grant.logo && !broken) {
    return (
      <div className={`${size} shrink-0 rounded-xl bg-white dark:bg-white/[0.06] border border-border flex items-center justify-center overflow-hidden`}>
        <img
          src={grant.logo}
          alt=""
          onError={() => setBroken(true)}
          className={`w-[60%] h-[60%] object-contain ${grant.logoInvert === "dark" ? "dark:invert" : ""} ${grant.logoInvert === "light" ? "invert dark:invert-0" : ""}`}
        />
      </div>
    );
  }
  const letter = (grant.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className={`${size} shrink-0 rounded-xl bg-muted border border-border flex items-center justify-center text-base font-semibold text-foreground`}>
      {letter}
    </div>
  );
}

function summary(scopes: ConnectedAppGrant["scopes"]) {
  if (!scopes.length) return "Nothing yet";
  const labels = scopes.map((s) => s.label);
  if (labels.length <= 2) return labels.join(" and ");
  return `${labels[0]}, ${labels[1]} and ${labels.length - 2} more`;
}

export function AiConnectedAppsPanel({ backendUrl }: { backendUrl: string }) {
  const [grants, setGrants] = useState<ConnectedAppGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ConnectedAppGrant | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchGrants = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchWithRescue(`${backendUrl}/oauth/grants`, { method: "GET", headers: authHeaders(), credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setGrants(Array.isArray(data.grants) ? data.grants : []);
      else setLoadError(data.error_description || data.message || "Couldn't load your connected apps.");
    } catch {
      setLoadError("Couldn't load your connected apps.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGrants(); }, [backendUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // The app leaves the list at once and the box closes; the server removes it behind (it comes back if that fails)
  const handleRemove = async (grant: ConnectedAppGrant) => {
    const before = grants;
    setGrants((prev) => prev.filter((g) => g.clientId !== grant.clientId));
    setRemoveTarget(null);
    toast.success(`${grant.name} can no longer access your account`);
    setIsRemoving(true);
    try {
      const res = await fetchWithRescue(`${backendUrl}/oauth/grants/${encodeURIComponent(grant.clientId)}`, { method: "DELETE", headers: authHeaders(), credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setGrants(before); toast.error(data.error_description || data.message || "Couldn't remove this app."); }
    } catch {
      setGrants(before);
      toast.error("Couldn't remove this app.");
    } finally {
      setIsRemoving(false);
    }
  };

  const copyMcp = async () => {
    try { await navigator.clipboard.writeText(MCP_URL); toast.success("Link copied"); } catch { toast.error("Couldn't copy. The link is " + MCP_URL); }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <h3 className="text-2xl font-bold text-foreground mb-2">Connected apps</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xl">
        Apps like Claude, ChatGPT or Cursor that you allowed to use your Classgrid account. Each app can only do what you allowed it to. Remove its access to cut it off at once.
      </p>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="space-y-3 max-w-2xl">
            {[0, 1].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <Skeleton className="w-11 h-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64" /><Skeleton className="h-3 w-52" /></div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 h-40 border border-border rounded-xl text-center px-4 max-w-2xl">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" size="sm" onClick={fetchGrants}>Try again</Button>
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">
            {grants.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-border rounded-xl text-center px-4">
                <KeyRound className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">No apps have access to your account</p>
                <p className="text-xs text-muted-foreground">When you connect Classgrid in Claude, ChatGPT, Cursor or another app, it appears here.</p>
              </div>
            ) : (
              <div>
                <div className="text-xs text-muted-foreground mb-2">{grants.length === 1 ? "1 app has" : `${grants.length} apps have`} access to your account</div>
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {grants.map((grant) => {
                    const isOpen = open === grant.clientId;
                    const sensitive = grant.scopes.filter((s) => s.sensitive);
                    return (
                      <div key={grant.clientId}>
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : grant.clientId)}
                          className="w-full text-left flex items-start gap-3.5 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                          aria-expanded={isOpen}
                        >
                          <AppLogo grant={grant} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[15px] text-foreground break-words">{grant.name}</span>
                              {grant.verified ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400" title="Classgrid checked who made this app">
                                  <BadgeCheck className="w-3 h-3" /> Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400" title="This app registered itself. Classgrid has not checked who made it.">
                                  <AlertTriangle className="w-3 h-3" /> Unverified app
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[13px] text-foreground/80">
                              <span className="text-muted-foreground">Has access to:</span> {summary(grant.scopes)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Access given on {formatDate(grant.connectedAt)} · Last active {agoText(grant.lastUsedAt)}
                              {sensitive.length > 0 && <> · <span className="text-amber-700 dark:text-amber-400">Can change data</span></>}
                            </p>
                          </div>
                          <ChevronDown className={`w-4 h-4 shrink-0 mt-1 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 pl-[4.4rem]">
                            <div className="text-xs font-semibold text-foreground mb-1.5">What {grant.name} can do</div>
                            <ul className="rounded-lg border border-border divide-y divide-border">
                              {grant.scopes.length ? grant.scopes.map((s) => (
                                <li key={s.scope} className="flex items-center gap-2.5 px-3 py-2 text-[13px]">
                                  {s.sensitive ? <Pencil className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> : <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                                  <span className="text-foreground">{s.label}</span>
                                  {s.sensitive && <span className="ml-auto text-[11px] text-amber-700 dark:text-amber-400 whitespace-nowrap">changes data</span>}
                                </li>
                              )) : (
                                <li className="px-3 py-2 text-[13px] text-muted-foreground">Nothing: this app only signed in.</li>
                              )}
                            </ul>

                            <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                              {grant.returnsToThisComputer ? (
                                <div className="flex items-center gap-2"><Laptop className="w-3.5 h-3.5" /> Signs in from a program on your computer ({grant.redirectHosts.join(", ")})</div>
                              ) : grant.redirectHosts.length > 0 ? (
                                <div className="flex items-center gap-2"><ExternalLink className="w-3.5 h-3.5" /> Sends you back to {grant.redirectHosts.join(", ")}</div>
                              ) : null}
                              {grant.website && (
                                <div className="flex items-center gap-2"><ExternalLink className="w-3.5 h-3.5" /> Website: <a href={grant.website} target="_blank" rel="noopener noreferrer" className="underline break-all">{grant.website.replace(/^https?:\/\//, "")}</a></div>
                              )}
                              {!grant.verified && (
                                <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400"><ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" /> This app registered itself with the name above. Classgrid has not checked who made it. Remove it if you don't recognise it.</div>
                              )}
                              <div className="break-all">App id: <span className="font-mono">{grant.clientId}</span></div>
                            </div>

                            <div className="mt-3">
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRemoveTarget(grant)}>
                                Remove access
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-sm font-semibold text-foreground">Connect Classgrid in another app</div>
              <p className="text-xs text-muted-foreground mt-1">In Claude, ChatGPT, Cursor or any app that supports MCP, add Classgrid as a connector with this link. The app then asks you to sign in and shows what it wants to access; you choose what to allow.</p>
              <div className="mt-2.5 flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">{MCP_URL}</code>
                <Button variant="outline" size="sm" onClick={copyMcp}>Copy</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DangerConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(o) => { if (!o && !isRemoving) setRemoveTarget(null); }}
        title="Remove access"
        description={removeTarget ? `${removeTarget.name} will lose access to your Classgrid account. You can connect it again later from the app.` : ""}
        warningMessage="The app is signed out immediately."
        actionLabel="Remove access"
        isLoading={isRemoving}
        onConfirm={() => { if (removeTarget) handleRemove(removeTarget); }}
      />
    </div>
  );
}
