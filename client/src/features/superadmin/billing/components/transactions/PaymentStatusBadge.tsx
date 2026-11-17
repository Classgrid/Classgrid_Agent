// Where a payment stands. Neutral for paid, amber for refunded, red for failed, outline for not finished: no green
// anywhere in the app's own look (owner's rule).
import React from "react";
import { Badge } from "@/components/marketing_ui/badge";
import { statusLabel } from "./paymentFormat";
import type { PaymentRow } from "./paymentsApi";

type Row = Pick<PaymentRow, "kind" | "status" | "plan" | "amountInr" | "refundedInr">;

const VARIANT = {
  paid: "neutral",
  refunded: "warning",
  failed: "danger",
  pending: "outline",
} as const;

export function PaymentStatusBadge({ row, className }: { row: Row; className?: string }) {
  return (
    <Badge variant={VARIANT[row.status] || "outline"} className={className}>
      {statusLabel(row)}
    </Badge>
  );
}
