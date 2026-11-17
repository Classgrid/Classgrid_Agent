// The person's plan: what they are on today, how they got it (bought, gifted, phone app), its dates, the student
// price, and the gifts and ends an admin made. Plans are changed or gifted on the AI Usage page, so the button
// opens that page at this person instead of repeating the gift form here.
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/marketing_ui/button";
import { SectionCard } from "./SectionCard";
import { InfoList, InfoRow } from "./InfoRow";
import { AI_USAGE_PERSON_URL, dateText, planIdLabel, planSourceText } from "./format";
import type { PersonOverview } from "./types";

function untilText(plan: PersonOverview["plan"]): string {
  if (plan.expiresAt) return dateText(plan.expiresAt);
  return plan.id !== "free" ? "No end date" : "–";
}

function studentText(student: PersonOverview["plan"]["student"]): string {
  if (!student?.verified) return "No";
  return student.expiresAt ? `Yes, until ${dateText(student.expiresAt)}` : "Yes";
}

export function PlanCard({ userId, plan }: { userId: string; plan: PersonOverview["plan"] }) {
  const gifted = plan.source === "gifted";
  const history = plan.history || [];
  return (
    <SectionCard
      icon={Sparkles}
      title="Plan"
      note="What they're on now and how they got it."
      action={<Link to={AI_USAGE_PERSON_URL(userId)} className={buttonVariants({ variant: "outline", size: "sm" })}>Change or gift a plan</Link>}
    >
      <InfoList>
        <InfoRow label="Plan">
          {plan.name}
          {plan.ended && (
            <span className="text-muted-foreground">
              {` (${planIdLabel(plan.savedId)} ended${plan.expiresAt ? ` ${dateText(plan.expiresAt)}` : ""})`}
            </span>
          )}
        </InfoRow>
        <InfoRow label="How they got it">{planSourceText(plan)}</InfoRow>
        <InfoRow label="Since">{dateText(plan.startedAt)}</InfoRow>
        <InfoRow label="Until">{untilText(plan)}</InfoRow>
        {plan.note && <InfoRow label={gifted ? "Reason" : "Note"}>{plan.note}</InfoRow>}
        <InfoRow label="Student price">{studentText(plan.student)}</InfoRow>
      </InfoList>

      {plan.noLimits && <p className="text-sm text-muted-foreground mt-3">Classgrid staff have no plan limits.</p>}

      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-foreground">Gifts and changes</h3>
          <ul className="mt-2 flex flex-col gap-2.5">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="text-sm text-foreground break-words">
                {h.action === "gift" ? (
                  <>
                    {`Gifted ${h.planName || planIdLabel(h.plan)} ${h.expiresAt ? `until ${dateText(h.expiresAt)}` : "with no end date"}`}
                    <span className="text-muted-foreground">{` · by ${h.by} · ${dateText(h.at)}`}</span>
                    {h.reason && <span className="block text-muted-foreground">{h.reason}</span>}
                  </>
                ) : (
                  <>
                    Moved back to Free
                    <span className="text-muted-foreground">{` · by ${h.by} · ${dateText(h.at)}`}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
