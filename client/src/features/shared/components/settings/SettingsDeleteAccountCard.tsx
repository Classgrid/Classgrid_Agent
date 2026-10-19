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
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { Button } from "@/components/marketing_ui/button";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { useUserProfile } from "@/features/shared/queries/useUserProfile";
import { useNavigate } from "react-router-dom";

export function SettingsDeleteAccountCard() {
  const { data: profileData } = useUserProfile();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  const orgName = profileData?.organization_id?.name || "";

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/api/auth/delete-account", {
        password,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Account deleted successfully.");
      setOpen(false);
      navigate("/login");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete account.");
    },
  });

  const handleConfirm = () => {
    deleteAccountMutation.mutate();
  };

  return (
    <>
      <div className="border border-red-500/20 rounded-xl overflow-hidden mt-2 shadow-sm">
        <div className="p-6 bg-card flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              Delete Account
            </h3>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action is irreversible.
            </p>
          </div>
        </div>

        <div className="p-4 bg-red-500/5 border-t border-red-500/20 flex items-center justify-end">
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Delete Account
          </Button>
        </div>
      </div>

      <DangerConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Account"
        description="Permanently delete your account and all associated data."
        warningMessage="This action is irreversible. All your data will be permanently lost and cannot be recovered."
        confirmationSteps={[
          {
            label: "To confirm, type the organization name",
            value: orgName,
          }
        ]}
        actionLabel="Delete Account"
        cancelLabel="Cancel"
        isLoading={deleteAccountMutation.isPending}
        onConfirm={handleConfirm}
        variant="danger"
        isConfirmDisabled={password.length < 8}
      >
        <div className="flex flex-col gap-2.5 pt-2">
          <label className="text-sm text-foreground/80">Type your password to finalize</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-md border bg-background dark:bg-black px-3 text-sm text-foreground outline-none transition-all duration-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 border-input"
            disabled={deleteAccountMutation.isPending}
          />
        </div>
      </DangerConfirmDialog>
    </>
  );
}
