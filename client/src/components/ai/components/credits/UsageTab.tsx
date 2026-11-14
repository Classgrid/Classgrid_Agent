// The AI hub's Usage page (owner, 2026-11-14): every limit of the plan is separate and is shown as its own card
// with its own bar: the Cloudflare models' credits, the Claude credits (with Fable's share), chats, images, voice
// replies, voice input, WhatsApp messages, call minutes, projects, and the Library storage (files and images) as a
// storage meter. Fed by GET /api/ai/plan/overview.
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Image as ImageIcon, FileText, Wallet, BadgeCheck, Cpu, Sparkles, MessageSquare, Mic, Volume2, Phone, Send, FolderKanban, HardDrive } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Button } from "@/components/marketing_ui/button";
import { usePlanOverview, type Meter, n, limitText, dateText, mbText } from "./planOverview";

function Bar({ used, limit, thick = false }: { used: number; limit: number | null; thick?: boolean }) {
  if (limit === null || limit <= 0) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-foreground/70";
  return (
    <div className={`${thick ? "h-2" : "h-1.5"} rounded-full bg-muted overflow-hidden mt-2`}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Line({ label, meter, unit = "", resetLabel = "Resets", extraCredits }: { label: string; meter: Meter; unit?: string; resetLabel?: string; extraCredits?: number }) {
  if (!meter) return null;
  const { used, limit } = meter;
  const usedStr = unit ? `${n(used)} ${unit}` : n(used);
  const reset = meter.resetAt ? dateText(meter.resetAt) : null;
  const full = limit !== null && limit >= 0 && used >= limit;
  return (
    <div className="py-2.5 border-t border-border/60 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground tabular-nums">
          {limit === 0 ? <span className="text-muted-foreground">Not included</span>
            : limit === null || limit < 0 ? <>{usedStr} <span className="text-muted-foreground font-normal">· Unlimited</span></>
            : <>{usedStr} <span className="text-muted-foreground font-normal">of {limitText(limit, unit)}</span></>}
        </span>
      </div>
      <Bar used={used} limit={limit} />
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
        <span>{meter.periodText ? `Every ${meter.periodText}` : ""}</span>
        <span>{reset ? `${resetLabel} ${reset}` : ""}{full && extraCredits ? ` · extra: ${n(extraCredits)} credits each from top-up` : ""}</span>
      </div>
    </div>
  );
}

// One limit, one card
function Card({ icon: Icon, title, note, children }: { icon: React.ComponentType<{ className?: string }>; title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-3 shadow-sm">
      <div className="flex items-center gap-2 pt-1 pb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      {note && <p className="text-[11px] text-muted-foreground pb-1">{note}</p>}
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
            Each limit of your {data.enabled ? data.plan.name : "account"} plan is separate and tracked on its own: Cloudflare models, Claude models, chats, images, voice, WhatsApp, projects and storage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["ai-plan-overview"] })} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {onUpgrade && <Button size="sm" onClick={onUpgrade}><BadgeCheck className="w-3.5 h-3.5 mr-1.5" /> {data.plan.subscribed ? "Plans" : "Upgrade"}</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground">Plan</div>
            <div className="text-lg font-bold text-foreground">{data.enabled ? data.plan.name : "Free"}{data.plan.subscribed ? " ✓" : ""}</div>
            {data.plan.expires_at && <div className="text-[11px] text-muted-foreground">until {dateText(data.plan.expires_at)}</div>}
          </div>
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Top-up credits</div>
            <div className="text-lg font-bold text-foreground">{n(data.balance.topup)}</div>
            <div className="text-[11px] text-muted-foreground">for chat past the limits and for extra images, messages and voice</div>
          </div>
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground">Granted credits</div>
            <div className="text-lg font-bold text-foreground">{n(data.balance.promotion)}</div>
            <div className="text-[11px] text-muted-foreground">{n(data.balance.credits_per_inr)} credits per ₹1 on top-up</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card icon={Cpu} title="Cloudflare models" note="DeepSeek, GLM, Gemma, Llama, GPT-OSS, Mistral and Auto. Their own credits; Claude is not counted here.">
            <Line label={`Credits this window${u.credits_window?.periodText ? ` (${u.credits_window.periodText})` : ""}`} meter={u.credits_window} resetLabel="Refills" />
            <Line label="Credits this week" meter={u.credits_week} resetLabel="Week ends" />
          </Card>

          <Card icon={Sparkles} title="Claude models" note="Haiku, Sonnet, Opus and Fable. Their own weekly credits, separate from the Cloudflare models.">
            <Line label="Claude credits this week" meter={u.claude_week} resetLabel="Week ends" />
            <Line label="Claude Fable share (inside the Claude credits)" meter={u.fable_week} resetLabel="Week ends" />
          </Card>

          <Card icon={MessageSquare} title="Chats" note="New chats you may start. There is no limit inside a chat.">
            <Line label={`New chats this window${u.chats_window?.periodText ? ` (${u.chats_window.periodText})` : ""}`} meter={u.chats_window} />
            <Line label="New chats this week" meter={u.chats_week} />
            {!u.chats_window && !u.chats_week && <p className="text-sm text-muted-foreground py-2">No limit on new chats.</p>}
          </Card>

          <Card icon={ImageIcon} title="Images">
            <Line label="Images and photo edits" meter={u.images} resetLabel="Resets" extraCredits={extra.image} />
          </Card>

          <Card icon={Volume2} title="Voice replies">
            <Line label="Answers read aloud today" meter={u.voice_replies} resetLabel="Resets" extraCredits={extra.voicereply} />
          </Card>

          <Card icon={Mic} title="Voice input">
            <Line label="Minutes of speech today" meter={u.voice_input_minutes} unit="min" resetLabel="Resets" extraCredits={extra.voiceinput} />
            {!u.voice_input_minutes && <p className="text-sm text-muted-foreground py-2">No limit on voice input.</p>}
          </Card>

          <Card icon={Send} title="WhatsApp messages">
            <Line label={`Scheduled and sent messages${u.whatsapp?.dayLimit != null && u.whatsapp.dayLimit >= 0 ? ` (at most ${u.whatsapp.dayLimit < 0 ? "unlimited" : n(u.whatsapp.dayLimit)} a day)` : ""}`} meter={u.whatsapp} resetLabel="Resets" extraCredits={extra.whatsapp} />
          </Card>

          <Card icon={Phone} title="WhatsApp calls" note="Past the free minutes a call is paid per turn from your credits.">
            <Line label="Free call minutes" meter={u.call_minutes} unit="min" resetLabel="Resets" />
            {u.call_minutes?.callsPerDay != null && (
              <div className="flex justify-between text-[12px] text-muted-foreground py-2 border-t border-border/60">
                <span>Calls a day: {u.call_minutes.callsPerDay < 0 ? "unlimited" : n(u.call_minutes.callsPerDay)}</span>
                <span>Longest call: {u.call_minutes.maxMinutes ?? "-"} min</span>
              </div>
            )}
          </Card>

          <Card icon={FolderKanban} title="Projects" note="Cloud projects. Folders on your own computer don't count.">
            <Line label="Projects" meter={u.projects} />
          </Card>

          <Card icon={HardDrive} title="Storage (Library)">
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <span className="text-sm text-foreground">Used</span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {mbText(u.storage.usedMb)}{storageLimit !== null && storageLimit > 0 ? <span className="text-muted-foreground font-normal"> of {mbText(storageLimit)}</span> : storageLimit !== null && storageLimit < 0 ? <span className="text-muted-foreground font-normal"> · Unlimited</span> : null}
              </span>
            </div>
            <Bar used={u.storage.usedMb} limit={storageLimit} thick />
            {storageLimit !== null && storageLimit > 0 && <div className="text-[11px] text-muted-foreground mt-1">{storagePct}% used</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 mb-2">
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
            <p className="text-[11px] text-muted-foreground pb-1">Manage files in Library, and pictures made in chats in the hub's Images page.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
