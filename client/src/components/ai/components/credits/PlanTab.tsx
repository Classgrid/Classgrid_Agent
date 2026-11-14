// The AI hub's Plan page (owner, 2026-11-14): the user's plan, "Subscribed" with its dates, and everything inside
// the plan as the super admin set it, in groups. Upgrade goes to the Upgrade page.
import React from "react";
import { Crown, CheckCircle2, Check } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Button } from "@/components/marketing_ui/button";
import { usePlanOverview, n, limitText, dateText, mbText } from "./planOverview";

const period = (value: any, unit: any) => (value && unit ? `${value} ${unit}${Number(value) === 1 ? "" : "s"}` : "");
const modelName = (id: string) => id === "auto" ? "Auto" : id.replace(/^@cf\/[^/]+\//, "").replace(/^claude-/, "Claude ").replace(/-/g, " ");

export function PlanTab({ onUpgrade }: { onUpgrade: () => void }) {
  const { data, isLoading } = usePlanOverview();
  if (isLoading || !data) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  const L = data.plan.limits;
  const subscribed = data.plan.subscribed;

  const groups: { title: string; rows: [string, string][] }[] = L ? [
    { title: "Chat", rows: [
      ["Credits per window", `${limitText(L.tokens_per_window)} every ${period(L.window_reset_value, L.window_reset_unit)}`],
      ["Credits per week", limitText(L.tokens_per_week)],
      ["New chats per window", `${limitText(L.chats_per_window)} (no limit inside a chat)`],
      ["New chats per week", limitText(L.chats_per_week)],
      ["Claude credits per week", limitText(L.claude_credits_per_week)],
      ["Claude Fable share", L.claude_credits_per_week && L.fable_share_percent ? `up to ${L.fable_share_percent}% of the Claude credits` : "Not included"],
      ["Context", L.context_tokens ? `${n(L.context_tokens / 1000)}K tokens` : ""],
      ["Thinking modes", (L.thinking_modes || []).join(", ")],
      ["Helpers per chat", limitText(L.helpers_per_chat)],
    ] },
    { title: "Pictures and voice", rows: [
      ["Images and photo edits", `${limitText(L.images_per_period)} every ${period(L.images_reset_value, L.images_reset_unit)}`],
      ["Voice replies", `${limitText(L.voice_replies_per_day)} a day`],
      ["Voice input", `${limitText(L.voice_input_minutes_per_day, "minutes")} a day`],
    ] },
    { title: "WhatsApp", rows: [
      ["Free call minutes", `${limitText(L.call_minutes_per_period)} every ${period(L.call_reset_value, L.call_reset_unit)}`],
      ["Calls per day", limitText(L.calls_per_day)],
      ["Longest call", `${L.call_max_minutes} minutes`],
      ["Scheduled messages", `${limitText(L.whatsapp_per_period)} every ${period(L.whatsapp_reset_value, L.whatsapp_reset_unit)}, at most ${limitText(L.whatsapp_per_day)} a day`],
    ] },
    { title: "Projects and coding", rows: [
      ["Cloud projects", limitText(L.projects_max)],
      ["Coding agent runs per month", limitText(L.coding_runs_per_month)],
      ["Premium (Sonnet) runs per month", limitText(L.premium_runs_per_month)],
      ["Cloud sandbox hours per month", limitText(L.sandbox_hours_per_month)],
      ["Sandbox sessions at once", limitText(L.sandbox_sessions)],
    ] },
    { title: "Files and devices", rows: [
      ["Largest upload", `${L.upload_max_mb} MB`],
      ["Library storage", L.library_storage_mb < 0 ? "Unlimited" : mbText(L.library_storage_mb)],
      ["Signed-in devices", limitText(L.devices_max)],
    ] },
    { title: "Service", rows: [
      ["Priority at peak", L.priority ? "Yes" : "No"],
      ["Support", L.support_level || ""],
    ] },
  ] : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500" /> {data.enabled ? data.plan.name : "Free"} plan</h3>
          <p className="text-sm text-muted-foreground max-w-xl">{data.plan.tagline || "Everything your plan includes."}</p>
        </div>
        <Button onClick={onUpgrade}>{subscribed ? "Change plan" : "Upgrade"}</Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        <div className={`rounded-xl border p-5 flex items-start gap-3 ${subscribed ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-muted/30"}`}>
          {subscribed ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" /> : <Crown className="w-6 h-6 text-muted-foreground shrink-0" />}
          <div>
            <div className="font-semibold text-foreground">{subscribed ? `Subscribed to ${data.plan.name}` : data.enabled ? "You are on the Free plan" : "Plans are not open yet"}</div>
            <div className="text-sm text-muted-foreground">
              {subscribed
                ? `${data.plan.billing === "prepaid_yearly" ? "Paid for a year" : data.plan.billing === "granted" ? "Granted by Classgrid" : "Paid for a month"}${data.plan.started_at ? `, since ${dateText(data.plan.started_at)}` : ""}${data.plan.expires_at ? `, until ${dateText(data.plan.expires_at)}` : ""}. Nothing renews by itself: buy again from Upgrade when it ends.`
                : data.enabled ? "Pro gives Claude, more pictures, calls and projects; Max gives five times Pro with Claude Fable." : "Your limits are the global ones set by Classgrid."}
            </div>
          </div>
        </div>

        {L?.features_text?.length ? (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">In short</div>
            <ul className="text-sm text-foreground space-y-1.5">
              {L.features_text.map((f: string, i: number) => <li key={i} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" /><span>{f}</span></li>)}
            </ul>
          </div>
        ) : null}

        {groups.map((g) => (
          <div key={g.title} className="bg-card border border-border rounded-xl px-5 py-2 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3 pb-1">{g.title}</div>
            {g.rows.filter(([, v]) => v !== "").map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-2 border-t border-border/60 first:border-t-0">
                <span className="text-sm text-muted-foreground">{k}</span>
                <span className="text-sm font-medium text-foreground text-right">{v}</span>
              </div>
            ))}
          </div>
        ))}

        {L?.models_allowed?.length ? (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Models</div>
            <div className="flex flex-wrap gap-1.5">
              {L.models_allowed.map((m: string) => <span key={m} className="text-xs rounded-full border border-border px-2 py-0.5 text-foreground">{modelName(m)}</span>)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
