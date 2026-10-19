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
import { useQuery } from "@tanstack/react-query";
import { Users, MessageSquare, PlusCircle, UserPlus, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { StatCard } from "@/components/marketing_ui/StatCard";
import { SectionPanel } from "@/components/marketing_ui/SectionPanel";
import { Spinner } from "@/components/marketing_ui/spinner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

function fetchChatAnalytics() {
  return apiClient.get('/api/group-chat/analytics').then(res => res.data);
}

export function ChatAnalyticsPage() {
  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ["chat-analytics"],
    queryFn: fetchChatAnalytics,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Failed to load analytics.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">Chat Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights into community engagement and messaging activity.
          </p>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Daily Active Users" 
          value={analytics.dailyActiveUsers.toString()} 
          icon={<Users className="w-4 h-4 text-emerald-500" />} 
        />
        <StatCard 
          title="Total Messages Today" 
          value={analytics.totalMessagesToday.toString()} 
          icon={<MessageSquare className="w-4 h-4 text-blue-500" />} 
        />
        <StatCard 
          title="New Groups Created" 
          value={analytics.newGroupsToday.toString()} 
          icon={<PlusCircle className="w-4 h-4 text-purple-500" />} 
        />
        <StatCard 
          title="Pending Join Requests" 
          value={analytics.pendingJoinRequests.toString()} 
          icon={<UserPlus className="w-4 h-4 text-orange-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Chart */}
        <SectionPanel title="Message Volume (Last 7 Days)">
          <div className="h-[300px] w-full mt-4">
            {analytics.messageTrend && analytics.messageTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.messageTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Not enough data</div>
            )}
          </div>
        </SectionPanel>

        {/* Most Active Groups */}
        <SectionPanel title="Most Active Groups">
          <div className="flex flex-col gap-3 mt-4">
            {analytics.topGroups && analytics.topGroups.length > 0 ? (
              analytics.topGroups.map((group: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      #{idx + 1}
                    </div>
                    <span className="font-medium text-sm line-clamp-1">{group.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium bg-background px-2 py-1 rounded-md border border-border shrink-0">
                    <MessageSquare className="w-3 h-3 text-muted-foreground" />
                    {group.messageCount} msgs
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-center py-8">No active groups found.</div>
            )}
          </div>
        </SectionPanel>
      </div>

    </div>
  );
}
