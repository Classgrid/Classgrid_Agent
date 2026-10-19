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

import type { AxiosRequestConfig } from "axios";
import { apiClient } from "@/lib/apiClient";

const BILLING_BASE = "/api/super-admin/billing";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
};

const data = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;
const request = <T>(config: AxiosRequestConfig) => apiClient.request<ApiEnvelope<T>>(config).then(data);

const normalizeTransaction = (transaction: any) => ({
  ...transaction,
  id: transaction.id || transaction._id,
  orgId: transaction.organizationId?._id || transaction.organizationId,
  organization: typeof transaction.organizationId === "object" ? transaction.organizationId : undefined,
  type: transaction.type || transaction.paymentFlow,
  amountPaise: transaction.amountCapturedPaise || (transaction.amount ? transaction.amount * 100 : 0),
  provider: "Razorpay",
  providerTxId: transaction.providerPaymentId || transaction.razorpayPaymentId,
  paymentMethod: transaction.method || transaction.paymentMethod
    ? { type: transaction.method || transaction.paymentMethod, last4: transaction.cardInfo?.last4 }
    : undefined,
});

const normalizeFailure = (failure: any) => ({
  ...failure,
  id: failure.id || failure._id,
  orgId: failure.organizationId?._id || failure.organizationId,
  organization: typeof failure.organizationId === "object" ? failure.organizationId : undefined,
  amountPaise: (failure.amount ? failure.amount * 100 : 0) || failure.amountPaise || failure.paymentOrderId?.amountPaise || 0,
  stage: failure.failureStage,
  reason: failure.errorDescription || failure.errorReason || failure.errorCode,
  status: failure.resolved ? "RESOLVED" : "UNRESOLVED",
  assigneeId: failure.assignedTo?._id || failure.assignedTo,
});

export const billingApi = apiClient;

export const fetchBillingPermissions = () =>
  request<string[]>({ method: "GET", url: `${BILLING_BASE}/permissions` });
export const fetchBillingOrganizations = () =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/organizations` });

// Catalog
export const fetchPlans = () => request<any[]>({ method: "GET", url: `${BILLING_BASE}/plans` });
export const createPlan = (payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/plans`, data: payload });
export const fetchPlan = (planId: string) =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/plans/${planId}` });
export const updatePlanEligibility = (planId: string, payload: any) =>
  request<any>({ method: "PATCH", url: `${BILLING_BASE}/plans/${planId}/eligibility`, data: payload });
export const fetchPlanVersions = (planId: string) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/plans/${planId}/versions` });
export const fetchPlanVersionDetail = async (planId: string, version: number) => {
  const versions = await fetchPlanVersions(planId);
  const match = versions.find((item) => Number(item.version) === Number(version));
  if (!match) throw new Error(`Plan version ${version} was not found`);
  return match;
};
export const createPlanVersion = (planId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/plans/${planId}/versions`, data: payload });
export const archivePlan = (planId: string, reason: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/plans/${planId}/archive`, data: { reason } });

export const fetchModules = () => request<any[]>({ method: "GET", url: `${BILLING_BASE}/modules` });
export const createModule = (payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/modules`, data: payload });
export const fetchModule = (moduleId: string) =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/modules/${moduleId}` });
export const updateModuleEligibility = (moduleId: string, payload: any) =>
  request<any>({ method: "PATCH", url: `${BILLING_BASE}/modules/${moduleId}/eligibility`, data: payload });
export const fetchModuleVersions = (moduleId: string) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/modules/${moduleId}/versions` });
export const createModuleVersion = (moduleId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/modules/${moduleId}/versions`, data: payload });
export const archiveModule = (moduleId: string, reason: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/modules/${moduleId}/archive`, data: { reason } });

// Discounts, credits, taxes
export const fetchDiscounts = () => request<any[]>({ method: "GET", url: `${BILLING_BASE}/discounts` });
export const createDiscount = (payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/discounts`, data: payload });
export const updateDiscount = (discountId: string, payload: any) =>
  request<any>({ method: "PATCH", url: `${BILLING_BASE}/discounts/${discountId}`, data: payload });
export const archiveDiscount = (discountId: string, reason: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/discounts/${discountId}/archive`, data: { reason } });
export const fetchCreditAccount = (organizationId: string) =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/organizations/${organizationId}/credits` });
export const grantCredits = (organizationId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/organizations/${organizationId}/credits/grant`, data: payload });
export const reverseCredits = (organizationId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/organizations/${organizationId}/credits/reverse`, data: payload });
export const fetchTaxes = () => fetchTaxRules();
export const fetchTaxRules = () => request<any[]>({ method: "GET", url: `${BILLING_BASE}/tax-rules` });
export const createTaxRule = (payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/tax-rules`, data: payload });
export const fetchTaxRuleVersions = (taxRuleId: string) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/tax-rules/${taxRuleId}/versions` });
export const createTaxRuleVersion = (taxRuleId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/tax-rules/${taxRuleId}/versions`, data: payload });

// Eligibility, metrics, usage, pricing
export const fetchEligibilityRules = () =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/eligibility-rules` });
export const createEligibilityRule = (payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/eligibility-rules`, data: payload });
export const updateEligibilityRule = (ruleId: string, payload: any) =>
  request<any>({ method: "PATCH", url: `${BILLING_BASE}/eligibility-rules/${ruleId}`, data: payload });
export const fetchBillingMetrics = () =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/metrics` });
export const fetchOrganizationUsage = (organizationId: string, params?: any) =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/organizations/${organizationId}/usage`, params });
export const recalculateOrganizationUsage = (organizationId: string, payload?: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/organizations/${organizationId}/recalculate-usage`, data: payload });
export const fetchPricingOverrides = (organizationId: string) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/organizations/${organizationId}/price-overrides` });
export const setPricingOverride = (payload: any) => {
  const { orgId, organizationId = orgId, ...body } = payload;
  return request<any>({
    method: "POST",
    url: `${BILLING_BASE}/organizations/${organizationId}/price-overrides`,
    data: body,
  });
};
export const updatePricingOverride = (overrideId: string, payload: any) =>
  request<any>({ method: "PATCH", url: `${BILLING_BASE}/price-overrides/${overrideId}`, data: payload });
export const deletePricingOverride = (overrideId: string, reason: string) =>
  request<any>({ method: "DELETE", url: `${BILLING_BASE}/price-overrides/${overrideId}`, data: { reason } });

// Subscriptions
export const fetchSubscriptions = () =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/subscriptions` });
export const fetchSubscriptionOverview = () =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/subscriptions/overview` });
export const fetchSubscriptionDetail = (organizationId: string) =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/subscriptions/${organizationId}` });
export const previewProration = (organizationId: string, newPlanId: string) =>
  request<any>({
    method: "POST",
    url: `${BILLING_BASE}/subscriptions/${organizationId}/preview`,
    data: { newPlanId },
  });
export const assignSubscriptionPlan = (organizationId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/subscriptions/${organizationId}/assign-plan`, data: payload });
export const changeSubscriptionPlan = (organizationId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/subscriptions/${organizationId}/change-plan`, data: payload });
export const addSubscriptionModule = (organizationId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/subscriptions/${organizationId}/add-module`, data: payload });
export const removeSubscriptionModule = (organizationId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/subscriptions/${organizationId}/remove-module`, data: payload });
export const changeSubscriptionCycle = (organizationId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/subscriptions/${organizationId}/change-cycle`, data: payload });
export const pauseSubscription = (organizationId: string, reason: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/subscriptions/${organizationId}/pause`, data: { reason } });
export const resumeSubscription = (organizationId: string, reason: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/subscriptions/${organizationId}/resume`, data: { reason } });
export const cancelSubscription = (organizationId: string, reason: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/subscriptions/${organizationId}/cancel`, data: { reason } });
export const fetchSubscriptionHistory = (organizationId: string) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/subscriptions/${organizationId}/history` });
export const fetchUpcomingInvoice = (organizationId: string) =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/subscriptions/${organizationId}/upcoming-invoice` });

// Revenue
export const fetchRevenueOverview = (params?: any) =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/revenue`, params });
export const fetchRevenueByOrg = async (params?: any) => {
  const response = await apiClient.get<ApiEnvelope<any[]>>(`/api/super-admin/revenue/by-organization`, { params });
  return response.data.data;
};
export const fetchRevenueByModule = async (params?: any) => {
  const response = await apiClient.get<ApiEnvelope<any[]>>(`/api/super-admin/revenue/by-type`, { params });
  return response.data.data;
};
export const fetchRevenueByInvoice = (params?: any) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/revenue/by-invoice`, params });
export const fetchRevenueInvoices = fetchRevenueByInvoice;
export const exportRevenue = (filters?: any) =>
  request<any>({
    method: "POST",
    url: `${BILLING_BASE}/revenue/export`,
    data: { format: "CSV", filters: filters || {} },
  });
export const reconcileRevenue = (payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/revenue/reconcile`, data: payload });
export const fetchBillingExportJob = (jobId: string) =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/export-jobs/${jobId}` });
export const fetchBillingExportDownload = (jobId: string) =>
  request<{ url: string; fileName: string; expiresInSeconds: number }>({
    method: "GET",
    url: `${BILLING_BASE}/export-jobs/${jobId}/download`,
  });

// Transactions
export const fetchTransactions = async (filters: any = {}) => {
  const { type, ...params } = filters;
  if (type) params.paymentFlow = type;
  const response = await apiClient.get<ApiEnvelope<any[]>>(`/api/super-admin/transactions`, { params });
  return response.data.data.map(normalizeTransaction);
};
export const fetchTransactionDetail = async (transactionId: string) => {
  const [transaction, events] = await Promise.all([
    request<any>({ method: "GET", url: `/api/super-admin/transactions/${transactionId}` }),
    request<any[]>({ method: "GET", url: `${BILLING_BASE}/transactions/${transactionId}/timeline` }),
  ]);
  return { ...normalizeTransaction(transaction), events };
};
export const fetchTransactionWebhooks = (transactionId: string) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/transactions/${transactionId}/webhooks` });
export const fetchTransactionTimeline = (transactionId: string) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/transactions/${transactionId}/timeline` });
export const recheckTransaction = (transactionId: string, reason?: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/transactions/${transactionId}/recheck`, data: { reason } });
export const refundTransaction = (transactionId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/transactions/${transactionId}/refund`, data: payload });
export const reconcileTransaction = (transactionId: string, reason?: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/transactions/${transactionId}/reconcile`, data: { reason } });

// Invoices
export const fetchInvoices = (filters: any = {}) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/invoices`, params: filters });
export const fetchInvoiceOverview = async () => {
  const invoices = await fetchInvoices({});
  return invoices.reduce(
    (result, invoice) => {
      result.total += 1;
      result.amountDuePaise += Math.max(Number(invoice.amountDuePaise) || 0, 0);
      result.byStatus[invoice.status] = (result.byStatus[invoice.status] || 0) + 1;
      return result;
    },
    { total: 0, amountDuePaise: 0, byStatus: {} as Record<string, number> }
  );
};
export const fetchInvoiceDetail = (invoiceId: string) =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/invoices/${invoiceId}` });
export const previewInvoice = (payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/invoices/preview`, data: payload });
export const generateInvoice = (payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/invoices/generate`, data: payload });
export const issueInvoice = (invoiceId: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/invoices/${invoiceId}/issue` });
export const sendInvoice = (invoiceId: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/invoices/${invoiceId}/send` });
export const voidInvoice = (invoiceId: string, reason: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/invoices/${invoiceId}/void`, data: { reason } });
export const createCreditNote = (invoiceId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/invoices/${invoiceId}/credit-notes`, data: payload });
export const fetchInvoicePdf = (invoiceId: string) =>
  apiClient.get(`${BILLING_BASE}/invoices/${invoiceId}/pdf`, { responseType: "blob" }).then((response) => response.data);
export const fetchInvoiceDeliveryHistory = (invoiceId: string) =>
  request<any[]>({ method: "GET", url: `${BILLING_BASE}/invoices/${invoiceId}/delivery-history` });

// Failed payments
export const fetchFailedPayments = async (filters: any = {}) => {
  const failures = await request<any[]>({ method: "GET", url: `/api/super-admin/transactions`, params: { ...filters, status: 'failed' } });
  return failures.map(normalizeFailure).filter((failure) => {
    if (!filters.status || filters.status === "ALL") return true;
    return failure.status === filters.status;
  });
};
export const fetchFailureOverview = () =>
  request<any>({ method: "GET", url: `${BILLING_BASE}/failed-payments/overview` });
export const fetchFailedPaymentDetail = (failureId: string) =>
  request<any>({ method: "GET", url: `/api/super-admin/transactions/${failureId}` }).then(normalizeFailure);
export const generatePaymentLink = (failureId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/failed-payments/${failureId}/generate-payment-link`, data: payload });
export const retryFailureWebhook = (failureId: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/failed-payments/${failureId}/retry-webhook` });
export const recheckFailureProvider = (failureId: string) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/failed-payments/${failureId}/recheck-provider` });
export const notifyFailureOrganization = (failureId: string, payload: { message: string }) =>
  request<any>({
    method: "POST",
    url: `${BILLING_BASE}/failed-payments/${failureId}/notify-organization`,
    data: payload,
  });
export const exportFailureDiagnostic = (
  failureId: string,
  payload: { format: "JSON"; includeRedactedPayload: boolean },
) =>
  request<any>({
    method: "POST",
    url: `${BILLING_BASE}/failed-payments/${failureId}/diagnostic-export`,
    data: payload,
  });
export const assignFailure = (failureId: string, payload: { assigneeId?: string; userId?: string }) =>
  request<any>({
    method: "POST",
    url: `${BILLING_BASE}/failed-payments/${failureId}/assign`,
    data: { userId: payload.userId ?? payload.assigneeId ?? null },
  });
export const addFailureNote = (failureId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/failed-payments/${failureId}/add-note`, data: payload });
export const resolveFailure = (failureId: string, payload: any) =>
  request<any>({ method: "POST", url: `${BILLING_BASE}/failed-payments/${failureId}/resolve`, data: payload });
