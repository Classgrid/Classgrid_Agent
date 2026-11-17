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
import {
  Mail,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { BarChart } from "@/components/marketing_ui/BarChart";

import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/marketing_ui/card";
import { Input } from "@/components/marketing_ui/input";
import { RecentActivityTable, DataTable } from "@/components/marketing_ui/data-table";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Switch } from "@/components/marketing_ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/marketing_ui/tooltip";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useNavigate } from "react-router-dom";
import { SuperadminFilterBar } from "../components/SuperadminFilterBar";

import { formatDate } from "@/utils/dateUtils";

import {
  usePauseSubscriber,
  useRemoveSubscriber,
  useResumeSubscriber,
  useSubscribers,
  useUpdateSubscriberPreferences,
} from "../queries/useSubscribers";
import type { BlogSubscriber } from "../services/superAdminApi";


const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "inactive" },
];

const PREFERENCE_OPTIONS = [
  { label: "Preference: All", value: "all" },
  { label: "Receives Blog", value: "blog" },
  { label: "Receives Changelog", value: "changelog" },
  { label: "Receives Legal", value: "legal" },
  { label: "Turned OFF Blog", value: "blog-off" },
  { label: "Turned OFF Changelog", value: "changelog-off" },
  { label: "Turned OFF Legal", value: "legal-off" },
];

function formatSubscriberDate(value?: string | null) {
  return value ? formatDate(value, "dd MMM, yyyy") : "—";
}

function formatFullSubscriberDate(value?: string | null) {
    return value ? formatDate(value, "dd MMM, yyyy hh:mm a") : "—";
}

export function SubscribersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [preferenceFilter, setPreferenceFilter] = useState("all");
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSubscribers(
    {
      q: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      preference: preferenceFilter === "all" ? undefined : preferenceFilter,
    },
    true
  );

  const pauseSubscriber = usePauseSubscriber();
  const resumeSubscriber = useResumeSubscriber();
  const removeSubscriber = useRemoveSubscriber();
  const updatePreferences = useUpdateSubscriberPreferences();

  const isMutating =
    pauseSubscriber.isPending ||
    resumeSubscriber.isPending ||
    updatePreferences.isPending;

  const subscribers = data?.data ?? [];
  const inactiveSubscribers = data?.inactiveSubscribers ?? [];
  const recentSubscribers = data?.recentSubscribers ?? [];
  const trend = data?.trend ?? [];
  const activity = data?.activity ?? {
    lastSubscribedAt: null,
    lastUnsubscribedAt: null,
  };
  const stats = data?.stats ?? {
    total: 0,
    active: 0,
    inactive: 0,
    newSubscribers14d: 0,
    newUnsubscribes14d: 0,
    netGrowth14d: 0,
    activeRate: 0,
    deliveryReady: 0,
  };

  const subscribeSparkline = trend.map((point) => point.subscribed);
  const unsubscribeSparkline = trend.map((point) => point.unsubscribed);

  const handleToggleActive = (subscriber: BlogSubscriber, isActive: boolean) => {
    const action = isActive ? resumeSubscriber : pauseSubscriber;
    action.mutate(subscriber.email, {
        onSuccess: () => toast.success(`Subscriber ${isActive ? 'resumed' : 'paused'}.`),
        onError: (err: any) =>
          toast.error(err?.message || `Failed to ${isActive ? 'resume' : 'pause'} subscriber.`),
    });
  }

  const handlePause = (email: string) => {
    pauseSubscriber.mutate(email, {
      onSuccess: () => toast.success("Subscriber paused."),
      onError: (err: any) =>
        toast.error(err?.message || "Failed to pause subscriber."),
    });
  };

  const handleResume = (email: string) => {
    resumeSubscriber.mutate(email, {
      onSuccess: () => toast.success("Subscriber resumed."),
      onError: (err: any) =>
        toast.error(err?.message || "Failed to resume subscriber."),
    });
  };

  const handleRemove = (email: string) => {
    removeSubscriber.mutate(email, {
      onSuccess: () => toast.success(`${email} removed successfully.`),
      onError: (err: any) =>
        toast.error(err?.message || `Failed to remove ${email}.`),
    });
  };

  const subscriberColumns = useMemo<any[]>(
    () => [
      {
        key: "email",
        header: "Email",
        width: "w-[250px]",
        render: (_val: any, row: BlogSubscriber) => (
          <div 
            className="flex flex-col gap-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/superadmin/subscribers/${encodeURIComponent(row.email)}`)}
          >
            <span className="font-mono text-sm text-emerald-600 dark:text-emerald-500 hover:underline">{row.email}</span>
            <span className="text-xs text-muted-foreground">Click to view details</span>
          </div>
        )
      },
      {
        key: "is_active",
        header: "Status",
        width: "w-[120px]",
        render: (_val: any, row: BlogSubscriber) => (
            row.is_active ? (
                <Badge variant="success" dot>Active</Badge>
            ) : (
                <Badge variant="warning">Paused</Badge>
            )
        )
      },
      {
        key: "created_at",
        header: "Subscribed",
        width: "w-[160px]",
        render: (_val: any, row: BlogSubscriber) => (
            <TooltipProvider>
                <Tooltip delay={0}>
                    <TooltipTrigger className="text-sm text-muted-foreground">
                        {formatSubscriberDate(row.created_at)}
                    </TooltipTrigger>
                    <TooltipContent>
                        Joined: {formatFullSubscriberDate(row.created_at)}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
      },
      {
        key: "updated_at",
        header: "Preferences / Unsubscribed",
        width: "w-[200px]",
        render: (_val: any, row: BlogSubscriber) => {
             if (!row.is_active) {
                 return (
                    <TooltipProvider>
                        <Tooltip delay={0}>
                            <TooltipTrigger className="text-sm text-muted-foreground">
                                {formatSubscriberDate(row.updated_at)}
                            </TooltipTrigger>
                            <TooltipContent>
                                Unsubscribed: {formatFullSubscriberDate(row.updated_at)}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 );
             }

             const blogStyle = row.receives_blog !== false 
                ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20" 
                : "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 opacity-60";
             const changelogStyle = row.receives_changelog !== false 
                ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20" 
                : "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 opacity-60";
             const legalStyle = row.receives_legal !== false 
                ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20" 
                : "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 opacity-60";

             return (
                 <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                     <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0 ${blogStyle}`}>Blog</Badge>
                     <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0 ${changelogStyle}`}>Changelog</Badge>
                     <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0 ${legalStyle}`}>Legal</Badge>
                 </div>
             );
        }
      },
      {
        key: "actions",
        header: "Actions",
        width: "w-[100px]",
        render: (_val: any, row: BlogSubscriber) => (
             <div className="flex items-center">
                 <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(row.email);
                    }}
                    disabled={isMutating}
                 >
                    Remove
                 </Button>
             </div>
        )
      }
    ],
    [isMutating]
  );

  const inactiveColumns = useMemo<any[]>(
    () => [
      {
        key: "email",
        header: "Email",
        render: (_val: any, row: BlogSubscriber) => (
            <div className="flex flex-col gap-1">
                <span className="font-medium text-sm text-foreground">{row.email}</span>
                <span className="text-xs text-muted-foreground">Currently not receiving updates</span>
            </div>
        )
      },
      {
        key: "updated_at",
        header: "Paused On",
        width: "w-[150px]",
        render: (_val: any, row: BlogSubscriber) => (
            <span className="text-sm text-muted-foreground">{formatSubscriberDate(row.updated_at)}</span>
        )
      },
      {
        key: "actions",
        header: "Actions",
        width: "w-[180px]",
        render: (_val: any, row: BlogSubscriber) => (
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    disabled={isMutating}
                    onClick={() => handleResume(row.email)}
                >
                Resume
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                    disabled={isMutating}
                    onClick={() => handleRemove(row.email)}
                >
                Remove
                </Button>
            </div>
        )
      }
    ],
    [isMutating]
  );



  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
        {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscribers</h1>
          <p className="text-sm text-muted-foreground">
            Track growth, unsubscribes, and audience health for blog, changelog and legal notice emails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          
        </div>
      </div>

        {/* Stats Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Subscribers"
          value={isLoading ? <Skeleton className="h-9 w-24" /> : stats.total}
          icon={<Users size={16} />}
        />
        <StatCard
          title="Delivery Ready (Active)"
          value={isLoading ? <Skeleton className="h-9 w-24" /> : stats.deliveryReady}
          icon={<UserCheck size={16} />}
        />
        <StatCard
          title="Paused / Unsubscribed"
          value={isLoading ? <Skeleton className="h-9 w-24" /> : stats.inactive}
          icon={<UserMinus size={16} />}
        />
      </div>



        {/* Trend & Health */}
        <Card>
            <CardHeader>
                <CardTitle>Subscriber Movement</CardTitle>
                <p className="text-sm text-muted-foreground">Daily new subscribes vs unsubscribes over the last 15 days.</p>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="h-[300px] mt-4 flex items-end gap-2">
                         {/* Fake bars for a bar chart skeleton */}
                         {Array.from({ length: 15 }).map((_, i) => (
                             <div key={i} className="flex-1 flex flex-col justify-end gap-1 h-full">
                                 <Skeleton className="w-full rounded-sm" style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
                             </div>
                         ))}
                     </div>
                ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                        <BarChart
                            className="h-[300px] mt-4"
                            data={trend}
                            index="label"
                            categories={["subscribed", "unsubscribed"]}
                            colors={["blue", "emerald"]}
                            valueFormatter={(number: number) =>
                              Intl.NumberFormat("us").format(number).toString()
                            }
                            yAxisWidth={40}
                            showLegend={true}
                            xAxisLabel="Last 15 Days"
                        />
                    </div>
                </div>
                )}
            </CardContent>
        </Card>

      <div className="mt-6 flex flex-col gap-4">
        {/* ═══ FILTER BAR ═══ */}
        <SuperadminFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search subscriber email..."
        >
          <div className="w-[180px]">
            <ResponsiveSelect
              value={preferenceFilter}
              onChange={(e) => setPreferenceFilter(e.target.value)}
              className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm"
            >
              {PREFERENCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </ResponsiveSelect>
          </div>
          <div className="w-[150px]">
            <ResponsiveSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </ResponsiveSelect>
          </div>
        </SuperadminFilterBar>
        
        <div className="flex justify-end">
            <div className="text-sm text-muted-foreground whitespace-nowrap">
                Showing {subscribers.length} rows
            </div>
        </div>

        {/* Table Area */}
        <DataTable
            columns={subscriberColumns}
            rows={subscribers}
            isLoading={isLoading}
            emptyMessage="No subscribers found. Try a different search or status filter."
            className="max-h-[600px] overflow-auto"
        />
      </div>
    </div>
  );
}
