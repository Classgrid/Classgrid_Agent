// Failed payments for Classgrid AI (super admin, 2026-11-17): the types the server sends and the three calls the
// pages make. They read only the new /ai endpoints of the failed-payments router, which look at the payments
// Razorpay marked failed for a plan or AI credits. The old ERP endpoints and /api/super-admin/transactions are not
// used any more: the transactions route made a live Razorpay call on every open and showed ERP organizations.
import { apiClient } from "@/lib/apiClient";

const BASE = "/api/super-admin/billing/failed-payments/ai";

export type ReasonKey =
  | "cancelled"
  | "timed_out"
  | "insufficient_funds"
  | "otp_pin"
  | "declined"
  | "limit"
  | "risk"
  | "upi"
  | "technical"
  | "other";

export type PlanKey = "pro" | "max" | "enterprise";
export type Term = "month" | "year";
export type Who = "person" | "bank" | "razorpay" | "classgrid";
export type Method = "upi" | "card" | "netbanking" | "wallet" | "emi" | "other";

export type Purchase = {
  kind: "plan" | "credits" | "unknown";
  planKey: PlanKey | null;
  planName: string | null;
  term: Term | null;
  student: boolean;
};

export type PaidLater = {
  at: string;
  amountInr: number;
  paymentId: string;
  sameTry: boolean;
  match: "same" | "other_term" | "credits";
  planKey: PlanKey | null;
  planName: string | null;
  term: Term | null;
};

export type FailedPaymentItem = {
  id: string;
  failedAt: string;
  amountInr: number;
  currency: string;
  person: {
    userId: string | null;
    name: string;
    email: string;
    phone: string;
    profilePicture: string | null;
    accountExists: boolean;
  };
  purchase: Purchase;
  reason: {
    key: ReasonKey;
    razorpayText: string | null;
    who: Who | null;
  };
  method: Method | null;
  paidLater: PaidLater | null;
};

export type FailedPaymentDetail = FailedPaymentItem & {
  recordedAt: string;
  payment: {
    razorpayPaymentId: string | null;
    razorpayOrderId: string | null;
    emailUsed: string | null;
    phoneUsed: string | null;
    bank: string | null;
    wallet: string | null;
    cardNetwork: string | null;
    cardLast4: string | null;
  };
  razorpay: {
    errorCode: string | null;
    errorDescription: string | null;
    errorSource: string | null;
    errorStep: string | null;
    errorReason: string | null;
  };
  currentPlan: {
    id: "free" | PlanKey;
    name: string;
    status: string;
    billing: string;
    expiresAt: string | null;
  } | null;
  otherTries: Array<{
    id: string;
    failedAt: string;
    amountInr: number;
    purchase: Purchase;
    reasonKey: ReasonKey;
    paidLater: boolean;
  }>;
  laterPayments: Array<{
    at: string;
    amountInr: number;
    kind: "plan" | "credits";
    planKey: PlanKey | null;
    planName: string | null;
    term: Term | null;
    paymentId: string;
  }>;
  sources: { webhookSaved: boolean; checkedWithRazorpay: boolean };
};

export type FailedPaymentsSummary = {
  failedCount: number;
  last30DaysCount: number;
  peopleCount: number;
  paidLaterCount: number;
  notBoughtYet: { count: number; amountInr: number };
  lastFailedAt: string | null;
  plans: Array<{ key: PlanKey; name: string }>;
  capped: boolean;
};

export type PlanFilter = "all" | PlanKey | "credits" | "unknown";
export type OutcomeFilter = "all" | "paid_later" | "not_paid";

export type FailedPaymentsParams = {
  page: number;
  limit: number;
  search: string;
  reason: "all" | ReasonKey;
  plan: PlanFilter;
  outcome: OutcomeFilter;
  from: string; // "YYYY-MM-DD" or ""
  to: string;
};

export type FailedPaymentsListResponse = {
  data: FailedPaymentItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  capped: boolean;
};

// The server reads a missing parameter as "all", so "all" and empty values are left out of the address
function toQuery(params: FailedPaymentsParams) {
  const query: Record<string, string | number> = { page: params.page, limit: params.limit };
  const search = params.search.trim();
  if (search) query.search = search;
  if (params.reason !== "all") query.reason = params.reason;
  if (params.plan !== "all") query.plan = params.plan;
  if (params.outcome !== "all") query.outcome = params.outcome;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  return query;
}

export async function fetchFailedPayments(params: FailedPaymentsParams): Promise<FailedPaymentsListResponse> {
  const res = await apiClient.get(BASE, { params: toQuery(params) });
  return {
    data: res.data?.data ?? [],
    pagination: res.data?.pagination ?? { page: params.page, limit: params.limit, total: 0, totalPages: 1 },
    capped: Boolean(res.data?.capped),
  };
}

export async function fetchFailedPaymentsSummary(): Promise<FailedPaymentsSummary> {
  const res = await apiClient.get(`${BASE}/summary`);
  return res.data?.data;
}

export async function fetchFailedPayment(id: string): Promise<FailedPaymentDetail> {
  const res = await apiClient.get(`${BASE}/${encodeURIComponent(id)}`);
  return res.data?.data;
}

// apiClient turns every failed request into { message, code } where code is the HTTP status as text
// ("404", "400"), so the pages read the status from there to pick the right message
export function errorStatus(error: unknown): number | null {
  const e = error as { code?: unknown; response?: { status?: number } } | null;
  if (e?.response?.status) return e.response.status;
  const n = Number(e?.code);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function errorMessage(error: unknown): string {
  const e = error as { message?: unknown } | null;
  return typeof e?.message === "string" ? e.message : "";
}
