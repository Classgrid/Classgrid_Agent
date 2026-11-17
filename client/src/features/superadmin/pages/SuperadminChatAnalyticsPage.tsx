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
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socketClient";
import { UserPlus, MessageSquare, Activity, Users, Clock, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LabelList,
} from "recharts";
import { apiClient } from "@/lib/apiClient";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { DataTable } from "@/components/marketing_ui/data-table";

// Chat Analytics (super admin only): chat.classgrid.in sign-ups, messages, groups and join requests.
// Data: GET /api/group-chat/analytics (cached 60 s on the server). Colours are the validated categorical
// palette (dataviz skill, checked light + dark for colour-blind separation); every chart has labels/legend.

type Analytics = {
  generatedAt: string;
  users: { total: number; lastHour: number; today: number; week: number };
  messages: { lastHour: number; today: number; week: number };
  activeUsersToday: number | null;
  groups: { today: number; week: number; total: number; byType: { type: string; count: number }[] };
  pendingJoinRequests: number;
  daily: { day: string; messages: number | null; newUsers: number }[];
  topGroups: { groupId: string; name: string; messages: number }[] | null;
  recentUsers?: { id: string; name: string; email: string; createdAt: string; photo: string | null }[];
  needsMigration: boolean;
  cached?: boolean;
};

const PALETTE = {
  light: { series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"], grid: "#e7e6e2", axis: "#52514e", other: "#a3a29d" },
  dark: { series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"], grid: "#2f2f2d", axis: "#c3c2b7", other: "#6d6c67" },
};

const TYPE_LABELS: Record<string, string> = {
  general: "General", class: "Class", department: "Department", subject: "Subject", team_staff: "Team / Staff", official_announcement: "Official",
};
// Fixed order so a group type always keeps its colour, whatever the counts
const TYPE_ORDER = ["general", "class", "department", "subject", "team_staff", "official_announcement"];

function useIsDark() {
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains("dark")));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-IN"));
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });

function StatTile({ icon: Icon, label, value, rows }: { icon: any; label: string; value: string; rows?: { k: string; v: string }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
      {rows && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          {rows.map((r) => <span key={r.k}><span className="font-medium text-foreground tabular-nums">{r.v}</span> {r.k}</span>)}
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit, labelFormat }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-[13px] shadow-lg">
      {label !== undefined && <div className="mb-1 font-medium text-foreground">{labelFormat ? labelFormat(label) : label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
          <span className="font-medium text-foreground tabular-nums">{fmt(p.value)}</span> {unit || p.name}
        </div>
      ))}
    </div>
  );
}

export function SuperadminChatAnalyticsPage() {
  const dark = useIsDark();
  const c = dark ? PALETTE.dark : PALETTE.light;
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  // First load over HTTP; after that the server pushes fresh numbers over the socket every 20 s
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["chat-analytics"],
    queryFn: async () => (await apiClient.get("/api/group-chat/analytics")).data as Analytics,
    staleTime: 60 * 1000,
    refetchInterval: live ? false : 60 * 1000, // fallback only while the live connection is down
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const join = () => socket.emit("join_superadmin_analytics");
    const onUpdate = (next: Analytics) => { queryClient.setQueryData(["chat-analytics"], next); setLive(true); };
    const onDown = () => setLive(false);
    socket.on("chat_analytics:update", onUpdate);
    socket.on("chat_analytics:error", onDown);
    socket.on("disconnect", onDown);
    socket.on("connect", join); // re-join after a reconnect
    if (socket.connected) join();
    return () => {
      socket.emit("leave_superadmin_analytics");
      socket.off("chat_analytics:update", onUpdate);
      socket.off("chat_analytics:error", onDown);
      socket.off("disconnect", onDown);
      socket.off("connect", join);
    };
  }, [queryClient]);

  if (isError) {
    const status = (error as any)?.response?.status;
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="font-medium text-foreground">{status === 403 ? "Only Classgrid super admins can see chat analytics." : "Couldn't load chat analytics."}</p>
        {status !== 403 && <button onClick={() => refetch()} className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">Retry</button>}
      </div>
    );
  }

  const daily = (data?.daily || []).map((d) => ({ ...d, label: dayLabel(d.day) }));
  const byType = [...(data?.groups.byType || [])].sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a.type), ib = TYPE_ORDER.indexOf(b.type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const typeColor = (type: string) => { const i = TYPE_ORDER.indexOf(type); return i >= 0 ? c.series[i] : c.other; };
  const topGroups = data?.topGroups || [];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          chat.classgrid.in activity{data ? ` · updated ${new Date(data.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </p>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-medium ${live ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "border-border text-muted-foreground"}`}>
          <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
          {live ? "Live" : "Connecting…"}
        </span>
      </div>

      {data?.needsMigration && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Messages per day, most active groups and active users need the database helpers. Run <code className="rounded bg-muted px-1">server/migrations/008_chat_analytics.sql</code> in the Supabase SQL editor (chat project).</span>
        </div>
      )}

      {/* Stat tiles */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile icon={UserPlus} label="New users" value={fmt(data.users.today)} rows={[{ k: "last hour", v: fmt(data.users.lastHour) }, { k: "this week", v: fmt(data.users.week) }, { k: "total", v: fmt(data.users.total) }]} />
          <StatTile icon={MessageSquare} label="Messages today" value={fmt(data.messages.today)} rows={[{ k: "last hour", v: fmt(data.messages.lastHour) }, { k: "this week", v: fmt(data.messages.week) }]} />
          <StatTile icon={Activity} label="Active users today" value={fmt(data.activeUsersToday)} rows={[{ k: "sent a message", v: "" }]} />
          <StatTile icon={Users} label="New groups today" value={fmt(data.groups.today)} rows={[{ k: "this week", v: fmt(data.groups.week) }, { k: "total", v: fmt(data.groups.total) }]} />
          <StatTile icon={Clock} label="Pending join requests" value={fmt(data.pendingJoinRequests)} />
        </div>
      )}

      {/* Change over time: one measure per chart (no dual axis) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Messages per day" subtitle="Last 7 days">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="msgFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.series[0]} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={c.series[0]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip unit="messages" />} cursor={{ stroke: c.axis, strokeDasharray: "3 3" }} />
                  <Area isAnimationActive={false} type="monotone" dataKey="messages" name="Messages" stroke={c.series[0]} strokeWidth={2} fill="url(#msgFill)" dot={{ r: 4, fill: c.series[0], strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="New sign-ups per day" subtitle="chat.classgrid.in, last 7 days">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 20, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip unit="new users" />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                  <Bar isAnimationActive={false} dataKey="newUsers" name="New users" fill={c.series[1]} radius={[4, 4, 0, 0]} maxBarSize={36}>
                    <LabelList dataKey="newUsers" position="top" style={{ fill: c.axis, fontSize: 12 }} formatter={(v: number) => (v ? v : "")} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Composition + ranking */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
        <ChartCard title="Groups by type" subtitle={data ? `${fmt(data.groups.total)} groups` : undefined}>
          {isLoading ? <Skeleton className="h-64 w-full" /> : byType.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No groups yet.</p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie isAnimationActive={false} data={byType} dataKey="count" nameKey="type" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                      {byType.map((t) => <Cell key={t.type} fill={typeColor(t.type)} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }: any) => active && payload?.length ? (
                      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-[13px] shadow-lg">
                        <span className="font-medium text-foreground">{TYPE_LABELS[payload[0].payload.type] || payload[0].payload.type}</span>: {fmt(payload[0].value)}
                      </div>
                    ) : null} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend with values: identity is never colour alone */}
              <ul className="w-full space-y-2 text-[13px]">
                {byType.map((t) => (
                  <li key={t.type} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: typeColor(t.type) }} />{TYPE_LABELS[t.type] || t.type}</span>
                    <span className="font-medium text-foreground tabular-nums">{fmt(t.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>
        </div>

        <div className="lg:col-span-3">
          <ChartCard title="Most active groups" subtitle="By messages, last 7 days">
            {isLoading ? <Skeleton className="h-64 w-full" /> : !data?.topGroups ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Needs the database helpers (see the notice above).</p>
            ) : topGroups.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No group messages this week.</p>
            ) : (
              <div style={{ height: Math.max(160, topGroups.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topGroups} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid stroke={c.grid} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fill: c.axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + "…" : v)} />
                    <Tooltip content={<ChartTooltip unit="messages" />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                    <Bar isAnimationActive={false} dataKey="messages" name="Messages" fill={c.series[0]} radius={[0, 4, 4, 0]} maxBarSize={24}>
                      <LabelList dataKey="messages" position="right" style={{ fill: c.axis, fontSize: 12 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Newest chat.classgrid.in accounts */}
      <ChartCard title="Recent sign-ups" subtitle="Newest accounts on chat.classgrid.in">
        <div className={`overflow-x-auto ${data?.recentUsers?.length ? "rounded-md border" : ""}`}>
          <DataTable
            className={data?.recentUsers?.length ? "min-w-[640px] rounded-none border-0" : ""}
            isLoading={isLoading}
            skeletonLines={5}
            emptyMessage="No sign-ups yet."
            rows={data?.recentUsers || []}
            columns={[
              {
                key: "name", header: "Name", width: "w-[34%]",
                render: (v: string, row: any) => (
                  <div className="flex min-w-0 items-center gap-2.5">
                    {row.photo
                      ? <img src={row.photo} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                      : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-semibold uppercase text-foreground">{(v || row.email || "?").charAt(0)}</span>}
                    <span className="truncate text-[13px] font-medium text-foreground">{v || "—"}</span>
                  </div>
                ),
              },
              { key: "email", header: "Email", width: "w-[38%]", render: (v: string) => <span className="block truncate text-[13px] text-muted-foreground" title={v}>{v || "—"}</span> },
              {
                key: "createdAt", header: "Joined", width: "w-[28%]",
                render: (v: string) => {
                  const d = new Date(v);
                  return (
                    <div className="leading-tight">
                      <div className="text-[13px] font-medium text-foreground">{d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                      <div className="text-[12px] text-muted-foreground">{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  );
                },
              },
            ]}
          />
        </div>
      </ChartCard>

      {/* Table view of the daily numbers */}
      {data && (
        <details className="rounded-xl border border-border bg-card p-5 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">View daily numbers as a table</summary>
          <table className="mt-4 w-full text-left">
            <thead className="text-muted-foreground"><tr><th className="py-1.5 font-medium">Day</th><th className="py-1.5 font-medium">Messages</th><th className="py-1.5 font-medium">New users</th></tr></thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.day} className="border-t border-border"><td className="py-1.5">{d.label}</td><td className="py-1.5 tabular-nums">{fmt(d.messages)}</td><td className="py-1.5 tabular-nums">{fmt(d.newUsers)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
