// Previous / Next under the list. Hidden when everything fits on one page.
import React from "react";
import { Button } from "@/components/marketing_ui/button";

interface PaymentsPagerProps {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
}

export function PaymentsPager({ page, limit, total, onPage }: PaymentsPagerProps) {
  if (total <= limit) return null;
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = Math.min(total, (page - 1) * limit + 1);
  const to = Math.min(total, page * limit);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        Showing {from.toLocaleString("en-IN")}–{to.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
