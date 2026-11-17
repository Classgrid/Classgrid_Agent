// Four small cards over the list: how many payments match the filters, the money that stayed paid, refunds and
// failures. They count every matching payment, not just the page on screen.
import React from "react";
import { IndianRupee, Receipt, Undo2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { inr } from "./paymentFormat";
import type { PaymentsSummary } from "./paymentsApi";

function SummaryCard({ icon: Icon, label, value, note, loading }: {
  icon: React.ElementType;
  label: string;
  value: string;
  note: string;
  loading: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 min-w-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
        <span className="text-sm font-medium text-muted-foreground truncate">{label}</span>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-7 w-24 mt-3" />
          <Skeleton className="h-3 w-full mt-2" />
        </>
      ) : (
        <>
          <p className="text-xl font-semibold text-foreground mt-3 truncate">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{note}</p>
        </>
      )}
    </div>
  );
}

export function PaymentSummary({ summary, loading }: { summary: PaymentsSummary | undefined; loading: boolean }) {
  const s = summary;
  const busy = loading || !s;
  const paidCount = s?.paid.count ?? 0;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <SummaryCard
        icon={Receipt}
        label="Payments"
        value={(s?.total ?? 0).toLocaleString("en-IN")}
        note="Match these filters"
        loading={busy}
      />
      <SummaryCard
        icon={IndianRupee}
        label="Paid"
        value={inr(s?.paid.amountInr ?? 0)}
        note={`${paidCount.toLocaleString("en-IN")} ${paidCount === 1 ? "payment" : "payments"}, after refunds and failures are left out`}
        loading={busy}
      />
      <SummaryCard
        icon={Undo2}
        label="Refunded"
        value={(s?.refunded.count ?? 0).toLocaleString("en-IN")}
        note="Money sent back"
        loading={busy}
      />
      <SummaryCard
        icon={XCircle}
        label="Failed"
        value={(s?.failed.count ?? 0).toLocaleString("en-IN")}
        note="Did not go through"
        loading={busy}
      />
    </div>
  );
}
