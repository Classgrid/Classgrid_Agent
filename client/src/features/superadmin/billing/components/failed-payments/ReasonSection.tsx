// Failed payments for Classgrid AI: why the payment failed, in plain words, with Razorpay's own text under it and
// how they paid. The UPI ID and card id are hidden when the webhook is saved, so only the bank, wallet, card
// network and last four digits can be shown.
import { AlertTriangle } from "lucide-react";
import type { FailedPaymentDetail } from "./failedPaymentsApi";
import { InfoRow, SectionCard } from "./SectionCard";
import { methodLabel, reasonLabel, reasonSentence, whoLabel } from "./labels";

function paidWith(item: FailedPaymentDetail) {
  const method = methodLabel(item.method);
  const { bank, wallet, cardNetwork, cardLast4 } = item.payment;
  if (bank) return `${method} · ${bank}`;
  if (wallet) return `${method} · ${wallet}`;
  if (cardNetwork || cardLast4) return `${method} · ${[cardNetwork, cardLast4 ? `•••• ${cardLast4}` : ""].filter(Boolean).join(" ")}`;
  return method;
}

export function ReasonSection({ item }: { item: FailedPaymentDetail }) {
  return (
    <SectionCard icon={AlertTriangle} title="Why it failed">
      <p className="text-base font-semibold text-foreground">{reasonLabel(item.reason.key)}</p>
      <p className="text-sm text-muted-foreground mt-1">{reasonSentence(item.reason.key)}</p>
      <div className="mt-3">
        <InfoRow label="Stopped by">{whoLabel(item.reason.who)}</InfoRow>
        <InfoRow label="Razorpay said">{item.reason.razorpayText || "Nothing"}</InfoRow>
        <InfoRow label="Paid with">{paidWith(item)}</InfoRow>
      </div>
    </SectionCard>
  );
}
