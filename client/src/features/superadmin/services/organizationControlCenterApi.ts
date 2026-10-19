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

export type MetricQuality = "actual" | "partial" | "unavailable";

export interface OrganizationOwner {
  _id?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  profilePicture?: string;
}

export interface OrganizationAdmin extends OrganizationOwner {
  _id: string;
  role?: string;
  department?: string;
  designation?: string;
}

export interface OrganizationStats {
  totalStudents?: number;
  totalFaculty?: number;
  totalUsers?: number;
}

export interface OrganizationCustomDomain {
  domain?: string | null;
  status?: string;
  txt_verified?: boolean;
  cname_verified?: boolean;
  ssl_provisioned?: boolean;
  allow_classgrid_url?: boolean;
  verified_at?: string | null;
  created_at?: string | null;
}

export interface OrganizationBranding {
  theme_colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  font_preference?: string;
  tagline?: string;
}

export interface OrganizationOnboardingProgress {
  tenant_created?: boolean;
  branding_configured?: boolean;
  academic_hierarchy_set?: boolean;
  staff_imported?: boolean;
  students_imported?: boolean;
  fee_structure_configured?: boolean;
  admission_form_configured?: boolean;
  first_login_completed?: boolean;
  domains_configured?: boolean;
  admins_invited?: boolean;
  current_stage?: string;
  last_synced_at?: string | null;
  completed_at?: string | null;
}

export interface OrganizationAcademicConfig {
  identifierLabel?: string;
  prnRequired?: boolean;
  prnLocked?: boolean;
  batches?: string[];
  branches?: string[];
  requiredFields?: Record<string, boolean | undefined>;
  idCardFields?: string[];
}

export interface OrganizationAdmissionConfig {
  is_portal_open?: boolean;
  is_merit_list_published?: boolean;
  registration_fee?: number;
  max_applications_per_student?: number;
  cutoff_date?: string | null;
  instructions?: string;
  seat_matrix_policy?: { enabled?: boolean };
  waitlist_and_deadlines?: {
    waitlist_enabled?: boolean;
    auto_promote_waitlist?: boolean;
    fee_payment_deadline_hours?: number;
  };
  workflow_execution?: {
    require_admin_document_verification?: boolean;
    prn_generation?: string;
    login_credential_dispatch?: string;
  };
}

export interface OrganizationFullProfile {
  _id: string;
  name?: string;
  org_type?: string;
  structure_type?: string;
  division_mode?: string;
  allow_sub_batches?: boolean;
  subdomain?: string;
  custom_domain?: OrganizationCustomDomain;
  address?: string;
  logo_url?: string;
  favicon_url?: string;
  campus_photo_url?: string;
  owner_id?: OrganizationOwner | string;
  ownerName?: string;
  ownerEmail?: string;
  contactNumber?: string;
  website?: string;
  designation?: string;
  affiliation?: string;
  allowed_domains?: string[];
  is_active?: boolean;
  status?: string;
  demoExpiresAt?: string | null;
  rollNumberLabel?: string;
  branding?: OrganizationBranding;
  onboarding_progress?: OrganizationOnboardingProgress;
  academic_config?: OrganizationAcademicConfig;
  admission_config?: OrganizationAdmissionConfig;
  feature_flags?: Record<string, boolean | undefined>;
  paymentMethod?: string;
  paymentAmount?: number;
  organizationCode?: string;
  honorCode?: string;
  private_code?: string;
  createdAt?: string;
  updatedAt?: string;
  stats?: OrganizationStats;
  adminsList?: OrganizationAdmin[];
}

export interface OrganizationUsageSnapshot {
  totalStudents?: number;
  totalTeachers?: number;
  totalAdmins?: number;
  totalClasses?: number;
  storageUsedGB?: number;
  emailsSent?: number;
  activeUsers?: number;
  lastUpdated?: string;
}

export interface OrganizationBillingRates {
  basePricePerMonth?: number;
  pricePerStudent?: number;
  pricePerGB?: number;
  freeStorageGB?: number;
}

export interface OrganizationSubscription {
  plan?: string;
  status?: string;
  isPaid?: boolean;
  expiresAt?: string | null;
  features?: Record<string, boolean | undefined>;
  billing?: OrganizationBillingRates;
  metadata?: {
    max_students?: number;
    max_faculty?: number;
    storage_limit_gb?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationDetailSnapshot {
  _id: string;
  name?: string;
  org_type?: string;
  structure_type?: string;
  status?: string;
  address?: string;
  logo_url?: string;
  owner_id?: string;
  ownerName?: string;
  ownerEmail?: string;
  owner?: OrganizationOwner;
  createdAt?: string;
  usage?: OrganizationUsageSnapshot;
  subscription?: OrganizationSubscription;
}

export interface OrganizationInsight {
  totalFaculty?: number;
  totalStudents?: number;
  totalClassrooms?: number;
  faculty?: Array<OrganizationOwner & {
    department?: string;
    classrooms?: Array<{
      _id: string;
      name?: string;
      subject?: string;
      memberCount?: number;
      isArchived?: boolean;
    }>;
  }>;
}

export interface OrganizationStatusMap {
  [key: string]: number | undefined;
}

export interface OrganizationTrackedCollections {
  [key: string]: number | undefined;
}

export interface OrganizationProviderConfiguration {
  provider: string;
  label: string;
  configured: boolean;
  requiredEnv?: string[];
  requiredEnvAny?: string[];
  optionalEnv?: string[];
  missingEnv?: string[];
  presentOptionalEnv?: string[];
  meterStatus?: string;
  note?: string;
}

export interface OrganizationResourceMeter {
  _id?: string;
  provider: string;
  providerLabel?: string;
  resourceType: string;
  metricKey: string;
  metricLabel: string;
  usageAmount?: number | null;
  unit?: string;
  costAmount?: number | null;
  currency?: string;
  quality?: string;
  source?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  lastSyncedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface OrganizationResourceMeterSummary {
  records?: OrganizationResourceMeter[];
  providerConfiguration?: OrganizationProviderConfiguration[];
  totals?: {
    knownCostInr?: number;
    totalMeters?: number;
    actualMeters?: number;
    partialMeters?: number;
    configuredProviders?: number;
    totalProviders?: number;
  };
  captureError?: string;
}
export interface OrganizationLegacyUsage {
  billingLedger?: {
    currentMonth?: {
      totalStorageGbDays?: number;
      totalEmails?: number;
      totalSmsSegments?: number;
      totalApiRequests?: number;
      totalAiTokens?: number;
      totalAgoraMinutes?: number;
      totalAmountInr?: number;
      lineItems?: Array<{
        provider: string;
        resourceLabel: string;
        totalQuantity: number;
        unit: string;
        unitRateInr: number;
        amountInr: number;
      }>;
    };
    latestInvoice?: {
      invoiceNumber: string;
      totalAmountInr: number;
      status: string;
      dueDate: string;
      month: number;
      year: number;
    };
  };
  storage?: {
    bytes?: number;
    mb?: string;
    gb?: number;
    fileCount?: number;
    includedGb?: number;
    billableGb?: number;
    configuredRateInr?: number;
    knownChargeInr?: number;
    coverage?: string;
    scope?: string;
  };
  db?: {
    notesCount?: number;
    trackedCollections?: OrganizationTrackedCollections;
    totalTrackedRecords?: number;
  };
  email?: {
    totalSent?: number;
    daily?: number;
    monthly?: number;
    typeBreakdown?: Record<string, number | undefined>;
  };
  support?: {
    totalTickets?: number;
    byStatus?: OrganizationStatusMap;
    highPriorityTickets?: number;
  };
  finance?: {
    invoices?: {
      total?: number;
      byStatus?: OrganizationStatusMap;
      totalBilledAmount?: number;
      totalPaidAmount?: number;
      totalOutstandingAmount?: number;
    };
    studentLedger?: {
      totalLedgers?: number;
      totalPayable?: number;
      totalPaid?: number;
      totalBalance?: number;
    };
    feeCollections?: {
      totalTransactions?: number;
      byStatus?: OrganizationStatusMap;
      successfulAmount?: number;
    };
    platformBilling?: {
      totalTransactions?: number;
      byStatus?: OrganizationStatusMap;
      successfulAmount?: number;
      refundedAmount?: number;
    };
    paymentRequests?: {
      total?: number;
      byStatus?: OrganizationStatusMap;
      approvedAmount?: number;
    };
  };
  resourceMeters?: OrganizationResourceMeterSummary;
  coverage?: {
    providerCostAllocation?: string;
    reason?: string;
  };
}

export interface OrganizationEmailAnalytics {
  total?: number;
  daily?: number;
  monthly?: number;
  typeBreakdown?: Record<string, number | undefined>;
  dailyChart?: Array<{ date: string; count: number }>;
}

export interface OrgBillingDashboardResponse {
  currentMonth: {
    totalStorageGbDays: number;
    totalEmails: number;
    totalSmsSegments: number;
    totalApiRequests: number;
    totalAiTokens: number;
    totalAgoraMinutes: number;
    totalAmountInr: number;
  };
  dailySeries: Array<{
    date: string;
    "API Requests": number;
    "AI Tokens": number;
    "Storage (GB)": number;
    "Emails": number;
    "SMS": number;
    "Video Mins": number;
    "Daily Cost (INR)": number;
  }>;
  latestInvoice: {
    id: string;
    invoiceNumber: string;
    totalAmountInr: number;
    status: string;
    dueDate: string;
    month: number;
    year: number;
  } | null;
}

export const organizationControlCenterApi = {
  getFullProfile: (orgId: string) =>
    apiClient
      .get<{ success: boolean; data: OrganizationFullProfile }>(
        `/api/super-admin/custom-domains/${orgId}/full`,
      )
      .then((response) => response.data.data),

  getDetail: (orgId: string) =>
    apiClient
      .get<{ success: boolean; data: OrganizationDetailSnapshot }>(
        `/api/super-admin/organizations/${orgId}`,
      )
      .then((response) => response.data.data),

  getInsight: (orgId: string) =>
    apiClient
      .get<OrganizationInsight>(`/api/admin/org-insight/${orgId}`)
      .then((response) => response.data),

  getLegacyUsage: (orgId: string) =>
    apiClient
      .get<OrganizationLegacyUsage>(`/api/admin/usage/${orgId}`)
      .then((response) => response.data),

  getEmailAnalytics: (orgId: string) =>
    apiClient
      .get<OrganizationEmailAnalytics>("/api/admin/email-analytics", {
        params: { orgId },
      })
      .then((response) => response.data),

  getOrgBillingDashboard: (): Promise<OrgBillingDashboardResponse> =>
    apiClient
      .get("/api/org-admin/dashboard/billing")
      .then((response) => response.data),

  createRazorpayOrder: (invoiceId: string) =>
    apiClient
      .post("/api/org-admin/dashboard/billing/razorpay-order", { invoiceId })
      .then((response) => response.data),

  verifyRazorpayPayment: (payload: any) =>
    apiClient
      .post("/api/org-admin/dashboard/billing/razorpay-verify", payload)
      .then((response) => response.data),

  
  convertToActive: (orgId: string, data: any = {}) =>
    apiClient
      .post(`/api/super-admin/organizations/${orgId}/convert-to-active`, data)
      .then((response) => response.data),

  deleteOrganization: (orgId: string) =>
    apiClient
      .delete(`/api/super-admin/orgs/${orgId}`)
      .then((response) => response.data),

  getHierarchyAudit: (orgId: string) =>
    apiClient
      .get(`/api/super-admin/orgs/${orgId}/hierarchy-audit`)
      .then((response) => response.data),

  getFacultyAudit: (orgId: string) =>
    apiClient
      .get(`/api/super-admin/orgs/${orgId}/faculty-audit`)
      .then((response) => response.data),

  getStudentsAudit: (orgId: string) =>
    apiClient
      .get(`/api/super-admin/orgs/${orgId}/students-audit`)
      .then((response) => response.data),

  getFeesAudit: (orgId: string) =>
    apiClient
      .get(`/api/super-admin/orgs/${orgId}/fees-audit`)
      .then((response) => response.data),

  getAdmissionsAudit: (orgId: string) =>
    apiClient
      .get(`/api/super-admin/orgs/${orgId}/admissions-audit`)
      .then((response) => response.data),

  updateOrganizationConfig: (orgId: string, data: { featureFlags?: Record<string, boolean>; billing?: any; limits?: any }) =>
    apiClient
      .put(`/api/super-admin/org/${orgId}/config`, data)
      .then((response) => response.data),
};
