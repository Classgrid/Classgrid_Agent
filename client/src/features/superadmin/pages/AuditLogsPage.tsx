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

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Play, RefreshCw, Upload, Expand, StopCircle, X, Filter, Copy, Download, FileJson } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/marketing_ui/tabs";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Button } from "@/components/marketing_ui/button";
import { DataTable } from "@/components/marketing_ui/data-table";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/marketing_ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/marketing_ui/dropdown-menu";
import { apiClient, API_BASE_URL } from "@/lib/apiClient";
import { formatDate, formatTime } from "@/utils/dateUtils";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { useErrorLogs } from "../queries/useAlerts";
import type { ErrorLog } from "../services/superAdminApi";
import { storageMenuCard, storageMenuIcon, storageMenuItem, storageMenuSeparator } from "../components/storage/storageMenuStyles";

// ── Shared bits ───────────────────────────────────────────────────────────────

const inputClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputClass} pl-9 pr-8`} />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const safeString = (val: any) => (typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? ""));

// ── Admin actions (AdminAuditLog, GET /api/super-admin/activity-logs) ─────────

type AdminLog = {
  _id: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  targetId?: string | null;
  targetName?: string;
  targetType?: string;
  previousState?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  rollbackStatus?: string;
  status?: string;
  ip?: string;
  timestamp: string;
};

// What each admin action means, in plain words. Actions not listed (old ones) show their name in plain words.
const ACTION_LABELS: Record<string, string> = {
  "user.plan_gift": "Gave a plan",
  "user.plan_end": "Moved back to Free",
  "user.ban": "Banned a user",
  "user.unban": "Unbanned a user",
  "user.force_logout": "Signed a user out",
  "user.role_change": "Changed a role",
  "user.reset_password": "Sent a password reset",
  "user.gdpr_export": "Downloaded a user's data",
  "user.gdpr_erase": "Erased a user's data",
  "feature_flag.toggle": "Switched a feature flag",
  "feature_flag.kill_all": "Turned off all feature flags",
  "platform.broadcast": "Sent an announcement",
  "subscription.update": "Changed a subscription",
  UPDATE_BILLING: "Changed billing settings",
  WEBHOOK_EVENT: "Payment event",
  VIEW: "Viewed",
  suspend_user: "Suspended a user",
  block_user: "Blocked a user",
  delete_user: "Deleted a user",
  reactivate_user: "Reactivated a user",
  change_password: "Changed a password",
  change_role: "Changed a role",
};

// The actions the filter offers: the ones Classgrid AI writes today
const FILTER_ACTIONS = [
  "user.plan_gift", "user.plan_end", "user.ban", "user.unban", "user.role_change", "user.reset_password",
  "user.gdpr_export", "user.gdpr_erase", "feature_flag.toggle", "UPDATE_BILLING", "WEBHOOK_EVENT",
];

function humanize(text: string) {
  const t = text.replace(/[._]/g, " ").trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const actionLabel = (action: string) => ACTION_LABELS[action] ?? humanize(action);

const PLAN_NAMES: Record<string, string> = { free: "Free", pro: "Pro", max: "Max" };
const planName = (id?: string) => (id ? PLAN_NAMES[id] ?? humanize(id) : "Free");

const TARGET_LABELS: Record<string, string> = {
  user: "User", users: "Users", feature_flag: "Feature flag", billing: "Billing", platform: "Classgrid", subscription: "Subscription",
};

function targetKind(log: AdminLog) {
  if (log.action === "WEBHOOK_EVENT") return "Payment";
  return log.targetType ? TARGET_LABELS[log.targetType] ?? humanize(log.targetType) : "";
}

const actorRoleText = (role?: string) => (role === "super_admin" ? "Super admin" : role === "system" ? "System" : role ? humanize(role) : "");

// The one line under an action that says what it did
function detailsText(log: AdminLog): string {
  const m = log.metadata || {};
  const parts: string[] = [];
  switch (log.action) {
    case "user.plan_gift":
      parts.push(`${planName(m.plan)}, ${m.expires_at ? `until ${formatDate(m.expires_at)}` : "no end date"}`);
      if (m.reason) parts.push(`Reason: ${m.reason}`);
      break;
    case "user.plan_end":
      if (log.previousState?.id && log.previousState.id !== "free") parts.push(`Was on ${planName(log.previousState.id)}`);
      if (m.reason) parts.push(`Reason: ${m.reason}`);
      break;
    case "user.role_change":
      if (log.previousState?.role || m.newRole) parts.push(`From ${humanize(log.previousState?.role || "unknown")} to ${humanize(m.newRole || "unknown")}`);
      break;
    case "user.ban":
      if (m.reason) parts.push(`Reason: ${m.reason}`);
      break;
    case "WEBHOOK_EVENT":
      if (m.amountInr !== undefined) parts.push(`₹${m.amountInr}`);
      if (m.paymentId) parts.push(`Payment ${m.paymentId}`);
      break;
    default:
      for (const [k, v] of Object.entries(m)) {
        if (v === null || v === undefined || v === "" || typeof v === "object") continue;
        parts.push(`${humanize(k)}: ${String(v)}`);
        if (parts.length >= 3) break;
      }
  }
  if (log.rollbackStatus === "rolled_back") parts.push("Rolled back");
  if (log.status && log.status !== "success") parts.push(humanize(log.status));
  return parts.join(". ");
}

const PAGE_SIZE = 50;

function AdminActions() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  useEffect(() => setPage(1), [q, action]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["super-admin", "activity-logs", "audit", q, action, page],
    queryFn: async () =>
      (await apiClient.get<{ logs: AdminLog[]; total: number }>("/api/super-admin/activity-logs", {
        params: { page, limit: PAGE_SIZE, ...(action ? { action } : {}), ...(q ? { q } : {}) },
      })).data,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const logs = Array.isArray(data?.logs) ? data!.logs : [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by admin or user" />
        <select value={action} onChange={(e) => setAction(e.target.value)} className={`${inputClass} sm:w-56`} aria-label="Action">
          <option value="">All actions</option>
          {FILTER_ACTIONS.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="sm:ml-auto">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-red-500">Could not load the admin actions.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{total} action{total === 1 ? "" : "s"}{q || action ? " match" : " in all"}. Newest first.</p>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-muted/30 text-left text-muted-foreground">
                  <th className="p-3 font-medium">When</th>
                  <th className="p-3 font-medium">Action</th>
                  <th className="p-3 font-medium">On</th>
                  <th className="p-3 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">{q || action ? "No actions match." : "No admin actions yet."}</td></tr>
                )}
                {logs.map((log) => {
                  const details = detailsText(log);
                  const kind = targetKind(log);
                  return (
                    <tr key={log._id} className="border-t border-border/60 align-top">
                      <td className="whitespace-nowrap p-3">
                        <div className="text-foreground">{formatDate(log.timestamp)}</div>
                        <div className="text-xs text-muted-foreground">{formatTime(log.timestamp)}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{actionLabel(log.action)}</div>
                        {details && <div className="text-xs text-muted-foreground break-words">{details}</div>}
                      </td>
                      <td className="p-3">
                        <div className="text-foreground break-all">{log.targetName || log.targetId || "Unknown"}</div>
                        {kind && <div className="text-xs text-muted-foreground">{kind}</div>}
                      </td>
                      <td className="p-3">
                        <div className="text-foreground">{log.actorName || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{actorRoleText(log.actorRole)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isFetching}>Back</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages || isFetching}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Server logs (SystemLog, GET /api/super-admin/error-logs; the rescue server when the main one is down) ─────────

function IconButton({ icon: Icon, label, onClick, active = false }: { icon: any; label: string; onClick: () => void; active?: boolean }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// 5xx and errors red, 4xx and warnings amber, the rest plain
function statusTone(level: string, statusCode?: number) {
  if (level === "error" || (statusCode && statusCode >= 500)) return "text-red-500";
  if (level === "warn" || (statusCode && statusCode >= 400)) return "text-amber-600 dark:text-amber-400";
  return "text-foreground";
}

const shortId = (id?: string) => (!id || id === "unauthenticated" ? "Signed out" : id === "system_service" ? "System" : id.slice(-8));

function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

function RescueLogin({ onDone }: { onDone: () => void }) {
  const { data: me } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!email && me?.email) setEmail(me.email); }, [me?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async () => {
    setBusy(true);
    setError("");
    try {
      const axios = (await import("axios")).default;
      // The rescue server answers on the same API address under /api/rescue (server/rescue-server.js)
      const r = await axios.create({ baseURL: API_BASE_URL }).post("/api/rescue/login", { email: email.trim(), password });
      localStorage.setItem("rescue_token", r.data.token);
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not sign in to the rescue server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
      <StopCircle size={40} className="text-red-500" />
      <h3 className="text-lg font-semibold text-foreground">The main server is down</h3>
      <p className="text-sm text-muted-foreground">Sign in to the rescue server to read the crash logs. Use your super admin email and the rescue password.</p>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      <input type="password" placeholder="Rescue password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && email && password) login(); }} className={inputClass} />
      <Button className="w-full" onClick={login} isLoading={busy} disabled={!email.trim() || !password}>Open rescue mode</Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function ServerLogs() {
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [traceId, setTraceId] = useState("");
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const q = useDebounced(search, 400);

  const { data: errData, isLoading, refetch, isFetching, error } = useErrorLogs(isLive ? 1000 : 0, q, undefined, category, traceId);
  const logs: ErrorLog[] = errData?.logs ?? [];

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen?.();
  };

  const stamp = () => format(new Date(), "yyyy-MM-dd-HHmm");

  const exportJSON = () => {
    if (!logs.length) return;
    download("data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2)), `server-logs-${stamp()}.json`);
  };

  const exportCSV = () => {
    if (!logs.length) return;
    const cell = (v: any) => `"${safeString(v).replace(/"/g, '""')}"`;
    const rows = logs.map((log) => [
      format(new Date(log.timestamp || Date.now()), "yyyy-MM-dd HH:mm:ss"), log.level, log.message, log.context || "", log.metadata?.traceId || "",
    ].map(cell).join(","));
    download("data:text/csv;charset=utf-8," + encodeURIComponent([["Time", "Level", "Message", "Context", "Trace ID"].join(","), ...rows].join("\n")), `server-logs-${stamp()}.csv`);
  };

  const copyVisible = () => {
    if (!logs.length) return;
    navigator.clipboard.writeText(logs.map((log) => `[${format(new Date(log.timestamp || Date.now()), "yyyy-MM-dd HH:mm:ss")}] ${String(log.level || "").toUpperCase()} - ${safeString(log.message)}`).join("\n"));
  };

  if (error && (error as Error).message === "RESCUE_REQUIRED") {
    return <RescueLogin onDone={() => refetch()} />;
  }

  const columns = [
    {
      key: "time", header: "Time", width: "w-[150px]",
      render: (_: any, log: ErrorLog) => (
        <div className="flex items-center whitespace-nowrap font-mono text-[13px] text-muted-foreground">
          <span className="mr-2 font-sans text-[10px] uppercase text-muted-foreground/70">{format(new Date(log.timestamp || Date.now()), "MMM dd")}</span>
          {format(new Date(log.timestamp || Date.now()), "HH:mm:ss.SS")}
        </div>
      ),
    },
    {
      key: "status", header: "Status", width: "w-[110px]",
      render: (_: any, log: ErrorLog) => (
        <div className="flex items-center gap-2 font-mono text-[13px] font-semibold">
          <span className={statusTone(log.level, log.metadata?.status)}>{log.metadata?.method || String(log.level || "").toUpperCase()}</span>
          {log.metadata?.status ? <span className={statusTone(log.level, log.metadata.status)}>{log.metadata.status}</span> : null}
        </div>
      ),
    },
    {
      key: "user", header: "User", width: "w-[110px]",
      render: (_: any, log: ErrorLog) => <div className="truncate font-mono text-[13px] text-muted-foreground" title={safeString(log.metadata?.userId)}>{shortId(log.metadata?.userId)}</div>,
    },
    {
      key: "request", header: "Request", width: "w-[240px]",
      render: (_: any, log: ErrorLog) => (
        <div className="truncate font-mono text-[13px] text-foreground" title={log.metadata?.url}>
          {log.metadata?.url ? log.metadata.url : <span className="text-muted-foreground/60">none</span>}
        </div>
      ),
    },
    {
      key: "messages", header: "Message",
      render: (_: any, log: ErrorLog) => (
        <div className="break-words font-mono text-[13px] text-foreground">
          <span className={log.level === "error" ? "text-red-500" : ""}>{safeString(log.message)}</span>
          {log.context && <span className="ml-2 font-sans text-xs text-muted-foreground">[{safeString(log.context)}]</span>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox value={search} onChange={setSearch} placeholder="Search server logs" />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setTraceId(""); }} className={`${inputClass} sm:w-40`} aria-label="Kind of log">
          {[["all", "All"], ["errors", "Errors"], ["warnings", "Warnings"], ["api", "API"], ["socket", "Socket"], ["cron", "Cron"], ["email queue", "Email queue"], ["ai agent", "AI agent"]].map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {traceId && (
          <div className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-border bg-muted px-3 font-mono text-xs text-foreground">
            <span title={traceId}>Trace {traceId.substring(0, 8)}</span>
            <button type="button" onClick={() => navigator.clipboard.writeText(traceId)} className="text-muted-foreground hover:text-foreground" title="Copy the full trace id"><Copy size={12} /></button>
            <button type="button" onClick={() => setTraceId("")} className="text-muted-foreground hover:text-foreground" title="Show all logs"><X size={14} /></button>
          </div>
        )}

        <div className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1 sm:ml-auto">
          <IconButton icon={Expand} label="Full screen" onClick={toggleFullScreen} />
          <button
            type="button"
            onClick={() => { setIsLive(!isLive); if (!isLive) refetch(); }}
            className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${isLive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {isLive ? <span className="h-2 w-2 animate-pulse rounded-full bg-current" /> : <Play size={12} />}
            Live
          </button>
          <IconButton icon={RefreshCw} label="Refresh logs" onClick={() => refetch()} active={isFetching} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Export" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Upload size={14} /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={`w-52 ${storageMenuCard}`}>
              <DropdownMenuItem onClick={copyVisible} className={storageMenuItem}><Copy className={storageMenuIcon} /><span>Copy these logs</span></DropdownMenuItem>
              <DropdownMenuSeparator className={storageMenuSeparator} />
              <DropdownMenuItem onClick={exportCSV} className={storageMenuItem}><Download className={storageMenuIcon} /><span>Download CSV</span></DropdownMenuItem>
              <DropdownMenuItem onClick={exportJSON} className={storageMenuItem}><FileJson className={storageMenuIcon} /><span>Download JSON</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-x-auto rounded-xl border border-border">
          <div className="min-w-[860px]">
            <DataTable
              columns={columns}
              rows={logs}
              isLoading={isLoading && !isLive}
              emptyMessage={q || traceId || category !== "all" ? "No logs match." : "No server logs."}
              className="border-0 rounded-none"
              onRowClick={(row) => setSelectedLog(row)}
            />
          </div>
        </div>

        {selectedLog && (
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 p-4">
              <h3 className="font-semibold text-foreground">Log details</h3>
              <button type="button" onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</div>
                <div className="break-words rounded border border-border bg-muted/50 p-3 font-mono text-sm text-foreground">{safeString(selectedLog.message)}</div>
              </div>

              {selectedLog.metadata?.traceId && (
                <Button className="w-full" onClick={() => { setTraceId(selectedLog.metadata.traceId); setSelectedLog(null); }}>
                  <Filter size={14} /> Show this whole request ({String(selectedLog.metadata.traceId).substring(0, 8)})
                </Button>
              )}

              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Duration", selectedLog.metadata?.durationMs ? `${selectedLog.metadata.durationMs} ms` : "None"],
                  ["Status", selectedLog.metadata?.status || "None"],
                  ["User id", selectedLog.metadata?.userId ? safeString(selectedLog.metadata.userId) : "None"],
                  ["IP address", selectedLog.metadata?.ip || "None"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
                    <div className="truncate font-mono text-sm text-foreground" title={String(value)}>{value}</div>
                  </div>
                ))}
              </div>

              {selectedLog.metadata?.body && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request body</div>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-border bg-muted/50 p-3 font-mono text-[11px] text-foreground">{JSON.stringify(selectedLog.metadata.body, null, 2)}</pre>
                </div>
              )}

              {selectedLog.stack && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stack trace</div>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-border bg-muted/50 p-3 font-mono text-[10px] text-red-500">{selectedLog.stack}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AuditLogsPage() {
  const [tab, setTab] = useState("admin");
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="border-b border-border bg-card px-4 py-5 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight">Audit Logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What super admins changed (plans given, bans, roles, feature flags, payments) and the server's own request and error logs.
        </p>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="admin">Admin actions</TabsTrigger>
            <TabsTrigger value="server">Server logs</TabsTrigger>
          </TabsList>
          <TabsContent value="admin" className="mt-6"><AdminActions /></TabsContent>
          <TabsContent value="server" className="mt-6">{tab === "server" && <ServerLogs />}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
