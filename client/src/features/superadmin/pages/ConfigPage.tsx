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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Server, Activity, Database, HardDrive, Cpu, AlertTriangle, Trash2, Phone } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/marketing_ui/dialog";
import { useSystemHealth, HEALTH_KEY } from "../queries/useConfig";

// ── Helpers ───────────────────────────────────────────────────────────────────

const bytesToGB = (bytes: number) => bytes / (1024 * 1024 * 1024);

function formatUptime(seconds: number) {
  if (!seconds) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

// Seconds since the server ran its checks, ticking every second
function useSecondsSince(timestamp: string | null | undefined) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (!timestamp) { setSeconds(null); return; }
    const update = () => setSeconds(Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [timestamp]);
  return seconds;
}

// A bar for RAM or disk: plain under 80%, amber over 80%, red over 90%
function MetricBar({ label, used, total, pct }: { label: string; used: number; total: number; pct: number }) {
  const critical = pct > 90;
  const warning = pct > 80 && !critical;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {used.toFixed(1)} of {total.toFixed(1)} GB used, {(total - used).toFixed(1)} GB free
          <span className={`ml-2 font-semibold ${critical ? "text-red-500" : warning ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{pct.toFixed(1)}%</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all duration-700 ${critical ? "bg-red-500" : warning ? "bg-amber-500" : "bg-foreground"}`}
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function InfoChip({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-lg border border-border bg-muted/30 p-2.5 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate font-mono text-sm text-foreground" title={value || ""}>{value || "None"}</p>
    </div>
  );
}

type ServiceCheck = { status?: string; ping?: string; error?: string };

// A service's check from /api/super-admin/health, in plain words
function serviceState(s?: ServiceCheck): { text: string; tone: "ok" | "off" | "down" | "wait" } {
  switch (s?.status) {
    case "UP": return { text: s.ping ? `Working, ${s.ping}` : "Working", tone: "ok" };
    case "CONFIGURED": return { text: "Set up", tone: "ok" };
    case "NOT_CONFIGURED": return { text: "Not set up", tone: "off" };
    case "DOWN": return { text: "Down", tone: "down" };
    default: return { text: "Checking", tone: "wait" };
  }
}

function ServiceRow({ name, icon: Icon, check }: { name: string; icon: any; check?: ServiceCheck }) {
  const state = serviceState(check);
  const dot = state.tone === "ok" ? "bg-foreground" : state.tone === "down" ? "bg-red-500" : "bg-muted-foreground/40";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <div className={`rounded-md p-2 ${state.tone === "down" ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground">{name}</h4>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
        </div>
        <p className={`text-xs ${state.tone === "down" ? "text-red-500" : "text-muted-foreground"}`}>{state.text}</p>
        {state.tone === "down" && check?.error && <p className="mt-1 break-words font-mono text-[11px] text-muted-foreground">{check.error}</p>}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CONFIRM_TEXT = "clean logs";

export function ConfigPage() {
  const queryClient = useQueryClient();
  const { data: health, isLoading, isError, refetch } = useSystemHealth();
  const secondsSince = useSecondsSince(health?.timestamp);

  const [cleanOpen, setCleanOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [cleaning, setCleaning] = useState(false);

  const ram = health?.osMetrics?.ram;
  const disk = health?.osMetrics?.disk;
  const diskCritical = (disk?.usagePct || 0) > 90;
  const ramCritical = (ram?.usagePct || 0) > 90;
  const server = health?.server;
  const services = health?.services || {};
  const warnings: string[] = Array.isArray(health?.warnings) ? health!.warnings : [];

  const cleanLogs = async () => {
    setCleaning(true);
    try {
      await apiClient.post("/api/super-admin/clean-logs");
      toast.success("Server logs cleaned.");
      queryClient.invalidateQueries({ queryKey: HEALTH_KEY });
      setCleanOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not clean the logs.");
    } finally {
      setCleaning(false);
    }
  };

  const openClean = () => { setConfirmText(""); setCleanOpen(true); };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="border-b border-border bg-card px-4 py-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">System Config</h2>
          {health && (
            health.status === "HEALTHY" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" /> All systems working
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> Something needs a look
              </span>
            )
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          The API server's memory, disk and the services it needs. Checked again every 5 seconds
          {secondsSince !== null ? `, last ${secondsSince}s ago` : ""}.
        </p>
      </div>

      <div className="space-y-6 px-4 py-5 sm:p-6">
        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : isError && !health ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-red-500">Could not reach the server for its health check.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          </div>
        ) : (
          <>
            {warnings.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={18} />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">Server warnings</h4>
                  <ul className="mt-1 space-y-1">
                    {warnings.map((w, i) => <li key={i} className="font-mono text-xs text-red-600/90 dark:text-red-400/90">{w}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className={`rounded-xl border bg-card p-4 sm:p-5 lg:col-span-2 ${diskCritical || ramCritical ? "border-red-500/50" : "border-border"}`}>
                <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Server className={diskCritical || ramCritical ? "text-red-500" : "text-muted-foreground"} size={18} />
                  <h3 className="text-base font-semibold text-foreground">API server</h3>
                  {diskCritical && (
                    <Button variant="outline" size="sm" onClick={openClean} disabled={cleaning} className="h-8 gap-1.5 border-red-500/30 px-3 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400">
                      <Trash2 size={12} /> Clean logs and cache
                    </Button>
                  )}
                  <span className="ml-auto flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <Activity size={12} /> Up {formatUptime(health?.uptime ?? 0)}
                  </span>
                </div>

                <div className="space-y-6">
                  <MetricBar label="Memory (RAM)" used={bytesToGB(ram?.used || 0)} total={bytesToGB(ram?.total || 0)} pct={ram?.usagePct || 0} />
                  <MetricBar label="Disk" used={bytesToGB(disk?.used || 0)} total={bytesToGB(disk?.total || 0)} pct={disk?.usagePct || 0} />
                </div>

                {server && (
                  <div className="mt-6 border-t border-border pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Cpu className="text-muted-foreground" size={14} />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Server details</h4>
                      {server.provider === "AWS" && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">AWS EC2</span>}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {server.provider === "AWS" && (
                        <>
                          <InfoChip label="Instance type" value={server.instanceType} />
                          <InfoChip label="Public IP" value={server.publicIp} />
                          <InfoChip label="Region" value={server.region} />
                          <InfoChip label="Instance ID" value={server.instanceId} />
                          <InfoChip label="Availability zone" value={server.availabilityZone} />
                          <InfoChip label="AMI ID" value={server.amiId} />
                        </>
                      )}
                      <InfoChip label="Hostname" value={server.hostname} />
                      <InfoChip label="Private IP" value={server.privateIp} />
                      <InfoChip label="Environment" value={server.env} />
                      <InfoChip label="OS" value={[server.osType, server.osRelease].filter(Boolean).join(" ")} />
                      <InfoChip label="Architecture" value={server.arch} />
                      <InfoChip label="Node.js" value={server.nodeVersion} />
                      <InfoChip label="CPU" value={server.cpuModel} wide />
                      <InfoChip label="CPU cores" value={server.cpuCores ? `${server.cpuCores} vCPU` : ""} />
                      <InfoChip label="CPU speed" value={server.cpuSpeed ? `${server.cpuSpeed} MHz` : ""} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="px-1 text-sm font-semibold text-foreground">Services</h3>
                <ServiceRow name="MongoDB Atlas" icon={Database} check={services.mongodb} />
                <ServiceRow name="Supabase" icon={Database} check={services.supabase} />
                <ServiceRow name="Cloudflare R2 storage" icon={HardDrive} check={services.r2} />
                <ServiceRow name="Redis cache" icon={Activity} check={services.redis} />
                <ServiceRow name="Agora (calls)" icon={Phone} check={services.agora} />
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={cleanOpen} onOpenChange={(o) => { if (!cleaning) setCleanOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clean the server logs?</DialogTitle>
            <DialogDescription>
              This empties the PM2 logs, trims the system journal to 100 MB and clears the npm and apt caches to free disk space. The old logs are gone for good.
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm text-muted-foreground">
            Type <span className="font-mono text-foreground">{CONFIRM_TEXT}</span> to confirm
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="off"
            />
          </label>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCleanOpen(false)} disabled={cleaning}>Cancel</Button>
            <Button variant="destructive" isLoading={cleaning} disabled={confirmText.trim().toLowerCase() !== CONFIRM_TEXT} onClick={cleanLogs}>
              Clean logs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
