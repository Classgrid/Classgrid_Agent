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

import { apiClient } from "@/lib/apiClient";

export interface OrgUsageSummary {
  students: { active: number };
  faculty: { active: number };
  deptAdmins: { active: number };
  orgAdmins: { active: number };
  classrooms: { active: number };
  emailsSent: { thisMonth: number; total: number };
  smsSent: { thisMonth: number; total: number };
  storageUsedGb: number;
  storageLimitGb: number | null;
  liveClassMinutes: { thisMonth: number };
  aiUsage: { thisMonth: number };
}

export interface OrgUsageDailySeries {
  date: string;
  emails: number;
  sms: number;
  activeStudents: number;
  liveMinutes: number;
}

export interface OrgUsageBreakdownItem {
  name?: string;
  role?: string;
  count: number;
}

export interface OrgUsageResponse {
  summary: OrgUsageSummary;
  dailySeries: OrgUsageDailySeries[];
  studentBreakdown: {
    byDepartment: OrgUsageBreakdownItem[];
    byYear: OrgUsageBreakdownItem[];
  };
  facultyBreakdown: {
    byDepartment: OrgUsageBreakdownItem[];
  };
  deptAdminBreakdown: OrgUsageBreakdownItem[];
}

export interface OrgBillingSubscription {
  plan: string;
  status: string;
  isPaid: boolean;
  expiresAt: string | null;
  features: Record<string, boolean>;
  billing: {
    basePricePerMonth: number;
    pricePerGB: number;
    pricePerEmail: number;
    pricePerSms: number;
    pricePerApiRequest: number;
    pricePerAiToken: number;
    pricePerAgoraMinute: number;
  };
  limits: {
    storageGb: number | null;
  };
}

export interface OrgBillingCurrentCharges {
  platformFee: number;
  studentCharges?: { count: number; rate: number; total: number };
  facultyCharges?: { count: number; rate: number; total: number };
  deptAdminCharges?: { count: number; rate: number; total: number };
  emailCharges: { count: number; rate: number; total: number };
  smsCharges?: { count: number; rate: number; total: number };
  storageCharges?: { count: number; rate: number; total: number };
  apiCharges?: { count: number; rate: number; total: number };
  aiUsageCharges?: { count: number; rate: number; total: number };
  liveClassCharges?: { count: number; rate: number; total: number };
  moduleChargesTotal?: number;
  moduleLineItems?: { flagKey: string; label: string; price: number }[];
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
}

export interface OrgBillingResponse {
  subscription: OrgBillingSubscription;
  currentMonthCharges: OrgBillingCurrentCharges;
  invoices: any[]; // We'll refine this later
  payments: any[];
  monthlyHistory: { month: string; totalAmount: number; status: string }[];
  feeCollection: {
    totalInvoices: number;
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    transactions: number;
  };
  billingSettings?: {
    invoice_email: string;
    phone?: string;
    gstin?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    billing_contact_name?: string;
  };
  paymentGateway?: {
    fees_razorpay_key_id: string;
    has_fees_razorpay_key_secret: boolean;
    has_fees_razorpay_webhook_secret: boolean;
  };
}

export const orgAdminBillingApi = {
  getUsage: (params?: { month?: number; year?: number }) =>
    apiClient
      .get<OrgUsageResponse>("/api/org/usage", { params })
      .then((res) => res.data),

  getBilling: () =>
    apiClient.get<OrgBillingResponse>("/api/org/billing").then((res) => res.data),
};
