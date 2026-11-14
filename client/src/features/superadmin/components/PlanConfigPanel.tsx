// The plans (Free, Pro, Max, Enterprise), one page per plan (owner, 2026-11-14): pick a plan at the top, then its
// prices and every limit in titled sections, each field with its unit and a hint. Nothing about plans is fixed in
// code: every number here is what the chat enforces and what the pricing page shows. -1 = unlimited, 0 = not included.
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Globe, Clock } from "lucide-react";
import { apiClient as api } from "@/lib/apiClient";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Switch } from "@/components/marketing_ui/switch";
import { Label } from "@/components/marketing_ui/label";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";

type Plan = Record<string, any> & { key: string; name: string };
type FieldType = "number" | "text" | "bool" | "list" | "period" | "modes";
type Field = { key: string; label: string; type: FieldType; hint?: string; unitKey?: string; unit?: string; wide?: boolean };
type Section = { title: string; note?: string; fields: Field[] };

const UNITS = ["second", "minute", "hour", "day", "week", "month"];
const THINKING = ["fast", "normal", "deep"];
const inr = (n: any) => (Number(n) < 0 ? "Contact us" : Number(n) === 0 ? "Free" : `₹${Math.round(Number(n)).toLocaleString("en-IN")}`);

const SECTIONS: Section[] = [
  { title: "Cloudflare models", note: "DeepSeek, GLM, Gemma, Llama, GPT-OSS, Mistral and Auto share these credits. Claude is counted separately below.", fields: [
    { key: "tokens_per_window", label: "Credits per window", type: "number", hint: "-1 unlimited" },
    { key: "window_reset_value", label: "Window length", type: "period", unitKey: "window_reset_unit" },
    { key: "tokens_per_week", label: "Credits per week (ceiling)", type: "number", hint: "-1 unlimited" },
    { key: "context_tokens", label: "Memory of a chat", type: "number", unit: "tokens" },
  ] },
  { title: "Claude models", note: "Haiku, Sonnet, Opus and Fable. Their own weekly credits; 0 = no Claude in this plan.", fields: [
    { key: "claude_credits_per_week", label: "Claude credits per week", type: "number", hint: "-1 unlimited, 0 not included" },
    { key: "fable_share_percent", label: "Fable share of the Claude credits", type: "number", unit: "%", hint: "0 = no Fable" },
  ] },
  { title: "Chats", note: "New chats a user may start. A chat itself has no message limit.", fields: [
    { key: "chats_per_window", label: "New chats per window", type: "number", hint: "-1 unlimited" },
    { key: "chats_per_week", label: "New chats per week", type: "number", hint: "-1 unlimited" },
    { key: "helpers_per_chat", label: "Helpers per chat", type: "number" },
    { key: "thinking_modes", label: "Thinking modes", type: "modes" },
  ] },
  { title: "Images", fields: [
    { key: "images_per_period", label: "Images and photo edits", type: "number", hint: "-1 unlimited, 0 not included" },
    { key: "images_reset_value", label: "Per", type: "period", unitKey: "images_reset_unit" },
  ] },
  { title: "Voice", fields: [
    { key: "voice_replies_per_day", label: "Voice replies per day", type: "number", hint: "-1 unlimited, 0 not included" },
    { key: "voice_input_minutes_per_day", label: "Voice input per day", type: "number", unit: "minutes", hint: "-1 unlimited, 0 not included" },
  ] },
  { title: "WhatsApp calls", note: "Past the free minutes a call is paid per turn from credits.", fields: [
    { key: "call_minutes_per_period", label: "Free call minutes", type: "number", hint: "-1 unlimited, 0 none" },
    { key: "call_reset_value", label: "Per", type: "period", unitKey: "call_reset_unit" },
    { key: "calls_per_day", label: "Calls per day", type: "number", hint: "-1 unlimited" },
    { key: "call_max_minutes", label: "Longest call", type: "number", unit: "minutes" },
  ] },
  { title: "WhatsApp scheduled messages", fields: [
    { key: "whatsapp_per_period", label: "Messages", type: "number", hint: "-1 unlimited, 0 not included" },
    { key: "whatsapp_reset_value", label: "Per", type: "period", unitKey: "whatsapp_reset_unit" },
    { key: "whatsapp_per_day", label: "At most per day", type: "number", hint: "-1 no daily cap" },
  ] },
  { title: "Projects and coding", fields: [
    { key: "projects_max", label: "Cloud projects", type: "number", hint: "-1 unlimited" },
    { key: "coding_runs_per_month", label: "Coding agent runs per month", type: "number", hint: "-1 unlimited" },
    { key: "premium_runs_per_month", label: "Premium (Sonnet) runs per month", type: "number", hint: "-1 unlimited, 0 none" },
    { key: "sandbox_hours_per_month", label: "Cloud sandbox hours per month", type: "number", hint: "-1 unlimited" },
    { key: "sandbox_sessions", label: "Sandbox sessions at once", type: "number" },
  ] },
  { title: "Files and devices", fields: [
    { key: "uploads_per_window", label: "Uploads per window", type: "number", hint: "-1 unlimited" },
    { key: "upload_max_mb", label: "Largest upload", type: "number", unit: "MB" },
    { key: "library_storage_mb", label: "Library storage", type: "number", unit: "MB", hint: "-1 unlimited" },
    { key: "devices_max", label: "Signed-in devices", type: "number", hint: "-1 unlimited" },
  ] },
  { title: "Service", fields: [
    { key: "priority", label: "Priority at peak", type: "bool" },
    { key: "support_level", label: "Support", type: "text", hint: "e.g. community, email, priority email, named contact" },
  ] },
  { title: "Models allowed", note: "One model id per line, as the model picker names them (auto, claude-sonnet-5-5, @cf/zai-org/glm-5.3 ...). A model not listed here cannot be picked on this plan.", fields: [
    { key: "models_allowed", label: "Models", type: "list", wide: true },
    { key: "default_model", label: "Default model", type: "text" },
  ] },
  { title: "Pricing page", note: "The lines shown on the plan's card on classgrid.in/pricing and in the app, one per line.", fields: [
    { key: "features_text", label: "Lines", type: "list", wide: true },
  ] },
];

const HEAD_FIELDS: Field[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "tagline", label: "Tagline", type: "text", wide: true },
  { key: "price_inr_monthly", label: "Monthly price", type: "number", unit: "₹", hint: "-1 = contact us" },
  { key: "price_inr_yearly", label: "Yearly price", type: "number", unit: "₹" },
  { key: "student_price_inr_monthly", label: "Student monthly", type: "number", unit: "₹" },
  { key: "student_price_inr_yearly", label: "Student yearly", type: "number", unit: "₹" },
  { key: "is_public", label: "Shown on the pricing page", type: "bool" },
  { key: "coming_soon", label: "Coming soon (cannot be bought)", type: "bool" },
  { key: "sort", label: "Order on the page", type: "number" },
];

const ALL_FIELDS = [...HEAD_FIELDS, ...SECTIONS.flatMap((s) => s.fields)];
const EDITABLE_KEYS = ALL_FIELDS.flatMap((f) => (f.unitKey ? [f.key, f.unitKey] : [f.key]));
const pick = (plan: Plan) => Object.fromEntries(EDITABLE_KEYS.map((k) => [k, plan[k]]));

export function PlanConfigPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["aiPlans"],
    queryFn: async () => (await api.get("/api/super-admin/ai-plans")).data as { enabled: boolean; plans: Plan[] },
  });
  const plans = useMemo(() => (data?.plans || []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)), [data]);
  const [selected, setSelected] = useState<string>("free");
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data?.plans) return;
    const next: Record<string, Record<string, any>> = {};
    for (const p of data.plans) next[p.key] = pick(p);
    setDrafts(next);
    setDirty({});
  }, [data]);

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
  const plan = plans.find((p) => p.key === selected) || plans[0];
  if (!plan) return null;
  const d = drafts[plan.key] || {};
  const busy = savePlan.isPending;

  const field = (f: Field) => {
    const v = d[f.key];
    const id = `${plan.key}-${f.key}`;
    let control: React.ReactNode;
    if (f.type === "number") control = (
      <div className="flex items-center gap-2">
        {f.unit === "₹" && <span className="text-sm text-muted-foreground">₹</span>}
        <Input id={id} type="number" min={-1} value={v ?? 0} onChange={(e) => set(plan.key, f.key, Number(e.target.value))} disabled={busy} className="h-9 text-sm max-w-[180px]" />
        {f.unit && f.unit !== "₹" && <span className="text-sm text-muted-foreground">{f.unit}</span>}
      </div>
    );
    else if (f.type === "text") control = <Input id={id} value={v ?? ""} onChange={(e) => set(plan.key, f.key, e.target.value)} disabled={busy} className="h-9 text-sm" />;
    else if (f.type === "bool") control = <div className="h-9 flex items-center"><Switch id={id} checked={v === true} onCheckedChange={(c) => set(plan.key, f.key, c)} disabled={busy} /></div>;
    else if (f.type === "list") control = (
      <textarea id={id} value={(Array.isArray(v) ? v : []).join("\n")} onChange={(e) => set(plan.key, f.key, e.target.value.split("\n"))} disabled={busy} rows={Math.min(16, Math.max(5, (Array.isArray(v) ? v.length : 0) + 1))}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono leading-6" />
    );
    else if (f.type === "modes") control = (
      <div className="flex items-center gap-4 h-9">
        {THINKING.map((m) => {
          const on = Array.isArray(v) && v.includes(m);
          return (
            <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={on} disabled={busy} onChange={(e) => set(plan.key, f.key, e.target.checked ? [...(Array.isArray(v) ? v : []), m].filter((x, i, a) => a.indexOf(x) === i) : (Array.isArray(v) ? v : []).filter((x) => x !== m))} className="h-4 w-4 rounded border-border" />
              <span className="capitalize">{m}</span>
            </label>
          );
        })}
      </div>
    );
    else if (f.type === "period") control = (
      <div className="flex items-center gap-2">
        <Input id={id} type="number" min={1} value={v ?? 1} onChange={(e) => set(plan.key, f.key, Number(e.target.value))} disabled={busy} className="h-9 w-20 text-sm" />
        <select value={d[f.unitKey!] ?? "hour"} onChange={(e) => set(plan.key, f.unitKey!, e.target.value)} disabled={busy} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
          {UNITS.map((u) => <option key={u} value={u}>{u}{(v ?? 1) === 1 ? "" : "s"}</option>)}
        </select>
      </div>
    );
    return (
      <div key={f.key} className={`flex flex-col gap-1.5 ${f.wide ? "md:col-span-2" : ""}`}>
        <Label htmlFor={id} className="text-sm text-foreground">{f.label}</Label>
        {control}
        {f.hint && <span className="text-[11px] text-muted-foreground">{f.hint}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* The switch and the plan picker */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Plans</h2>
          <p className="text-sm text-muted-foreground">Pick a plan below and edit its prices and limits. -1 means unlimited, 0 means not included. With the switch off, the global limits on the AI Usage page apply to everyone.</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="plans-enabled" className="text-sm font-medium">{data.enabled ? "Plans are on" : "Plans are off"}</Label>
          <Switch id="plans-enabled" checked={data.enabled} onCheckedChange={(c) => setEnabled.mutate(c)} disabled={setEnabled.isPending} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => {
          const active = p.key === plan.key;
          const dp = drafts[p.key] || p;
          return (
            <button key={p.key} type="button" onClick={() => setSelected(p.key)}
              className={`text-left rounded-xl border p-4 transition-colors ${active ? "border-foreground bg-card shadow-sm" : "border-border bg-card/60 hover:bg-card"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{dp.name || p.name}</span>
                {dirty[p.key] && <span className="text-[10px] uppercase tracking-wide text-amber-500">unsaved</span>}
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{inr(dp.price_inr_monthly)}{Number(dp.price_inr_monthly) > 0 ? <span className="text-xs font-normal text-muted-foreground"> / month</span> : null}</div>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                {dp.is_public !== false ? <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> On the pricing page</span> : <span>Hidden</span>}
                {dp.coming_soon && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Coming soon</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* The selected plan */}
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-5 border-b border-border flex items-center justify-between gap-4 flex-wrap sticky top-0 bg-card z-10 rounded-t-xl">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{d.name || plan.name} plan</h3>
            <p className="text-sm text-muted-foreground">{d.tagline || plan.tagline}</p>
          </div>
          <Button variant={dirty[plan.key] ? "default" : "outline"} disabled={!dirty[plan.key] || busy} onClick={() => savePlan.mutate(plan.key)}>
            {busy && savePlan.variables === plan.key ? <Spinner className="w-3.5 h-3.5 mr-2" /> : dirty[plan.key] ? null : <Check className="w-3.5 h-3.5 mr-2" />}
            {dirty[plan.key] ? `Save ${d.name || plan.name}` : "Saved"}
          </Button>
        </div>
        <div className="p-5 space-y-6">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Plan and prices (₹, GST included)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">{HEAD_FIELDS.map(field)}</div>
          </section>
          {SECTIONS.map((s) => (
            <section key={s.title} className="border-t border-border pt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</h4>
              {s.note && <p className="text-xs text-muted-foreground mt-1 mb-3">{s.note}</p>}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 ${s.note ? "" : "mt-3"}`}>{s.fields.map(field)}</div>
            </section>
          ))}
        </div>
        <div className="p-5 border-t border-border flex justify-end">
          <Button variant={dirty[plan.key] ? "default" : "outline"} disabled={!dirty[plan.key] || busy} onClick={() => savePlan.mutate(plan.key)}>
            {busy && savePlan.variables === plan.key && <Spinner className="w-3.5 h-3.5 mr-2" />}
            {dirty[plan.key] ? `Save ${d.name || plan.name}` : "Saved"}
          </Button>
        </div>
      </div>
    </div>
  );
}
