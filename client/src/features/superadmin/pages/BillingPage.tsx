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
import type { ColumnDef } from "@tanstack/react-table";
import {
  Search, Building2, CreditCard, Clock, CheckCircle,
  RefreshCw, ShieldCheck, Users,
} from "lucide-react";
import { toast } from "sonner";


import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { Button } from "@/components/marketing_ui/button";
import { Badge } from "@/components/marketing_ui/badge";

import { DataTable } from "@/components/marketing_ui/data-table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/marketing_ui/dialog";

import {
  dashboardApi, billingApi,
  type SuperAdminOrganization, type OrgSubscription,
} from "../services/superAdminApi";


// ── status badge variant helper ────────────────────────────────────────────────
const statusVariant = (s?: string) => {
  if (s === "active") return "success";
  if (s === "suspended" || s === "blocked") return "danger";
  return "warning";
};

// ── page ───────────────────────────────────────────────────────────────────────

export function BillingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]         = useState("");
  const [selectedOrg, setSelectedOrg] = useState<SuperAdminOrganization | null>(null);
  const [plan, setPlan]             = useState("demo");
  const [expiresAt, setExpiresAt]   = useState<Date | undefined>(undefined);

  // ── data fetching ──────────────────────────────────────────────────────────
  const {
    data: orgsData, isLoading: orgsLoading,
    isError: orgsError, refetch, isFetching,
  } = useQuery({
    queryKey: ["superadmin-all-orgs-billing"],
    queryFn: dashboardApi.getOrganizations,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["superadmin-org-subscription", selectedOrg?._id],
    queryFn: () => billingApi.getOrgSubscription(selectedOrg!._id),
    enabled: !!selectedOrg,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<OrgSubscription>) =>
      billingApi.updateOrgSubscription(selectedOrg!._id, payload),
    onSuccess: (res) => {
      toast.success(res.message || "Subscription updated.");
      queryClient.invalidateQueries({ queryKey: ["superadmin-all-orgs-billing"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-org-subscription", selectedOrg?._id] });
      setSelectedOrg(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update subscription.");
    },
  });

  // ── derived data ───────────────────────────────────────────────────────────
  const allOrgs = orgsData?.data ?? [];
  const filteredOrgs = allOrgs.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.name?.toLowerCase().includes(q) ||
      o.ownerEmail?.toLowerCase().includes(q) ||
      o.ownerName?.toLowerCase().includes(q) ||
      o.status?.toLowerCase().includes(q)
    );
  });

  const activeCount  = allOrgs.filter((o) => o.status === "active").length;
  const demoCount    = allOrgs.filter((o) => o.plan === "demo" || !o.plan).length;
  const totalUsers   = allOrgs.reduce((s, o) => s + (o.userCount ?? 0), 0);

  // ── open manage dialog ─────────────────────────────────────────────────────
  function openManage(org: SuperAdminOrganization) {
    setSelectedOrg(org);
    setPlan(org.plan || "demo");
    setExpiresAt(undefined);
  }

  // ── TanStack Table columns (correct ColumnDef format) ─────────────────────
  const columns: ColumnDef<SuperAdminOrganization>[] = [
    {
      header: "Organization",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
            <Building2 size={14} />
          </span>
          <div>
            <div className="font-medium text-foreground">{row.original.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {(row.original.orgType || "organization").replace(/_/g, " ")}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Owner",
      accessorKey: "ownerEmail",
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium">{row.original.ownerName || "—"}</div>
          <div className="text-xs text-muted-foreground">{row.original.ownerEmail || "—"}</div>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)} dot>
          {row.original.status ?? "unknown"}
        </Badge>
      ),
    },
    {
      header: "Plan",
      accessorKey: "plan",
      cell: ({ row }) => {
        const p = row.original.plan || "demo";
        return (
          <div className="flex items-center gap-1.5">
            {p === "active"
              ? <CheckCircle size={13} className="text-emerald-500" />
              : <Clock size={13} className="text-amber-500" />}
            <span className="capitalize text-sm">{p}</span>
          </div>
        );
      },
    },
    {
      header: "Users",
      accessorKey: "userCount",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium">{row.original.userCount ?? 0}</span>
      ),
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        <Button size="sm" variant="outline" onClick={() => openManage(row.original)}>
          <CreditCard size={13} /> Manage Plan
        </Button>
      ),
    },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">

      <div
        title="Plans & Billing"
        description="Manage organization subscriptions, quotas, and platform access."
        actions={
          
        }
      />

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={totalUsers} icon={Users} />
        <StatCard title="Active Subs" value={activeCount} icon={CheckCircle} />
        <StatCard title="Demo Orgs" value={demoCount} icon={Clock} />
        <StatCard title="Platform Load" value="Normal" icon={ShieldCheck} />
      </div>

      {/* ── Org table ─────────────────────────────────────────────────────── */}
      <SectionPanel
        title="Organizations"
        description="Click 'Manage Plan' to update a subscription or change plan type."
        noPadding
        actions={
          orgsError
            ? <Badge variant="danger">Load error</Badge>
            : <Badge variant="success">Live data</Badge>
        }
      >
        <div >
          <div
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search org name, owner, status…"
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredOrgs}
          isLoading={orgsLoading}
          isError={orgsError}
          onRetry={() => refetch()}
          loadingLabel="Loading organizations…"
          emptyIcon={<Building2 size={32} />}
          emptyTitle="No organizations found"
          emptyDescription="Try a different search term."
          emptyMessage="No organizations match your search."
        />
      </SectionPanel>

      {/* ── Manage Plan Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!selectedOrg}
        onOpenChange={(open) => { if (!open) setSelectedOrg(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>
              Update plan for <strong>{selectedOrg?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {subLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" /> Loading subscription…
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Plan Type</label>
                <div
                  value={plan}
                  onValueChange={setPlan}
                  options={[
                    { label: "Demo / Trial", value: "demo" },
                    { label: "Active (Paid)", value: "active" },
                  ]}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Expiration Date (optional)</label>
                <div
                  value={
                    expiresAt ||
                    (subData?.subscription?.expiresAt
                      ? new Date(subData.subscription.expiresAt)
                      : undefined)
                  }
                  onChange={setExpiresAt}
                />
              </div>



              {/* Billing rates display */}
              {(subData?.subscription as any)?.billing && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                  <p className="font-medium">Billing Rates (from Org Detail)</p>
                  <div className="text-muted-foreground space-y-0.5">
                    <div>Base: <strong>₹{(subData?.subscription as any).billing.basePricePerMonth ?? 0}/month</strong></div>
                    <div>Per GB: <strong>₹{(subData?.subscription as any).billing.pricePerGB ?? 0}</strong></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Edit rates on the Org Detail page for this org.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrg(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate({ plan, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined })}
              isLoading={updateMutation.isPending}
              disabled={subLoading}
            >
              Update Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
