// The AI hub's Usage page, second bar: the Claude models' weekly credits (separate from the other models' bar above
// it). Read from GET /api/ai/plan/overview; nothing shown while the plan has no Claude credits.
import React from "react";
import { usePlanOverview, n, whenText } from "@/features/shared/queries/usePlanOverview";

export function ClaudeUsageBar() {
  const { data } = usePlanOverview();
  const m = data?.usage.claude_week;
  if (!data || !m) return <p className="text-sm text-muted-foreground">Claude usage is counted once plans are on.</p>;
  if (m.limit === 0) return <p className="text-sm text-muted-foreground">Claude models are not in your {data.plan.name} plan.</p>;
  const unlimited = m.limit === null || m.limit < 0;
  const pct = !unlimited && m.limit ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Claude models</div>
          <div className="text-xs text-muted-foreground">Haiku, Sonnet, Opus and Fable, this week</div>
        </div>
        <div className="text-sm text-foreground tabular-nums">{unlimited ? `${n(m.used)} credits used` : `${n(m.used)} of ${n(m.limit!)} credits`}</div>
      </div>
      <div className="h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden mt-3">
        {!unlimited && <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-foreground/70"}`} style={{ width: `${pct}%` }} />}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
        <span>{data.usage.fable_week && data.usage.fable_week.limit && data.usage.fable_week.limit > 0 ? `Fable may use up to ${n(data.usage.fable_week.limit)} of these` : ""}</span>
        <span>{m.resetAt ? `Week ends ${whenText(m.resetAt)}` : ""}</span>
      </div>
    </div>
  );
}
