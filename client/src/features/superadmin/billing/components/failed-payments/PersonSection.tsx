// Failed payments for Classgrid AI: who tried to pay, and the plan they are on now (it may have changed since).
// A payment without an account (no user id in Razorpay's notes, or the account was deleted) can't link anywhere.
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import type { FailedPaymentDetail } from "./failedPaymentsApi";
import { InfoRow, SectionCard } from "./SectionCard";
import { formatDay } from "./labels";

function planNow(plan: NonNullable<FailedPaymentDetail["currentPlan"]>) {
  let text = plan.expiresAt ? `${plan.name}, until ${formatDay(plan.expiresAt)}` : plan.name;
  if (plan.billing === "granted") text += " (given by us)";
  if (plan.status && plan.status !== "active") text += ", ended";
  return text;
}

export function PersonSection({ item }: { item: FailedPaymentDetail }) {
  const { person, currentPlan } = item;
  const hasAccount = person.accountExists && Boolean(person.userId);

  return (
    <SectionCard icon={User} title="Who" note="The person who tried to pay.">
      <div>
        <InfoRow label="Name">{person.name || "No name"}</InfoRow>
        <InfoRow label="Email">
          <span className="break-all">{person.email || "Not given"}</span>
        </InfoRow>
        <InfoRow label="Phone">{person.phone || "Not given"}</InfoRow>
        {hasAccount && currentPlan ? <InfoRow label="Plan now">{planNow(currentPlan)}</InfoRow> : null}
      </div>
      <div className="mt-4">
        {hasAccount ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/superadmin/global-users/${person.userId}`}>Open their profile</Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No account found for this payment.</p>
        )}
      </div>
    </SectionCard>
  );
}
