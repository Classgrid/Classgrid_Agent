// Failed payments for Classgrid AI: the four numbers at the top of the list. "Not bought yet" counts each person's
// retries for the same thing once (the server groups them), so the rupees aren't counted twice.
import React from "react";
import { AlertTriangle, IndianRupee, RotateCcw, Users } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import type { FailedPaymentsSummary as Summary } from "./failedPaymentsApi";
import { formatCount, formatInr } from "./labels";

function StatCard({ icon: Icon, label, value, note }: { icon: React.ElementType; label: string; value: string; note: string }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5 min-w-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground mt-3 break-words">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{note}</p>
    </div>
  );
}

export function FailedPaymentsSummary({ summary, isLoading }: { summary: Summary | undefined; isLoading: boolean }) {
  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  // The summary failed to load: the list below still works, so leave the space empty instead of showing zeros
  if (!summary) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={AlertTriangle}
          label="Failed payments"
          value={formatCount(summary.failedCount)}
          note={`${formatCount(summary.last30DaysCount)} in the last 30 days`}
        />
        <StatCard icon={Users} label="People" value={formatCount(summary.peopleCount)} note="Who had a payment fail" />
        <StatCard
          icon={RotateCcw}
          label="Paid later"
          value={formatCount(summary.paidLaterCount)}
          note="Bought the same thing afterwards"
        />
        <StatCard
          icon={IndianRupee}
          label="Not bought yet"
          value={formatInr(summary.notBoughtYet?.amountInr)}
          note={`${formatCount(summary.notBoughtYet?.count)} tries with nothing bought since`}
        />
      </div>
      {summary.capped ? (
        <p className="text-xs text-muted-foreground">Only the newest 1,000 failed payments are counted.</p>
      ) : null}
    </div>
  );
}
