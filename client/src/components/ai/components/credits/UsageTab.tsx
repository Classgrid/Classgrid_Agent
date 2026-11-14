// The AI hub's Usage page: the usage bar as it always was (AiUsageBar: the credits, the reset countdown), then the
// plan's other limits as short rows (owner, 2026-11-14: the bar stays, the rest is a plain list).
import React from "react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { AiUsageBar } from "../AiUsageBar";
import { usePlanOverview, type Meter, n, dateText, mbText } from "./planOverview";

function Row({ label, meter, unit = "" }: { label: string; meter: Meter; unit?: string }) {
  if (!meter) return null;
  const { used, limit } = meter;
  const text = limit === 0 ? "Not included" : limit === null || limit < 0 ? `${n(used)}${unit ? ` ${unit}` : ""} used` : `${n(used)} of ${n(limit)}${unit ? ` ${unit}` : ""}`;
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="flex items-center gap-4 py-2.5 border-t border-border/60 first:border-t-0">
      <span className="text-sm text-foreground w-56 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        {limit !== null && limit > 0 && <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-foreground/60"}`} style={{ width: `${pct}%` }} />}
      </div>
      <span className="text-sm font-medium text-foreground tabular-nums w-44 text-right">{text}</span>
      <span className="text-[11px] text-muted-foreground w-36 text-right hidden md:block">{meter.resetAt ? `resets ${dateText(meter.resetAt)}` : meter.periodText ? `every ${meter.periodText}` : ""}</span>
    </div>
  );
}

export function UsageTab({ onUpgrade: _onUpgrade }: { onUpgrade?: () => void }) {
  const { data, isLoading } = usePlanOverview();
  const u = data?.usage;
  const storageLimit = u?.storage.limit ?? null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <h3 className="text-2xl font-bold text-foreground mb-2">AI Usage</h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-xl">
        Monitor your AI token usage and limits across your personal account and organization.
      </p>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-6">
        <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-sm">
          <AiUsageBar showExactTokens={false} />
        </div>

        {isLoading || !data || !u ? (
          <Skeleton className="h-48 w-full max-w-2xl" />
        ) : (
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl px-6 py-4 shadow-sm">
            <div className="text-sm font-semibold text-foreground mb-1">{data.enabled ? `${data.plan.name} plan limits` : "Other limits"}</div>
            <Row label="Claude credits this week" meter={u.claude_week} />
            <Row label="Claude Fable (of the Claude credits)" meter={u.fable_week} />
            <Row label="New chats this window" meter={u.chats_window} />
            <Row label="New chats this week" meter={u.chats_week} />
            <Row label="Images and photo edits" meter={u.images} />
            <Row label="Voice replies today" meter={u.voice_replies} />
            <Row label="Voice input today" meter={u.voice_input_minutes} unit="min" />
            <Row label="WhatsApp messages" meter={u.whatsapp} />
            <Row label="Free call minutes" meter={u.call_minutes} unit="min" />
            <Row label="Cloud projects" meter={u.projects} />
            <div className="flex items-center gap-4 py-2.5 border-t border-border/60">
              <span className="text-sm text-foreground w-56 shrink-0">Library storage</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                {storageLimit !== null && storageLimit > 0 && <div className="h-full rounded-full bg-foreground/60" style={{ width: `${Math.min(100, Math.round((u.storage.usedMb / storageLimit) * 100))}%` }} />}
              </div>
              <span className="text-sm font-medium text-foreground tabular-nums w-44 text-right">{mbText(u.storage.usedMb)}{storageLimit !== null && storageLimit > 0 ? ` of ${mbText(storageLimit)}` : ""}</span>
              <span className="text-[11px] text-muted-foreground w-36 text-right hidden md:block">{n(u.storage.files.count)} files, {n(u.storage.images.count)} images</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
