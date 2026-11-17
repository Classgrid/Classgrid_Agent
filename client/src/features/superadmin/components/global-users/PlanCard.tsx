// The person's plan: what they are on today, how they got it (bought, gifted, phone app), its dates, the student
// price, and the gifts and ends an admin made. The button opens the gift form right here (owner, 2026-11-17: it
// used to open the AI Usage page, which no longer opens at a person): gift Pro or Max for a while with a reason,
// or move a person on a paid plan back to Free. Both go through setUserPlan (PUT .../ai-usage/users/:id/plan).
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/marketing_ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { apiClient as api } from "@/lib/apiClient";
import { GiftPlanForm } from "@/features/superadmin/components/ai-usage/GiftPlanForm";
import { errorText } from "@/features/superadmin/components/ai-usage/planText";
import { invalidatePlanQueries } from "@/features/superadmin/queries/useAiUsage";
import { SectionCard } from "./SectionCard";
import { InfoList, InfoRow } from "./InfoRow";
import { PEOPLE_KEY, personKey } from "./api";
import { dateText, planIdLabel, planSourceText } from "./format";
import type { PersonOverview } from "./types";

function untilText(plan: PersonOverview["plan"]): string {
  if (plan.expiresAt) return dateText(plan.expiresAt);
  return plan.id !== "free" ? "No end date" : "–";
}

function studentText(student: PersonOverview["plan"]["student"]): string {
  if (!student?.verified) return "No";
  return student.expiresAt ? `Yes, until ${dateText(student.expiresAt)}` : "Yes";
}

export function PlanCard({ userId, plan, name, counts }: { userId: string; plan: PersonOverview["plan"]; name?: string; counts?: PersonOverview["planCounts"] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [askEnd, setAskEnd] = useState(false);
  const gifted = plan.source === "gifted";
  const history = plan.history || [];
  const onPaidPlan = plan.id !== "free" && !plan.ended;

  // This page's own data, and every other list that shows a person's plan
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: personKey(userId) });
    queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
    invalidatePlanQueries(queryClient);
  };

  const endPlan = useMutation({
    mutationFn: async () => (await api.put(`/api/super-admin/ai-usage/users/${userId}/plan`, { planId: "free" })).data,
    onSuccess: () => { toast.success(`${name || "This person"} is back on Free`); setAskEnd(false); setOpen(false); refresh(); },
    onError: (e) => toast.error(errorText(e, "Could not change the plan")),
  });

  return (
    <SectionCard
      icon={Sparkles}
      title="Plan"
      note="What they're on now and how they got it."
      action={<Button type="button" variant="outline" size="sm" onClick={() => { setAskEnd(false); setOpen(true); }}>Change or gift a plan</Button>}
    >
      <Dialog open={open} onOpenChange={(o) => { if (!endPlan.isPending) setOpen(o); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change or gift a plan</DialogTitle>
            <DialogDescription>
              {plan.noLimits
                ? "Classgrid staff have no plan limits, so a plan changes nothing for this account."
                : `${name || "This person"} is on ${plan.name} now. Pick a plan, how long it lasts and why.`}
            </DialogDescription>
          </DialogHeader>
          <GiftPlanForm userIds={[userId]} who={name} idPrefix={`person-gift-${userId}`} disabled={plan.noLimits} onDone={() => { setOpen(false); refresh(); }} />
          {onPaidPlan && (
            <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {askEnd ? `${plan.name} ends now and they go back to Free. Are you sure?` : `Or end ${plan.name} now and move them back to Free.`}
              </p>
              {askEnd ? (
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="outline" size="sm" disabled={endPlan.isPending} onClick={() => setAskEnd(false)}>Cancel</Button>
                  <Button type="button" variant="destructive" size="sm" isLoading={endPlan.isPending} onClick={() => endPlan.mutate()}>Move to Free</Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setAskEnd(true)}>Move back to Free</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
        {counts && (
          <>
            <InfoRow label="Plans bought">{counts.bought === null ? "–" : String(counts.bought)}</InfoRow>
            <InfoRow label="Plans gifted">{counts.gifted === null ? "–" : String(counts.gifted)}</InfoRow>
            <InfoRow label="Moved back to Free">{counts.movedToFree === null ? "–" : String(counts.movedToFree)}</InfoRow>
          </>
        )}
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
