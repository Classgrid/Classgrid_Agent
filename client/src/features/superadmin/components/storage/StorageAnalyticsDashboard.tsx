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

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Copy,
  ExternalLink,
  FileArchive,
  FileBarChart,
  FileQuestion,
  Files,
  Filter,
  Folder,
  FolderSearch,
  HardDrive,
  Info,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { Input } from "@/components/marketing_ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/marketing_ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/marketing_ui/sheet";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Label } from "@/components/marketing_ui/label";
import { cn } from "@/lib/utils";
import {
  storageApi,
  type AnalyticsFileQuery,
  type AnalyticsRankedFile,
  type StorageObjectMetadata,
} from "../../services/storageApi";
import {
  storageKeys,
  useAnalyticsBreakdown,
  useAnalyticsFiles,
  useAnalyticsSummary,
} from "../../queries/useStorage";

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "pdf", label: "PDF" },
  { value: "document", label: "Documents" },
  { value: "archive", label: "Archives" },
  { value: "text", label: "Text and code" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
] as const;

const SORT_OPTIONS = [
  { value: "size_desc", label: "Largest first" },
  { value: "size_asc", label: "Smallest first" },
  { value: "modified_desc", label: "Newest first" },
  { value: "modified_asc", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
] as const;

const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

function formatBytes(bytes: number | null | undefined, decimals = 1) {
  const safeBytes = Number(bytes) || 0;
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
  return `${Number(value.toFixed(decimals)).toLocaleString()} ${units[unitIndex]}`;
}

function formatPercentage(value: number | null | undefined) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  if (safeValue === 0 || safeValue === 100) return `${safeValue}%`;
  return `${safeValue < 1 ? safeValue.toFixed(2) : safeValue.toFixed(1)}%`;
}

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
  if (typeof candidate.requestId === "string") return candidate.requestId;
  if (typeof candidate.traceId === "string") return candidate.traceId;
  return null;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}

function useRelativeClock() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => window.clearInterval(interval);
  }, []);
}

interface StorageBarProps {
  value: number;
  label: string;
  className?: string;
  tone?: "emerald" | "amber" | "neutral";
}

function StorageBar({
  value,
  label,
  className,
  tone = "emerald",
}: StorageBarProps) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Number(safeValue.toFixed(2))}
      className={cn("h-2.5 w-full overflow-hidden rounded-sm bg-muted", className)}
    >
      <div
        className={cn(
          "h-full min-w-0 rounded-sm transition-[width] duration-500",
          "w-[var(--storage-progress)]",
          safeValue > 0 && "min-w-[2px]",
          tone === "emerald" && "bg-emerald-500",
          tone === "amber" && "bg-amber-500",
          tone === "neutral" && "bg-foreground/70",
        )}
        style={{ "--storage-progress": `${safeValue}%` } as React.CSSProperties}
      />
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  loading: boolean;
  icon: React.ReactNode;
}

function MetricCard({ label, value, loading, icon }: MetricCardProps) {
  return (
    <section className="border border-border bg-card px-4 py-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="text-muted-foreground/70" aria-hidden="true">
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
    </section>
  );
}

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

function Panel({ title, children, className, action }: PanelProps) {
  return (
    <section className={cn("border border-border bg-card shadow-sm", className)}>
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function BreakdownSkeleton() {
  return (
    <div className="space-y-5 p-5">
      {["w-3/4", "w-1/2", "w-2/5", "w-1/4", "w-1/6"].map((widthClass) => (
        <div key={widthClass} className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className={cn("h-2.5", widthClass)} />
        </div>
      ))}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

interface AnalyticsFiltersProps {
  search: string;
  type: string;
  folder: string;
  sort: string;
  limit: number;
  folders: { prefix: string; name: string }[];
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onFolderChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onLimitChange: (value: number) => void;
}

function AnalyticsFilters({
  search,
  type,
  folder,
  sort,
  limit,
  folders,
  onSearchChange,
  onTypeChange,
  onFolderChange,
  onSortChange,
  onLimitChange,
}: AnalyticsFiltersProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_170px_190px_170px_120px]">
      <Label className="relative block">
        <span className="sr-only">Search files</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search files..."
          className="h-10 pl-9"
        />
      </Label>

      <Select value={type} onValueChange={(value) => value && onTypeChange(value)}>
        <SelectTrigger className="h-10 w-full" aria-label="Filter by file type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={folder} onValueChange={(value) => value && onFolderChange(value)}>
        <SelectTrigger className="h-10 w-full" aria-label="Filter by folder">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All folders</SelectItem>
          <SelectItem value="root">Root</SelectItem>
          {folders
            .filter((item) => item.prefix)
            .map((item) => (
              <SelectItem key={item.prefix} value={item.prefix}>
                {item.name || item.prefix}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(value) => value && onSortChange(value)}>
        <SelectTrigger className="h-10 w-full" aria-label="Sort file ranking">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(limit)}
        onValueChange={(value) => value && onLimitChange(Number(value))}
      >
        <SelectTrigger className="h-10 w-full" aria-label="Number of files per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LIMIT_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              Top {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface FileActionMenuProps {
  file: AnalyticsRankedFile;
  onCopy: (value: string, label: string) => Promise<void>;
  onMetadata: (file: AnalyticsRankedFile) => Promise<void>;
  onDownload: (file: AnalyticsRankedFile) => Promise<void>;
  onLocate: (file: AnalyticsRankedFile) => void;
}

function FileActionMenu({
  file,
  onCopy,
  onMetadata,
  onDownload,
  onLocate,
}: FileActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Actions for ${file.name}`}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>{file.name}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => window.open(file.cdnUrl, "_blank", "noopener,noreferrer")}>
          <ExternalLink />
          Open using CDN
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onCopy(file.cdnUrl, "CDN URL")}>
          <Copy />
          Copy CDN URL
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onMetadata(file)}>
          <Info />
          View metadata
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onDownload(file)}>
          <ArrowDownToLine />
          Download temporary URL
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onLocate(file)}>
          <FolderSearch />
          Locate in Files
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StorageAnalyticsDashboard() {
  useRelativeClock();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rankingRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const [type, setType] = useState("all");
  const [folder, setFolder] = useState("all");
  const [sort, setSort] = useState("size_desc");
  const [limit, setLimit] = useState(25);
  const [zeroOnly, setZeroOnly] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [metadataFile, setMetadataFile] = useState<AnalyticsRankedFile | null>(null);
  const [metadata, setMetadata] = useState<StorageObjectMetadata | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);

  const summaryQuery = useAnalyticsSummary();
  const breakdownQuery = useAnalyticsBreakdown();

  const resetPagination = useCallback(() => {
    setCursorHistory([undefined]);
    setPageIndex(0);
  }, []);

  const baseFilesParams = useMemo<AnalyticsFileQuery>(() => ({
    limit,
    sort,
    ...(type !== "all" ? { type } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(folder !== "all" && folder !== "root" ? { prefix: folder } : {}),
    ...(folder === "root" ? { rootOnly: true } : {}),
    ...(zeroOnly ? { zeroOnly: true } : {}),
  }), [debouncedSearch, folder, limit, sort, type, zeroOnly]);

  const filesParams = useMemo<AnalyticsFileQuery>(() => ({
    ...baseFilesParams,
    ...(cursorHistory[pageIndex] ? { cursor: cursorHistory[pageIndex] } : {}),
  }), [baseFilesParams, cursorHistory, pageIndex]);

  const filesQuery = useAnalyticsFiles(filesParams);
  const smallestFilesQuery = useAnalyticsFiles({
    sort: "size_asc",
    nonZero: true,
    limit: 3,
  });

  const summary = summaryQuery.data;
  const breakdown = breakdownQuery.data;
  const filesData = filesQuery.data;
  const smallestFiles = smallestFilesQuery.data?.files || [];
  const generatedAt = summary?.generatedAt ? new Date(summary.generatedAt) : null;
  const backendRefreshWarning =
    summary?.refreshWarning ||
    breakdown?.refreshWarning ||
    filesData?.refreshWarning ||
    null;

  const changeFilter = useCallback(
    (change: () => void) => {
      change();
      resetPagination();
      setRefreshError(null);
    },
    [resetPagination],
  );

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(null);
    resetPagination();

    try {
      const refreshedSummary = await storageApi.getAnalyticsSummary(true);
      queryClient.setQueryData(storageKeys.analyticsSummary(), refreshedSummary);
      await queryClient.refetchQueries({
        queryKey: storageKeys.analytics(),
        type: "active",
      });

      if (refreshedSummary.cacheStatus === "stale" || refreshedSummary.refreshWarning) {
        setRefreshError(
          refreshedSummary.refreshWarning ||
            "Could not refresh analytics. The last completed snapshot is still shown.",
        );
        toast.warning("Showing the last completed analytics snapshot.");
      } else {
        toast.success("Storage analytics recalculated.");
      }
    } catch (error) {
      const message = getErrorMessage(error, "Could not refresh storage analytics.");
      setRefreshError(message);
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNextPage = () => {
    const nextCursor = filesData?.nextCursor;
    if (!nextCursor) return;

    setCursorHistory((history) => {
      const nextHistory = history.slice(0, pageIndex + 1);
      nextHistory[pageIndex + 1] = nextCursor;
      return nextHistory;
    });
    setPageIndex((current) => current + 1);
    rankingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePreviousPage = () => {
    if (pageIndex === 0) return;
    setPageIndex((current) => Math.max(0, current - 1));
    rankingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleClearFilters = () => {
    setSearch("");
    setType("all");
    setFolder("all");
    setSort("size_desc");
    setLimit(25);
    setZeroOnly(false);
    resetPagination();
  };

  const handleReviewZeroByteFiles = () => {
    changeFilter(() => {
      setZeroOnly(true);
      setSort("size_asc");
      setSearch("");
      setType("all");
      setFolder("all");
    });
    window.setTimeout(
      () => rankingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const handleMetadata = async (file: AnalyticsRankedFile) => {
    setMetadataFile(file);
    setMetadata(null);
    setIsMetadataLoading(true);

    try {
      setMetadata(await storageApi.getMetadata(file.key));
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load object metadata."));
    } finally {
      setIsMetadataLoading(false);
    }
  };

  const handleDownload = async (file: AnalyticsRankedFile) => {
    try {
      const { downloadUrl } = await storageApi.getPresignedUrl(file.key);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not generate a temporary download URL."));
    }
  };

  const handleLocate = (file: AnalyticsRankedFile) => {
    const params = new URLSearchParams();
    if (file.folder) params.set("prefix", file.folder);
    params.set("search", file.name);
    navigate(`/superadmin/storage/files?${params.toString()}`);
  };

  const hasActiveFilters =
    Boolean(search) ||
    type !== "all" ||
    folder !== "all" ||
    sort !== "size_desc" ||
    limit !== 25 ||
    zeroOnly;
  const activeFilterCount = [
    Boolean(search),
    type !== "all",
    folder !== "all",
    sort !== "size_desc",
    limit !== 25,
    zeroOnly,
  ].filter(Boolean).length;

  const firstRank = filesData?.files[0]?.rank || 0;
  const lastRank = filesData?.files.at(-1)?.rank || 0;
  const summaryUnavailable = summaryQuery.isError && !summary;
  const isEmptyBucket = Boolean(summary && summary.totalFiles === 0);

  if (summaryUnavailable) {
    const requestId = getRequestId(summaryQuery.error);
    return (
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 pb-20 sm:p-6 lg:p-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Storage Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Understand current S3 usage.</p>
        </header>
        <Alert variant="destructive" className="p-5">
          <AlertCircle className="size-5" />
          <AlertTitle>Storage analytics are temporarily unavailable.</AlertTitle>
          <AlertDescription>
            <p>{getErrorMessage(summaryQuery.error, "The analytics snapshot could not be loaded.")}</p>
            {requestId && <p className="mt-1 font-mono text-xs">Request ID: {requestId}</p>}
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void summaryQuery.refetch()}
            >
              <RotateCcw className="mr-2 size-4" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 pb-20 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="size-4" />
            Current bucket snapshot
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Storage Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Understand current S3 usage.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {generatedAt && (
            <div className="text-right text-xs text-muted-foreground">
              <p>
                Last calculated{" "}
                <span className="font-medium text-foreground">
                  {formatDistanceToNow(generatedAt, { addSuffix: true })}
                </span>
              </p>
              <p className="mt-0.5">
                {summary?.cacheStatus === "cached"
                  ? "Cached snapshot"
                  : summary?.cacheStatus === "stale"
                    ? "Stale snapshot"
                    : "Fresh snapshot"}
              </p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing || summaryQuery.isLoading}
            aria-label="Refresh storage analytics"
          >
            <RefreshCw className={cn("mr-2 size-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Recalculating..." : "Refresh analytics"}
          </Button>
        </div>
      </header>

      {(refreshError || backendRefreshWarning) && (
        <Alert className="border-amber-500/40 bg-amber-500/5 p-4 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-4" />
          <AlertTitle>Could not refresh analytics</AlertTitle>
          <AlertDescription className="text-amber-700/80 dark:text-amber-200/80">
            Showing data calculated{" "}
            {generatedAt ? formatDistanceToNow(generatedAt, { addSuffix: true }) : "previously"}.
            <span className="ml-1">{refreshError || backendRefreshWarning}</span>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-amber-500/40"
              onClick={() => void handleRefresh()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {summary?.metadataLookupFailures ? (
        <Alert className="border-amber-500/30 bg-amber-500/5 p-3">
          <FileQuestion className="size-4 text-amber-500" />
          <AlertTitle>Some file types were inferred</AlertTitle>
          <AlertDescription>
            Metadata could not be read for {summary.metadataLookupFailures.toLocaleString()}{" "}
            {summary.metadataLookupFailures === 1 ? "file" : "files"}.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total storage"
          value={formatBytes(summary?.totalSize)}
          loading={summaryQuery.isLoading}
          icon={<HardDrive className="size-5" />}
        />
        <MetricCard
          label="Total files"
          value={(summary?.totalFiles || 0).toLocaleString()}
          loading={summaryQuery.isLoading}
          icon={<Files className="size-5" />}
        />
        <MetricCard
          label="Total folders"
          value={(summary?.totalFolders || 0).toLocaleString()}
          loading={summaryQuery.isLoading}
          icon={<Folder className="size-5" />}
        />
        <MetricCard
          label="Average file size"
          value={formatBytes(summary?.averageFileSize)}
          loading={summaryQuery.isLoading}
          icon={<CircleGauge className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[
          {
            label: "Largest file",
            file: summary?.largestFile,
            icon: <FileBarChart className="size-4" />,
          },
          {
            label: "Smallest non-empty file",
            file: summary?.smallestFile,
            icon: <FileArchive className="size-4" />,
          },
        ].map(({ label, file, icon }) => (
          <section key={label} className="border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{label}</span>
              {icon}
            </div>
            {summaryQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-24" />
              </div>
            ) : file ? (
              <>
                <p className="truncate text-sm font-medium" title={file.name}>
                  {file.name}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{formatBytes(file.size)}</p>
                <p className="mt-2 truncate text-xs text-muted-foreground" title={file.folder || "Root"}>
                  {file.folder || "Root"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No files</p>
            )}
          </section>
        ))}

        <section className="border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Zero-byte files</span>
            <ShieldAlert className="size-4" />
          </div>
          {summaryQuery.isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <>
              <p className="text-xl font-semibold tabular-nums">
                {(summary?.zeroByteFiles || 0).toLocaleString()}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={!summary?.zeroByteFiles}
                onClick={handleReviewZeroByteFiles}
              >
                Review files
              </Button>
            </>
          )}
        </section>
      </div>

      {isEmptyBucket ? (
        <section className="flex min-h-72 flex-col items-center justify-center border border-dashed border-border bg-card px-6 text-center">
          <HardDrive className="mb-4 size-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">No files found</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Upload files from the Files page to begin seeing storage analytics.
          </p>
          <Button className="mt-5" onClick={() => navigate("/superadmin/storage/files")}>
            Go to Files
          </Button>
        </section>
      ) : (
        <>
          <div ref={rankingRef} className="scroll-mt-4">
            <Panel title="File size ranking">
              <div className="border-b border-border p-3">
                <div className="hidden md:block">
                  <AnalyticsFilters
                    search={search}
                    type={type}
                    folder={folder}
                    sort={sort}
                    limit={limit}
                    folders={breakdown?.byFolder || []}
                    onSearchChange={(value) => changeFilter(() => setSearch(value))}
                    onTypeChange={(value) => changeFilter(() => setType(value))}
                    onFolderChange={(value) => changeFilter(() => setFolder(value))}
                    onSortChange={(value) => changeFilter(() => setSort(value))}
                    onLimitChange={(value) => changeFilter(() => setLimit(value))}
                  />
                </div>

                <div className="flex items-center gap-2 md:hidden">
                  <Label className="relative flex-1">
                    <span className="sr-only">Search files</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => changeFilter(() => setSearch(event.target.value))}
                      placeholder="Search files..."
                      className="h-10 pl-9"
                    />
                  </Label>
                  <div className="relative shrink-0">
                    <Sheet>
                      <SheetTrigger
                        render={
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-10 shrink-0"
                            aria-label="Open analytics filters"
                          />
                        }
                      >
                        <Filter className="size-4" />
                      </SheetTrigger>
                      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
                        <SheetHeader>
                          <SheetTitle>Ranking filters</SheetTitle>
                          <SheetDescription>
                            Filter and sort the complete S3 file ranking.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4 px-4 pb-6">
                          <AnalyticsFilters
                            search={search}
                            type={type}
                            folder={folder}
                            sort={sort}
                            limit={limit}
                            folders={breakdown?.byFolder || []}
                            onSearchChange={(value) => changeFilter(() => setSearch(value))}
                            onTypeChange={(value) => changeFilter(() => setType(value))}
                            onFolderChange={(value) => changeFilter(() => setFolder(value))}
                            onSortChange={(value) => changeFilter(() => setSort(value))}
                            onLimitChange={(value) => changeFilter(() => setLimit(value))}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>
                    {activeFilterCount > 0 && (
                      <Badge variant="info" className="pointer-events-none absolute -right-2 -top-2 min-w-5 justify-center px-1">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {(hasActiveFilters || zeroOnly) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {zeroOnly && (
                      <Badge variant="warning" className="gap-1">
                        Zero-byte only
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-4 min-h-0 p-0 hover:bg-transparent"
                          onClick={() => changeFilter(() => setZeroOnly(false))}
                          aria-label="Clear zero-byte-only filter"
                        >
                          <X className="size-3" />
                        </Button>
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" className="h-7" onClick={handleClearFilters}>
                      <RotateCcw className="mr-1.5 size-3.5" />
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>

              <div className="hidden border-b border-border bg-muted/20 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:grid lg:grid-cols-[46px_minmax(180px,2fr)_minmax(120px,1fr)_110px_100px_130px_40px] lg:gap-3">
                <span>Rank</span>
                <span>File</span>
                <span>Folder</span>
                <span>Type</span>
                <span>Size</span>
                <span className="text-right">Share of total</span>
                <span className="sr-only">Actions</span>
              </div>

              {filesQuery.isLoading ? (
                <div className="space-y-5 p-4">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="space-y-3">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-2.5 w-full" />
                    </div>
                  ))}
                </div>
              ) : filesQuery.isError ? (
                <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
                  <AlertCircle className="mb-3 size-7 text-destructive" />
                  <p className="font-medium">Could not load the file ranking.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getErrorMessage(filesQuery.error, "Try loading the ranking again.")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => void filesQuery.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              ) : filesData?.files.length ? (
                <div className="divide-y divide-border">
                  {filesData.files.map((file) => {
                    const typeLabel =
                      TYPE_OPTIONS.find((option) => option.value === file.type)?.label ||
                      file.type ||
                      "Unknown";

                    return (
                      <article
                        key={file.key}
                        tabIndex={0}
                        className="group px-4 py-4 outline-none transition-colors hover:bg-muted/20 focus-visible:bg-muted/30"
                      >
                        <div className="hidden items-center gap-3 lg:grid lg:grid-cols-[46px_minmax(180px,2fr)_minmax(120px,1fr)_110px_100px_130px_40px]">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{file.rank}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium" title={file.name}>
                              {file.name}
                            </p>
                          </div>
                          <p className="truncate text-xs text-muted-foreground" title={file.folder || "Root"}>
                            {file.folder || "Root"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{typeLabel}</p>
                          <p className="text-sm font-medium tabular-nums">{formatBytes(file.size)}</p>
                          <p className="text-right text-xs text-muted-foreground tabular-nums">
                            {formatPercentage(file.percentageOfTotal)} of total
                          </p>
                          <FileActionMenu
                            file={file}
                            onCopy={handleCopy}
                            onMetadata={handleMetadata}
                            onDownload={handleDownload}
                            onLocate={handleLocate}
                          />
                        </div>

                        <div className="lg:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">#{file.rank}</p>
                              <p className="mt-0.5 truncate text-sm font-medium" title={file.name}>
                                {file.name}
                              </p>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {file.folder || "Root"}
                              </p>
                            </div>
                            <FileActionMenu
                              file={file}
                              onCopy={handleCopy}
                              onMetadata={handleMetadata}
                              onDownload={handleDownload}
                              onLocate={handleLocate}
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                            <span className="font-medium">{formatBytes(file.size)}</span>
                            <span className="text-muted-foreground">{typeLabel}</span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                          <StorageBar
                            value={file.relativeToLargestPercentage}
                            label={`${file.name} is ${formatPercentage(file.relativeToLargestPercentage)} of the largest file`}
                          />
                          <span className="min-w-12 text-right text-xs tabular-nums text-muted-foreground">
                            {formatPercentage(file.relativeToLargestPercentage)}
                          </span>
                        </div>
                        <p className="mt-1 text-right text-[11px] text-muted-foreground lg:hidden">
                          {formatPercentage(file.percentageOfTotal)} of total storage
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
                  <Search className="mb-3 size-7 text-muted-foreground/70" />
                  <p className="font-medium">No files match these filters.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                </div>
              )}

              {filesData && filesData.totalMatchingFiles > 0 && (
                <footer className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Showing {firstRank.toLocaleString()}–{lastRank.toLocaleString()} of{" "}
                    {filesData.totalMatchingFiles.toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageIndex === 0 || filesQuery.isFetching}
                      onClick={handlePreviousPage}
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!filesData.nextCursor || filesQuery.isFetching}
                      onClick={handleNextPage}
                    >
                      Next
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </div>
                </footer>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title="Storage by file type">
              {breakdownQuery.isLoading ? (
                <BreakdownSkeleton />
              ) : breakdown?.byType.length ? (
                <div className="space-y-5 p-5">
                  {breakdown.byType.map((item) => (
                    <div key={item.type}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span>{item.label || item.type}</span>
                        <span className="tabular-nums">
                          {formatBytes(item.size)}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatPercentage(item.percentage)}
                          </span>
                        </span>
                      </div>
                      <StorageBar
                        value={item.percentage}
                        label={`${item.label || item.type}: ${formatPercentage(item.percentage)} of storage`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel message="No file-type data available." />
              )}
            </Panel>

            <Panel title="Storage by folder">
              {breakdownQuery.isLoading ? (
                <BreakdownSkeleton />
              ) : breakdown?.byFolder.length ? (
                <div className="space-y-5 p-5">
                  {breakdown.byFolder.slice(0, 10).map((item) => (
                    <Button
                      key={item.prefix || "root"}
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        changeFilter(() => setFolder(item.prefix ? item.prefix : "root"))
                      }
                      className="h-auto w-full justify-start whitespace-normal rounded-sm p-0 text-left font-normal hover:bg-transparent"
                    >
                      <div className="w-full">
                        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                          <span className="truncate" title={item.name || "Root"}>
                            {item.name || "Root"}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatBytes(item.size)}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {formatPercentage(item.percentage)}
                            </span>
                          </span>
                        </div>
                        <StorageBar
                          value={item.percentage}
                          label={`${item.name || "Root"}: ${formatPercentage(item.percentage)} of storage`}
                        />
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <EmptyPanel message="No folder data available." />
              )}
            </Panel>

            <Panel title="File size distribution">
              {breakdownQuery.isLoading ? (
                <BreakdownSkeleton />
              ) : breakdown?.bySizeRange.length ? (
                <div className="space-y-5 p-5">
                  {breakdown.bySizeRange.map((item) => {
                    const percentage = summary?.totalFiles
                      ? (item.fileCount / summary.totalFiles) * 100
                      : 0;
                    return (
                      <div key={item.range}>
                        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                          <span>{item.label}</span>
                          <span className="tabular-nums">
                            {item.fileCount.toLocaleString()} files
                          </span>
                        </div>
                        <StorageBar
                          value={percentage}
                          tone="neutral"
                          label={`${item.label}: ${item.fileCount.toLocaleString()} files`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyPanel message="No file-size data available." />
              )}
            </Panel>

            <Panel title="Recently modified">
              {breakdownQuery.isLoading ? (
                <div className="space-y-4 p-5">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Skeleton key={item} className="h-6 w-full" />
                  ))}
                </div>
              ) : breakdown?.recentFiles.length ? (
                <div className="divide-y divide-border">
                  {breakdown.recentFiles.slice(0, 5).map((file) => (
                    <div key={file.key} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" title={file.name}>
                          {file.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {file.lastModified
                            ? formatDistanceToNow(new Date(file.lastModified), { addSuffix: true })
                            : "Modified time unavailable"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.cdnUrl, "_blank", "noopener,noreferrer")}
                        aria-label={`View ${file.name}`}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyPanel message="No recently modified files." />
              )}
            </Panel>

            <Panel title="Smallest files">
              {smallestFilesQuery.isLoading ? (
                <div className="space-y-4 p-5">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-6 w-full" />
                  ))}
                </div>
              ) : smallestFiles.length ? (
                <>
                  <div className="divide-y divide-border">
                    {smallestFiles.map((file) => (
                      <div key={file.key} className="flex items-center justify-between gap-4 px-5 py-3">
                        <span className="truncate text-sm" title={file.name}>
                          {file.name}
                        </span>
                        <span className="shrink-0 text-sm font-medium tabular-nums">
                          {formatBytes(file.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                    Empty files shown separately
                  </p>
                </>
              ) : (
                <EmptyPanel message="No non-empty files available." />
              )}
            </Panel>

            <Panel title="Storage attention">
              {summaryQuery.isLoading ? (
                <div className="space-y-4 p-5">
                  {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {[
                    {
                      label: "Zero-byte files",
                      value: summary?.zeroByteFiles || 0,
                      tone: "text-amber-600 dark:text-amber-400",
                    },
                    {
                      label: "Unknown content type",
                      value: summary?.unknownContentTypeFiles || 0,
                      tone: "text-amber-600 dark:text-amber-400",
                    },
                    {
                      label: "Files older than one year",
                      value: summary?.filesOlderThanOneYear || 0,
                      tone: "text-foreground",
                    },
                    {
                      label: "Very large files above 1 GB",
                      value: summary?.filesAboveOneGb || 0,
                      tone: "text-foreground",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                      <span>{item.label}</span>
                      <span className={cn("font-semibold tabular-nums", item.tone)}>
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

      <Dialog
        open={Boolean(metadataFile)}
        onOpenChange={(open) => {
          if (!open) {
            setMetadataFile(null);
            setMetadata(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Object metadata</DialogTitle>
            <DialogDescription>
              Read-only S3 metadata for {metadataFile?.name || "the selected file"}.
            </DialogDescription>
          </DialogHeader>
          {isMetadataLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-8 w-full" />
              ))}
            </div>
          ) : metadata ? (
            <dl className="divide-y divide-border border-y border-border">
              {[
                ["Key", metadata.key],
                ["Size", formatBytes(metadata.size)],
                ["Content type", metadata.contentType],
                [
                  "Last modified",
                  metadata.lastModified
                    ? new Date(metadata.lastModified).toLocaleString()
                    : "Unavailable",
                ],
                ["ETag", metadata.etag || "Unavailable"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_1fr] gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="break-all font-mono text-xs">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">Metadata could not be loaded.</p>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
