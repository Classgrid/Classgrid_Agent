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
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/marketing_ui/button";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { User as UserIcon, HardDrive, LayoutTemplate, Cpu, Database } from "lucide-react";

import { GiftPlansPanel } from "@/features/superadmin/components/GiftPlansPanel";
import { GrantCreditsModal } from "@/features/superadmin/components/GrantCredits";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { PlanFolders, PlanPeopleFolders } from "@/features/superadmin/components/ai-usage/PlanFolders";
import { usePlansSummary } from "@/features/superadmin/queries/useAiUsage";
import { GlobalAiConfigPanel } from "@/features/superadmin/components/GlobalAiConfigPanel";
import { useGlobalAiStats, useAiUserDetail } from "@/features/superadmin/queries/useAiUsage";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { formatNumber, formatRoleLabel } from "@/lib/utils";
import { AiUserDetailPanel } from "@/features/superadmin/components/ai-usage/AiUserDetailPanel";
import { ModelUsageSection } from "@/features/superadmin/components/ai-usage/ModelUsageSection";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";


interface PathState {
  plan?: string;
  planName?: string;
  userId?: string;
  userName?: string;
}

import { useQueryClient } from "@tanstack/react-query";
import socketClient from "@/lib/socketClient";

const parseLocalDate = (dateStr: string) => {
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

// Today's date in YYYY-MM-DD format (IST), matching the backend aggregation key
const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function AiUsageDashboardPage() {
  const queryClient = useQueryClient();
  const [path, setPath] = useState<PathState>({});
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [isGiftPlansOpen, setIsGiftPlansOpen] = useState(false);
  const [isGrantCreditsOpen, setIsGrantCreditsOpen] = useState(false);
  const [spendingCurrency, setSpendingCurrency] = useState<"USD" | "INR">("USD");
  const { data: plansSummary } = usePlansSummary();

  const [chatsTime, setChatsTime] = useState<"daily" | "weekly" | "monthly">("daily");
  const [usersTime, setUsersTime] = useState<"daily" | "weekly" | "monthly">("daily");
  const [live, setLive] = useState(false); // WebSocket connected and listening for usage updates

  useEffect(() => {
    const socket = socketClient.getSocket();
    
    if (!socket) return;

    const refreshAll = () => {
      // Invalidate EVERY query related to AI usage to ensure 100% live updates across all graphs and drilldowns
      queryClient.invalidateQueries({ queryKey: ["ai-usage-global"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-orgs"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org-users"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-models"] });
      queryClient.invalidateQueries({ queryKey: ["globalAiConfig"] });
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
  

  const { data: globalUsersFallback } = useQuery({
    queryKey: ["global-users-fallback"],
    queryFn: () => apiClient.get<any>("/api/super-admin/users", { params: { limit: 1000 } }).then(r => r.data),
    staleTime: 300_000,
  });

  const selectedMonth = dateFilter ? dateFilter.getMonth() + 1 : undefined;
  const selectedYear = dateFilter ? dateFilter.getFullYear() : undefined;
  const { data: globalStats, isLoading: globalLoading } = useGlobalAiStats(undefined, selectedMonth, selectedYear);



  const getAggregatedData = (data: any[], type: "daily"| "weekly"| "monthly") => {
    if (!data) return [];
    if (type === "daily") return data;
    const aggregated: any = {};
    data.forEach(d => {
      let key = d.date;
      if (type === "weekly") {
         const date = new Date(d.date);
         const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
         const week = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
         key = `Week ${week} (${date.toLocaleString('default', { month: 'short' })})`;
      } else if (type === "monthly") {
         const date = new Date(d.date);
         key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      }
      if (!aggregated[key]) {
         aggregated[key] = { date: key, requests: 0, activeUsers: 0, activeOrgs: 0, activeUsersList: [], activeOrgsList: [] };
      }
      aggregated[key].requests += d.requests || 0;
      
      const newUsersList = [...aggregated[key].activeUsersList, ...(d.activeUsersList || [])];
      const newOrgsList = [...aggregated[key].activeOrgsList, ...(d.activeOrgsList || [])];
      
      aggregated[key].activeUsersList = newUsersList;
      aggregated[key].activeOrgsList = newOrgsList;
      
      aggregated[key].activeUsers = new Set(newUsersList).size;
      aggregated[key].activeOrgs = new Set(newOrgsList).size;
    });
    return Object.values(aggregated);
  };

  const { data: userDetail, isLoading: userDetailLoading } = useAiUserDetail(path.userId || "");


  



  const renderGlobalStats = () => {
    if (globalLoading) return <Skeleton className="h-96 w-full mb-8" />;
    if (!globalStats) return null;

    const { totalCreditsSpent, creditsPurchasedThisMonth, totalChats, usageTrend, usersBreakdown } = globalStats;

    const UniversalTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const date = parseLocalDate(label);
        const displayLabel = isNaN(date.getTime()) ? label : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        return (
          <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-sm flex flex-col gap-2 z-50">
            <span className="font-semibold text-foreground mb-1">{displayLabel || payload[0].payload.name}</span>
            {payload.map((entry: any, index: number) => (
              <span key={index} className="flex items-center gap-2" style={{ color: entry.color }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name} : {formatNumber(entry.value)}
              </span>
            ))}
          </div>
        );
      }
      return null;
    };

    return (
      <div className="space-y-6 mb-8">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {(["free", "pro", "max"] as const).map((key) => {
            const p = plansSummary?.plans?.find((x) => x.key === key);
            return (
              <Card key={key}>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <UserIcon className="h-8 w-8 text-blue-500 mb-3" />
                  <div className="text-3xl font-bold">{formatNumber(p?.people || 0)}</div>
                  <div className="text-sm text-muted-foreground mt-1">On {p?.name || key.charAt(0).toUpperCase() + key.slice(1)}</div>
                </CardContent>
              </Card>
            );
          })}
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <HardDrive className="h-8 w-8 text-amber-500 mb-3" />
              <div className="text-3xl font-bold">{formatNumber(totalChats || 0)}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Chat Sessions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Cpu className="h-8 w-8 text-blue-500 mb-3" />
              <div className="text-3xl font-bold">{formatNumber(totalCreditsSpent || 0)}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Credits Used</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Database className="h-8 w-8 text-indigo-500 mb-3" />
              <div className="text-3xl font-bold">{formatNumber(creditsPurchasedThisMonth || 0)}</div>
              <div className="text-sm text-muted-foreground mt-1">Credits Sold This Month</div>
            </CardContent>
          </Card>
        </div>

        {/* Settings beside the plans */}
        <GlobalAiConfigPanel />

        {/* The Grant panel gives plans now (owner, 2026-11-17: "we have plans, no AI credits gift"): pick many people,
            the same plan for all or Add Separate for a plan each */}
        <div className="border border-border rounded-xl shadow-sm bg-card flex flex-col justify-between">
          <div className="p-5">
            <h3 className="text-lg font-semibold text-foreground tracking-tight">Gift Plans</h3>
            <p className="text-sm text-muted-foreground mt-1">Give Pro or Max to many people at once. Use Add Separate to give each person a different plan.</p>
          </div>
          <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end">
            <Button variant="outline" onClick={() => setIsGiftPlansOpen(true)}>
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Open Gift Plans Panel
            </Button>
          </div>
        </div>
        <GiftPlansPanel isOpen={isGiftPlansOpen} onClose={() => setIsGiftPlansOpen(false)} />

        {/* Grant credits to many people at once (the old Grant panel, for people) */}
        <div className="border border-border rounded-xl shadow-sm bg-card flex flex-col justify-between">
          <div className="p-5">
            <h3 className="text-lg font-semibold text-foreground tracking-tight">Grant Credits</h3>
            <p className="text-sm text-muted-foreground mt-1">Give credits to many people at once.</p>
          </div>
          <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end">
            <Button variant="outline" onClick={() => setIsGrantCreditsOpen(true)}>
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Open Grant Panel
            </Button>
          </div>
        </div>
        <GrantCreditsModal
          isOpen={isGrantCreditsOpen}
          onClose={() => setIsGrantCreditsOpen(false)}
          orgs={(globalUsersFallback?.data || []).map((u: any) => ({
            id: String(u._id || u.id),
            name: u.name || u.email || "",
            orgName: "",
            email: u.email || "",
            role: formatRoleLabel(u.role || "user"),
            avatar: u.profilePicture || undefined,
          }))}
        />

        <div className="flex flex-col space-y-6">
          {/* Bar Chart 1: Daily AI Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Daily Usage Trend (Chats)</CardTitle>
              <div className="flex items-center gap-4">
                <NikhilTimeCalendar value={dateFilter} onChange={setDateFilter as any} showTime={false} placeholder="Select Date" className="w-[160px] h-9 border border-input bg-background" />
                <Select value={chatsTime} onValueChange={setChatsTime as any}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Daily" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getAggregatedData(usageTrend, chatsTime)} barCategoryGap="30%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis 
                      dataKey="date" 
                      stroke="currentColor" 
                      className="text-xs opacity-50" 
                      tickLine={false} 
                      axisLine={false}
                      minTickGap={15}
                      tickFormatter={(value) => {
                        const date = parseLocalDate(value);
                        return isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis stroke="currentColor" className="text-xs opacity-50" tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                        cursor={{ fill: 'currentColor', opacity: 0.05 }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const date = parseLocalDate(label);
                            const displayLabel = isNaN(date.getTime()) ? label : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                            return (
                              <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-sm flex flex-col gap-2 z-50">
                                <span className="font-semibold text-foreground mb-1">{displayLabel}</span>
                                {payload.map((entry: any, index: number) => (
                                  <span key={index} className="flex items-center gap-2" style={{ color: entry.color }}>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    {entry.name} : {formatNumber(entry.value)}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                    />
                    <Bar dataKey="requests" name="AI Requests" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={12} />
                                      <ReferenceLine x={getTodayStr()} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart 2: Input vs Output Tokens */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Tokens Consumed (Input vs Output)</CardTitle>
              <NikhilTimeCalendar value={dateFilter} onChange={setDateFilter as any} showTime={false} placeholder="Select Date" className="w-[160px] h-9 border border-input bg-background" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageTrend || []} barCategoryGap="30%" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis 
                      dataKey="date" 
                      stroke="currentColor" 
                      className="text-xs opacity-50" 
                      tickLine={false} 
                      axisLine={false}
                      minTickGap={15}
                      tickFormatter={(value) => {
                        const date = parseLocalDate(value);
                        return isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis stroke="currentColor" className="text-xs opacity-50" tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'currentColor', opacity: 0.05 }} content={<UniversalTooltip />} />
                    <Bar dataKey="promptTokens" name="Input Tokens" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} maxBarSize={12} />
                    <Bar dataKey="completionTokens" name="Output Tokens" stackId="a" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={12} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                      <ReferenceLine x={getTodayStr()} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart 3: Cost Spend Trend */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Daily Credits Spending</CardTitle>
              <div className="flex items-center gap-4">
                <NikhilTimeCalendar value={dateFilter} onChange={setDateFilter as any} showTime={false} placeholder="Select Date" className="w-[160px] h-9 border border-input bg-background" />
                <Select value={spendingCurrency} onValueChange={setSpendingCurrency as any}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageTrend || []} barCategoryGap="30%" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis 
                      dataKey="date" 
                      stroke="currentColor" 
                      className="text-xs opacity-50" 
                      tickLine={false} 
                      axisLine={false}
                      minTickGap={15}
                      tickFormatter={(value) => {
                        const date = parseLocalDate(value);
                        return isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis stroke="currentColor" className="text-xs opacity-50" tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'currentColor', opacity: 0.05 }} content={<UniversalTooltip />} />
                    <Bar 
                      dataKey={spendingCurrency === "USD" ? "costUSD" : "costINR"} 
                      name={`Cost (${spendingCurrency})`} 
                      fill="#10b981" 
                      radius={[2, 2, 0, 0]} 
                      maxBarSize={12} 
                    />
                                      <ReferenceLine x={getTodayStr()} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart 4: Top-up Revenue (INR) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Top-up Revenue (INR)</CardTitle>
              <NikhilTimeCalendar value={dateFilter} onChange={setDateFilter as any} showTime={false} placeholder="Select Date" className="w-[160px] h-9 border border-input bg-background" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageTrend || []} barCategoryGap="30%" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis 
                      dataKey="date" 
                      stroke="currentColor" 
                      className="text-xs opacity-50" 
                      tickLine={false} 
                      axisLine={false}
                      minTickGap={15}
                      tickFormatter={(value) => {
                        const date = parseLocalDate(value);
                        return isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis stroke="currentColor" className="text-xs opacity-50" tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'currentColor', opacity: 0.05 }} content={<UniversalTooltip />} />
                    <Bar dataKey="revenue" name="Revenue (INR)" fill="#8b5cf6" radius={[2, 2, 0, 0]} maxBarSize={12} />
                                      <ReferenceLine x={getTodayStr()} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart 5: Active Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Active Users</CardTitle>
              <Select value={usersTime} onValueChange={setUsersTime as any}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Daily" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getAggregatedData(usageTrend, usersTime)} barCategoryGap="30%" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis 
                      dataKey="date" 
                      stroke="currentColor" 
                      className="text-xs opacity-50" 
                      tickLine={false} 
                      axisLine={false}
                      minTickGap={15}
                      tickFormatter={(value) => {
                        const date = parseLocalDate(value);
                        return isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis stroke="currentColor" className="text-xs opacity-50" tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'currentColor', opacity: 0.05 }} content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const ids = [...new Set(data.activeUsersList || [])];
                            
                            return (
                              <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-sm flex flex-col gap-2 z-50 min-w-[220px]">
                                <span className="font-medium text-foreground">{label}</span>
                                <div className="text-xs text-muted-foreground mb-1">Active Users: {data.activeUsers}</div>
                                {ids.length === 0 ? <div className="text-xs text-muted-foreground italic">No users active</div> : null}
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                    {ids
                                        .map((id: any) => ({
                                            id,
                                            uData: usersBreakdown?.find((u: any) => u.userId === id || u._id === id || u.name === id) || { name: 'Unknown User', value: 0 }
                                        }))
                                        .sort((a: any, b: any) => (b.uData.value || 0) - (a.uData.value || 0))
                                        .slice(0, 10)
                                        .map(({ id, uData }: any) => (
                                         <div key={id} className="flex flex-col space-y-1 mb-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center space-x-2">
                                                {uData.profilePicture ? (
                                                    <img src={uData.profilePicture} alt={uData.name} className="h-5 w-5 rounded-full object-cover" />
                                                ) : (
                                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                                        {uData.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="truncate font-medium text-xs text-foreground">{uData.name}</span>
                                                    {uData.email && <span className="truncate text-[10px] text-muted-foreground">{uData.email}</span>}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                {uData.orgName && <span className="text-[10px] text-muted-foreground">Org: {uData.orgName}</span>}
                                                <span className="text-[10px] text-muted-foreground font-mono">User ID: {id}</span>
                                            </div>
                                         </div>
                                    ))}
                                    {ids.length > 3 && <div className="text-xs text-muted-foreground italic">+{ids.length - 3} more...</div>}
                                </div>
                              </div>
                            );
                        }
                        return null;
                    }} />
                    <Bar dataKey="activeUsers" name="Active Users" fill="#8b5cf6" radius={[2, 2, 0, 0]} maxBarSize={12} />
                                      <ReferenceLine x={getTodayStr()} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Breakdowns Row */}
          {/* The Top Organizations and Top Users cards have been removed as requested */}
          <ModelUsageSection />




        </div>
      </div>
    );
  };

  
  const renderLevel3UserDetail = () => {
    if (userDetailLoading) return <Skeleton className="h-96 w-full" />;
    return <AiUserDetailPanel userDetail={userDetail} />;
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PageBreadcrumbs
        items={[
          { label: "AI Usage & Credits", onClick: () => setPath({}) },
          ...(path.planName ? [{ label: path.planName, onClick: () => setPath({ plan: path.plan, planName: path.planName }) }] : []),
          ...(path.userName ? [{ label: path.userName }] : [])
        ] as any}
      />

      <div className="flex justify-end gap-2">
        {!path.plan && !path.userId && (
          <Link to="/superadmin/ai-usage/models" className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[13px] font-medium text-foreground hover:bg-muted transition-colors">
            Models
          </Link>
        )}
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-medium ${live ? "border-blue-500/30 text-blue-700 dark:text-blue-400" : "border-border text-muted-foreground"}`}>
          <span className={`h-2 w-2 rounded-full ${live ? "bg-blue-500 animate-pulse" : "bg-muted-foreground/50"}`} />
          {live ? "Live" : "Connecting…"}
        </span>
      </div>

      {!path.plan && !path.userId && renderGlobalStats()}
      {!path.plan && !path.userId && <PlanFolders onOpen={(plan, planName) => setPath({ plan, planName })} />}
      {path.plan && !path.userId && <PlanPeopleFolders plan={path.plan} planName={path.planName || ""} onOpen={(userId, userName) => setPath({ ...path, userId, userName })} />}
      {path.userId && renderLevel3UserDetail()}
    </div>
  );
}
