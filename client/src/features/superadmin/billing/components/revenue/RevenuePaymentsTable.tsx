// The payments list of the Revenue page: who paid, what, amount, how they paid, when, and where it stands. The table
// scrolls sideways inside its own box on narrow screens, so the page itself never does. The person's name opens their
// page (/superadmin/global-users/<userId>) while the account exists.
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/marketing_ui/table";
import { PersonCell } from "../transactions/PersonCell";
import { PaymentStatusBadge } from "../transactions/PaymentStatusBadge";
import { fmtDay, fmtTime, inr, methodLabel, whatLabel } from "../transactions/paymentFormat";
import type { PaymentRow } from "../transactions/paymentsApi";

// "other" is what the Failed Payments data says for a method it does not know
const paidWith = (method: string | null) => (method === "other" ? "Other" : methodLabel(method));

function WhatCell({ row }: { row: PaymentRow }) {
  let detail: string | null = null;
  if (row.kind === "topup" && row.credits != null) detail = `${row.credits.toLocaleString("en-IN")} credits`;
  return (
    <div className="min-w-0">
      <div className="text-foreground whitespace-nowrap">{whatLabel(row)}</div>
      {detail && <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{detail}</div>}
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

export function RevenuePaymentsTable({ rows, dimmed }: { rows: PaymentRow[]; dimmed?: boolean }) {
  return (
    <div className={`overflow-x-auto ${dimmed ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
      {/* The table's own container hides overflow, so the width is set on a box around it */}
      <div className="min-w-[820px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4">Person</TableHead>
              <TableHead className="px-4">What</TableHead>
              <TableHead className="px-4">Amount</TableHead>
              <TableHead className="px-4">Paid with</TableHead>
              <TableHead className="px-4">Date</TableHead>
              <TableHead className="px-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.source}-${row.id}`}>
                <TableCell className="px-4 max-w-[280px]">
                  <PersonCell person={row.person} />
                </TableCell>
                <TableCell className="px-4">
                  <WhatCell row={row} />
                </TableCell>
                <TableCell className="px-4">
                  <AmountCell row={row} />
                </TableCell>
                <TableCell className="px-4 whitespace-nowrap text-foreground">
                  {paidWith(row.method) || <span className="text-muted-foreground">Not saved</span>}
                </TableCell>
                <TableCell className="px-4">
                  <div className="text-foreground whitespace-nowrap">{fmtDay(row.date)}</div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{fmtTime(row.date)}</div>
                </TableCell>
                <TableCell className="px-4">
                  <PaymentStatusBadge row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
