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
import { fetchPlans, fetchModules, fetchPlanVersions, fetchPlanVersionDetail, createPlan, fetchModuleVersions, createModule, fetchPlan, updatePlanEligibility, fetchModule, updateModuleEligibility, fetchBillingMetrics } from '../services/superAdminBillingApi';

export const useBillingPlans = () => {
  return useQuery({
    queryKey: ['billing-plans'],
    queryFn: fetchPlans,
  });
};

export const useBillingModules = () => {
  return useQuery({
    queryKey: ['billing-modules'],
    queryFn: fetchModules,
  });
};

export const useBillingMetrics = () => {
  return useQuery({
    queryKey: ['billing-metrics'],
    queryFn: fetchBillingMetrics,
    staleTime: 10 * 60 * 1000,
  });
};

export const usePlanVersions = (planId: string) => {
  return useQuery({
    queryKey: ['billing-plan-versions', planId],
    queryFn: () => fetchPlanVersions(planId),
    enabled: !!planId,
  });
};

export const usePlanVersionDetail = (planId: string, version: number) => {
  return useQuery({
    queryKey: ['billing-plan-version', planId, version],
    queryFn: () => fetchPlanVersionDetail(planId, version),
    enabled: !!planId && !!version,
  });
};

export const usePlanEligibility = (planId: string) => {
  return useQuery({
    queryKey: ['billing-plan-eligibility', planId],
    queryFn: () => fetchPlan(planId),
    enabled: !!planId,
  });
};

export const useUpdatePlanEligibility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string, payload: any }) => updatePlanEligibility(planId, payload),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['billing-plan-eligibility', planId] });
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
    },
  });
};

export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plans'] });
    },
  });
};

export const useModuleVersions = (moduleId: string) => {
  return useQuery({
    queryKey: ['billing-module-versions', moduleId],
    queryFn: () => fetchModuleVersions(moduleId),
    enabled: !!moduleId,
  });
};

export const useCreateModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createModule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-modules'] });
    },
  });
};

export const useModuleEligibility = (moduleId: string) => {
  return useQuery({
    queryKey: ['billing-module-eligibility', moduleId],
    queryFn: () => fetchModule(moduleId),
    enabled: !!moduleId,
  });
};

export const useUpdateModuleEligibility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, payload }: { moduleId: string, payload: any }) => updateModuleEligibility(moduleId, payload),
    onSuccess: (_, { moduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['billing-module-eligibility', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['billing-modules'] });
    },
  });
};
