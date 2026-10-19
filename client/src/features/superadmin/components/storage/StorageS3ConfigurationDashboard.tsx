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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Gauge,
  HardDrive,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Server,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/marketing_ui/alert";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/marketing_ui/dialog";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useStorageConfiguration,
  useTestStorageConnection,
} from "../../queries/useStorage";
import type {
  StorageConfiguration,
  StorageConnectionStatus,
} from "../../services/storageApi";

type CopyField = "endpoint" | "bucket" | "region" | "cdn";

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function getRequestId(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { requestId?: unknown; traceId?: unknown };
  if (typeof candidate.requestId === "string" && candidate.requestId) {
    return candidate.requestId;
  }
  if (typeof candidate.traceId === "string" && candidate.traceId) {
    return candidate.traceId;
  }
  return null;
}

function formatBytes(bytes: number | null | undefined) {
  const safeBytes = Number(bytes);
  if (!Number.isFinite(safeBytes) || safeBytes < 0) return "Unavailable";
  if (safeBytes === 0) return "0 B";
  if (safeBytes < 1024) {
    return `${safeBytes.toLocaleString()} ${safeBytes === 1 ? "byte" : "bytes"}`;
  }

  const units = ["KB", "MB", "GB", "TB", "PB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(safeBytes) / Math.log(1024)) - 1,
    units.length - 1,
  );
  const value = safeBytes / 1024 ** (unitIndex + 1);
  return `${Number(value.toFixed(1)).toLocaleString()} ${units[unitIndex]}`;
}

function formatDuration(seconds: number | null | undefined) {
  const safeSeconds = Number(seconds);
  if (!Number.isFinite(safeSeconds) || safeSeconds < 0) return "Unavailable";
  if (safeSeconds < 60) return `${safeSeconds.toLocaleString()} sec`;
  if (safeSeconds % 60 === 0) return `${(safeSeconds / 60).toLocaleString()} min`;
  return `${Math.floor(safeSeconds / 60)} min ${safeSeconds % 60} sec`;
}

function formatAuthentication(value: string | null | undefined) {
  if (!value) return "Unavailable";
  if (value === "super_admin") return "Super Admin only";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function checkedAtLabels(checkedAt: string | null | undefined) {
  if (!checkedAt) return { relative: "Not checked yet", absolute: "Unavailable" };
  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime())) {
    return { relative: "Check time unavailable", absolute: "Unavailable" };
  }
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    absolute: format(date, "dd MMM yyyy, h:mm:ss a"),
  };
}

interface StatusBarProps {
  value: number;
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral";
}

function StatusBar({ value, label, tone = "success" }: StatusBarProps) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Number(safeValue.toFixed(1))}
      className="h-2.5 w-full overflow-hidden rounded-sm bg-muted"
    >
      <div
        className={cn(
          "h-full w-[var(--storage-status-width)] rounded-sm transition-[width] duration-500",
          safeValue > 0 && "min-w-[2px]",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "danger" && "bg-red-500",
          tone === "neutral" && "bg-foreground/70",
        )}
        style={
          { "--storage-status-width": `${safeValue}%` } as React.CSSProperties
        }
      />
    </div>
  );
}

interface PanelProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

function Panel({ title, icon, children, action, className }: PanelProps) {
  return (
    <section className={cn("border border-border bg-card shadow-sm", className)}>
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <span aria-hidden="true">{icon}</span>
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

interface CopyRowProps {
  label: string;
  value: string;
  field: CopyField;
  copied: boolean;
  onCopy: (field: CopyField, value: string, label: string) => Promise<void>;
  openUrl?: string;
}

function CopyRow({
  label,
  value,
  field,
  copied,
  onCopy,
  openUrl,
}: CopyRowProps) {
  const available = Boolean(value);

  return (
    <div className="grid gap-3 px-4 py-4 sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-all font-mono text-xs sm:px-2 sm:text-sm",
          !available && "font-sans italic text-muted-foreground",
        )}
        title={available ? value : undefined}
      >
        {available ? value : "Not configured"}
      </dd>
      <dd className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-w-[98px]"
          onClick={() => void onCopy(field, value, label)}
          disabled={!available}
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {openUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
            aria-label={`Open ${label} in a new tab`}
          >
            <ExternalLink className="size-4" />
            Open
          </Button>
        )}
      </dd>
    </div>
  );
}

interface RuleCardProps {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

function RuleCard({ label, value, detail, icon, children }: RuleCardProps) {
  return (
    <article className="border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{detail}</p>
      {children}
    </article>
  );
}

interface SecurityRowProps {
  title: string;
  description: string;
  badge: React.ReactNode;
  action?: React.ReactNode;
}

function SecurityRow({
  title,
  description,
  badge,
  action,
}: SecurityRowProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 break-words text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {badge}
        {action}
      </div>
    </div>
  );
}

function ConfigurationSkeleton() {
  return (
    <div aria-label="Loading S3 configuration" className="space-y-6">
      <Panel title="Connection" icon={<Server className="size-4" />}>
        <div className="space-y-4 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-full" />
        </div>
        <div className="divide-y divide-border">
          {["w-[58%]", "w-[32%]", "w-[24%]", "w-[48%]"].map((width) => (
            <div
              key={width}
              className="grid gap-3 px-4 py-4 sm:grid-cols-[100px_minmax(0,1fr)_100px] sm:px-5"
            >
              <Skeleton className="h-4 w-16" />
              <Skeleton className={cn("h-4", width)} />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="border border-border bg-card p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-7 w-24" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        ))}
      </div>

      {[1, 2].map((panel) => (
        <section key={panel} className="border border-border bg-card">
          <div className="border-b border-border p-4">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="flex justify-between gap-5 p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

interface ConnectionPanelProps {
  connection: StorageConnectionStatus;
  isTesting: boolean;
  isManualTest: boolean;
  onTestAgain: () => void;
}

function ConnectionPanel({
  connection,
  isTesting,
  isManualTest,
  onTestAgain,
}: ConnectionPanelProps) {
  const checked = checkedAtLabels(connection.checkedAt);

  if (isTesting) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-4 border-b border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <RefreshCw className="size-5 animate-spin" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">Testing connection</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Waiting for the storage provider to respond.
            </p>
          </div>
        </div>
        <Badge variant="info" dot>
          In progress
        </Badge>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between",
        connection.connected ? "bg-emerald-500/5" : "bg-red-500/5",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            connection.connected
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400",
          )}
        >
          {connection.connected ? (
            <CheckCircle2 className="size-5" aria-hidden="true" />
          ) : (
            <XCircle className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "font-semibold",
                connection.connected
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400",
              )}
            >
              {connection.connected ? "Connected" : "Connection failed"}
            </p>
            {isManualTest && (
              <Badge variant="outline" className="font-normal">
                Latest manual test
              </Badge>
            )}
          </div>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            {connection.message}
          </p>
          {connection.errorCode && !connection.connected && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Error code: {connection.errorCode}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <Badge variant={connection.connected ? "success" : "danger"} dot>
          {connection.connected ? "Healthy" : "Unavailable"}
        </Badge>
        <div className="text-xs leading-5 text-muted-foreground sm:text-right">
          <p title={checked.absolute}>Checked {checked.relative}</p>
          <p className="tabular-nums">Latency: {connection.latencyMs.toLocaleString()} ms</p>
        </div>
        {!connection.connected && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTestAgain}
          >
            <Activity className="size-4" />
            Run test again
          </Button>
        )}
      </div>
    </div>
  );
}

export function StorageS3ConfigurationDashboard() {
  const configurationQuery = useStorageConfiguration();
  const testConnectionMutation = useTestStorageConnection();
  const [latestTest, setLatestTest] = useState<StorageConnectionStatus | null>(null);
  const [copiedField, setCopiedField] = useState<CopyField | null>(null);
  const [protectedPathsOpen, setProtectedPathsOpen] = useState(false);
  const copyResetTimer = useRef<number | undefined>(undefined);

  const config = configurationQuery.data;
  const connection = latestTest ?? config;
  const fatalError = configurationQuery.isError && !config;
  const isInitialLoading = configurationQuery.isLoading && !config;

  useEffect(() => {
    return () => {
      if (copyResetTimer.current !== undefined) {
        window.clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  const readiness = useMemo(() => {
    if (!config) return { passed: 0, total: 5, percentage: 0 };
    const checks = [
      config.credentialsConfigured,
      Boolean(config.endpoint),
      Boolean(config.bucket),
      Boolean(config.region),
      Boolean(config.cdnBaseUrl),
    ];
    const passed = checks.filter(Boolean).length;
    return {
      passed,
      total: checks.length,
      percentage: (passed / checks.length) * 100,
    };
  }, [config]);

  const multipartPercentage = useMemo(() => {
    if (!config || config.maxUploadBytes <= 0) return 0;
    return Math.min(
      100,
      Math.max(0, (config.multipartThresholdBytes / config.maxUploadBytes) * 100),
    );
  }, [config]);

  const handleRefresh = async () => {
    setLatestTest(null);
    const result = await configurationQuery.refetch();
    if (result.isError) {
      toast.error(getErrorMessage(result.error, "Could not refresh S3 configuration."));
      return;
    }
    toast.success("S3 configuration refreshed.");
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate(undefined, {
      onSuccess: (result) => {
        // A successful HTTP response may still contain connected=false.
        // Keep the returned status visible instead of treating HTTP 200 as healthy.
        setLatestTest(result);
      },
    });
  };

  const handleCopy = async (
    field: CopyField,
    value: string,
    label: string,
  ) => {
    try {
      if (!value || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      if (copyResetTimer.current !== undefined) {
        window.clearTimeout(copyResetTimer.current);
      }
      copyResetTimer.current = window.setTimeout(() => setCopiedField(null), 1800);
      toast.success(`${label} copied.`);
    } catch {
      setCopiedField(null);
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  if (fatalError) {
    const requestId = getRequestId(configurationQuery.error);
    return (
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 pb-20 sm:p-6 lg:p-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            S3 Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View the active bucket connection, delivery settings, and storage safeguards.
          </p>
        </header>

        <Alert variant="destructive" className="p-5">
          <AlertCircle className="size-5" />
          <AlertTitle>S3 configuration is temporarily unavailable.</AlertTitle>
          <AlertDescription>
            <p>
              {getErrorMessage(
                configurationQuery.error,
                "The server configuration could not be loaded.",
              )}
            </p>
            {requestId && (
              <p className="mt-1 font-mono text-xs">Request ID: {requestId}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void configurationQuery.refetch()}
              disabled={configurationQuery.isFetching}
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  configurationQuery.isFetching && "animate-spin",
                )}
              />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 pb-20 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            S3 Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View the active bucket connection, delivery settings, and storage safeguards.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={
              configurationQuery.isFetching || testConnectionMutation.isPending
            }
          >
            <RefreshCw
              className={cn(
                "size-4",
                configurationQuery.isFetching && "animate-spin",
              )}
            />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={handleTestConnection}
            disabled={testConnectionMutation.isPending || isInitialLoading}
          >
            <Activity
              className={cn(
                "size-4",
                testConnectionMutation.isPending && "animate-pulse",
              )}
            />
            {testConnectionMutation.isPending ? "Testing..." : "Test connection"}
          </Button>
        </div>
      </header>

      {isInitialLoading ? (
        <ConfigurationSkeleton />
      ) : config && connection ? (
        <>
          {configurationQuery.isError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Refresh failed</AlertTitle>
              <AlertDescription>
                The last loaded configuration is still shown.{" "}
                {getErrorMessage(
                  configurationQuery.error,
                  "The latest configuration could not be loaded.",
                )}
                {getRequestId(configurationQuery.error) && (
                  <span className="mt-1 block font-mono text-xs">
                    Request ID: {getRequestId(configurationQuery.error)}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {testConnectionMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Connection test could not complete.</AlertTitle>
              <AlertDescription>
                {getErrorMessage(
                  testConnectionMutation.error,
                  "The server did not return a connection result.",
                )}
                {getRequestId(testConnectionMutation.error) && (
                  <span className="mt-1 block font-mono text-xs">
                    Request ID: {getRequestId(testConnectionMutation.error)}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Panel title="Connection" icon={<Server className="size-4" />}>
            <ConnectionPanel
              connection={connection}
              isTesting={testConnectionMutation.isPending}
              isManualTest={Boolean(latestTest)}
              onTestAgain={handleTestConnection}
            />

            <div className="border-b border-border px-4 py-4 sm:px-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">Configuration readiness</span>
                <span className="tabular-nums text-muted-foreground">
                  {readiness.passed} of {readiness.total} checks available (
                  {Math.round(readiness.percentage)}%)
                </span>
              </div>
              <StatusBar
                value={readiness.percentage}
                tone={
                  readiness.percentage === 100
                    ? "success"
                    : readiness.percentage > 0
                      ? "warning"
                      : "danger"
                }
                label={`Configuration readiness: ${readiness.passed} of ${readiness.total} checks available`}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Checks credentials, endpoint, bucket, region, and CDN delivery values returned
                by the server.
              </p>
            </div>

            <dl className="divide-y divide-border">
              <CopyRow
                label="Endpoint"
                value={config.endpoint}
                field="endpoint"
                copied={copiedField === "endpoint"}
                onCopy={handleCopy}
              />
              <CopyRow
                label="Bucket"
                value={config.bucket}
                field="bucket"
                copied={copiedField === "bucket"}
                onCopy={handleCopy}
              />
              <CopyRow
                label="Region"
                value={config.region}
                field="region"
                copied={copiedField === "region"}
                onCopy={handleCopy}
              />
              <CopyRow
                label="CDN"
                value={config.cdnBaseUrl}
                field="cdn"
                copied={copiedField === "cdn"}
                onCopy={handleCopy}
                openUrl={config.cdnBaseUrl || undefined}
              />
            </dl>
          </Panel>

          <section aria-labelledby="storage-rules-title">
            <h2
              id="storage-rules-title"
              className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              <Database className="size-4" aria-hidden="true" />
              Storage rules
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <RuleCard
                label="Maximum upload"
                value={formatBytes(config.maxUploadBytes)}
                detail="Maximum object size accepted by this upload API."
                icon={<HardDrive className="size-4" />}
              />
              <RuleCard
                label="Multipart starts"
                value={formatBytes(config.multipartThresholdBytes)}
                detail={`${Math.round(multipartPercentage)}% of the configured maximum upload size.`}
                icon={<Gauge className="size-4" />}
              >
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Threshold</span>
                    <span className="tabular-nums">{Math.round(multipartPercentage)}%</span>
                  </div>
                  <StatusBar
                    value={multipartPercentage}
                    tone="neutral"
                    label={`Multipart threshold is ${Math.round(multipartPercentage)} percent of maximum upload size`}
                  />
                </div>
              </RuleCard>
              <RuleCard
                label="Temporary download URL"
                value={formatDuration(config.presignedUrlExpirySeconds)}
                detail="Expiry applied to server-generated download links."
                icon={<Timer className="size-4" />}
              />
              <RuleCard
                label="Upload rate limit"
                value={`${config.uploadRateLimitPerMinute.toLocaleString()} / min`}
                detail="Maximum upload requests allowed per minute."
                icon={<Activity className="size-4" />}
              />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              title="Security"
              icon={<ShieldCheck className="size-4" />}
            >
              <div className="divide-y divide-border">
                <SecurityRow
                  title="Authentication"
                  description={formatAuthentication(config.authentication)}
                  badge={
                    <Badge variant="success" icon={<LockKeyhole className="size-3" />}>
                      Protected
                    </Badge>
                  }
                />
                <SecurityRow
                  title="Credentials"
                  description={config.credentialSource || "Credential source unavailable"}
                  badge={
                    <Badge
                      variant={config.credentialsConfigured ? "success" : "danger"}
                      icon={<KeyRound className="size-3" />}
                    >
                      {config.credentialsConfigured ? "Configured" : "Missing"}
                    </Badge>
                  }
                />
                <SecurityRow
                  title="Audit logging"
                  description={
                    config.auditLoggingEnabled
                      ? "Storage mutations are recorded."
                      : "Storage mutation logging is disabled."
                  }
                  badge={
                    <Badge
                      variant={config.auditLoggingEnabled ? "success" : "warning"}
                      dot
                    >
                      {config.auditLoggingEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  }
                />
                <SecurityRow
                  title="Protected paths"
                  description={`${config.protectedPrefixes.length.toLocaleString()} configured ${
                    config.protectedPrefixes.length === 1 ? "prefix" : "prefixes"
                  }`}
                  badge={
                    <Badge variant="outline">
                      {config.protectedPrefixes.length.toLocaleString()} paths
                    </Badge>
                  }
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProtectedPathsOpen(true)}
                    >
                      View paths
                    </Button>
                  }
                />
              </div>
            </Panel>

            <Panel
              title="Connection information"
              icon={<Activity className="size-4" />}
            >
              <dl className="divide-y divide-border">
                {[
                  ["Configuration source", config.configurationSource],
                  ["Storage provider", config.provider],
                  ["Public delivery", config.publicDelivery],
                  ["Metadata source", config.metadataSource],
                  ["Last connection check", checkedAtLabels(connection.checkedAt).absolute],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid gap-1 px-4 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4 sm:px-5"
                  >
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="break-words text-sm font-medium sm:text-right">
                      {value || "Unavailable"}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>

          <Dialog open={protectedPathsOpen} onOpenChange={setProtectedPathsOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Protected paths</DialogTitle>
                <DialogDescription>
                  Objects matching these server-configured prefixes cannot be deleted or
                  renamed from the storage manager.
                </DialogDescription>
              </DialogHeader>

              {config.protectedPrefixes.length ? (
                <ul className="max-h-72 divide-y divide-border overflow-y-auto border-y border-border">
                  {config.protectedPrefixes.map((prefix) => (
                    <li
                      key={prefix}
                      className="flex items-start gap-3 px-3 py-3 font-mono text-sm"
                    >
                      <ShieldCheck
                        className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                      <span className="break-all">{prefix}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 border border-dashed border-border px-5 py-8 text-center">
                  <ShieldCheck className="size-7 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-medium">No protected prefixes configured</p>
                  <p className="text-xs text-muted-foreground">
                    The server returned an empty protected-prefix list.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Configuration source: {config.configurationSource || "Unavailable"}
              </p>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Configuration response was empty.</AlertTitle>
          <AlertDescription>
            Refresh the page to request the S3 configuration again.
          </AlertDescription>
        </Alert>
      )}
    </main>
  );
}
