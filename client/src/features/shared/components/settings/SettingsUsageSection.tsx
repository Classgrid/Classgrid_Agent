// Settings > Usage (owner, 2026-11-14, built from the HTML page he approved): one bar per limit with its name on
// top, the percent used on the right, the bar under it and one line under the bar saying what it counts and when
// it resets. Then the usage history: credits per day and the last requests. No credits or buying here: that is
// Settings > Billing.
import { useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { usePlanOverview, useUsageHistory, whenText, inText, timeText, dayText, n, type Meter } from "@/features/shared/queries/usePlanOverview";
// (the model's name as the model picker shows it, shared with the super admin's user page)
import { modelName } from "./modelName";

function pctOf(m: Meter) {
  if (!m || m.limit === null || m.limit <= 0) return 0;
  return Math.min(100, Math.round((m.used / m.limit) * 100));
}

// (a limit the plan does not have at all, limit 0, is not shown: owner, 2026-11-16, "if it is not in the plan why show it")
const inPlan = (m: Meter | null | undefined): m is NonNullable<Meter> => !!m && m.limit !== 0;
function Bar({ name, m, line }: { name: string; m: Meter; line: string }) {
  if (!inPlan(m)) return null;
  const unlimited = m.limit === null || (m.limit !== null && m.limit < 0);
  const pct = pctOf(m);
  const right = unlimited ? "No limit" : `${pct}% used`;
  return (
    <div className="px-5 py-4 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px] text-foreground">{name}</span>
        <span className={`text-sm tabular-nums whitespace-nowrap ${pct >= 100 ? "text-red-500" : "text-foreground/80"}`}>{right}</span>
      </div>
      <div className="h-2 rounded-full bg-black/[0.07] dark:bg-white/[0.1] overflow-hidden mt-2.5">
        {!unlimited && <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-[#7aa7ff]"}`} style={{ width: `${pct}%` }} />}
      </div>
      <div className="text-[13px] text-muted-foreground mt-2">{line}</div>
    </div>
  );
}

export function SettingsUsageSection() {
  const { data, isLoading } = usePlanOverview();
  const [page, setPage] = useState(1);
  const { data: hist, refetch: refetchHist, isFetching: histLoading } = useUsageHistory(14, page);
  const asOf = hist?.asOf ? new Date(hist.asOf).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";
  if (isLoading || !data) {
    const row = (name: string, w: string) => (
      <div className="px-5 py-4 border-b border-border last:border-b-0">
        <div className="flex items-baseline justify-between gap-4"><span className="text-[15px] text-foreground">{name}</span><Skeleton className="h-4 w-16 rounded" /></div>
        <div className="h-2 rounded-full bg-black/[0.07] dark:bg-white/[0.1] mt-2.5" />
        <Skeleton className={`h-3 ${w} rounded mt-2.5`} />
      </div>
    );
    return (
      <div className="max-w-[860px]">
        <h2 className="text-xl font-semibold text-foreground">Usage</h2>
        <Skeleton className="h-4 w-72 rounded mt-3" />
        <div className="rounded-xl border border-border bg-card mt-5">
          {row("Session limit", "w-96")}{row("Mid models limit", "w-80")}{row("Claude limit", "w-72")}{row("Fable limit", "w-80")}
        </div>
        <div className="text-[13px] font-semibold text-foreground mt-7 mb-2">WhatsApp and voice</div>
        <div className="rounded-xl border border-border bg-card">
          {row("WhatsApp messages limit", "w-80")}{row("WhatsApp calls limit", "w-80")}{row("Voice limit", "w-72")}{row("Read-aloud limit", "w-80")}
        </div>
      </div>
    );
  }
  const u = data.usage;
  const weekEnd = u.credits_week?.resetAt || u.claude_week?.resetAt || null;
  const weekLine = weekEnd ? `Resets ${whenText(weekEnd)}` : "";
  const ofText = (m: Meter, unit: string) => (!m || m.limit === null ? "" : m.limit < 0 ? `${n(m.used)} ${unit} used` : `${n(m.used)} of ${n(m.limit)} ${unit}`);
  const maxDay = Math.max(1, ...(hist?.perDay.map((d) => d.credits) || [1]));

  return (
    <div className="max-w-[860px]">
      <h2 className="text-xl font-semibold text-foreground">Usage</h2>
      {weekEnd && <p className="text-[15px] text-foreground mt-2">Your weekly limit resets {whenText(weekEnd)}.</p>}

      <div className="rounded-xl border border-border bg-card mt-5">
        {u.credits_window && <Bar name="Session limit" m={u.credits_window} line={`Mid models (DeepSeek, GLM and others) · ${u.credits_window.periodText || "5 hours"} from your first message · ${u.credits_window.resetAt ? `Resets ${inText(u.credits_window.resetAt)}` : ""}`} />}
        {u.credits_week && <Bar name="Mid models limit" m={u.credits_week} line={`DeepSeek, GLM and other models · Weekly · ${weekLine}`} />}
        {u.claude_week && <Bar name="Claude limit" m={u.claude_week} line={`Sonnet, Opus and Haiku · Weekly · ${weekLine}`} />}
        {u.fable_week && <Bar name="Fable limit" m={u.fable_week} line={`Up to ${data.plan.limits?.fable_share_percent ?? 50}% of your Claude limit · Weekly · ${weekLine}`} />}
      </div>

      {[u.whatsapp, u.call_minutes, u.voice_input_minutes, u.voice_replies].some(inPlan) && (
        <>
          <div className="text-[13px] font-semibold text-foreground mt-7 mb-2">WhatsApp and voice</div>
          <div className="rounded-xl border border-border bg-card">
            {u.whatsapp && <Bar name="WhatsApp messages limit" m={u.whatsapp} line={`Messages the AI sends · ${ofText(u.whatsapp, "messages")} ${u.whatsapp.periodText ? `this ${u.whatsapp.periodText.replace(/^1 /, "")}` : ""} · ${u.whatsapp.resetAt ? `Resets ${dayText(u.whatsapp.resetAt)}` : ""}`} />}
            {u.call_minutes && <Bar name="WhatsApp calls limit" m={u.call_minutes} line={`Call minutes with the AI · ${ofText(u.call_minutes, "minutes")} ${u.call_minutes.periodText ? `this ${u.call_minutes.periodText.replace(/^1 /, "")}` : ""} · ${u.call_minutes.resetAt ? `Resets ${dayText(u.call_minutes.resetAt)}` : ""}`} />}
            {u.voice_input_minutes && <Bar name="Voice limit" m={u.voice_input_minutes} line={`Minutes talking with the AI · ${ofText(u.voice_input_minutes, "minutes")} today · Resets at midnight`} />}
            {u.voice_replies && <Bar name="Read-aloud limit" m={u.voice_replies} line={`Answers the AI reads out loud · ${ofText(u.voice_replies, "replies")} today · Resets at midnight`} />}
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground mt-2.5">Last updated: less than a minute ago</p>

      {hist && (
        <>
          <div className="flex items-center justify-between mt-9 mb-2">
            <div className="text-lg font-semibold text-foreground">Usage history</div>
            <div className="text-xs text-muted-foreground">{dayText(hist.since)} – {dayText(new Date().toISOString())}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-5"><div className="text-sm text-muted-foreground">Credits used</div><div className="text-[26px] font-semibold mt-1">{n(hist.total.credits)}</div></div>
            <div className="rounded-xl border border-border bg-card p-5"><div className="text-sm text-muted-foreground">Requests</div><div className="text-[26px] font-semibold mt-1">{n(hist.total.requests)}</div></div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 mt-3">
            <div className="text-[15px] font-semibold text-foreground">Credits per day</div>
            <div className="flex items-end gap-1.5 h-[160px] mt-4 border-b border-border px-1">
              {hist.perDay.map((d) => (
                <div key={d.day} className="flex-1 bg-[#7aa7ff] rounded-t" style={{ height: `${Math.max(d.credits ? 2 : 0, Math.round((d.credits / maxDay) * 100))}%` }} title={`${dayText(d.day)}: ${n(d.credits)} credits, ${d.requests} requests`} />
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5"><span>{dayText(hist.perDay[0]?.day)}</span><span>{dayText(hist.perDay[hist.perDay.length - 1]?.day)}</span></div>
          </div>

          <div className="flex items-center justify-between mt-8 mb-2">
            <div className="text-lg font-semibold text-foreground">Usage events</div>
            <div className="text-xs text-muted-foreground">{n(hist.eventsTotal)} requests in {hist.days} days</div>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            {hist.events.length ? (
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground text-left"><th className="font-medium px-5 py-3 border-b border-border">Time</th><th className="font-medium px-5 py-3 border-b border-border">Model</th><th className="font-medium px-5 py-3 border-b border-border">What</th><th className="font-medium px-5 py-3 border-b border-border text-right">Credits</th></tr></thead>
                <tbody>
                  {hist.events.map((e, i) => (
                    <tr key={i}><td className="px-5 py-3 border-b border-border last:border-b-0 whitespace-nowrap">{timeText(e.at)}</td><td className="px-5 py-3 border-b border-border">{modelName(e.model)}</td><td className="px-5 py-3 border-b border-border">{e.what}</td><td className="px-5 py-3 border-b border-border text-right tabular-nums">{n(e.credits)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">No requests in the last {hist.days} days.</div>
            )}
            {hist.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <button type="button" aria-label="Previous page" title="Previous page" disabled={page <= 1 || histLoading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-8 w-9 rounded-lg border border-border flex items-center justify-center text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"><ChevronLeft className="w-4 h-4" /></button>
                  <button type="button" aria-label="Next page" title="Next page" disabled={page >= hist.pages || histLoading} onClick={() => setPage((p) => Math.min(hist.pages, p + 1))} className="h-8 w-9 rounded-lg border border-border flex items-center justify-center text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"><ChevronRight className="w-4 h-4" /></button>
                  <span className="text-xs text-muted-foreground ml-2">Page {page} of {hist.pages}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>As of {asOf}</span>
                  <button type="button" aria-label="Refresh" title="Refresh" onClick={() => refetchHist()} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"><RefreshCw className={`w-3.5 h-3.5 ${histLoading ? "animate-spin" : ""}`} /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
