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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { useUserProfile } from "@/features/shared/queries/useUserProfile";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { useNavigate } from "react-router-dom";
import { CODE_TTL_MINUTES } from "@/lib/codeLifetime";

export function SettingsDeleteAccountCard() {
  const { data: profileData } = useUserProfile();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  // An account with no password of its own (it signs in with Google, GitHub or an email code) finalizes with a
  // 6-digit code sent to its email, in place of the password (GET /api/auth/me `hasPassword`; the server decides
  // again when the code is asked for and when the account is deleted). Anything but `false` keeps the password box.
  const usesCode = currentUser?.hasPassword === false;
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const orgName = profileData?.organization_id?.name || "";

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/api/auth/delete-account", usesCode ? { code } : {
        password,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Account deleted.");
      setOpen(false);
      navigate("/login");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete account.");
    },
  });

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/api/auth/delete-account/code");
      return response.data;
    },
    onSuccess: (data: any) => {
      setCodeSent(true);
      setCode("");
      toast.success(data?.message || `We sent a 6-digit code to your email. It works for ${CODE_TTL_MINUTES} minutes.`);
    },
    onError: (err: any) => {
      // (the account got a password since this page was loaded: the password box comes back)
      if (err.response?.data?.code === "use_password") queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.error(err.response?.data?.message || "Failed to send the code.");
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
        isConfirmDisabled={usesCode ? code.length !== 6 : password.length < 8}
      >
        {usesCode ? (
          <div className="flex flex-col gap-2.5 pt-2">
            <label className="text-sm text-foreground/80">Type the 6-digit code from your email to finalize</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-10 w-full rounded-md border bg-background dark:bg-black px-3 text-sm text-foreground outline-none transition-all duration-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 border-input"
                disabled={deleteAccountMutation.isPending}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => sendCodeMutation.mutate()}
                disabled={sendCodeMutation.isPending || deleteAccountMutation.isPending}
              >
                {codeSent ? "Send a new code" : "Send code"}
              </Button>
            </div>
            {/* (how long the code works, once a code was sent: 2026-11-25) */}
            {codeSent && <p className="text-xs text-muted-foreground">The code works for {CODE_TTL_MINUTES} minutes. You can ask for a new one after 60 seconds.</p>}
          </div>
        ) : (
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
        )}
      </DangerConfirmDialog>
    </>
  );
}
