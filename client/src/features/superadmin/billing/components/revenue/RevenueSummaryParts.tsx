// The number parts of the Revenue page: money in (today, this month, all time), where it came from (Pro and Max,
// monthly and yearly, and top-ups), and refunds and failed payments for the chosen dates.
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { inr } from "../transactions/paymentFormat";
import type { MoneyTotal, RevenueSource, RevenueSummary } from "./revenueApi";

export const countLabel = (count: number, one: string, many: string) =>
  count === 1 ? `1 ${one}` : `${count.toLocaleString("en-IN")} ${many}`;

// yyyy-MM-dd (an India day) as "17 Nov 2026", without a time zone shift
const dayLabel = (day: string) =>
  new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// The dates a card's numbers cover, shown at the right of its title
export function rangeLabel(range: RevenueSummary["range"] | undefined) {
  if (!range) return "";
  if (range.isDefault) return "Last 30 days";
  if (range.from === range.to) return dayLabel(range.from);
  return `${dayLabel(range.from)} to ${dayLabel(range.to)}`;
}

// A card title with the dates it covers on the right
export function CardTitleRow({ title, note }: { title: string; note?: string }) {
  return (
    <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1 space-y-0 p-4 sm:p-6 pb-3 sm:pb-3">
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </CardHeader>
  );
}

function MoneyTile({ label, total, loading }: { label: string; total?: MoneyTotal; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading || !total ? (
          <>
            <Skeleton className="mt-2 h-7 w-28" />
            <Skeleton className="mt-2 h-4 w-20" />
          </>
        ) : (
          <>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{inr(total.amountInr)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{countLabel(total.count, "payment", "payments")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MoneyInTiles({ summary, loading }: { summary?: RevenueSummary; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <MoneyTile label="Money in today" total={summary?.moneyIn.today} loading={loading} />
      <MoneyTile label="Money in this month" total={summary?.moneyIn.month} loading={loading} />
      <MoneyTile label="Money in all time" total={summary?.moneyIn.allTime} loading={loading} />
    </div>
  );
}

function sourceLabel(source: RevenueSource) {
  if (source.kind === "topup") return "Top-ups";
  const name = source.planName || "Plan";
  if (source.term === "month") return `${name}, monthly`;
  if (source.term === "year") return `${name}, yearly`;
  return `${name}, length not saved`;
}

function sourceDetail(source: RevenueSource) {
  const payments = countLabel(source.count, "payment", "payments");
  if (source.kind === "topup" && source.credits) return `${payments}, ${countLabel(source.credits, "credit", "credits")}`;
  return payments;
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function SourcesCard({ summary, loading, failed }: { summary?: RevenueSummary; loading: boolean; failed: boolean }) {
  return (
    <Card>
      <CardTitleRow title="Where it came from" note={rangeLabel(summary?.range)} />
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {loading ? (
          <LoadingRows />
        ) : failed || !summary ? (
          <p className="text-sm text-muted-foreground">Couldn't load these numbers.</p>
        ) : (
          <ul className="divide-y divide-border">
            {summary.sources.map((source) => (
              <li key={source.key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{sourceLabel(source)}</p>
                  <p className="text-xs text-muted-foreground">{sourceDetail(source)}</p>
                </div>
                <span className="shrink-0 text-sm font-medium text-foreground">{inr(source.amountInr)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RefundsFailedCard({ summary, loading, failed }: { summary?: RevenueSummary; loading: boolean; failed: boolean }) {
  return (
    <Card>
      <CardTitleRow title="Refunds and failed" note={rangeLabel(summary?.range)} />
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {loading ? (
          <LoadingRows />
        ) : failed || !summary ? (
          <p className="text-sm text-muted-foreground">Couldn't load these numbers.</p>
        ) : (
          <ul className="divide-y divide-border">
            <li className="flex items-center justify-between gap-3 pb-2.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground">Refunded</p>
                <p className="text-xs text-muted-foreground">{countLabel(summary.refunds.count, "payment", "payments")}</p>
              </div>
              <span className="shrink-0 text-sm font-medium text-foreground">{inr(summary.refunds.amountInr)}</span>
            </li>
            <li className="flex items-center justify-between gap-3 pt-2.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground">Failed</p>
                <p className="text-xs text-muted-foreground">
                  {countLabel(summary.failed.count, "try", "tries")}
                  {summary.failed.capped ? ", newest 1,000 counted" : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-foreground">{inr(summary.failed.amountInr)}</span>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
