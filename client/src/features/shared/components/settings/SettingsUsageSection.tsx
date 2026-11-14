// Settings → Usage, built exactly like the owner's approved mockup (2026-11-14): groups by when they refill
// (current session, this week, today, this period, storage), one thin bar per limit, "used of limit" on the right.
import React from "react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { usePlanOverview, whenText, inText, n, mbText, type Meter } from "@/features/shared/queries/usePlanOverview";

function H3({ children, note }: { children: React.ReactNode; note?: string }) {
  return <div className="text-[13px] font-semibold text-foreground mt-7 mb-2">{children}{note ? <span className="font-normal text-muted-foreground ml-2">{note}</span> : null}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card">{children}</div>;
}
function Bar({ title, m, unit = "", desc }: { title: string; m: Meter; unit?: string; desc?: string }) {
  if (!m) return null;
  const { used, limit } = m;
  const text = limit === 0 ? "Not included" : limit === null || limit < 0 ? `${n(used)}${unit ? ` ${unit}` : ""} used` : `${n(used)} of ${n(limit)}${unit ? ` ${unit}` : ""}`;
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="px-5 py-3.5 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-6">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-sm text-foreground whitespace-nowrap tabular-nums">{text}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/[0.07] dark:bg-white/[0.1] overflow-hidden mt-2.5">
        {limit !== null && limit > 0 && <div className="h-full rounded-full bg-foreground/80" style={{ width: `${pct}%` }} />}
      </div>
      {desc && <div className="text-xs text-muted-foreground mt-1.5">{desc}</div>}
    </div>
  );
}

export function SettingsUsageSection() {
  const { data, isLoading } = usePlanOverview();
  if (isLoading || !data) return <div className="flex flex-col gap-4"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  const u = data.usage;
  const name = data.enabled ? data.plan.name : "Free";
  const weekEnd = u.credits_week?.resetAt || u.claude_week?.resetAt || null;
  const resetOf = (m: Meter) => (m?.resetAt ? `resets ${whenText(m.resetAt)}` : m?.periodText ? `every ${m.periodText}` : "");

  return (
    <div className="max-w-[760px]">
      <h2 className="text-xl font-semibold text-foreground">Usage</h2>
      <p className="text-sm text-muted-foreground mt-1">How much of your {name} plan you have used. Everything refills on its own.</p>

      {u.credits_window && (
        <>
          <H3 note={u.credits_window.resetAt ? `refills ${inText(u.credits_window.resetAt)}` : undefined}>Current session</H3>
          <Card><Bar title="DeepSeek, GLM and other models" m={u.credits_window} unit="credits" desc={`${u.credits_window.periodText ? `Every ${u.credits_window.periodText}. ` : ""}Every model except Claude: DeepSeek, GLM, Gemma, Llama, GPT-OSS, Mistral and Auto.`} /></Card>
        </>
      )}

      {(u.credits_week || u.claude_week) && (
        <>
          <H3 note={weekEnd ? `ends ${whenText(weekEnd)}` : undefined}>This week</H3>
          <Card>
            <Bar title="DeepSeek, GLM and other models" m={u.credits_week} unit="credits" />
            <Bar title="Claude models" m={u.claude_week} unit="credits" desc={u.fable_week && u.fable_week.limit && u.fable_week.limit > 0 ? `Haiku, Sonnet, Opus and Fable. Fable may use up to ${n(u.fable_week.limit)} of these.` : "Haiku, Sonnet, Opus and Fable."} />
          </Card>
        </>
      )}

      {(u.voice_input_minutes || u.voice_replies) && (
        <>
          <H3 note="resets at midnight">Today</H3>
          <Card>
            <Bar title="Talking with the AI" m={u.voice_input_minutes} unit="minutes" />
            <Bar title="Answers read aloud" m={u.voice_replies} />
          </Card>
        </>
      )}

      {(u.images || u.call_minutes) && (
        <>
          <H3>This period</H3>
          <Card>
            <Bar title="Images and photo edits" m={u.images} desc={resetOf(u.images)} />
            <Bar title="Free WhatsApp call time" m={u.call_minutes} unit="minutes" desc={`After the free minutes a call is paid from your credits.${resetOf(u.call_minutes) ? ` ${resetOf(u.call_minutes).charAt(0).toUpperCase()}${resetOf(u.call_minutes).slice(1)}.` : ""}`} />
          </Card>
        </>
      )}

      <H3>Storage</H3>
      <Card>
        <div className="px-5 py-3.5 border-b border-border">
          <div className="flex items-baseline justify-between gap-6">
            <span className="text-sm font-medium text-foreground">Library</span>
            <span className="text-sm text-foreground whitespace-nowrap tabular-nums">{u.storage.limit && u.storage.limit > 0 ? `${mbText(u.storage.usedMb)} of ${mbText(u.storage.limit)}` : `${mbText(u.storage.usedMb)} used`}</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/[0.07] dark:bg-white/[0.1] overflow-hidden mt-2.5">
            {u.storage.limit && u.storage.limit > 0 ? <div className="h-full rounded-full bg-foreground/80" style={{ width: `${Math.min(100, Math.round((u.storage.usedMb / u.storage.limit) * 100))}%` }} /> : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 px-5 py-3.5 border-b border-border">
          <span className="text-sm text-foreground">Files</span>
          <span className="text-sm text-muted-foreground tabular-nums">{mbText(u.storage.files.mb)} · {n(u.storage.files.count)} file{u.storage.files.count === 1 ? "" : "s"}</span>
        </div>
        <div className="flex items-center justify-between gap-6 px-5 py-3.5 border-b border-border">
          <span className="text-sm text-foreground">Images</span>
          <span className="text-sm text-muted-foreground tabular-nums">{mbText(u.storage.images.mb)} · {n(u.storage.images.count)} in the Library{u.storage.generatedImages ? `, ${n(u.storage.generatedImages)} made in chats` : ""}</span>
        </div>
        {u.projects && (
          <div className="flex items-baseline justify-between gap-6 px-5 py-3.5">
            <span className="text-sm font-medium text-foreground">Cloud projects</span>
            <span className="text-sm text-foreground tabular-nums">{u.projects.limit === null || u.projects.limit < 0 ? `${n(u.projects.used)} · Unlimited` : `${n(u.projects.used)} of ${n(u.projects.limit)}`}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
