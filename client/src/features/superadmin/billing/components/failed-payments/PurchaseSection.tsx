// Failed payments for Classgrid AI: what the person tried to buy, read from the notes the checkout put on the
// Razorpay order. When those notes weren't saved, all that is known is the amount.
import { Package } from "lucide-react";
import type { FailedPaymentDetail } from "./failedPaymentsApi";
import { InfoRow, SectionCard } from "./SectionCard";
import { formatInr, planNameOf, termLabel } from "./labels";

export function PurchaseSection({ item }: { item: FailedPaymentDetail }) {
  const { purchase } = item;
  const amount = <InfoRow label="Amount">{formatInr(item.amountInr)}</InfoRow>;

  return (
    <SectionCard icon={Package} title="What they tried to buy" note="From the checkout they started.">
      {purchase.kind === "plan" ? (
        <div>
          <InfoRow label="Plan">{planNameOf(purchase.planKey, purchase.planName) || "Not known"}</InfoRow>
          <InfoRow label="Length">{termLabel(purchase.term)}</InfoRow>
          <InfoRow label="Price">{purchase.student ? "Student price" : "Normal price"}</InfoRow>
          {amount}
        </div>
      ) : purchase.kind === "credits" ? (
        <div>
          <InfoRow label="Bought">AI credits</InfoRow>
          {amount}
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground pb-2">What this payment was for was not saved.</p>
          {amount}
        </div>
      )}
    </SectionCard>
  );
}
