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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database, Download, RefreshCw, AlertTriangle, CheckCircle2, Clock,
  HardDrive, Shield, Activity, Mail, Flag, Users, Building2, XCircle,
  ShieldCheck, Search, ExternalLink,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/marketing_ui/dialog";
import { apiClient } from "@/lib/apiClient";

// ── API ─────────────────────────────────────────────────────────────────────

const fetchBackupStats = () =>
  apiClient.get<any>("/api/super-admin/backup/stats").then((r) => r.data);

const fetchMetrics = () =>
  apiClient.get<any>("/api/super-admin/system-metrics").then((r) => r.data);

const fetchIntegrity = () =>
  apiClient.get<any>("/api/super-admin/backup/integrity").then((r) => r.data);

// ── Helpers ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users size={14} />, building: <Building2 size={14} />, rupee: <Database size={14} />,
  shield: <Shield size={14} />, activity: <Activity size={14} />, mail: <Mail size={14} />, flag: <Flag size={14} />,
};

const formatUptime = (s: number) => {
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatCount = (n: number) => new Intl.NumberFormat("en-IN").format(n);

// ── Tab Button ───────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      onClick={onClick}
      
    >{children}</Button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function BackupPage() {
  const [tab, setTab] = useState<"overview" | "export" | "integrity">("overview");
  const [exportTarget, setExportTarget] = useState<any>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportLog, setExportLog] = useState<Array<{ key: string; label: string; count: number; ts: string }>>([]);

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } =
    useQuery({ queryKey: ["backup-stats"], queryFn: fetchBackupStats, staleTime: 60_000 });

  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics } =
    useQuery({ queryKey: ["system-metrics"], queryFn: fetchMetrics, staleTime: 60_000 });

  const { data: integrityData, isLoading: integrityLoading, refetch: refetchIntegrity } =
    useQuery({ queryKey: ["backup-integrity"], queryFn: fetchIntegrity, staleTime: 60_000, enabled: tab === "integrity" });

  const stats = statsData?.data;
  const metrics = metricsData?.data;
  const integrity = integrityData?.data;
  const collections: any[] = stats?.collections ?? [];

  const totalRecords = collections.reduce((s, c) => s + (c.count ?? 0), 0);

  function refetchAll() {
    refetchStats();
    refetchMetrics();
    if (tab === "integrity") refetchIntegrity();
  }

  // ── Real export via backend endpoint ────────────────────────────────────────
  async function handleExport(col: any) {
    setExporting(col.key);
    try {
      const res = await apiClient.get(`/api/super-admin/backup/export/${col.key}`, {
        responseType: "blob",
      });

      // Try to parse count from headers or use col.count
      const ts = new Date().toISOString().slice(0, 10);
      const filename = `classgrid-${col.key}-${ts}.json`;

      const blob = new Blob([res.data as any], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${col.label} exported — ${filename}`);
      setExportLog((prev) => [{ key: col.key, label: col.label, count: col.count, ts: new Date().toISOString() }, ...prev]);
    } catch (e: any) {
      toast.error(`Failed to export ${col.label}.`);
    } finally {
      setExporting(null);
      setExportTarget(null);
    }
  }

  // ── Collection Stats Table ───────────────────────────────────────────────────
  const statsColumns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "label", header: "Collection", size: 220,
      cell: ({ row, getValue }) => (
        <div >
          <span >{ICON_MAP[row.original.icon] ?? <Database size={14} />}</span>
          <span >{getValue<string>()}</span>
        </div>
      ),
    },
    {
      accessorKey: "count", header: "Record Count", size: 140,
      cell: ({ getValue }) => (
        <span >
          {formatCount(getValue<number>())}
        </span>
      ),
    },
    {
      accessorKey: "key", header: "Collection Key", size: 160,
      cell: ({ getValue }) => (
        <span >
          {getValue<string>()}
        </span>
      ),
    },
    {
      id: "export", header: "Export", size: 130,
      cell: ({ row }) => (
        <Button size="sm" variant="outline" isLoading={exporting === row.original.key}
          onClick={() => setExportTarget(row.original)}>
          <Download size={12} /> Export
        </Button>
      ),
    },
  ], [exporting]);

  // ── Export Log Table ─────────────────────────────────────────────────────────
  const logColumns: ColumnDef<any>[] = useMemo(() => [
    { accessorKey: "label", header: "Collection", size: 180, cell: ({ getValue }) => <span >{getValue<string>()}</span> },
    { accessorKey: "count", header: "Records", size: 120, cell: ({ getValue }) => <span >{formatCount(getValue<number>())}</span> },
    {
      accessorKey: "ts", header: "Exported At", size: 200,
      cell: ({ getValue }) => <span >{new Date(getValue<string>()).toLocaleString("en-IN")}</span>,
    },
    { id: "status", header: "Status", size: 100, cell: () => <Badge variant="success" dot>Downloaded</Badge> },
  ], []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div
        title="Backup & Recovery"
        description="Export platform data collections, run integrity checks, and monitor system storage health."
        actions={
          <div >
            <div >
              <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabBtn>
              <TabBtn active={tab === "export"} onClick={() => setTab("export")}>Data Export</TabBtn>
              <TabBtn active={tab === "integrity"} onClick={() => { setTab("integrity"); refetchIntegrity(); }}>Integrity Check</TabBtn>
            </div>
            <Button variant="outline" onClick={refetchAll}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Records" value={statsLoading ? "—" : formatCount(totalRecords)} icon={<Database size={15} />} />
        <StatCard title="Collections" value={statsLoading ? "—" : collections.length} icon={<Shield size={15} />} />
        <StatCard title="Memory" value={metricsLoading ? "—" : `${metrics?.memoryMB ?? 0} MB`} icon={<HardDrive size={15} />} />
        <StatCard title="Uptime" value={metricsLoading ? "—" : formatUptime(metrics?.uptime ?? 0)} icon={<Clock size={15} />} />
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div >

          {/* MongoDB Atlas Banner */}
          <div >
            <div >
              <Database size={18}  />
              <div>
                <div >MongoDB Atlas — Automated Backup Active</div>
                <div >
                  Daily snapshots + point-in-time restore (7 days). To restore: <strong>cloud.mongodb.com</strong> → Cluster → Backup → Restore Point.
                </div>
              </div>
            </div>
            <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" >
              <Button variant="outline" size="sm"><ExternalLink size={13} /> Open Atlas</Button>
            </a>
          </div>

          {/* System Health Details */}
          <SectionPanel title="System Health" description="Runtime diagnostics for the current server instance.">
            <div >
              {[
                { label: "Node.js Version", value: metrics?.nodeVersion ?? "—", icon: <CheckCircle2 size={13} />, ok: true },
                { label: "Heap Memory", value: `${metrics?.memoryMB ?? 0} MB`, icon: <HardDrive size={13} />, ok: (metrics?.memoryMB ?? 0) < 512 },
                { label: "Server Uptime", value: formatUptime(metrics?.uptime ?? 0), icon: <Clock size={13} />, ok: true },
                { label: "Active Orgs", value: metrics?.orgs?.active ?? 0, icon: <Building2 size={13} />, ok: true },
                { label: "Suspended Orgs", value: metrics?.orgs?.suspended ?? 0, icon: <AlertTriangle size={13} />, ok: (metrics?.orgs?.suspended ?? 0) === 0 },
                { label: "Errors (24h)", value: metrics?.logs?.errors24h ?? 0, icon: <XCircle size={13} />, ok: (metrics?.logs?.errors24h ?? 0) === 0 },
                { label: "Emails Sent", value: formatCount(metrics?.emails?.sent ?? 0), icon: <Mail size={13} />, ok: true },
                { label: "Email Failures", value: metrics?.emails?.failed ?? 0, icon: <AlertTriangle size={13} />, ok: (metrics?.emails?.failed ?? 0) === 0 },
              ].map(({ label, value, icon, ok }) => (
                <div key={label} >
                  <div >
                    <div >{icon}{label}</div>
                    {!ok && <AlertTriangle size={12}  />}
                  </div>
                  <div >{metricsLoading ? "—" : value}</div>
                </div>
              ))}
            </div>
          </SectionPanel>

          {/* Backup Strategy Checklist */}
          <SectionPanel title="Backup Strategy" description="Current status of each backup layer.">
            {[
              { label: "Database (MongoDB Atlas)", status: "Auto ✓", desc: "Daily snapshots + 7-day point-in-time restore", ok: true },
              { label: "File Storage (Supabase)", status: "Replicated ✓", desc: "Files replicated across multiple Supabase regions", ok: true },
              { label: "Codebase (Git)", status: "Version Controlled ✓", desc: "All code committed — push to GitHub before each deploy", ok: true },
              { label: "Email Templates (Brevo)", status: "Cloud ✓", desc: "Templates live on Brevo — not locally stored", ok: true },
              { label: "Environment Config (.env)", status: "⚠️ Manual", desc: "Not backed up automatically — store in Bitwarden/1Password", ok: false },
              { label: "Razorpay Keys", status: "⚠️ Manual", desc: "Per-org keys stored in DB — make sure DB backup is running", ok: false },
            ].map(({ label, status, desc, ok }) => (
              <div key={label} >
                <div>
                  <div >{label}</div>
                  <div >{desc}</div>
                </div>
                <Badge variant={ok ? "success" : "warning"}>{status}</Badge>
              </div>
            ))}
          </SectionPanel>
        </div>
      )}

      {/* ── EXPORT TAB ───────────────────────────────────────────────────────── */}
      {tab === "export" && (
        <div >

          {/* Warning */}
          <div >
            <AlertTriangle size={16}  />
            <span >
              Exports contain <strong>real production data</strong>. Downloads are logged. Store exported files securely — never share publicly.
            </span>
          </div>

          {/* Collection Table */}
          <SectionPanel title="Collections" description={`${collections.length} collections — ${formatCount(totalRecords)} total records`} noPadding>
            <DataTable
              columns={statsColumns}
              data={collections}
              isLoading={statsLoading}
              pageSize={20}
              emptyIcon={<Database size={32} />}
              emptyTitle="Loading collection stats…"
              emptyDescription="Data is being fetched from the database."
              emptyMessage="No collections found."
            />
          </SectionPanel>

          {/* Export Log */}
          {exportLog.length > 0 && (
            <SectionPanel title="Export Log (this session)" description="Downloads performed in this browser session." noPadding>
              <DataTable columns={logColumns} data={exportLog} pageSize={10}
                emptyMessage="No exports yet." emptyTitle="No exports" emptyDescription="" emptyIcon={<Download size={24} />} />
            </SectionPanel>
          )}
        </div>
      )}

      {/* ── INTEGRITY TAB ────────────────────────────────────────────────────── */}
      {tab === "integrity" && (
        <div >
          <div >
            <div>
              <div >
                Data Integrity Status:{" "}
                <span >
                  {integrityLoading ? "Checking…" : integrity?.status === "clean" ? "✅ All Clear" : "⚠️ Issues Found"}
                </span>
              </div>
              {integrity?.checkedAt && (
                <div >
                  Last checked: {new Date(integrity.checkedAt).toLocaleString("en-IN")}
                </div>
              )}
            </div>
            <Button variant="outline" onClick={() => refetchIntegrity()} isLoading={integrityLoading}>
              <Search size={14} /> Re-run Check
            </Button>
          </div>

          {/* Issues */}
          {(integrity?.issues ?? []).length > 0 && (
            <div >
              {integrity.issues.map((issue: any, i: number) => (
                <div key={i} >
                  {issue.type === "warning" ? <AlertTriangle size={15}  /> : <Database size={15}  />}
                  <span >{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Checks Table */}
          <SectionPanel title="Integrity Checks" description="Automated data consistency verifications.">
            {integrityLoading ? (
              <div >Running checks…</div>
            ) : (
              (integrity?.checks ?? []).map((check: any) => (
                <div key={check.label} >
                  <div >
                    {check.ok ? <CheckCircle2 size={15}  /> : <AlertTriangle size={15}  />}
                    <span >{check.label}</span>
                  </div>
                  <div >
                    <span >{formatCount(check.value)}</span>
                    <Badge variant={check.ok ? "success" : "warning"}>{check.ok ? "OK" : "Review"}</Badge>
                  </div>
                </div>
              ))
            )}
          </SectionPanel>
        </div>
      )}

      {/* Export Confirm Dialog */}
      <Dialog open={!!exportTarget} onOpenChange={(o) => !o && setExportTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export — {exportTarget?.label}</DialogTitle>
            <DialogDescription>
              Download all <strong>{formatCount(exportTarget?.count ?? 0)} records</strong> from the <code>{exportTarget?.key}</code> collection as a JSON file.
              <br /><br />
              ⚠️ This file will contain <strong>real production data</strong>. Handle with care.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportTarget(null)}>Cancel</Button>
            <Button isLoading={exporting === exportTarget?.key} onClick={() => handleExport(exportTarget)}>
              <Download size={14} /> Download JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
