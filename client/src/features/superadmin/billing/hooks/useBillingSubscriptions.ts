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
import { fetchSubscriptions, fetchSubscriptionDetail, fetchPricingOverrides, setPricingOverride, previewProration, fetchSubscriptionOverview, assignSubscriptionPlan, addSubscriptionModule } from '../../services/superAdminBillingApi';

export const useSubscriptions = () => {
  return useQuery({
    queryKey: ['billing-subscriptions'],
    queryFn: fetchSubscriptions,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useSubscriptionOverview = () => {
  return useQuery({
    queryKey: ['billing-subscription-overview'],
    queryFn: fetchSubscriptionOverview,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useSubscriptionDetail = (orgId: string) => {
  return useQuery({
    queryKey: ['billing-subscription-detail', orgId],
    queryFn: () => fetchSubscriptionDetail(orgId),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
};

export const usePricingOverrides = (orgId: string) => {
  return useQuery({
    queryKey: ['billing-pricing-overrides', orgId],
    queryFn: () => fetchPricingOverrides(orgId),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSetPricingOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPricingOverride,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billing-pricing-overrides', variables.orgId] });
    },
  });
};

export const usePreviewProration = () => {
  return useMutation({
    mutationFn: (data: { orgId: string; newPlanId: string }) => previewProration(data.orgId, data.newPlanId),
  });
};

export const useAssignSubscriptionPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, billingPlanVersionId }: { orgId: string; billingPlanVersionId: string }) =>
      assignSubscriptionPlan(orgId, { billingPlanVersionId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billing-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['billing-subscription-detail', variables.orgId] });
    },
  });
};

export const useAddSubscriptionModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, billingModuleVersionId }: { orgId: string; billingModuleVersionId: string }) =>
      addSubscriptionModule(orgId, { billingModuleVersionId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billing-subscription-detail', variables.orgId] });
    },
  });
};
