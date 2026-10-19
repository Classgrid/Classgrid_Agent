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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgDetailApi, type OrgBillingRates } from "../services/superAdminApi";

export const orgDetailKey = (orgId: string) =>
  ["super-admin", "org-detail", orgId] as const;

/** Fetch full org detail: usage + subscription + billing rates */
export function useOrgDetail(orgId: string | undefined) {
  return useQuery({
    queryKey: orgDetailKey(orgId ?? ""),
    queryFn: () => orgDetailApi.getOrgDetail(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
    retry: 1,
  });
}

/** Save billing rates for this org — invalidates detail on success */
export function useSaveBillingRates(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rates: Partial<OrgBillingRates> & { plan?: string }) =>
      orgDetailApi.saveBillingRates(orgId, rates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgDetailKey(orgId) });
    },
  });
}

/** Create a Razorpay Order for Platform Subscription */
export function useCreateRazorpayOrder(orgId: string) {
  return useMutation({
    mutationFn: (amount: number) => orgDetailApi.createRazorpayOrder(orgId, amount),
  });
}

/** Verify Platform Subscription Payment */
export function useVerifyRazorpayPayment(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => orgDetailApi.verifyRazorpayPayment(orgId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgDetailKey(orgId) });
    },
  });
}
