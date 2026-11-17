// Failed payments for Classgrid AI: the top of one payment's page. The title says what was paid for in words
// ("₹499 for Pro plan, 1 month"), never a raw id.
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import type { FailedPaymentDetail } from "./failedPaymentsApi";
import { PaidLaterBadge } from "./PaidLaterBadge";
import { formatInr, formatWhen, purchaseInSentence, reasonLabel } from "./labels";

export function FailedPaymentHeader({ item, backTo }: { item: FailedPaymentDetail; backTo: string }) {
  const amount = formatInr(item.amountInr);
  const title = item.purchase.kind === "unknown" ? `${amount} payment` : `${amount} for ${purchaseInSentence(item.purchase)}`;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-3 min-w-0">
      <Button variant="ghost" size="sm" asChild className="px-2">
        <Link to={backTo}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to failed payments
        </Link>
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground break-words">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Failed on {formatWhen(item.failedAt)}. {reasonLabel(item.reason.key)}.
          </p>
        </div>
        <PaidLaterBadge paidLater={item.paidLater} />
      </div>
    </div>
  );
}
