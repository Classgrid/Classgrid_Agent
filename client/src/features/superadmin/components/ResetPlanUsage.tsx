// Plans & Usage > a plan (Free, Pro, Max): reset the usage of everyone on that plan at once, as the organisation page's
// "Reset Organization Usage" did (owner, 2026-11-23). Session, weekly, Claude and Fable limits and the free pictures
// go back to 0 for every person the plan's folder lists. It needs a Super Admin security code, which the server
// checks and uses up in the reset request itself.
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { useRequestSecurityCode, useResetPlanUsage } from "@/features/superadmin/queries/useAiUsage";

export function ResetPlanUsage({ plan, planName }: { plan: string; planName: string }) {
  const [open, setOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  const requestCode = useRequestSecurityCode();
  const resetPlan = useResetPlanUsage();

  const handleConfirm = async () => {
    try {
      const result = await resetPlan.mutateAsync({ plan, code: securityCode.trim() });
      toast.success(`Usage reset for ${result?.people ?? 0} people on ${planName}.`);
      setOpen(false);
      setSecurityCode("");
    } catch {
      // (useResetPlanUsage already says why: a wrong or old code, or the reset failed)
    }
  };

  return (
    <>
      {/* The same card as the old organisation page's "Reset Organization Usage" (ResetOrganizationDailyLimit.tsx) */}
      <div className="border border-border rounded-xl overflow-hidden mt-2 shadow-sm h-full flex flex-col">
        <div className="p-6 bg-card flex flex-col gap-6 flex-1">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              Reset Plan Usage
            </h3>
            <p className="text-sm text-muted-foreground">
              Force reset the AI usage of everyone on the {planName} plan: session, weekly, Claude and Fable limits go back to 0. This requires a Super Admin security code.
            </p>
          </div>
        </div>
        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end mt-auto">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await requestCode.mutateAsync({ action: "RESET_PLAN_USAGE", plan });
                setOpen(true);
              } catch {
                // (useRequestSecurityCode already says why the code could not be sent)
              }
            }}
            disabled={requestCode.isPending}
          >
            {requestCode.isPending ? "Sending Code..." : "Reset Limit"}
          </Button>
        </div>
      </div>

      <DangerConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Reset ${planName} Usage`}
        description="Please provide your Super Admin security code to proceed."
        warningMessage={`This resets the usage of everyone on the ${planName} plan back to 0.`}
        actionLabel="Reset Usage"
        cancelLabel="Cancel"
        isLoading={resetPlan.isPending}
        onConfirm={handleConfirm}
        variant="warning"
        isConfirmDisabled={securityCode.trim().length !== 6}
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-2.5">
          <label className="text-sm text-foreground/80">Enter code to reset usage</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={securityCode}
            onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Security Code"
            className="h-10 w-full rounded-md border bg-background dark:bg-black px-3 text-sm text-foreground outline-none transition-all duration-200 focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 border-input"
            disabled={resetPlan.isPending}
          />
          </div>
        </div>
      </DangerConfirmDialog>
    </>
  );
}
