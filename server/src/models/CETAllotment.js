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

const CETAllotmentSchema = new mongoose.Schema({
  // ─── IMPORTED FROM CET PDF ───
  organization_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  cap_round:         { type: String, enum: ['CAP-I', 'CAP-II', 'CAP-III', 'CAP-IV', 'INSTITUTE', 'SPOT', 'MGMT'], required: true },
  
  en_number:         { type: String, index: true },  // Optional for MGMT/Supernumerary without CET
  candidate_name:    { type: String, required: true },
  merit_number:      { type: Number },
  mht_cet_score:     { type: Number },              // e.g., 86.2351996
  // ─── DTE MAHARASHTRA STRICT RULES (2025-26) ───
  gender:            { type: String, enum: ['M', 'F', 'O'], required: true },
  
  // Rule 7.6 (a) Strict categories
  category:          { type: String, enum: ['OPEN', 'SC', 'ST', 'VJ/DT(NT-A)', 'NT-B', 'NT-C', 'NT-D', 'OBC', 'SEBC'], required: true },
  
  // Rule 5 Strict Candidature Types
  candidature_type:  { type: String, enum: ['Type-A', 'Type-B', 'Type-C', 'Type-D', 'Type-E', 'All-India', 'Minority', 'NRI/OCI/PIO', 'J&K/Ladakh'] },
  
  // Rule 7.6 (b, c, d, e) & Rule 7.5 (c) Supernumerary/Horizontal
  defence_type:      { type: String, enum: ['None', 'DEF-1', 'DEF-2', 'DEF-3'], default: 'None' },
  person_with_disability: { type: Boolean, default: false }, // Requires >= 40% benchmark
  supernumerary_quota: { type: String, enum: ['None', 'EWS', 'TFWS', 'Orphan'], default: 'None' },
  
  seat_type:         { type: String },               // e.g., GOPENS, LOPENS, GOPENH, etc.
  
  // ─── PCM ELIGIBILITY EVALUATION (Rule 7A) ───
  academic_eligibility: {
    pcm_aggregate_percentage: { type: Number },
    is_eligible: { type: Boolean },
    rejection_reason: { type: String }
  },
  
  // ─── BRANCH & INSTITUTE INFO (from PDF header) ───
  institute_code:    { type: String },               // e.g., 01105
  choice_code:       { type: String },               // e.g., 600624510
  branch_name:       { type: String },               // e.g., Civil Engineering
  
  // ─── PROCESSING STATUS ───
  status: {
    type: String,
    enum: [
      'imported',              // Just imported from PDF
      'acap_registered',       // Scanned QR at gate for Spot Round
      'student_registered',    // Student completed EN + Email + OTP
      'form_submitted',        // Student filled admission form
      'prn_generated',         // PRN assigned
      'admin_verified',        // Admin verified docs
      'division_allotted',     // Division & Roll No assigned
      'enrolled',              // Fully complete
      'upgraded_to_other',     // Student got better college in later CAP round
      'cancelled'              // Withdrawn
    ],
    default: 'imported'
  },
  
  // ─── RLA (Reporting for Admission) Tracking ───
  rla_status: {
    type: String,
    enum: ['pending', 'reported', 'confirmed', 'upgraded', 'cancelled'],
    default: 'pending'
  },
  reporting_deadline: { type: Date }, // T+3 days from allotment
  reported_at: { type: Date },
  reported_to_officer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rla_certificate_key: { type: String },  // PDF of confirmation letter uploaded to DTE portal
  
  // ─── CAP Upgrade Tracking (NOC Flow) ───
  upgrade_eligibility: {
    registered_for_upgrade: { type: Boolean, default: false },
    registered_at: { type: Date },
    consent_form_signed: { type: Boolean, default: false },  // Parent must sign
    consent_form_key: { type: String }        // S3 key of signed PDF
  },

  noc_details: {
    issued: { type: Boolean, default: false },
    issued_at: { type: Date },
    issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    noc_document_key: { type: String },       // Required for DTE compliance
    seat_released_at: { type: Date },
    replacement_allotted: { type: Boolean, default: false }
  },

  upgrade_transfer: {
    from_college_code: { type: String },
    to_college_code: { type: String },
    from_round: { type: String },
    to_round: { type: String },
    transferred_at: { type: Date }
  },
  
  // ─── Original Document Verification ───
  document_verification: {
    originals_verified: { type: Boolean, default: false },
    verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verified_at: Date,
    verification_certificate_key: String,
    documents_status: [{
      type: { type: String }, // e.g. "10th_marksheet"
      scan_uploaded: Boolean,
      original_seen: Boolean,
      verified: Boolean,
      rejection_reason: String
    }]
  },
  
  // ─── Vacancy Tracking ───
  vacancy_tracking: {
    cap_round: String,
    total_seats: Number,
    allotted: Number,
    reported: Number,
    confirmed: Number,
    lapsed: Number,
    vacancy_after_reporting: Number
  },

  // ─── Dynamic Fee Details ───
  fee_details: {
    category: String,
    seat_type: String,
    annual_fee: Number,
    waiver_percentage: Number,
    scholarship_type: String,
    actual_paid: Number
  },

  // ─── Audit Log ───
  audit_log: [{
    action: String,
    performed_by: String,
    ip_address: String,
    user_agent: String,
    timestamp: { type: Date, default: Date.now },
    metadata: Object
  }],
  
  // ─── COLLECTED DURING STUDENT REGISTRATION ───
  collected_email:   { type: String },  
  email_verified:    { type: Boolean, default: false },
  collected_phone:   { type: String },
  phone_verified:    { type: Boolean, default: false },
  
  // ─── LINKED AFTER ENROLLMENT ───
  linked_user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  
  prn:               { type: String },                   
  division:          { type: String },                   
  roll_number:       { type: Number },
  college_email:     { type: String },                   
  
  // ─── META ───
  imported_at:       { type: Date, default: Date.now },
  imported_by:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },    
  pdf_source_file:   { type: String },                    
}, { timestamps: true });

// Compound index for fast lookups
CETAllotmentSchema.index({ organization_id: 1, en_number: 1 });
CETAllotmentSchema.index({ organization_id: 1, cap_round: 1 });

export default mongoose.models.CETAllotment || mongoose.model("CETAllotment", CETAllotmentSchema);
