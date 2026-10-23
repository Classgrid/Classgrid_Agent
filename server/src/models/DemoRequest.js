/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
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

import mongoose from "mongoose";

const demoRequestSchema = new mongoose.Schema(
  {
    institutionName: { type: String, required: true, trim: true },
    orgType: { type: String, required: true, trim: true },
    adminName: { type: String, required: true, trim: true },
    adminEmail: { type: String, required: true, trim: true, lowercase: true },
    adminPhone: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    district: { type: String, default: "", trim: true },
    taluka: { type: String, default: "", trim: true },
    cityVillage: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },
    message: { type: String, default: "" },
    
    // ── Discovery Fields (collected during meeting) ──────────────────
    studentCount: { type: Number, default: null },
    staffCount: { type: Number, default: null },
    campusCount: { type: Number, default: 1 },
    departmentCount: { type: Number, default: null },
    currentSystem: {
      type: String,
      enum: ["excel", "manual_registers", "other_erp", "no_system", null],
      default: null,
    },
    currentErpName: { type: String, default: "", trim: true },
    requiredModules: [{ type: String }],
    integrationsNeeded: [{ type: String }],
    historicalDataNeeded: { type: Boolean, default: false },
    targetGoLiveDate: { type: Date, default: null },
    provisioningType: {
      type: String,
      enum: ["sandbox", "production", null],
      default: null,
    },

    // ── Dashboard Allocation ─────────────────────────────────────────
    allocatedDashboards: [{
      type: String,
      enum: [
        "dashboard_admission",
        "dashboard_fees",
        "dashboard_exam",
        "dashboard_library",
        "dashboard_attendance",
        "dashboard_hr",
        "dashboard_hostel",
        "dashboard_student",
        "dashboard_faculty",
        "dashboard_organization",
      ],
    }],

    // ── Module Allocation ────────────────────────────────────────────
    allocatedModules: {
      // Core (always on)
      erp_core: { type: Boolean, default: true },
      // Toggleable modules
      admission_module: { type: Boolean, default: false },
      fee_module: { type: Boolean, default: false },
      hr_module: { type: Boolean, default: false },
      canteen_module: { type: Boolean, default: false },
      custom_domain_module: { type: Boolean, default: false },
      ai_assistant: { type: Boolean, default: false },
      analytics_module: { type: Boolean, default: false },
      website_module: { type: Boolean, default: false },
      certificates_module: { type: Boolean, default: false },
      events_module: { type: Boolean, default: false },
      feedback_module: { type: Boolean, default: false },
      holiday_module: { type: Boolean, default: false },
      id_cards_module: { type: Boolean, default: false },
      exam_proctoring: { type: Boolean, default: false },
      naac_module: { type: Boolean, default: false },
      marketplace_module: { type: Boolean, default: false },
    },

    // Marketing Site Scheduled Info
    meetingUrl: { type: String, default: "", trim: true },
    provider: { type: String, default: "", trim: true },
    scheduledAt: { type: Date, default: null },
    timezone: { type: String, default: "Asia/Kolkata", trim: true },
    
    // Verification
    isEmailVerified: { type: Boolean, default: false },
    otp: { type: String, default: "" },
    otpExpiresAt: { type: Date, default: null },

    // Core Backend Status
    status: {
      type: String,
      enum: ["new", "contacted", "demo_scheduled", "pending", "closed", "converted"],
      default: "new",
    },
    
    // Assignment (Sales/Team Claiming)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: { type: Date, default: null },
    
    // Legacy / Internal fields
    meetingStatus: {
      type: String,
      enum: ["pending", "scheduled", "completed", "cancelled", "rescheduled", "missed", "closed"],
      default: "pending",
    },
    meetingProvider: { type: String, default: "", trim: true },
    meetingScheduledAt: { type: Date, default: null },
    meetingTimezone: { type: String, default: "Asia/Kolkata", trim: true },
    meetingId: { type: String, default: "", trim: true },
    meetingNotes: { type: String, default: "" },
    demoReview: { type: String, default: "" },
    isOrganizationVetted: { type: Boolean, default: false },
    meetingScheduledByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    meetingScheduledBySource: { type: String, default: "", trim: true },
    lifecycleStage: {
      type: String,
      enum: [
        "lead_created",
        "meeting_scheduled",
        "approved",
        "provisioned",
        "activated",
        "setup",
        "live",
      ],
      default: "lead_created",
    },
    conversionStatus: {
      type: String,
      enum: ["not_started", "in_progress", "provisioned", "failed"],
      default: "not_started",
    },
    conversionStartedAt: { type: Date, default: null },
    conversionCompletedAt: { type: Date, default: null },
    conversionAttemptCount: { type: Number, default: 0 },
    convertedAt: { type: Date, default: null },
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    provisionedOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    provisionedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastConversionError: { type: String, default: "" },
  },
  { timestamps: true }
);

demoRequestSchema.index({ status: 1, createdAt: -1 });
demoRequestSchema.index({ conversionStatus: 1, createdAt: -1 });
demoRequestSchema.index({ adminEmail: 1, createdAt: -1 });
demoRequestSchema.index({ meetingStatus: 1, meetingScheduledAt: 1 });

export default mongoose.models.DemoRequest || mongoose.model("DemoRequest", demoRequestSchema);
