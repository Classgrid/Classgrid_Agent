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
import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Button } from "@/components/marketing_ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { MODEL_GROUPS } from "@/components/ai/components/ModelPicker";
import { useAiModelBreakdown, type ModelUsageTotals } from "@/features/superadmin/queries/useAiUsage";
import { cn } from "@/lib/utils";

type Metric = "requests" | "tokens" | "costUSD";
type Preset = "today" | "7d" | "30d" | "month" | "custom";

const PALETTE = [
  "#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#a855f7",
  "#14b8a6", "#eab308", "#6366f1", "#f43f5e", "#22c55e", "#0ea5e9", "#d946ef", "#64748b", "#78716c", "#facc15",
];
const OTHER_COLOR = "#94a3b8";
const TIMELINE_TOP_MODELS = 6;

const MODEL_NAMES: Record<string, string> = Object.fromEntries(
  MODEL_GROUPS.flatMap((g) => g.models.map((m) => [m.id, m.name])),
);
const modelName = (id: string) => MODEL_NAMES[id] || id.split("/").pop() || id;

const METRIC_LABELS: Record<Metric, string> = { requests: "Requests", tokens: "Tokens", costUSD: "Cost ($)" };

const formatMetric = (metric: Metric, v: number) =>
  metric === "costUSD"
    ? `$${v < 0.01 && v > 0 ? v.toFixed(4) : v.toFixed(2)}`
    : new Intl.NumberFormat("en-IN").format(Math.round(v));

function presetRange(preset: Exclude<Preset, "custom">) {
  const now = new Date();
  const start = new Date(now);
  if (preset === "today") start.setHours(0, 0, 0, 0);
  else if (preset === "7d") start.setDate(now.getDate() - 7);
  else if (preset === "30d") start.setDate(now.getDate() - 30);
  else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return { from: start.toISOString(), to: now.toISOString() };
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

function ChartTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => p.value > 0);
  return (
    <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-sm flex flex-col gap-1 z-50 max-w-[260px]">
      {label && <span className="font-semibold text-foreground mb-1">{label}</span>}
      {rows.map((p: any, i: number) => (
        <span key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.payload?.color || p.color || p.fill }} />
          <span className="truncate text-muted-foreground">{p.payload?.label && !label ? p.payload.label : p.name}</span>
          <span className="ml-auto font-medium text-foreground">{formatMetric(metric, p.value)}</span>
        </span>
      ))}
    </div>
  );
}

export function ModelUsageSection({ orgs }: { orgs?: { id: string; name: string }[] }) {
  const [preset, setPreset] = useState<Preset>("7d");
  const [range, setRange] = useState(() => presetRange("7d"));
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [orgId, setOrgId] = useState("all");
  const [metric, setMetric] = useState<Metric>("requests");

  const { data, isLoading, isError } = useAiModelBreakdown({ ...range, orgId: orgId === "all" ? undefined : orgId });

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  };

  const applyCustom = (from: Date | undefined, to: Date | undefined) => {
    if (from && to && from <= to) setRange({ from: from.toISOString(), to: to.toISOString() });
  };

  const ranked = useMemo(() => {
    const rows = (data?.models || []).map((m) => ({ ...m, label: modelName(m.model), value: m[metric] }));
    rows.sort((a, b) => b.value - a.value);
    return rows.map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] }));
  }, [data, metric]);

  const total = ranked.reduce((n, r) => n + r.value, 0);
  const colorOf = useMemo(() => Object.fromEntries(ranked.map((r) => [r.model, r.color])), [ranked]);

  const timelineModels = ranked.slice(0, TIMELINE_TOP_MODELS).map((r) => r.model);
  const hasOther = ranked.length > TIMELINE_TOP_MODELS;
  const timelineData = useMemo(() => {
    const top = new Set(timelineModels);
    return (data?.timeline || []).map((b) => {
      const row: Record<string, any> = {
        label: data?.bucket === "hour"
          ? b.bucket.slice(11)
          : new Date(`${b.bucket}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
      let other = 0;
      for (const [model, t] of Object.entries(b.models) as [string, ModelUsageTotals][]) {
        if (top.has(model)) row[model] = t[metric];
        else other += t[metric];
      }
      if (hasOther) row.__other = other;
      return row;
    });
  }, [data, metric, timelineModels.join("|"), hasOther]);

  const failedTotal = (data?.models || []).reduce((n, m) => n + m.failed, 0);
  const requestsTotal = (data?.models || []).reduce((n, m) => n + m.requests, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between space-y-0">
          <div>
            <CardTitle>Model Usage</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {requestsTotal.toLocaleString("en-IN")} requests
              {failedTotal > 0 && <span className="text-rose-500"> · {failedTotal.toLocaleString("en-IN")} failed</span>}
              {" · "}{ranked.length} models
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choosePreset(p.id)}
                  className={cn(
                    "px-3 h-8 text-xs font-medium rounded-md transition-colors cursor-pointer",
                    preset === p.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Select value={orgId} onValueChange={(v) => setOrgId(v || "all")}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All organizations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                <SelectItem value="classgrid">Classgrid (no org)</SelectItem>
                {(orgs || []).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={metric} onValueChange={(v) => v && setMetric(v as Metric)}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => <SelectItem key={m} value={m}>{METRIC_LABELS[m]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        {preset === "custom" && (
          <CardContent className="pt-0 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">From</span>
            <NikhilTimeCalendar
              value={customFrom}
              onChange={(d) => { setCustomFrom(d); applyCustom(d, customTo); }}
              placeholder="Start date & time"
              className="w-[220px] h-9 border border-input bg-background"
            />
            <span className="text-sm text-muted-foreground">To</span>
            <NikhilTimeCalendar
              value={customTo}
              onChange={(d) => { setCustomTo(d); applyCustom(customFrom, d); }}
              placeholder="End date & time"
              className="w-[220px] h-9 border border-input bg-background"
            />
            {customFrom && customTo && customFrom > customTo && (
              <span className="text-sm text-rose-500">Start must be before end</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setCustomFrom(undefined); setCustomTo(undefined); choosePreset("7d"); }}>
              Reset
            </Button>
          </CardContent>
        )}
      </Card>

      {isLoading ? (
        <Skeleton className="h-[420px] w-full" />
      ) : isError ? (
        <Card><CardContent className="py-10 text-center text-sm text-rose-500">Could not load model usage. Try a smaller date range.</CardContent></Card>
      ) : ranked.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No AI usage in this time range.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Share by Model</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                <div className="relative h-[220px] w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ranked} dataKey="value" nameKey="label" innerRadius={70} outerRadius={104} paddingAngle={ranked.length > 1 ? 2 : 0} stroke="none">
                        {ranked.map((r) => <Cell key={r.model} fill={r.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip metric={metric} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-semibold text-foreground">{formatMetric(metric, total)}</span>
                    <span className="text-xs text-muted-foreground">{METRIC_LABELS[metric]}</span>
                  </div>
                </div>
                <ul className="grid w-full gap-x-8 gap-y-2 sm:grid-cols-2 min-w-0">
                  {ranked.map((r) => (
                    <li key={r.model} className="flex items-center gap-2 text-sm min-w-0" title={r.model}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="truncate text-foreground">{r.label}</span>
                      <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{formatMetric(metric, r.value)}</span>
                      <span className="w-12 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
                        {total > 0 ? `${((r.value / total) * 100).toFixed(r.value / total < 0.01 ? 1 : 0)}%` : "0%"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Most Used Models</CardTitle></CardHeader>
              <CardContent>
                <div style={{ height: Math.max(200, ranked.length * 34) }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ranked} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="25%">
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" className="opacity-60" tickLine={false} axisLine={false} tickFormatter={(v) => formatMetric(metric, v)} />
                      <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} stroke="currentColor" className="opacity-60" tickLine={false} axisLine={false} interval={0} />
                      <Tooltip cursor={{ fill: "currentColor", opacity: 0.05 }} content={<ChartTooltip metric={metric} />} />
                      <Bar dataKey="value" name={METRIC_LABELS[metric]} radius={[0, 4, 4, 0]}>
                        {ranked.map((r) => <Cell key={r.model} fill={r.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Models Over Time</CardTitle>
              <p className="text-sm text-muted-foreground">
                {data?.bucket === "hour" ? "Per hour" : "Per day"} · top {Math.min(TIMELINE_TOP_MODELS, ranked.length)} models{hasOther ? ", the rest grouped as Other" : ""}
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} barCategoryGap="20%" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="opacity-60" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="opacity-60" tickLine={false} axisLine={false} tickFormatter={(v) => formatMetric(metric, v)} width={60} />
                    <Tooltip cursor={{ fill: "currentColor", opacity: 0.05 }} content={<ChartTooltip metric={metric} />} />
                    {timelineModels.map((m) => (
                      <Bar key={m} dataKey={m} name={modelName(m)} stackId="models" fill={colorOf[m]} />
                    ))}
                    {hasOther && <Bar dataKey="__other" name="Other" stackId="models" fill={OTHER_COLOR} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {timelineModels.map((m) => (
                  <span key={m} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorOf[m] }} />{modelName(m)}
                  </span>
                ))}
                {hasOther && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: OTHER_COLOR }} />Other
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
