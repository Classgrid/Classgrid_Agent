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
import { fetchInvoices, fetchInvoiceDetail, previewInvoice, fetchInvoiceDeliveryHistory, generateInvoice, issueInvoice } from '../../services/superAdminBillingApi';

export interface InvoiceFilters {
  status?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
}

export const useInvoices = (filters: InvoiceFilters) => {
  return useQuery({
    queryKey: ['billing-invoices', filters],
    queryFn: () => fetchInvoices(filters),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useInvoiceDetail = (invoiceId: string) => {
  return useQuery({
    queryKey: ['billing-invoice-detail', invoiceId],
    queryFn: () => fetchInvoiceDetail(invoiceId),
    enabled: !!invoiceId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useInvoicePreview = (payload: any) => {
  return useQuery({
    queryKey: ['billing-invoice-preview', payload],
    queryFn: () => previewInvoice(payload),
    enabled: !!payload && !!payload.organizationId,
    staleTime: 10 * 60 * 1000, // Preview is static for a given payload
    retry: 1,
  });
};

export const useInvoiceDeliveryHistory = (invoiceId: string) => {
  return useQuery({
    queryKey: ['billing-invoice-delivery', invoiceId],
    queryFn: () => fetchInvoiceDeliveryHistory(invoiceId),
    enabled: !!invoiceId,
    staleTime: 60 * 1000,
    retry: 2,
  });
};

export const useGenerateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      return generateInvoice(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
  });
};

export const useIssueInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      return issueInvoice(invoiceId);
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoice-detail', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
  });
};
