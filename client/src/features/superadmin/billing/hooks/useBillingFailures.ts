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
import { 
  fetchFailedPayments, 
  fetchFailedPaymentDetail, 
  generatePaymentLink, 
  assignFailure, 
  addFailureNote, 
  resolveFailure,
  fetchFailureOverview,
  notifyFailureOrganization,
  exportFailureDiagnostic
} from '../../services/superAdminBillingApi';

export interface PaymentLinkPayload {
  amountPaise?: number;
  expiryHours?: number;
  sendEmail?: boolean;
}

export const useFailedPaymentsList = (filters: { status?: string } = {}) => {
  return useQuery({
    queryKey: ['billing-failed-payments', filters],
    queryFn: () => fetchFailedPayments(filters),
    staleTime: 60 * 1000,
    retry: 2,
  });
};

export const useFailureOverview = () => {
  return useQuery({
    queryKey: ['billing-failed-payments-overview'],
    queryFn: fetchFailureOverview,
    staleTime: 60 * 1000,
    retry: 2,
  });
};

export const useFailedPaymentDetail = (failureId: string) => {
  return useQuery({
    queryKey: ['billing-failed-payment-detail', failureId],
    queryFn: () => fetchFailedPaymentDetail(failureId),
    enabled: !!failureId,
    staleTime: 60 * 1000,
  });
};

export const useGeneratePaymentLink = (failureId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PaymentLinkPayload) => generatePaymentLink(failureId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-failed-payment-detail', failureId] });
    },
  });
};

export const useAssignFailure = (failureId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { assigneeId: string }) => assignFailure(failureId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-failed-payment-detail', failureId] });
      queryClient.invalidateQueries({ queryKey: ['billing-failed-payments'] });
    },
  });
};

export const useAddFailureNote = (failureId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { note: string }) => addFailureNote(failureId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-failed-payment-detail', failureId] });
    },
  });
};

export const useResolveFailure = (failureId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { resolution: string }) => resolveFailure(failureId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-failed-payment-detail', failureId] });
      queryClient.invalidateQueries({ queryKey: ['billing-failed-payments'] });
    },
  });
};

export const useNotifyFailureOrganization = (failureId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { message: string }) => notifyFailureOrganization(failureId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-failed-payment-detail', failureId] });
    },
  });
};

export const useFailureDiagnosticExport = (failureId: string) => {
  return useMutation({
    mutationFn: (payload: { format: 'JSON'; includeRedactedPayload: boolean }) =>
      exportFailureDiagnostic(failureId, payload),
  });
};
