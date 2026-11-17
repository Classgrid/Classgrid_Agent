// Failed payments for Classgrid AI: what the list card shows when there is nothing to list, when the filters match
// nothing, and when the list couldn't be loaded.
import { AlertTriangle, CreditCard, SearchX } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/marketing_ui/empty";

type Props =
  | { kind: "none" }
  | { kind: "filtered"; onClear: () => void }
  | { kind: "error"; onRetry: () => void };

export function FailedPaymentsEmpty(props: Props) {
  if (props.kind === "error") {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle className="text-destructive" />
          </EmptyMedia>
          <EmptyTitle className="text-foreground">Couldn't load failed payments</EmptyTitle>
          <EmptyDescription>Check your connection and try again.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={props.onRetry}>
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (props.kind === "filtered") {
    return (
      <Empty className="py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle className="text-foreground">Nothing matches these filters</EmptyTitle>
          <EmptyDescription>Try other filters, or clear them.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={props.onClear}>
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CreditCard />
        </EmptyMedia>
        <EmptyTitle className="text-foreground">No failed payments</EmptyTitle>
        <EmptyDescription>When a payment for a plan or AI credits fails on Razorpay, it shows up here.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
