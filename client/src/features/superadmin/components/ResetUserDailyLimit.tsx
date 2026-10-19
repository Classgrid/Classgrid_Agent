/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useState } from "react";
import { Button } from "@/components/marketing_ui/button";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { toast } from "sonner";
import { useResetUserUsage, useRequestSecurityCode, useVerifySecurityCode } from "@/features/superadmin/queries/useAiUsage";

export interface ResetUserDailyLimitProps {
  userId: string;
  userName: string;
}

export function ResetUserDailyLimit({ userId, userName }: ResetUserDailyLimitProps) {
  const [open, setOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  
  const resetMutation = useResetUserUsage();
  const requestSecurityCode = useRequestSecurityCode();
  const verifySecurityCode = useVerifySecurityCode();

  const handleConfirm = async () => {
    try {
      await verifySecurityCode.mutateAsync({ code: securityCode, action: "RESET_USER_USAGE", orgId: undefined });
      
      resetMutation.mutate(userId, {
        onSuccess: () => {
          toast.success(`Usage for ${userName} has been reset successfully.`);
          setOpen(false);
          setSecurityCode("");
        }
      });
    } catch (e) {
      console.error("OTP verification failed", e);
    }
  };

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden shadow-sm h-full flex flex-col mt-2">
        <div className="p-6 bg-card flex flex-col gap-6 flex-1">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              Reset User Usage
            </h3>
            <p className="text-sm text-muted-foreground">
              Force reset the AI token consumption tracking for {userName || "this user"}. This requires a Super Admin security code.
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end mt-auto">
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                await requestSecurityCode.mutateAsync({ action: "RESET_USER_USAGE", orgId: undefined });
                setOpen(true);
              } catch (e) {
                console.error("Failed to request OTP", e);
              }
            }}
            disabled={requestSecurityCode.isPending}
          >
            {requestSecurityCode.isPending ? "Sending Code..." : "Reset Limit"}
          </Button>
        </div>
      </div>

      <DangerConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Reset ${userName} Usage`}
        description="Please provide your Super Admin security code to proceed."
        warningMessage="This action will instantly overwrite the user's token consumption tracking, resetting their weekly usage back to 0."
        actionLabel="Reset Usage"
        cancelLabel="Cancel"
        isLoading={resetMutation.isPending}
        onConfirm={handleConfirm}
        variant="warning"
        isConfirmDisabled={securityCode.length !== 6}
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-2.5">
            <label className="text-sm text-foreground/80">Enter code to reset usage</label>
            <input
              type="password"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
              placeholder="Security Code"
              className="h-10 w-full rounded-md border bg-background dark:bg-black px-3 text-sm text-foreground outline-none transition-all duration-200 focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 border-input"
              disabled={resetMutation.isPending}
            />
          </div>
        </div>
      </DangerConfirmDialog>
    </>
  );
}
