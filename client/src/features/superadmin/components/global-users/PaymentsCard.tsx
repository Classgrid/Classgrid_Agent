// What the person has paid: plans bought for a month or a year and credit top-ups, newest first, with the total.
// The page loads the newest 10; "Show all" opens the full list page by page in the same card. Purchases made in the
// phone app are not recorded as payments here, so the plan card is where those show.
import { useState, type ReactNode } from "react";
import { IndianRupee } from "lucide-react";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { SectionCard } from "./SectionCard";
import { PeoplePager } from "./PeoplePager";
import { usePersonPayments } from "./api";
import { capitalise, dateText, inr, num, planIdLabel } from "./format";
import type { PaymentRow, PersonOverview } from "./types";

function StatusTag({ status }: { status: string }) {
  if (!status || status === "success") return null;
  if (status === "pending") return <Badge variant="warning">Pending</Badge>;
  if (status === "failed") return <Badge variant="danger">Failed</Badge>;
  return <Badge variant="neutral">{capitalise(status)}</Badge>;
}

function PaymentLine({ p }: { p: PaymentRow }) {
  const title = p.kind === "plan"
    ? `${p.planName || planIdLabel(p.planId)} plan${p.term === "month" ? ", 1 month" : p.term === "year" ? ", 1 year" : ""}`
    : "Credits";
  const details = [dateText(p.paidAt), p.method ? p.method.toUpperCase() : "Payment", p.paymentId].filter(Boolean).join(" · ");
  return (
    <li className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 min-w-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground flex flex-wrap items-center gap-2">
          <span>{title}</span>
          <StatusTag status={p.status} />
        </div>
        <div className="text-xs text-muted-foreground break-all">{details}</div>
        {p.kind === "plan" && (p.periodStart || p.periodEnd) && (
          <div className="text-xs text-muted-foreground">Covers {dateText(p.periodStart)} to {dateText(p.periodEnd)}</div>
        )}
      </div>
      <div className="sm:text-right shrink-0">
        <div className="text-sm font-medium text-foreground tabular-nums">{inr(p.amountInr)}</div>
        {p.kind === "topup" && <div className="text-xs text-muted-foreground">+{num(p.credits)} credits</div>}
      </div>
    </li>
  );
}

export function PaymentsCard({ userId, payments }: { userId: string; payments: PersonOverview["payments"] }) {
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const all = usePersonPayments(userId, page, showAll);
  const items = payments.items || [];

  const close = () => { setShowAll(false); setPage(1); };

  let list: ReactNode;
  if (!showAll) {
    list = items.length
      ? <ul className="divide-y divide-border">{items.map((p) => <PaymentLine key={p._id} p={p} />)}</ul>
      : <p className="text-sm text-muted-foreground">No payments yet.</p>;
  } else if (all.isLoading) {
    list = <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  } else if (all.isError || !all.data) {
    list = (
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load the payments.</p>
        <Button variant="outline" size="sm" onClick={() => all.refetch()}>Try again</Button>
      </div>
    );
  } else {
    list = (
      <div className={`flex flex-col gap-3 transition-opacity ${all.isPlaceholderData ? "opacity-60" : ""}`}>
        <ul className="divide-y divide-border">{all.data.data.map((p) => <PaymentLine key={p._id} p={p} />)}</ul>
        <PeoplePager page={page} pages={all.data.pages} onPage={setPage} disabled={all.isPlaceholderData} />
      </div>
    );
  }

  return (
    <SectionCard icon={IndianRupee} title="Payments" note="Plans and credits they bought, newest first." className="lg:col-span-2">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-sm text-muted-foreground">Total paid</span>
        <span className="text-lg font-semibold text-foreground tabular-nums">{inr(payments.totalPaidInr)}</span>
      </div>
      {list}
      {!showAll && payments.count > items.length && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll(true)}>Show all {num(payments.count)}</Button>
      )}
      {showAll && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={close}>Show less</Button>
      )}
    </SectionCard>
  );
}
