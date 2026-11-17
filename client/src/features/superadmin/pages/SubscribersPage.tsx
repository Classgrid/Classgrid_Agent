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
import { UserCheck, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { BarChart } from "@/components/marketing_ui/BarChart";

import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/marketing_ui/card";
import { DataTable } from "@/components/marketing_ui/data-table";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/marketing_ui/tooltip";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { useNavigate } from "react-router-dom";
import { SuperadminFilterBar } from "../components/SuperadminFilterBar";

import { formatDate } from "@/utils/dateUtils";

import {
  useRemoveSubscriber,
  useSubscribers,
} from "../queries/useSubscribers";
import type { BlogSubscriber } from "../services/superAdminApi";

// Subscribers: the people on the classgrid.in email list (blog posts, changelog, legal notices). Data: GET
// /api/super-admin/subscribers (the blog_subscribers table). A subscriber is "Active" while at least one of the
// three emails is on; with all three off they are "Paused".

const STATUS_OPTIONS = [
  { label: "Status: All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "inactive" },
];

const PREFERENCE_OPTIONS = [
  { label: "Emails: All", value: "all" },
  { label: "Gets blog", value: "blog" },
  { label: "Gets changelog", value: "changelog" },
  { label: "Gets legal", value: "legal" },
  { label: "Blog off", value: "blog-off" },
  { label: "Changelog off", value: "changelog-off" },
  { label: "Legal off", value: "legal-off" },
];

const SELECT_CLASS =
  "flex h-9 w-full items-center rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground shadow-sm transition-colors hover:bg-muted";

// Skeleton bar heights for the chart while it loads (fixed, so the skeleton does not jump on every render)
const SKELETON_BARS = [40, 65, 30, 80, 55, 45, 70, 35, 60, 50, 75, 40, 85, 55, 45];

function formatSubscriberDate(value?: string | null) {
  return value ? formatDate(value, "dd MMM, yyyy") : "—";
}

function formatFullSubscriberDate(value?: string | null) {
    return value ? formatDate(value, "dd MMM, yyyy hh:mm a") : "—";
}

function EmailChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      title={`${label} emails ${on ? "on" : "off"}`}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        on ? "border-border bg-muted text-foreground" : "border-dashed border-border text-muted-foreground line-through"
      }`}
    >
      {label}
    </span>
  );
}

export function SubscribersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [preferenceFilter, setPreferenceFilter] = useState("all");
  const [removeEmail, setRemoveEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useSubscribers(
    {
      q: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      preference: preferenceFilter === "all" ? undefined : preferenceFilter,
    },
    true
  );

  const removeSubscriber = useRemoveSubscriber();

  const subscribers = data?.data ?? [];
  const trend = data?.trend ?? [];
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

  const confirmRemove = () => {
    const email = removeEmail;
    if (!email) return;
    removeSubscriber.mutate(email, {
      onSuccess: () => { toast.success(`${email} was removed from the list.`); setRemoveEmail(null); },
      onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || `Could not remove ${email}.`),
    });
  };

  const subscriberColumns = useMemo<any[]>(
    () => [
      {
        key: "email",
        header: "Email",
        width: "w-[34%]",
        render: (_val: any, row: BlogSubscriber) => (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground" title={row.email}>{row.email}</span>
            {row.name && <span className="truncate text-xs text-muted-foreground">{row.name}</span>}
          </div>
        )
      },
      {
        key: "is_active",
        header: "Status",
        width: "w-[13%]",
        render: (_val: any, row: BlogSubscriber) => (
            row.is_active ? (
                <Badge variant="info" dot>Active</Badge>
            ) : (
                <Badge variant="warning" dot>Paused</Badge>
            )
        )
      },
      {
        key: "created_at",
        header: "Subscribed",
        width: "w-[16%]",
        render: (_val: any, row: BlogSubscriber) => (
            <TooltipProvider delay={0}>
                <Tooltip>
                    <TooltipTrigger className="text-sm text-muted-foreground">
                        {formatSubscriberDate(row.created_at)}
                    </TooltipTrigger>
                    <TooltipContent>
                        Subscribed {formatFullSubscriberDate(row.created_at)}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
      },
      {
        key: "updated_at",
        header: "Emails",
        width: "w-[25%]",
        render: (_val: any, row: BlogSubscriber) => {
             if (!row.is_active) {
                 return (
                    <TooltipProvider delay={0}>
                        <Tooltip>
                            <TooltipTrigger className="text-sm text-muted-foreground">
                                All off since {formatSubscriberDate(row.updated_at)}
                            </TooltipTrigger>
                            <TooltipContent>
                                Paused {formatFullSubscriberDate(row.updated_at)}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 );
             }
             return (
                 <div className="flex flex-wrap items-center gap-1.5">
                     <EmailChip label="Blog" on={row.receives_blog !== false} />
                     <EmailChip label="Changelog" on={row.receives_changelog !== false} />
                     <EmailChip label="Legal" on={row.receives_legal !== false} />
                 </div>
             );
        }
      },
      {
        key: "actions",
        header: "",
        width: "w-[12%]",
        render: (_val: any, row: BlogSubscriber) => (
             <div className="flex items-center justify-end">
                 <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                    onClick={(e) => {
                        e.stopPropagation();
                        setRemoveEmail(row.email);
                    }}
                    disabled={removeSubscriber.isPending}
                 >
                    Remove
                 </Button>
             </div>
        )
      }
    ],
    [removeSubscriber.isPending]
  );

  const hasRows = !isLoading && subscribers.length > 0;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscribers</h1>
        <p className="text-sm text-muted-foreground">
          The classgrid.in email list: who gets the blog, changelog and legal notice emails.
        </p>
      </div>

      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
          <span className="text-foreground">{(error as any)?.response?.data?.message || "Could not load the subscribers."}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Subscribers" value={stats.total} icon={<Users size={16} />} />
          <StatCard title="Active" value={stats.active} icon={<UserCheck size={16} />} trend="Get at least one of the emails" />
          <StatCard title="Paused" value={stats.inactive} icon={<UserMinus size={16} />} trend="All three emails off" />
        </div>
      )}

      {/* Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Subscribes and unsubscribes</CardTitle>
          <p className="text-sm text-muted-foreground">Per day, last 15 days. Unsubscribed means all three emails were turned off that day.</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="mt-4 flex h-[300px] items-end gap-2">
              {SKELETON_BARS.map((h, i) => (
                <div key={i} className="flex h-full flex-1 flex-col justify-end">
                  <Skeleton className="w-full rounded-sm" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
          ) : (
            // The chart keeps its width and scrolls inside the card on a phone
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <BarChart
                  className="mt-4 h-[300px]"
                  data={trend}
                  index="label"
                  categories={["subscribed", "unsubscribed"]}
                  colors={["blue", "orange"]}
                  valueFormatter={(number: number) => Intl.NumberFormat("en-IN").format(number).toString()}
                  yAxisWidth={40}
                  showLegend={true}
                  allowDecimals={false}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {/* ═══ FILTER BAR ═══ */}
        <SuperadminFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search email"
        >
          <div className="w-[calc(50%-4px)] sm:w-[170px]">
            <ResponsiveSelect
              value={preferenceFilter}
              onChange={(e) => setPreferenceFilter(e.target.value)}
              className={SELECT_CLASS}
            >
              {PREFERENCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </ResponsiveSelect>
          </div>
          <div className="w-[calc(50%-4px)] sm:w-[150px]">
            <ResponsiveSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={SELECT_CLASS}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </ResponsiveSelect>
          </div>
        </SuperadminFilterBar>

        {!isLoading && (
          <div className="-mt-6 text-right text-sm text-muted-foreground">
            {subscribers.length} {subscribers.length === 1 ? "subscriber" : "subscribers"}
          </div>
        )}

        {/* Table: scrolls inside its own box on a phone */}
        <div className={hasRows ? "max-h-[600px] overflow-auto rounded-md border border-border" : ""}>
          <DataTable
            columns={subscriberColumns}
            rows={subscribers}
            isLoading={isLoading}
            onRowClick={(row: BlogSubscriber) => navigate(`/superadmin/subscribers/${encodeURIComponent(row.email)}`)}
            emptyMessage="No subscribers match this search or these filters."
            className={hasRows ? "min-w-[720px] rounded-none border-0" : ""}
          />
        </div>
      </div>

      <DangerConfirmDialog
        open={!!removeEmail}
        onOpenChange={(open) => { if (!open && !removeSubscriber.isPending) setRemoveEmail(null); }}
        title="Remove subscriber"
        description={<>Remove <strong className="break-all">{removeEmail}</strong> from the email list.</>}
        warningMessage="They stop getting every email and their preferences are deleted. To get emails again they have to subscribe again on classgrid.in."
        actionLabel="Remove"
        cancelLabel="Cancel"
        isLoading={removeSubscriber.isPending}
        onConfirm={confirmRemove}
        variant="danger"
      />
    </div>
  );
}
