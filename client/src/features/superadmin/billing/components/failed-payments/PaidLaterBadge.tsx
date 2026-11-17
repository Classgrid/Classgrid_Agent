// Failed payments for Classgrid AI: did the person pay afterwards? Neutral when they did and amber when not
// (never green: the owner's rule for the app's own look).
import { Badge } from "@/components/marketing_ui/badge";
import type { PaidLater } from "./failedPaymentsApi";
import { formatDay } from "./labels";

export function PaidLaterBadge({ paidLater }: { paidLater: PaidLater | null }) {
  if (paidLater) {
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        Paid on {formatDay(paidLater.at)}
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="whitespace-nowrap">
      Not paid yet
    </Badge>
  );
}
