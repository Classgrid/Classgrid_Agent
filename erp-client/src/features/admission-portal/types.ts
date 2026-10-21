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

// ═══════════════════════════════════════════════════════════════
// Admission Portal Types — aligned to REAL backend API responses
// Source: GET /api/admission/config → admission-config.controller.js
//         strategy-selector.js → getResolvedAdmissionStrategy()
//         Organization.admission_config subdocument
// ═══════════════════════════════════════════════════════════════

// ── Form Schema Field (from admission-form-builder.service.js) ──

export type FormSchemaField = {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "tel" | "email" | "boolean" | "dropdown" | "file";
  placeholder?: string;
  icon?: string;
  options?: string[];
  pattern?: string;
  min?: number;
  max?: number;
  step?: number;
  locked_by_cet?: boolean;
};

export type FormSchemaDocument = {
  id: string;
  label: string;
  required: boolean;
};

// ── Form Schema (returned by getFormSchema in admission-form-builder.service.js) ──

export type FormSchema = {
  structure_type: string;
  auth_method: "phone_otp" | "cet_en_otp";
  sections?: Array<{
    id: string;
    label: string;
    fields: FormSchemaField[];
  }>;
  fields: {
    required: FormSchemaField[];
    optional: FormSchemaField[];
  };
  documents: FormSchemaDocument[];
};

// ── Organization admission_config subdocument shape ──

export type OrgAdmissionConfig = {
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
    categories: Array<{
      category_name: string;
      reservation_percentage: number;
    }>;
    supernumerary_seats?: {
      tfws_percent: number;
      ews_percent: number;
    };
  };
  waitlist_and_deadlines?: {
    waitlist_enabled: boolean;
    auto_promote_waitlist: boolean;
    fee_payment_deadline_hours: number;
    cancellation_handling: "return_to_pool" | "manual_review";
  };
  workflow_execution?: {
    require_admin_document_verification: boolean;
    prn_generation: "post_allotment_pre_fee" | "post_fee_payment";
    login_credential_dispatch: "with_allotment_email" | "post_fee_payment";
  };
  fee_config?: {
    admission_fee_structure_id?: string;
    dynamic_fee_mapping?: Array<{
      attribute: string;
      attribute_type: "category" | "seat_type";
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
      field_type: "text" | "number" | "date" | "dropdown" | "boolean" | "file";
      options?: string[];
      is_required: boolean;
      section: string;
      admission: boolean;
      onboarding: boolean;
    }>;
  };
};

// ── Full Config API Response (GET /api/admission/config) ──

export type EngineConfigResponse = {
  organization: string;
  structure_type: string;
  config: OrgAdmissionConfig;
  form_schema: FormSchema;
};

// ── Application State (AdmissionApplication model) ──

export type ApplicationDocument = {
  name: string;
  url?: string;
  status: "pending" | "verified" | "rejected";
  rejection_reason?: string;
};

export type StageHistoryEntry = {
  status: string;
  changed_by?: string;
  comment?: string;
  timestamp: string;
};

export type ApplicationState = {
  _id: string;
  organization_id: string;
  hierarchy_id?: string;
  entry_mode: "PORTAL" | "DESK" | "CET";
  status: string;
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
  fee_paid: boolean;
  prn?: string;
  form_data: Record<string, any>;
  documents: ApplicationDocument[];
  stage_history: StageHistoryEntry[];
  payment_details?: {
    fee_type: "registration" | "admission";
    payment_status: "pending" | "success" | "failed" | "refunded";
    amount_paid: number;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
  };
  // CET-specific
  rla_status?: "pending" | "reported" | "not_reported";
  noc_status?: "none" | "requested" | "issued" | "confirmed";
};

// ── Auth Responses ──

export type AuthResponse = {
  message: string;
  token?: string;
  application_id?: string;
  status?: string;
  error?: string;
};
