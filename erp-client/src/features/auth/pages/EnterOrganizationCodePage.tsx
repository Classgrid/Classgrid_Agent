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
import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { apiClient } from "@/lib/apiClient";
import { getRedirectPath } from "../auth-helpers";
import { useCurrentUser } from "../queries/useCurrentUser";

type VerifyOrganizationCodeResponse = {
  message: string;
  userRole: string;
  mustResetPassword?: boolean;
};

export function EnterOrganizationCodePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const type = user?.role === "student" ? "student" : "faculty";
      const { data } = await apiClient.post<VerifyOrganizationCodeResponse>("/api/org/verify-code", {
        code: code.trim().toUpperCase(),
        type,
      });
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success(data.message || "Organization connected successfully.");
      navigate(data.mustResetPassword ? "/required-password-reset" : getRedirectPath(data.userRole), { replace: true });
    },
    onError: (requestError: { message?: string }) => {
      setError(requestError.message || "The organization code could not be verified.");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (code.trim().length < 3) {
      setError("Enter the organization code provided by your institution.");
      return;
    }
    verifyMutation.mutate();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm" aria-labelledby="organization-code-title">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 aria-hidden="true" className="h-5 w-5" />
        </div>
        <h1 id="organization-code-title" className="text-2xl font-semibold text-foreground">Connect your organization</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter the code supplied by your organization administrator. This links your account to the correct institution and portal.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-busy={verifyMutation.isPending}>
          <div className="space-y-2">
            <label htmlFor="organization-code" className="text-sm font-medium text-foreground">Organization code</label>
            <Input
              id="organization-code"
              name="organizationCode"
              type="text"
              autoComplete="one-time-code"
              inputMode="text"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())}
              disabled={verifyMutation.isPending}
              placeholder="Enter code"
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          {error && <p role="alert" aria-live="assertive" className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={verifyMutation.isPending} isLoading={verifyMutation.isPending}>
            Verify and continue
          </Button>
        </form>
      </section>
    </main>
  );
}
