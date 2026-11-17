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
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/marketing_ui/dialog";
import { apiClient } from "@/lib/apiClient";
import { formatDate, formatTime } from "@/utils/dateUtils";

// One admin action from the audit log that the server can undo (GET /api/super-admin/rollback/candidates)
type RollbackEntry = {
  _id: string;
  action: string;
  actorName?: string;
  actorRole?: string;
  targetId?: string | null;
  targetName?: string;
  targetType?: string;
  previousState?: { status?: string; role?: string } | null;
  metadata?: { reason?: string; newRole?: string } | null;
  rollbackStatus?: "none" | "rolled_back";
  rolledBackBy?: { name?: string; email?: string } | null;
  rolledBackAt?: string | null;
  timestamp: string;
};

const roleText = (role?: string) => (role ? role.replace(/_/g, " ") : "");

// What the action was, in plain words
function actionText(e: RollbackEntry): string {
  switch (e.action) {
    case "user.ban": return "Banned a user";
    case "user.unban": return "Unbanned a user";
    case "user.role_change": return "Changed a user's role";
    case "feature_flag.toggle": return "Turned a feature flag on or off";
    default: return e.action.replace(/[._]/g, " ");
  }
}

// What the action changed, in plain words
function changeText(e: RollbackEntry): string {
  if (e.action === "user.role_change") {
    const from = roleText(e.previousState?.role);
    const to = roleText(e.metadata?.newRole);
    return from && to ? `From ${from} to ${to}` : to ? `To ${to}` : "";
  }
  if (e.action === "user.ban" && e.metadata?.reason) return `Reason: ${e.metadata.reason}`;
  return "";
}

// What a rollback will do, in plain words (the inverse the server performs)
function undoText(e: RollbackEntry): string {
  switch (e.action) {
    case "user.ban": return "The user becomes active again.";
    case "user.unban": return "The user is suspended again.";
    case "user.role_change":
      return e.previousState?.role ? `The user's role goes back to ${roleText(e.previousState.role)}.` : "The old role was not saved, so this cannot be undone here.";
    case "feature_flag.toggle": return "The feature flag is switched back.";
    default: return "";
  }
}

const canUndo = (e: RollbackEntry) =>
  e.rollbackStatus !== "rolled_back" && (e.action !== "user.role_change" || !!e.previousState?.role);

function StatusChip({ entry }: { entry: RollbackEntry }) {
  if (entry.rollbackStatus === "rolled_back") {
    return <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Rolled back</span>;
  }
  return <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground">Can be undone</span>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function RollbackPage() {
  const qc = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<RollbackEntry | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["rollback-candidates"],
    queryFn: () => apiClient.get<{ success: boolean; data: RollbackEntry[] }>("/api/super-admin/rollback/candidates").then((r) => r.data),
    staleTime: 30_000,
  });

  const entries: RollbackEntry[] = Array.isArray(data?.data) ? data!.data : [];
  const rolledBack = entries.filter((e) => e.rollbackStatus === "rolled_back").length;
  const open = entries.length - rolledBack;

  const rollbackMut = useMutation({
    mutationFn: (logId: string) => apiClient.post<{ message?: string }>(`/api/super-admin/rollback/${logId}`).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["rollback-candidates"] });
      qc.invalidateQueries({ queryKey: ["super-admin", "activity-logs"] });
      toast.success(res?.message || "Action rolled back.");
      setConfirmTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Rollback failed."),
  });

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="border-b border-border bg-card px-4 py-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Rollback Actions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Undo an admin action from the last 7 days: a ban, an unban, a role change or a feature flag switch.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Can be undone" value={isLoading ? "-" : open} />
          <Stat label="Already rolled back" value={isLoading ? "-" : rolledBack} />
          <Stat label="Actions in the last 7 days" value={isLoading ? "-" : entries.length} />
        </div>

        <p className="text-sm text-muted-foreground">
          A rollback does the opposite of the action. It is saved on the action with who did it and when.
        </p>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-red-500">Could not load the actions.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-muted/30 text-left text-muted-foreground">
                  <th className="p-3 font-medium">When</th>
                  <th className="p-3 font-medium">Action</th>
                  <th className="p-3 font-medium">On</th>
                  <th className="p-3 font-medium">By</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Rollback</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No bans, unbans, role changes or feature flag switches in the last 7 days.
                    </td>
                  </tr>
                )}
                {entries.map((e) => {
                  const change = changeText(e);
                  return (
                    <tr key={e._id} className="border-t border-border/60 align-top">
                      <td className="whitespace-nowrap p-3">
                        <div className="text-foreground">{formatDate(e.timestamp)}</div>
                        <div className="text-xs text-muted-foreground">{formatTime(e.timestamp)}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{actionText(e)}</div>
                        {change && <div className="text-xs text-muted-foreground">{change}</div>}
                      </td>
                      <td className="p-3">
                        <div className="text-foreground">{e.targetName || "Unknown"}</div>
                        {e.targetId && <div className="font-mono text-xs text-muted-foreground">{e.targetId}</div>}
                      </td>
                      <td className="p-3 text-muted-foreground">{e.actorName || "System"}</td>
                      <td className="p-3">
                        <StatusChip entry={e} />
                        {e.rollbackStatus === "rolled_back" && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {e.rolledBackBy?.name || e.rolledBackBy?.email || "An admin"}
                            {e.rolledBackAt ? `, ${formatDate(e.rolledBackAt)}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {canUndo(e) ? (
                          <Button size="sm" variant="outline" onClick={() => setConfirmTarget(e)} disabled={rollbackMut.isPending}>
                            <RotateCcw size={13} /> Rollback
                          </Button>
                        ) : e.rollbackStatus === "rolled_back" ? (
                          <span className="text-xs text-muted-foreground">Done</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Old role not saved</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!confirmTarget} onOpenChange={(o) => { if (!o && !rollbackMut.isPending) setConfirmTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Roll back this action?</DialogTitle>
            <DialogDescription>
              {confirmTarget ? `${actionText(confirmTarget)}: ${confirmTarget.targetName || confirmTarget.targetId || "unknown"}. ${undoText(confirmTarget)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmTarget(null)} disabled={rollbackMut.isPending}>Cancel</Button>
            <Button isLoading={rollbackMut.isPending} onClick={() => confirmTarget && rollbackMut.mutate(confirmTarget._id)}>
              <RotateCcw size={14} /> Roll back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
