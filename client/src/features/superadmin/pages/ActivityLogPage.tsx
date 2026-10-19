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

import { useState, useMemo } from "react";
import { Shield, RefreshCw, User, Building2, Clock, Filter } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Badge } from "@/components/marketing_ui/badge";
import { DataTable } from "@/components/marketing_ui/data-table";


import { formatDate, formatTime } from "@/utils/dateUtils";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/marketing_ui/button";


// ── types ─────────────────────────────────────────────────────────────────────

type AuditLog = {
  _id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  organization_id?: string;
  organizationName?: string;
  action: string;
  targetId?: string;
  targetName?: string;
  targetType: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  timestamp: string;
};

// ── helpers ───────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  add_faculty: "Added Faculty",
  remove_faculty: "Removed Faculty",
  remove_student: "Removed Student",
  change_role: "Changed Role",
  archive_classroom: "Archived Classroom",
  restore_classroom: "Restored Classroom",
  approve_note: "Approved Note",
  reject_note: "Rejected Note",
  create_announcement: "Created Announcement",
  delete_announcement: "Deleted Announcement",
  approve_org: "Approved Organization",
  reject_org: "Rejected Organization",
  suspend_org: "Suspended Organization",
  block_org: "Blocked Organization",
  reactivate_org: "Reactivated Organization",
  delete_org: "Deleted Organization",
  suspend_user: "Suspended User",
  block_user: "Blocked User",
  delete_user: "Deleted User",
  reactivate_user: "Reactivated User",
  change_password: "Changed Password",
  login_as_demo: "Logged In As (Demo)",
  attendance_suspicious: "Suspicious Attendance Flagged",
  attendance_manual_override: "Manual Attendance Override",
};

const ACTION_SEVERITY: Record<string, "danger" | "warning" | "info" | "success"> = {
  approve_org: "success",
  reactivate_org: "success",
  reactivate_user: "success",
  approve_note: "success",
  add_faculty: "info",
  create_announcement: "info",
  change_role: "info",
  archive_classroom: "warning",
  suspend_org: "warning",
  suspend_user: "warning",
  block_org: "danger",
  block_user: "danger",
  delete_org: "danger",
  delete_user: "danger",
  reject_org: "danger",
};

function getSeverity(action: string): "danger" | "warning" | "info" | "success" {
  return ACTION_SEVERITY[action] ?? "info";
}

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchActivityLogs(filters: { action?: string; targetType?: string }) {
  const params: Record<string, string> = { limit: "100" };
  if (filters.action) params.action = filters.action;
  if (filters.targetType) params.targetType = filters.targetType;
  const res = await apiClient.get<{ success: boolean; logs: AuditLog[]; total: number }>(
    "/api/super-admin/activity-logs",
    { params }
  );
  return res.data;
}

// ── columns ───────────────────────────────────────────────────────────────────

const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    size: 150,
    cell: ({ getValue }) => {
      const d = getValue<string>();
      return (
        <div>
          <div >
            {formatDate(d)}
          </div>
          <div >{formatTime(d)}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "actorName",
    header: "Actor",
    size: 180,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div>
          <div >{log.actorName}</div>
          <div >{log.actorRole.replace("_", " ")}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    size: 200,
    cell: ({ getValue, row }) => {
      const action = getValue<string>();
      if (action === "WEBHOOK_EVENT") {
        const meta = row.original.metadata;
        if (meta?.providerPaymentId) {
          return (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Payment Successful
            </div>
          );
        }
        return <Badge variant="info">Webhook Event</Badge>;
      }
      return (
        <Badge variant={getSeverity(action)}>
          {ACTION_LABELS[action] ?? action.replace(/_/g, " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "targetName",
    header: "Target",
    size: 180,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div>
          <div >{log.targetName || "—"}</div>
          <div  >
            {log.targetType}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "organizationName",
    header: "Organization",
    size: 160,
    cell: ({ getValue }) => {
      const org = getValue<string>();
      return org ? (
        <span>{org}</span>
      ) : (
        <span >Platform</span>
      );
    },
  },
  {
    accessorKey: "ip",
    header: "IP Address",
    size: 120,
    cell: ({ getValue }) => (
      <span >{getValue<string>() || "—"}</span>
    ),
  },
  {
    accessorKey: "metadata",
    header: "Details",
    size: 250,
    cell: ({ row, getValue }) => {
      const meta = getValue<Record<string, unknown>>();
      const d = row.original.timestamp;
      
      if (!meta || Object.keys(meta).length === 0) return <span className="text-muted-foreground">—</span>;

      // Special rendering for successful payments
      if (row.original.action === "WEBHOOK_EVENT" && meta.providerPaymentId) {
        return (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs space-y-1 text-emerald-700 dark:text-emerald-300 shadow-sm w-full min-w-[200px]">
            <div className="font-bold mb-1 border-b border-emerald-500/20 pb-1 flex justify-between items-center">
              <span>Receipt</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">{typeof meta.providerPaymentId === 'string' ? meta.providerPaymentId : JSON.stringify(meta.providerPaymentId)}</span>
            </div>
            <div className="grid grid-cols-[60px_1fr] gap-x-2">
              <span className="font-semibold opacity-80">Amount:</span> <span>₹{meta.amountInr as number}</span>
              <span className="font-semibold opacity-80">Name:</span> <span>{typeof meta.payerName === 'string' ? meta.payerName : JSON.stringify(meta.payerName)}</span>
              <span className="font-semibold opacity-80">Email:</span> <span>{typeof meta.email === 'string' ? meta.email : JSON.stringify(meta.email)}</span>
              <span className="font-semibold opacity-80">Phone:</span> <span>{typeof meta.contact === 'string' ? meta.contact : JSON.stringify(meta.contact)}</span>
            </div>
          </div>
        );
      }

      return (
        <div className="text-xs space-y-1">
          {meta.payerName && <div><span className="font-semibold">Name:</span> {typeof meta.payerName === 'string' ? meta.payerName : JSON.stringify(meta.payerName)}</div>}
          {meta.email && <div><span className="font-semibold">Email:</span> {typeof meta.email === 'string' ? meta.email : JSON.stringify(meta.email)}</div>}
          {meta.contact && <div><span className="font-semibold">Phone:</span> {typeof meta.contact === 'string' ? meta.contact : JSON.stringify(meta.contact)}</div>}
          {meta.amountInr && <div><span className="font-semibold">Amount:</span> ₹{meta.amountInr as number}</div>}
          {meta.providerPaymentId && <div><span className="font-semibold">Txn:</span> {typeof meta.providerPaymentId === 'string' ? meta.providerPaymentId : JSON.stringify(meta.providerPaymentId)}</div>}
          {meta.providerPaymentId && d && (
             <div className="pt-1 text-muted-foreground"><span className="font-semibold">Paid at:</span> {formatDate(d)} - {formatTime(d)}</div>
          )}
        </div>
      );
    },
  },
];

// ── page ──────────────────────────────────────────────────────────────────────

const ALL_ACTIONS = Object.keys(ACTION_LABELS);
const ALL_TARGETS = ["faculty", "student", "classroom", "note", "announcement", "organization", "user", "demo"];

export function ActivityLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["super-admin", "activity-logs", actionFilter, targetFilter],
    queryFn: () => fetchActivityLogs({ action: actionFilter || undefined, targetType: targetFilter || undefined }),
    staleTime: 30_000,
  });

  const logs = data?.logs ?? [];

  const stats = useMemo(() => {
    const total = data?.total ?? 0;
    const danger = logs.filter((l) => getSeverity(l.action) === "danger").length;
    const warning = logs.filter((l) => getSeverity(l.action) === "warning").length;
    const superAdminActions = logs.filter((l) => l.actorRole === "super_admin").length;
    return { total, danger, warning, superAdminActions };
  }, [logs, data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.actorName?.toLowerCase().includes(q) ||
        l.targetName?.toLowerCase().includes(q) ||
        l.organizationName?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Immutable record of all administrative actions taken on the platform.
          </p>
        </div>
        <div className="flex gap-2">
          
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Events" value={isLoading ? "—" : stats.total} icon={<Shield size={16} />} />
        <StatCard title="Super Admin Actions" value={isLoading ? "—" : stats.superAdminActions} icon={<User size={16} />} />
        <StatCard title="High-Risk Events" value={isLoading ? "—" : stats.danger} icon={<Building2 size={16} />} />
        <StatCard title="Warning Events" value={isLoading ? "—" : stats.warning} icon={<Clock size={16} />} />
      </div>

      {/* Filters */}
      <div
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search actor, target, org…"
        filters={
          <div >
            <div >
              <div
                value={actionFilter}
                onValueChange={setActionFilter}
                placeholder="All Actions"
                options={ALL_ACTIONS.map(a => ({ label: ACTION_LABELS[a] ?? a, value: a }))}
                allowClear
              />
            </div>
            <div >
              <div
                value={targetFilter}
                onValueChange={setTargetFilter}
                placeholder="All Targets"
                options={ALL_TARGETS.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))}
                allowClear
              />
            </div>
          </div>
        }
        actions={
          (actionFilter || targetFilter || search) && (
            <Button variant="outline" onClick={() => { setActionFilter(""); setTargetFilter(""); setSearch(""); }}>
              Clear
            </Button>
          )
        }
        className="mb-4"
      />

      {/* Table */}
      <SectionPanel title="Event Timeline" description="Most recent actions first." noPadding>
        {isError ? (
          <div className="p-4 rounded-md border bg-red-100 text-red-800 p-4 rounded-md border border-red-200" >
            <div className="p-4 rounded-md border__body">
              <span className="p-4 rounded-md border__title">Failed to load audit logs</span>
            </div>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            pageSize={15}
            emptyMessage={
              isLoading
                ? "Loading audit logs…"
                : logs.length === 0
                ? "No audit log entries found. Actions taken by admins will appear here."
                : "No entries match your filters."
            }
          />
        )}
      </SectionPanel>
    </div>
  );
}
