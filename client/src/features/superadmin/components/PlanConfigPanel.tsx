// The plans table (Free, Pro, Max, Enterprise): every limit and price of every plan, editable here, plus the
// switch that turns plans on. Nothing about plans is fixed in code (owner, 2026-11-14).
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/apiClient";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Switch } from "@/components/marketing_ui/switch";
import { Label } from "@/components/marketing_ui/label";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";

type Plan = Record<string, any> & { key: string; name: string };
type FieldType = "number" | "text" | "bool" | "list" | "period" | "unit";
type Field = { key: string; label: string; type: FieldType; hint?: string; unitKey?: string };
type Group = { title: string; fields: Field[] };

const UNITS = ["second", "minute", "hour", "day", "week", "month"];

// -1 = unlimited, 0 = not included (the hint shows it next to the group title)
const GROUPS: Group[] = [
  { title: "Plan", fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "tagline", label: "Tagline", type: "text" },
    { key: "is_public", label: "Shown on the pricing page", type: "bool" },
    { key: "coming_soon", label: "Coming soon", type: "bool" },
    { key: "sort", label: "Order", type: "number" },
  ] },
  { title: "Prices (₹, GST included; -1 = contact us)", fields: [
    { key: "price_inr_monthly", label: "Monthly", type: "number" },
    { key: "price_inr_yearly", label: "Yearly", type: "number" },
    { key: "student_price_inr_monthly", label: "Student monthly", type: "number" },
    { key: "student_price_inr_yearly", label: "Student yearly", type: "number" },
  ] },
  { title: "AI credits", fields: [
    { key: "tokens_per_window", label: "Credits per window", type: "number" },
    { key: "window_reset_value", label: "Window", type: "period", unitKey: "window_reset_unit" },
    { key: "tokens_per_week", label: "Credits per week (ceiling)", type: "number" },
    { key: "everyday_messages_per_window", label: "Everyday chat messages per window", type: "number" },
    { key: "everyday_messages_per_week", label: "Everyday chat messages per week", type: "number" },
    { key: "claude_credits_per_week", label: "Claude credits per week", type: "number" },
    { key: "fable_share_percent", label: "Fable share of Claude credits (%)", type: "number" },
  ] },
  { title: "Models and thinking", fields: [
    { key: "models_allowed", label: "Models allowed (one per line)", type: "list" },
    { key: "default_model", label: "Default model", type: "text" },
    { key: "thinking_modes", label: "Thinking modes (fast, normal, deep)", type: "list" },
    { key: "context_tokens", label: "Context (tokens)", type: "number" },
    { key: "helpers_per_chat", label: "Helpers per chat", type: "number" },
  ] },
  { title: "Images and voice", fields: [
    { key: "images_per_period", label: "Images per period", type: "number" },
    { key: "images_reset_value", label: "Images period", type: "period", unitKey: "images_reset_unit" },
    { key: "voice_replies_per_day", label: "Voice replies per day", type: "number" },
    { key: "voice_input_minutes_per_day", label: "Voice input minutes per day", type: "number" },
  ] },
  { title: "WhatsApp calls", fields: [
    { key: "call_minutes_per_period", label: "Free call minutes per period", type: "number" },
    { key: "call_reset_value", label: "Call minutes period", type: "period", unitKey: "call_reset_unit" },
    { key: "calls_per_day", label: "Calls per day", type: "number" },
    { key: "call_max_minutes", label: "Longest call (minutes)", type: "number" },
  ] },
  { title: "WhatsApp scheduled messages", fields: [
    { key: "whatsapp_per_day", label: "Per day", type: "number" },
    { key: "whatsapp_per_period", label: "Per period", type: "number" },
    { key: "whatsapp_reset_value", label: "Period", type: "period", unitKey: "whatsapp_reset_unit" },
  ] },
  { title: "Projects and coding", fields: [
    { key: "projects_max", label: "Projects", type: "number" },
    { key: "coding_runs_per_month", label: "Coding agent runs per month", type: "number" },
    { key: "premium_runs_per_month", label: "Premium (Sonnet) runs per month", type: "number" },
    { key: "sandbox_hours_per_month", label: "Cloud sandbox hours per month", type: "number" },
    { key: "sandbox_sessions", label: "Sandbox sessions at once", type: "number" },
  ] },
  { title: "Files and devices", fields: [
    { key: "uploads_per_window", label: "Uploads per window", type: "number" },
    { key: "upload_max_mb", label: "Largest upload (MB)", type: "number" },
    { key: "library_storage_mb", label: "Library storage (MB)", type: "number" },
    { key: "devices_max", label: "Signed-in devices", type: "number" },
  ] },
  { title: "Service", fields: [
    { key: "priority", label: "Priority at peak", type: "bool" },
    { key: "support_level", label: "Support", type: "text" },
    { key: "features_text", label: "Pricing page lines (one per line)", type: "list" },
  ] },
];

const EDITABLE_KEYS = GROUPS.flatMap((g) => g.fields.flatMap((f) => (f.unitKey ? [f.key, f.unitKey] : [f.key])));

const pick = (plan: Plan) => {
  const out: Record<string, any> = {};
  for (const k of EDITABLE_KEYS) out[k] = plan[k];
  return out;
};

export function PlanConfigPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["aiPlans"],
    queryFn: async () => (await api.get("/api/super-admin/ai-plans")).data as { enabled: boolean; plans: Plan[] },
  });
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data?.plans) return;
    const next: Record<string, Record<string, any>> = {};
    for (const p of data.plans) next[p.key] = pick(p);
    setDrafts(next);
    setDirty({});
  }, [data]);

  const plans = useMemo(() => (data?.plans || []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)), [data]);

  const savePlan = useMutation({
    mutationFn: async (key: string) => (await api.put(`/api/super-admin/ai-plans/${key}`, drafts[key])).data,
    onSuccess: (_d, key) => { toast.success(`${drafts[key]?.name || key} plan saved`); queryClient.invalidateQueries({ queryKey: ["aiPlans"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Could not save the plan"),
  });
  const setEnabled = useMutation({
    mutationFn: async (enabled: boolean) => (await api.put("/api/super-admin/ai-plans-enabled", { enabled })).data,
    onSuccess: (d) => { toast.success(d?.enabled ? "Plans are on" : "Plans are off"); queryClient.invalidateQueries({ queryKey: ["aiPlans"] }); },
    onError: () => toast.error("Could not change the switch"),
  });

  const set = (key: string, field: string, value: any) => {
    setDrafts((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));
    setDirty((x) => ({ ...x, [key]: true }));
  };

  if (isLoading) return <Skeleton className="w-full h-64 mb-6" />;
  if (!data) return null;

  const cell = (plan: Plan, f: Field) => {
    const d = drafts[plan.key] || {};
    const v = d[f.key];
    const busy = savePlan.isPending;
    if (f.type === "number") return <Input type="number" min={-1} value={v ?? 0} onChange={(e) => set(plan.key, f.key, Number(e.target.value))} disabled={busy} className="h-8 text-sm" />;
    if (f.type === "text") return <Input value={v ?? ""} onChange={(e) => set(plan.key, f.key, e.target.value)} disabled={busy} className="h-8 text-sm" />;
    if (f.type === "bool") return <Switch checked={v === true} onCheckedChange={(c) => set(plan.key, f.key, c)} disabled={busy} />;
    if (f.type === "list") return (
      <textarea value={(Array.isArray(v) ? v : []).join("\n")} onChange={(e) => set(plan.key, f.key, e.target.value.split("\n"))} disabled={busy} rows={4}
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs font-mono" />
    );
    if (f.type === "period") return (
      <div className="flex items-center gap-1">
        <Input type="number" min={1} value={v ?? 1} onChange={(e) => set(plan.key, f.key, Number(e.target.value))} disabled={busy} className="h-8 w-20 text-sm" />
        <select value={d[f.unitKey!] ?? "hour"} onChange={(e) => set(plan.key, f.unitKey!, e.target.value)} disabled={busy}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm">
          {UNITS.map((u) => <option key={u} value={u}>{u}{(v ?? 1) === 1 ? "" : "s"}</option>)}
        </select>
      </div>
    );
    return null;
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-6">
      <div className="p-5 border-b border-border flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Plans</h2>
          <p className="text-sm text-muted-foreground">Free, Pro, Max and Enterprise: every limit and price, editable any time. -1 means unlimited, 0 means not included. With the switch off, the global limits above apply to everyone.</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="plans-enabled" className="text-sm font-medium">{data.enabled ? "Plans are on" : "Plans are off"}</Label>
          <Switch id="plans-enabled" checked={data.enabled} onCheckedChange={(c) => setEnabled.mutate(c)} disabled={setEnabled.isPending} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left p-3 w-56 font-medium text-muted-foreground">Limit</th>
              {plans.map((p) => (
                <th key={p.key} className="text-left p-3 min-w-[220px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{drafts[p.key]?.name || p.name}</span>
                    <Button size="sm" variant={dirty[p.key] ? "default" : "outline"} disabled={!dirty[p.key] || savePlan.isPending} onClick={() => savePlan.mutate(p.key)}>
                      {savePlan.isPending && savePlan.variables === p.key && <Spinner className="w-3 h-3 mr-1" />}
                      Save
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <React.Fragment key={g.title}>
                <tr><td colSpan={plans.length + 1} className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</td></tr>
                {g.fields.map((f) => (
                  <tr key={f.key} className="border-t border-border/60 align-top">
                    <td className="p-3 text-foreground">{f.label}</td>
                    {plans.map((p) => <td key={p.key} className="p-2">{cell(p, f)}</td>)}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
