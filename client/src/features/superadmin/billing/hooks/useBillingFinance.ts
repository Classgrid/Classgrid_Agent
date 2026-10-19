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
import { fetchRevenueOverview, fetchRevenueByOrg, fetchRevenueByModule, fetchRevenueByInvoice, exportRevenue, reconcileRevenue, fetchTransactions, fetchTransactionDetail, fetchTransactionWebhooks, fetchTransactionTimeline, fetchFailedPayments, refundTransaction } from '../../services/superAdminBillingApi';

export interface TransactionFilters {
  status?: string;
  type?: string;
  organizationId?: string;
  organizationType?: string;
  method?: string;
  settlementStatus?: string;
  refundStatus?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const useRevenueOverview = () => {
  return useQuery({
    queryKey: ['billing-revenue-overview'],
    queryFn: fetchRevenueOverview,
    staleTime: 5 * 60 * 1000,
  });
};

export const useRevenueByOrg = (filters: any = {}) => {
  return useQuery({
    queryKey: ['billing-revenue-org', filters],
    queryFn: () => fetchRevenueByOrg(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useRevenueByModule = (filters: any = {}) => {
  return useQuery({
    queryKey: ['billing-revenue-module', filters],
    queryFn: () => fetchRevenueByModule(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useRevenueByInvoice = () => {
  return useQuery({
    queryKey: ['billing-revenue-by-invoice'],
    queryFn: fetchRevenueByInvoice,
    staleTime: 5 * 60 * 1000,
  });
};

export const useExportRevenue = () => {
  return useMutation({
    mutationFn: () => exportRevenue(),
  });
};

export const useReconcileRevenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { targetDate: string }) => reconcileRevenue(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-revenue-overview'] });
      queryClient.invalidateQueries({ queryKey: ['billing-transactions'] });
    },
  });
};

export const useTransactions = (filters: TransactionFilters) => {
  return useQuery({
    queryKey: ['billing-transactions', filters],
    queryFn: () => fetchTransactions(filters),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useTransactionDetail = (txId: string) => {
  return useQuery({
    queryKey: ['billing-transaction-detail', txId],
    queryFn: () => fetchTransactionDetail(txId),
    enabled: !!txId,
    staleTime: 60 * 1000,
  });
};

export const useTransactionWebhooks = (txId: string) => {
  return useQuery({
    queryKey: ['billing-transaction-webhooks', txId],
    queryFn: () => fetchTransactionWebhooks(txId),
    enabled: !!txId,
    staleTime: 60 * 1000,
  });
};

export const useTransactionTimeline = (txId: string) => {
  return useQuery({
    queryKey: ['billing-transaction-timeline', txId],
    queryFn: () => fetchTransactionTimeline(txId),
    enabled: !!txId,
    staleTime: 60 * 1000,
  });
};

export const useRefundTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ txId, amountPaise, reason }: { txId: string; amountPaise: number; reason: string }) => {
      return refundTransaction(txId, { amountPaise, reason });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billing-transaction-detail', variables.txId] });
      queryClient.invalidateQueries({ queryKey: ['billing-transactions'] });
    },
  });
};

export const useFailedPayments = () => {
  return useQuery({
    queryKey: ['billing-failed-payments'],
    queryFn: fetchFailedPayments,
  });
};
