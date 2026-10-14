// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useEffect, useState } from "react";
import { AlertTriangle, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { fetchWithRescue } from "@/lib/rescue";

// Outside apps (Claude, Cursor, ChatGPT…) the user allowed through the Classgrid consent page.
// From GET /oauth/grants; Remove calls DELETE /oauth/grants/:clientId, which ends every token that app holds.
interface ConnectedAppGrant {
  clientId: string;
  name: string;
  clientKind: "registered" | "dynamic";
  scopes: { scope: string; label: string; sensitive: boolean }[];
  connectedAt: string;
  lastUsedAt: string;
}

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
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function AiConnectedAppsPanel({ backendUrl }: { backendUrl: string }) {
  const [grants, setGrants] = useState<ConnectedAppGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ConnectedAppGrant | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchGrants = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchWithRescue(`${backendUrl}/oauth/grants`, {
        method: "GET",
        headers: authHeaders(),
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setGrants(Array.isArray(data.grants) ? data.grants : []);
      } else {
        setLoadError(data.error_description || data.message || "Couldn't load your connected apps.");
      }
    } catch {
      setLoadError("Couldn't load your connected apps.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrants();
  }, [backendUrl]);

  const handleRemove = async (grant: ConnectedAppGrant) => {
    setIsRemoving(true);
    try {
      const res = await fetchWithRescue(`${backendUrl}/oauth/grants/${encodeURIComponent(grant.clientId)}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setGrants((prev) => prev.filter((g) => g.clientId !== grant.clientId));
        toast.success(`${grant.name} can no longer access your account`);
        setRemoveTarget(null);
      } else {
        toast.error(data.error_description || data.message || "Couldn't remove this app.");
      }
    } catch {
      toast.error("Couldn't remove this app.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <h3 className="text-2xl font-bold text-foreground mb-2">Connected apps</h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-xl">
        Apps like Claude, Cursor or ChatGPT that you allowed to use your Classgrid account. Remove one to cut off its access straight away.
      </p>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Spinner className="w-6 h-6" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 h-40 border border-border rounded-xl text-center px-4">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" size="sm" onClick={fetchGrants}>Try again</Button>
          </div>
        ) : grants.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 h-40 border-2 border-dashed border-border rounded-xl text-center px-4">
            <KeyRound className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No apps are connected to your account.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {grants.map((grant) => (
              <div key={grant.clientId} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground break-words">{grant.name}</span>
                      {grant.clientKind === "dynamic" ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                          title="This app registered itself. Classgrid has not checked who made it."
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Unverified app
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Connected {formatDate(grant.connectedAt)} · Last active {formatDate(grant.lastUsedAt)}
                    </p>
                    {grant.scopes.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {grant.scopes.map((s) => (
                          <li
                            key={s.scope}
                            className={`rounded-md px-2 py-0.5 text-[11px] ${s.sensitive ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}
                          >
                            {s.label}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget(grant)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DangerConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => { if (!open && !isRemoving) setRemoveTarget(null); }}
        title="Remove connected app"
        description={removeTarget ? `${removeTarget.name} will lose access to your Classgrid account. You can connect it again later from the app.` : ""}
        warningMessage="The app is signed out immediately."
        actionLabel="Remove app"
        isLoading={isRemoving}
        onConfirm={() => { if (removeTarget) handleRemove(removeTarget); }}
      />
    </div>
  );
}
