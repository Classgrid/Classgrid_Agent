/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React from 'react';
import { XCircle, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { usePlanOverview } from '@/features/shared/queries/usePlanOverview';
import { openPricing, usePlayManageUrl } from './planInfo';

export interface InsufficientCreditsCardProps {
  onDismiss: () => void;
  /** The top-up flow (Settings > Billing): the button on a paid plan, and while the plan is not known */
  onUpgrade: () => void;
  refreshDate: Date;
  /** The old "ai_quota_exceeded|<reset>|<model>" form (the server no longer sends the model): only used while the plan is not known. */
  modelName?: string;
  onSwitchToAuto?: () => void;
}

export function InsufficientCreditsCard({
  onDismiss,
  onUpgrade,
  refreshDate,
  modelName,
  onSwitchToAuto
}: InsufficientCreditsCardProps) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(refreshDate);

  // The plan (owner, 2026-11-17): known once the overview is in, plans are on and plan limits apply (staff have none)
  const { data: overview } = usePlanOverview();
  const plan = overview?.enabled && overview.plan?.limits && overview.plan.name ? overview.plan : null;
  const free = plan?.key === "free";
  // (a phone plan on hold or paused: fixed in Google Play, never bought again here)
  const playUrl = usePlayManageUrl();

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <XCircle className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-card-foreground">
          {plan ? `You've reached your ${plan.name} plan's limit` : "You've reached your limit"}
        </h3>
      </div>

      {/* Body Text */}
      <p className="mb-5 text-[15px] leading-relaxed text-muted-foreground">
        {`It comes back on ${formattedDate}.`}
      </p>

      {/* Buttons */}
      <div className="flex items-center justify-between mt-2">
        <Button
          variant="outline"
          onClick={onDismiss}
        >
          Dismiss
        </Button>

        {!plan && modelName && onSwitchToAuto && (
          <Button variant="outline" onClick={onSwitchToAuto}>
            Switch to Auto
          </Button>
        )}

        <Button
          variant="outline"
          onClick={free ? (playUrl ? undefined : openPricing) : onUpgrade}
          disabled={free && !!playUrl}
          title={free && playUrl ? "Change it in the Classgrid phone app, under Settings > Billing" : undefined}
          className="relative h-10 rounded-lg border-border bg-accent px-4 md:px-6 text-sm font-medium tracking-tight text-foreground/90 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-accent/80 hover:border-border hover:text-foreground cursor-pointer flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {plan ? (free ? (playUrl ? "Managed on your phone" : "See plans") : "Top up") : "Purchase Credits"}
        </Button>
      </div>
    </div>
  );
}
