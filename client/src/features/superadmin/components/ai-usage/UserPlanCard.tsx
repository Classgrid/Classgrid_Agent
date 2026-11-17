// A user's plan set by hand by the super admin (owner, 2026-11-17): gift a paid plan from the plan table for a period,
// with a reason (GiftPlanForm), or end it (back to Free). Also the student price, confirmed by hand. Used on the Plans
// & Usage user page and in the Plans & Billing subscriber list.
//
// On the person's page (Plans & Usage, ?user=<id>) the card is the "Gift a plan" section: the plan card above it
// already has End plan and the student price, so they are left out there, and the card warns first when a gift
// would replace a bought plan, when plans are off, or when the person is a Classgrid staff account.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { apiClient as api } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Button } from "@/components/marketing_ui/button";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { useAiPlans, planNameOf, invalidatePlanQueries, type StudentInfo } from "@/features/superadmin/queries/useAiUsage";
import { GiftPlanForm } from "./GiftPlanForm";
import { Section } from "./Section";
import { errorText, firstNameOf, isPast, planSourceText, type UserPlan } from "./planText";

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/** "End plan" (a paid plan only), with a confirmation: the user moves to Free now */
export function EndPlanButton({ userId, plan }: { userId: string; plan?: UserPlan | null }) {
  const { data } = useAiPlans();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const end = useMutation({
    mutationFn: async () => (await api.put(`/api/super-admin/ai-usage/users/${userId}/plan`, { planId: "free", reason: "Ended by a super admin" })).data,
    onSuccess: () => {
      toast.success("Plan ended. They are on Free now.");
      setOpen(false);
    },
    onError: (e) => toast.error(errorText(e, "Could not end the plan")),
    // The same lists a gift refreshes: the person's page, the people list, the plan counts and Plans & Billing
    onSettled: () => invalidatePlanQueries(queryClient),
  });
  if (!plan?.id || plan.id === "free") return null;
  const name = planNameOf(data?.plans, plan.id);
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={end.isPending} className="text-muted-foreground font-medium">
        End plan
      </Button>
      <DangerConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`End the ${name} plan?`}
        description="They move to Free now and get the Free limits."
        warningMessage={plan.billing && plan.billing !== "granted" ? "This plan was bought. Ending it here does not refund the payment." : "The gift ends today."}
        actionLabel="End plan"
        variant="warning"
        isLoading={end.isPending}
        onConfirm={() => end.mutate()}
      />
    </>
  );
}

/** The student price row: confirmed by a university email, or by hand here (for a student without one) */
export function StudentPriceRow({ userId, student }: { userId: string; student?: StudentInfo }) {
  const queryClient = useQueryClient();
  const setStudent = useMutation({
    mutationFn: async (verified: boolean) => (await api.put(`/api/super-admin/ai-usage/users/${userId}/student`, { verified })).data,
    onSuccess: (_d, verified) => { toast.success(verified ? "Confirmed as a student" : "Student price removed"); queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] }); },
    onError: (e) => toast.error(errorText(e, "Could not change the student price")),
  });
  const studentOn = !!student?.verified_at && !isPast(student.expires_at);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="text-sm min-w-0">
        <div className="font-medium text-foreground">Student price</div>
        <div className="text-xs text-muted-foreground">
          {studentOn
            ? `Confirmed${student?.method === "admin" ? " by hand" : student?.email ? ` with ${student.email}` : ""}, until ${day(student?.expires_at)}`
            : "Not confirmed. They confirm a university email in Settings > Billing, or you confirm them here."}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => setStudent.mutate(!studentOn)} isLoading={setStudent.isPending} className="shrink-0 self-start sm:self-auto font-medium">
        {studentOn ? "Remove" : "Confirm as student"}
      </Button>
    </div>
  );
}

/** The plan in force: a paid plan that has not ended (an ended or cancelled plan counts as Free) */
function inForceKey(plan?: UserPlan | null) {
  const key = plan?.id || "free";
  if (key === "free") return "free";
  if (isPast(plan?.expires_at) || plan?.status === "expired" || plan?.status === "cancelled") return "free";
  return key;
}

export function UserPlanCard({ userId, plan, student, name, inline = false, staff = false, plansEnabled }: {
  userId: string; plan?: UserPlan; student?: StudentInfo; name?: string;
  /** The person's page: the "Gift a plan" section, with its warnings (End plan and the student price are on the plan card) */
  inline?: boolean; staff?: boolean; plansEnabled?: boolean;
}) {
  const { data } = useAiPlans();
  const current = plan?.id || "free";
  const ended = isPast(plan?.expires_at);

  if (inline) {
    const first = firstNameOf(name);
    const key = inForceKey(plan);
    const bought = key !== "free" && plan?.billing !== "granted";
    const warnings = [
      bought && `${first} bought ${planNameOf(data?.plans, key)}${plan?.expires_at ? ` until ${day(plan.expires_at)}` : ""}. A gift replaces it from today, and the payment is not refunded.`,
      plansEnabled === false && "Plans are off: the gift is saved, but its limits apply only when plans are on.",
      staff && "Classgrid staff accounts do not use plans, so a gift changes nothing for them.",
    ].filter(Boolean) as string[];
    return (
      <Section id="gift" icon={Gift} title="Gift a plan" note={`Give ${first} a paid plan for a while. They get an email.`}>
        {warnings.length > 0 && (
          <div className="flex flex-col gap-1 mb-4">
            {warnings.map((w) => <p key={w} className="text-xs text-amber-700 dark:text-amber-400">{w}</p>)}
          </div>
        )}
        <GiftPlanForm userIds={[userId]} who={name} idPrefix={`gift-${userId}`} disabled={staff} />
      </Section>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gift a plan</CardTitle>
        <CardDescription>
          Now on <span className="font-medium text-foreground">{planNameOf(data?.plans, current)}</span>
          {current !== "free" ? ` (${planSourceText(plan).toLowerCase()})` : ""}
          {plan?.expires_at ? `, ${ended ? "ended" : "until"} ${day(plan.expires_at)}` : ""}
          {plan?.note && plan.billing === "granted" ? `. Reason: ${plan.note}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <GiftPlanForm userIds={[userId]} who={name} idPrefix={`gift-${userId}`} />
        {current !== "free" && (
          <div className="flex justify-end -mt-2"><EndPlanButton userId={userId} plan={plan} /></div>
        )}
        <div className="pt-4 border-t border-border"><StudentPriceRow userId={userId} student={student} /></div>
      </CardContent>
    </Card>
  );
}
