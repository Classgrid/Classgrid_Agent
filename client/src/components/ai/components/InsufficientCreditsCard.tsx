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

export interface InsufficientCreditsCardProps {
  onDismiss: () => void;
  onUpgrade: () => void;
  refreshDate: Date;
  /** Set when an expensive model (e.g. Claude Opus) is the reason; offers switching to Auto. */
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

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <XCircle className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-card-foreground">
          {modelName ? `Not enough credits for ${modelName}` : "Insufficient AI Credits"}
        </h3>
      </div>

      {/* Body Text */}
      <p className="mb-5 text-[15px] leading-relaxed text-muted-foreground">
        {modelName ? (
          <>
            This model costs more than you have left this week. Switch to <span className="font-medium text-card-foreground">Auto</span> to keep
            chatting, or purchase AI Credits. Your weekly quota refreshes on {formattedDate}.
          </>
        ) : (
          <>
            You've used up your AI Credits for now. To continue using the AI, purchase more AI Credits.
            Your plan's baseline quota will refresh on {formattedDate}.
          </>
        )}
      </p>

      {/* Buttons */}
      <div className="flex items-center justify-between mt-2">
        <Button
          variant="outline"
          onClick={onDismiss}
        >
          Dismiss
        </Button>

        {modelName && onSwitchToAuto && (
          <Button variant="outline" onClick={onSwitchToAuto}>
            Switch to Auto
          </Button>
        )}

        <Button
          variant="outline"
          onClick={onUpgrade}
          className="relative h-10 rounded-lg border-border bg-accent px-4 md:px-6 text-sm font-medium tracking-tight text-foreground/90 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-accent/80 hover:border-border hover:text-foreground cursor-pointer flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Purchase Credits
        </Button>
      </div>
    </div>
  );
}
