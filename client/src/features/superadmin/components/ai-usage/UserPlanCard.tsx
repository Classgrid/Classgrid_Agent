// A user's plan set by hand by the super admin (owner, 2026-11-17): gift a paid plan from the plan table for a period,
// with a reason (GiftPlanForm), or end it (back to Free). Also the student price, confirmed by hand. Used on the Plans
// & Usage user page and in the Plans & Billing subscriber list.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Button } from "@/components/marketing_ui/button";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { useAiPlans, planNameOf } from "@/features/superadmin/queries/useAiUsage";
import { GiftPlanForm } from "./GiftPlanForm";
import { errorText, isPast, planSourceText, type UserPlan } from "./planText";

type StudentInfo = { email?: string | null; method?: string; verified_at?: string; expires_at?: string | null } | null;

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/** "End plan" (a paid plan only), with a confirmation: the user moves to Free now */
export function EndPlanButton({ userId, plan }: { userId: string; plan?: UserPlan | null }) {
  const { data } = useAiPlans();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const end = useMutation({
    mutationFn: async () => (await api.put(`/api/super-admin/ai-usage/users/${userId}/plan`, { planId: "free", reason: "Ended by a super admin" })).data,
    onSuccess: () => {
      toast.success("The user is on Free now");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org-users"] });
      queryClient.invalidateQueries({ queryKey: ["ai-plan-subscribers"] });
    },
    onError: (e) => toast.error(errorText(e, "Could not end the plan")),
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
        description="The user moves to Free now and gets the Free limits."
        warningMessage={plan.billing && plan.billing !== "granted" ? "This plan was bought. Ending it here does not refund the payment." : "The gift ends today."}
        actionLabel="End plan"
        variant="warning"
        isLoading={end.isPending}
        onConfirm={() => end.mutate()}
      />
    </>
  );
}

/** The student price row: confirmed by a school email, or by hand here (for a student without one) */
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
            : "Not confirmed. The user confirms a school or university email in Settings > Billing, or you confirm them here."}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => setStudent.mutate(!studentOn)} isLoading={setStudent.isPending} className="shrink-0 self-start sm:self-auto font-medium">
        {studentOn ? "Remove" : "Confirm as student"}
      </Button>
    </div>
  );
}

export function UserPlanCard({ userId, plan, student, name }: { userId: string; plan?: UserPlan; student?: StudentInfo; name?: string }) {
  const { data } = useAiPlans();
  const current = plan?.id || "free";
  const ended = isPast(plan?.expires_at);

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
