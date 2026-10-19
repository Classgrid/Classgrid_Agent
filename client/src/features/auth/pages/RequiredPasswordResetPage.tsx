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

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { apiClient } from "@/lib/apiClient";
import { getRedirectPath } from "../auth-helpers";
import { useCurrentUser } from "../queries/useCurrentUser";

export function RequiredPasswordResetPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ message: string }>("/api/auth/force-reset-password", { password });
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success(data.message || "Password updated successfully.");
      const needsOrganization = ["faculty", "teacher"].includes(user?.role || "") && !user?.organization && !user?.organization_id;
      navigate(needsOrganization ? "/enter-org-code" : getRedirectPath(user?.role), { replace: true });
    },
    onError: (requestError: { message?: string }) => {
      setError(requestError.message || "Could not update the password.");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmation) {
      setError("The password confirmation does not match.");
      return;
    }

    resetMutation.mutate();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm" aria-labelledby="required-password-title">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound aria-hidden="true" className="h-5 w-5" />
        </div>
        <h1 id="required-password-title" className="text-2xl font-semibold text-foreground">Set a new password</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your account requires a new password before any dashboard can be opened.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-busy={resetMutation.isPending}>
          <div className="space-y-2">
            <label htmlFor="required-new-password" className="text-sm font-medium text-foreground">New password</label>
            <Input
              id="required-new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={resetMutation.isPending}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="required-confirm-password" className="text-sm font-medium text-foreground">Confirm new password</label>
            <Input
              id="required-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={resetMutation.isPending}
              required
              minLength={8}
            />
          </div>

          {error && <p role="alert" aria-live="assertive" className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={resetMutation.isPending} isLoading={resetMutation.isPending}>
            Save password and continue
          </Button>
        </form>
      </section>
    </main>
  );
}
