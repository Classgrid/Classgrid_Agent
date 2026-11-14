// The AI hub's Usage page (rebuilt, owner 2026-11-14): every limit of the user's plan with what is used, in one
// place: credits (every model together, with the Claude and Fable pools inside the plan), chats, pictures, voice,
// WhatsApp messages and calls, projects, and the storage of the Library (files and pictures) like a storage meter.
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Image as ImageIcon, FileText, Wallet, Crown } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Button } from "@/components/marketing_ui/button";
import { usePlanOverview, type Meter, n, limitText, dateText, mbText } from "./planOverview";

function Bar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null || limit < 0 || limit === 0) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-foreground/70";
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Row({ label, meter, unit = "", resetLabel = "Resets", extraCredits }: { label: string; meter: Meter; unit?: string; resetLabel?: string; extraCredits?: number }) {
  if (!meter) return null;
  const { used, limit } = meter;
  const limitStr = limitText(limit, unit);
  const usedStr = unit ? `${n(used)} ${unit}` : n(used);
  const reset = meter.resetAt ? dateText(meter.resetAt) : null;
  return (
    <div className="py-3 border-t border-border/60 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground tabular-nums">
          {limit === 0 ? <span className="text-muted-foreground">Not included</span> : limit === null || limit < 0 ? <>{usedStr} <span className="text-muted-foreground font-normal">· Unlimited</span></> : <>{usedStr} <span className="text-muted-foreground font-normal">of {limitStr}</span></>}
        </span>
      </div>
      <Bar used={used} limit={limit} />
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
        <span>{meter.periodText ? `Every ${meter.periodText}` : ""}</span>
        <span>{reset ? `${resetLabel} ${reset}` : ""}{limit !== null && limit >= 0 && used >= limit && extraCredits ? ` · extra ${n(extraCredits)} credits each from top-up` : ""}</span>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-2 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3 pb-1">{title}</div>
      {children}
    </div>
  );
}

export function UsageTab({ onUpgrade }: { onUpgrade?: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = usePlanOverview();
  if (isLoading || !data) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  const u = data.usage;
  const extra = data.balance.extra;
  const storageLimit = u.storage.limit;
  const storagePct = storageLimit && storageLimit > 0 ? Math.min(100, Math.round((u.storage.usedMb / storageLimit) * 100)) : 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-1">Usage</h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            Everything your {data.enabled ? data.plan.name : "account"} plan gives you and how much of it is used. Every model counts in the same credits; Claude and Fable also have their own weekly pool inside the plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["ai-plan-overview"] })} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {onUpgrade && <Button size="sm" onClick={onUpgrade}><Crown className="w-3.5 h-3.5 mr-1.5" /> Upgrade</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground">Plan</div>
            <div className="text-lg font-bold text-foreground">{data.enabled ? data.plan.name : "Free"}{data.plan.subscribed ? " ✓" : ""}</div>
            {data.plan.expires_at && <div className="text-[11px] text-muted-foreground">until {dateText(data.plan.expires_at)}</div>}
          </div>
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Top-up credits</div>
            <div className="text-lg font-bold text-foreground">{n(data.balance.topup)}</div>
            <div className="text-[11px] text-muted-foreground">pay for chat past the plan and for extra images, messages and voice</div>
          </div>
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground">Granted credits</div>
            <div className="text-lg font-bold text-foreground">{n(data.balance.promotion)}</div>
            <div className="text-[11px] text-muted-foreground">{n(data.balance.credits_per_inr)} credits per ₹1 on top-up</div>
          </div>
        </div>

        <Group title="Credits (every model)">
          <Row label={`Credits this window${u.credits_window?.periodText ? ` (${u.credits_window.periodText})` : ""}`} meter={u.credits_window} resetLabel="Refills" />
          <Row label="Credits this week" meter={u.credits_week} resetLabel="Week ends" />
          <Row label="Claude credits this week (Sonnet, Opus, Haiku, Fable)" meter={u.claude_week} resetLabel="Week ends" />
          <Row label="Of which Claude Fable" meter={u.fable_week} resetLabel="Week ends" />
        </Group>

        {(u.chats_window || u.chats_week) && (
          <Group title="Chats started (no limit inside a chat)">
            <Row label={`New chats this window${u.chats_window?.periodText ? ` (${u.chats_window.periodText})` : ""}`} meter={u.chats_window} />
            <Row label="New chats this week" meter={u.chats_week} />
          </Group>
        )}

        <Group title="Pictures and voice">
          <Row label="Images and photo edits" meter={u.images} resetLabel="Resets" extraCredits={extra.image} />
          <Row label="Voice replies today" meter={u.voice_replies} resetLabel="Resets" extraCredits={extra.voicereply} />
          <Row label="Voice input today" meter={u.voice_input_minutes} unit="min" resetLabel="Resets" extraCredits={extra.voiceinput} />
        </Group>

        <Group title="WhatsApp">
          <Row label={`Scheduled messages${u.whatsapp?.dayLimit != null && u.whatsapp.dayLimit >= 0 ? ` (at most ${u.whatsapp.dayLimit < 0 ? "unlimited" : n(u.whatsapp.dayLimit)} a day)` : ""}`} meter={u.whatsapp} resetLabel="Resets" extraCredits={extra.whatsapp} />
          <Row label={`Free call minutes${u.call_minutes?.callsPerDay != null ? ` (${u.call_minutes.callsPerDay < 0 ? "unlimited" : n(u.call_minutes.callsPerDay)} calls a day, up to ${u.call_minutes.maxMinutes ?? "-"} min each)` : ""}`} meter={u.call_minutes} unit="min" resetLabel="Resets" />
          <div className="py-2 text-[11px] text-muted-foreground">Past the free minutes a call is paid per turn from your credits.</div>
        </Group>

        <Group title="Projects">
          <Row label="Cloud projects (folders on your own computer don't count)" meter={u.projects} />
        </Group>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Storage (Library)</div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-foreground">See how much Library storage you're using</span>
            <span className="text-sm font-medium text-foreground tabular-nums">
              {mbText(u.storage.usedMb)}{storageLimit !== null && storageLimit > 0 ? <span className="text-muted-foreground font-normal"> of {mbText(storageLimit)} used</span> : storageLimit !== null && storageLimit < 0 ? <span className="text-muted-foreground font-normal"> · Unlimited</span> : null}
            </span>
          </div>
          {storageLimit !== null && storageLimit > 0 && (
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
              <div className={`h-full rounded-full ${storagePct >= 100 ? "bg-red-500" : storagePct >= 80 ? "bg-amber-500" : "bg-foreground/70"}`} style={{ width: `${storagePct}%` }} />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="rounded-lg border border-border p-3 flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Files</div>
                <div className="text-xs text-muted-foreground">{mbText(u.storage.files.mb)} • {n(u.storage.files.count)} file{u.storage.files.count === 1 ? "" : "s"}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Images</div>
                <div className="text-xs text-muted-foreground">{mbText(u.storage.images.mb)} • {n(u.storage.images.count)} in the Library{u.storage.generatedImages ? `, ${n(u.storage.generatedImages)} made in chats` : ""}</div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Manage files in Library, and pictures made in chats in the hub's Images page.</p>
        </div>
      </div>
    </div>
  );
}
