// The AI hub's Plan page (rebuilt, owner 2026-11-14): a clean sheet of the user's plan. The header names the plan
// and its state (Subscribed with dates, or Free), then the plan's short lines, then every limit in titled sections
// laid out as a two-column spec sheet, and the models as chips by family. Every number comes from the plan row the
// super admin set (GET /api/ai/plan/overview). Icons are lucide's line icons, one per section.
import React from "react";
import { BadgeCheck, Check, MessagesSquare, Cpu, Sparkles, Image as ImageIcon, Mic, Phone, FolderKanban, HardDrive, LifeBuoy, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Button } from "@/components/marketing_ui/button";
import { usePlanOverview, n, limitText, dateText, mbText } from "./planOverview";

const period = (value: any, unit: any) => (value && unit ? `${value} ${unit}${Number(value) === 1 ? "" : "s"}` : "");
const every = (value: any, unit: any) => (Number(value) === 1 ? `a ${unit}` : `every ${period(value, unit)}`);
const modelName = (id: string) =>
  id === "auto" ? "Auto" : id.replace(/^@cf\/[^/]+\//, "").replace(/^claude-/, "Claude ").replace(/-/g, " ").replace(/\b([a-z])/g, (c) => c.toUpperCase());
const family = (id: string) => (/^claude-/.test(id) ? "Claude" : id === "auto" ? "Auto" : "Cloudflare");

type Row = [string, string];
function Section({ icon: Icon, title, rows }: { icon: React.ComponentType<{ className?: string }>; title: string; rows: Row[] }) {
  const shown = rows.filter(([, v]) => v !== "");
  if (!shown.length) return null;
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </header>
      <dl className="px-5 divide-y divide-border/60">
        {shown.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[1fr_auto] gap-4 py-2.5">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="text-sm font-medium text-foreground text-right tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PlanTab({ onUpgrade }: { onUpgrade: () => void }) {
  const { data, isLoading } = usePlanOverview();
  if (isLoading || !data) return <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-72 w-full" /></div>;
  const L = data.plan.limits;
  const subscribed = data.plan.subscribed;
  const planName = data.enabled ? data.plan.name : "Free";
  const billingText = data.plan.billing === "prepaid_yearly" ? "Paid for a year" : data.plan.billing === "granted" ? "Granted by Classgrid" : data.plan.billing === "manual_monthly" ? "Paid for a month" : "";

  const sections: { icon: React.ComponentType<{ className?: string }>; title: string; rows: Row[] }[] = L ? [
    { icon: Cpu, title: "Cloudflare models", rows: [
      ["Credits per window", `${limitText(L.tokens_per_window)} ${every(L.window_reset_value, L.window_reset_unit)}`],
      ["Credits per week", limitText(L.tokens_per_week)],
      ["Memory of a chat", L.context_tokens ? `${n(L.context_tokens / 1000)}K tokens` : ""],
      ["Thinking modes", (L.thinking_modes || []).join(", ")],
    ] },
    { icon: Sparkles, title: "Claude models", rows: [
      ["Claude credits per week", limitText(L.claude_credits_per_week)],
      ["Claude Fable", L.claude_credits_per_week && L.fable_share_percent ? `up to ${L.fable_share_percent}% of the Claude credits` : "Not included"],
    ] },
    { icon: MessagesSquare, title: "Chats", rows: [
      ["New chats per window", `${limitText(L.chats_per_window)} ${every(L.window_reset_value, L.window_reset_unit)}`],
      ["New chats per week", limitText(L.chats_per_week)],
      ["Messages inside a chat", "No limit"],
      ["Helpers per chat", limitText(L.helpers_per_chat)],
    ] },
    { icon: ImageIcon, title: "Images", rows: [
      ["Images and photo edits", `${limitText(L.images_per_period)} ${every(L.images_reset_value, L.images_reset_unit)}`],
    ] },
    { icon: Mic, title: "Voice", rows: [
      ["Voice replies", `${limitText(L.voice_replies_per_day)} a day`],
      ["Voice input", `${limitText(L.voice_input_minutes_per_day, "minutes")} a day`],
    ] },
    { icon: Phone, title: "WhatsApp", rows: [
      ["Free call minutes", `${limitText(L.call_minutes_per_period)} ${every(L.call_reset_value, L.call_reset_unit)}`],
      ["Calls per day", limitText(L.calls_per_day)],
      ["Longest call", `${L.call_max_minutes} minutes`],
      ["Scheduled messages", `${limitText(L.whatsapp_per_period)} ${every(L.whatsapp_reset_value, L.whatsapp_reset_unit)}`],
      ["Scheduled messages per day", limitText(L.whatsapp_per_day)],
    ] },
    { icon: FolderKanban, title: "Projects and coding", rows: [
      ["Cloud projects", limitText(L.projects_max)],
      ["Coding agent runs per month", limitText(L.coding_runs_per_month)],
      ["Premium (Sonnet) runs per month", limitText(L.premium_runs_per_month)],
      ["Cloud sandbox hours per month", limitText(L.sandbox_hours_per_month)],
      ["Sandbox sessions at once", limitText(L.sandbox_sessions)],
    ] },
    { icon: HardDrive, title: "Files and devices", rows: [
      ["Largest upload", `${L.upload_max_mb} MB`],
      ["Library storage", L.library_storage_mb < 0 ? "Unlimited" : mbText(L.library_storage_mb)],
      ["Signed-in devices", limitText(L.devices_max)],
    ] },
    { icon: LifeBuoy, title: "Service", rows: [
      ["Priority at peak", L.priority ? "Yes" : "No"],
      ["Support", L.support_level ? L.support_level.charAt(0).toUpperCase() + L.support_level.slice(1) : ""],
    ] },
  ] : [];

  const models: string[] = L?.models_allowed || [];
  const families = ["Auto", "Cloudflare", "Claude"].map((f) => ({ f, list: models.filter((m) => family(m) === f) })).filter((g) => g.list.length);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      {/* Header: the plan, its state, the way to a bigger one */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-2xl font-bold text-foreground">{planName} plan</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${subscribed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
              {subscribed ? <BadgeCheck className="w-3.5 h-3.5" /> : null}
              {subscribed ? "Subscribed" : data.enabled ? "Free" : "Plans not open"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {subscribed
              ? `${billingText}${data.plan.started_at ? `, since ${dateText(data.plan.started_at)}` : ""}${data.plan.expires_at ? `, until ${dateText(data.plan.expires_at)}` : ""}. Nothing renews by itself.`
              : data.plan.tagline || "Everything your plan includes, as set by Classgrid."}
          </p>
        </div>
        <Button onClick={onUpgrade}>
          {subscribed ? "Change plan" : "Upgrade"} <ArrowUpRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
        {/* The plan's short lines */}
        {L?.features_text?.length ? (
          <section className="rounded-xl border border-border bg-card px-5 py-4">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {L.features_text.map((f: string, i: number) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground"><Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" /><span>{f}</span></li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Every limit, as a two-column spec sheet */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sections.map((s) => <Section key={s.title} icon={s.icon} title={s.title} rows={s.rows} />)}
        </div>

        {/* Models, by family */}
        {families.length ? (
          <section className="rounded-xl border border-border bg-card">
            <header className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">Models in this plan</h4>
            </header>
            <div className="px-5 py-4 space-y-3">
              {families.map((g) => (
                <div key={g.f} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground w-20">{g.f}</span>
                  {g.list.map((m) => <span key={m} className="text-xs rounded-md border border-border bg-muted/30 px-2 py-0.5 text-foreground">{modelName(m)}</span>)}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
