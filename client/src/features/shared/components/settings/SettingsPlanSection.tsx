// Settings → Plan, built exactly like the owner's approved mockup (2026-11-14): the plan card (name, Subscribed,
// price and paid-until, Upgrade and Renew), "What <plan> gives you" as plain rows (name left, number right),
// then "Past the plan" with Buy credits and See usage.
import React from "react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { usePlanOverview, usePlans, inr, limitText, dayText, periodText, mbText, n } from "@/features/shared/queries/usePlanOverview";
import { useSettingsSection, settingsSections } from "@/features/shared/settings/settingsSections";
import { useUserProfile } from "@/features/shared/queries/useUserProfile";

const every = (value: any, unit: any) => (Number(value) === 1 ? `a ${unit}` : `every ${periodText(value, unit)}`);
const primary = "h-[34px] px-3.5 rounded-lg bg-foreground text-background text-[13px] font-medium inline-flex items-center cursor-pointer hover:opacity-90";
const plain = "h-[34px] px-3.5 rounded-lg bg-black/[0.06] dark:bg-white/[0.1] text-foreground text-[13px] font-medium inline-flex items-center cursor-pointer hover:bg-black/[0.09] dark:hover:bg-white/[0.14]";

function H3({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] font-semibold text-foreground mt-7 mb-2">{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card">{children}</div>;
}
function R({ t, v }: { t: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-3.5 border-b border-border last:border-b-0">
      <span className="text-sm text-foreground">{t}</span>
      <span className="text-sm text-muted-foreground text-right whitespace-nowrap tabular-nums">{v}</span>
    </div>
  );
}

export function SettingsPlanSection() {
  const { data, isLoading } = usePlanOverview();
  const { data: plans } = usePlans();
  const { data: profile } = useUserProfile();
  const { go } = useSettingsSection(settingsSections({ role: profile?.role }));

  if (isLoading || !data) return <div className="flex flex-col gap-4"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;

  const L = data.plan.limits;
  const name = data.enabled ? data.plan.name : "Free";
  const subscribed = data.plan.subscribed;
  const row = (plans?.plans || []).find((p) => p.key === data.plan.key);
  const monthly = row && row.price_inr_monthly > 0 ? row.price_inr_monthly : 0;
  const buyable = (plans?.plans || []).filter((p) => !p.coming_soon && p.key !== "free" && p.price_inr_monthly > 0);
  const onTop = subscribed && buyable.length > 0 && buyable[buyable.length - 1]?.key === data.plan.key;
  const under = [
    monthly ? `${inr(monthly)} a month` : "",
    data.plan.expires_at ? `paid until ${dayText(data.plan.expires_at)}` : subscribed ? (data.plan.billing === "granted" ? "granted by Classgrid, no end date" : "no end date") : "",
    subscribed ? "does not renew by itself" : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="max-w-[760px]">
      <h2 className="text-xl font-semibold text-foreground">Plan</h2>
      <p className="text-sm text-muted-foreground mt-1">The plan you are on and what it gives you.</p>

      <div className="mt-5">
        <Card>
          <div className="flex items-center justify-between gap-6 px-6 py-5 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="text-[22px] font-semibold text-foreground">{name}</span>
                {subscribed
                  ? <span className="inline-flex items-center h-[22px] px-2.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-medium">Subscribed</span>
                  : <span className="inline-flex items-center h-[22px] px-2.5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-muted-foreground text-xs font-medium">Free</span>}
              </div>
              {under && <div className="text-sm text-muted-foreground mt-1.5">{under}</div>}
            </div>
            <div className="flex items-center gap-2">
              {data.enabled && !onTop && <button type="button" className={primary} onClick={() => go("billing")}>Upgrade</button>}
              {subscribed && monthly > 0 && <button type="button" className={plain} onClick={() => go("billing")}>Renew for {inr(monthly)}</button>}
            </div>
          </div>
        </Card>
      </div>

      {L && (
        <>
          <H3>What {name} gives you</H3>
          <Card>
            <R t="New chats you can start" v={`${limitText(L.chats_per_window)} ${every(L.window_reset_value, L.window_reset_unit)}`} />
            <R t="Messages inside a chat" v="No limit" />
            <R t="DeepSeek, GLM and other models" v={`${limitText(L.tokens_per_window, "credits")} ${every(L.window_reset_value, L.window_reset_unit)} · ${limitText(L.tokens_per_week)} a week`} />
            <R t="Claude models" v={L.claude_credits_per_week === 0 ? "Not included" : `${limitText(L.claude_credits_per_week, "credits")} a week${L.fable_share_percent > 0 ? ` · Fable up to ${L.fable_share_percent}% of it` : ""}`} />
            <R t="Images and photo edits" v={`${limitText(L.images_per_period)} ${every(L.images_reset_value, L.images_reset_unit)}`} />
            <R t="Talking with the AI" v={`${limitText(L.voice_input_minutes_per_day, "minutes")} a day`} />
            <R t="Answers read aloud" v={`${limitText(L.voice_replies_per_day)} a day`} />
            <R t="WhatsApp call time" v={`${limitText(L.call_minutes_per_period, "minutes")} ${every(L.call_reset_value, L.call_reset_unit)}`} />
            <R t="WhatsApp calls in a day" v={`Up to ${limitText(L.calls_per_day)}`} />
            <R t="One call can last" v={`Up to ${n(L.call_max_minutes)} minutes`} />
            <R t="Cloud projects" v={limitText(L.projects_max)} />
            <R t="Context window" v={`${n(L.context_tokens / 1000)}K tokens`} />
            <R t="Thinking" v={(L.thinking_modes || []).map((m: string) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")} />
            <R t="Files" v={`${n(L.upload_max_mb)} MB per upload · ${L.library_storage_mb < 0 ? "unlimited" : mbText(L.library_storage_mb)} Library · ${limitText(L.devices_max)} devices`} />
          </Card>
        </>
      )}

      <H3>Past the plan</H3>
      <Card>
        <div className="flex items-center justify-between gap-6 px-5 py-4 border-b border-border">
          <div><div className="text-sm font-medium text-foreground">Top-up credits</div><div className="text-xs text-muted-foreground mt-0.5">Used after the plan's limits: more chat, extra images, messages and voice.</div></div>
          <button type="button" className={plain} onClick={() => go("billing")}>Buy credits</button>
        </div>
        <div className="flex items-center justify-between gap-6 px-5 py-4">
          <div><div className="text-sm font-medium text-foreground">Usage</div><div className="text-xs text-muted-foreground mt-0.5">How much of each limit you have used.</div></div>
          <button type="button" className={plain} onClick={() => go("usage")}>See usage</button>
        </div>
      </Card>
    </div>
  );
}
