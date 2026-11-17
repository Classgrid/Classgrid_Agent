// The payments list: a table on wider screens and a stack of cards on phones, so nothing scrolls sideways.
// A row or card opens the payment; the person's name and the copy button work on their own without opening it.
import React from "react";
import { Badge } from "@/components/marketing_ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/marketing_ui/table";
import { CopyId } from "./CopyId";
import { PersonCell } from "./PersonCell";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { fmtDay, fmtTime, inr, whatLabel } from "./paymentFormat";
import type { PaymentRow } from "./paymentsApi";

// The two lines of the "What" column
function WhatCell({ row }: { row: PaymentRow }) {
  let detail: string | null = null;
  if (row.kind === "plan") {
    if (row.plan?.periodStart && row.plan?.periodEnd) detail = `${fmtDay(row.plan.periodStart)} – ${fmtDay(row.plan.periodEnd)}`;
  } else if (row.kind === "topup") {
    detail = row.credits == null ? "Credits not recorded" : `${row.credits.toLocaleString("en-IN")} credits`;
  } else if (row.status === "failed") {
    detail = "Type not recorded";
  }
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-foreground">{whatLabel(row)}</span>
        {row.kind === "plan" && row.plan?.studentPrice === true && <Badge variant="neutral">Student price</Badge>}
      </div>
      {detail && <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>}
    </div>
  );
}

function AmountCell({ row }: { row: PaymentRow }) {
  const partly = row.refundedInr > 0 && row.refundedInr < row.amountInr;
  return (
    <div>
      <div className="font-medium text-foreground whitespace-nowrap">{inr(row.amountInr)}</div>
      {partly && <div className="text-xs text-muted-foreground whitespace-nowrap">{inr(row.refundedInr)} refunded</div>}
    </div>
  );
}

// Enter on a focused row opens it, like a click (but not Enter on the copy button or the name link inside it)
const openOnEnter = (e: React.KeyboardEvent, open: () => void) => {
  if (e.key === "Enter" && e.target === e.currentTarget) open();
};

export function PaymentsTable({ rows, onOpen, dimmed }: { rows: PaymentRow[]; onOpen: (row: PaymentRow) => void; dimmed?: boolean }) {
  return (
    <div className={dimmed ? "opacity-60 transition-opacity" : "transition-opacity"}>
      {/* Wider screens: a table */}
      <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[30%] lg:w-[26%] px-3">Person</TableHead>
              <TableHead className="w-[26%] lg:w-[22%] px-3">What</TableHead>
              <TableHead className="w-[13%] lg:w-[12%] px-3">Amount</TableHead>
              <TableHead className="w-[14%] lg:w-[13%] px-3">Status</TableHead>
              <TableHead className="hidden lg:table-cell lg:w-[15%] px-3">Payment id</TableHead>
              <TableHead className="w-[17%] lg:w-[12%] px-3">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={`${row.source}-${row.id}`}
                tabIndex={0}
                onClick={() => onOpen(row)}
                onKeyDown={(e) => openOnEnter(e, () => onOpen(row))}
                className="cursor-pointer focus:outline-none focus-visible:bg-muted/50"
              >
                <TableCell className="px-3">
                  <PersonCell person={row.person} />
                </TableCell>
                <TableCell className="px-3">
                  <WhatCell row={row} />
                </TableCell>
                <TableCell className="px-3">
                  <AmountCell row={row} />
                </TableCell>
                <TableCell className="px-3">
                  <PaymentStatusBadge row={row} />
                </TableCell>
                <TableCell className="hidden lg:table-cell px-3">
                  <CopyId value={row.razorpayPaymentId} label="Payment id" />
                </TableCell>
                <TableCell className="px-3">
                  <div className="text-foreground whitespace-nowrap">{fmtDay(row.date)}</div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{fmtTime(row.date)}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Phones: one card per payment */}
      <div className="md:hidden flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={`${row.source}-${row.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(row)}
            onKeyDown={(e) => openOnEnter(e, () => onOpen(row))}
            className="rounded-xl border border-border bg-card p-4 shadow-sm cursor-pointer active:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
          >
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <PersonCell person={row.person} />
              </div>
              <PaymentStatusBadge row={row} className="shrink-0" />
            </div>
            <div className="mt-3 text-sm">
              <WhatCell row={row} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3 text-sm">
              <AmountCell row={row} />
              <span className="text-xs text-muted-foreground text-right">
                {fmtDay(row.date)}, {fmtTime(row.date)}
              </span>
            </div>
            {row.razorpayPaymentId && (
              <div className="mt-2 min-w-0">
                <CopyId value={row.razorpayPaymentId} label="Payment id" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
