// Failed payments for Classgrid AI: the list. A table from tablet width up and one small card per payment on a
// phone, so the page never scrolls sideways. A click anywhere on a row opens the payment; the person's name opens
// their profile instead (it stops the click from reaching the row).
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/marketing_ui/table";
import type { FailedPaymentItem, FailedPaymentsListResponse } from "./failedPaymentsApi";
import { FailedPaymentsEmpty } from "./FailedPaymentsEmpty";
import { PaidLaterBadge } from "./PaidLaterBadge";
import { formatCount, formatInr, formatWhen, purchaseLabel, reasonLabel } from "./labels";

type Props = {
  result: FailedPaymentsListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  onClear: () => void;
  onRetry: () => void;
  onPage: (page: number) => void;
  onOpen: (id: string) => void;
};

function PersonName({ item }: { item: FailedPaymentItem }) {
  const { person } = item;
  const name = person.name || "No name";
  if (person.accountExists && person.userId) {
    return (
      <Link
        to={`/superadmin/global-users/${person.userId}`}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-foreground hover:underline truncate block"
      >
        {name}
      </Link>
    );
  }
  return <span className="font-medium text-foreground truncate block">{name}</span>;
}

function PersonUnder({ item }: { item: FailedPaymentItem }) {
  const { person } = item;
  if (!person.accountExists) return <span className="text-xs text-muted-foreground truncate block">No account found</span>;
  if (!person.email) return null;
  return (
    <span className="text-xs text-muted-foreground truncate block" title={person.email}>
      {person.email}
    </span>
  );
}

function Reason({ item }: { item: FailedPaymentItem }) {
  return (
    <div className="min-w-0">
      <span className="text-foreground block">{reasonLabel(item.reason.key)}</span>
      {item.reason.razorpayText ? (
        <span className="text-xs text-muted-foreground truncate block" title={item.reason.razorpayText}>
          {item.reason.razorpayText}
        </span>
      ) : null}
    </div>
  );
}

// Enter or Space on a focused row opens it, like a click
const openOnKey = (open: () => void) => (e: React.KeyboardEvent) => {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    open();
  }
};

export function FailedPaymentsList({ result, isLoading, isError, hasFilters, onClear, onRetry, onPage, onOpen }: Props) {
  const items = result?.data ?? [];
  const pagination = result?.pagination;

  let body: React.ReactNode;
  if (isLoading && !result) {
    body = (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  } else if (isError && !result) {
    body = <FailedPaymentsEmpty kind="error" onRetry={onRetry} />;
  } else if (items.length === 0) {
    body = hasFilters ? <FailedPaymentsEmpty kind="filtered" onClear={onClear} /> : <FailedPaymentsEmpty kind="none" />;
  } else {
    body = (
      <>
        {/* Tablet and computer: a table */}
        <div className="hidden md:block">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[22%]">Person</TableHead>
                <TableHead className="w-[18%]">Tried to buy</TableHead>
                <TableHead className="w-[10%]">Amount</TableHead>
                <TableHead className="w-[22%]">Why it failed</TableHead>
                <TableHead className="w-[14%]">When</TableHead>
                <TableHead className="w-[14%]">Paid later?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  tabIndex={0}
                  onClick={() => onOpen(item.id)}
                  onKeyDown={openOnKey(() => onOpen(item.id))}
                  className="cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
                >
                  <TableCell className="min-w-0">
                    <PersonName item={item} />
                    <PersonUnder item={item} />
                  </TableCell>
                  <TableCell className="text-foreground break-words">{purchaseLabel(item.purchase)}</TableCell>
                  <TableCell className="text-foreground font-medium whitespace-nowrap">{formatInr(item.amountInr)}</TableCell>
                  <TableCell>
                    <Reason item={item} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatWhen(item.failedAt)}</TableCell>
                  <TableCell>
                    <PaidLaterBadge paidLater={item.paidLater} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Phone: one card per payment */}
        <div className="md:hidden space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              role="link"
              tabIndex={0}
              onClick={() => onOpen(item.id)}
              onKeyDown={openOnKey(() => onOpen(item.id))}
              className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm">
                  <PersonName item={item} />
                  <PersonUnder item={item} />
                </div>
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">{formatInr(item.amountInr)}</span>
              </div>
              <div className="text-sm text-foreground break-words">{purchaseLabel(item.purchase)}</div>
              <div className="text-sm">
                <Reason item={item} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{formatWhen(item.failedAt)}</span>
                <PaidLaterBadge paidLater={item.paidLater} />
              </div>
            </div>
          ))}
        </div>

        {pagination ? <Pager pagination={pagination} shown={items.length} onPage={onPage} /> : null}
      </>
    );
  }

  return <div className="bg-card border border-border rounded-xl shadow-sm p-3 sm:p-5 min-w-0">{body}</div>;
}

function Pager({
  pagination,
  shown,
  onPage,
}: {
  pagination: FailedPaymentsListResponse["pagination"];
  shown: number;
  onPage: (page: number) => void;
}) {
  const { page, limit, total, totalPages } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(total, start + shown - 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t border-border">
      <span className="text-sm text-muted-foreground">
        Showing {formatCount(start)}–{formatCount(end)} of {formatCount(total)}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
