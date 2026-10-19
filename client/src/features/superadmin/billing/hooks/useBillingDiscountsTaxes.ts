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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDiscounts, createDiscount, fetchTaxRules, createTaxRule, fetchTaxRuleVersions, createTaxRuleVersion, fetchCreditAccount, grantCredits } from '../../services/superAdminBillingApi';

export interface TaxRulePayload {
    name: string;
    code: string;
    taxPercentage: number;
    placeOfSupplyLogic: 'INTRA_STATE' | 'INTER_STATE' | 'INTERNATIONAL';
}

export interface DiscountPayload {
    name: string;
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    amountPaise?: number;
    percentage?: number;
    validFrom: string;
    validUntil?: string;
}

export const useDiscounts = () => {
  return useQuery({
    queryKey: ['billing-discounts'],
    queryFn: fetchDiscounts,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useCreateDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DiscountPayload) => createDiscount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-discounts'] });
    },
  });
};

export const useTaxRules = () => {
  return useQuery({
    queryKey: ['billing-tax-rules'],
    queryFn: fetchTaxRules,
    staleTime: 60 * 60 * 1000, // 1 hour (tax rules rarely change)
    retry: 3,
  });
};

export const useCreateTaxRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TaxRulePayload) => {
      const rule = await createTaxRule({ name: payload.name, code: payload.code });
      const isInterState = payload.placeOfSupplyLogic === 'INTER_STATE';
      const isIntraState = payload.placeOfSupplyLogic === 'INTRA_STATE';
      return createTaxRuleVersion(rule._id, {
        taxPercentage: payload.taxPercentage,
        igstPercentage: isInterState ? payload.taxPercentage : 0,
        cgstPercentage: isIntraState ? payload.taxPercentage / 2 : 0,
        sgstPercentage: isIntraState ? payload.taxPercentage / 2 : 0,
        placeOfSupplyLogic: payload.placeOfSupplyLogic,
        effectiveFrom: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-tax-rules'] });
    },
  });
};

export const useGrantCredits = (orgId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { amountPaise: number; reason: string }) => grantCredits(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-organization-credits', orgId] });
    },
  });
};

export const useCreditAccount = (orgId: string) => {
  return useQuery({
    queryKey: ['billing-organization-credits', orgId],
    queryFn: () => fetchCreditAccount(orgId),
    enabled: !!orgId,
  });
};

export const useTaxRuleVersions = (taxRuleId: string) => {
  return useQuery({
    queryKey: ['billing-tax-rule-versions', taxRuleId],
    queryFn: () => fetchTaxRuleVersions(taxRuleId),
    enabled: !!taxRuleId,
  });
};
