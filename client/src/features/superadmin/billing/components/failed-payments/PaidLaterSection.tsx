// Failed payments for Classgrid AI: did the person buy it after all? "Paid later" means the same plan (any length)
// or AI credits from the same person afterwards. A different plan doesn't count, but it still shows under
// "Their payments since", so nothing they paid is hidden.
import { RotateCcw } from "lucide-react";
import type { FailedPaymentDetail } from "./failedPaymentsApi";
import { SectionCard } from "./SectionCard";
import { formatDay, formatInr, planLabel, planNameOf, purchaseInSentence, termLabel } from "./labels";

function paidLaterText(item: FailedPaymentDetail) {
  const later = item.paidLater;
  if (!later) {
    if (item.purchase.kind === "unknown") return "Not yet.";
    return `Not yet. Nothing for ${purchaseInSentence(item.purchase)} from them since this one.`;
  }
  const when = formatDay(later.at);
  const amount = formatInr(later.amountInr);
  let text: string;
  if (later.match === "credits") {
    text = `Yes. They bought AI credits on ${when} for ${amount}.`;
  } else if (later.match === "other_term") {
    text = `Yes. They bought the ${planNameOf(later.planKey, later.planName)} plan for ${termLabel(later.term)} instead, on ${when} for ${amount}.`;
  } else {
    // For a payment whose purpose wasn't saved, say what the later payment was rather than "Not known"
    const what =
      item.purchase.kind === "unknown"
        ? later.planKey
          ? planLabel(later.planKey, later.planName, later.term)
          : "AI credits"
        : purchaseInSentence(item.purchase);
    text = `Yes. They bought ${what} on ${when} for ${amount}.`;
  }
  if (later.sameTry) text += " They paid in the same checkout, right after this one.";
  return text;
}

export function PaidLaterSection({ item }: { item: FailedPaymentDetail }) {
  const later = item.laterPayments ?? [];
  return (
    <SectionCard icon={RotateCcw} title="Did they pay later?">
      <p className="text-sm text-foreground">{paidLaterText(item)}</p>
      {later.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-muted-foreground">Their payments since</h4>
          <ul className="mt-1">
            {later.map((p) => (
              <li key={p.paymentId} className="text-sm text-foreground py-2 border-b border-border last:border-b-0 break-words">
                {formatDay(p.at)} · {p.kind === "plan" ? planLabel(p.planKey, p.planName, p.term) : "AI credits"} ·{" "}
                {formatInr(p.amountInr)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}
