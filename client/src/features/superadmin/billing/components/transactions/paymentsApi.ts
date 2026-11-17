// Super admin Transactions: every payment for Classgrid AI (plans, credit top-ups, failed attempts and older payments).
// The server reads plans and top-ups from the AI credit ledger (the only place every plan purchase is saved) and
// adds the failed and older payments, so this page shows one list instead of the old organization ledger.
// The types below follow the API contract of /api/super-admin/billing/transactions/payments.
import { apiClient } from "@/lib/apiClient";

const BASE = "/api/super-admin/billing/transactions";

export type PaymentKind = "plan" | "topup" | "other";
export type PaymentStatus = "paid" | "refunded" | "failed" | "pending";

export interface Person {
  userId: string | null;
  name: string;
  email: string;
  photoUrl: string | null;
  linked: boolean;
}

export interface PaymentPlan {
  key: string;
  name: string;
  term: "month" | "year" | null;
  studentPrice: boolean | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface PaymentRow {
  id: string;
  source: "credits" | "platform";
  kind: PaymentKind;
  status: PaymentStatus;
  amountInr: number;
  refundedInr: number;
  currency: "INR";
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  date: string;
  plan: PaymentPlan | null;
  credits: number | null;
  method: string | null;
  person: Person;
}

export interface PaymentRefund {
  refundId: string | null;
  amountInr: number;
  reason: string | null;
  date: string;
}

export interface PaymentDetail extends Omit<PaymentRow, "person"> {
  person: Person & {
    phone: string | null;
    currentPlan: { key: string; name: string; status: string; expiresAt: string | null } | null;
  };
  payment: {
    methodLabel: string | null;
    methodDetail: string | null;
    bankReference: string | null;
    feeInr: number | null;
    taxInr: number | null;
    netInr: number | null;
    paidAt: string | null;
    recordedAt: string;
    errorText: string | null;
    live: boolean;
  };
  refunds: PaymentRefund[];
  receipt: { sent: "plan_receipt" | "none"; to: string | null };
}

export interface PaymentsSummary {
  total: number;
  paid: { count: number; amountInr: number };
  refunded: { count: number };
  failed: { count: number };
  pending: { count: number };
}

export interface PaymentsResponse {
  success: boolean;
  data: PaymentRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
  summary: PaymentsSummary;
}

export interface PaymentFilters {
  search?: string;
  type?: "" | PaymentKind;
  plan?: "" | "pro" | "max" | "enterprise";
  status?: "" | PaymentStatus;
  from?: string; // yyyy-MM-dd, an India date
  to?: string; // yyyy-MM-dd, an India date
  page?: number;
  limit?: number;
}

// Empty values are left out, so the server sees only the filters that are really set
function toParams(filters: PaymentFilters, withPaging: boolean) {
  const params: Record<string, string | number> = {};
  const search = (filters.search || "").trim();
  if (search) params.search = search;
  if (filters.type) params.type = filters.type;
  if (filters.plan) params.plan = filters.plan;
  if (filters.status) params.status = filters.status;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (withPaging) {
    if (filters.page && filters.page > 1) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
  }
  return params;
}

export async function fetchPayments(filters: PaymentFilters): Promise<PaymentsResponse> {
  const res = await apiClient.get(`${BASE}/payments`, { params: toParams(filters, true) });
  return res.data as PaymentsResponse;
}

export async function fetchPayment(key: string): Promise<PaymentDetail> {
  const res = await apiClient.get(`${BASE}/payments/${encodeURIComponent(key)}`);
  return res.data?.data as PaymentDetail;
}

// Today's date in India as yyyy-MM-dd, for the file name. The server sends the same name in Content-Disposition,
// but that header can't be read from another origin (CORS exposes no custom headers), so the website names the file.
function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// The CSV of the filtered list (page and limit are not sent: the file holds the newest 5,000 matching payments)
export async function downloadPaymentsCsv(filters: PaymentFilters): Promise<void> {
  const res = await apiClient.get(`${BASE}/payments/export`, { params: toParams(filters, false), responseType: "blob" });
  const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `classgrid-payments-${todayInIndia()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before the link is freed
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
