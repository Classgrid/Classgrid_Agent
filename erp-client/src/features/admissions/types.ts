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

// ── Admission Application (matches server/src/models/AdmissionApplication.js) ──

export type AdmissionStatus =
  | "draft"
  | "applied"
  | "payment_failed"
  | "under_verification"
  | "verified"
  | "rejected"
  | "waitlisted"
  | "allotted"
  | "confirmed"
  | "cancelled"
  | "enrolled"
  | "withdrawn"
  | "upgraded"
  | "rla_pending"
  | "fee_pending";

export type EntryMode = "PORTAL" | "DESK" | "CET";

export type DocStatus = "pending" | "verified" | "rejected";

export type StageHistoryEntry = {
  status: string;
  changed_by?: string;
  comment?: string;
  timestamp: string;
};

export type ApplicationDocument = {
  name: string;
  url?: string;
  status: DocStatus;
  rejection_reason?: string;
};

export type AdmissionApplication = {
  _id: string;
  organization_id: string;
  hierarchy_id?: string;
  entry_mode: EntryMode;
  clerk_id?: string;
  status: AdmissionStatus;
  rejection_reason?: string;
  en_number?: string;
  phone?: string;
  email?: string;
  full_name: string;
  dob?: string;
  merit_score: number;
  category?: string;
  seat_type?: string;
  general_rank?: number;
  category_rank?: number;
  waitlist_number?: number;
  allotted_in_round?: number;
  fee_payment_deadline?: string;
  stage_history: StageHistoryEntry[];
  rla_status?: "pending" | "reported" | "canceled" | "upgraded";
  form_data?: Record<string, unknown>;
  documents: ApplicationDocument[];
  fee_paid: boolean;
  payment_details?: {
    fee_type: "registration" | "admission";
    payment_status: "pending" | "success" | "failed" | "refunded";
    amount_paid: number;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
  };
  student_id?: string;
  prn?: string;
  is_deleted: boolean;
  createdAt: string;
  updatedAt: string;
};

// ── Analytics Response (matches getAdmissionAnalytics) ──

export type AdmissionAnalytics = {
  success: boolean;
  summary: {
    total_applications: number;
    funnel: Record<string, number>;
    fee_paid_count: number;
    fee_total_revenue?: number;
    conversion_rate: string;
  };
  document_summary?: {
    pending: number;
    verified: number;
    rejected: number;
  };
  fee_summary?: {
    total_collected: number;
    paid_count: number;
    pending_count: number;
  };
  merit_rounds_status?: Array<{ _id: string; count: number }>;
  breakdown: {
    by_category: Array<{ _id: string; count: number }>;
    by_seat_type: Array<{ _id: string; count: number }>;
  };
  daily_trend: Array<{ _id: string; count: number }>;
  score_distribution?: Array<{ _id: string; count: number }>;
};

// ── CET Dashboard Response (matches getCETDashboard) ──

export type CETDashboard = {
  success: boolean;
  cap_rounds: Array<{
    _id: string;
    total: number;
    claimed: number;
    upgraded: number;
    cancelled: number;
  }>;
  branch_fill_rates: Array<{
    _id: string;
    total: number;
    claimed: number;
  }>;
  rla_breakdown: Array<{ _id: string; count: number }>;
  seat_matrix: unknown;
};

// ── Admission Config API Response (matches GET /api/admission/config) ──
// The controller returns: { organization, structure_type, config, form_schema }
// where `config` is Organization.admission_config subdocument

export type FormSchemaField = {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
  locked_by_cet?: boolean;
  is_required?: boolean;
};

export type FormSchema = {
  structure_type: string;
  auth_method: string;
  sections?: Array<{
    id: string;
    label: string;
    fields: FormSchemaField[];
  }>;
  fields: {
    required: FormSchemaField[];
    optional: FormSchemaField[];
  };
  documents: Array<{ id: string; label: string; required: boolean }>;
};

export type AdmissionConfig = {
  // Top-level API response fields
  organization: string;
  structure_type: string;
  form_schema: FormSchema;
  // The nested config object from Organization.admission_config
  config: {
    is_portal_open?: boolean;
    is_merit_list_published?: boolean;
    registration_fee?: number;
    instructions?: string;
    max_applications_per_student?: number;
    cutoff_date?: string;
    application_config?: {
      document_validity_days?: Record<string, number | null>;
    };
    enrollment_config?: {
      editable_until?: string | null;
    };
    admission_round?: {
      current_round: number;
      max_rounds: number;
      round_history: Array<{
        round_number: number;
        merit_list_published_at?: string;
        seats_filled?: number;
        seats_remaining?: number;
      }>;
    };
    seat_matrix_policy?: {
      enabled: boolean;
      categories: Array<{ category_name: string; reservation_percentage: number }>;
    };
    waitlist_and_deadlines?: {
      waitlist_enabled: boolean;
      auto_promote_waitlist: boolean;
      fee_payment_deadline_hours: number;
      cancellation_handling: "return_to_pool" | "manual_review";
    };
    workflow_execution?: {
      require_admin_document_verification: boolean;
      prn_generation: string;
      login_credential_dispatch: string;
    };
    fee_config?: {
      admission_fee_structure_id?: string;
      dynamic_fee_mapping?: Array<{
        attribute: string;
        attribute_type: string;
        fee_structure_id: string;
      }>;
      refund_policy?: {
        enabled: boolean;
        rules: Array<{ days_before_start: number; refund_percentage: number }>;
      };
      session_start_date?: string;
    };
    form_builder_config?: {
      field_toggles: Array<{
        key: string;
        admission: boolean;
        onboarding: boolean;
        is_required?: boolean;
      }>;
      document_toggles: Array<{
        key: string;
        admission: boolean;
        onboarding: boolean;
      }>;
      custom_fields: Array<{
        field_key: string;
        field_label: string;
        field_type: string;
        options?: string[];
        is_required: boolean;
        section: string;
        admission: boolean;
        onboarding: boolean;
      }>;
    };
  };
  // Flat convenience fields for backward-compat pages
  strategy_type?: string;
  cap_rounds_enabled?: boolean;
  total_rounds?: number;
  is_active?: boolean;
};

// ── Merit List Response ──

export type MeritListEntry = {
  _id: string;
  full_name: string;
  phone?: string;
  merit_score: number;
  category?: string;
  general_rank?: number;
  category_rank?: number;
  status: AdmissionStatus;
  createdAt: string;
};

export type MeritListResponse = {
  success: boolean;
  count: number;
  merit_list: MeritListEntry[];
};

// ── Print Data ──

export type ApplicationPrintData = {
  success: boolean;
  application: AdmissionApplication;
  cet_allotment?: Record<string, unknown>;
};

// ── SMS Budget ──

export type SMSBudget = {
  sent_today: number;
  daily_limit: number;
  remaining: number;
  total_sent_this_month: number;
};
