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

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, RefreshCw, Clock, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";



import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/marketing_ui/dialog";
import { apiClient } from "@/lib/apiClient";
import { formatDate, formatTime } from "@/utils/dateUtils";


const ACTION_LABELS: Record<string, { label: string; variant: any }> = {
  "org.suspend":         { label: "Suspend Org",       variant: "danger" },
  "org.activate":        { label: "Activate Org",      variant: "success" },
  "org.delete":          { label: "Delete Org",        variant: "danger" },
  "user.ban":            { label: "Ban User",          variant: "danger" },
  "user.unban":          { label: "Unban User",        variant: "success" },
  "user.role_change":    { label: "Change Role",       variant: "info" },
  "user.force_logout":   { label: "Force Logout",      variant: "warning" },
  "subscription.update": { label: "Update Subscription", variant: "neutral" },
  "feature_flag.toggle": { label: "Toggle Feature Flag", variant: "neutral" },
};

export function RollbackPage() {
  const qc = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<any>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["rollback-candidates"],
    queryFn: () => apiClient.get<any>("/api/super-admin/rollback/candidates").then(r => r.data),
    staleTime: 30_000,
  });

  const candidates: any[] = data?.data ?? [];
  const rolled = candidates.filter(c => c.rollbackStatus === "rolled_back").length;

  const rollbackMut = useMutation({
    mutationFn: (logId: string) => apiClient.post(`/api/super-admin/rollback/${logId}`).then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["rollback-candidates"] });
      toast.success(res.message ?? "Action rolled back.");
      setConfirmTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Rollback failed."),
  });

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "createdAt", header: "When", size: 140,
      cell: ({ getValue }) => (
        <div>
          <div >{formatDate(getValue<string>())}</div>
          <div >{formatTime(getValue<string>())}</div>
        </div>
      ),
    },
    {
      accessorKey: "action", header: "Action", size: 170,
      cell: ({ getValue }) => {
        const a = ACTION_LABELS[getValue<string>()] ?? { label: getValue<string>(), variant: "neutral" };
        return <Badge variant={a.variant}>{a.label}</Badge>;
      },
    },
    {
      accessorKey: "userId", header: "Performed By", size: 180,
      cell: ({ getValue }) => {
        const u = getValue<any>();
        if (!u) return <span >System</span>;
        return (
          <div>
            <div >{u.name}</div>
            <div >{u.email}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "targetId", header: "Target", size: 180,
      cell: ({ getValue, row }) => {
        const id = getValue<string>();
        return <span >{id ?? "—"}</span>;
      },
    },
    {
      accessorKey: "rollbackStatus", header: "Status", size: 120,
      cell: ({ getValue }) => {
        const s = getValue<string>();
        if (s === "rolled_back") return <Badge variant="success" dot>Rolled Back</Badge>;
        return <Badge variant="neutral" dot>Eligible</Badge>;
      },
    },
    {
      id: "rollback", header: "Rollback", size: 120,
      cell: ({ row }) => {
        const c = row.original;
        if (c.rollbackStatus === "rolled_back") {
          return <span >✓ Done</span>;
        }
        return (
          <Button size="sm" variant="outline" onClick={() => setConfirmTarget(c)} disabled={rollbackMut.isPending}>
            <RotateCcw size={12} /> Rollback
          </Button>
        );
      },
    },
  ], [rollbackMut.isPending]);

  const eligible = candidates.filter(c => c.rollbackStatus !== "rolled_back").length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rollback Actions</h1>
          <p className="text-muted-foreground mt-1 text-sm">Undo critical admin actions from the last 7 days. Only destructive/reversible actions are listed here.</p>
        </div>
      </div>

      {/* Info */}
      <div >
        <Info size={18}  />
        <div>
          <div >How Rollback Works</div>
          <div >
            Only actions from the last <strong>7 days</strong> can be rolled back. Each rollback performs the <em>inverse operation</em> — e.g., rolling back a "Suspend Org" will re-activate it. Actions that cannot be auto-reversed (e.g., delete) will show an error and require manual action.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div title="Eligible for Rollback" value={isLoading ? "—" : eligible} icon={<RotateCcw size={15} />} />
        <div title="Already Rolled Back" value={isLoading ? "—" : rolled} icon={<CheckCircle2 size={15} />} />
        <div title="Total Tracked" value={isLoading ? "—" : candidates.length} icon={<Clock size={15} />} />
      </div>

      <div >
        <div title="Rollback Candidates" description="Destructive actions from the last 7 days. Click 'Rollback' to reverse." noPadding>
          <div columns={columns} data={candidates} isLoading={isLoading} pageSize={50}
            emptyIcon={<CheckCircle2 size={32} />}
            emptyTitle="No rollback candidates"
            emptyDescription={data?.note ?? "No reversible actions found in the last 7 days. Actions will appear here as they are performed."}
            emptyMessage="Nothing to roll back." />
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmTarget} onOpenChange={o => !o && setConfirmTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Rollback</DialogTitle>
            <DialogDescription>
              Reverse the action: <strong>{ACTION_LABELS[confirmTarget?.action]?.label ?? confirmTarget?.action}</strong>?
              This will perform the <em>inverse</em> operation on the target. This itself is also logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>Cancel</Button>
            <Button isLoading={rollbackMut.isPending} onClick={() => rollbackMut.mutate(confirmTarget._id)}>
              <RotateCcw size={14} /> Yes, Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
