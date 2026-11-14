// Settings → Plan: the plan the user is on and what it gives them, as plain rows (owner's mockup, 2026-11-14).
// Upgrade, renew and credits live in Settings → Billing; what is used lives in Settings → Usage.
import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { usePlanOverview, usePlans, inr, limitText, dayText, periodText, mbText, n } from "@/features/shared/queries/usePlanOverview";
import { useSettingsSection, settingsSections } from "@/features/shared/settings/settingsSections";
import { useUserProfile } from "@/features/shared/queries/useUserProfile";
import { Section, Row, btn, btnPrimary } from "./SettingsBits";

const every = (value: any, unit: any) => (Number(value) === 1 ? `a ${unit}` : `every ${periodText(value, unit)}`);

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
  const price = row && row.price_inr_monthly > 0 ? `${inr(row.price_inr_monthly)} a month` : "";
  const buyable = (plans?.plans || []).filter((p) => !p.coming_soon && p.key !== "free" && p.price_inr_monthly > 0);
  const onTop = subscribed && buyable.length > 0 && buyable[buyable.length - 1]?.key === data.plan.key;
  const howText = data.plan.billing === "granted" ? "granted by Classgrid" : data.plan.billing === "prepaid_yearly" ? "paid for a year" : data.plan.billing === "manual_monthly" ? "paid for a month" : "";
  const untilText = data.plan.expires_at ? `until ${dayText(data.plan.expires_at)}` : subscribed ? "no end date" : "";
  const under = [price, howText, untilText, subscribed ? "does not renew by itself" : ""].filter(Boolean).join(" · ");

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Plan</h2>
      <p className="text-sm text-muted-foreground mt-1">The plan you are on and what it gives you.</p>

      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-6 px-5 py-5 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-semibold text-foreground">{name}</span>
              {subscribed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" /> Subscribed</span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-black/[0.05] dark:bg-white/[0.07] px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Free</span>
              )}
            </div>
            {under && <div className="text-xs text-muted-foreground mt-1">{under}</div>}
          </div>
          <div className="flex items-center gap-2">
            {!onTop && <button type="button" className={btnPrimary} onClick={() => go("billing")}>Upgrade</button>}
            {subscribed && price && <button type="button" className={btn} onClick={() => go("billing")}>Renew for {inr(row!.price_inr_monthly)}</button>}
            {!subscribed && !data.enabled && <span className="text-xs text-muted-foreground">Plans are not open yet</span>}
          </div>
        </div>
      </div>

      {L && (
        <Section title={`What ${name} gives you`}>
          <Row title="New chats you can start" value={`${limitText(L.chats_per_window)} ${every(L.window_reset_value, L.window_reset_unit)}`} />
          <Row title="Messages inside a chat" value="No limit" />
          <Row title="DeepSeek, GLM and other models" value={`${limitText(L.tokens_per_window, "credits")} ${every(L.window_reset_value, L.window_reset_unit)} · ${limitText(L.tokens_per_week)} a week`} />
          <Row title="Claude models" value={L.claude_credits_per_week === 0 ? "Not included" : `${limitText(L.claude_credits_per_week, "credits")} a week${L.fable_share_percent > 0 ? ` · Fable up to ${L.fable_share_percent}% of it` : ""}`} />
          <Row title="Images and photo edits" value={`${limitText(L.images_per_period)} ${every(L.images_reset_value, L.images_reset_unit)}`} />
          <Row title="Talking with the AI" value={`${limitText(L.voice_input_minutes_per_day, "minutes")} a day`} />
          <Row title="Answers read aloud" value={`${limitText(L.voice_replies_per_day)} a day`} />
          <Row title="Free WhatsApp call time" value={`${limitText(L.call_minutes_per_period, "minutes")} ${every(L.call_reset_value, L.call_reset_unit)}`} />
          <Row title="WhatsApp calls in a day" value={`Up to ${limitText(L.calls_per_day)}`} />
          <Row title="One call can last" value={`Up to ${n(L.call_max_minutes)} minutes`} />
          <Row title="WhatsApp sends by the AI (reminders, scheduled messages)" value={`${limitText(L.whatsapp_per_period)} ${every(L.whatsapp_reset_value, L.whatsapp_reset_unit)} · ${limitText(L.whatsapp_per_day)} a day`} />
          <Row title="Cloud projects" value={limitText(L.projects_max)} />
          <Row title="Context window" value={`${n(L.context_tokens / 1000)}K tokens`} />
          <Row title="Thinking" value={(L.thinking_modes || []).map((m: string) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")} />
          <Row title="Files" value={`${n(L.upload_max_mb)} MB per upload · ${L.library_storage_mb < 0 ? "unlimited" : mbText(L.library_storage_mb)} Library · ${limitText(L.devices_max)} devices`} />
        </Section>
      )}

      <Section title="Past the plan">
        <Row title="Top-up credits" desc="Used after the plan's limits: more chat, extra images, messages and voice.">
          <button type="button" className={btn} onClick={() => go("billing")}>Buy credits</button>
        </Row>
        <Row title="Usage" desc="How much of each limit you have used.">
          <button type="button" className={btn} onClick={() => go("usage")}>See usage</button>
        </Row>
      </Section>
    </div>
  );
}
