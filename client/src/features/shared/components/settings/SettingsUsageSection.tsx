// Settings → Usage, the way Claude's own usage page does it (owner, 2026-11-14): "Your usage limits", then one bar
// per limit with the percent used in front and the reset time under it. The limits: the current session
// (DeepSeek, GLM and other models), the weekly limits (those models, and Claude), WhatsApp messages, WhatsApp call
// minutes, voice minutes. Nothing else on the page.
import React from "react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { usePlanOverview, whenText, inText, n, type Meter } from "@/features/shared/queries/usePlanOverview";

function Limit({ title, m, unit = "", when }: { title: string; m: Meter; unit?: string; when?: string }) {
  if (!m) return null;
  const { used, limit } = m;
  const unlimited = limit === null || limit < 0;
  const none = limit === 0;
  const pct = !unlimited && !none && limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const headline = none ? "Not in your plan" : unlimited ? "No limit" : `${pct}% used`;
  const numbers = none ? "" : unlimited ? `${n(used)}${unit ? ` ${unit}` : ""} used` : `${n(used)} of ${n(limit!)}${unit ? ` ${unit}` : ""}`;
  return (
    <div className="px-5 py-4 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-6">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className={`text-sm font-semibold tabular-nums ${pct >= 100 ? "text-red-500" : "text-foreground"}`}>{headline}</span>
      </div>
      {!none && (
        <div className="h-2 rounded-full bg-black/[0.07] dark:bg-white/[0.1] overflow-hidden mt-2.5">
          {!unlimited && <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-foreground/80"}`} style={{ width: `${pct}%` }} />}
        </div>
      )}
      <div className="flex justify-between gap-4 text-xs text-muted-foreground mt-1.5">
        <span>{numbers}</span>
        <span>{when || ""}</span>
      </div>
    </div>
  );
}

export function SettingsUsageSection() {
  const { data, isLoading } = usePlanOverview();
  if (isLoading || !data) return <div className="flex flex-col gap-4"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  const u = data.usage;
  const name = data.enabled ? data.plan.name : "Free";
  const resets = (m: Meter) => (m?.resetAt ? `Resets ${whenText(m.resetAt)}` : "");
  const weekEnd = u.credits_week?.resetAt || u.claude_week?.resetAt || null;

  return (
    <div className="max-w-[760px]">
      <h2 className="text-xl font-semibold text-foreground">Usage</h2>
      <p className="text-sm text-muted-foreground mt-1">Your {name} plan's limits and how much of each you have used.</p>

      <div className="text-[13px] font-semibold text-foreground mt-7 mb-2">Your usage limits</div>
      <div className="rounded-xl border border-border bg-card">
        {u.credits_window && <Limit title="Current session · DeepSeek, GLM and other models" m={u.credits_window} unit="credits" when={u.credits_window.resetAt ? `Resets ${inText(u.credits_window.resetAt)}` : ""} />}
        {u.credits_week && <Limit title="Weekly limit · DeepSeek, GLM and other models" m={u.credits_week} unit="credits" when={weekEnd ? `Resets ${whenText(weekEnd)}` : ""} />}
        {u.claude_week && <Limit title="Weekly limit · Claude models" m={u.claude_week} unit="credits" when={weekEnd ? `Resets ${whenText(weekEnd)}` : ""} />}
        {u.whatsapp && <Limit title="WhatsApp messages" m={u.whatsapp} when={resets(u.whatsapp)} />}
        {u.call_minutes && <Limit title="WhatsApp calls" m={u.call_minutes} unit="minutes" when={resets(u.call_minutes)} />}
        {u.voice_input_minutes && <Limit title="Voice" m={u.voice_input_minutes} unit="minutes" when="Resets at midnight" />}
      </div>
    </div>
  );
}
