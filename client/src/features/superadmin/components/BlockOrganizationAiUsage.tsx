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
import { useBlockAiOrg, useRequestSecurityCode, useVerifySecurityCode } from "@/features/superadmin/queries/useAiUsage";

export interface BlockOrganizationAiUsageProps {
  orgId: string;
  orgName: string;
  isBlocked: boolean;
}

export function BlockOrganizationAiUsage({ orgId, orgName, isBlocked }: BlockOrganizationAiUsageProps) {
  const [open, setOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  
  const blockMutation = useBlockAiOrg();
  const requestSecurityCode = useRequestSecurityCode();
  const verifySecurityCode = useVerifySecurityCode();

  const allComplete = securityCode.length === 6;

  const handleConfirm = async () => {
    try {
      await verifySecurityCode.mutateAsync({ code: securityCode, action: "BLOCK_ORG_AI", orgId });

      blockMutation.mutate({ orgId, isBlocked: !isBlocked }, {
        onSuccess: () => {
          toast.success(`Organization AI access has been ${!isBlocked ? 'blocked' : 'unblocked'} successfully.`);
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
      <div className={`border rounded-xl overflow-hidden mt-2 shadow-sm h-full flex flex-col ${isBlocked ? 'border-rose-500/20' : 'border-border'}`}>
        <div className={`p-6 flex flex-col gap-6 flex-1 ${isBlocked ? 'bg-rose-500/5' : 'bg-card'}`}>
          <div className="flex flex-col gap-1.5">
            <h3 className={`text-lg font-semibold tracking-tight ${isBlocked ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'}`}>
              {isBlocked ? "AI Access Blocked" : "Block Organization AI Usage"}
            </h3>
            <p className={`text-sm ${isBlocked ? 'text-rose-600/80 dark:text-rose-400/80' : 'text-muted-foreground'}`}>
              {isBlocked 
                ? "All AI usage is suspended for this organization. You can unblock them by entering your security code." 
                : "Immediately revoke all AI platform access for an entire organization. This requires a Super Admin security code."}
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end mt-auto">
          <Button 
            variant={isBlocked ? "outline" : "destructive"} 
            onClick={async () => {
              try {
                await requestSecurityCode.mutateAsync({ action: "BLOCK_ORG_AI", orgId });
                setOpen(true);
              } catch (e) {
                console.error("Failed to request OTP", e);
              }
            }}
            disabled={requestSecurityCode.isPending}
          >
            {requestSecurityCode.isPending ? "Sending Code..." : (isBlocked ? "Unblock AI Access" : "Block AI Access")}
          </Button>
        </div>
      </div>

      <DangerConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`${isBlocked ? 'Unblock' : 'Block'} AI Usage for ${orgName}`}
        description={`Please provide your security code to proceed with ${isBlocked ? 'unblocking' : 'blocking'}.`}
        warningMessage={isBlocked ? "This will restore AI access for all users in this organization." : "This action will instantly block all users in this organization from using any AI features."}
        actionLabel={isBlocked ? "Unblock Access" : "Block Access"}
        cancelLabel="Cancel"
        isLoading={blockMutation.isPending}
        onConfirm={handleConfirm}
        variant={isBlocked ? "warning" : "danger"}
        isConfirmDisabled={!allComplete}
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-2.5">
            <label className="text-sm text-foreground/80">Enter Super Admin Security Code</label>
            <input
              type="password"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
              placeholder="Security Code"
              className="h-10 w-full rounded-md border bg-background dark:bg-black px-3 text-sm text-foreground outline-none transition-all duration-200 focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 border-input"
              disabled={blockMutation.isPending}
            />
          </div>
        </div>
      </DangerConfirmDialog>
    </>
  );
}
