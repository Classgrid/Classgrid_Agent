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
// Trigger deploy verification - Oct 4 2026
// Trigger deploy verification - Oct 4 2026
//
// Plans & Usage (/superadmin/ai-usage), rebuilt around people and plans (owner, 2026-11-17). Everyone is in the one
// Classgrid account now, so the old drill-down through organizations and roles is gone. The page has two views,
// both kept in the address so Back and shared links work:
// - the list (no ?user): the plans with how many people are on each, the people list (?q, ?plan, ?how, ?page),
//   the usage charts of the month, and the settings beside the plans;
// - one person (?user=<24 hex id>): their plan, usage, gift form, history, credits and AI access.
// Other pages can link straight to a person with /superadmin/ai-usage?user=<id>.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Users, IndianRupee } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import socketClient from "@/lib/socketClient";
import { GlobalAiConfigPanel } from "@/features/superadmin/components/GlobalAiConfigPanel";
import { PlansSummary } from "@/features/superadmin/components/ai-usage/PlansSummary";
import { PeopleList, type PeopleFilterPatch } from "@/features/superadmin/components/ai-usage/PeopleList";
import { AiUserDetailPanel } from "@/features/superadmin/components/ai-usage/AiUserDetailPanel";
import { ModelUsageSection } from "@/features/superadmin/components/ai-usage/ModelUsageSection";
import { Section } from "@/features/superadmin/components/ai-usage/Section";
import { isPersonId, scrollToId } from "@/features/superadmin/components/ai-usage/planText";
import { useGlobalAiStats, useAiUserDetail } from "@/features/superadmin/queries/useAiUsage";

// No green in the app's own look (owner's rule)
const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#64748b'];
const TODAY_LINE = '#f59e0b';

type Period = "daily" | "weekly" | "monthly";
const PERIOD_LABELS: Record<Period, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const CURRENCY_LABELS = { INR: "₹ INR", USD: "$ USD" } as const;
type Currency = keyof typeof CURRENCY_LABELS;

/** One day of the month's usage (GET /global/stats usageTrend) */
type TrendDay = { date: string; requests?: number; activeUsers?: number; activeUsersList?: string[]; costUSD?: number; costINR?: number };
type UserBreakdown = { userId?: string; _id?: string; name?: string; email?: string; value?: number };
type Bucket = { date: string; requests: number; activeUsers: number; activeUsersList: string[] };

/** The "list" filters in the address, with their defaults (a default is left out of the address) */
const FILTER_DEFAULTS: Record<string, string> = { q: "", plan: "all", how: "all", page: "1" };

const parseLocalDate = (dateStr: string) => {
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year = 0, month = 1, day = 1] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

// Today's date in YYYY-MM-DD format (IST), matching the backend aggregation key
const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const shortDay = (value: string) => {
  const date = parseLocalDate(value);
  return isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};
const longDay = (value: string) => {
  const date = parseLocalDate(value);
  return isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
};
const num = (v: number) => Math.round(v || 0).toLocaleString("en-IN");

/** Days added up into weeks or months (the people are counted once per bucket) */
function bucketed(data: TrendDay[] | undefined, type: Period): Bucket[] {
  const rows = (data || []).map((d) => ({ date: d.date, requests: d.requests || 0, activeUsers: d.activeUsers || 0, activeUsersList: d.activeUsersList || [] }));
  if (type === "daily") return rows;
  const out = new Map<string, Bucket>();
  for (const d of rows) {
    const date = new Date(d.date);
    let key: string;
    if (type === "weekly") {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const week = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
      key = `Week ${week} (${date.toLocaleString('en-IN', { month: 'short' })})`;
    } else {
      key = date.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    }
    const b = out.get(key) || { date: key, requests: 0, activeUsers: 0, activeUsersList: [] };
    b.requests += d.requests;
    b.activeUsersList = [...b.activeUsersList, ...d.activeUsersList];
    b.activeUsers = new Set(b.activeUsersList).size;
    out.set(key, b);
  }
  return [...out.values()];
}

function PeriodSelect({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as Period)}>
      <SelectTrigger className="w-[120px] h-9" aria-label="Group by"><SelectValue>{(v: Period) => PERIOD_LABELS[v] || PERIOD_LABELS.daily}</SelectValue></SelectTrigger>
      <SelectContent>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ChartBox({ children }: { children: ReactNode }) {
  return <div className="h-[280px] w-full min-w-0">{children}</div>;
}

/** D. The usage of the month: requests a day, people using AI a day, and what the AI cost a day */
function UsageThisMonth() {
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [requestsTime, setRequestsTime] = useState<Period>("daily");
  const [peopleTime, setPeopleTime] = useState<Period>("daily");
  const [currency, setCurrency] = useState<Currency>("INR");
  const month = dateFilter ? dateFilter.getMonth() + 1 : undefined;
  const year = dateFilter ? dateFilter.getFullYear() : undefined;
  const { data: stats, isLoading } = useGlobalAiStats(undefined, month, year);
  const trend = stats?.usageTrend as TrendDay[] | undefined;
  const people = (stats?.usersBreakdown || []) as UserBreakdown[];
  const monthName = dateFilter ? dateFilter.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";
  const axis = { stroke: "currentColor", className: "text-xs opacity-50", tickLine: false, axisLine: false } as const;

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{monthName ? `Usage in ${monthName}` : "Usage this month"}</h2>
        <p className="text-sm text-muted-foreground">Everyone's AI use, a day at a time.</p>
      </div>

      <Section
        icon={Activity}
        title="AI requests a day"
        right={
          <>
            <NikhilTimeCalendar value={dateFilter} onChange={setDateFilter} showTime={false} placeholder="Pick a month" className="w-[160px] h-9 border border-input bg-background" />
            <PeriodSelect value={requestsTime} onChange={setRequestsTime} />
          </>
        }
      >
        <ChartBox>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bucketed(trend, requestsTime)} barCategoryGap="30%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="date" {...axis} minTickGap={15} tickFormatter={shortDay} />
              <YAxis {...axis} />
              <RechartsTooltip
                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                content={({ active, payload, label }) => {
                  const first = payload?.[0];
                  if (!active || !first) return null;
                  return (
                    <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-sm flex flex-col gap-1 z-50">
                      <span className="font-semibold text-foreground">{longDay(String(label))}</span>
                      <span className="text-muted-foreground">{num(Number(first.value))} requests</span>
                    </div>
                  );
                }}
              />
              <Bar dataKey="requests" name="Requests" fill={COLORS[0]} radius={[2, 2, 0, 0]} maxBarSize={12} />
              {requestsTime === "daily" && <ReferenceLine x={getTodayStr()} stroke={TODAY_LINE} strokeWidth={2} strokeDasharray="4 4" />}
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </Section>

      <Section icon={Users} title="People using AI a day" right={<PeriodSelect value={peopleTime} onChange={setPeopleTime} />}>
        <ChartBox>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bucketed(trend, peopleTime)} barCategoryGap="30%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="date" {...axis} minTickGap={15} tickFormatter={shortDay} />
              <YAxis {...axis} allowDecimals={false} />
              <RechartsTooltip
                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                content={({ active, payload, label }) => {
                  const first = payload?.[0];
                  if (!active || !first) return null;
                  const bucket = first.payload as Bucket;
                  const ids = [...new Set(bucket.activeUsersList || [])];
                  // The people, most use first; at most 10 are named, the rest are counted
                  const named = ids
                    .map((id) => ({ id, u: people.find((p) => p.userId === id || p._id === id) }))
                    .sort((a, b) => (b.u?.value || 0) - (a.u?.value || 0))
                    .slice(0, 10);
                  return (
                    <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-sm flex flex-col gap-2 z-50 min-w-[220px] max-w-[280px]">
                      <span className="font-medium text-foreground">{longDay(String(label))}</span>
                      <span className="text-xs text-muted-foreground">{bucket.activeUsers === 1 ? "1 person" : `${num(bucket.activeUsers)} people`}</span>
                      {named.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {named.map(({ id, u }) => (
                            <div key={id} className="flex flex-col min-w-0">
                              <span className="truncate text-xs font-medium text-foreground">{u?.name || u?.email || "Someone"}</span>
                              {u?.email && u?.name && <span className="truncate text-[11px] text-muted-foreground">{u.email}</span>}
                            </div>
                          ))}
                          {ids.length > 10 && <span className="text-xs text-muted-foreground">+{num(ids.length - 10)} more</span>}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="activeUsers" name="People" fill={COLORS[1]} radius={[2, 2, 0, 0]} maxBarSize={12} />
              {peopleTime === "daily" && <ReferenceLine x={getTodayStr()} stroke={TODAY_LINE} strokeWidth={2} strokeDasharray="4 4" />}
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </Section>

      <Section
        icon={IndianRupee}
        title="What the AI cost a day"
        right={
          <Select value={currency} onValueChange={(v) => v && setCurrency(v as Currency)}>
            <SelectTrigger className="w-[110px] h-9" aria-label="Currency"><SelectValue>{(v: Currency) => CURRENCY_LABELS[v] || CURRENCY_LABELS.INR}</SelectValue></SelectTrigger>
            <SelectContent>
              {(Object.keys(CURRENCY_LABELS) as Currency[]).map((c) => <SelectItem key={c} value={c}>{CURRENCY_LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      >
        <ChartBox>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend || []} barCategoryGap="30%" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="date" {...axis} minTickGap={15} tickFormatter={shortDay} />
              <YAxis {...axis} />
              <RechartsTooltip
                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                content={({ active, payload, label }) => {
                  const first = payload?.[0];
                  if (!active || !first) return null;
                  const v = Number(first.value) || 0;
                  return (
                    <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-sm flex flex-col gap-1 z-50">
                      <span className="font-semibold text-foreground">{longDay(String(label))}</span>
                      <span className="text-muted-foreground">
                        {currency === "INR" ? `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : `$${v.toLocaleString("en-IN", { maximumFractionDigits: 4 })}`}
                      </span>
                    </div>
                  );
                }}
              />
              <Bar dataKey={currency === "USD" ? "costUSD" : "costINR"} name="Cost" fill={COLORS[4]} radius={[2, 2, 0, 0]} maxBarSize={12} />
              <ReferenceLine x={getTodayStr()} stroke={TODAY_LINE} strokeWidth={2} strokeDasharray="4 4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </Section>

      <ModelUsageSection />
    </div>
  );
}

export function AiUsageDashboardPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [live, setLive] = useState(false); // WebSocket connected and listening for usage updates

  const userParam = params.get("user");
  const q = params.get("q") || "";
  const plan = params.get("plan") || "all";
  const how = params.get("how") || "all";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);

  // The person's name for the breadcrumbs (the same query the person view reads, so it is asked once)
  const { data: person } = useAiUserDetail(userParam && isPersonId(userParam) ? userParam : "");

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    const refreshAll = () => {
      // Everything on this page that a change can move: the plans, the people, the open person, the charts, the settings
      for (const queryKey of [["ai-plans-summary"], ["ai-people"], ["ai-usage-user"], ["ai-usage-user-history"], ["ai-usage-global"], ["ai-usage-models"], ["globalAiConfig"], ["aiPlans"]]) {
        queryClient.invalidateQueries({ queryKey });
      }
    };
    // The server forgets room membership whenever the connection drops (server restart, deploy, Wi-Fi blip),
    // so re-join on every (re)connect and refresh at once to catch anything missed.
    const onConnect = () => { socketClient.joinAiUsageDashboard(); setLive(true); refreshAll(); };
    const onDisconnect = () => setLive(false);

    socket.on("ai_usage_updated", refreshAll);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) { socketClient.joinAiUsageDashboard(); setLive(true); }

    return () => {
      socketClient.leaveAiUsageDashboard();
      socket.off("ai_usage_updated", refreshAll);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [queryClient]);

  // The list filters replace the address entry (typing a search is not a step to go back through)
  const setFilters = useCallback((patch: PeopleFilterPatch) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, raw] of Object.entries(patch)) {
        const value = raw === undefined ? undefined : String(raw);
        if (value === undefined) continue;
        if (value === "" || value === FILTER_DEFAULTS[key]) next.delete(key);
        else next.set(key, value);
      }
      return next;
    }, { replace: true });
  }, [setParams]);

  // Opening a person is a new address entry, so Back returns to the list with its filters
  const openPerson = useCallback((id: string) => {
    setParams((prev) => { const next = new URLSearchParams(prev); next.set("user", id); return next; });
    window.scrollTo(0, 0);
  }, [setParams]);

  const backToEveryone = useCallback(() => {
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete("user"); return next; });
    window.scrollTo(0, 0);
  }, [setParams]);

  const seePlanPeople = useCallback((key: string) => {
    setFilters({ plan: key, page: 1, ...(key === "free" ? { how: "all" } : {}) });
    // (after the list has the new filter, so the scroll lands on it)
    window.setTimeout(() => scrollToId("people"), 0);
  }, [setFilters]);

  if (userParam !== null) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 sm:p-8 sm:pt-6 min-w-0">
        <PageBreadcrumbs items={[{ label: "Plans & Usage", href: "/superadmin/ai-usage" }, { label: person?.name || person?.email || "Person" }]} />
        <AiUserDetailPanel userId={userParam} onBack={backToEveryone} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 pt-6 sm:p-8 sm:pt-6 min-w-0">
      <PageBreadcrumbs items={[{ label: "Plans & Usage" }]} />

      <PageHeader title="Plans & Usage" description="Who is on which plan, what they use, and the plans you gift.">
        <Link to="/superadmin/ai-usage/models" className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[13px] font-medium text-foreground hover:bg-muted transition-colors">
          Models
        </Link>
        <span className={`inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[13px] font-medium ${live ? "text-foreground" : "text-muted-foreground"}`}>
          <span className={`h-2 w-2 rounded-full ${live ? "bg-foreground/70 animate-pulse" : "bg-muted-foreground/50"}`} />
          {live ? "Live" : "Connecting"}
        </span>
      </PageHeader>

      <div className="flex flex-col gap-6 min-w-0">
        <PlansSummary onSeePeople={seePlanPeople} />
        <PeopleList q={q} plan={plan} how={how} page={page} onChange={setFilters} onOpen={openPerson} />
        <UsageThisMonth />
        <GlobalAiConfigPanel />
      </div>
    </div>
  );
}
