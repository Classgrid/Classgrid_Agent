// Settings → Usage: how much of the plan is used, grouped by when it refills (owner's mockup, 2026-11-14): the
// current session, this week, today, this month, storage. One thin bar per limit.
import React from "react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { usePlanOverview, whenText, inText, n, mbText } from "@/features/shared/queries/usePlanOverview";
import { Section, MeterRow } from "./SettingsBits";

export function SettingsUsageSection() {
  const { data, isLoading } = usePlanOverview();
  if (isLoading || !data) return <div className="flex flex-col gap-4"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  const u = data.usage;
  const name = data.enabled ? data.plan.name : "Free";
  const weekEnd = u.credits_week?.resetAt || u.claude_week?.resetAt || null;

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Usage</h2>
      <p className="text-sm text-muted-foreground mt-1">How much of your {name} plan you have used. Everything refills on its own.</p>

      {u.credits_window && (
        <Section title="Current session" desc={u.credits_window.resetAt ? `refills ${inText(u.credits_window.resetAt)}` : undefined}>
          <MeterRow title="DeepSeek, GLM and other models" used={u.credits_window.used} limit={u.credits_window.limit} unit="credits"
            desc={`${u.credits_window.periodText ? `Every ${u.credits_window.periodText}. ` : ""}Every model except Claude.`} />
        </Section>
      )}

      {(u.credits_week || u.claude_week) && (
        <Section title="This week" desc={weekEnd ? `ends ${whenText(weekEnd)}` : undefined}>
          {u.credits_week && <MeterRow title="DeepSeek, GLM and other models" used={u.credits_week.used} limit={u.credits_week.limit} unit="credits" />}
          {u.claude_week && (
            <MeterRow title="Claude models" used={u.claude_week.used} limit={u.claude_week.limit} unit="credits"
              desc={u.fable_week && u.fable_week.limit && u.fable_week.limit > 0 ? `Haiku, Sonnet, Opus and Fable. Fable may use up to ${n(u.fable_week.limit)} of these.` : "Haiku, Sonnet, Opus and Fable."} />
          )}
        </Section>
      )}

      {(u.voice_replies || u.voice_input_minutes) && (
        <Section title="Today" desc="resets at midnight">
          {u.voice_input_minutes && <MeterRow title="Talking with the AI" used={u.voice_input_minutes.used} limit={u.voice_input_minutes.limit} unit="minutes" />}
          {u.voice_replies && <MeterRow title="Answers read aloud" used={u.voice_replies.used} limit={u.voice_replies.limit} />}
        </Section>
      )}

      {(u.images || u.whatsapp || u.call_minutes) && (
        <Section title="This period">
          {u.images && <MeterRow title="Images and photo edits" used={u.images.used} limit={u.images.limit} right={u.images.resetAt ? `resets ${whenText(u.images.resetAt)}` : u.images.periodText ? `every ${u.images.periodText}` : ""} />}
          {u.whatsapp && <MeterRow title="WhatsApp sends by the AI" used={u.whatsapp.used} limit={u.whatsapp.limit} right={u.whatsapp.resetAt ? `resets ${whenText(u.whatsapp.resetAt)}` : u.whatsapp.periodText ? `every ${u.whatsapp.periodText}` : ""} />}
          {u.call_minutes && <MeterRow title="Free WhatsApp call time" used={u.call_minutes.used} limit={u.call_minutes.limit} unit="minutes" desc="After the free minutes a call is paid from your credits." right={u.call_minutes.resetAt ? `resets ${whenText(u.call_minutes.resetAt)}` : u.call_minutes.periodText ? `every ${u.call_minutes.periodText}` : ""} />}
        </Section>
      )}

      <Section title="Storage">
        <MeterRow title="Library" used={u.storage.usedMb} limit={u.storage.limit} unit="MB" desc={`${n(u.storage.files.count)} files · ${n(u.storage.images.count)} images`} right={u.storage.limit && u.storage.limit > 0 ? `${mbText(u.storage.usedMb)} of ${mbText(u.storage.limit)}` : mbText(u.storage.usedMb)} />
        {u.projects && <MeterRow title="Cloud projects" used={u.projects.used} limit={u.projects.limit} />}
      </Section>
    </div>
  );
}
