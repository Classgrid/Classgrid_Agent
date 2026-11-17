// The plan someone is on today, as a small coloured label. Classgrid staff have no plan limits, so they show "Staff".
import { Badge } from "@/components/marketing_ui/badge";
import type { PlanSummary } from "./types";
import { planIdLabel } from "./format";

const VARIANT = { free: "neutral", pro: "info", max: "default", enterprise: "secondary" } as const;

export function PlanBadge({ plan }: { plan: Pick<PlanSummary, "id" | "noLimits"> }) {
  if (plan.noLimits) return <Badge variant="outline" className="whitespace-nowrap">Staff</Badge>;
  return (
    <Badge variant={VARIANT[plan.id] || "neutral"} className="whitespace-nowrap">
      {planIdLabel(plan.id)}
    </Badge>
  );
}
