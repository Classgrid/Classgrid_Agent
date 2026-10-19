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

import { Input } from "@/components/marketing_ui/input";

import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Server, Database, Activity, Mail, AlertTriangle, CheckCircle2,
  RefreshCw, Cpu, MemoryStick, Clock, Zap, XCircle, AlertCircle, Info,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { DataTable } from "@/components/marketing_ui/data-table";
import { apiClient } from "@/lib/apiClient";
import { formatDate, formatTime } from "@/utils/dateUtils";

const fetchMetrics = () =>
  apiClient.get<any>("/api/super-admin/system-metrics").then((r) => r.data);

const fetchErrorLogs = (level: string) =>
  apiClient
    .get<any>(`/api/super-admin/error-logs${level ? `?level=${level}` : ""}`)
    .then((r) => r.data);

const fetchHealth = () =>
  apiClient.get<any>("/api/super-admin/health").then((r) => r.data);

function StatusDot({ up }: { up: boolean }) {
  return (
    <span
      
    />
  );
}

function formatUptime(secs: number) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const levelIcon: Record<string, React.ReactNode> = {
  error: <XCircle size={13}  />,
  warn: <AlertCircle size={13}  />,
  info: <Info size={13}  />,
};

export function SystemHealthPage() {
  const [logLevel, setLogLevel] = useState("");
  const [logSearch, setLogSearch] = useState("");

  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics, isFetching: metricsFetching } =
    useQuery({ queryKey: ["system-metrics"], queryFn: fetchMetrics, staleTime: 30_000, refetchInterval: 60_000 });

  const { data: healthData, isLoading: healthLoading } =
    useQuery({ queryKey: ["system-health"], queryFn: fetchHealth, staleTime: 30_000 });

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } =
    useQuery({ queryKey: ["error-logs", logLevel], queryFn: () => fetchErrorLogs(logLevel), staleTime: 30_000 });

  const m = metricsData?.data;
  const h = healthData;

  const logs: any[] = useMemo(() => {
    const raw = logsData?.errors ?? logsData?.data ?? [];
    if (!logSearch.trim()) return raw;
    const q = logSearch.toLowerCase();
    return raw.filter((l: any) =>
      (l.message ?? "").toLowerCase().includes(q) ||
      (l.context ?? "").toLowerCase().includes(q)
    );
  }, [logsData, logSearch]);

  const logColumns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "level",
      header: "Level",
      size: 80,
      cell: ({ getValue }) => {
        const lv = (getValue<string>() ?? "info").toLowerCase();
        return (
          <div >
            {levelIcon[lv] ?? levelIcon.info}
            <span >{lv}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "message",
      header: "Message",
      size: 320,
      cell: ({ getValue }) => {
        const val = getValue<any>();
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val || "");
        return (
          <span >
            {strVal}
          </span>
        );
      },
    },
    {
      accessorKey: "context",
      header: "Context",
      size: 150,
      cell: ({ getValue }) => {
        const val = getValue<any>();
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val || "");
        return (
          <Badge variant="neutral">{strVal || "—"}</Badge>
        );
      },
    },
    {
      accessorKey: "timestamp",
      header: "Time",
      size: 160,
      cell: ({ getValue }) => {
        const ts = getValue<string>();
        return ts ? (
          <div>
            <div >{formatDate(ts)}</div>
            <div >{formatTime(ts)}</div>
          </div>
        ) : "—";
      },
    },
  ], []);

  const dbUp = (h?.services?.mongodb?.status === "UP") || (h?.dbStatus === "connected");
  const redisUp = h?.services?.redis?.status === "UP";
  const serverUp = !healthLoading;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground mt-1">Real-time platform monitoring — infrastructure status, background jobs, memory, and error logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { refetchMetrics(); refetchLogs(); }} disabled={metricsFetching}>
            <RefreshCw size={14} className={metricsFetching ? "animate-spin mr-2" : "mr-2"} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Service Status */}
      <SectionPanel title="Service Status" description="Live connectivity of core platform services.">
        <div >
          {[
            { label: "API Server", up: serverUp, icon: <Server size={15} /> },
            { label: "MongoDB", up: dbUp, icon: <Database size={15} /> },
            { label: "Redis Cache", up: redisUp, icon: <Zap size={15} /> },
            { label: "Email Queue", up: true, icon: <Mail size={15} /> },
          ].map(({ label, up, icon }) => (
            <div key={label} >
              <span >{icon}</span>
              <div>
                <div >{label}</div>
                <div >
                  <StatusDot up={up} />
                  <span >
                    {up ? "Operational" : "Down"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        <StatCard title="Total Users" value={metricsLoading ? "—" : m?.users?.total ?? 0} icon={<Activity size={15} />}
          trend={`+${m?.users?.new7d ?? 0} new this week`} />
        <StatCard title="Active Orgs" value={metricsLoading ? "—" : m?.orgs?.active ?? 0} icon={<CheckCircle2 size={15} />}
          trend={`+${m?.orgs?.new7d ?? 0} new this week`} />
        <StatCard title="Suspended Orgs" value={metricsLoading ? "—" : m?.orgs?.suspended ?? 0} icon={<AlertTriangle size={15} />} />
        <StatCard title="Email Queue" value={metricsLoading ? "—" : m?.emails?.pending ?? 0} icon={<Mail size={15} />} />
        <StatCard title="Errors (24h)" value={metricsLoading ? "—" : m?.logs?.errors24h ?? 0} icon={<XCircle size={15} />} />
        <StatCard title="Warnings (24h)" value={metricsLoading ? "—" : m?.logs?.warnings24h ?? 0} icon={<AlertCircle size={15} />} />
        <StatCard title="Memory Usage" value={metricsLoading ? "—" : `${m?.memoryMB ?? 0} MB`} icon={<MemoryStick size={15} />} />
        <StatCard title="Uptime" value={metricsLoading ? "—" : formatUptime(m?.uptime ?? 0)} icon={<Clock size={15} />} />
      </div>

      {/* Email Stats */}
      <div >
        <SectionPanel title="Email Queue Stats" description="Status of all emails in the outgoing queue.">
          <div >
            {[
              { label: "Sent", count: m?.emails?.sent ?? 0, color: "hsl(var(--success))" },
              { label: "Pending", count: m?.emails?.pending ?? 0, color: "hsl(var(--warning))" },
              { label: "Failed", count: m?.emails?.failed ?? 0, color: "hsl(var(--danger))" },
            ].map(({ label, count, color }) => (
              <div key={label} >
                <span >{metricsLoading ? "—" : count}</span>
                <span >{label}</span>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      {/* Error Logs */}
      <div className="mt-5">
        <SectionPanel title="Error Logs" description="Recent system errors and warnings from the platform.">
          <div className="flex gap-2 items-center mb-4 pb-4 border-b border-border">
            <Input
              type="text"
              className="border border-border rounded-md px-3 py-2 text-sm bg-background flex-1"
              placeholder="Search messages..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
            <ResponsiveSelect
              className="border border-border rounded-md px-3 py-2 text-sm bg-background w-48"
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
            >
              <option value="">All Levels</option>
              <option value="error">Errors only</option>
              <option value="warn">Warnings only</option>
              <option value="info">Info only</option>
            </ResponsiveSelect>
          </div>
          <DataTable
            columns={logColumns}
            data={logs}
            isLoading={logsLoading}
            pageSize={20}
            emptyIcon={<CheckCircle2 size={32} />}
            emptyTitle="No logs found"
            emptyDescription="The system is clean — no matching log entries."
            emptyMessage="No error logs."
          />
        </SectionPanel>
      </div>
    </div>
  );
}
