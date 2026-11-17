// Failed payments for Classgrid AI: the person's other failed payments (up to 10, newest first), each one opening
// its own page. The list's filters ride along in the link, so "Back to failed payments" still returns to them.
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import type { FailedPaymentDetail } from "./failedPaymentsApi";
import { SectionCard } from "./SectionCard";
import { formatDay, formatInr, purchaseLabel, reasonLabel } from "./labels";

export function OtherTriesSection({ item, fromList, className }: { item: FailedPaymentDetail; fromList?: string; className?: string }) {
  const tries = item.otherTries ?? [];
  return (
    <SectionCard icon={History} title="Other failed payments from them" className={className}>
      {tries.length === 0 ? (
        <p className="text-sm text-muted-foreground">This is their only failed payment.</p>
      ) : (
        <ul>
          {tries.map((t) => (
            <li key={t.id} className="border-b border-border last:border-b-0">
              <Link
                to={`/super-admin/billing/failed-payments/${t.id}`}
                state={fromList !== undefined ? { fromList } : undefined}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2.5 px-2 -mx-2 rounded-md text-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-muted-foreground">{formatDay(t.failedAt)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground">{purchaseLabel(t.purchase)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground font-medium">{formatInr(t.amountInr)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground">{reasonLabel(t.reasonKey)}</span>
                <span className="text-muted-foreground">·</span>
                <span className={t.paidLater ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400"}>
                  {t.paidLater ? "Paid later" : "Not paid yet"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
