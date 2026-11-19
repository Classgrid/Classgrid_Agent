// The plans (Free, Pro, Max, Enterprise), one page per plan (owner, 2026-11-14): pick a plan at the top, then its
// prices and every limit in titled sections, each field with its unit and a hint. Nothing about plans is fixed in
// code: every number here is what the chat enforces and what the pricing page shows. -1 = unlimited, 0 = not included.
//
// Easier to read (owner, 2026-11-17: "plans and billing page is robotic", the plan's bar covered the fields under
// it, and the models were raw ids): sections are cards with an icon and a plain line; "Unlimited" is a switch next
// to the number instead of typing -1; each number shows how it reads ("1,00,000"); the models are picked by name
// with their logos (the chat's own model list); the bar with Save sits at the bottom of the screen while there are
// unsaved changes, so nothing at the top covers the page.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check, Globe, Clock, Cpu, Sparkles, MessagesSquare, ImageIcon, Mic, Phone, MessageCircle, FolderGit2, HardDrive,
  Headphones, Bot, LayoutList, IndianRupee,
} from "lucide-react";
import { apiClient as api } from "@/lib/apiClient";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Switch } from "@/components/marketing_ui/switch";
import { Label } from "@/components/marketing_ui/label";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { MODEL_GROUPS, AUTO_MODEL_ID, ModelLogoImg } from "@/components/ai/components/ModelPicker";

type Plan = Record<string, any> & { key: string; name: string };
type FieldType = "number" | "text" | "bool" | "list" | "period" | "modes" | "models" | "model";
// unlimited: the number may be -1 (shown as an "Unlimited" switch); none: 0 means "not included" (said under it)
type Field = { key: string; label: string; type: FieldType; hint?: string; unitKey?: string; unit?: string; wide?: boolean; unlimited?: boolean; none?: boolean };
type Section = { title: string; note?: string; icon: React.ElementType; fields: Field[] };

const UNITS = ["second", "minute", "hour", "day", "week", "month"];
const THINKING = [
  { id: "fast", label: "Fast" },
  { id: "normal", label: "Normal" },
  { id: "deep", label: "Deep" },
];
const inr = (n: any) => (Number(n) < 0 ? "Contact us" : Number(n) === 0 ? "Free" : `₹${Math.round(Number(n)).toLocaleString("en-IN")}`);
const readable = (n: any) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "");

const SECTIONS: Section[] = [
  { title: "Credits for everyday models", icon: Cpu, note: "DeepSeek, GLM, Gemma, Llama, GPT-OSS, Mistral and Auto share these credits. Claude has its own credits below.", fields: [
    { key: "tokens_per_window", label: "Credits per session", type: "number", unlimited: true },
    { key: "window_reset_value", label: "A session lasts", type: "period", unitKey: "window_reset_unit" },
    { key: "tokens_per_week", label: "Credits per week (the most in 7 days)", type: "number", unlimited: true },
    { key: "context_tokens", label: "How much of a chat the AI remembers", type: "number", unit: "tokens" },
  ] },
  { title: "Claude", icon: Sparkles, note: "Haiku, Sonnet, Opus and Fable use their own weekly credits.", fields: [
    { key: "claude_credits_per_week", label: "Claude credits per week", type: "number", unlimited: true, none: true },
    { key: "fable_share_percent", label: "Part of them Fable may use", type: "number", unit: "%", hint: "0 = no Fable on this plan" },
  ] },
  { title: "Chats", icon: MessagesSquare, note: "How many new chats a person may start. A chat itself has no message limit.", fields: [
    { key: "chats_per_window", label: "New chats per session", type: "number", unlimited: true },
    { key: "chats_per_week", label: "New chats per week", type: "number", unlimited: true },
    { key: "helpers_per_chat", label: "Helpers the AI may send in one chat", type: "number" },
    { key: "thinking_modes", label: "Thinking modes", type: "modes" },
  ] },
  { title: "Images", icon: ImageIcon, fields: [
    { key: "images_per_period", label: "Images and photo edits", type: "number", unlimited: true, none: true },
    { key: "images_reset_value", label: "Every", type: "period", unitKey: "images_reset_unit" },
  ] },
  { title: "Voice", icon: Mic, fields: [
    { key: "voice_replies_per_day", label: "Spoken replies per day", type: "number", unlimited: true, none: true },
    { key: "voice_input_minutes_per_day", label: "Talking to the AI per day", type: "number", unit: "minutes", unlimited: true, none: true },
  ] },
  { title: "WhatsApp calls", icon: Phone, note: "After the free minutes, a call is paid from credits.", fields: [
    { key: "call_minutes_per_period", label: "Free call minutes", type: "number", unlimited: true, hint: "0 = no free minutes (calls are then paid from credits)" },
    { key: "call_reset_value", label: "Every", type: "period", unitKey: "call_reset_unit" },
    { key: "calls_per_day", label: "Calls per day", type: "number", unlimited: true },
    { key: "calls_per_week", label: "Calls per week", type: "number", unlimited: true, hint: "Answered calls in the last 7 days" },
    { key: "calls_per_month", label: "Calls per month", type: "number", unlimited: true, hint: "Answered calls in the last 30 days" },
    { key: "call_max_minutes", label: "Longest call", type: "number", unit: "minutes" },
    // Work a call may start (owner, 2026-11-17: on Free a call is a call plus small tasks, not big work)
    { key: "call_tasks_per_call", label: "Tasks one call can start", type: "number", unlimited: true, none: true },
    { key: "call_tasks_at_once", label: "Tasks from calls running at once", type: "number", unlimited: true, none: true, hint: "Per person" },
    { key: "call_task_max_minutes", label: "Work time for one task from a call", type: "number", unit: "minutes", unlimited: true },
  ] },
  { title: "WhatsApp scheduled messages", icon: MessageCircle, fields: [
    { key: "whatsapp_per_period", label: "Messages", type: "number", unlimited: true, none: true },
    { key: "whatsapp_reset_value", label: "Every", type: "period", unitKey: "whatsapp_reset_unit" },
    { key: "whatsapp_per_day", label: "At most per day", type: "number", unlimited: true },
  ] },
  { title: "Projects and coding", icon: FolderGit2, fields: [
    { key: "projects_max", label: "Cloud projects", type: "number", unlimited: true },
    { key: "sandbox_hours_per_month", label: "Cloud computer hours per month", type: "number", unlimited: true },
    { key: "sandbox_sessions", label: "Cloud computers at once", type: "number" },
  ] },
  { title: "Files and devices", icon: HardDrive, fields: [
    { key: "uploads_per_window", label: "Uploads per session", type: "number", unlimited: true },
    { key: "upload_max_mb", label: "Largest upload", type: "number", unit: "MB" },
    { key: "files_per_message", label: "Pictures and files per message", type: "number" },
    { key: "library_storage_mb", label: "Library storage", type: "number", unit: "MB", unlimited: true },
    { key: "devices_max", label: "Signed-in devices", type: "number", unlimited: true },
  ] },
  { title: "Service", icon: Headphones, fields: [
    { key: "priority", label: "Priority at busy times", type: "bool" },
    { key: "support_level", label: "Support", type: "text", hint: "e.g. community, email, priority email, named contact" },
  ] },
  { title: "Models", icon: Bot, note: "The models people on this plan can pick. A model that is off here can't be picked.", fields: [
    { key: "models_allowed", label: "Models on this plan", type: "models", wide: true },
    { key: "default_model", label: "Model a new chat starts with", type: "model" },
  ] },
  { title: "Pricing page", icon: LayoutList, note: "The lines on this plan's card on classgrid.in/pricing and in the apps, one per line. Change them when you change a limit above.", fields: [
    { key: "features_text", label: "Lines on the card", type: "list", wide: true },
  ] },
];

const HEAD_FIELDS: Field[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "tagline", label: "One line under the name", type: "text", wide: true },
  { key: "price_inr_monthly", label: "Monthly price", type: "number", unit: "₹", hint: "0 = free, -1 = contact us" },
  { key: "price_inr_yearly", label: "Yearly price", type: "number", unit: "₹" },
  { key: "student_price_inr_monthly", label: "Student monthly price", type: "number", unit: "₹" },
  { key: "student_price_inr_yearly", label: "Student yearly price", type: "number", unit: "₹" },
  { key: "is_public", label: "Shown on the pricing page", type: "bool" },
  { key: "coming_soon", label: "Coming soon (can't be bought yet)", type: "bool" },
  { key: "sort", label: "Order on the pricing page", type: "number" },
];

const ALL_FIELDS = [...HEAD_FIELDS, ...SECTIONS.flatMap((s) => s.fields)];
const EDITABLE_KEYS = ALL_FIELDS.flatMap((f) => (f.unitKey ? [f.key, f.unitKey] : [f.key]));
const pick = (plan: Plan) => Object.fromEntries(EDITABLE_KEYS.map((k) => [k, plan[k]]));

// The chat's own model list (names and logos), with Auto first
const AUTO_OPTION = { id: AUTO_MODEL_ID, name: "Auto", description: "Classgrid picks the right model for each message" };
const KNOWN_MODEL_IDS = new Set([AUTO_MODEL_ID, ...MODEL_GROUPS.flatMap((g) => g.models.map((m) => m.id))]);
const modelName = (id: string) => (id === AUTO_MODEL_ID ? "Auto" : MODEL_GROUPS.flatMap((g) => g.models).find((m) => m.id === id)?.name || id);

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

  // The list came back (first load, or after a save): plans with unsaved changes keep them; the others take the
  // saved values (saving one plan used to throw away the unsaved changes of the others)
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  const savedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!data?.plans) return;
    const keep = Object.keys(dirtyRef.current).filter((k) => dirtyRef.current[k] && k !== savedKeyRef.current);
    setDrafts((prev) => {
      const next: Record<string, Record<string, any>> = {};
      for (const p of data.plans) {
        const kept = prev[p.key];
        next[p.key] = keep.includes(p.key) && kept ? kept : pick(p);
      }
      return next;
    });
    setDirty(Object.fromEntries(keep.map((k) => [k, true])));
    savedKeyRef.current = null;
  }, [data]);
  // The number a limit had before it was switched to Unlimited, to bring back when it is switched off again
  const lastNumber = useRef<Record<string, number>>({});

  const savePlan = useMutation({
    mutationFn: async (key: string) => {
      // (an empty list is read by the server as "every model", so a plan is never saved with no model ticked)
      const models = Array.isArray(drafts[key]?.models_allowed) ? drafts[key].models_allowed.filter(Boolean) : [];
      if (!models.length) throw new Error("Tick at least one model for this plan before saving.");
      savedKeyRef.current = key;
      return (await api.put(`/api/super-admin/ai-plans/${key}`, drafts[key])).data;
    },
    onSuccess: (_d, key) => { toast.success(`${drafts[key]?.name || key} plan saved`); queryClient.invalidateQueries({ queryKey: ["aiPlans"] }); },
    onError: (e: any) => { savedKeyRef.current = null; toast.error(e?.response?.data?.message || e?.message || "Could not save the plan"); },
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
  const undo = (key: string) => {
    const original = data?.plans.find((p) => p.key === key);
    if (!original) return;
    setDrafts((d) => ({ ...d, [key]: pick(original) }));
    setDirty((x) => ({ ...x, [key]: false }));
  };

  if (isLoading) return <Skeleton className="w-full h-64 mb-6" />;
  if (!data) return null;
  const plan = plans.find((p) => p.key === selected) || plans[0];
  if (!plan) return null;
  const d = drafts[plan.key] || {};
  const busy = savePlan.isPending;
  const isDirty = !!dirty[plan.key];
  const planName = d.name || plan.name;

  const numberControl = (f: Field, id: string, v: any) => {
    // (a limit the plan has no value for yet, like a newly added one, works as no limit until a number is saved)
    const notSet = f.unlimited && (v === undefined || v === null);
    const unlimited = f.unlimited && (notSet || Number(v) === -1);
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          {f.unit === "₹" && <span className="text-sm text-muted-foreground">₹</span>}
          {unlimited ? (
            <div className="h-9 min-w-[140px] px-3 rounded-md border border-border bg-muted/50 text-sm text-foreground flex items-center">{notSet ? "No limit" : "Unlimited"}</div>
          ) : (
            <Input id={id} type="number" value={v ?? 0} onChange={(e) => set(plan.key, f.key, Number(e.target.value))} disabled={busy} className="h-9 text-sm w-[160px]" />
          )}
          {f.unit && f.unit !== "₹" && !unlimited && <span className="text-sm text-muted-foreground">{f.unit}</span>}
          {f.unlimited && (
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer ml-1">
              {/* (switching Unlimited off brings back the number it had before, else the saved number, else 0 where
                  0 means "not included" and 1 elsewhere, so a limit is never saved as 0 by accident) */}
              <Switch checked={unlimited} disabled={busy} aria-label={`${f.label}: unlimited`} onCheckedChange={(on) => {
                const k = `${plan.key}:${f.key}`;
                if (on) { if (Number(v) >= 0) lastNumber.current[k] = Number(v); set(plan.key, f.key, -1); return; }
                const saved = Number(plan[f.key]);
                set(plan.key, f.key, lastNumber.current[k] ?? (saved >= 0 ? saved : f.none ? 0 : 1));
              }} />
              Unlimited
            </label>
          )}
        </div>
        {!unlimited && Number(v) >= 1000 && <span className="text-xs text-muted-foreground">{f.unit === "₹" ? "₹" : ""}{readable(v)}{f.unit && f.unit !== "₹" ? ` ${f.unit}` : ""}</span>}
        {!unlimited && f.none && Number(v) === 0 && <span className="text-xs text-muted-foreground">Not included in this plan</span>}
      </div>
    );
  };

  const modelsControl = (v: any) => {
    const list: string[] = Array.isArray(v) ? v.filter(Boolean) : [];
    const has = (id: string) => list.includes(id);
    const toggle = (id: string, on: boolean) => set(plan.key, "models_allowed", on ? [...list.filter((x) => x !== id), id] : list.filter((x) => x !== id));
    const unknown = list.filter((id) => !KNOWN_MODEL_IDS.has(id));
    const row = (id: string, name: string, description: string, logo?: React.ReactNode) => (
      <label key={id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${has(id) ? "border-foreground/25 bg-muted/40" : "border-border hover:bg-muted/30"}`}>
        <input type="checkbox" checked={has(id)} disabled={busy} onChange={(e) => toggle(id, e.target.checked)} className="h-4 w-4 rounded border-border shrink-0" />
        <span className="w-5 h-5 flex items-center justify-center shrink-0">{logo}</span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">{name}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </label>
    );
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {row(AUTO_OPTION.id, AUTO_OPTION.name, AUTO_OPTION.description, <Sparkles className="w-4 h-4 text-muted-foreground" />)}
        </div>
        {MODEL_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{g.label}</span>
              <span className="flex items-center gap-3 text-xs">
                <button type="button" disabled={busy} className="text-muted-foreground hover:text-foreground" onClick={() => set(plan.key, "models_allowed", [...list.filter((x) => !g.models.some((m) => m.id === x)), ...g.models.map((m) => m.id)])}>All</button>
                <button type="button" disabled={busy} className="text-muted-foreground hover:text-foreground" onClick={() => set(plan.key, "models_allowed", list.filter((x) => !g.models.some((m) => m.id === x)))}>None</button>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {g.models.map((m) => row(m.id, m.name, m.description, <ModelLogoImg logo={m.logo} />))}
            </div>
          </div>
        ))}
        {unknown.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">Other models on this plan (not in the chat&apos;s model list)</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {unknown.map((id) => (
                <span key={id} className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs text-foreground">
                  {id}
                  <button type="button" disabled={busy} className="text-muted-foreground hover:text-foreground" onClick={() => toggle(id, false)} aria-label={`Remove ${id}`}>Remove</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const field = (f: Field) => {
    const v = d[f.key];
    const id = `${plan.key}-${f.key}`;
    let control: React.ReactNode;
    if (f.type === "number") control = numberControl(f, id, v);
    else if (f.type === "text") control = <Input id={id} value={v ?? ""} onChange={(e) => set(plan.key, f.key, e.target.value)} disabled={busy} className="h-9 text-sm" />;
    else if (f.type === "bool") control = <div className="h-9 flex items-center"><Switch id={id} checked={v === true} onCheckedChange={(c) => set(plan.key, f.key, c)} disabled={busy} /></div>;
    else if (f.type === "list") control = (
      <textarea id={id} value={(Array.isArray(v) ? v : []).join("\n")} onChange={(e) => set(plan.key, f.key, e.target.value.split("\n"))} disabled={busy} rows={Math.min(14, Math.max(4, (Array.isArray(v) ? v.length : 0) + 1))}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm leading-6" />
    );
    else if (f.type === "models") control = modelsControl(v);
    else if (f.type === "model") {
      const allowed: string[] = Array.isArray(d.models_allowed) ? d.models_allowed.filter(Boolean) : [];
      const options = [...new Set([...(allowed.includes(AUTO_MODEL_ID) ? [AUTO_MODEL_ID] : []), ...allowed.filter((x) => x !== AUTO_MODEL_ID), ...(v ? [v] : [])])];
      control = (
        <Select value={v || ""} onValueChange={(val) => val && set(plan.key, f.key, val as string)} disabled={busy || !options.length}>
          {/* (no default saved yet, or no model ticked: said plainly instead of showing a model that isn't saved) */}
          <SelectTrigger id={id} className="h-9 w-full max-w-[320px]">
            <SelectValue>{v ? `${modelName(v)}${!allowed.includes(v) ? " (not on this plan)" : ""}` : options.length ? "Choose a model" : "Tick models above first"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options.map((m) => <SelectItem key={m} value={m}>{modelName(m)}{!allowed.includes(m) ? " (not on this plan)" : ""}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      );
    }
    else if (f.type === "modes") control = (
      <div className="flex items-center gap-2 flex-wrap">
        {THINKING.map((m) => {
          const on = Array.isArray(v) && v.includes(m.id);
          return (
            <button key={m.id} type="button" disabled={busy}
              onClick={() => set(plan.key, f.key, on ? (Array.isArray(v) ? v : []).filter((x) => x !== m.id) : [...(Array.isArray(v) ? v : []), m.id].filter((x, i, a) => a.indexOf(x) === i))}
              className={`h-9 px-3 rounded-md border text-sm inline-flex items-center gap-1.5 transition-colors ${on ? "border-foreground/30 bg-muted text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {on && <Check className="w-3.5 h-3.5" />}{m.label}
            </button>
          );
        })}
      </div>
    );
    else if (f.type === "period") control = (
      <div className="flex items-center gap-2">
        <Input id={id} type="number" min={1} value={v ?? 1} onChange={(e) => set(plan.key, f.key, Number(e.target.value))} disabled={busy} className="h-9 w-20 text-sm" />
        <Select value={d[f.unitKey!] ?? "hour"} onValueChange={(val) => val && set(plan.key, f.unitKey!, val as string)} disabled={busy}>
          <SelectTrigger className="h-9 w-[120px]"><SelectValue>{`${d[f.unitKey!] ?? "hour"}${(v ?? 1) === 1 ? "" : "s"}`}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectGroup>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}{(v ?? 1) === 1 ? "" : "s"}</SelectItem>)}</SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
    return (
      <div key={f.key} className={`flex flex-col gap-1.5 min-w-0 ${f.wide ? "md:col-span-2" : ""}`}>
        <Label htmlFor={id} className="text-sm text-foreground">{f.label}</Label>
        {control}
        {f.hint && <span className="text-xs text-muted-foreground">{f.hint}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* The switch and the plan picker */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Plans</h2>
          <p className="text-sm text-muted-foreground">Pick a plan, change its prices and limits, then save. While plans are off, the global limits on the AI Usage page apply to everyone.</p>
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
                {dirty[p.key] && <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">Not saved</span>}
              </div>
              <div className="text-xl font-bold text-foreground mt-1">{inr(dp.price_inr_monthly)}{Number(dp.price_inr_monthly) > 0 ? <span className="text-xs font-normal text-muted-foreground"> / month</span> : null}</div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                {dp.is_public !== false ? <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> On the pricing page</span> : <span>Hidden</span>}
                {dp.coming_soon && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Coming soon</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* The selected plan: its name and Save (not pinned to the top any more: it covered the fields under it) */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{planName} plan</h3>
          <p className="text-sm text-muted-foreground">{d.tagline || plan.tagline}</p>
        </div>
        <Button variant={isDirty ? "default" : "outline"} disabled={!isDirty || busy} onClick={() => savePlan.mutate(plan.key)}>
          {busy && savePlan.variables === plan.key ? <Spinner className="w-3.5 h-3.5 mr-2" /> : isDirty ? null : <Check className="w-3.5 h-3.5 mr-2" />}
          {isDirty ? `Save ${planName}` : "Saved"}
        </Button>
      </div>

      <section className="bg-card border border-border rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><IndianRupee className="w-4 h-4 text-foreground" /></span>
          <div>
            <h4 className="text-base font-semibold text-foreground">Name and prices</h4>
            <p className="text-xs text-muted-foreground">In rupees, GST included.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mt-4">{HEAD_FIELDS.map(field)}</div>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.title} className="bg-card border border-border rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><s.icon className="w-4 h-4 text-foreground" /></span>
            <div className="min-w-0">
              <h4 className="text-base font-semibold text-foreground">{s.title}</h4>
              {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mt-4">{s.fields.map(field)}</div>
        </section>
      ))}

      {/* Unsaved changes: Save and Undo stay at the bottom of the screen while scrolling */}
      {isDirty && (
        <div className="sticky bottom-4 z-10">
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-popover text-popover-foreground shadow-lg px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm">{planName}: changes not saved</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => undo(plan.key)}>Undo</Button>
              <Button size="sm" disabled={busy} onClick={() => savePlan.mutate(plan.key)}>
                {busy && savePlan.variables === plan.key && <Spinner className="w-3.5 h-3.5 mr-2" />}
                Save {planName}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
