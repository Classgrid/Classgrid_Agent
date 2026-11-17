// Super admin Revenue page: money from Classgrid AI plans and credit top-ups. The types follow the API contract of
// /api/super-admin/billing/revenue/plans-summary, /payments and /payments/export (billing-revenue.controller.js).
// A payment row has the same shape as on the Transactions page, so its person, status and format helpers are reused.
import { apiClient } from "@/lib/apiClient";
import type { PaymentRow } from "../transactions/paymentsApi";

const BASE = "/api/super-admin/billing/revenue";

export type RevenueKind = "all" | "pro" | "max" | "topup" | "refunded" | "failed";

export interface MoneyTotal {
  amountInr: number;
  count: number;
}

export interface RevenueSource {
  key: string;
  kind: "plan" | "topup";
  planKey: string | null;
  planName: string | null;
  term: "month" | "year" | null;
  amountInr: number;
  count: number;
  credits: number | null;
}

export interface RevenueDay {
  day: string; // yyyy-MM-dd, an India day
  amountInr: number;
  count: number;
}

export interface RevenueSummary {
  moneyIn: { today: MoneyTotal; month: MoneyTotal; allTime: MoneyTotal };
  range: { from: string; to: string; isDefault: boolean };
  sources: RevenueSource[];
  daily: RevenueDay[];
  refunds: MoneyTotal;
  failed: MoneyTotal & { capped: boolean };
}

export interface RevenuePaymentsResponse {
  success: boolean;
  data: PaymentRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
  capped: boolean;
}

export interface RevenueRange {
  from?: string; // yyyy-MM-dd, an India day
  to?: string; // yyyy-MM-dd, an India day
}

export interface RevenuePaymentFilters extends RevenueRange {
  search?: string;
  kind?: RevenueKind;
  page?: number;
  limit?: number;
}

// Empty values are left out, so the server sees only the filters that are really set
function rangeParams(range: RevenueRange) {
  const params: Record<string, string | number> = {};
  if (range.from) params.from = range.from;
  if (range.to) params.to = range.to;
  return params;
}

function paymentParams(filters: RevenuePaymentFilters, withPaging: boolean) {
  const params = rangeParams(filters);
  const search = (filters.search || "").trim();
  if (search) params.search = search;
  if (filters.kind && filters.kind !== "all") params.kind = filters.kind;
  if (withPaging) {
    if (filters.page && filters.page > 1) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
  }
  return params;
}

export async function fetchRevenueSummary(range: RevenueRange): Promise<RevenueSummary> {
  const res = await apiClient.get(`${BASE}/plans-summary`, { params: rangeParams(range) });
  return res.data?.data as RevenueSummary;
}

export async function fetchRevenuePayments(filters: RevenuePaymentFilters): Promise<RevenuePaymentsResponse> {
  const res = await apiClient.get(`${BASE}/payments`, { params: paymentParams(filters, true) });
  return res.data as RevenuePaymentsResponse;
}

// Today's date in India as yyyy-MM-dd, for the file name (the Content-Disposition header can't be read from
// another origin, so the website names the file itself)
function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// The CSV of the filtered payments list (the newest 5,000 matching payments; page and limit are not sent)
export async function downloadRevenueCsv(filters: RevenuePaymentFilters): Promise<void> {
  const res = await apiClient.get(`${BASE}/payments/export`, { params: paymentParams(filters, false), responseType: "blob" });
  const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `classgrid-revenue-${todayInIndia()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before the link is freed
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
