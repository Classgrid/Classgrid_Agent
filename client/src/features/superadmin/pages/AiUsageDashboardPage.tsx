// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Trigger deploy verification - Oct 4 2026
// Trigger deploy verification - Oct 4 2026
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { SuperadminFilterBar } from "@/features/superadmin/components/SuperadminFilterBar";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { Search, Filter, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/marketing_ui/dialog";
import { DataTable } from "@/components/marketing_ui/data-table";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { 
  Building, 
  ChevronRight,
  Home,
  Shield,
  Activity,
  User as UserIcon,
  Cpu,
  Database,
  HardDrive,
  LayoutTemplate
} from "lucide-react";

import { AiUsageTrendsChart } from "@/features/superadmin/components/AiUsageTrendsChart";
import { AiUsageBar } from "@/components/ai/components/AiUsageBar";
import { TopAiUsersTable } from "@/features/superadmin/components/TopAiUsersTable";
import { SetupUsageCredits } from "@/features/superadmin/components/SetupUsageCredits";
import { GrantCreditsModal } from "@/features/superadmin/components/GrantCredits";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { GlobalAiConfigPanel } from "@/features/superadmin/components/GlobalAiConfigPanel";
import { ResetOrganizationDailyLimit } from "@/features/superadmin/components/ResetOrganizationDailyLimit";
import { EditOrganizationDailyLimit } from "@/features/superadmin/components/EditOrganizationDailyLimit";
import { BlockOrganizationAiUsage } from "@/features/superadmin/components/BlockOrganizationAiUsage";
import { 
  useGlobalAiStats, 
  useAiUsageOrgs, 
  useAiOrgDetail, 
  useAiOrgUsers,
  useAiUserDetail,
  useResetOrgUsage,
  useBlockAiOrg,
  useUpdateOrgAiLimits,
  useGlobalGrantedCredits
} from "@/features/superadmin/queries/useAiUsage";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { formatNumber, formatRoleLabel } from "@/lib/utils";
import { AiUserDetailPanel } from "@/features/superadmin/components/ai-usage/AiUserDetailPanel";
import { ModelUsageSection } from "@/features/superadmin/components/ai-usage/ModelUsageSection";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Legend, Pie, Cell, ReferenceLine } from "recharts";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

interface PathState {
  orgId?: string;
  orgName?: string;
  role?: string;
  userId?: string;
  userName?: string;
}

const FolderIcon = ({ label, subtitle, onClick, badge, icon: Icon = Building }: any) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-start p-4 rounded-xl hover:bg-accent/50 transition-colors border border-transparent hover:border-border group h-auto min-h-[160px] relative cursor-pointer"
  >
    <div className="relative mb-2">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 group-hover:text-amber-500 transition-colors drop-shadow-sm">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>
      {badge > 0 && (
        <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm min-w-[20px] text-center">
          {badge}
        </div>
      )}
      {badge === "BLOCKED" && (
        <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm min-w-[20px] text-center">
          {badge}
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center pt-2">
        <Icon className="w-6 h-6 text-amber-100 opacity-60" />
      </div>
    </div>
    <div className="flex flex-col w-full justify-center mt-2">
      <span className="text-sm font-medium text-foreground whitespace-normal break-normal w-full text-center leading-tight px-1 text-balance">{label}</span>
      {subtitle && <span className="text-xs text-muted-foreground whitespace-normal break-words w-full text-center mt-1 px-1 text-balance">{subtitle}</span>}
    </div>
  </button>
);
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-sm flex flex-col gap-1 z-50">
        <span className="font-semibold text-foreground flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }} />
          {payload[0].name}
        </span>
        <span className="text-muted-foreground">{new Intl.NumberFormat("en-IN").format(payload[0].value)} Tokens Consumed</span>
      </div>
    );
  }
  return null;
};

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
  const { data: currentUser } = useCurrentUser();
  const [path, setPath] = useState<PathState>({});
  const [showOrgReset, setShowOrgReset] = useState(false);
  const [showOrgBlock, setShowOrgBlock] = useState(false);
  const [showLimitsDialog, setShowLimitsDialog] = useState(false);
  const [tempLimits, setTempLimits] = useState({ poolLimit: 0, userWeeklyLimit: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [orgTypeFilter, setOrgTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [selectedGlobalOrgId, setSelectedGlobalOrgId] = useState<string>("all");
  const [isGlobalGrantCreditsOpen, setIsGlobalGrantCreditsOpen] = useState(false);
  const [isOrgGrantCreditsOpen, setIsOrgGrantCreditsOpen] = useState(false);

  const [chatsTime, setChatsTime] = useState<"daily" | "weekly" | "monthly">("daily");
  const [orgsTime, setOrgsTime] = useState<"daily" | "weekly" | "monthly">("daily");
  const [usersTime, setUsersTime] = useState<"daily" | "weekly" | "monthly">("daily");
  const [spendingCurrency, setSpendingCurrency] = useState<"USD" | "INR">("USD");
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
  
  const resetOrgMutation = useResetOrgUsage();
  const blockOrgMutation = useBlockAiOrg();
  const updateLimitsMutation = useUpdateOrgAiLimits();

  const { data: globalUsersFallback } = useQuery({
    queryKey: ["global-users-fallback"],
    queryFn: () => apiClient.get<any>("/api/super-admin/users", { params: { limit: 1000 } }).then(r => r.data),
    staleTime: 300_000,
  });

  const getFallbackPhoto = (email: string) => {
    if (!globalUsersFallback?.data) return null;
    const found = globalUsersFallback.data.find((u: any) => u.email === email);
    return found?.profilePicture || null;
  };

  const getFallbackOrgLogo = (orgId: string) => {
    if (!globalUsersFallback?.data) return null;
    const foundUserInOrg = globalUsersFallback.data.find((u: any) => u.organization_id === orgId);
    return foundUserInOrg?.organizationLogo || null;
  };

  const getFallbackAdminEmail = (orgId: string) => {
    if (!globalUsersFallback?.data) return null;
    const foundAdminInOrg = globalUsersFallback.data.find((u: any) => u.organization_id === orgId && (u.role === "org_admin" || u.role === "super_admin"));
    return foundAdminInOrg?.email || null;
  };

  const selectedMonth = dateFilter ? dateFilter.getMonth() + 1 : undefined;
  const selectedYear = dateFilter ? dateFilter.getFullYear() : undefined;
  const { data: globalStats, isLoading: globalLoading } = useGlobalAiStats(
    selectedGlobalOrgId !== "all" ? selectedGlobalOrgId : undefined,
    selectedMonth,
    selectedYear
  );

  const { data: globalGrantedCredits, isLoading: loadingGrantedCredits } = useGlobalGrantedCredits();

  const { data: orgTrendStats } = useGlobalAiStats(
    path.orgId,
    selectedMonth,
    selectedYear
  );

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
  const { data: orgs, isLoading: orgsLoading } = useAiUsageOrgs();

  const { data: orgDetail, isLoading: orgDetailLoading } = useAiOrgDetail(path.orgId || "");
  const { data: orgUsers, isLoading: orgUsersLoading } = useAiOrgUsers(path.orgId || "");
  const { data: userDetail, isLoading: userDetailLoading } = useAiUserDetail(path.userId || "");

  const handleNavigateUp = (level: "root" | "org" | "role") => {
    if (level === "root") setPath({});
    else if (level === "org") setPath({ orgId: path.orgId, orgName: path.orgName });
    else if (level === "role") setPath({ orgId: path.orgId, orgName: path.orgName, role: path.role });
  };

  



  const renderGlobalStats = () => {
    if (globalLoading) return <Skeleton className="h-96 w-full mb-8" />;
    if (!globalStats) return null;

    const { totalCreditsSpent, totalRevenue, creditsPurchasedThisMonth, totalChats, usageTrend, models, orgsBreakdown, usersBreakdown } = globalStats;
    // Prepare pie chart data
    const modelPieData = models?.map((m: any, i: number) => ({ 
        name: m.name.split('/').pop(), 
        value: m.value || m.requests || 0,
        color: COLORS[i % COLORS.length]
    })) || [];

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
        <div className="grid gap-4 md:grid-cols-4">
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
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Building className="h-8 w-8 text-emerald-500 mb-3" />
              <div className="text-3xl font-bold">{formatNumber(orgs?.length || 0)}</div>
              <div className="text-sm text-muted-foreground mt-1">Active Organizations</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <HardDrive className="h-8 w-8 text-amber-500 mb-3" />
              <div className="text-3xl font-bold">{formatNumber(totalChats || 0)}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Chat Sessions</div>
            </CardContent>
          </Card>
        </div>

        {/* Global Limits & Grant Credits */}
        <GlobalAiConfigPanel 
          grantCreditsNode={
            <div className="border border-border rounded-xl shadow-sm bg-card flex flex-col justify-between">
              <div className="p-5">
                <h3 className="text-lg font-semibold text-foreground tracking-tight">Grant Global Credits</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Open the AI Hub Panel to securely grant tokens across all organizations.
                </p>
              </div>
              <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end">
                <Button variant="outline" onClick={() => setIsGlobalGrantCreditsOpen(true)}>
                  <LayoutTemplate className="w-4 h-4 mr-2" />
                  Open Global Grant Panel
                </Button>
              </div>
            </div>
          }
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

          {/* Bar Chart 5: Active Organizations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Active Organizations</CardTitle>
              <Select value={orgsTime} onValueChange={setOrgsTime as any}>
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
                  <BarChart data={getAggregatedData(usageTrend, orgsTime)} barCategoryGap="30%" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                            const ids = [...new Set(data.activeOrgsList || [])];
                            
                            return (
                              <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-sm flex flex-col gap-2 z-50 min-w-[220px]">
                                <span className="font-medium text-foreground">{label}</span>
                                <div className="text-xs text-muted-foreground mb-1">Active Organizations: {data.activeOrgs}</div>
                                {ids.length === 0 ? <div className="text-xs text-muted-foreground italic">No organizations active</div> : null}
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                    {ids.slice(0, 10).map((id: any) => {
                                       const org = orgsBreakdown?.find((o: any) => o.orgId === id);
                                       if (!org) return null;
                                       return (
                                         <div key={id} className="flex flex-col space-y-1 mb-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center space-x-2">
                                                {org.logo ? (
                                                    <img src={org.logo} alt={org.name} className="h-5 w-5 rounded object-cover" />
                                                ) : (
                                                    <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                                        {org.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="truncate font-medium text-xs text-foreground">Org: {org.name}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-mono">Org ID: {org.orgId}</span>
                                         </div>
                                       );
                                    })}
                                    {ids.length > 10 && <div className="text-xs text-muted-foreground italic">+{ids.length - 10} more...</div>}
                                </div>
                              </div>
                            );
                        }
                        return null;
                    }} />
                    <Bar dataKey="activeOrgs" name="Active Organizations" fill="#2563eb" radius={[2, 2, 0, 0]} maxBarSize={12} />
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
          <ModelUsageSection orgs={orgs?.map((o: any) => ({ id: o.id, name: o.name }))} />

          <GrantCreditsModal 
            isOpen={isGlobalGrantCreditsOpen} 
            onClose={() => setIsGlobalGrantCreditsOpen(false)}
            isOrgMode={true}
            orgs={orgs?.map((org: any) => ({
              id: org.id,
              name: org.adminName || org.name,
              orgName: org.name,
              email: org.adminEmail || getFallbackAdminEmail(org.id) || "",
              role: org.id,
              avatar: org.logo || getFallbackOrgLogo(org.id) || (org.id === "classgrid" ? currentUser?.platformLogo || currentUser?.profilePicture : "")
            })) || []}
          />


        </div>
      </div>
    );
  };

  
  const getFilteredOrgs = () => {
    if (!orgs) return [];
    return orgs.filter((org: any) => {
      const name = org.name || org.orgName || "";
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = orgTypeFilter === "all" || org.type === orgTypeFilter;
      return matchesSearch && matchesType;
    });
  };

  const renderLevel0Orgs = () => {
    if (orgsLoading) return <Skeleton className="h-64 w-full" />;
    const filteredOrgs = getFilteredOrgs();
    if (!filteredOrgs || filteredOrgs.length === 0) return <div className="text-center py-12 text-muted-foreground">No organizations found using AI.</div>;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organizations ({filteredOrgs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredOrgs.map((org: any) => (
              <FolderIcon
                key={org.id}
                label={org.name}
                subtitle={`${formatNumber(org.totalUsage || 0)} Credits`}
                badge={org.isBlocked ? "BLOCKED" : 0}
                icon={Building}
                onClick={() => setPath({ orgId: org.id, orgName: org.name })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

    const renderLevel1Roles = () => {
    if (orgDetailLoading || orgUsersLoading) return <Skeleton className="h-64 w-full" />;

    const isOrgBlocked = orgDetail?.isBlocked;

    return (
      <div className="space-y-6">
        <AiUsageTrendsChart data={orgTrendStats?.usageTrend} />
        
        <AiUsageBar 
          showExactTokens={true}
          initialData={{
            type: 'pro',
            used: orgDetail?.poolUsed ?? 0,
            limit: orgDetail?.poolLimit ?? 0,
            remaining: Math.max(0, (orgDetail?.poolLimit ?? 0) - (orgDetail?.poolUsed ?? 0)),
            freeData: {
              used: orgDetail?.userWeeklyUsed ?? 0,
              limit: orgDetail?.userWeeklyLimit ?? 0,
              remaining: Math.max(0, (orgDetail?.userWeeklyLimit ?? 0) - (orgDetail?.userWeeklyUsed ?? 0))
            }
          }}
        />
        <TopAiUsersTable users={orgUsers?.flatMap((roleGroup: any) => roleGroup.users?.map((u: any) => ({ 
          ...u, 
          role: u.role || roleGroup.roleName,
          profilePicture: u.profilePicture || getFallbackPhoto(u.email) || (u.id === currentUser?._id ? (currentUser?.profilePicture || currentUser?.platformLogo) : null)
        }))) || []} />
        <SetupUsageCredits 
          orgId={path.orgId || ""} 
          orgName={path.orgName || ""} 
          currentPoolLimit={orgDetail?.poolLimit ?? 0} 
          currentUserWeeklyLimit={orgDetail?.userWeeklyLimit ?? 0}
          currentImageLimit={orgDetail?.imageLimit ?? 0}
          currentWhatsappLimit={orgDetail?.whatsappLimit ?? 0}
          customLimitsEnabled={orgDetail?.customLimitsEnabled ?? false}
        />

        <div className="border border-border rounded-xl shadow-sm bg-card">
          <div className="p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-semibold text-foreground tracking-tight">
                Grant Organization Credits
              </h3>
              <p className="text-sm text-muted-foreground">
                Open the AI Hub Panel to securely grant tokens to {path.orgName}.
              </p>
            </div>
          </div>
          <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end">
            <Button variant="outline" onClick={() => setIsOrgGrantCreditsOpen(true)}>
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Open Grant Credits Panel
            </Button>
          </div>
        </div>

        <ResetOrganizationDailyLimit orgId={path.orgId || ""} orgName={path.orgName || ""} />

        <EditOrganizationDailyLimit 
          orgId={path.orgId || ""} 
          orgName={path.orgName || ""} 
          currentPoolLimit={orgDetail?.poolLimit} 
          currentUserWeeklyLimit={orgDetail?.userWeeklyLimit} 
        />

        <BlockOrganizationAiUsage orgId={path.orgId || ""} orgName={path.orgName || ""} isBlocked={isOrgBlocked} />

        <GrantCreditsModal 
          isOpen={isOrgGrantCreditsOpen} 
          onClose={() => setIsOrgGrantCreditsOpen(false)}
          orgs={orgUsers?.flatMap((role: any) => role.users.map((u: any) => ({
            id: u.id,
            name: u.name,
            orgName: path.orgName || "",
            email: u.email,
            role: formatRoleLabel(u.role || role.roleName || "User"),
            avatar: u.profilePicture || getFallbackPhoto(u.email) || (u.id === currentUser?._id ? (currentUser?.profilePicture || currentUser?.platformLogo) : null)
          }))) || []}
        />

        {renderGlobalGrantedCredits()}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{path.orgName} — Usage Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {orgUsers?.map((roleGroup: any) => (
                <FolderIcon
                  key={roleGroup.roleName}
                  label={formatRoleLabel(roleGroup.roleName)}
                  subtitle={`${roleGroup.userCount} users • ${formatNumber(roleGroup.totalUsage || 0)} Credits`}
                  badge={roleGroup.userCount}
                  icon={Shield}
                  onClick={() => setPath({ ...path, role: roleGroup.roleName })}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderLevel2Users = () => {
    if (orgUsersLoading) return <Skeleton className="h-64 w-full" />;
    
    const roleGroup = orgUsers?.find((r: any) => r.roleName === path.role);
    const usersInRole = roleGroup ? roleGroup.users : [];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{formatRoleLabel(path.role)} Users ({usersInRole.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {usersInRole.map((user: any) => (
              <FolderIcon
                key={user.id}
                label={user.name || user.email}
                subtitle={`${formatNumber(user.totalUsage || 0)} Credits`}
                badge={user.isBlocked ? "BLOCKED" : 0}
                icon={UserIcon}
                onClick={() => setPath({ ...path, userId: user.id, userName: user.name || user.email })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLevel3UserDetail = () => {
    if (userDetailLoading) return <Skeleton className="h-96 w-full" />;
    return <AiUserDetailPanel userDetail={userDetail} />;
  };

  const renderGlobalGrantedCredits = () => {
    if (loadingGrantedCredits) return <Skeleton className="h-64 w-full" />;
    if (!globalGrantedCredits || globalGrantedCredits.length === 0) return null;
    const orgCredits = globalGrantedCredits.filter((c: any) => c.orgId === path.orgId);
    if (orgCredits.length === 0) return null;
    
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg text-purple-500">Active Granted Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={[
              {
                key: "user",
                header: "User",
                width: "w-[30%]",
                render: (_: any, row: any) => (
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPath({ orgId: row.orgId, orgName: "Org", role: "all", userId: row.id, userName: row.name })}>
                    <img src={getFallbackPhoto(row.email) || row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`} alt={row.name} className="w-8 h-8 rounded-full" />
                    <div className="flex flex-col">
                      <span className="font-medium hover:underline text-primary">{row.name}</span>
                      <span className="text-xs text-muted-foreground">{row.email}</span>
                    </div>
                  </div>
                )
              },
              {
                key: "credits",
                header: "Credits",
                width: "w-[30%]",
                render: (_: any, row: any) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{formatNumber(row.used)} / {formatNumber(row.granted)}</span>
                    <span className="text-xs text-muted-foreground">{Math.round((row.used / row.granted) * 100)}% Used</span>
                  </div>
                )
              },
              {
                key: "status",
                header: "Status",
                width: "w-[20%]",
                render: (_: any, row: any) => {
                  const isExpired = row.expirationDate && new Date(row.expirationDate).getTime() < Date.now();                  const isRevoked = row.isRevoked;

                  let statusLabel = "ACTIVE";
                  let statusClass = "bg-green-500/10 text-green-500";

                  if (isRevoked) {
                    statusLabel = "REVOKED";
                    statusClass = "bg-red-500/10 text-red-500";
                  } else if (row.isPaused) {
                    statusLabel = "PAUSED";
                    statusClass = "bg-amber-500/10 text-amber-500";
                  } else if (isExpired) {
                    statusLabel = "EXPIRED";
                    statusClass = "bg-red-500/10 text-red-500";
                  }

                  return (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                      {statusLabel}
                    </span>
                  );
                }
              },
              {
                key: "dates",
                header: "Dates",
                width: "w-[20%]",
                render: (_: any, row: any) => (
                  <div className="flex flex-col text-xs text-muted-foreground">
                    <span>Starts: {row.startDate ? new Date(row.startDate).toLocaleDateString() : "N/A"}</span>
                    <span>Expires: {row.expirationDate ? new Date(row.expirationDate).toLocaleDateString() : "N/A"}</span>
                  </div>
                )
              }
            ]}
            rows={orgCredits}
            emptyMessage="No active granted credits."
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PageBreadcrumbs
        items={[
          { label: "AI Usage & Credits", onClick: () => handleNavigateUp("root") },
          ...(path.orgName ? [{ label: path.orgName, onClick: () => handleNavigateUp("org") }] : []),
          ...(path.role ? [{ label: formatRoleLabel(path.role), onClick: () => handleNavigateUp("role") }] : []),
          ...(path.userName ? [{ label: path.userName }] : [])
        ]}
      />

      <div className="flex justify-end">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-medium ${live ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "border-border text-muted-foreground"}`}>
          <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
          {live ? "Live" : "Connecting…"}
        </span>
      </div>

      {!path.orgId && renderGlobalStats()}

      {!path.orgId && renderLevel0Orgs()}

      {path.orgId && !path.role && renderLevel1Roles()}
      {path.orgId && path.role && !path.userId && renderLevel2Users()}
      {path.userId && renderLevel3UserDetail()}

      {/* Organization Level Action Dialogs */}
      <DangerConfirmDialog
        open={showOrgReset}
        onOpenChange={setShowOrgReset}
        title="Reset Organization Limit?"
        description="This will reset the total usage counter for this organization back to 0."
        onConfirm={() => {
            resetOrgMutation.mutate(path.orgId || "");
            setShowOrgReset(false);
        }}
        confirmText="Reset Limit"
      />
      <DangerConfirmDialog
        open={showOrgBlock}
        onOpenChange={setShowOrgBlock}
        title={orgDetail?.isBlocked ? "Unblock Organization?" : "Block Organization?"}
        description={orgDetail?.isBlocked ? "Unblocking will allow all users in this org to use AI again." : "Blocking will immediately prevent all users in this org from using AI features."}
        onConfirm={() => {
            blockOrgMutation.mutate({ orgId: path.orgId || "", blocked: !orgDetail?.isBlocked });
            setShowOrgBlock(false);
        }}
        confirmText={orgDetail?.isBlocked ? "Unblock" : "Block"}
      />
    </div>
  );
}
