<!-- CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK) -->
`javascript
--- File: AcademicHierarchy.js ---
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

/**
 * AcademicHierarchy — The universal academic node model.
 * 
 * Replaces the old flat "branches" / "batches" arrays on Organization.
 * Every level in the hierarchy is a node in this collection,
 * linked via parent_id to form a tree.
 * 
 * Examples by structure_type:
 * 
 * Engineering (Plan 1):
 *   Degree("B.Tech") → Department("Computer") → Year("FY") → Semester("Sem 1") → Division("A") → SubBatch("A1")
 * 
 * School with Divisions (Plan 2):
 *   Standard("Class 10") → Division("A")
 * 
 * School without Divisions (Plan 3):
 *   Standard("Class 10") → Division("Default")  [auto-created, hidden in UI]
 * 
 * Coaching (Plan 4):
 *   Course("JEE Advanced") → Batch("Morning Batch")
 * 
 * Junior College (Plan 5):
 *   Stream("Science") → Standard("11th") → Division("A")
 * 
 * Diploma (Plan 6):
 *   Department("Mechanical") → Year("FY") → Semester("Sem 1")
 * 
 * Custom (Plan 7):
 *   Group("Level 1") → SubGroup("Group A")
 */

const academicHierarchySchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },

        // The type of this node in the hierarchy tree
        level_type: {
            type: String,
            enum: [
                "degree",       // Engineering: B.Tech, M.Tech
                "department",   // Engineering/Diploma: Computer, IT, Mechanical
                "year",         // FY, SY, TY, Final Year
                "semester",     // Sem 1, Sem 2, ... Sem 8
                "division",     // A, B, C, D
                "sub_batch",    // A1, A2 (lab splitting under a division)
                "standard",     // School/Jr College: Class 1, Class 10, 11th, 12th
                "stream",       // Jr College: Science, Commerce, Arts
                "course",       // Coaching: JEE Advanced, NEET, MHT-CET
                "batch",        // Coaching: Morning, Evening, Weekend
                "group",        // Custom: any grouping
                "sub_group",    // Custom: nested grouping
            ],
            required: true,
        },

        // Display name: "Computer Engineering", "Division A", "Sem 1", etc.
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Short code for timetables, reports: "CE", "A", "S1"
        code: {
            type: String,
            trim: true,
            default: "",
        },

        // Parent node — null means this is a root node (top of the tree)
        parent_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicHierarchy",
            default: null,
            index: true,
        },

        // Ordering within siblings (for display sorting)
        sort_order: {
            type: Number,
            default: 0,
        },

        // For sub_batch nodes: marks this as a lab/practical splitting node
        is_sub_batch: {
            type: Boolean,
            default: false,
        },

        // Sub-batch capacity (how many students per lab batch)
        sub_batch_capacity: {
            type: Number,
            default: null,
        },

        // Whether this node is active (soft-delete support)
        is_active: {
            type: Boolean,
            default: true,
        },

        // Academic year association (for year/semester nodes)
        academic_year: {
            type: String,
            default: null,  // e.g. "2025-26"
        },

        // Metadata: number of students currently in this node (denormalized for dashboards)
        student_count: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for fast hierarchy traversal
academicHierarchySchema.index({ organization_id: 1, level_type: 1 });
academicHierarchySchema.index({ organization_id: 1, parent_id: 1 });
// Prevent duplicate names at the same level under the same parent
academicHierarchySchema.index(
    { organization_id: 1, parent_id: 1, name: 1 },
    { unique: true }
);

export default mongoose.models.AcademicHierarchy ||
    mongoose.model("AcademicHierarchy", academicHierarchySchema);


--- File: ActivityLog.js ---
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

const activityLogSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },

        // What action was performed
        action: {
            type: String,
            required: true,
            enum: [
                "view_material",
                "view_announcement",
                "view_quiz",
                "submit_quiz",
                "open_chat",
                "send_message",
                "join_classroom",
                "download_material",
                "note_upload",
                "note_approved",
                "login",
                "announcement_created"
            ],
        },

        // Type of content interacted with
        targetType: {
            type: String,
            required: true,
            enum: ["material", "announcement", "quiz", "chat", "classroom", "note", "system", "org_announcement"],
        },

        // ID of the content (could be Supabase UUID or Mongo ObjectId)
        targetId: {
            type: String,
            default: null,
        },

        // Human-readable title for display
        targetTitle: {
            type: String,
            default: "",
        },

        // Flexible metadata for future features
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        // When this activity happened
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for analytics queries
activityLogSchema.index({ classroom: 1, action: 1, timestamp: -1 });
activityLogSchema.index({ classroom: 1, user: 1, timestamp: -1 });
activityLogSchema.index({ classroom: 1, targetId: 1, user: 1 });

// TTL index — auto-delete logs older than 1 year (optional, for scalability)
// activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.model("ActivityLog", activityLogSchema);


--- File: AdminAuditLog.js ---
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

/**
 * AdminAuditLog — immutable record of every admin action.
 * Actor fields are ALWAYS derived server-side from req.user.
 * NEVER accept actorName / actorRole / organization_id from the request body.
 */
const adminAuditLogSchema = new mongoose.Schema(
    {
        // ── Actor (who did it) ──────────────────────────────────
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // system events might not have a user
        },
        actorName: { type: String, required: true },
        actorRole: {
            type: String,
            enum: ["org_admin", "super_admin", "system"],
            required: true,
        },

        // ── Scope ──────────────────────────────────────────────
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
        },
        organizationName: { type: String, default: "" },
        orgType: {
            type: String,
            enum: ["K12", "HIGHER_ED", "COACHING", "CORPORATE", "DEMO", "TRIAL"],
            default: null,
        },

        // ── Action ─────────────────────────────────────────────
        action: {
            type: String,
            required: true,
            enum: [
                // ── Org Admin actions ───────────────────────────
                "add_faculty",
                "remove_faculty",
                "remove_student",
                "remove_member",
                "invite_staff",
                "resend_invite",
                "change_role",
                "bulk_role_update",
                "bulk_suspend",
                "bulk_reactivate",
                "bulk_delete",
                "archive_classroom",
                "restore_classroom",
                "approve_note",
                "reject_note",
                "create_announcement",
                "delete_announcement",
                "approve_org",
                "reject_org",
                "suspend_org",
                "block_org",
                "reactivate_org",
                "delete_org",
                "suspend_user",
                "block_user",
                "delete_user",
                "reactivate_user",
                "change_password",
                "login_as_demo",
                "update_branding",
                "update_domains",
                "update_org_type",
                "update_academic_config",
                "schedule_promotion",
                "promote_students",
                "regenerate_org_code",
                "clear_subdomain",
                "update_subdomain",
                "update_custom_domain_settings",
                "register_custom_domain",
                "change_custom_domain",
                "verify_custom_domain",
                "delete_custom_domain",
                // ── Attendance security actions ─────────────────
                "attendance_suspicious",
                "attendance_manual_override",
                // ── Super Admin / God Mode actions ─────────────
                "org.suspend",
                "org.activate",
                "org.delete",
                "org.impersonate",
                "user.ban",
                "user.unban",
                "user.force_logout",
                "user.role_change",
                "user.reset_password",
                "user.gdpr_export",
                "user.gdpr_erase",
                "subscription.update",
                "feature_flag.toggle",
                "feature_flag.kill_all",
                "platform.broadcast",
                "UPDATE_BILLING",
                "VIEW",
                "WEBHOOK_EVENT"
            ],
        },

        // ── Target (what was affected) ─────────────────────────
        targetId: { type: String, default: null },
        targetName: { type: String, default: "" },
        targetType: {
            type: String,
            enum: [
                "faculty", "student", "classroom", "note", "announcement",
                "organization", "user", "users", "academic", "demo", "AttendanceSession",
                "AttendanceRecord", "feature_flag", "subscription", "platform", "billing"
            ],
            required: true,
        },

        // ── State snapshot (for rollback) ───────────────────────
        previousState: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },

        // ── Extra diff metadata (old → new role, etc.) ─────────
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        // ── Rollback tracking ───────────────────────────────────
        rollbackStatus: {
            type: String,
            enum: ["none", "rolled_back"],
            default: "none",
        },
        rolledBackBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        rolledBackAt: { type: Date, default: null },

        // ── Request context (security & performance) ────────────
        ip: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        durationMs: { type: Number, default: 0 },
        status: { type: String, enum: ["success", "failure", "pending"], default: "success" },

        // ── Timestamp (indexed for fast time-range queries) ────
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false, // using custom `timestamp` field
    }
);

// Compound indexes for dashboard queries
adminAuditLogSchema.index({ organization_id: 1, timestamp: -1 });
adminAuditLogSchema.index({ actorId: 1, timestamp: -1 });
adminAuditLogSchema.index({ action: 1, timestamp: -1 });
adminAuditLogSchema.index({ rollbackStatus: 1, timestamp: -1 });

export default mongoose.models.AdminAuditLog ||
    mongoose.model("AdminAuditLog", adminAuditLogSchema);


--- File: AdmissionApplication.js ---
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

const admissionApplicationSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        // Links to specific Branch/Standard (e.g. Computer Engineering)
        hierarchy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicHierarchy",
            index: true,
        },
        // --- Track Isolation Fields ---
        entry_mode: {
            type: String,
            enum: ["PORTAL", "DESK", "CET"],
            default: "PORTAL"
        },
        clerk_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        printout_generated: { type: Boolean, default: false },
        printout_url: { type: String },
        // The stage in the admission pipe
        status: {
            type: String,
            enum: [
                "draft", "applied", "payment_failed", 
                "under_verification", "verified", "rejected", 
                "waitlisted", "allotted", "confirmed", 
                "cancelled", "enrolled", "withdrawn", "upgraded",
                "rla_pending", "fee_pending"
            ],
            default: "draft",
        },
        rejection_reason: { type: String, default: null },

        // Identity
        en_number: { type: String, index: true, sparse: true }, // Engineering: EN Number
        phone: { type: String, index: true, sparse: true },   // Schools/Coaching/Direct
        email: { type: String, lowercase: true, index: true, sparse: true },
        full_name: { type: String, required: true },
        dob: { type: Date },

        // 🔐 Registration Credentials (For Engineering/Junior College/Coaching Portal)
        credentials: {
            verified_main_email: { type: String, lowercase: true },
            is_email_verified: { type: Boolean, default: false },
            verified_main_phone: { type: String },
            is_phone_verified: { type: Boolean, default: false },
            password_hash: { type: String }
        },

        // 📈 Merit & Ranking Engine
        merit_score: { type: Number, default: 0 },         // Calculated percentage/score
        category: { type: String },                        // e.g., OPEN, OBC, SC, ST
        seat_type: { type: String },                       // e.g., CAP, MANAGEMENT, TFWS
        general_rank: { type: Number, default: null },     // Overall # rank
        category_rank: { type: Number, default: null },    // Category specific # rank
        waitlist_number: { type: Number, default: null },  // Waitlist position
        
        // ⏳ Deadlines & Allotment Config
        allotted_in_round: { type: Number, default: null },
        fee_payment_deadline: { type: Date, default: null }, // Auto-cancelled past this date


        // 🏗️ History & Lifecycle
        // For spot round projector tracking
        is_called: { type: Boolean, default: false },
        called_at: { type: Date, default: null },

        stage_history: [
            {
                status: String,
                changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                comment: String,
                timestamp: { type: Date, default: Date.now }
            }
        ],
        
        // 🧪 Engineering/RLA Specific
        rla_status: { 
            type: String, 
            enum: ["pending", "reported", "canceled", "upgraded"], 
            default: "pending" 
        },
        allotment_history: [
            {
                round: String,
                branch: String,
                seat_type: String,
                date: { type: Date, default: Date.now },
            }
        ],

        // 📁 Documents & Form Data
        // Complete demographic, medical, academic, and family data mapped to 17 Categories
        form_data: {
            // 1. Personal & 17. Minority
            personal_details: {
                first_name: String, middle_name: String, last_name: String, full_name: String,
                religion: String, mother_tongue: String, area_type: String, marital_status: String,
                physically_handicapped: { type: String, enum: ["Yes", "No"] },
                ph_type: String, ph_percentage: Number,
                ex_serviceman: { type: String, enum: ["Yes", "No"] },
                belongs_to_minority: { type: String, enum: ["Yes", "No"] },
                government_scheme: String, creamy_layer: String,
                admission_main_category: String, caste: String, sub_caste: String,
                dob: Date, gender: String, blood_group: String, nationality: String, domicile: String,
                mobile_number: String, official_email: String, primary_email: String, alternate_email: String,
                birth_place: String, birth_country: String, birth_state: String, birth_district: String,
                native_place: String, native_country: String, native_state: String, native_district: String, native_area_type: String
            },
            // 2 & 3. Address
            address: {
                permanent: { address: String, country: String, state: String, district: String, city: String, taluka: String, pincode: String },
                current: { address: String, country: String, state: String, district: String, city: String, taluka: String, pincode: String }
            },
            // 4, 5, 6. Emergency & Guardians
            guardians: {
                emergency_contact: { name: String, mobile: String, phone: String, address: String, city: String, age: Number, remark: String },
                local_guardian: { name: String, mobile: String, phone: String, address: String, city: String, remark: String },
                hostel: { name: String, address: String }
            },
            // 7 & 8. Family
            family: {
                father: { full_name: String, education: String, occupation: String, income: Number, email: String, mobile: String, phone: String, organization: String, department: String, designation: String, office_address: String, rank: String },
                mother: { full_name: String, education: String, occupation: String, income: Number, email: String, mobile: String, phone: String, organization: String, department: String, designation: String, office_address: String },
                brothers: [{ full_name: String, education: String, occupation: String, income: Number, email: String, mobile: String, phone: String, organization: String, department: String, designation: String, office_address: String }],
                sisters: [{ full_name: String, education: String, occupation: String, income: Number, email: String, mobile: String, phone: String, organization: String, department: String, designation: String, office_address: String }],
                earning_parent_relation: { type: String, enum: ["Father", "Mother", "Guardian", "Other"] }
            },
            // 9, 10, 11. Academics
            previous_education: [{
                level: { type: String, enum: ["10th", "12th", "diploma", "graduation", "other"] },
                examination: String,
                stream: String,
                seat_number: String,
                institute_name: String,
                board_name: String,
                passing_year: Number,
                total_marks: Number,
                marks_obtained: Number,
                percentage_or_cgpa: Number,
                subjects: [{ name: String, marks_obtained: Number, max_marks: Number }],
                vocational_subject: { name: String, marks_obtained: Number, max_marks: Number }
            }],
            // 12. Bank Details
            bank_details: {
                account_number: String, account_holder: String, bank_name: String, branch_name: String,
                ifsc_code: String, micr_code: String, account_type: String, state: String, city: String, branch_address: String
            },
            // 14. Experience
            experience_activities: {
                experience_details: String, awards_participation: String, student_activities: String, skills_interests: String
            },
            // 15. IDs & Compliance
            academic_ids: {
                aadhar_number: String, pan_number: String,
                eligibility_number: String, abc_id: String, university_prn_number: String,
                anti_ragging_number: String, anti_ragging_link: String
            },
            // 16. Passport
            passport_details: {
                passport_number: String, valid_upto: Date, visa_number: String,
                visa_valid_upto: Date, residential_permit_no: String, permit_issue_date: Date, permit_valid_upto: Date, fsis_number: String
            },
            entrance_exam: {
                exam_name: String, application_id: String, score: Number, percentile: Number, rank: Number, year: Number
            },
            institutional_goals: {
                career_choice: String,
                alumni_institute: String
            },
            medical_details: Object,
            social_details: Object,
            scholarships: [{
                scheme_name: String,
                category: String,
                status: { type: String, enum: ["applied", "approved", "rejected"], default: "applied" },
                amount_claimed: Number
            }],
            custom_fields: Object 
        },
        documents: [
            {
                name: { 
                    type: String, 
                    enum: [
                        // Universal
                        "birth_certificate", "student_aadhar", "parent_aadhar", 
                        "proof_of_residence", "transfer_certificate", "previous_academic_records", 
                        "passport_size_photo", "medical_certificate", "caste_certificate", 
                        "income_certificate", "10th_marksheet", "12th_marksheet",
                        // Engineering / Junior College Specific
                        "cet_jee_scorecard", "allotment_letter", "eligibility_form",
                        "migration_certificate", "gap_certificate", "domicile_certificate",
                        "nationality_certificate", "non_creamy_layer_certificate", "ews_certificate",
                        "anti_ragging_affidavit", "diploma_marksheet", "character_certificate",
                        "caste_validity_certificate", "physically_handicapped_certificate",
                        "freedom_fighter_certificate", "defence_certificate",
                        // Scholarship Additions (EBC, Minority, ZP)
                        "ration_card", "hostel_certificate", "bank_seeding_form", "attendance_certificate",
                        "death_certificate", "small_land_holder_certificate", "labour_certificate", 
                        "service_certificate", "fee_receipt", "signature",
                        // Custom / Other
                        "other"
                    ] 
                },
                url: String,    // S3/Supabase link
                status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
                rejection_reason: String
            }
        ],

        // 💰 Fees & Payment (Day 17) & Razorpay Webhooks
        fee_paid: { type: Boolean, default: false },
        ledger_id: { type: mongoose.Schema.Types.ObjectId, ref: "StudentFeeLedger" },
        
        payment_details: {
            // App Registration Fee (e.g. ₹500) vs Admission Fees (e.g. ₹50,000)
            fee_type: { type: String, enum: ["registration", "admission"], default: "registration" },
            razorpay_order_id: { type: String, sparse: true },
            razorpay_payment_id: { type: String, sparse: true },
            razorpay_signature: { type: String }, // For webhook security verification
            payment_status: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending" },
            amount_paid: { type: Number, default: 0 },
            refund_id: { type: String } // Stored if user cancels seat before session start
        },

        // Final Enrollment Reference
        student_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        prn: { type: String, sparse: true },
        
        // 📜 Application-Level Audit Logs (Who did what, when?)
        application_logs: [{
            action: { type: String, required: true }, // e.g., "verified_document", "allotted_seat", "payment_failed"
            performed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // System = null
            timestamp: { type: Date, default: Date.now },
            notes: { type: String }
        }],
        
        // 🔓 Per-Student Edit Lock Override (Edge Case 4 Extension)
        // Admin can unlock specific students past the org-wide editable_until deadline
        edit_lock_override: {
            unlocked: { type: Boolean, default: false },
            unlocked_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            unlocked_at: { type: Date },
            unlock_reason: { type: String }
        },

        is_deleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Atomic uniqueness for EN Number per Organization (only if en_number exists)
admissionApplicationSchema.index(
    { organization_id: 1, en_number: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { en_number: { $type: "string" } }
    }
);

export default mongoose.models.AdmissionApplication || mongoose.model("AdmissionApplication", admissionApplicationSchema);


--- File: AdmissionConfig.js ---
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

const admissionConfigSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            unique: true,
        },
        // Strategy: "cet_engineering", "merit_based", "fcfs" (First Come First Serve), "rla"
        strategy_type: {
            type: String,
            required: true,
            enum: ["cet_engineering", "merit_based", "fcfs", "rla", "manual"],
        },
        // ── Form Engine Configuration ──────────────────────────────────────────
        // Defines the deep structure of the admission application form.
        application_config: {
            personal_details: { type: Boolean, default: true },
            parent_details: { type: Boolean, default: true },
            address_details: { type: Boolean, default: true },
            academic_history: { type: Boolean, default: true },
            allow_edits_until: { type: String, default: "verified" }, // Form locks after this stage
        },

        // Dynamic, generic field engine definitions.
        custom_fields: [{
            field_id: { type: String, required: true },
            label: { type: String, required: true },
            type: { type: String, enum: ["text", "number", "select", "file", "phone", "email", "date"], required: true },
            is_required: { type: Boolean, default: false },
            options: [String], // for select types
            validation_regex: String,
            category: { type: String, enum: ["personal", "academic", "document", "other"], default: "other" }
        }],

        // ── Workflow Engine Configuration ──────────────────────────────────────
        // The ordered list of stages a candidate goes through.
        workflow_stages: {
            type: [String],
            default: ["applied", "under_verification", "waitlisted", "fee_pending", "enrolled"]
        },

        // Stage 1: Document Verification Config
        verification_config: {
            requires_admin_approval: { type: Boolean, default: true },
            allow_reupload_on_rejection: { type: Boolean, default: true },
            auto_verify_digital_docs: { type: Boolean, default: false },
            required_documents: { type: [String], default: ["photo", "lc", "marksheet"] }
        },

        // Stage 2: Merit & Selection Config
        merit_config: {
            merit_list_mode: { type: String, enum: ["category_wise", "combined"], default: "combined" },
            subject_computation_mode: { type: String, enum: ["best_of_5", "all_subjects"], default: "best_of_5" },
            best_of_5_mandatory_language: { type: Boolean, default: true },
            language_subjects: {
                type: [String],
                default: ["Marathi", "Hindi", "English", "Urdu", "Telugu", "Kannada", "First Language", "Second Language", "Third Language"]
            }
        },

        selection_config: {
            auto_promote_waitlist: { type: Boolean, default: false },
            waitlist_timeout_days: { type: Number, default: 3 }, // Days before waitlist offer lapses
        },

        // Stage 3: Fee Config
        fee_config: {
            fee_type: { type: String, enum: ["fixed", "category_based", "scholarship_adjusted"], default: "fixed" },
            base_fee_amount: { type: Number, default: 0 },
            allow_installments: { type: Boolean, default: false },
            payment_gateway: { type: String, enum: ["razorpay", "cash_only", "stripe"], default: "razorpay" }
        },

        // Stage 4: Enrollment Config
        enrollment_config: {
            auto_generate_prn: { type: Boolean, default: true },
            auto_create_user_account: { type: Boolean, default: true },
            division_allocation_mode: { type: String, enum: ["manual", "auto_alphabetical", "auto_merit"], default: "manual" },
        },
    },
    { timestamps: true }
);

export default mongoose.models.AdmissionConfig || mongoose.model("AdmissionConfig", admissionConfigSchema);


--- File: AdmissionOTP.js ---
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

const admissionOTPSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        en_number: {
            type: String, // Only for Engineering (CET)
            index: true,
        },
        phone: {
            type: String, // For School/Coaching forms
            index: true,
        },
        email: {
            type: String,
            lowercase: true,
        },
        otp: {
            type: String,
            required: true,
        },
        attempts: {
            type: Number,
            default: 0,
        },
        expires_at: {
            type: Date,
            required: true,
            index: { expires: 0 }, // Auto-delete after expiration
        },
        purpose: {
            type: String,
            enum: ["en_validation", "login_verification", "email_validation", "phone_fallback"],
            default: "en_validation",
        },
    },
    { timestamps: true }
);

export default mongoose.models.AdmissionOTP || mongoose.model("AdmissionOTP", admissionOTPSchema);


--- File: AiUsageLog.js ---
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

/**
 * Classgrid — AiUsageLog Model
 *
 * Logs every AI API call (OpenAI, Groq, Gemini) with token counts
 * so the nightly metering worker can calculate AI usage per org.
 */

import mongoose from "mongoose";

const aiUsageLogSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        provider: {
            type: String,
            enum: ["openai", "groq", "gemini"],
            required: true,
            index: true,
        },
        model: {
            type: String,
            required: true,
            trim: true,
        },
        feature: {
            type: String,
            enum: ["viva", "quiz_gen", "notes_summary", "chat_ai", "paper_gen", "other"],
            default: "other",
            index: true,
        },
        promptTokens: {
            type: Number,
            default: 0,
            min: 0,
        },
        completionTokens: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalTokens: {
            type: Number,
            default: 0,
            min: 0,
        },
        latencyMs: {
            type: Number,
            default: 0,
            min: 0,
        },
        success: {
            type: Boolean,
            default: true,
        },
        error: {
            type: String,
            default: null,
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

aiUsageLogSchema.index({ organization_id: 1, createdAt: -1 });
aiUsageLogSchema.index({ provider: 1, createdAt: -1 });

export default mongoose.models.AiUsageLog || mongoose.model("AiUsageLog", aiUsageLogSchema);


--- File: ApiMetricBucket.js ---
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

// ═══════════════════════════════════════════════════════════
//  ApiMetrics — In-memory aggregated request tracking
//  Strategy: Buffer in-process, flush to DB every 60s.
//  Per-route stats are aggregated (not per-request docs) to
//  avoid write pressure at scale.
// ═══════════════════════════════════════════════════════════

const ApiMetricBucketSchema = new mongoose.Schema({
    // e.g. "GET /api/auth/me"
    route: { type: String, required: true },
    method: { type: String, required: true },
    // Hour-level bucketing — one doc per route per hour
    bucket: { type: Date, required: true },   // rounded to hour
    totalRequests: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },   // 2xx
    clientErrCount: { type: Number, default: 0 },   // 4xx
    serverErrCount: { type: Number, default: 0 },   // 5xx
    totalRespTimeMs: { type: Number, default: 0 }, // sum — divide by totalRequests for avg
    // Rolling last-10 failures (capped array)
    recentFailures: [{
        statusCode: Number,
        errorMessage: String,
        timestamp: Date,
        orgId: String,
    }],
    lastFailureAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

ApiMetricBucketSchema.index({ route: 1, method: 1, bucket: -1 });
ApiMetricBucketSchema.index({ bucket: -1 });

export default mongoose.models.ApiMetricBucket || mongoose.model("ApiMetricBucket", ApiMetricBucketSchema);


--- File: Artifact.js ---
import mongoose from 'mongoose';

const artifactSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  stepId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Ensure one artifact per step per session
artifactSchema.index({ sessionId: 1, stepId: 1 }, { unique: true });

export default mongoose.models.Artifact || mongoose.model('Artifact', artifactSchema);


--- File: Assignment.js ---
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

const assignmentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        dueDate: {
            type: Date,
            required: true,
        },
        maxPoints: {
            type: Number,
            default: 100,
        },
        attachments: [{
            originalName: String,
            fileUrl: String, // Pointing to Supabase
            fileType: String,
        }],
        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "published",
        }
    },
    {
        timestamps: true,
    }
);

// Indexes
assignmentSchema.index({ classroom: 1, dueDate: 1 });
assignmentSchema.index({ teacher: 1 });
assignmentSchema.index({ organization_id: 1 });

export default mongoose.model("Assignment", assignmentSchema);


--- File: AssignmentSubmission.js ---
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

const submissionSchema = new mongoose.Schema(
    {
        assignment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Assignment",
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        // For actual turned in file
        submittedFile: {
            originalName: String,
            fileUrl: String, // Pointing to Supabase
            fileType: String,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
        // Grading metadata
        grade: {
            type: Number,
            default: null, // Null means ungraded
        },
        feedback: {
            type: String,
            default: "",
        },
        gradedAt: {
            type: Date,
        },
        status: {
            type: String,
            enum: ["submitted", "returned", "late"],
            default: "submitted",
        }
    },
    {
        timestamps: true,
    }
);

// Indexes
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ classroom: 1, status: 1 });
submissionSchema.index({ organization_id: 1 });

export default mongoose.model("AssignmentSubmission", submissionSchema);


--- File: Attendance.js ---
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

// ══════════════════════════════════════════════════════════════════════════════
// MASTER ATTENDANCE REGISTER — Highly Optimized Schema
// DO NOT create individual documents per student! This schema stores the entire
// class roster for a single day/session in one document to prevent DB bloat.
// ══════════════════════════════════════════════════════════════════════════════

const attendanceSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        // Target 4x2 DNA node (e.g. Division A, Semester 3, or Morning Batch)
        hierarchy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicHierarchy",
            required: true,
        },
        // The faculty member who submitted this register
        faculty_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Optional subject link if this is subject-wise attendance (college)
        // If null, it assumes day-wise attendance (school)
        subject_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrgSubject",
            default: null,
        },
        date: {
            type: Date,
            required: true,
        },
        // Indicates if this was a half-day or full-day (mostly for schools)
        session_type: {
            type: String,
            enum: ["full_day", "morning", "afternoon", "lecture"],
            default: "full_day",
        },
        // The core array holding 60+ students. Drastically reduces document count.
        student_records: [
            {
                student_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                status: {
                    type: String,
                    enum: ["present", "absent", "leave", "late"],
                    required: true,
                },
                // Optional remarks (e.g. "Arrived 20 mins late")
                remarks: {
                    type: String,
                    default: "",
                    trim: true,
                    maxlength: 200,
                }
            }
        ],
        // Pre-computed stats for ultra-fast dashboard queries
        stats: {
            total: { type: Number, default: 0 },
            present: { type: Number, default: 0 },
            absent: { type: Number, default: 0 },
            leave: { type: Number, default: 0 },
            late: { type: Number, default: 0 }
        }
    },
    {
        timestamps: true,
    }
);

// Ultra-fast querying for the Daily Attendance Dashboards
// Prevents duplicate registers for the same class on the same day/session
attendanceSchema.index(
    { organization_id: 1, hierarchy_id: 1, date: 1, session_type: 1, subject_id: 1 }, 
    { unique: true }
);

// Fast lookups by faculty to view their submitted registers
attendanceSchema.index({ faculty_id: 1, date: -1 });

// Note: To find a specific student's attendance history, we query:
// { "student_records.student_id": studentId }
attendanceSchema.index({ "student_records.student_id": 1, date: -1 });

export default mongoose.model("Attendance", attendanceSchema);


--- File: AttendanceAppeal.js ---
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

const attendanceAppealSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AttendanceSession",
            required: true,
        },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reason: {
            type: String,
            required: true,
            maxlength: 1000,
        },
        attachmentUrl: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        facultyComment: {
            type: String,
            maxlength: 500,
            default: null,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// One appeal per student per session max
attendanceAppealSchema.index({ session: 1, student: 1 }, { unique: true });

// Quick lookups
attendanceAppealSchema.index({ classroom: 1, status: 1 });
attendanceAppealSchema.index({ student: 1, classroom: 1 });

export default mongoose.models.AttendanceAppeal || mongoose.model("AttendanceAppeal", attendanceAppealSchema);


--- File: AttendanceRecord.js ---
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

/**
 * AttendanceRecord — one per student per session.
 * Only stores PRESENT records. Absence = total sessions - present count.
 * status "present_suspicious" = marked but flagged for review.
 */
const attendanceRecordSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AttendanceSession",
            required: true,
        },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        markedAt: {
            type: Date,
            default: Date.now,
        },

        // ── Attendance validity status ───────────────────────────
        // present          → clean mark, no flags
        // present_suspicious → flagged (paste, fast typing, GPS mismatch)
        status: {
            type: String,
            enum: ["present", "present_suspicious"],
            default: "present",
        },

        // ── Student GPS at time of marking ───────────────────────
        studentLat: {
            type: Number,
            default: null,
        },
        studentLng: {
            type: Number,
            default: null,
        },
        // Calculated Haversine distance from teacher's GPS (meters)
        distanceMeters: {
            type: Number,
            default: null,
        },

        // ── Fraud signals ────────────────────────────────────────
        // Whether frontend reported a paste event on the code field
        pasteDetected: {
            type: Boolean,
            default: false,
        },
        // Time (ms) from first keypress to submit — short = suspicious
        typingDurationMs: {
            type: Number,
            default: null,
        },

        // ── Device binding ───────────────────────────────────────
        // SHA-256 of userAgent + IP (matches trustedDevices fingerprint)
        deviceFingerprint: {
            type: String,
            default: null,
        },
        
        // Raw IP Address recorded during mark
        ipAddress: {
            type: String,
            default: null,
        },

        // ── Suspicious reason(s) for audit clarity ───────────────
        // e.g. ["paste_detected", "typing_too_fast", "gps_far"]
        suspicionReasons: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true }
);

// One mark per student per session (anti-cheat, DB-enforced)
attendanceRecordSchema.index({ session: 1, student: 1 }, { unique: true });

// Fast student attendance lookups
attendanceRecordSchema.index({ student: 1, classroom: 1 });
attendanceRecordSchema.index({ classroom: 1, session: 1 });

// Suspicious records lookup for faculty review
attendanceRecordSchema.index({ classroom: 1, status: 1 });

export default mongoose.models.AttendanceRecord ||
    mongoose.model("AttendanceRecord", attendanceRecordSchema);


--- File: AttendanceSession.js ---
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
import { v4 as uuidv4 } from "uuid";

/**
 * AttendanceSession — one per lecture per classroom.
 * Faculty starts it, students mark attendance using code + GPS.
 */
const attendanceSessionSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        codeHash: {
            type: String,
            default: null, // bcrypt hash of the attendance code (null for manual sessions)
        },

        // ── Session window ───────────────────────────────────────
        startsAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            default: null, // null for manual sessions
        },
        // Teacher-selected duration in seconds (default 90s for live, 0 for manual)
        durationSeconds: {
            type: Number,
            default: 90,
            min: 0,
            max: 600,
        },

        // ── Single-use session token (returned to frontend) ──────
        // Prevents raw API attacks — mark must supply this token
        sessionToken: {
            type: String,
            default: () => uuidv4(),
        },

        // ── Teacher GPS anchor ───────────────────────────────────
        teacherLat: {
            type: Number,
            default: null,
        },
        teacherLng: {
            type: Number,
            default: null,
        },

        // ── Configurable radius (default 25m, test in real classroom first) ──
        radiusMeters: {
            type: Number,
            default: 25,
        },

        status: {
            type: String,
            enum: ["active", "expired", "completed"],
            default: "active",
        },
        mode: {
            type: String,
            enum: ["live", "manual"],
            default: "live",
        },
        presentCount: {
            type: Number,
            default: 0,
        },

        // ── Source metadata (for auto-attendance from Zoom, etc.) ──
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
            // Shape: { zoomMeetingId, source: 'zoom_auto'|'manual', topic }
        },
    },
    { timestamps: true }
);

// Fast lookup: active sessions for a classroom
attendanceSessionSchema.index({ classroom: 1, status: 1 });
attendanceSessionSchema.index({ classroom: 1, createdAt: -1 });
// expireStale() queries: { classroom, status, expiresAt }
attendanceSessionSchema.index({ classroom: 1, status: 1, expiresAt: 1 });
// Token lookup for mark validation
attendanceSessionSchema.index({ sessionToken: 1 }, { sparse: true });

export default mongoose.models.AttendanceSession ||
    mongoose.model("AttendanceSession", attendanceSessionSchema);


--- File: BillingAuditLog.js ---
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

const billingAuditLogSchema = new mongoose.Schema(
    {
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Can be null if system action
            default: null,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null, // Global actions won't have an org attached
        },
        entityType: { // e.g. "BillingPlan", "OrganizationSubscription", "Invoice"
            type: String,
            required: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        action: { // e.g. "CREATED", "UPDATED", "DELETED", "MANUAL_RECONCILIATION"
            type: String,
            required: true,
        },
        reason: {
            type: String,
            default: null,
        },
        ipAddress: {
            type: String,
            default: null,
        },
        requestId: {
            type: String, // Correlation ID from the incoming request
            default: null,
        },
        oldState: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        newState: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

billingAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.models.BillingAuditLog || mongoose.model("BillingAuditLog", billingAuditLogSchema);


--- File: BillingEligibilityRule.js ---
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

const billingEligibilityRuleSchema = new mongoose.Schema(
    {
        entityType: { // "PLAN" or "MODULE"
            type: String,
            enum: ["PLAN", "MODULE"],
            required: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        allowedOrgTypes: {
            type: [String],
            default: [], // Empty means all
        },
        allowedStructureTypes: {
            type: [String],
            default: [], // Empty means all
        },
        allowedDivisionModes: {
            type: [String], // e.g. "with_divisions", "no_divisions"
            default: [], // Empty means all
        },
        requiresSubBatches: {
            type: Boolean,
            default: false,
        },
        excludedOrgTypes: {
            type: [String],
            default: [],
        },
        excludedStructureTypes: {
            type: [String],
            default: [],
        },
        effectiveFrom: {
            type: Date,
            required: true,
        },
        effectiveUntil: {
            type: Date,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

billingEligibilityRuleSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.models.BillingEligibilityRule || mongoose.model("BillingEligibilityRule", billingEligibilityRuleSchema);


--- File: BillingExportJob.js ---
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

const billingExportJobSchema = new mongoose.Schema(
    {
        exportType: {
            type: String, // e.g. "REVENUE_REPORT", "FAILED_PAYMENTS_REPORT", "INVOICE_BATCH"
            required: true,
        },
        format: {
            type: String, // e.g. "CSV", "EXCEL", "PDF_ZIP"
            required: true,
        },
        filters: {
            type: mongoose.Schema.Types.Mixed, // The query filters used to generate the report
            default: null,
        },
        status: {
            type: String,
            enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "EXPIRED"],
            default: "PENDING",
        },
        fileUrl: {
            type: String, // Path to R2 bucket or signed URL
            default: null,
        },
        storageKey: {
            type: String,
            default: null,
            select: false,
        },
        fileName: {
            type: String,
            default: null,
        },
        contentType: {
            type: String,
            default: null,
        },
        sizeBytes: {
            type: Number,
            default: 0,
            min: 0,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        expiresAt: {
            type: Date, // Exports shouldn't live forever
            required: true,
        },
        errorDetails: {
            type: String,
            default: null,
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.BillingExportJob || mongoose.model("BillingExportJob", billingExportJobSchema);


--- File: BillingHandoff.js ---
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

const billingHandoffSchema = new mongoose.Schema(
    {
        // Stores a SHA-256 hash. The raw bearer token is returned once.
        token: { type: String, required: true, unique: true, select: false },
        email: { type: String, required: true }, // The email the OTP is sent to
        otp: { type: String, required: true, select: false }, // bcrypt hash
        organization_id: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
        paymentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentOrder", required: true },
        paymentAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentAttempt", required: true },
        referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
        referenceModel: {
            type: String,
            required: true,
            enum: ["Invoice", "SaasInvoice", "FeeRecord", "CanteenOrder"],
        },
        
        // Razorpay details generated prior to handoff
        razorpay_order_id: { type: String, required: true },
        amountPaise: {
            type: Number,
            required: true,
            min: 1,
            validate: { validator: Number.isSafeInteger, message: "{VALUE} is not an integer paise value" },
        },
        currency: { type: String, default: "INR" },
        razorpay_key_id: { type: String, required: true }, // So frontend knows which key to use
        
        // Context
        payment_type: { type: String, required: true, enum: ["saas_invoice", "fee_payment", "admission_fee", "canteen_order"] },
        return_url: { type: String, required: true }, // Where to redirect after success
        
        // Additional context (e.g., studentId, invoiceId, etc.) stored as a flexible object if needed
        context: { type: mongoose.Schema.Types.Mixed },
        
        // Browser/Environment Fingerprinting (Next-level security)
        clientIp: { type: String, required: true },
        userAgent: { type: String, required: true },
        
        verified: { type: Boolean, default: false },
        attempts: { type: Number, default: 0 },
        lockoutUntil: { type: Date },
        otpVerifiedAt: { type: Date, default: null },
        consumedAt: { type: Date, default: null },
        resendCount: { type: Number, default: 0 },
        lastOtpSentAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

billingHandoffSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.BillingHandoff || mongoose.model("BillingHandoff", billingHandoffSchema);


--- File: BillingMetricDefinition.js ---
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

const billingMetricDefinitionSchema = new mongoose.Schema(
    {
        code: {
            type: String, // e.g. ACTIVE_LEARNERS, ACTIVE_STAFF, CAMPUSES, VISIBLE_DIVISIONS, NATIVE_BATCHES, SUB_BATCHES, STORAGE_GB, EMAILS_SENT, SMS_SENT, API_REQUESTS
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        unitLabel: { // e.g. "Learner", "GB", "Campus"
            type: String,
            required: true,
        },
        aggregationType: {
            type: String,
            enum: ["SUM", "MAX", "LAST_VALUE", "AVERAGE"], // How to roll up daily data for the month
            default: "MAX",
        },
        supportedOrgTypes: {
            type: [String],
            default: [], // Empty means all
        },
        supportedStructureTypes: {
            type: [String],
            default: [], // Empty means all
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.BillingMetricDefinition || mongoose.model("BillingMetricDefinition", billingMetricDefinitionSchema);


--- File: BillingModule.js ---
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

const billingModuleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        category: {
            type: String, // e.g. 'Academic', 'Finance', 'HR', 'Communication'
            required: true,
        },
        description: {
            type: String,
            default: "",
        },
        pricingType: {
            type: String,
            enum: ["FIXED", "PER_USER", "PER_STUDENT", "PER_CAMPUS", "PER_STORAGE_UNIT", "PER_USAGE", "CUSTOM_CONTRACT"],
            required: true,
        },
        trialAllowed: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "ARCHIVED"],
            default: "ACTIVE",
        },
        allowedOrgTypes: {
            type: [String],
            default: [], // Empty means applies to all org_types
        },
        allowedStructureTypes: {
            type: [String],
            default: [], // Empty means applies to all structure_types
        },
        activeVersionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingModuleVersion",
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.BillingModule || mongoose.model("BillingModule", billingModuleSchema);


--- File: BillingModuleVersion.js ---
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

const billingModuleVersionSchema = new mongoose.Schema(
    {
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingModule",
            required: true,
        },
        versionNumber: {
            type: Number,
            required: true,
        },
        monthlyPricePaise: {
            type: Number,
            required: true,
            min: 0,
        },
        annualPricePaise: {
            type: Number,
            required: true,
            min: 0,
        },
        taxCategory: {
            type: String, // Maps to TaxRule code or type
            default: "SOFTWARE_SERVICES",
        },
        unitType: {
            type: String, // e.g. "USER", "STUDENT", "GB", "MESSAGE", "FLAT"
            required: true,
        },
        effectiveFrom: {
            type: Date,
            required: true,
        },
        effectiveUntil: {
            type: Date,
            default: null, // null means it's the current active version
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

billingModuleVersionSchema.index({ moduleId: 1, versionNumber: 1 }, { unique: true });

export default mongoose.models.BillingModuleVersion || mongoose.model("BillingModuleVersion", billingModuleVersionSchema);


--- File: BillingPlan.js ---
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

const billingPlanSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        currency: {
            type: String,
            default: "INR",
        },
        status: {
            type: String,
            enum: ["DRAFT", "SCHEDULED", "ACTIVE", "ARCHIVED"],
            default: "DRAFT",
        },
        allowedOrgTypes: {
            type: [String],
            default: [], // Empty means applies to all org_types
        },
        allowedStructureTypes: {
            type: [String],
            default: [], // Empty means applies to all structure_types
        },
        activeVersionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingPlanVersion",
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.BillingPlan || mongoose.model("BillingPlan", billingPlanSchema);


--- File: BillingPlanVersion.js ---
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

const billingPlanVersionSchema = new mongoose.Schema(
    {
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingPlan",
            required: true,
        },
        versionNumber: {
            type: Number,
            required: true,
        },
        monthlyBasePricePaise: {
            type: Number,
            required: true,
            min: 0,
        },
        annualBasePricePaise: {
            type: Number,
            required: true,
            min: 0,
        },
        organizationLimit: {
            type: Number, // null/0 means unlimited
            default: null,
        },
        trialPeriodDays: {
            type: Number,
            default: 0,
        },
        effectiveFrom: {
            type: Date,
            required: true,
        },
        effectiveUntil: {
            type: Date,
            default: null, // null means it's the current active version
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

billingPlanVersionSchema.index({ planId: 1, versionNumber: 1 }, { unique: true });

export default mongoose.models.BillingPlanVersion || mongoose.model("BillingPlanVersion", billingPlanVersionSchema);


--- File: CanteenItem.js ---
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

const canteenItemSchema = new mongoose.Schema(
    {
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        category: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
        imageUrl: {
            type: String,
            default: "",
        },
        prepTimeAvgMinutes: {
            type: Number,
            default: 5,
        },
        // Daily Specials Engine
        isDailySpecial: {
            type: Boolean,
            default: false,
        },
        specialDays: {
            type: [String], // ["Monday", "Wednesday", "Friday"]
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            default: [],
        },
        specialPrice: {
            type: Number, // Discounted price when featured as daily special
            default: null,
        },
        // Dietary & Nutrition
        dietaryTags: {
            type: [String],
            enum: ["veg", "non_veg", "egg", "jain", "vegan", "gluten_free"],
            default: ["veg"],
        },
        calorieEstimate: {
            type: Number, // kcal
            default: null,
        },
        // Stock Management
        dailyStockLimit: {
            type: Number, // 0 = unlimited
            default: 0,
        },
        currentStock: {
            type: Number,
            default: 0,
        },
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalRatings: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export default mongoose.models.CanteenItem || mongoose.model("CanteenItem", canteenItemSchema);


--- File: CanteenOrder.js ---
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

const orderItemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CanteenItem",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    priceAtPurchase: {
        type: Number,
        required: true,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
    },
});

const canteenOrderSchema = new mongoose.Schema(
    {
        transactionId: {
            type: String, // Razorpay Payment ID or Order ID
            required: true,
            unique: true,
        },
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        tokenNumber: {
            type: String, // Displayed to the kitchen staff and student (e.g., T-142)
            required: true,
        },
        items: [orderItemSchema],
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING_PAYMENT", "NEW", "PREPARING", "READY", "DELIVERED", "CANCELLED"],
            default: "PENDING_PAYMENT",
            index: true,
        },
        paymentStatus: {
            type: String,
            enum: ["SUCCESS", "FAILED", "REFUNDED", "PENDING"],
            default: "PENDING",
        },
    },
    { timestamps: true }
);

export default mongoose.models.CanteenOrder || mongoose.model("CanteenOrder", canteenOrderSchema);


--- File: CETAllotment.js ---
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


--- File: Changelog.js ---
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

/**
 * Changelog — "What's New" release notes managed by Super Admin.
 * Users can react to changelog entries.
 */
const changelogSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    version: {
        type: String,
        required: true,
        trim: true // e.g., "v2.8.0"
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    type: {
        type: String,
        enum: ["feature", "improvement", "bugfix", "launch"],
        default: "feature"
    },
    highlights: [{
        type: String,
        trim: true
    }],
    // Reactions from users
    reactions: {
        type: Map,
        of: Number,
        default: {}
    },
    // Who reacted with what (to prevent double-reacting)
    reactedBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String
    }],
    // Published or draft
    isPublished: {
        type: Boolean,
        default: true
    },
    // Who created this entry
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    publishedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

changelogSchema.index({ isPublished: 1, publishedAt: -1 });

export default mongoose.models.Changelog ||
    mongoose.model("Changelog", changelogSchema);


--- File: Classroom.js ---
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
import crypto from "crypto";

const classroomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        description: {
            type: String,
            default: "",
            maxlength: 500,
        },

        subject: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        // Unique class code for students to join (e.g., "CHEM-A3X9")
        classCode: {
            type: String,
            uppercase: true,
        },

        // Owner teacher
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Organization Isolation
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },

        // ── ERP STRUCTURED FIELDS (Added during Upgrade) ──
        course_type: {
            type: String,
            enum: ['SCHOOL', 'COLLEGE', 'JUNIOR_COLLEGE', 'ENGINEERING', 'COACHING', 'DIPLOMA'],
            default: 'COLLEGE',
        },
        academic_year: { type: String }, // e.g., 2025-2026
        term: { type: String }, // e.g., Term 2 / after Diwali
        stream: { type: String }, // Junior college: Science, Commerce, Arts
        year: { type: String },
        branch: { type: String },
        semester: { type: Number },
        standard: { type: String },
        division: { type: String }, // e.g., 'A', 'B'
        division_id: { type: String }, // Supabase UUID
        sub_batch: { type: String }, // e.g., J2 under Division J
        sub_batch_id: { type: String },
        subject_id: { type: String }, // Supabase course_subjects UUID
        class_teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assistant_teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        mentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        is_entrance_batch: {
            type: Boolean,
            default: false,
        },
        entrance_exam: { type: String }, // JEE, NEET, MHT_CET, etc.
        entrance_course: { type: String },

        // Cover image / banner
        coverImage: {
            type: String,
            default: "",
        },

        // Settings
        settings: {
            allowJoinRequests: {
                type: Boolean,
                default: true,
            },
            isArchived: {
                type: Boolean,
                default: false,
            },
        },

        // Cached counts for fast reads
        memberCount: {
            type: Number,
            default: 0,
        },

        // Supabase subject_slug mapping (for backward compatibility)
        subjectSlug: {
            type: String,
        },

        // 📧 Email cooldown tracking (serverless-safe)
        lastEmailSentAt: { type: Date, default: null },
        lastEmailType: { type: String, default: null },
    },
    {
        timestamps: true,
    }
);

// Auto-generate class code before saving
classroomSchema.pre("save", function () {
    if (!this.classCode) {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        let code = "";

        for (let i = 0; i < 4; i++) {
            code += letters[Math.floor(Math.random() * letters.length)];
        }

        for (let i = 0; i < 6; i++) {
            code += numbers[Math.floor(Math.random() * numbers.length)];
        }

        this.classCode = code;
    }
});

// Indexes for scalability
classroomSchema.index({ teacher: 1, createdAt: -1 });
classroomSchema.index({ classCode: 1 }, { unique: true });
classroomSchema.index({ subjectSlug: 1 });
classroomSchema.index({ organization_id: 1, course_type: 1, academic_year: 1 });
classroomSchema.index({ organization_id: 1, stream: 1, standard: 1, division: 1, sub_batch: 1 });

export default mongoose.model("Classroom", classroomSchema);


--- File: ClassroomMembership.js ---
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

const classroomMembershipSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },

        // When the student requested to join
        requestedAt: {
            type: Date,
            default: Date.now,
        },

        // When the teacher approved/rejected
        respondedAt: {
            type: Date,
            default: null,
        },

        // Teacher who responded
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Optional message from student
        requestMessage: {
            type: String,
            default: "",
            maxlength: 300,
        },

        // Optional reason for rejection
        rejectionReason: {
            type: String,
            default: "",
            maxlength: 300,
        },

        // Link back to the structured ERP division
        division_id: {
            type: String, // Supabase UUID
        },
    },
    {
        timestamps: true,
    }
);

// One membership record per student per classroom
classroomMembershipSchema.index(
    { classroom: 1, student: 1 },
    { unique: true }
);

// Fast lookups for teacher dashboard
classroomMembershipSchema.index({ classroom: 1, status: 1 });

// Fast lookups for student's classrooms
classroomMembershipSchema.index({ student: 1, status: 1 });

export default mongoose.model("ClassroomMembership", classroomMembershipSchema);


--- File: ContentReport.js ---
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

/**
 * ContentReport — stores user reports on forum posts, chat messages,
 * notes, or any other platform content for Super Admin moderation.
 */
const contentReportSchema = new mongoose.Schema(
  {
    // Who reported
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedByName: { type: String, default: "" }, // denormalized

    // The org where this was reported
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },

    // What was reported
    contentType: {
      type: String,
      enum: ["forum_post", "forum_comment", "chat_message", "note", "review", "user_profile", "other"],
      required: true,
    },
    contentId: { type: String, required: true }, // _id of the content
    contentPreview: { type: String, default: "" }, // First 300 chars of content

    // Who owns the reported content
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reportedUserName: { type: String, default: "" },

    // Why it was reported
    reason: {
      type: String,
      enum: ["spam", "harassment", "hate_speech", "inappropriate", "misinformation", "copyright", "other"],
      required: true,
    },
    description: { type: String, default: "" }, // Additional details from reporter

    // Moderation status
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },

    // Super Admin action taken
    resolution: {
      action: {
        type: String,
        enum: ["none", "content_removed", "user_warned", "user_banned", "no_action"],
        default: "none",
      },
      note: { type: String, default: "" },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      resolvedAt: { type: Date, default: null },
    },

    // Severity score for sorting (auto-calculated based on reason + report count)
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
  },
  { timestamps: true }
);

contentReportSchema.index({ status: 1, createdAt: -1 });
contentReportSchema.index({ contentType: 1, contentId: 1 });
contentReportSchema.index({ reportedUser: 1 });
contentReportSchema.index({ organizationId: 1 });

export default mongoose.models.ContentReport ||
  mongoose.model("ContentReport", contentReportSchema);


--- File: CoursePlaylist.js ---
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

/**
 * CoursePlaylist.js
 * MODULE 23: YouTube Course Library — Playlist Grouping
 * 
 * Groups CourseVideos into ordered playlists within a classroom.
 */
const coursePlaylistSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        classroom_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        sort_order: {
            type: Number,
            default: 0,
        },
        is_published: {
            type: Boolean,
            default: true,
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

coursePlaylistSchema.index({ classroom_id: 1, sort_order: 1 });

export default mongoose.models.CoursePlaylist || mongoose.model("CoursePlaylist", coursePlaylistSchema);


--- File: CourseVideo.js ---
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

/**
 * CourseVideo.js
 * MODULE 23: YouTube Embedding & Course Library
 * 
 * Stores YouTube video metadata linked to classrooms/courses.
 * Supports playlists, watch-time tracking hooks, and AI transcript stubs.
 */
const courseVideoSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        classroom_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
            index: true,
        },
        // Video Identity
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
            maxlength: 2000,
        },
        video_source_type: {
            type: String,
            enum: ["youtube", "s3", "agora_recording"],
            default: "youtube",
        },
        youtube_url: {
            type: String,
            default: "",
        },
        youtube_id: {
            type: String, // Extracted from URL (e.g., "dQw4w9WgXcQ")
            default: "",
            index: true,
        },
        s3_video_url: {
            type: String, // Direct MP4 or HLS stream URL from S3
            default: "",
        },
        s3_object_key: {
            type: String, // For secure presigned URL generation or deletion
            default: "",
        },
        file_size_bytes: {
            type: Number,
            default: 0,
        },
        thumbnail_url: {
            type: String,
            default: "",
        },
        // Metadata
        duration_seconds: {
            type: Number, // Total video duration in seconds
            default: 0,
        },
        channel_name: {
            type: String,
            default: "",
        },
        // Organization
        playlist_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CoursePlaylist",
            default: null,
        },
        sort_order: {
            type: Number, // Position within playlist
            default: 0,
        },
        chapter: {
            type: String, // e.g., "Unit 1: Thermodynamics"
            default: "",
        },
        // Access Control
        is_mandatory: {
            type: Boolean,
            default: false,
        },
        unlock_after: {
            type: mongoose.Schema.Types.ObjectId, // Must complete this video first
            ref: "CourseVideo",
            default: null,
        },
        // AI Features
        transcript: {
            type: String,  // Full text transcript (populated by AI service)
            default: "",
        },
        ai_summary: {
            type: String,  // AI-generated summary
            default: "",
        },
        // Upload metadata
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Analytics (denormalized for speed)
        total_views: {
            type: Number,
            default: 0,
        },
        avg_completion_rate: {
            type: Number, // 0-100
            default: 0,
        },
    },
    { timestamps: true }
);

// Compound: One video per YouTube ID per classroom
courseVideoSchema.index({ classroom_id: 1, youtube_id: 1 }, { unique: true });
courseVideoSchema.index({ organization_id: 1, playlist_id: 1, sort_order: 1 });

export default mongoose.models.CourseVideo || mongoose.model("CourseVideo", courseVideoSchema);


--- File: CreditNote.js ---
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

const creditNoteSchema = new mongoose.Schema(
    {
        creditNoteNumber: {
            type: String,
            required: true,
            unique: true,
        },
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        issueDate: {
            type: Date,
            default: Date.now,
        },
        reason: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["DRAFT", "ISSUED", "APPLIED"],
            default: "DRAFT",
        },
        subtotalPaise: {
            type: Number,
            default: 0,
        },
        taxAmountPaise: {
            type: Number,
            default: 0,
        },
        totalAmountPaise: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: "INR",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

creditNoteSchema.index({ invoiceId: 1 });

export default mongoose.models.CreditNote || mongoose.model("CreditNote", creditNoteSchema);


--- File: CreditNoteLineItem.js ---
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

const creditNoteLineItemSchema = new mongoose.Schema(
    {
        creditNoteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CreditNote",
            required: true,
        },
        invoiceLineItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InvoiceLineItem",
            default: null,
        },
        description: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            default: 1,
        },
        unitPricePaise: {
            type: Number,
            default: 0,
        },
        subtotalPaise: {
            type: Number,
            default: 0,
        },
        taxAmountPaise: {
            type: Number,
            default: 0,
        },
        totalAmountPaise: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
    }
);

creditNoteLineItemSchema.index({ creditNoteId: 1 });

export default mongoose.models.CreditNoteLineItem || mongoose.model("CreditNoteLineItem", creditNoteLineItemSchema);


--- File: DemoRequest.js ---
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


--- File: DeviceVerification.js ---
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

const deviceVerificationSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        default: null,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    deviceFingerprint: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    failedAttempts: {
        type: Number,
        default: 0
    },
    resendCount: {
        type: Number,
        default: 0,
        max: 10
    },
    rememberMe: {
        type: Boolean,
        default: false,
    },
    lastResentAt: Date,
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 300 } // 5 minutes TTL
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("DeviceVerification", deviceVerificationSchema);


--- File: Discount.js ---
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

const discountSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String, // e.g. "SUMMER50", "WELCOME", "SPECIAL_DEAL"
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        discountType: {
            type: String,
            enum: ["PERCENTAGE", "FIXED_AMOUNT"],
            required: true,
        },
        amountPaise: { // Only used if FIXED_AMOUNT
            type: Number,
            default: null,
        },
        percentage: { // Only used if PERCENTAGE
            type: Number,
            default: null,
            min: 0,
            max: 100,
        },
        appliesTo: {
            type: String,
            enum: ["ENTIRE_INVOICE", "SPECIFIC_MODULE", "BASE_PLAN_ONLY"],
            default: "ENTIRE_INVOICE",
        },
        targetModuleId: { // Required if appliesTo is SPECIFIC_MODULE
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingModule",
            default: null,
        },
        targetPlanId: { // Optional restriction
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingPlan",
            default: null,
        },
        maxRedemptionsTotal: {
            type: Number, // null means unlimited
            default: null,
        },
        maxRedemptionsPerOrganization: {
            type: Number,
            default: 1,
        },
        minimumInvoiceAmountPaise: {
            type: Number,
            default: 0,
        },
        validFrom: {
            type: Date,
            required: true,
        },
        validUntil: {
            type: Date,
            default: null, // null means never expires
        },
        status: {
            type: String,
            enum: ["ACTIVE", "ARCHIVED", "DEPLETED"],
            default: "ACTIVE",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Discount || mongoose.model("Discount", discountSchema);


--- File: DiscountRedemption.js ---
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

const discountRedemptionSchema = new mongoose.Schema(
    {
        discountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Discount",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice", // Can be null if it's redeemed but invoice generation failed
            default: null,
        },
        amountAppliedPaise: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "REDEEMED", "REVERSED", "FAILED"],
            default: "PENDING",
        },
        redeemedAt: {
            type: Date,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.DiscountRedemption || mongoose.model("DiscountRedemption", discountRedemptionSchema);


--- File: DropdownMaster.js ---
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

const dropdownMasterSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "ORG_TYPE",
        "ROLE_CATEGORY",
        "DEPARTMENT",
        "DESIGNATION",
        "QUALIFICATION",
        "EXP_DOMAIN",
        "RESPONSIBILITY",
        "SPECIALIZATION",
      ],
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    organization_types: {
      type: [String],
      default: [],
    },
    role_categories: {
      type: [String],
      default: [],
    },
    department_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DropdownMaster",
      },
    ],
    designation_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DropdownMaster",
      },
    ],
    is_active: {
      type: Boolean,
      default: true,
    },
    display_order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DropdownMaster", dropdownMasterSchema);


--- File: EmailJob.js ---
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

/**
 * Classgrid — EmailJob Model
 *
 * MongoDB-backed email job queue. Each document represents a single
 * email to be sent. The background worker picks up pending jobs,
 * sends them, and updates status. Failed jobs are retried with
 * exponential backoff (max 3 attempts).
 */

import mongoose from "mongoose";

const emailJobSchema = new mongoose.Schema(
    {
        // ── Recipient & Content ─────────────────────────
        to: { type: String, required: true },
        subject: { type: String, required: true },
        html: { type: String, required: true },
        text: { type: String, default: "" },

        // ── Classification ──────────────────────────────
        type: {
            type: String,
            enum: [
                "announcement",
                "quiz",
                "notes",
                "join_request",
                "join_approved",
                "attendance",
                "absence",
                "support_ticket_reply",
                "support_ticket_new",
                "talk_request_new",
                "talk_request_reply",
                "domain_change",
                "demo_meeting_scheduled",
                "demo_meeting_scheduled_internal",
                "demo_provisioning_onboarding",
                "other",
            ],
            default: "other",
        },

        // ── References ──────────────────────────────────
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
        organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },

        // ── Sender Channel ──────────────────────────────
        // Routes email through the correct provider/sender:
        //   "support"      → Brevo → support@classgrid.in
        //   "noreply"      → Brevo → noreply@classgrid.in (default)
        //   "billing"      → Brevo → billing@classgrid.in
        //   "notification" → Resend → notification@updates.classgrid.in
        channel: {
            type: String,
            enum: ["support", "noreply", "billing", "notification", null],
            default: null,
        },

        // ── Job State ───────────────────────────────────
        status: {
            type: String,
            enum: ["pending", "processing", "sent", "failed"],
            default: "pending",
        },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 3 },
        error: { type: String, default: null },
        nextRetryAt: { type: Date, default: Date.now },
        processedAt: { type: Date, default: null },
    },
    {
        timestamps: true, // adds createdAt, updatedAt
    }
);

// ── Indexes for worker queries & monitoring ─────────
emailJobSchema.index({ status: 1, nextRetryAt: 1 });
emailJobSchema.index({ classroomId: 1, type: 1, createdAt: -1 });
emailJobSchema.index({ userId: 1, createdAt: -1 });
emailJobSchema.index({ organizationId: 1, createdAt: -1 });
emailJobSchema.index({ type: 1 });

const EmailJob = mongoose.model("EmailJob", emailJobSchema);

export default EmailJob;


--- File: EmailReservation.js ---
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

import mongoose from 'mongoose';

const EmailReservationSchema = new mongoose.Schema({
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  reserved_email: {
    type: String,
    required: true,
    unique: true, // Atomic uniqueness
    lowercase: true,
    trim: true,
  },
  intended_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Could initially be null if reserved before final user creation
  },
  application_id: {
    type: mongoose.Schema.Types.ObjectId,
    // Ref: 'AdmissionApplication', // Will reference when we build Admission Engine
  },
  status: {
    type: String,
    enum: ['pending', 'provisioned', 'failed'],
    default: 'pending',
  },
  provider: {
    type: String,
    enum: ['google_workspace', 'zoho', 'cpanel', 'internal'],
    default: 'internal',
  },
  provider_reference_id: {
    type: String,
  },
  error_message: {
    type: String,
  },
  expires_at: {
    type: Date,
    // Optional: if we want reservations to expire if they don't complete
  }
}, { timestamps: true });

// Prevent duplicate reservations of the exact same email 
// unique: true on `reserved_email` acts as an atomic lock.

const EmailReservation = mongoose.model('EmailReservation', EmailReservationSchema);

export default EmailReservation;


--- File: Exam.js ---
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

const examSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000,
        },
        date: {
            type: Date,
            required: true,
        },
        duration_minutes: {
            type: Number,
            required: true,
            min: 1,
        },
        subject_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrgSubject",
            required: true,
        },
        faculty_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // 4x2 DNA Target (Course/Branch/Standard/Division/Batch)
        hierarchy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicHierarchy",
            required: true,
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        max_marks: {
            type: Number,
            required: true,
            min: 1,
        },
        passing_marks: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ["draft", "scheduled", "active", "completed", "archived"],
            default: "draft",
        }
    },
    {
        timestamps: true,
    }
);

// Indexes for tenant isolation and fast querying
examSchema.index({ organization_id: 1, hierarchy_id: 1, date: -1 });
examSchema.index({ faculty_id: 1, date: -1 });
examSchema.index({ subject_id: 1 });

export default mongoose.model("Exam", examSchema);


--- File: ExamRecord.js ---
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

const examRecordSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },

        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },

        examType: {
            type: String,
            enum: ["unit_test", "assignment", "midterm", "final", "practical", "other"],
            default: "other",
        },

        // Anti-Cheat: Question Pooling Configuration
        isQuestionBankEnabled: {
            type: Boolean,
            default: false
        },

        // Multi-subject support: expanded for sections, timing, and pooling
        subjects: [{
            subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "OrgSubject", default: null },
            subjectName: { type: String, required: true },
            maxMarks: { type: Number, required: true, min: 1 },
            
            // Pooling & Timing (Day 17.5 Additions)
            questionsToPick: { type: Number, default: 0 }, // If 0, use all questions in bank
            timeLimitMinutes: { type: Number, default: 0 }, // 0 = no time limit for this section
            
            // The Question Bank for this specific subject
            questionBank: [{
                questionId: { type: String }, // For tracking if needed
                questionText: { type: String, required: true },
                options: [String],
                correctAnswer: { type: String },
                explanation: { type: String },
                marks: { type: Number, default: 1 },
                difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" }
            }]
        }],

        // Total marks across all subjects (computed sum)
        totalMarks: {
            type: Number,
            required: true,
            min: 1,
        },

        passingMarks: {
            type: Number,
            default: 0,
        },

        // Uploaded file metadata
        uploadedFile: {
            originalName: { type: String, default: "" },
            uploadedAt: { type: Date, default: Date.now },
        },

        // Mapping stats from Excel processing
        mappingStats: {
            totalRows: { type: Number, default: 0 },
            matched: { type: Number, default: 0 },
            unmatched: { type: Number, default: 0 },
            skipped: { type: Number, default: 0 },
        },

        // Pre-computed analytics (updated on confirm + mark edits)
        analytics: {
            classAverage: { type: Number, default: 0 },
            classMedian: { type: Number, default: 0 },
            highest: { type: Number, default: 0 },
            lowest: { type: Number, default: 0 },
            passCount: { type: Number, default: 0 },
            failCount: { type: Number, default: 0 },
            passPercentage: { type: Number, default: 0 },
            standardDeviation: { type: Number, default: 0 },
            gradeDistribution: {
                A: { type: Number, default: 0 },
                B: { type: Number, default: 0 },
                C: { type: Number, default: 0 },
                D: { type: Number, default: 0 },
                F: { type: Number, default: 0 },
            },
        },

        status: {
            type: String,
            enum: ["draft", "verified", "published", "locked", "processing", "active", "archived"],
            default: "draft",
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast queries
examRecordSchema.index({ classroom: 1, createdAt: -1 });
examRecordSchema.index({ teacher: 1 });
examRecordSchema.index({ organization_id: 1 });
examRecordSchema.index({ classroom: 1, title: 1 }); // duplicate detection

export default mongoose.model("ExamRecord", examRecordSchema);


--- File: ExamResult.js ---
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

const examResultSchema = new mongoose.Schema(
    {
        exam_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
        },
        student_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        obtained_marks: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ["pass", "fail", "absent"],
            required: true,
        },
        faculty_remarks: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        }
    },
    {
        timestamps: true,
    }
);

// Ensure a student only has one result per exam
examResultSchema.index({ exam_id: 1, student_id: 1 }, { unique: true });

// Tenant isolation and fast student lookups
examResultSchema.index({ organization_id: 1, student_id: 1 });
examResultSchema.index({ student_id: 1, createdAt: -1 });

export default mongoose.model("ExamResult", examResultSchema);


--- File: FacultyBiometricLog.js ---
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

const facultyBiometricLogSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        timestamp: {
            type: Date,
            required: true,
            default: Date.now,
        },
        log_type: {
            type: String,
            enum: ["IN", "OUT", "UNKNOWN"],
            default: "UNKNOWN",
        },
        device_id: {
            type: String,
            default: "Unknown Device",
        },
        // Used to prevent multiple logs for the same minute span from the device
        deduplication_hash: {
            type: String,
            required: true,
            unique: true,
        },
        // Status of payroll processing
        processed: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

facultyBiometricLogSchema.index({ organization: 1, faculty: 1, timestamp: -1 });

export default mongoose.models.FacultyBiometricLog ||
    mongoose.model("FacultyBiometricLog", facultyBiometricLogSchema);


--- File: FacultyPayroll.js ---
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

const facultyPayrollSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Period, e.g., "2026-04"
        month: {
            type: String,
            required: true,
        },
        total_working_days: {
            type: Number,
            default: 0,
        },
        present_days: {
            type: Number,
            default: 0,
        },
        absent_days: {
            type: Number,
            default: 0,
        },
        leaves_taken: {
            type: Number,
            default: 0,
        },
        // For hourly workers
        total_hours_worked: {
            type: Number,
            default: 0,
        },
        gross_salary: {
            type: Number,
            default: 0,
        },
        deductions: {
            type: Number,
            default: 0,
        },
        net_salary: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["draft", "locked", "paid"],
            default: "draft",
        },
    },
    { timestamps: true }
);

facultyPayrollSchema.index({ organization: 1, month: 1 });
facultyPayrollSchema.index({ faculty: 1, month: 1 }, { unique: true });

export default mongoose.models.FacultyPayroll ||
    mongoose.model("FacultyPayroll", facultyPayrollSchema);


--- File: FeatureFlag.js ---
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

/**
 * FeatureFlag â€” Kill Switch for any module on the platform.
 * Super Admin can disable "Go Live", "Canteen", "Quiz" etc. globally 
 * or for specific organizations without deploying new code.
 */
const featureFlagSchema = new mongoose.Schema({
    // Unique key for the feature (e.g., "go_live", "canteen", "quiz_manager")
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    // Human-readable name
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    module: {
        type: String,
        trim: true,
        default: "platform"
    },
    routePrefixes: [{
        type: String,
        trim: true
    }],
    exemptRoutePrefixes: [{
        type: String,
        trim: true
    }],
    // Global ON/OFF switch
    isEnabled: {
        type: Boolean,
        default: true
    },
    // If globally enabled, you can still disable for specific orgs
    disabledForOrgs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization"
    }],
    // If globally disabled, you can still enable for specific orgs (beta testing)
    enabledForOrgs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization"
    }],
    // Which org types can use this feature? Empty = all
    allowedOrgTypes: [{
        type: String,
        enum: ["SCHOOL", "COLLEGE", "COACHING", "JUNIOR_COLLEGE", "DIPLOMA", "CUSTOM"]
    }],
    // Is this a premium-only feature?
    isPremium: {
        type: Boolean,
        default: false
    },
    // Who last modified this flag
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

export default mongoose.models.FeatureFlag || 
    mongoose.model("FeatureFlag", featureFlagSchema);


--- File: FeeCategory.js ---
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

import mongoose from 'mongoose';

const feeCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    description: String
}, { timestamps: true });

export default mongoose.model('FeeCategory', feeCategorySchema);


--- File: FeeComponent.js ---
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

import mongoose from 'mongoose';

const feeComponentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeCategory',
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    defaultAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model('FeeComponent', feeComponentSchema);


--- File: Feedback.model.js ---
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

// ── FEEDBACK FORM DEFINITION ──────────────────────────────────────────
const feedbackFormSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true },
    description: String,
    targetType: { type: String, enum: ["teacher", "course", "facility"], default: "teacher" },
    targetTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subjectName: String,
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    isAnonymous: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
    questions: [{
        text: String,
        type: { type: String, enum: ["rating", "text"], default: "rating" },
        required: { type: Boolean, default: true }
    }],
}, { timestamps: true });

// ── FEEDBACK RESPONSE (STUDENT SUBMISSION) ──────────────────────────
const feedbackResponseSchema = new mongoose.Schema({
    form: { type: mongoose.Schema.Types.ObjectId, ref: "FeedbackForm", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // Null if anonymous
    isAnonymous: { type: Boolean, default: true },
    ratings: [{
        questionId: String,
        value: Number, // 1-5
    }],
    comment: String,
    neutralizedComment: String, // Stylometry Defense output
}, { timestamps: true });

export const FeedbackForm = mongoose.model("FeedbackForm", feedbackFormSchema);
export const FeedbackResponse = mongoose.model("FeedbackResponse", feedbackResponseSchema);



--- File: FeedbackForm.js ---
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

const feedbackFormSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    targetType: {
        type: String,
        enum: ["teacher", "course", "facility", "overall"],
        default: "teacher"
    },
    targetTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    targetTeacherName: String,
    subjectName: String,
    classroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Classroom"
    },
    applicability: {
        type: String,
        enum: ["all", "department", "division", "classroom"],
        default: "all"
    },
    division: String,
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    },
    allowComments: {
        type: Boolean,
        default: true
    },
    isAnonymous: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ["draft", "published", "closed"],
        default: "published"
    },
    questions: [{
        questionText: {
            type: String,
            required: true
        },
        questionType: {
            type: String,
            enum: ["rating", "multiple_choice", "text"],
            default: "rating"
        },
        options: [String],
        ratingsMap: mongoose.Schema.Types.Mixed,
        isRequired: {
            type: Boolean,
            default: true
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

export default mongoose.model("FeedbackForm", feedbackFormSchema);


--- File: FeedbackResponse.js ---
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

const feedbackResponseSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    form: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FeedbackForm",
        required: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: function() { return !this.isAnonymous; }
    },
    isAnonymous: {
        type: Boolean,
        default: true
    },
    answers: [{
        questionId: String,
        questionText: String,
        answer: mongoose.Schema.Types.Mixed,
        rating: Number // Cached for quick averaging
    }],
    comments: {
        type: String,
        trim: true
    },
    // AI-processed comments (neutralized via Groq for anonymity)
    neutralizedComments: {
        type: String,
        trim: true
    },
    metadata: {
        submittedAt: { type: Date, default: Date.now },
        deviceFingerprint: String,
        browser: String
    }
}, { timestamps: true });

// Ensure one student can only submit once per form
feedbackResponseSchema.index({ form: 1, student: 1 }, { unique: true, partialFilterExpression: { isAnonymous: false } });

export default mongoose.model("FeedbackResponse", feedbackResponseSchema);


--- File: FeeRecord.js ---
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

import mongoose from 'mongoose';

const feeRecordSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        title: {
            type: String, // e.g., "Exam Fee Oct 2026", "Lab Monthly Charge"
            required: true,
        },
        category: {
            type: String,
            enum: ['college', 'exam', 'library', 'canteen', 'hostel', 'other'],
            default: 'college',
        },
        amountPaise: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        dueDate: {
            type: Date,
            required: true,
        },
        paidAmountPaise: {
            type: Number,
            default: 0,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        status: {
            type: String,
            enum: ['pending', 'partially_paid', 'paid', 'overdue'],
            default: 'pending',
        },
        paymentReference: String,
        paidAt: Date,
        remarks: String,
    },
    {
        timestamps: true,
    }
);

// Helpful indexes for student and admin dashboard
feeRecordSchema.index({ student: 1, status: 1 });
feeRecordSchema.index({ organizationId: 1, dueDate: 1 });

export default mongoose.model('FeeRecord', feeRecordSchema);


--- File: FeeStructure.js ---
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

// ══════════════════════════════════════════════════════════════════════════════
// FEE STRUCTURE SCHEMA (Phase 8: 4x2 DNA Architecture)
// Dictates the master fee rules applied to a specific AcademicHierarchy node.
// ══════════════════════════════════════════════════════════════════════════════

const feeStructureSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    hierarchy_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicHierarchy",
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true // e.g., "Semester 1 Full Tuition"
    },
    base_amount: {
        type: Number,
        required: true,
        min: 0
    },
    tax_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    due_date: {
        type: Date,
        required: true,
        index: true
    },
    line_items: [
        {
            name: { type: String, required: true, trim: true },
            amount: { type: Number, required: true, min: 0 }
        }
    ]
}, { timestamps: true });

// Prevent duplicate master fee structures for the exact same batch and title
feeStructureSchema.index({ organization_id: 1, hierarchy_id: 1, title: 1 }, { unique: true });

const FeeStructure = mongoose.models.FeeStructure || mongoose.model("FeeStructure", feeStructureSchema);
export default FeeStructure;


--- File: FeeTransaction.js ---
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

import mongoose from 'mongoose';

const feeTransactionSchema = new mongoose.Schema({
    ledgerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentFeeLedger',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    amountPaise: {
        type: Number,
        required: true,
        min: 0,
        validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    method: {
        type: String,
        enum: ['cash', 'upi', 'bank_transfer', 'gateway'],
        required: true
    },
    methodDetails: {
        transactionId: String,
        bankName: String,
        upiId: String,
        gatewayRef: String,
        proofUrl: String // URL to screenshot in Supabase Storage
    },
    receiptNo: {
        type: String,
        unique: true,
        sparse: true // Allow null for pending transactions
    },
    status: {
        type: String,
        enum: ['success', 'pending_verification', 'rejected', 'failed'],
        default: 'success'
    },
    verificationRemarks: String,
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    remarks: String
}, { timestamps: true });


export default mongoose.model('FeeTransaction', feeTransactionSchema);


--- File: ForumComment.js ---
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

/**
 * ForumComment — Replies to forum posts. Supports nested threading.
 */
const forumCommentSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ForumPost",
        required: true,
        index: true
    },
    // If this is a reply to another comment (nested thread)
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ForumComment",
        default: null
    },
    body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    upvotes: {
        type: Number,
        default: 0
    },
    upvotedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

forumCommentSchema.index({ post: 1, createdAt: 1 });

export default mongoose.models.ForumComment ||
    mongoose.model("ForumComment", forumCommentSchema);


--- File: ForumPost.js ---
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

/**
 * ForumPost — Community Forum posts (Q&A, Ideas, Notices, Academic discussions).
 * Scoped to an organization so students from different colleges don't mix.
 */
const forumPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    category: {
        type: String,
        enum: ["general", "academic", "questions", "ideas", "notice"],
        default: "general"
    },
    tags: [{
        type: String,
        trim: true
    }],
    // Author
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    // Organization isolation
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    // Engagement
    upvotes: {
        type: Number,
        default: 0
    },
    upvotedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    commentCount: {
        type: Number,
        default: 0
    },
    // Admin controls
    isPinned: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

forumPostSchema.index({ organization_id: 1, createdAt: -1 });
forumPostSchema.index({ organization_id: 1, category: 1 });
forumPostSchema.index({ organization_id: 1, upvotes: -1 });

export default mongoose.models.ForumPost ||
    mongoose.model("ForumPost", forumPostSchema);


--- File: GoLive.js ---
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

const goLiveSchema = new mongoose.Schema({
    orgId: {
        type: String,
        required: true,
        index: true
    },
    classroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Classroom",
        required: true,
        index: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrgSubject",
        index: true
    },
    chapter: {
        type: String, // String name of the chapter/playlist
        trim: true
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        default: "Go Live Session"
    },
    channelName: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ["upcoming", "active", "ended"],
        default: "active"
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    participants: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
        leftAt: { type: Date },
        watchTimeMinutes: { type: Number, default: 0 } // For attendance tracking!
    }],
    recordingStatus: {
        type: String,
        enum: ["none", "started", "completed", "failed"],
        default: "none"
    },
    recordingUrl: {
        type: String
    },
    agoraResourceId: String, // From Agora Cloud Recording
    agoraSid: String,        // From Agora Cloud Recording
    
    // --- ENGAGEMENT FEATURES ---
    likesCount: {
        type: Number,
        default: 0
    },
    polls: [{
        question: String,
        options: [{ text: String, votes: { type: Number, default: 0 } }],
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now }
    }],
    ratings: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        score: { type: Number, min: 1, max: 5 },
        feedback: String,
        createdAt: { type: Date, default: Date.now }
    }],
    averageRating: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.models.GoLive || mongoose.model("GoLive", goLiveSchema);


--- File: ImpersonationLog.js ---
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

const impersonationLogSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        actingAsId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

impersonationLogSchema.index({ adminId: 1 });
impersonationLogSchema.index({ organizationId: 1 });

export default mongoose.models.ImpersonationLog ||
    mongoose.model("ImpersonationLog", impersonationLogSchema);


--- File: ImportBatch.js ---
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

/**
 * ImportBatch — Tracks every bulk import operation for rollback capability.
 * 
 * When an admin uploads an Excel/CSV of students or faculty, a batch record
 * is created. All User documents created from that import are tagged with
 * the batch_id. This enables:
 *   1. "Undo Import" — delete all records from a specific batch
 *   2. "View Import History" — see what was imported and when
 *   3. "Dry Run" — preview import results before committing
 */
const importBatchSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        imported_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // What type of data was imported
        import_type: {
            type: String,
            enum: ["students", "faculty", "cet_allotments", "fee_structure", "academic_hierarchy"],
            required: true,
        },
        // Original filename uploaded
        source_filename: {
            type: String,
            default: "",
        },
        // Import execution status
        status: {
            type: String,
            enum: ["dry_run", "committed", "rolled_back", "partial"],
            default: "committed",
        },
        // Counts
        total_rows: { type: Number, default: 0 },
        success_count: { type: Number, default: 0 },
        failed_count: { type: Number, default: 0 },
        duplicate_count: { type: Number, default: 0 },

        // IDs of all records created by this import (for rollback)
        created_record_ids: [{
            type: mongoose.Schema.Types.ObjectId,
        }],

        // Failed rows stored for error CSV download
        failed_rows: [{
            row_number: Number,
            data: mongoose.Schema.Types.Mixed,
            error: String,
        }],

        // Duplicate detections
        duplicate_rows: [{
            row_number: Number,
            data: mongoose.Schema.Types.Mixed,
            existing_record_id: mongoose.Schema.Types.ObjectId,
            conflict_field: String, // e.g., "email", "phone", "prn"
        }],

        // Rollback metadata
        rolled_back_at: { type: Date, default: null },
        rolled_back_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

importBatchSchema.index({ organization_id: 1, createdAt: -1 });
importBatchSchema.index({ status: 1 });

export default mongoose.models.ImportBatch ||
    mongoose.model("ImportBatch", importBatchSchema);


--- File: Invoice.js ---
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
import { INVOICE_STATUS } from "../utils/billing.utils.js";

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        organizationSubscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganizationSubscription",
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(INVOICE_STATUS),
            default: INVOICE_STATUS.DRAFT,
        },
        issueDate: {
            type: Date,
            default: null,
        },
        dueDate: {
            type: Date,
            default: null,
        },
        servicePeriodStart: {
            type: Date,
            required: true,
        },
        servicePeriodEnd: {
            type: Date,
            required: true,
        },
        
        // Snapshot Financial Totals
        subtotalPaise: {
            type: Number,
            default: 0,
        },
        discountAmountPaise: {
            type: Number,
            default: 0,
        },
        creditAmountAppliedPaise: {
            type: Number,
            default: 0,
        },
        taxableAmountPaise: {
            type: Number,
            default: 0,
        },
        taxAmountPaise: {
            type: Number,
            default: 0,
        },
        totalAmountPaise: {
            type: Number,
            default: 0,
        },
        amountPaidPaise: {
            type: Number,
            default: 0,
        },
        amountDuePaise: {
            type: Number,
            default: 0,
        },
        
        // Currency Snapshot
        currency: {
            type: String,
            default: "INR",
        },

        // Immutable lock (ensures we don't accidentally update issued invoices)
        isLocked: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

invoiceSchema.index({ organizationId: 1, status: 1, dueDate: 1 });

invoiceSchema.pre("save", function (next) {
    // If it's already locked and not a status/payment update, block it
    if (!this.isNew && this.isLocked && this.isModified("subtotalPaise")) {
        return next(new Error("Cannot modify financial values of a locked invoice. Use a Credit Note instead."));
    }
    // Lock it automatically if it's issued
    if (this.status !== INVOICE_STATUS.DRAFT) {
        this.isLocked = true;
    }
    next();
});

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);


--- File: InvoiceDelivery.js ---
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

const invoiceDeliverySchema = new mongoose.Schema(
    {
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        deliveryEvent: {
            type: String,
            enum: ["EMAIL_SENT", "EMAIL_FAILED", "DOWNLOADED", "REMINDER_SENT"],
            required: true,
        },
        emailSentTo: {
            type: String,
            default: null,
        },
        errorDetails: {
            type: String,
            default: null,
        },
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Can be null if system generated
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

invoiceDeliverySchema.index({ invoiceId: 1, createdAt: -1 });

export default mongoose.models.InvoiceDelivery || mongoose.model("InvoiceDelivery", invoiceDeliverySchema);


--- File: InvoiceLineItem.js ---
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

const invoiceLineItemSchema = new mongoose.Schema(
    {
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        planVersionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingPlanVersion",
            default: null,
        },
        moduleVersionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingModuleVersion",
            default: null,
        },
        servicePeriodStart: {
            type: Date,
            default: null,
        },
        servicePeriodEnd: {
            type: Date,
            default: null,
        },
        quantity: {
            type: Number,
            default: 1,
        },
        unitPricePaise: {
            type: Number,
            default: 0,
        },
        subtotalPaise: {
            type: Number,
            default: 0,
        },
        discountAmountPaise: {
            type: Number,
            default: 0,
        },
        taxRatePercentage: {
            type: Number,
            default: 0,
        },
        taxAmountPaise: {
            type: Number,
            default: 0,
        },
        totalAmountPaise: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

invoiceLineItemSchema.index({ invoiceId: 1 });

export default mongoose.models.InvoiceLineItem || mongoose.model("InvoiceLineItem", invoiceLineItemSchema);


--- File: InvoiceSequence.js ---
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

const invoiceSequenceSchema = new mongoose.Schema(
    {
        financialYear: {
            type: String, // e.g. "2026-2027"
            required: true,
            unique: true,
        },
        currentNumber: {
            type: Number,
            default: 0,
        },
        prefix: {
            type: String,
            default: "CG-INV-",
        }
    },
    {
        timestamps: true,
    }
);

// Method to atomically get the next invoice number
invoiceSequenceSchema.statics.getNextNumber = async function (financialYear, prefix = "CG-INV-") {
    const sequence = await this.findOneAndUpdate(
        { financialYear },
        { $inc: { currentNumber: 1 }, $setOnInsert: { prefix } },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );
    return `${sequence.prefix}${financialYear}-${sequence.currentNumber.toString().padStart(5, '0')}`;
};

export default mongoose.models.InvoiceSequence || mongoose.model("InvoiceSequence", invoiceSequenceSchema);


--- File: Lead.js ---
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

/**
 * Lead — Coaching Center Mini-CRM Pipeline
 * 
 * Tracks the journey of a potential student from initial inquiry
 * to paid enrollment. Designed specifically for coaching centers
 * where conversion tracking and follow-up reminders are critical.
 * 
 * Pipeline: inquiry → contacted → demo_given → converted → enrolled → dropped
 */
const leadSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },

        // ── Lead Info ────────────────────────────────────────────
        student_name: { type: String, required: true, trim: true },
        parent_name: { type: String, default: "", trim: true },
        phone: { type: String, required: true, trim: true },
        alternate_phone: { type: String, default: "" },
        email: { type: String, default: "", lowercase: true, trim: true },

        // ── Pipeline Stage ───────────────────────────────────────
        stage: {
            type: String,
            enum: ["inquiry", "contacted", "demo_given", "follow_up", "converted", "enrolled", "dropped", "not_interested"],
            default: "inquiry",
        },

        // ── Source Tracking ──────────────────────────────────────
        source: {
            type: String,
            enum: ["walk_in", "phone_call", "website", "referral", "social_media", "newspaper", "other"],
            default: "walk_in",
        },
        referred_by: { type: String, default: "" },

        // ── Interest Details ─────────────────────────────────────
        interested_course: { type: String, default: "" },   // e.g., "JEE Advanced", "NEET Dropper"
        interested_batch: { type: String, default: "" },     // e.g., "Morning Batch", "Weekend"
        current_class: { type: String, default: "" },        // e.g., "12th", "Dropper"

        // ── Follow-Up Management ─────────────────────────────────
        next_follow_up: { type: Date, default: null },
        follow_up_notes: [{
            note: String,
            by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            date: { type: Date, default: Date.now },
        }],

        // ── Conversion Tracking ──────────────────────────────────
        converted_at: { type: Date, default: null },
        converted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        admission_application_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdmissionApplication",
            default: null,
        },
        fee_amount_quoted: { type: Number, default: 0 },
        fee_amount_paid: { type: Number, default: 0 },

        // ── Assignment ───────────────────────────────────────────
        assigned_to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,  // The counselor/receptionist handling this lead
        },

        // ── Metadata ─────────────────────────────────────────────
        tags: [{ type: String }],  // e.g., ["urgent", "scholarship_candidate", "sibling"]
        is_deleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Indexes for fast dashboard queries
leadSchema.index({ organization_id: 1, stage: 1 });
leadSchema.index({ organization_id: 1, next_follow_up: 1 });
leadSchema.index({ organization_id: 1, assigned_to: 1 });
leadSchema.index({ phone: 1, organization_id: 1 });

export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);


--- File: LeaveRequest.js ---
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

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE REQUEST SCHEMA — Optimized for the 4x2 DNA
// Integrates deeply with the master Attendance Register to mark students as 'leave'
// ══════════════════════════════════════════════════════════════════════════════

const leaveRequestSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        student_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // The hierarchy context when they applied (helps faculty filtering)
        hierarchy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicHierarchy",
            default: null,
        },
        start_date: {
            type: Date,
            required: true,
        },
        end_date: {
            type: Date,
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
        // Pointing to Supabase bucket (e.g. medical certificate)
        document_url: {
            type: String, 
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        // Audit trail: Who approved or rejected it
        approved_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        // Why it was rejected or approved
        admin_remarks: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500,
        }
    },
    {
        timestamps: true,
    }
);

// Ultra-fast lookup for Admin/Faculty Dashboards (filtering by status)
leaveRequestSchema.index({ organization_id: 1, hierarchy_id: 1, status: 1 });

// Fast lookup for the Student's personal leave history
leaveRequestSchema.index({ student_id: 1, start_date: -1 });

// Lookup by approver for audit trails
leaveRequestSchema.index({ approved_by: 1, updatedAt: -1 });

export default mongoose.model("LeaveRequest", leaveRequestSchema);


--- File: Meeting.js ---
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

const meetingSchema = new mongoose.Schema(
    {
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        provider: {
            type: String,
            enum: ["google_meet", "zoom", "webex"],
            required: true,
        },
        topic: {
            type: String,
            required: true,
        },
        join_url: {
            type: String,
            required: true,
        },
        start_time: {
            type: Date,
            required: true,
        },
        duration: {
            type: Number, // in minutes
            default: 60,
        },
        calendar_event_id: {
            type: String, // ID of the event in Google Calendar (optional)
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

meetingSchema.index({ classroom: 1, start_time: 1 });
meetingSchema.index({ teacher: 1, start_time: 1 });
meetingSchema.index({ organization_id: 1 });

export default mongoose.model("Meeting", meetingSchema);


--- File: MeetingChat.js ---
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

import mongoose from 'mongoose';

const MeetingChatSchema = new mongoose.Schema({
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    meeting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GoLive',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Number, // Seconds relative to meeting start time
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'system'],
        default: 'text'
    }
}, { timestamps: true });

// Index for fast retrieval during video playback
MeetingChatSchema.index({ meeting: 1, timestamp: 1 });

const MeetingChat = mongoose.model('MeetingChat', MeetingChatSchema);
export default MeetingChat;


--- File: Message.js ---
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

const messageSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Null for group messages, set for private messages
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        content: {
            type: String,
            required: true,
            maxlength: 2000,
            trim: true,
        },

        messageType: {
            type: String,
            enum: ["group", "private"],
            default: "group",
        },

        // Attachments
        fileUrl: { type: String, default: null },
        fileName: { type: String, default: null },
        fileType: { type: String, default: null },
        fileSize: { type: Number, default: null },

        // For read receipts (future feature)
        readBy: [{
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            readAt: { type: Date, default: Date.now },
        }],

        // Soft delete
        isDeleted: {
            type: Boolean,
            default: false,
        },

        // For reply threading (future feature)
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
        
        // --- Day 17: Live Video Sync ---
        videoTimestamp: {
            type: Number, // Seconds into the video/stream
            default: null
        }
    },
    {
        timestamps: true,
    }
);

// Group chat messages — sorted by time, scoped to classroom
messageSchema.index({ classroom: 1, messageType: 1, createdAt: -1 });

// Private messages — between two users in a classroom
messageSchema.index({ classroom: 1, sender: 1, receiver: 1, createdAt: -1 });

// For polling new messages (after a certain timestamp)
messageSchema.index({ classroom: 1, messageType: 1, createdAt: 1 });

// 🗑️ TTL: auto-delete messages older than 30 days to keep storage minimal
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model("Message", messageSchema);


--- File: MessageDraft.js ---
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

const messageDraftSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
      unique: true, // One draft per ticket
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional, so AI can create a draft without knowing which admin clicked
    },
    draftContent: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ["manual", "ai_generated"],
      default: "manual",
    },
    aiContext: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const MessageDraft = mongoose.models.MessageDraft || mongoose.model("MessageDraft", messageDraftSchema);

export default MessageDraft;


--- File: Note.js ---
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

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    textContent: {
        type: String, // Plain text content for easier searching
    },
    tags: [{
        type: String,
        trim: true
    }],
    isPinned: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    category: {
        type: String,
        default: "General",
        trim: true
    },
    icon: {
        type: String,
        default: "📄"
    },
    status: {
        type: String,
        enum: ["Draft", "Published", "Archived", "Deprecated"],
        default: "Published"
    },
    visibility: {
        type: String,
        enum: ["Private", "Public", "Shared"],
        default: "Private"
    }
}, { timestamps: true });

// Indexes for faster search and filtering
noteSchema.index({ createdBy: 1, createdAt: -1 });
noteSchema.index({ createdBy: 1, tags: 1 });
noteSchema.index({ title: "text", textContent: "text", tags: "text" }); // Text index for full-text search

export default mongoose.model("Note", noteSchema);


--- File: NotePackage.js ---
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

import mongoose from 'mongoose';

const NotePackageSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    title: { type: String, required: true },
    description: { type: String },
    subject: { type: String },
    branch: { type: String },
    price: { type: Number, default: 0 }, // 0 = Free
    fileUrl: { type: String, required: true }, // Main PDF Path
    previewUrls: [{ type: String }], // First 3 pages thumbnails
    summary: { type: String }, // AI Generated
    stats: {
        views: { type: Number, default: 0 },
        sales: { type: Number, default: 0 },
        rating: { type: Number, default: 0 }
    },
    isApproved: { type: Boolean, default: false }, // Moderation layer
    createdAt: { type: Date, default: Date.now }
});

const NotePackage = mongoose.model('NotePackage', NotePackageSchema);
export default NotePackage;


--- File: NoteVersion.js ---
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

const noteVersionSchema = new mongoose.Schema({
    noteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Note",
        required: true
    },
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true
    },
    textContent: {
        type: String,
    },
    tags: [{
        type: String,
    }],
    category: {
        type: String,
    },
    icon: {
        type: String,
    },
    status: {
        type: String,
    },
    visibility: {
        type: String,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

noteVersionSchema.index({ noteId: 1, createdAt: -1 });

export default mongoose.model("NoteVersion", noteVersionSchema);


--- File: NoteView.js ---
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

// Tracks which students viewed which notes
const noteViewSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        noteId: {
            type: String, // Supabase note ID
            required: true,
        },
        noteTitle: {
            type: String,
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        studentName: {
            type: String,
            required: true,
        },
        studentEmail: {
            type: String,
            required: true,
        },
        uploadedBy: {
            type: String, // Teacher's email or name
            required: true,
        },
        viewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Compound index: one view record per student per note
noteViewSchema.index({ noteId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("NoteView", noteViewSchema);


--- File: Notification.js ---
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

const notificationSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: false,
        index: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["request_approved", "request_rejected", "new_content", "content_update", "system", "chat", "attendance", "attendance_ended", "assignment", "quiz", "meeting_reminder", "result", "fee_reminder", "fee_assigned", "fee_payment", "quick_leave", "alert", "join_request", "library", "feedback_assigned", "viva_scheduled", "support_update"],
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    link: {
        type: String, // URL to redirect to (e.g., /view-classroom?id=...)
    },
    relatedId: {
        type: String, // ID of the related object (classroom_id, content_id)
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    // 📧 Whether this notification also triggered an email
    emailSent: {
        type: Boolean,
        default: false,
    },
    emailSentAt: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 432000 // 🗑️ Auto-delete after 5 days (5 * 24 * 60 * 60 seconds)
    },
});

export default mongoose.model("Notification", notificationSchema);


--- File: Notification.model.js ---
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

const notificationSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
        type: String,
        enum: ["assignment", "quiz", "result", "chat", "attendance", "system", "request_approved", "request_rejected"],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String, // Deep link URL
    relatedId: String,
    isRead: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 604800 } // Auto-expire after 7 days
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);



--- File: NotificationLog.js ---
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

const notificationLogSchema = new mongoose.Schema(
    {
        organizationId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Organization",
            required: false // AI email deliveries may not belong to an organization
        },
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User",
            required: false // May be null if sent to a parent/guest without a formal user ID
        },
        templateId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "NotificationTemplate"
        },
        type: { 
            type: String, 
            enum: ["EMAIL", "SMS"], 
            required: true 
        },
        recipient: { 
            type: String, 
            required: true 
        },
        status: { 
            type: String, 
            enum: ["PENDING", "SENT", "DELIVERED", "FAILED", "BOUNCED", "COMPLAINED"],
            default: "PENDING"
        },
        providerMessageId: { 
            type: String 
        },
        failureReason: { 
            type: String 
        },
        metadata: { 
            type: mongoose.Schema.Types.Mixed 
        },
        idempotencyKey: {
            type: String,
            unique: true,
            sparse: true
        },
        retryCount: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

// Indexes for fast querying in the super admin dashboard
notificationLogSchema.index({ organizationId: 1, createdAt: -1 });
notificationLogSchema.index({ status: 1 });
notificationLogSchema.index({ recipient: 1 });

const NotificationLog = mongoose.model("NotificationLog", notificationLogSchema);

export default NotificationLog;


--- File: NotificationTemplate.js ---
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

const notificationTemplateSchema = new mongoose.Schema(
    {
        name: { 
            type: String, 
            required: true, 
            unique: true, 
            trim: true 
        },
        type: { 
            type: String, 
            enum: ["EMAIL", "SMS"], 
            required: true 
        },
        category: { 
            type: String, 
            enum: ["PAYMENT", "ADMISSION", "SAAS", "SYSTEM"], 
            required: true 
        },
        subject: { 
            type: String, 
            required: function() { return this.type === 'EMAIL'; } 
        },
        htmlBody: { 
            type: String, 
            required: function() { return this.type === 'EMAIL'; } 
        },
        textBody: { 
            type: String,
            required: function() { return this.type === 'SMS'; }
        },
        fromEmail: {
            type: String
        },
        fromName: {
            type: String
        },
        requiredPlaceholders: { 
            type: [String], 
            default: [] 
        },
        description: { 
            type: String 
        },
        isActive: { 
            type: Boolean, 
            default: true 
        },
        createdBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User" 
        },
        updatedBy: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User" 
        }
    },
    { timestamps: true }
);

const NotificationTemplate = mongoose.model("NotificationTemplate", notificationTemplateSchema);

export default NotificationTemplate;


--- File: OAuth.js ---
import mongoose from "mongoose";

const OAuthClientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  clientSecret: { type: String, required: true },
  name: { type: String, required: true }, // e.g., "Notion AI" or "Cursor MCP"
  redirectUris: { type: [String], required: true },
  grants: { type: [String], default: ["authorization_code", "refresh_token"] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

const OAuthAuthCodeSchema = new mongoose.Schema({
  authorizationCode: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  redirectUri: { type: String, required: true },
  clientId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});

// TTL index to automatically delete expired auth codes
OAuthAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OAuthTokenSchema = new mongoose.Schema({
  accessToken: { type: String, required: true, unique: true },
  accessTokenExpiresAt: { type: Date, required: true },
  refreshToken: { type: String, unique: true, sparse: true },
  refreshTokenExpiresAt: { type: Date },
  clientId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});

// TTL index to automatically delete expired tokens
OAuthTokenSchema.index({ accessTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthClient = mongoose.models.OAuthClient || mongoose.model("OAuthClient", OAuthClientSchema);
export const OAuthAuthCode = mongoose.models.OAuthAuthCode || mongoose.model("OAuthAuthCode", OAuthAuthCodeSchema);
export const OAuthToken = mongoose.models.OAuthToken || mongoose.model("OAuthToken", OAuthTokenSchema);


--- File: OnboardingEvent.js ---
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

const onboardingEventSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    demoRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DemoRequest",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    stage: {
      type: String,
      default: "",
      trim: true,
    },
    actorRole: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

onboardingEventSchema.index({ organizationId: 1, createdAt: -1 });
onboardingEventSchema.index({ demoRequestId: 1, createdAt: -1 });

export default mongoose.models.OnboardingEvent ||
  mongoose.model("OnboardingEvent", onboardingEventSchema);


--- File: OnboardingOTP.js ---
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

const onboardingOTPSchema = new mongoose.Schema(
    {
        target: {
            type: String, // email address or phone number
            required: true,
            index: true,
            lowercase: true,
        },
        type: {
            type: String,
            enum: ["email", "phone"],
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        attempts: {
            type: Number,
            default: 0,
        },
        expires_at: {
            type: Date,
            required: true,
            index: { expires: 0 }, // Auto-delete after expiration (e.g. 10 mins)
        }
    },
    { timestamps: true }
);

export default mongoose.models.OnboardingOTP || mongoose.model("OnboardingOTP", onboardingOTPSchema);


--- File: Organization.js ---
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

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        sidebar_name: {
            type: String,
            trim: true,
            default: "",
            maxlength: 22,
        },
        org_type: {
            type: String,
            enum: ["school", "junior_college", "engineering", "coaching", "diploma", "other"],
            required: true,
        },
        // 🏗️ Academic Hierarchy Plan (maps to the 7-Plan table in Master Plan)
        // Plan 1: engineering, Plan 2: school_with_div, Plan 3: school_no_div,
        // Plan 4: coaching, Plan 5: junior_college, Plan 6: diploma, Plan 7: custom
        structure_type: {
            type: String,
            enum: [
                "engineering",             // Plan 1: (Legacy)
                "engineering_with_div",    // Plan 1a: Degree → Dept → Year → Sem → Div/Batch
                "engineering_no_div",      // Plan 1b: Degree → Dept → Year → Sem (auto "Default Division")
                "school_with_div",         // Plan 2: Standard → Division
                "school_no_div",           // Plan 3: Standard only (auto "Default Division")
                "coaching",                // Plan 4: Course → Batch (blocks divisions & semesters)
                "junior_college",          // Plan 5: (Legacy)
                "junior_college_with_div", // Plan 5a: Stream → Standard → Division
                "junior_college_no_div",   // Plan 5b: Stream → Standard (auto "Default Division")
                "diploma",                 // Plan 6: (Legacy)
                "diploma_with_div",        // Plan 6a: Dept → Year → Semester → Division
                "diploma_no_div",          // Plan 6b: Dept → Year → Semester (auto "Default Division")
                "custom",                  // Plan 7: Open-ended grouping
            ],
            required: true,
        },
        // Whether the org uses divisions (A/B/C) or not
        division_mode: {
            type: String,
            enum: ["with_divisions", "without_divisions"],
            default: "with_divisions",
        },
        // Enables optional splitting under a division, such as lab batches or junior-college batches.
        allow_sub_batches: {
            type: Boolean,
            default: false,
        },
        // Subdomain slug for multi-tenant DNS routing (for example, "example-campus").
        subdomain: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
        },
        custom_domain: {
            domain: { type: String, default: null },
            status: {
                type: String,
                enum: ["pending_verification", "verified_with_conflicts", "verified", "active", "failed"],
                default: "pending_verification"
            },
            verification_token: { type: String, default: null },
            txt_verified: { type: Boolean, default: false },
            cname_verified: { type: Boolean, default: false },
            ssl_provisioned: { type: Boolean, default: false },
            allow_classgrid_url: { type: Boolean, default: true },
            is_enabled: { type: Boolean, default: true },
            verified_at: { type: Date, default: null },
            created_at: { type: Date, default: null },
        },
        erp_domain: {
            domain: { type: String, default: null },
            status: {
                type: String,
                enum: ["pending_verification", "verified_with_conflicts", "verified", "active", "failed"],
                default: "pending_verification"
            },
            verification_token: { type: String, default: null },
            txt_verified: { type: Boolean, default: false },
            cname_verified: { type: Boolean, default: false },
            ssl_provisioned: { type: Boolean, default: false },
            allow_classgrid_url: { type: Boolean, default: true },
            is_enabled: { type: Boolean, default: true },
            verified_at: { type: Date, default: null },
            created_at: { type: Date, default: null },
        },
        purchased_modules: {
            erp_core: { type: Boolean, default: true },
            college_website: { type: Boolean, default: true } // Default true for testing
        },
        // Custom Browser Tab Title (Premium White-labeling)
        site_title: {
            type: String,
            default: "Classgrid ERP",
            trim: true
        },
        address: {
            type: String,
            required: true,
        },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        district: { type: String, trim: true, default: "" },
        taluka: { type: String, trim: true, default: "" },
        billing_settings: {
            invoice_email: { type: String, trim: true, lowercase: true, default: "" },
            email_verified: { type: Boolean, default: false },
            phone: { type: String, trim: true, default: "" },
            phone_verified: { type: Boolean, default: false },
            gstin: { type: String, trim: true, uppercase: true, default: "" },
            address_line1: { type: String, trim: true, default: "" },
            address_line2: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            pincode: { type: String, trim: true, default: "" },
            billing_contact_name: { type: String, trim: true, default: "" },
            verification_token: { type: String, default: "" },
            verification_otp: { type: String, default: "" },
            verification_expires_at: { type: Date },
        },
        logo_url: {
            type: String,
            default: "",
        },
        sidebar_logo_url: {
            type: String,
            default: "",
        },
        favicon_url: {
            type: String,
            default: "",
        },
        campus_photo_url: {
            type: String,
            default: "",
        },
        brand_colors: {
            primary: {
                type: String,
                default: "#6366f1",
                trim: true,
                match: [HEX_COLOR_PATTERN, "Primary brand color must be a valid hex color."],
            },
            secondary: {
                type: String,
                default: "#4f46e5",
                trim: true,
                match: [HEX_COLOR_PATTERN, "Secondary brand color must be a valid hex color."],
            },
        },
        // 🔗 Social Media Links — displayed on custom domain login pages
        social_links: {
            instagram_url: { type: String, default: "" },
            youtube_url: { type: String, default: "" },
            facebook_url: { type: String, default: "" },
            linkedin_url: { type: String, default: "" },
            twitter_url: { type: String, default: "" },
            github_url: { type: String, default: "" },
            website_url: { type: String, default: "" },
        },
        owner_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // Made false because organizations are provisioned BEFORE the pending admin is fully activated
        },
        ownerName: { type: String, default: "" },
        ownerEmail: { type: String, default: "" },
        contactNumber: { type: String, default: "" },
        website: { type: String, default: "" },
        designation: { type: String, default: "" },
        // 🔐 Pending Admin — stores admin info during provisioning, BEFORE the admin activates their account
        pending_admin: {
            name: { type: String, default: "" },
            email: { type: String, default: "" },
            phone: { type: String, default: "" },
            activationToken: { type: String, default: "" },
            activationTokenExpires: { type: Date, default: null },
            activationCodeHash: { type: String, default: "" },
            activationCodeExpires: { type: Date, default: null },
        },
        razorpayCustomerId: {

            type: String,
            default: "",
        },
        razorpaySubscriptionId: {
            type: String,
            default: "",
        },
        razorpayOrderId: {
            type: String,
            default: "",
        },
        paymentMethod: {
            type: String,
            enum: ["razorpay", "manual", ""],
            default: "",
        },
        paymentAmount: {
            type: Number,
            default: 0,
        },
        // Legacy code — kept for backward compat; new orgs use organizationCode
        private_code: {
            type: String,
            required: true,
            unique: true,
        },
        // 🏫 Organization Code — used by FACULTY to onboard (12-char uppercase alphanumeric)
        organizationCode: {
            type: String,
            unique: true,
            sparse: true,  // allow null for legacy orgs
        },
        // 🎓 Honor Code — used by STUDENTS to join the organization directly (12-char uppercase alphanumeric)
        honorCode: {
            type: String,
            unique: true,
            sparse: true,  // allow null for legacy orgs
        },
        // 🔐 Org Code Security — time-based validity and regeneration
        org_code_expires_at: {
            type: Date,
            default: null,  // null = never expires (legacy default)
        },
        org_code_regenerated_at: {
            type: Date,
            default: null,
        },
        // Allowed email domains for joining classrooms
        allowed_domains: [{
            type: String,
            lowercase: true,
            trim: true
        }],
        is_active: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["active", "suspended", "blocked", "sandbox", "setup_in_progress"],
            default: "active",
        },
        org_mode: {
            type: String,
            enum: ["sandbox", "production"],
            default: "production",
        },
        // 🕒 Tracks the 31-day Full ERP Demo expiry
        demoExpiresAt: {
            type: Date,
            default: null,
        },
        // 📋 Onboarding Progress Tracker (visible to Sales + Org Admin)
        onboarding_progress: {
            tenant_created: { type: Boolean, default: false },
            branding_configured: { type: Boolean, default: false },
            academic_hierarchy_set: { type: Boolean, default: false },
            staff_imported: { type: Boolean, default: false },
            students_imported: { type: Boolean, default: false },
            fee_structure_configured: { type: Boolean, default: false },
            admission_form_configured: { type: Boolean, default: false },  // Step 7: Form Builder
            first_login_completed: { type: Boolean, default: false },
            current_stage: {
                type: String,
                enum: [
                    "tenant_created",
                    "admin_activation_pending",
                    "branding_pending",
                    "academic_structure_pending",
                    "staff_onboarding_pending",
                    "student_onboarding_pending",
                    "fees_pending",
                    "admissions_pending",
                    "go_live_ready",
                ],
                default: "tenant_created",
            },
            last_synced_at: { type: Date, default: null },
            completed_at: { type: Date, default: null },
        },
        // 🆔 Label for student identifier — displayed as "PRN" or "Roll No"
        rollNumberLabel: {
            type: String,
            enum: ["PRN", "Roll No"],
            default: "PRN",
        },
        // 🎓 Academic Structure Configuration — managed by org_admin
        academic_config: {
            // Identifier label override (more options than rollNumberLabel)
            identifierLabel: {
                type: String,
                enum: ["PRN", "Roll No", "Enrollment No"],
                default: "PRN",
            },
            // PRN enforcement
            prnRequired: { type: Boolean, default: true },
            prnLocked: { type: Boolean, default: false }, // Lock PRN after first submission
            // Managed lists — org admin defines valid options
            batches: [{ type: String, trim: true }],   // e.g. ["2022-2026", "2023-2027"]
            branches: [{ type: String, trim: true }],   // e.g. ["Computer", "IT", "Mechanical"]
            // Which fields are required for profile completion
            requiredFields: {
                prn: { type: Boolean, default: true },
                batch: { type: Boolean, default: true },
                branch: { type: Boolean, default: true },
            },
            // ID card display control
            idCardFields: {
                type: [String],
                enum: ["prn", "rollNo", "both"],
                default: ["prn"],
            },
        },
        // 🎨 Branding Configuration — managed by org_admin for dynamic themes
        branding: {
            theme_colors: {
                primary: {
                    type: String,
                    default: "#6366f1",
                    trim: true,
                    match: [HEX_COLOR_PATTERN, "Primary theme color must be a valid hex color."],
                },   // Indigo
                secondary: {
                    type: String,
                    default: "#4f46e5",
                    trim: true,
                    match: [HEX_COLOR_PATTERN, "Secondary theme color must be a valid hex color."],
                }, // Dark Indigo
                accent: { type: String, default: "#f43f5e" },    // Rose
            },
            font_preference: { type: String, default: "Inter" },
            tagline: { type: String, default: "" },
        },
        /**
         * 🎓 Admission Engine Configuration (Module 21)
         * - portal_open: Master switch for discovery/application
         * - registration_fee: Amount students pay to register
         * - allowed_stages: Dynamic workflow definition
         * - merit_logic: How normalization is calculated
         */
        admission_config: {
            // Edge Case 4 & 5: Application Validity & Edit Windows
            application_config: {
                document_validity_days: {
                    caste_cert: { type: Number, default: 365 },
                    income_cert: { type: Number, default: 365 },
                    aadhar: { type: Number, default: null } // Never expires
                }
            },
            enrollment_config: {
                editable_until: { type: Date, default: null } // Lock applications after this date
            },

            // Edge Case 7: Multi-Round Admission (Non-CET)
            admission_round: {
                current_round: { type: Number, default: 1 },
                max_rounds: { type: Number, default: 3 },
                round_history: [{
                    round_number: Number,
                    merit_list_published_at: Date,
                    seats_filled: Number,
                    seats_remaining: Number
                }]
            },

            // 1. 🪑 Seat Matrix & Reservation Policy (Govt Mandated)
            seat_matrix_policy: {
                enabled: { type: Boolean, default: true },
                categories: [{
                    category_name: { type: String, required: true }, // e.g. "OPEN", "OBC", "SC"
                    reservation_percentage: { type: Number, required: true } // e.g. 50, 27, 15
                }],
                supernumerary_seats: {
                    tfws_percent: { type: Number, default: 5 }, // Tuition Fee Waiver Scheme
                    ews_percent: { type: Number, default: 10 }  // Economically Weaker Section
                }
            },

            // 2. ⚖️ Tie-Breaking Rules (When % is same)
            tie_breaker_rules: [{
                priority: { type: Number, required: true }, // 1, 2, 3
                criteria: {
                    type: String,
                    enum: ["math_marks", "science_marks", "english_marks", "date_of_birth"],
                    required: true
                },
                order: { type: String, enum: ["desc", "asc"], default: "desc" } // Desc = higher marks win, Asc = older dob wins
            }],

            // 3 & 4. ⏳ Waitlist & Deadline Enforcement
            waitlist_and_deadlines: {
                waitlist_enabled: { type: Boolean, default: true },
                auto_promote_waitlist: { type: Boolean, default: false }, // If True, system auto triggers Round N+1 when seats expire
                fee_payment_deadline_hours: { type: Number, default: 48 }, // Cutoff before status changes to 'cancelled'
                cancellation_handling: { type: String, enum: ["return_to_pool", "manual_review"], default: "return_to_pool" }
            },

            // 5. ⚙️ Execution Engine rules (When things happen)
            workflow_execution: {
                // Should the College Admin manually verify PDFs before the student can pay?
                // False = Bypass verification (because CET FC Center already checked them). Generates PRN instantly.
                require_admin_document_verification: { type: Boolean, default: false },

                // E.g., Engineering CET flow = "post_allotment_pre_fee", Standard Colloge = "post_fee"
                prn_generation: {
                    type: String,
                    enum: ["post_allotment_pre_fee", "post_fee_payment"],
                    default: "post_fee_payment"
                },
                login_credential_dispatch: {
                    type: String,
                    enum: ["with_allotment_email", "post_fee_payment"],
                    default: "post_fee_payment"
                }
            },

            // Other Admission Settings
            is_portal_open: { type: Boolean, default: false },
            is_merit_list_published: { type: Boolean, default: false },
            registration_fee: { type: Number, default: 0 },
            max_applications_per_student: { type: Number, default: 1 },
            cutoff_date: { type: Date, default: null },
            admin_roles: [{ type: String, default: ["org_admin", "admission_coordinator"] }],
            instructions: { type: String, default: "" },

            // 🎛️ Universal Form Builder — Admin toggles fields ON/OFF from MASTER_FIELD_POOL
            // Each field can be independently enabled for Admission, Onboarding, or Both
            form_builder_config: {
                // Per-field toggle: which form(s) each field appears on
                // e.g. [{ key: "abc_id", admission: true, onboarding: false }]
                field_toggles: [{
                    key: { type: String, required: true },              // Field key from MASTER_FIELD_POOL
                    admission: { type: Boolean, default: true },        // Show on Admission form?
                    onboarding: { type: Boolean, default: true },       // Show on Onboarding form?
                    is_required: { type: Boolean, default: undefined }  // Override built-in default requiredness?
                }],
                // Per-document toggle: which form(s) each document appears on
                document_toggles: [{
                    key: { type: String, required: true },              // Document key from MASTER_DOCUMENT_POOL
                    admission: { type: Boolean, default: true },
                    onboarding: { type: Boolean, default: false }
                }],
                // Custom fields created by the org admin (also dual-toggle)
                custom_fields: [{
                    field_key: { type: String, required: true },        // e.g. "transport_route"
                    field_label: { type: String, required: true },      // e.g. "Preferred Bus Route"
                    field_type: {
                        type: String,
                        enum: ["text", "number", "date", "dropdown", "boolean", "file"],
                        required: true
                    },
                    options: [{ type: String }],                        // For dropdown options
                    is_required: { type: Boolean, default: false },
                    section: { type: String, default: "other" },        // UI grouping
                    admission: { type: Boolean, default: true },        // Show on Admission form?
                    onboarding: { type: Boolean, default: true }        // Show on Onboarding form?
                }]
            },

            // 💰 Fee & Scholarship Config (Day 17)
            fee_config: {
                admission_fee_structure_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure" },
                dynamic_fee_mapping: [
                    {
                        attribute: { type: String }, // e.g. "TFWS", "OBC", "SC"
                        attribute_type: { type: String, enum: ["category", "seat_type"] },
                        fee_structure_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure" }
                    }
                ],
                // 🔄 Withdrawal & Refund Logic
                refund_policy: {
                    enabled: { type: Boolean, default: false },
                    rules: [
                        {
                            days_before_start: { type: Number }, // days before session_start_date
                            refund_percentage: { type: Number } // percentage of total fee
                        }
                    ]
                },
                session_start_date: { type: Date, default: null }
            }
        },
        /**
         * 🏢 Enterprise HR Module (Biometric Webhooks + Payroll)
         */
        hr_config: {
            biometric_api_key: { type: String, default: "" }, // Token sent by biometric device
            biometric_secret_hash: { type: String, default: "" }, // HMAC payload signing secret
            whitelisted_ips: [{ type: String, default: [] }], // IPs allowed to push attendance
            payroll_config: {
                default_salary_mode: { type: String, enum: ["hourly", "monthly", "none"], default: "none" },
                standard_working_hours: { type: Number, default: 8 },
            }
        },
        /**
         * 🍔 Canteen Management System (Module 22)
         */
        canteen_config: {
            is_active: { type: Boolean, default: false },
            operating_mode: { type: String, enum: ["standard", "max"], default: "standard" },
            // 💰 Tenant-Specific Razorpay Keys for direct canteen owner settlement
            canteen_razorpay_key_id: { type: String, default: "" },
            canteen_razorpay_key_secret: { type: String, default: "" }, // Always AES-256 encrypted before saving
            canteen_razorpay_webhook_secret: { type: String, default: "" }, // Always AES-256 encrypted before saving
        },
        /**
         * 🎛️ Feature Flags — Premium Module Upsell Toggles
         * Each flag controls visibility of a premium tab for Org Admins.
         * Sales team enables these flags when the org subscribes to a premium tier.
         */
        feature_flags: {
            erp_core: { type: Boolean, default: true },
            naac_module: { type: Boolean, default: false },        // NAAC/NBA Auditor tab
            hr_module: { type: Boolean, default: false },          // Enterprise HR + Biometric + Payroll
            marketplace_module: { type: Boolean, default: false }, // Notes Marketplace for students
            admission_module: { type: Boolean, default: false },   // Admission Engine portal
            canteen_module: { type: Boolean, default: false },     // Canteen Management
            exam_proctoring: { type: Boolean, default: false },    // AI Proctoring for online exams
            custom_domain_module: { type: Boolean, default: false },
            fee_module: { type: Boolean, default: false },
            ai_assistant: { type: Boolean, default: false },
            analytics_module: { type: Boolean, default: false },
            website_module: { type: Boolean, default: false },
            certificates_module: { type: Boolean, default: false },
            events_module: { type: Boolean, default: false },
            feedback_module: { type: Boolean, default: false },
            holiday_module: { type: Boolean, default: false },
            id_cards_module: { type: Boolean, default: false },
            attendance_module: { type: Boolean, default: false },
            classroom_module: { type: Boolean, default: false },
            timetable_module: { type: Boolean, default: false },
            academic_planner_module: { type: Boolean, default: false },
            assignment_module: { type: Boolean, default: false },
            teacher_planner_module: { type: Boolean, default: false },
            subject_management_module: { type: Boolean, default: false },
            course_management_module: { type: Boolean, default: false },
            exam_module: { type: Boolean, default: false },
            exam_management_module: { type: Boolean, default: false },
            quiz_module: { type: Boolean, default: false },
            grade_entry_module: { type: Boolean, default: false },
            internal_assessment_module: { type: Boolean, default: false },
            cet_exam_module: { type: Boolean, default: false },
            mock_tests_module: { type: Boolean, default: false },
            ai_viva_module: { type: Boolean, default: false },
            test_series_module: { type: Boolean, default: false },
            library_module: { type: Boolean, default: false },
            alumni_module: { type: Boolean, default: false },
            dashboard_admission: { type: Boolean, default: false },
            dashboard_fees: { type: Boolean, default: false },
            dashboard_exam: { type: Boolean, default: false },
            dashboard_library: { type: Boolean, default: false },
            dashboard_attendance: { type: Boolean, default: false },
            dashboard_hr: { type: Boolean, default: false },
            dashboard_hostel: { type: Boolean, default: false },
            dashboard_student: { type: Boolean, default: false },
            dashboard_faculty: { type: Boolean, default: false },
            dashboard_organization: { type: Boolean, default: false },
                        dashboard_canteen: { type: Boolean, default: false },
        },
        // AI Configuration (Token Pools & Access)
        ai_config: {
            pro_pool_limit: { type: Number, default: 500000 },
            pro_used_this_period: { type: Number, default: 0 },
            pro_reset_date: { type: Date, default: () => { const d = new Date(); d.setHours(d.getHours() + 4); return d; } },
            pro_enabled_roles: { 
                type: [String], 
                enum: ["org_admin", "department_admin", "faculty", "student"],
                default: ["org_admin"] 
            },
            pro_enabled_users: [{ 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'User' 
            }],
            custom_api_keys: {
                openai_key: { type: String, default: "" },
                anthropic_key: { type: String, default: "" },
                gemini_key: { type: String, default: "" },
            }
        },
        // 🔄 Academic Promotion Lock — prevents concurrent promotions
        is_promoting: {
            type: Boolean,
            default: false,
        },
        promotion_started_at: {
            type: Date,
            default: null,
        },
        // 📅 Scheduled Promotion (SaaS Automation)
        scheduled_promotion: {
            target_year_id: { type: String, default: null },
            excluded_ids: { type: [String], default: [] },
            execute_at: { type: Date, default: null },
            admin_id: { type: String, default: null },
            status: { type: String, enum: ["pending", "running", "completed", "failed", "idle"], default: "idle" }
        },
        // 🏫 Affiliation — e.g. "Savitribai Phule Pune University", "Mumbai University"
        affiliation: {
            type: String,
            default: "",
        },
        registration_number: {
            type: String,
            trim: true,
            default: "",
        },
        // 💰 Per-Org Razorpay Keys — for STUDENT FEE PAYMENTS (money goes to college)
        // Separate from platform subscription keys (razorpayCustomerId etc)
        fees_razorpay_key_id: {
            type: String,
            default: "",
        },
        fees_razorpay_key_secret: {
            type: String,
            default: "",
        },
        fees_razorpay_webhook_secret: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true, // Adds created_at and updated_at
        optimisticConcurrency: true,
    }
);

organizationSchema.index({ owner_id: 1 });
organizationSchema.index({ status: 1 });
// organizationSchema.index({ subdomain: 1 }); // removed duplicate
organizationSchema.index({ "custom_domain.domain": 1 }, { sparse: true });
organizationSchema.index({ org_type: 1 });
// NOTE: organizationCode and honorCode indexes are created automatically
// via { unique: true, sparse: true } on the field definition above.
// Do NOT add schema.index() for them here — that causes duplicate index warnings.

export default mongoose.models.Organization || mongoose.model("Organization", organizationSchema);


--- File: OrganizationAnnouncement.js ---
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

const organizationAnnouncementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["announcement", "notice", "event", "holiday", "emergency"],
        default: "announcement",
    },
    source: {
        type: String,
        enum: ["mongo", "supabase"],
        default: "mongo",
    },
    supabase_id: {
        type: String,
        index: true,
        sparse: true,
    },
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true,
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    target_type: {
        type: String,
        enum: ["specific", "all"],
        default: "specific",
    },
    target_classrooms: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Classroom",
    }],

    status: {
        type: String,
        enum: ["draft", "scheduled", "published"],
        default: "published",
    },
    sent_at: {
        type: Date,
        default: Date.now,
    },
    expires_at: {
        type: Date,
    },
    views_count: {
        type: Number,
        default: 0,
    },
    creator_name: {
        type: String,
        default: "",
    },
    attachment_url: {
        type: String,
        default: "",
    },
    attachment_name: {
        type: String,
        default: "",
    },
    attachment_type: {
        type: String,
        default: "",
    }
}, { timestamps: true });

// Prevent targeted classrooms if target_type is 'all'
organizationAnnouncementSchema.pre("save", function () {
    if (this.target_type === "all") {
        this.target_classrooms = [];
    }
});

const OrganizationAnnouncement = mongoose.model("OrganizationAnnouncement", organizationAnnouncementSchema);
export default OrganizationAnnouncement;


--- File: OrganizationBillingUsageSnapshot.js ---
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

const organizationBillingUsageSnapshotSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        billingPeriodStart: {
            type: Date,
            required: true,
        },
        billingPeriodEnd: {
            type: Date,
            required: true,
        },
        metricCode: {
            type: String, // Matches BillingMetricDefinition.code
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        source: {
            type: String, // e.g. "DAILY_AGGREGATION_CRON", "MANUAL_OVERRIDE"
            required: true,
        },
        calculatedAt: {
            type: Date,
            default: Date.now,
        },
        calculationVersion: { // To track multiple recalculations in a month
            type: Number,
            default: 1,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed, // e.g. data points used for the calculation
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

organizationBillingUsageSnapshotSchema.index({ organizationId: 1, metricCode: 1, billingPeriodStart: 1 });

export default mongoose.models.OrganizationBillingUsageSnapshot || mongoose.model("OrganizationBillingUsageSnapshot", organizationBillingUsageSnapshotSchema);


--- File: OrganizationCreditAccount.js ---
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

const organizationCreditAccountSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            unique: true,
        },
        currentBalancePaise: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: "INR",
        },
        status: {
            type: String,
            enum: ["ACTIVE", "FROZEN"],
            default: "ACTIVE",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.OrganizationCreditAccount || mongoose.model("OrganizationCreditAccount", organizationCreditAccountSchema);


--- File: OrganizationCreditEntry.js ---
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
import { CREDIT_LEDGER_TYPE } from "../utils/billing.utils.js";

const organizationCreditEntrySchema = new mongoose.Schema(
    {
        organizationCreditAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganizationCreditAccount",
            required: true,
        },
        entryType: {
            type: String,
            enum: Object.values(CREDIT_LEDGER_TYPE),
            required: true,
        },
        amountPaise: { // Positive for additions, Negative for deductions
            type: Number,
            required: true,
        },
        balanceAfterPaise: { // The resulting balance after this transaction
            type: Number,
            required: true,
        },
        referenceType: { // e.g. "Invoice", "Manual Adjustment", "Refund"
            type: String,
            default: null,
        },
        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null, // The related document (like the Invoice ID)
        },
        reason: {
            type: String,
            default: "",
        },
        createdBy: { // Can be null if system generated
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Immutable Ledger
organizationCreditEntrySchema.pre("save", function (next) {
    if (!this.isNew) {
        return next(new Error("OrganizationCreditEntry is immutable and cannot be modified."));
    }
    next();
});

export default mongoose.models.OrganizationCreditEntry || mongoose.model("OrganizationCreditEntry", organizationCreditEntrySchema);


--- File: OrganizationPending.js ---
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

const organizationPendingSchema = new mongoose.Schema(
    {
        institute_name: {
            type: String,
            required: true,
            trim: true,
        },
        address: {
            type: String,
            required: true,
        },
        logo_url: {
            type: String,
            default: "",
        },
        website: {
            type: String,
            default: "",
        },
        designation: {
            type: String,
            default: "",
        },
        photo_url: {
            type: String,
            default: "",
        },
        owner_name: {
            type: String,
            required: true,
        },
        owner_email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
        },
        // Legacy status field — kept for backward compat
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        applicationStatus: {
            type: String,
            enum: ["pending_review", "approved", "rejected"],
            default: "pending_review",
        },
        planRequested: {
            type: String,
            enum: ["PAID"],
            default: "PAID",
        },
        paymentRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentRequest",
            default: null,
        },
        transactionId: {
            type: String,
            default: "",
            trim: true,
        },
        paymentScreenshotUrl: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true, // Adds created_at and updated_at
    }
);

export default mongoose.model("OrganizationPending", organizationPendingSchema);


--- File: OrganizationPriceOverride.js ---
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

const organizationPriceOverrideSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        billingModuleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingModule",
            default: null, // If null, applies to base plan override instead
        },
        monthlyPricePaise: {
            type: Number,
            required: true,
            min: 0,
        },
        annualPricePaise: {
            type: Number,
            required: true,
            min: 0,
        },
        reason: {
            type: String,
            default: "",
        },
        effectiveFrom: {
            type: Date,
            required: true,
        },
        effectiveUntil: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

// One active override per module per organization
organizationPriceOverrideSchema.index({ organizationId: 1, billingModuleId: 1, effectiveFrom: -1 });

export default mongoose.models.OrganizationPriceOverride || mongoose.model("OrganizationPriceOverride", organizationPriceOverrideSchema);


--- File: OrganizationRequest.js ---
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

const orgRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  domain: { type: String, required: true },
  type: { type: String, required: true },
  city: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true });

export default mongoose.models.OrganizationRequest || mongoose.model("OrganizationRequest", orgRequestSchema);


--- File: OrganizationResourceUsage.js ---
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

const organizationResourceUsageSchema = new mongoose.Schema(
    {
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        provider: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        providerLabel: {
            type: String,
            required: true,
            trim: true,
        },
        resourceType: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        metricKey: {
            type: String,
            required: true,
            trim: true,
        },
        metricLabel: {
            type: String,
            required: true,
            trim: true,
        },
        usageAmount: {
            type: Number,
            default: null,
        },
        unit: {
            type: String,
            default: "count",
            trim: true,
        },
        costAmount: {
            type: Number,
            default: null,
        },
        currency: {
            type: String,
            default: "INR",
            trim: true,
            uppercase: true,
        },
        quality: {
            type: String,
            enum: ["actual", "partial", "estimated", "manual", "unavailable"],
            default: "actual",
        },
        source: {
            type: String,
            required: true,
            trim: true,
        },
        periodStart: {
            type: Date,
            default: null,
            index: true,
        },
        periodEnd: {
            type: Date,
            default: null,
        },
        lastSyncedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

organizationResourceUsageSchema.index({ orgId: 1, provider: 1, metricKey: 1, periodStart: 1 });

export default mongoose.models.OrganizationResourceUsage ||
    mongoose.model("OrganizationResourceUsage", organizationResourceUsageSchema);


--- File: OrganizationSubscription.js ---
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

const organizationSubscriptionSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            unique: true,
        },
        billingPlanId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingPlan",
            required: true,
        },
        billingPlanVersionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingPlanVersion",
            required: true,
        },
        billingCycle: {
            type: String,
            enum: ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL"],
            default: "MONTHLY",
        },
        status: {
            type: String,
            enum: ["TRIAL", "ACTIVE", "PAUSED", "SUSPENDED", "CANCELLED"],
            default: "ACTIVE",
        },
        currentPeriodStart: {
            type: Date,
            required: true,
        },
        currentPeriodEnd: {
            type: Date,
            required: true,
        },
        trialEndsAt: {
            type: Date,
            default: null,
        },
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
        providerSubscriptionId: { // Razorpay Sub ID
            type: String,
            default: null,
        },
        providerCustomerId: { // Razorpay Customer ID
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.OrganizationSubscription || mongoose.model("OrganizationSubscription", organizationSubscriptionSchema);


--- File: OrganizationSubscriptionItem.js ---
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

const organizationSubscriptionItemSchema = new mongoose.Schema(
    {
        organizationSubscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganizationSubscription",
            required: true,
        },
        billingModuleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingModule",
            required: true,
        },
        billingModuleVersionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingModuleVersion",
            required: true,
        },
        quantity: { // Used for PER_USER or PER_CAMPUS if static. Usually 1 for standard usage tracking.
            type: Number,
            default: 1,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "PAUSED", "CANCELLED"],
            default: "ACTIVE",
        },
        effectiveFrom: {
            type: Date,
            required: true,
        },
        effectiveUntil: {
            type: Date,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

organizationSubscriptionItemSchema.index({ organizationSubscriptionId: 1, billingModuleId: 1 }, { unique: true });

export default mongoose.models.OrganizationSubscriptionItem || mongoose.model("OrganizationSubscriptionItem", organizationSubscriptionItemSchema);


--- File: OrganizationUsage.js ---
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

const organizationUsageSchema = new mongoose.Schema(
    {
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            unique: true,
        },
        totalStudents: {
            type: Number,
            default: 0,
        },
        totalTeachers: {
            type: Number,
            default: 0,
        },
        totalAdmins: {
            type: Number,
            default: 0,
        },
        storageUsedGB: {
            type: Number,
            default: 0,
        },
        emailsSent: {
            type: Number,
            default: 0,
        },
        activeUsers: {
            type: Number,
            default: 0,
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.OrganizationUsage || mongoose.model("OrganizationUsage", organizationUsageSchema);


--- File: OrganizationUsageDaily.js ---
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

const usageLineItemSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            enum: ["cloudflare_r2", "supabase_storage", "aws_ses", "firebase_sms", "mongodb", "redis", "vercel", "ec2", "openai", "groq", "agora"],
            required: true,
            index: true,
        },
        resourceKey: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        resourceLabel: {
            type: String,
            required: true,
            trim: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
        },
        unit: {
            type: String,
            enum: ["gb_day", "email", "sms", "request", "token", "student", "minute", "byte", "count"],
            required: true,
        },
        unitRateInr: {
            type: Number,
            default: 0,
            min: 0,
        },
        amountInr: {
            type: Number,
            default: 0,
            min: 0,
        },
        rawQuantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        rawUnit: {
            type: String,
            default: "",
            trim: true,
        },
        source: {
            type: String,
            required: true,
            trim: true,
        },
        sourceQuality: {
            type: String,
            enum: ["actual", "partial", "estimated", "unavailable"],
            default: "actual",
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { _id: false }
);

const organizationUsageDailySchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        orgSubscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrgSubscription",
            default: null,
        },
        day: {
            type: Date,
            required: true,
            index: true,
        },
        periodStart: {
            type: Date,
            required: true,
        },
        periodEnd: {
            type: Date,
            required: true,
        },
        timezone: {
            type: String,
            default: "Asia/Kolkata",
            trim: true,
        },
        currency: {
            type: String,
            default: "INR",
            uppercase: true,
            trim: true,
        },
        lineItems: {
            type: [usageLineItemSchema],
            default: [],
            validate: {
                validator(items) {
                    return items.length > 0;
                },
                message: "OrganizationUsageDaily requires at least one usage line item.",
            },
        },
        totals: {
            storageGbDays: { type: Number, default: 0, min: 0 },
            emails: { type: Number, default: 0, min: 0 },
            sms: { type: Number, default: 0, min: 0 },
            amountInr: { type: Number, default: 0, min: 0 },
        },
        rateSnapshot: {
            pricePerGB: { type: Number, default: 0, min: 0 },
            pricePerEmail: { type: Number, default: 0, min: 0 },
            pricePerSms: { type: Number, default: 0, min: 0 },
        },
        calculationStatus: {
            type: String,
            enum: ["complete", "partial", "failed"],
            default: "complete",
            index: true,
        },
        calculationErrors: {
            type: [String],
            default: [],
        },
        calculationHash: {
            type: String,
            required: true,
            index: true,
        },
        calculatedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true }
);

organizationUsageDailySchema.index({ organizationId: 1, day: 1 }, { unique: true });
organizationUsageDailySchema.index({ day: -1, calculationStatus: 1 });

function immutableLedgerError() {
    return new Error("OrganizationUsageDaily is an immutable billing ledger. Insert correction records in a future ledger model instead of updating or deleting this record.");
}

organizationUsageDailySchema.pre(["updateOne", "updateMany", "findOneAndUpdate", "replaceOne"], function blockUpdates(next) {
    next(immutableLedgerError());
});

organizationUsageDailySchema.pre(["deleteOne", "deleteMany", "findOneAndDelete"], function blockDeletes(next) {
    next(immutableLedgerError());
});

export default mongoose.models.OrganizationUsageDaily ||
    mongoose.model("OrganizationUsageDaily", organizationUsageDailySchema);


--- File: OrgDropdownOverride.js ---
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

const orgDropdownOverrideSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    masterOption: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DropdownMaster",
      required: function () {
        return !this.is_custom_addition;
      },
    },
    type: {
      type: String,
      required: true,
      enum: [
        "ORG_TYPE",
        "ROLE_CATEGORY",
        "DEPARTMENT",
        "DESIGNATION",
        "QUALIFICATION",
        "EXP_DOMAIN",
        "RESPONSIBILITY",
        "SPECIALIZATION",
      ],
    },
    is_enabled: {
      type: Boolean,
      default: true,
    },
    custom_name: {
      type: String,
      default: "",
    },
    is_custom_addition: {
      type: Boolean,
      default: false,
    },
    // If it's a custom addition, we need to store dependencies directly here
    organization_types: {
      type: [String],
      default: [],
    },
    role_categories: {
      type: [String],
      default: [],
    },
    department_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DropdownMaster",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("OrgDropdownOverride", orgDropdownOverrideSchema);


--- File: OrgSubject.js ---
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

const orgSubjectSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },

        // Optional: link subject to a specific classroom/class
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            default: null,
        },

        subjectName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        maxMarks: {
            type: Number,
            required: true,
            min: 1,
            default: 20,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Unique subject name per org (same subject can't be added twice in one org)
orgSubjectSchema.index(
    { organization_id: 1, subjectName: 1 },
    { unique: true, collation: { locale: "en", strength: 2 } }
);

// Fast lookup by org
orgSubjectSchema.index({ organization_id: 1, isActive: 1 });

export default mongoose.model("OrgSubject", orgSubjectSchema);


--- File: OrgSubscription.js ---
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

import mongoose from 'mongoose';

const orgSubscriptionSchema = new mongoose.Schema({
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['sandbox', 'demo', 'active'], // 🛑 Strict Single-Plan Enterprise Model
    default: 'demo'
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'grace_period'],
    default: 'active'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 31 * 24 * 60 * 60 * 1000) // Default 31 days demo
  },
  razorpay_subscription_id: {
    type: String,
    default: null
  },
  razorpay_customer_id: {
    type: String,
    default: null
  },
  features: {
    attendance: { type: Boolean, default: true },
    examinations: { type: Boolean, default: true },
    admissions: { type: Boolean, default: true }, 
    canteen: { type: Boolean, default: true },     
    ai_viva: { type: Boolean, default: true },     
    naac_auditor: { type: Boolean, default: true } 
  },
  metadata: {
    demo_review_reminder_sent_at: { type: Date, default: null },
    demo_ending_soon_sent_at: { type: Date, default: null },
    demo_final_reminder_sent_at: { type: Date, default: null },
    demo_payment_required_sent_at: { type: Date, default: null }
  },

  // ── Billing Rates (set by Super Admin per org) ─────────────────────
  // All values are in INR. Leave at 0 until Super Admin configures them.
  billing: {
    basePricePerMonth:   { type: Number, default: 0 },   // Optional fixed monthly platform fee
    pricePerGB:          { type: Number, default: 0 },   // ₹ per GB-month; daily ledger stores GB-days
    pricePerEmail:       { type: Number, default: 0 },   // ₹ per sent email
    pricePerSms:         { type: Number, default: 0 },   // ₹ per sent SMS segment
    pricePerApiRequest:  { type: Number, default: 0 },   // ₹ per API request (EC2/Vercel)
    pricePerAiToken:     { type: Number, default: 0 },   // ₹ per AI token (OpenAI/Groq/Gemini)
    pricePerAgoraMinute: { type: Number, default: 0 },   // ₹ per Agora video participant-minute
    modulePrices:        { type: Map, of: Number, default: {} }, // Custom monthly price per module (INR)
  }

}, { timestamps: true });

// Index for expiry worker
orgSubscriptionSchema.index({ expiresAt: 1, status: 1 });

const OrgSubscription = mongoose.model('OrgSubscription', orgSubscriptionSchema);

export default OrgSubscription;


--- File: OrgWebsiteContent.js ---
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

const { Schema } = mongoose;

// ─── Sub-schemas ────────────────────────────────────────────────────────────

const ThemeSchema = new Schema({
  primary:     { type: String, default: "#1e3a8a" }, // College picks this
  primaryDark: { type: String, default: "#1e3085" }, // Auto-derived (20% darker)
  accent:      { type: String, default: "#ffffff" },
}, { _id: false });

const PageContentSchema = new Schema({
  html:      { type: String, default: "" },
  status:    { type: String, enum: ["draft", "published"], default: "draft" },
  updatedAt: { type: Date },
}, { _id: false });
const StatSchema = new Schema({
  icon:  { type: String }, // Lucide icon name: GraduationCap, Trophy, etc.
  value: { type: String }, // "5000+" or "96%"
  label: { type: String }, // "Students Enrolled"
}, { _id: false });

const HeroSchema = new Schema({
  badge:         { type: String, default: "Admissions Open" },
  headline:      { type: String },
  subHeadline:   { type: String },
  description:   { type: String },
  videoUrl:      { type: String, default: "" },    // Supabase short campus loop video (max 20MB)
  fallbackImage: { type: String, default: "" },    // Shown on mobile instead of video
  stats:         [StatSchema],
}, { _id: false });

const NoticeSchema = new Schema({
  id:       { type: String },
  category: { type: String, enum: ["Exam", "Admission", "Holiday", "General", "Event"], default: "General" },
  title:    { type: String, required: true },
  date:     { type: String },                      // ISO date string "2026-05-18"
  summary:  { type: String },
  body:     { type: String },                      // Full Rich Text
  pdfUrl:   { type: String, default: "" },         // Supabase PDF URL
  isPublic: { type: Boolean, default: true },
});

const ProgramSchema = new Schema({
  id:          { type: String },
  icon:        { type: String },
  group:       { type: String },
  name:        { type: String, required: true },
  duration:    { type: String },
  description: { type: String },
  subjects:    [{ type: String }],
  intake:      { type: String },
  eligibility: { type: String },
  schedule:    { type: String },
});

const AdmissionDateSchema = new Schema({
  label: { type: String },
  date:  { type: String },
}, { _id: false });

const AdmissionBannerSchema = new Schema({
  title:          { type: String, default: "Admissions Open" },
  description:    { type: String },
  importantDates: [AdmissionDateSchema],
  ctaLabel:       { type: String, default: "Apply Now" },
}, { _id: false });

const FacultySchema = new Schema({
  id:          { type: String },
  name:        { type: String, required: true },
  designation: { type: String },
  department:  { type: String },
  subject:     { type: String },
  image:       { type: String, default: "" },       // Supabase URL
  isPublic:    { type: Boolean, default: true },
});

const GalleryImageSchema = new Schema({
  id:       { type: String },
  category: { type: String },
  image:    { type: String },                       // Supabase URL
  title:    { type: String },
});

const GalleryVideoSchema = new Schema({
  id:         { type: String },
  title:      { type: String },
  youtubeUrl: { type: String },                     // YouTube embed URL ONLY — no Supabase video
  thumbnail:  { type: String },
});

const TestimonialSchema = new Schema({
  id:       { type: String },
  name:     { type: String, required: true },
  batch:    { type: String },
  program:  { type: String },
  rating:   { type: Number, default: 5 },
  text:     { type: String },
  image:    { type: String, default: "" },
  facebook: { type: String, default: "" },
  linkedin: { type: String, default: "" },
});

const TopperSchema = new Schema({
  id:      { type: String },
  name:    { type: String },
  score:   { type: String },
  program: { type: String },
  batch:   { type: String },
  image:   { type: String, default: "" },
});

const MeritListSchema = new Schema({
  id:      { type: String },
  title:   { type: String },
  program: { type: String },
  round:   { type: String },
  date:    { type: String },
  pdfUrl:  { type: String, default: "" },           // Supabase PDF URL
});

const FeeRowSchema = new Schema({
  id:          { type: String },
  program:     { type: String },
  intake:      { type: String },
  annualFees:  { type: String },
  oneTimeFees: { type: String },
  total:       { type: String },
  installments:[{ type: String }],
});

const EventScheduleSchema = new Schema({
  time:  { type: String },
  title: { type: String },
}, { _id: false });

const EventSchema = new Schema({
  slug:          { type: String, required: true },
  title:         { type: String, required: true },
  category:      { type: String },
  status:        { type: String, enum: ["Upcoming", "Past", "Ongoing"], default: "Upcoming" },
  date:          { type: String },
  time:          { type: String },
  venue:         { type: String },
  image:         { type: String, default: "" },
  summary:       { type: String },
  description:   { type: String },
  registerLabel: { type: String, default: "Register Now" },
  schedule:      [EventScheduleSchema],
  gallery:       [{ type: String }],               // Supabase image URLs
  isPublic:      { type: Boolean, default: true },
});

const AlumniSchema = new Schema({
  id:          { type: String },
  name:        { type: String, required: true },
  batchYear:   { type: String },
  program:     { type: String },
  currentOrg:  { type: String },
  city:        { type: String },
  achievement: { type: String },
  quote:       { type: String },
  linkedin:    { type: String, default: "" },
  image:       { type: String, default: "" },
});

const BlogPostSchema = new Schema({
  slug:       { type: String, required: true },
  category:   { type: String },
  title:      { type: String, required: true },
  excerpt:    { type: String },
  image:      { type: String, default: "" },
  author:     { type: String },
  authorRole: { type: String },
  date:       { type: String },
  content:    [{ type: String }],                  // Array of paragraphs
  isPublic:   { type: Boolean, default: true },
});

const ContactPageSchema = new Schema({
  officeHours: { type: String, default: "Monday to Saturday: 9:00 AM - 5:00 PM" },
  mapEmbedUrl: { type: String, default: "" },
}, { _id: false });

const SocialLinkSchema = new Schema({
  label:    { type: String },
  href:     { type: String, default: "#" },
  platform: { type: String, enum: ["facebook", "instagram", "linkedin", "youtube", "whatsapp"] },
}, { _id: false });

const PrincipalSchema = new Schema({
  name:        { type: String },
  designation: { type: String, default: "Principal" },
  message:     { type: String },
  image:       { type: String, default: "" },
}, { _id: false });

// ─── NEW: Governance & Disclosures ───────────────────────────────────────────

const CommitteeMemberSchema = new Schema({
  role:  { type: String },
  name:  { type: String, required: true },
  phone: { type: String },
  email: { type: String },
}, { _id: false });

const CommitteeSchema = new Schema({
  id:          { type: String },
  name:        { type: String, required: true },
  description: { type: String },
  members:     [CommitteeMemberSchema],
});

const FacilitySchema = new Schema({
  id:          { type: String },
  category:    { type: String, enum: ["Classrooms", "Labs", "Library", "Sports", "Hostel", "Transport", "Safety", "Other"], default: "Other" },
  name:        { type: String, required: true },
  description: { type: String },
  images:      [{ type: String }], // Supabase URLs
});

// ─── NEW: Academics & Students ───────────────────────────────────────────────

const AcademicCalendarEventSchema = new Schema({
  date:        { type: String }, // ISO string
  description: { type: String },
}, { _id: false });

const AcademicCalendarTermSchema = new Schema({
  term:   { type: String },
  events: [AcademicCalendarEventSchema],
}, { _id: false });

const SyllabusSchema = new Schema({
  id:          { type: String },
  group:       { type: String }, // Class / Stream / Batch
  subject:     { type: String, required: true },
  description: { type: String },
  pdfUrl:      { type: String },
});

const DownloadSchema = new Schema({
  id:       { type: String },
  title:    { type: String, required: true },
  category: { type: String, enum: ["Admission", "Syllabus", "Exam", "Circular", "Other"], default: "Other" },
  date:     { type: String },
  url:      { type: String, required: true },
});

// ─── NEW: Org-Specific Details ───────────────────────────────────────────────

const CutoffSchema = new Schema({
  year:   { type: String },
  stream: { type: String },
  cutoff: { type: String },
}, { _id: false });

const SeoMetaSchema = new Schema({
  defaultTitle:       { type: String },
  defaultDescription: { type: String },
  googleAnalyticsId:  { type: String },
}, { _id: false });

// ─── Main Schema ─────────────────────────────────────────────────────────────

const OrgWebsiteContentSchema = new Schema({
  // Links to Organization
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    unique: true,                                   // One website per org
  },
  org_slug: {
    type: String,
    required: true,
    unique: true,                                   // e.g. "riverview-jc" → riverview-jc.classgrid.in
    lowercase: true,
    trim: true,
  },

  // ── Theme ────────────────────────────────────────────────────────────────
  theme: { type: ThemeSchema, default: () => ({}) },

  // Rich page content edited from the ERP Website CMS.
  pages: {
    home:       { type: PageContentSchema, default: () => ({}) },
    about:      { type: PageContentSchema, default: () => ({}) },
    admissions: { type: PageContentSchema, default: () => ({}) },
    facilities: { type: PageContentSchema, default: () => ({}) },
    contact:    { type: PageContentSchema, default: () => ({}) },
  },

  // ── Institution Info ─────────────────────────────────────────────────────
  institution: {
    name:            { type: String, required: true },
    shortName:       { type: String },
    type:            { type: String, enum: ["school", "junior-college", "coaching"], required: true },
    tagline:         { type: String },
    location:        { type: String },
    address:         { type: String },
    email:           { type: String },
    phone:           { type: String },
    whatsapp:        { type: String },
    establishedYear: { type: Number },
    logoUrl:         { type: String, default: "" }, // Supabase URL for college logo
    logoText:        { type: String },              // Fallback: text abbreviation (e.g. "RJC")
    heroImage:       { type: String, default: "" }, // Fallback image for hero (mobile)
  },

  // ── Hero Section ─────────────────────────────────────────────────────────
  hero: { type: HeroSchema, default: () => ({}) },

  // ── Accreditations (About page) ──────────────────────────────────────────
  accreditations: [{ type: String }],              // ["NAAC A+", "AICTE", "ISO"]

  // ── Principal ────────────────────────────────────────────────────────────
  principal: { type: PrincipalSchema, default: () => ({}) },

  // ── Story (About page) ───────────────────────────────────────────────────
  story:       { type: String, default: "" },
  storyImage:  { type: String, default: "" },
  vision:      { type: String, default: "" },
  mission:     { type: String, default: "" },

  // ── Admission Banner ─────────────────────────────────────────────────────
  admissionBanner: { type: AdmissionBannerSchema, default: () => ({}) },

  // ── Programs ─────────────────────────────────────────────────────────────
  programs: [ProgramSchema],

  // ── Notices ──────────────────────────────────────────────────────────────
  notices: [NoticeSchema],

  // ── Faculty ──────────────────────────────────────────────────────────────
  faculty: [FacultySchema],

  // ── Gallery ──────────────────────────────────────────────────────────────
  gallery: {
    images: [GalleryImageSchema],
    videos: [GalleryVideoSchema],                   // YouTube only
  },

  // ── Testimonials ─────────────────────────────────────────────────────────
  testimonials: [TestimonialSchema],

  // ── Merit List ───────────────────────────────────────────────────────────
  toppers:     [TopperSchema],
  meritLists:  [MeritListSchema],
  resultStats: [{
    label: { type: String },
    value: { type: String },
  }],

  // ── Fees ─────────────────────────────────────────────────────────────────
  fees:             [FeeRowSchema],
  scholarshipText:  { type: String, default: "" },
  feesPolicies:     [{ id: String, title: String, text: String }],

  // ── Events ───────────────────────────────────────────────────────────────
  events: [EventSchema],

  // ── Alumni ───────────────────────────────────────────────────────────────
  alumni: [AlumniSchema],

  // ── Blog ─────────────────────────────────────────────────────────────────
  blogPosts: [BlogPostSchema],

  // ── Contact Page ─────────────────────────────────────────────────────────
  contactPage: { type: ContactPageSchema, default: () => ({}) },

  // ── Social Links ─────────────────────────────────────────────────────────
  socialLinks: [SocialLinkSchema],

  // ── Governance & Infrastructure (NEW) ────────────────────────────────────
  mandatoryDisclosures: {
    trustName: { type: String },
    affiliationDetails: { type: String },
    pdfs: [{ title: String, url: String }],
  },
  committees: [CommitteeSchema],
  infrastructure: [FacilitySchema],

  // ── Academics (NEW) ──────────────────────────────────────────────────────
  academicCalendar: {
    text: { type: String },
    pdfUrl: { type: String },
    terms: [AcademicCalendarTermSchema],
  },
  syllabus: [SyllabusSchema],
  examinationDetails: {
    text: { type: String },
    pdfUrl: { type: String },
  },

  // ── Student Corner (NEW) ─────────────────────────────────────────────────
  downloads: [DownloadSchema],

  // ── Org-Type Specific Details (NEW) ──────────────────────────────────────
  schoolDetails: {
    timings:      { type: String },
    transport:    { type: String },
    rules:        { type: String },
    safetyPolicy: { type: String },
  },
  juniorCollegeDetails: {
    capInfo: { type: String },
    cutoffs: [CutoffSchema],
  },
  coachingDetails: {
    resultHighlights: { type: String },
    batchTimings:     { type: String },
    refundPolicy:     { type: String },
    refundPolicyPdf:  { type: String },
  },

  // ── Platform-Level (NEW) ─────────────────────────────────────────────────
  seoMeta: { type: SeoMetaSchema, default: () => ({}) },

  // ── Website Status ───────────────────────────────────────────────────────
  isPublished: { type: Boolean, default: false },  // Toggle to go live
  lastEditedBy: { type: Schema.Types.ObjectId, ref: "User" },

}, {
  timestamps: true,
  collection: "org_website_contents",
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
OrgWebsiteContentSchema.index({ isPublished: 1 });

export default mongoose.model("OrgWebsiteContent", OrgWebsiteContentSchema);


--- File: PastPaper.js ---
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

/**
 * PastPaper — Stores extracted question papers with year/subject metadata.
 * Used by the AI Past Paper Analysis Engine for multi-year pattern detection.
 * 
 * Flow: Image Upload → Gemini Vision OCR → Questions extracted → Stored here
 *       → Analysis engine queries across years → Repeated questions, topic frequency
 */
const pastPaperSchema = new mongoose.Schema(
    {
        // Which classroom/org this paper belongs to
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Paper metadata
        title: { type: String, required: true, trim: true },
        subject: { type: String, required: true, trim: true, lowercase: true },
        examType: {
            type: String,
            enum: ["unit_test", "midterm", "final", "practical", "board", "university", "competitive", "other"],
            default: "university",
        },
        year: { type: Number, required: true },   // e.g. 2024, 2023, 2022
        month: { type: String, default: "" },       // e.g. "May", "December"
        semester: { type: Number, default: null },
        branch: { type: String, default: "" },
        university: { type: String, default: "" },  // e.g. "SPPU", "Mumbai University"

        // Extracted questions from Gemini Vision OCR
        questions: [{
            questionText: { type: String, required: true },
            // Normalized version for similarity matching (lowercase, no whitespace)
            normalizedText: { type: String, default: "" },
            options: [String],
            correctAnswer: { type: String, default: "" },
            marks: { type: Number, default: 0 },
            topic: { type: String, default: "" },         // AI-detected topic
            difficulty: { type: String, enum: ["easy", "medium", "hard", "unknown"], default: "unknown" },
            questionType: { type: String, enum: ["mcq", "short", "long", "numerical", "diagram", "other"], default: "other" },
        }],

        totalQuestions: { type: Number, default: 0 },
        totalMarks: { type: Number, default: 0 },

        // Source file info
        sourceFile: {
            originalName: { type: String, default: "" },
            fileUrl: { type: String, default: "" },       // Supabase storage URL
            mimeType: { type: String, default: "" },
        },

        // Processing status
        status: {
            type: String,
            enum: ["processing", "extracted", "analyzed", "failed"],
            default: "processing",
        },

        // AI-generated analysis (cached)
        analysis: {
            topTopics: [{ topic: String, count: Number, percentage: Number }],
            difficultyDistribution: {
                easy: { type: Number, default: 0 },
                medium: { type: Number, default: 0 },
                hard: { type: Number, default: 0 },
            },
            questionTypeDistribution: {
                mcq: { type: Number, default: 0 },
                short: { type: Number, default: 0 },
                long: { type: Number, default: 0 },
                numerical: { type: Number, default: 0 },
            },
        },
    },
    { timestamps: true }
);

// Fast lookups by classroom + subject + year (multi-year analysis)
pastPaperSchema.index({ classroom: 1, subject: 1, year: -1 });
pastPaperSchema.index({ organization_id: 1, subject: 1, year: -1 });
// Text index for question similarity search
pastPaperSchema.index({ "questions.normalizedText": 1 });

export default mongoose.model("PastPaper", pastPaperSchema);


--- File: PaymentAttempt.js ---
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
import { PAYMENT_ATTEMPT_STAGE } from "../utils/billing.utils.js";

const paymentAttemptSchema = new mongoose.Schema(
    {
        paymentOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentOrder",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        stage: {
            type: String,
            enum: Object.values(PAYMENT_ATTEMPT_STAGE),
            default: PAYMENT_ATTEMPT_STAGE.TOKEN_CREATED,
        },
        providerPaymentId: { // Razorpay payment_id (can be null if attempt failed before getting one)
            type: String,
        },
        method: { // e.g. "UPI", "CARD", "NET_BANKING", "WALLET"
            type: String,
            default: null,
        },
        amountPaise: {
            type: Number,
            required: true,
        },
        ipAddress: {
            type: String,
            default: null,
        },
        userAgent: {
            type: String,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // The user attempting the payment
        }
    },
    {
        timestamps: true,
    }
);

paymentAttemptSchema.index({ paymentOrderId: 1 });
paymentAttemptSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

export default mongoose.models.PaymentAttempt || mongoose.model("PaymentAttempt", paymentAttemptSchema);


--- File: PaymentCounter.js ---
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

/**
 * PaymentCounter
 * 
 * A simple atomic counter stored in MongoDB.
 * Used to track how many real payments have been processed —
 * so we know when we've hit 500 transactions for the ML training dataset.
 * 
 * Each counter has a unique `key` (e.g. "demo_training_count").
 * We use findOneAndUpdate with $inc for atomic increments — no race conditions.
 */
const PaymentCounterSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        count: {
            type: Number,
            default: 0,
        },
        target: {
            type: Number,
            default: 500, // Target: 500 transactions for ML training
        },
        lastUpdatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const PaymentCounter = mongoose.model("PaymentCounter", PaymentCounterSchema);
export default PaymentCounter;


--- File: PaymentFailure.js ---
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
import { PAYMENT_ATTEMPT_STAGE } from "../utils/billing.utils.js";

const paymentFailureSchema = new mongoose.Schema(
    {
        paymentAttemptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentAttempt",
            required: true,
        },
        paymentOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentOrder",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        failureStage: {
            type: String,
            enum: Object.values(PAYMENT_ATTEMPT_STAGE),
            required: true,
        },
        errorCode: { // Gateway error code, e.g. BAD_REQUEST_ERROR
            type: String,
            default: null,
        },
        errorDescription: { // Human readable failure reason
            type: String,
            default: null,
        },
        errorSource: { // e.g. "customer", "issuer", "gateway"
            type: String,
            default: null,
        },
        errorStep: { // e.g. "payment_authentication"
            type: String,
            default: null,
        },
        errorReason: { // e.g. "invalid_otp"
            type: String,
            default: null,
        },
        responsibility: {
            type: String,
            enum: ["USER_ACTION_REQUIRED", "CLASSGRID_ERROR", "INSTITUTION_CONFIGURATION_ERROR", "RAZORPAY_ERROR", "BANK_DECLINE", "NETWORK_ERROR", "EXPIRED_SESSION", "UNKNOWN"],
            default: "UNKNOWN",
        },
        retryEligibility: {
            type: Boolean, // Can we generate a fresh link?
            default: true,
        },
        userNotified: {
            type: Boolean,
            default: false,
        },
        resolved: {
            type: Boolean,
            default: false,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Support or Engineering owner
            default: null,
        },
        internalNotes: [{
            authorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            text: {
                type: String,
                required: true,
                trim: true,
                maxlength: 2000,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }],
        recoveryAttempts: [{
            action: {
                type: String,
                required: true,
                trim: true,
                maxlength: 100,
            },
            status: {
                type: String,
                enum: ["QUEUED", "SUCCESS", "FAILED", "REQUIRES_RECONCILIATION"],
                required: true,
            },
            note: {
                type: String,
                trim: true,
                maxlength: 1000,
                default: "",
            },
            actorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        }],
        organizationNotifiedAt: {
            type: Date,
            default: null,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
        resolution: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

paymentFailureSchema.index({ failureStage: 1, createdAt: 1 });
paymentFailureSchema.index({ resolved: 1 });

export default mongoose.models.PaymentFailure || mongoose.model("PaymentFailure", paymentFailureSchema);


--- File: PaymentOrder.js ---
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
import { PAYMENT_FLOW, MERCHANT_TYPE } from "../utils/billing.utils.js";

const paymentOrderSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        invoiceId: { // Only present for Classgrid SaaS payments
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            default: null,
        },
        referenceId: { // Can be an invoiceId, feeRecordId, or other generic entity
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        paymentFlow: {
            type: String,
            enum: Object.values(PAYMENT_FLOW),
            required: true,
        },
        merchantType: {
            type: String,
            enum: Object.values(MERCHANT_TYPE),
            required: true,
        },
        merchantOrganizationId: { // The org that actually receives the money (Classgrid or the Institution)
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
        },
        amountPaise: {
            type: Number,
            required: true,
            min: 1,
        },
        currency: {
            type: String,
            default: "INR",
        },
        providerOrderId: { // Razorpay order_id
            type: String,
            required: true,
            unique: true,
            sparse: true
        },
        receiptId: { // Our internal receipt id passed to Razorpay
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["CREATED", "ATTEMPTED", "PAID", "EXPIRED", "CANCELLED"],
            default: "CREATED",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // The user attempting the payment
        }
    },
    {
        timestamps: true,
    }
);

paymentOrderSchema.index({ invoiceId: 1 });

export default mongoose.models.PaymentOrder || mongoose.model("PaymentOrder", paymentOrderSchema);


--- File: PaymentRefund.js ---
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

const paymentRefundSchema = new mongoose.Schema(
    {
        paymentTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentTransaction",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        providerRefundId: { // Razorpay refund_id
            type: String,
            required: true,
            unique: true,
        },
        amountPaise: {
            type: Number,
            required: true,
            min: 1,
            validate: { validator: Number.isSafeInteger, message: "{VALUE} is not an integer paise value" },
        },
        currency: {
            type: String,
            default: "INR",
        },
        status: {
            type: String,
            enum: ["PENDING", "PROCESSED", "FAILED"],
            default: "PENDING",
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        speedRequested: { // e.g. "optimum", "normal"
            type: String,
            default: "normal",
        },
        speedProcessed: {
            type: String,
            default: "normal",
        },
        receipt: { // Internal tracking ID
            type: String,
            default: null,
        },
        bankReference: { // ARN/RRN
            type: String,
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        createdBy: { // The admin who initiated the refund
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        }
    },
    {
        timestamps: true,
    }
);
export default mongoose.models.PaymentRefund || mongoose.model("PaymentRefund", paymentRefundSchema);


--- File: PaymentRequest.js ---
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

const paymentRequestSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizationPending",
      default: null,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    planRequested: {
      type: String,
      enum: ["PAID"],
      default: "PAID",
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
    screenshotUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

paymentRequestSchema.index({ applicationId: 1, status: 1 });
paymentRequestSchema.index({ organizationId: 1, status: 1 });

export default mongoose.models.PaymentRequest ||
  mongoose.model("PaymentRequest", paymentRequestSchema);


--- File: PaymentSettlement.js ---
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

const paymentSettlementSchema = new mongoose.Schema(
    {
        providerSettlementId: { // Razorpay settlement_id
            type: String,
            required: true,
            unique: true,
        },
        merchantOrganizationId: { // The org that received the money
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        amountSettledPaise: { // Actual money hitting the bank
            type: Number,
            required: true,
        },
        feesTotalPaise: { // Razorpay fees + platform fees
            type: Number,
            required: true,
        },
        taxTotalPaise: { // Tax on fees
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "INR",
        },
        status: {
            type: String,
            enum: ["CREATED", "PROCESSED", "FAILED"],
            default: "CREATED",
        },
        utr: { // Bank UTR (Unique Transaction Reference)
            type: String,
            default: null,
        },
        settledAt: { // Timestamp from the webhook when it hit the bank
            type: Date,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

paymentSettlementSchema.index({ providerSettlementId: 1 }, { unique: true });
paymentSettlementSchema.index({ status: 1, settledAt: 1 });

export default mongoose.models.PaymentSettlement || mongoose.model("PaymentSettlement", paymentSettlementSchema);


--- File: PaymentTransaction.js ---
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
import { PAYMENT_FLOW, MERCHANT_TYPE } from "../utils/billing.utils.js";

const paymentTransactionSchema = new mongoose.Schema(
    {
        paymentAttemptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentAttempt",
            required: true,
            unique: true, // Only one successful transaction per attempt
        },
        paymentOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentOrder",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        paymentFlow: {
            type: String,
            enum: Object.values(PAYMENT_FLOW),
            required: true,
        },
        merchantType: {
            type: String,
            enum: Object.values(MERCHANT_TYPE),
            required: true,
        },
        merchantOrganizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
        },
        providerPaymentId: { // Razorpay payment_id
            type: String,
            required: true,
            unique: true,
        },
        amountCapturedPaise: {
            type: Number,
            required: true,
            min: 1,
            validate: { validator: Number.isSafeInteger, message: "{VALUE} is not an integer paise value" },
        },
        currency: {
            type: String,
            default: "INR",
        },
        method: { // e.g. "UPI", "CARD", "NET_BANKING", "WALLET"
            type: String,
            required: true,
        },
        feePaise: { // Razorpay processing fee
            type: Number,
            default: 0,
            min: 0,
            validate: { validator: Number.isSafeInteger, message: "{VALUE} is not an integer paise value" },
        },
        taxPaise: { // Tax on Razorpay processing fee
            type: Number,
            default: 0,
            min: 0,
            validate: { validator: Number.isSafeInteger, message: "{VALUE} is not an integer paise value" },
        },
        bankReference: {
            type: String,
            default: null, // RRN, Bank Transaction ID, etc.
        },
        cardInfo: {
            network: String,
            last4: String,
            issuer: String,
        },
        vpa: { // For UPI payments
            type: String,
            default: null,
        },
        international: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED", "FAILED", "DISPUTED"],
            default: "CAPTURED",
        },
        settlementStatus: {
            type: String,
            enum: ["UNSETTLED", "SETTLED", "FAILED"],
            default: "UNSETTLED",
        },
        paymentSettlementId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentSettlement",
            default: null,
        },
        capturedAt: {
            type: Date,
            default: Date.now,
        }
    },
    {
        timestamps: true,
    }
);

paymentTransactionSchema.index({ status: 1, createdAt: 1 });
paymentTransactionSchema.index({ paymentFlow: 1, status: 1, capturedAt: -1 });

export default mongoose.models.PaymentTransaction || mongoose.model("PaymentTransaction", paymentTransactionSchema);


--- File: Plan.js ---
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

const planSchema = new mongoose.Schema(
    {
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        weekStart: {
            type: Date,
            required: true, // Should be the Monday of the week
        },
        lessons: [
            {
                day: {
                    type: String,
                    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                    required: true,
                },
                topic: {
                    type: String,
                    required: true,
                },
                objectives: [String],
                materials: [String],
                homework: {
                    type: String,
                    default: "",
                },
                done: {
                    type: Boolean,
                    default: false,
                }
            }
        ]
    },
    {
        timestamps: true,
    }
);

// One plan per classroom per week
planSchema.index({ classroom: 1, weekStart: 1 }, { unique: true });
planSchema.index({ teacher: 1 });
planSchema.index({ organization_id: 1 });

export default mongoose.model("Plan", planSchema);


--- File: PlanModule.js ---
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

const planModuleSchema = new mongoose.Schema(
    {
        billingPlanVersionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingPlanVersion",
            required: true,
        },
        billingModuleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingModule",
            required: true,
        },
        pricingType: {
            type: String,
            enum: ["FIXED", "PER_USER", "PER_STUDENT", "PER_CAMPUS", "PER_STORAGE_UNIT", "PER_USAGE", "INCLUDED"],
            required: true,
        },
        includedQuantity: {
            type: Number, // Free tier included in the plan before charging
            default: 0,
        },
        monthlyPricePaise: {
            type: Number,
            default: 0,
        },
        annualPricePaise: {
            type: Number,
            default: 0,
        },
        isIncluded: {
            type: Boolean, // Whether it comes by default with the plan
            default: true,
        },
        isOptional: {
            type: Boolean, // Whether the user can opt-out of this module
            default: false,
        },
        effectiveFrom: {
            type: Date,
            required: true,
        },
        effectiveUntil: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

planModuleSchema.index({ billingPlanVersionId: 1, billingModuleId: 1 }, { unique: true });

export default mongoose.models.PlanModule || mongoose.model("PlanModule", planModuleSchema);


--- File: PlatformModule.js ---
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

const platformModuleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Academics", "Assessment", "Management", "Advanced", "Dashboards"],
      required: true,
    },
    applicableOrgTypes: {
      type: [String], // 'school', 'coaching', 'junior_college', 'college'
      required: true,
      default: ["school", "coaching", "junior_college", "college"],
    },
    description: {
      type: String,
      default: "",
    },
    defaultEnabled: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlatformModule", platformModuleSchema);


--- File: PlatformTransaction.js ---
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

/**
 * PlatformTransaction — records every payment event related to platform billing
 * (Org subscriptions paid via Razorpay or manually approved by Super Admin).
 * Separate from per-org FeeTransaction which tracks student fee payments.
 */
const platformTransactionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    organizationName: { type: String, default: "" }, // denormalized for fast reads

    // Who processed this (super_admin user or "system" for automated)
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Payment source
    type: {
      type: String,
      enum: ["razorpay", "manual", "refund", "credit", "adjustment"],
      default: "razorpay",
    },

    // Amount in INR (paise for Razorpay, rupees for manual)
    amount: { type: Number, required: true }, // always stored in rupees
    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ["success", "failed", "refunded", "pending"],
      default: "success",
    },

    // Razorpay specific
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },

    // Plan that was activated by this payment
    planActivated: { type: String, enum: ["demo", "active"], default: "active" },

    // Refund details (if this is a refund transaction)
    refundOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformTransaction",
      default: null,
    },
    refundReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },

    // Human-readable note (set by Super Admin)
    note: { type: String, default: "" },

    // New subscription expiry after this payment
    newExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

platformTransactionSchema.index({ organizationId: 1, createdAt: -1 });
platformTransactionSchema.index({ status: 1, createdAt: -1 });
platformTransactionSchema.index({ razorpayPaymentId: 1 }, { sparse: true });

export default mongoose.models.PlatformTransaction ||
  mongoose.model("PlatformTransaction", platformTransactionSchema);


--- File: PushSubscription.js ---
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

const pushSubscriptionSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    endpoint: {
        type: String,
        required: true,
    },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
    userAgent: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastUsed: {
        type: Date,
        default: Date.now,
    }
});

// Ensure a device can't subscribe multiple times creating duplicates
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

export default mongoose.model("PushSubscription", pushSubscriptionSchema);


--- File: Quiz.js ---
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

const quizSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        noteId: {
            type: String, // Supabase note ID
            required: true,
        },
        noteTitle: {
            type: String,
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // --- Day 17.5: Smart Question Pooling & Randomization ---
        isQuestionBank: {
            type: Boolean,
            default: false
        },
        questionsToAsk: {
            type: Number,
            default: 0 // If 0 or not isQuestionBank, ask all questions.
        },
        // --------------------------------------------------------
        questions: [
            {
                type: {
                    type: String,
                    enum: ["mcq", "short-answer"],
                    required: true,
                },
                question: { type: String, required: true },
                options: [String], // For MCQ only
                correctAnswer: { type: String, required: true },
                explanation: { type: String, required: true },
            },
        ],
        attempts: [
            {
                studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                studentName: String,
                score: Number,
                totalQuestions: Number,
                percentage: Number,
                answers: [String],
                attemptedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model("Quiz", quizSchema);


--- File: QuizSession.js ---
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

const quizSessionSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        subject: { type: String, required: true },
        topic: { type: String, required: true },
        difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
        totalQuestions: { type: Number, required: true },
        questions: [
            {
                type: { type: String, enum: ["mcq", "written"], required: true },
                question: { type: String, required: true },
                options: [String], // MCQ only
                correctAnswer: { type: String, required: true },
                studentAnswer: { type: String, default: "" },
                isCorrect: { type: Boolean, default: false },
                explanation: { type: String, default: "" },
            },
        ],
        score: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        timeTaken: { type: Number, default: 0 }, // seconds
        classroomId: { type: String, default: "" },
        completedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// 🗑️ TTL: auto-delete quiz sessions older than 5 days to keep storage minimal
quizSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5 * 24 * 60 * 60 });

export default mongoose.model("QuizSession", quizSessionSchema);


--- File: ReconciliationMismatch.js ---
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

const reconciliationMismatchSchema = new mongoose.Schema(
    {
        reconciliationRunId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReconciliationRun",
            required: true,
        },
        providerTransactionId: {
            type: String, // e.g. Razorpay payment_id
            required: true,
        },
        internalTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentTransaction",
            default: null, // Null if payment exists in provider but not in our DB
        },
        mismatchType: {
            type: String,
            enum: [
                "MISSING_IN_DB", // Captured in provider, missing in our DB
                "MISSING_IN_PROVIDER", // Recorded as captured in our DB, missing/failed in provider
                "AMOUNT_MISMATCH",
                "STATUS_MISMATCH"
            ],
            required: true,
        },
        providerState: {
            type: mongoose.Schema.Types.Mixed, // The state according to the provider API
            default: null,
        },
        internalState: {
            type: mongoose.Schema.Types.Mixed, // The state according to our DB
            default: null,
        },
        resolved: {
            type: Boolean,
            default: false,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        resolutionNote: {
            type: String,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

reconciliationMismatchSchema.index({ reconciliationRunId: 1 });
reconciliationMismatchSchema.index({ resolved: 1 });

export default mongoose.models.ReconciliationMismatch || mongoose.model("ReconciliationMismatch", reconciliationMismatchSchema);


--- File: ReconciliationRun.js ---
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

const reconciliationRunSchema = new mongoose.Schema(
    {
        runDate: {
            type: Date,
            default: Date.now,
        },
        targetDate: { // The date of transactions being reconciled
            type: Date,
            required: true,
        },
        provider: {
            type: String, // e.g. "RAZORPAY"
            required: true,
        },
        totalTransactionsChecked: {
            type: Number,
            default: 0,
        },
        mismatchesFound: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["IN_PROGRESS", "COMPLETED", "FAILED"],
            default: "IN_PROGRESS",
        },
        errorDetails: {
            type: String,
            default: null,
        },
        runBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Can be null if system cron
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.ReconciliationRun || mongoose.model("ReconciliationRun", reconciliationRunSchema);


--- File: ResultAuditLog.js ---
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

const resultAuditLogSchema = new mongoose.Schema(
    {
        examRecord: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamRecord",
            required: true,
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        details: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

resultAuditLogSchema.index({ examRecord: 1, createdAt: -1 });
resultAuditLogSchema.index({ organization_id: 1 });

export default mongoose.models.ResultAuditLog || mongoose.model("ResultAuditLog", resultAuditLogSchema);


--- File: Review.js ---
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

const reviewSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false // Optional if guest review, but for module we'll set it
    },
    name: {
        type: String,
        required: true
    },
    college: {
        type: String,
        required: true
    },
    helped: {
        type: String,
        required: true,
        maxlength: 500
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    suggestion: {
        type: String,
        maxlength: 500
    },
    category: {
        type: String,
        enum: ["bug", "feature_request", "general"],
        default: "general"
    },
    status: {
        type: String,
        enum: ["new", "reviewed", "archived"],
        default: "new"
    },
    isPublic: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;


--- File: RoleRequest.js ---
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

const roleRequestSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    processed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
    tenant_join_code: {
      type: String,
      default: null, // The code used when requesting, for audit trail
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending requests for the same user, org, and role
roleRequestSchema.index(
  { user_id: 1, organization_id: 1, role: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.models.RoleRequest || mongoose.model("RoleRequest", roleRequestSchema);


--- File: SaasInvoice.js ---
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

/**
 * Classgrid — SaasInvoice Model
 *
 * Monthly invoice generated for each organization based on their
 * actual resource usage (Pay-As-You-Go). The Org Admin pays this
 * via Razorpay from their dashboard.
 *
 * Flow:
 * 1. Nightly worker populates OrganizationUsageDaily
 * 2. On the 1st of each month, monthly-invoice.worker aggregates
 *    the previous month's daily records into one SaasInvoice
 * 3. Email is sent to the Org Admin with the invoice link
 * 4. Org Admin clicks "Pay Now" → Razorpay → webhook marks as paid
 */

import mongoose from "mongoose";

const invoiceLineItemSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            required: true,
        },
        resourceLabel: {
            type: String,
            required: true,
        },
        totalQuantity: {
            type: Number,
            required: true,
            min: 0,
        },
        unit: {
            type: String,
            required: true,
        },
        unitRatePaise: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        amountPaise: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
    },
    { _id: false }
);

const saasInvoiceSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        billingPeriod: {
            month: { type: Number, required: true, min: 1, max: 12 },
            year: { type: Number, required: true },
            startDate: { type: Date, required: true },
            endDate: { type: Date, required: true },
        },
        lineItems: {
            type: [invoiceLineItemSchema],
            default: [],
        },
        subtotalPaise: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        taxPercent: {
            type: Number,
            default: 18, // GST 18%
            min: 0,
        },
        taxAmountPaise: {
            type: Number,
            default: 0,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        totalAmountPaise: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        currency: {
            type: String,
            default: "INR",
            uppercase: true,
        },
        status: {
            type: String,
            enum: ["draft", "sent", "paid", "overdue", "cancelled"],
            default: "draft",
            index: true,
        },
        dueDate: {
            type: Date,
            required: true,
            index: true,
        },
        // Razorpay payment tracking
        razorpay: {
            orderId: { type: String, default: null },
            paymentId: { type: String, default: null },
            paymentMethod: { type: String, default: null },
            paidAt: { type: Date, default: null },
        },
        // Email tracking
        emailSentAt: { type: Date, default: null },
        reminderSentAt: { type: Date, default: null },
        // Notes
        notes: { type: String, default: "" },
    },
    { timestamps: true }
);

saasInvoiceSchema.index({ organizationId: 1, "billingPeriod.year": 1, "billingPeriod.month": 1 }, { unique: true });
saasInvoiceSchema.index({ status: 1, dueDate: 1 });

export default mongoose.models.SaasInvoice || mongoose.model("SaasInvoice", saasInvoiceSchema);


--- File: ScheduledNotification.js ---
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

/**
 * ScheduledNotification — Pre-schedule push notifications for festivals, events, maintenance, etc.
 * Super Admin can set these up once, and they fire automatically every year.
 * 
 * Examples:
 *   - "Happy Diwali! 🪔" → fires every year on Diwali date
 *   - "System Maintenance at 2 AM" → fires once on a specific date
 *   - "Happy Independence Day! 🇮🇳" → fires every Aug 15
 */
const scheduledNotificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true,
        trim: true
    },
    // Who receives this?
    target: {
        type: String,
        enum: [
            "global",         // ALL users across ALL organizations
            "all_org_admins",  // Only Org Admins
            "all_super_admins", // Only Super Admins
            "all_students",    // Only Students globally
            "all_faculty",     // Only Faculty globally
            "all_department_admins", // Existing HOD users acting as department admins
            "active_orgs",     // Users attached to active organizations
            "specific_org"     // Only a specific organization
        ],
        default: "global"
    },
    // If target is "specific_org", which org?
    targetOrgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        default: null
    },
    // When should it fire?
    scheduledAt: {
        type: Date,
        required: true,
        index: true
    },
    // Does it repeat every year? (For festivals)
    isRecurring: {
        type: Boolean,
        default: false
    },
    // Category for filtering
    category: {
        type: String,
        enum: ["festival", "maintenance", "announcement", "update", "marketing"],
        default: "announcement"
    },
    // Push notification deep link
    deepLink: {
        type: String,
        default: ""
    },
    // Should we also send email along with push?
    sendEmail: {
        type: Boolean,
        default: false
    },
    // Execution status
    status: {
        type: String,
        enum: ["pending", "processing", "sent", "failed", "cancelled"],
        default: "pending"
    },
    sentAt: {
        type: Date,
        default: null
    },
    sentCount: {
        type: Number,
        default: 0
    },
    // Who created this scheduled notification
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

scheduledNotificationSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.models.ScheduledNotification || 
    mongoose.model("ScheduledNotification", scheduledNotificationSchema);


--- File: SchoolReportCard.js ---
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

const assessmentComponentSchema = new mongoose.Schema(
  {
    component: {
      type: String,
      enum: ["theory", "practical", "oral", "notebook", "project", "activity", "internal", "external", "other"],
      required: true,
    },
    marksObtained: { type: Number, default: null },
    maxMarks: { type: Number, default: null },
    passMarks: { type: Number, default: null },
    grade: { type: String, default: "" },
    remark: { type: String, default: "" },
  },
  { _id: false }
);

const subjectResultSchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "OrgSubject", default: null },
    subjectCode: { type: String, default: "" },
    subjectName: { type: String, required: true, trim: true },
    subjectGroup: {
      type: String,
      enum: ["compulsory", "elective", "optional", "bifocal", "vocational", "co_scholastic", "other"],
      default: "compulsory",
    },
    components: { type: [assessmentComponentSchema], default: [] },
    totalMarks: { type: Number, default: null },
    maxMarks: { type: Number, default: null },
    percentage: { type: Number, default: null },
    grade: { type: String, default: "" },
    isPassed: { type: Boolean, default: null },
    teacherRemark: { type: String, default: "" },
  },
  { _id: false }
);

const termResultSchema = new mongoose.Schema(
  {
    termKey: { type: String, required: true, trim: true },
    termName: { type: String, required: true, trim: true },
    assessmentType: {
      type: String,
      enum: ["unit_test", "term_exam", "annual_exam", "oral", "practical", "prelim", "board_practical", "entrance_mock", "other"],
      default: "term_exam",
    },
    subjects: { type: [subjectResultSchema], default: [] },
    totalMarks: { type: Number, default: null },
    maxMarks: { type: Number, default: null },
    percentage: { type: Number, default: null },
    grade: { type: String, default: "" },
    rank: { type: Number, default: null },
    resultStatus: {
      type: String,
      enum: ["pass", "fail", "promoted", "detained", "needs_improvement", "withheld", "not_applicable"],
      default: "not_applicable",
    },
  },
  { _id: false }
);

const coScholasticSchema = new mongoose.Schema(
  {
    area: { type: String, required: true, trim: true },
    grade: { type: String, default: "" },
    remark: { type: String, default: "" },
  },
  { _id: false }
);

const schoolReportCardSchema = new mongoose.Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      default: null,
      index: true,
    },
    academicYear: { type: String, required: true, trim: true },
    standard: { type: String, required: true, trim: true },
    division: { type: String, default: "" },
    stream: { type: String, default: "" },
    subBatch: { type: String, default: "" },
    reportMode: {
      type: String,
      enum: ["school_term_report", "junior_college_stream_report"],
      required: true,
    },
    snapshot: {
      studentName: { type: String, default: "" },
      prn: { type: String, default: "" },
      rollNo: { type: String, default: "" },
      dob: { type: Date, default: null },
      classTeacherName: { type: String, default: "" },
      organizationName: { type: String, default: "" },
    },
    terms: { type: [termResultSchema], default: [] },
    coScholasticAreas: { type: [coScholasticSchema], default: [] },
    attendance: {
      totalWorkingDays: { type: Number, default: null },
      presentDays: { type: Number, default: null },
      attendancePercentage: { type: Number, default: null },
    },
    finalOutcome: {
      totalMarks: { type: Number, default: null },
      maxMarks: { type: Number, default: null },
      percentage: { type: Number, default: null },
      grade: { type: String, default: "" },
      promotionStatus: {
        type: String,
        enum: ["promoted", "detained", "needs_improvement", "eligible_for_12th", "withheld", "not_applicable"],
        default: "not_applicable",
      },
      classTeacherRemark: { type: String, default: "" },
      principalRemark: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["draft", "verified", "published", "locked"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schoolReportCardSchema.index(
  { organization_id: 1, student: 1, academicYear: 1, standard: 1, reportMode: 1 },
  { unique: true }
);

export default mongoose.models.SchoolReportCard || mongoose.model("SchoolReportCard", schoolReportCardSchema);


--- File: SeatConfig.js ---
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

const seatConfigSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        // Links to AcademicHierarchy (e.g., Branch in Engineering, Standard in School)
        hierarchy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicHierarchy",
            required: true,
        },
        academic_year: { type: String, required: true }, // e.g. "2024-25"
        
        // Dynamic Matrix
        total_intake: { type: Number, required: true },
        
        // Quota breakdown (Plan 1 & 6 specific, but versatile)
        quotas: [
            {
                name: { type: String, required: true }, // e.g. "CAP", "MANAGEMENT", "TFWS", "RTE"
                capacity: { type: Number, required: true },
                filled: { type: Number, default: 0 },
                waitlist_count: { type: Number, default: 0 },
            }
        ],

        is_active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Uniqueness: One config per hierarchy item per year per organization
seatConfigSchema.index({ organization_id: 1, hierarchy_id: 1, academic_year: 1 }, { unique: true });

export default mongoose.models.SeatConfig || mongoose.model("SeatConfig", seatConfigSchema);


--- File: SmsLog.js ---
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

const smsLogSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        phoneHash: {
            type: String,
            default: "",
            trim: true,
        },
        purpose: {
            type: String,
            enum: ["admission_otp", "login_otp", "notification", "fee_reminder", "other"],
            default: "other",
            index: true,
        },
        provider: {
            type: String,
            enum: ["aws_sns", "other"],
            default: "aws_sns",
            index: true,
        },
        providerMessageId: {
            type: String,
            default: "",
            trim: true,
        },
        status: {
            type: String,
            enum: ["queued", "sent", "delivered", "failed"],
            required: true,
            index: true,
        },
        segmentCount: {
            type: Number,
            default: 1,
            min: 1,
        },
        sentAt: {
            type: Date,
            default: null,
            index: true,
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
        failedAt: {
            type: Date,
            default: null,
        },
        error: {
            type: String,
            default: "",
            trim: true,
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

smsLogSchema.index({ organizationId: 1, status: 1, sentAt: -1 });
smsLogSchema.index({ providerMessageId: 1 }, { sparse: true });

export default mongoose.models.SmsLog || mongoose.model("SmsLog", smsLogSchema);


--- File: StudentFeeLedger.js ---
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

import mongoose from 'mongoose';

const installmentSchema = new mongoose.Schema({
    title: String,
    dueDate: {
        type: Date,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'partially_paid', 'paid'],
        default: 'pending'
    }
});

const studentFeeLedgerSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    structureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeStructure'
    },
    installments: [installmentSchema],
    totalPayable: {
        type: Number,
        default: 0
    },
    totalPaid: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    },
    lastPaymentDate: Date,
    nextDueDate: Date
}, { timestamps: true });

// Middleware to calculate balance before saving
studentFeeLedgerSchema.pre('save', function(next) {
    this.totalPaid = this.installments.reduce((acc, inst) => acc + inst.paidAmount, 0);
    this.balance = this.totalPayable - this.totalPaid;
    
    // Find next pending installment
    const nextInst = this.installments
        .filter(inst => inst.status !== 'paid')
        .sort((a, b) => a.dueDate - b.dueDate)[0];
    
    this.nextDueDate = nextInst ? nextInst.dueDate : null;
    next();
});

export default mongoose.model('StudentFeeLedger', studentFeeLedgerSchema);


--- File: StudentMark.js ---
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

const studentMarkSchema = new mongoose.Schema(
    {
        examRecord: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamRecord",
            required: true,
        },

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },

        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },

        // Snapshot of PRN used during matching (for audit trail)
        prn: {
            type: String,
            default: "",
        },

        // Exam seat number is per exam/result, not a global student field
        seatNo: {
            type: String,
            default: "",
            trim: true,
        },

        // Per-subject marks breakdown
        subjectMarks: [{
            subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "OrgSubject", default: null },
            subjectName: { type: String, required: true },
            marksObtained: { type: Number, required: true, min: 0 },
            maxMarks: { type: Number, required: true, min: 1 },
            courseCredit: { type: Number, default: 0, min: 0 },
            creditEarned: { type: Number, default: 0, min: 0 },
            gradePoint: { type: Number, default: null },
            isBacklog: { type: Boolean, default: false },
            passedInReExam: { type: Boolean, default: false },
            ordinance: { type: String, default: "" },
        }],

        // Total marks obtained (sum of all subjectMarks.marksObtained)
        marksObtained: {
            type: Number,
            required: true,
            min: 0,
        },

        // Total max marks (sum of all subjectMarks.maxMarks)
        totalMarks: {
            type: Number,
            required: true,
            min: 1,
        },

        percentage: {
            type: Number,
            default: 0,
        },

        grade: {
            type: String,
            default: "F",
        },

        cgpa: {
            type: Number,
            default: null,
        },

        totalCredits: {
            type: Number,
            default: null,
        },

        totalCreditEarned: {
            type: Number,
            default: null,
        },

        totalCreditIntoGradePoint: {
            type: Number,
            default: null,
        },

        rank: {
            type: Number,
            default: 0,
        },

        isPassed: {
            type: Boolean,
            default: false,
        },

        remarks: {
            type: String,
            default: "",
            maxlength: 500,
        },

        version: {
            type: Number,
            default: 1,
        },

        history: [{
            _id: false,
            updatedAt: { type: Date, default: Date.now },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            subjectMarks: Array,
            marksObtained: Number,
            percentage: Number,
            grade: String,
            cgpa: Number,
            seatNo: String,
            totalCredits: Number,
            totalCreditEarned: Number,
            totalCreditIntoGradePoint: Number,
            isPassed: Boolean
        }],
    },
    {
        timestamps: true,
    }
);

// Unique: one mark per student per exam (prevents duplicates)
studentMarkSchema.index({ examRecord: 1, student: 1 }, { unique: true });

// Fast queries for student dashboard
studentMarkSchema.index({ student: 1, createdAt: -1 });

// Fast queries for classroom analytics
studentMarkSchema.index({ classroom: 1, examRecord: 1 });

// Org isolation
studentMarkSchema.index({ organization_id: 1 });

export default mongoose.model("StudentMark", studentMarkSchema);


--- File: SubscriptionChange.js ---
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
import { SUBSCRIPTION_CHANGE_REASON } from "../utils/billing.utils.js";

const subscriptionChangeSchema = new mongoose.Schema(
    {
        organizationSubscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganizationSubscription",
            required: true,
        },
        reason: {
            type: String,
            enum: Object.values(SUBSCRIPTION_CHANGE_REASON),
            required: true,
        },
        oldStateSnapshot: {
            type: mongoose.Schema.Types.Mixed, // The subscription state before the change
        },
        newStateSnapshot: {
            type: mongoose.Schema.Types.Mixed, // The subscription state after the change
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed, // e.g. which module was added, previous billing cycle, etc
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

subscriptionChangeSchema.index({ organizationSubscriptionId: 1, createdAt: -1 });

export default mongoose.models.SubscriptionChange || mongoose.model("SubscriptionChange", subscriptionChangeSchema);


--- File: SubscriptionSchedule.js ---
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
import { SUBSCRIPTION_CHANGE_REASON } from "../utils/billing.utils.js";

const subscriptionScheduleSchema = new mongoose.Schema(
    {
        organizationSubscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrganizationSubscription",
            required: true,
        },
        executeAt: {
            type: Date,
            required: true,
        },
        actionType: {
            type: String,
            enum: Object.values(SUBSCRIPTION_CHANGE_REASON),
            required: true,
        },
        actionPayload: {
            type: mongoose.Schema.Types.Mixed, // e.g. { newPlanId: "..." }
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "EXECUTED", "CANCELLED", "FAILED"],
            default: "PENDING",
        },
        executionError: {
            type: String,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

subscriptionScheduleSchema.index({ status: 1, executeAt: 1 });
subscriptionScheduleSchema.index({ organizationSubscriptionId: 1, status: 1 });

export default mongoose.models.SubscriptionSchedule || mongoose.model("SubscriptionSchedule", subscriptionScheduleSchema);


--- File: SupportConversation.js ---
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

const supportMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderRole: {
    type: String,
    enum: ["org_admin", "super_admin", "department"],
    required: true,
  },
  department: {
    type: String,
    enum: ["general", "onboarding", "admissions", "fees", "technical", "billing", null],
    default: null,
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const supportConversationSchema = new mongoose.Schema({
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180,
  },
  department: {
    type: String,
    enum: ["general", "onboarding", "admissions", "fees", "technical", "billing"],
    default: "general",
    index: true,
  },
  status: {
    type: String,
    enum: ["open", "in_progress", "resolved", "closed"],
    default: "open",
    index: true,
  },
  priority: {
    type: String,
    enum: ["low", "normal", "high", "urgent"],
    default: "normal",
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  messages: {
    type: [supportMessageSchema],
    default: [],
  },
  unreadForOrgAdmin: {
    type: Number,
    default: 0,
  },
  unreadForSuperAdmin: {
    type: Number,
    default: 0,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: true });

supportConversationSchema.index({ organization_id: 1, lastMessageAt: -1 });
supportConversationSchema.index({ department: 1, status: 1, lastMessageAt: -1 });

const SupportConversation = mongoose.model("SupportConversation", supportConversationSchema);

export default SupportConversation;


--- File: SupportTicket.js ---
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

// Sub-schemas for structured data
const ticketEventSchema = new mongoose.Schema({
    type: { type: String, enum: ['ticketCreated', 'statusChanged', 'priorityChanged', 'categoryChanged', 'assigned', 'unassigned', 'adminReply', 'userReply', 'internalNote', 'attachmentAdded', 'resolved', 'reopened'] },
    label: { type: String },
    from: { type: mongoose.Schema.Types.Mixed },
    to: { type: mongoose.Schema.Types.Mixed },
    actorName: { type: String },
    actorRole: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

/**
 * SupportTicket — In-app support system.
 * Users raise tickets, Super Admin / Support team responds.
 */
const supportTicketSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 10000000 // Increased significantly to support embedded base64 images from rich text editor
    },
    attachments: [{
        type: mongoose.Schema.Types.Mixed // Mixed to support legacy String URLs and new structured attachment objects
    }],
    category: {
        type: String,
        default: "general"
    },
    // Priority for internal tracking
    priority: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium"
    },
    // Ticket lifecycle
    status: {
        type: String,
        enum: ["open", "in_progress", "waiting_on_user", "resolved", "closed", "reopened"],
        default: "open"
    },
    // Who raised the ticket (null for public/marketing submissions)
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
    },
    submitterEmail: {
        type: String,
        trim: true
    },
    submitterName: {
        type: String,
        trim: true
    },
    submitterRole: {
        type: String,
        trim: true,
        default: ""
    },
    // Organization context
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        default: null
    },
    institution: {
        type: String,
        trim: true,
        default: ""
    },
    // Who is handling this ticket (Super Admin / Support Agent)
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    // Conversation thread (back and forth replies)
    messages: [{
        author: { type: String, trim: true },
        role: { type: String, enum: ["user", "admin"], required: true },
        body: { type: String, required: true },
        date: { type: Date, default: Date.now },
        footer: { type: String, default: "" },
        attachments: [{ type: mongoose.Schema.Types.Mixed }], // Mixed to support legacy and new formats
        avatar: { type: String, default: "" },
        orgName: { type: String, default: "" },
        orgLogo: { type: String, default: "" },
        authorRole: { type: String, default: "" }
    }],
    replies: [{
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        authorName: String,
        authorRole: String,
        message: { type: String, required: true },
        attachments: [{ type: mongoose.Schema.Types.Mixed }], // Mixed format
        createdAt: { type: Date, default: Date.now }
    }],
    lastComment: {
        type: Date,
        default: Date.now,
        index: true
    },
    // Resolution
    resolvedAt: {
        type: Date,
        default: null
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    // New Advanced Features
    events: [ticketEventSchema],
    firstResponseDueAt: { type: Date },
    nextResponseDueAt: { type: Date },
    lastAdminReplyAt: { type: Date },
    lastUserReplyAt: { type: Date },
    slaStatus: { type: String, enum: ["ok", "due_soon", "breached"], default: "ok" },
    satisfaction: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        createdAt: { type: Date }
    }
}, { timestamps: true });

supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ submittedBy: 1, createdAt: -1 });

export default mongoose.models.SupportTicket ||
    mongoose.model("SupportTicket", supportTicketSchema);


--- File: SystemLog.js ---
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

const systemLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
            index: true
        },
        level: {
            type: String,
            enum: ["info", "warn", "error"],
            default: "error"
        },
        message: {
            type: String,
            required: true
        },
        stack: {
            type: String,
            default: ""
        },
        context: {
            type: String,
            default: ""
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true,
        capped: { size: 10485760, max: 10000, autoIndexId: true } // 10MB limit, max 10k logs
    }
);

export default mongoose.models.SystemLog || mongoose.model("SystemLog", systemLogSchema);


--- File: SystemSettings.js ---
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

const systemSettingsSchema = new mongoose.Schema({
    maintenanceMode: { type: Boolean, default: false },
    disableRegistrations: { type: Boolean, default: false },
    globalLock: { type: Boolean, default: false },
    aiFeatures: { type: Boolean, default: true },
    notesSystem: { type: Boolean, default: true },
    chatSystem: { type: Boolean, default: true }
}, { timestamps: true });

const SystemSettings = mongoose.model("SystemSettings", systemSettingsSchema);

export default SystemSettings;


--- File: TaxRule.js ---
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

const taxRuleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String, // e.g. "SOFTWARE_SERVICES", "EDUCATION_SERVICES", "HARDWARE"
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["ACTIVE", "ARCHIVED"],
            default: "ACTIVE",
        },
        activeVersionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TaxRuleVersion",
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.TaxRule || mongoose.model("TaxRule", taxRuleSchema);


--- File: TaxRuleVersion.js ---
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

const taxRuleVersionSchema = new mongoose.Schema(
    {
        taxRuleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TaxRule",
            required: true,
        },
        versionNumber: {
            type: Number,
            required: true,
        },
        taxPercentage: {
            type: Number,
            required: true,
            min: 0,
        },
        igstPercentage: {
            type: Number,
            required: true,
            min: 0,
        },
        cgstPercentage: {
            type: Number,
            required: true,
            min: 0,
        },
        sgstPercentage: {
            type: Number,
            required: true,
            min: 0,
        },
        isTaxInclusive: {
            type: Boolean,
            default: false,
        },
        placeOfSupplyLogic: {
            type: String, // e.g. "INTRA_STATE", "INTER_STATE", "INTERNATIONAL"
            default: "INTRA_STATE",
        },
        effectiveFrom: {
            type: Date,
            required: true,
        },
        effectiveUntil: {
            type: Date,
            default: null, // null means it's the current active version
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
);

taxRuleVersionSchema.index({ taxRuleId: 1, versionNumber: 1 }, { unique: true });

export default mongoose.models.TaxRuleVersion || mongoose.model("TaxRuleVersion", taxRuleVersionSchema);


--- File: TeacherPlan.js ---
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

import mongoose from 'mongoose';

const teacherPlanningSchema = new mongoose.Schema(
    {
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        },
        classroomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Classroom',
            required: true,
        },
        weekNumber: {
            type: Number,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        planningType: {
            type: String,
            enum: ['weekly', 'daily'],
            default: 'weekly',
        },
        date: {
            type: Date, // For exact daily plans
        },
        goals: [{
            title: String,
            description: String,
            isCompleted: { type: Boolean, default: false },
            status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' }
        }],
        topicsCovered: [String],
        homeworkAssigned: {
            type: Boolean,
            default: false
        },
        notes: String
    },
    {
        timestamps: true,
    }
);

// Standard indexes for fast dashboard lookups
teacherPlanningSchema.index({ teacher: 1, year: 1, weekNumber: 1 });
teacherPlanningSchema.index({ classroomId: 1, date: 1 });

export default mongoose.model('TeacherPlan', teacherPlanningSchema);


--- File: Timetable.js ---
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

const timetableSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    classroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Classroom",
        required: false // If it's a general or teacher's personal schedule
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false // Personal timetable
    },
    day: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        required: true
    },
    startTime: {
        type: String, // HH:MM
        required: true
    },
    endTime: {
        type: String, // HH:MM
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    room: {
        type: String,
        default: ""
    },
    teacher: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        enum: ["Lecture", "Lab", "Seminar", "Other"],
        default: "Lecture"
    }
}, { timestamps: true });

const Timetable = mongoose.model("Timetable", timetableSchema);
export default Timetable;


--- File: Trajectory.js ---
import mongoose from 'mongoose';

const trajectorySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  projectName: {
    type: String,
    required: true,
  },
  plan: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    status: { type: String, enum: ['pending', 'running', 'done', 'failed'], default: 'pending' },
    error: { type: String },
  }],
  currentIndex: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'aborted', 'failed'],
    default: 'running',
  },
  abortReason: {
    type: String,
  },
  deployedUrl: {
    type: String,
  }
}, { timestamps: true });

export default mongoose.models.Trajectory || mongoose.model('Trajectory', trajectorySchema);


--- File: Transaction.js ---
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

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTION SCHEMA (Phase 8: 4x2 DNA Architecture)
// The immutable receipt of a payment against a specific Invoice.
// ══════════════════════════════════════════════════════════════════════════════

const transactionSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    invoice_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
        required: true
    },
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    payment_method: {
        type: String,
        enum: ["razorpay", "cash", "bank_transfer"],
        required: true
    },
    gateway_order_id: {
        type: String,
        trim: true,
        default: null
    },
    gateway_payment_id: {
        type: String,
        trim: true,
        default: null,
        index: true // Useful for webhook lookups
    },
    status: {
        type: String,
        enum: ["success", "failed", "pending"],
        default: "pending",
        index: true
    }
}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
export default Transaction;


--- File: User.js ---
/*
 * =========================================================================================
 * ðŸš¨ CRITICAL AI & SYSTEM RULE ðŸš¨
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
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ðŸš¨ CRITICAL AI AND SYSTEM RULES ðŸš¨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

/*
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ðŸš¨ NAMING CONVENTION RULE ðŸš¨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

/*
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ðŸš¨ HOSTING & ARCHITECTURE RULE ðŸš¨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

import mongoose from "mongoose";
import { syncUserToBlogSubscribers } from "../services/subscriber-sync.service.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      alias: "fullName",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"],
    },


    alternateEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    sidebar_name: {
      type: String,
      trim: true,
      default: "",
    },

    platformLogo: {
      type: String,
      trim: true,
      default: "",
    },

    // ðŸŽ“ Primary role (determines main dashboard view)
    role: {
      type: String,
      enum: [
        "student", "teacher", "faculty", "org_admin", "super_admin", "co_super_admin",
        "library_manager", "hod", "principal", "vice_principal",
        "exam_controller", "fee_manager", "admission_head",
        "admission_verifier", "admission_counselor", "admission_clerk",
        "tpo_officer", "transport_manager", "counselor", "coordinator"
      ],
      default: "student",
    },

    // ðŸ”€ Additional roles (supports one person = multiple hats)
    // e.g., an HOD who also teaches gets role: "hod", additional_roles: ["faculty"]
    additional_roles: {
      type: [String],
      enum: [
        "student", "teacher", "faculty", "org_admin", "super_admin", "co_super_admin",
        "library_manager", "hod", "principal", "vice_principal",
        "exam_controller", "fee_manager", "admission_head",
        "admission_verifier", "admission_counselor", "admission_clerk",
        "tpo_officer", "transport_manager", "counselor", "coordinator"
      ],
      default: [],
    },

    dob: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say", null],
      default: null,
    },

    fatherName: {
      type: String,
      trim: true,
      default: "",
    },

    motherName: {
      type: String,
      trim: true,
      default: "",
    },

    // University marksheet / eligibility metadata
    eligibilityNo: {
      type: String,
      trim: true,
      default: "",
    },

    pattern: {
      type: String,
      trim: true,
      default: "",
    },

    // ðŸŽ“ Admission & Category (College ERP)
    admission_type: {
      type: String,
      enum: ["CAP", "Management", "Direct", "Lateral", null],
      default: null,
    },

    category: {
      type: String,
      enum: ["Open", "SC", "ST", "OBC", "EWS", "VJ-NT", "SBC", "Other", null],
      default: null,
    },

    // ðŸ›ï¸ Compliance IDs (Mainly for Higher Ed / Engineering)
    abc_id: {
      type: String,
      default: null,
      alias: "abcId",
    },
    
    anti_ragging_undertaking_no: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "active", "suspended", "blocked", "deleted"],
      default: "active",
    },

    // ðŸ›¡ï¸ Security: Forces self-registered users (Honor Code) into a waitlist until admin approves
    verification_status: {
      type: String,
      enum: ["verified", "pending", "rejected"],
      default: "verified", // Default to verified for admin-created users; self-serve will override to pending
    },

    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },

    // ðŸ†” PRN / Roll Number â€” set once by student, immutable, unique per org
    prn: {
      type: String,
      sparse: true,
      trim: true,
      default: null,
      alias: "registrationNumber",
    },

    branch: {
      type: String,
      default: null,
      alias: "program",
    },

    batch: {
      type: String,
      default: null,
      alias: "batchDuration",
    },

    profile_completed: {
      type: Boolean,
      default: false,
    },

    // ðŸ“š Subject assignment (for teachers only)
    subject: {
      type: String,
      enum: ["science", "physics", "cpp", "mathematics", null],
      default: null,
    },

    profilePicture: {
      type: String,
      default: "",
      alias: "photoUrl",
    },

    // ðŸ¢ Super Admin: Platform Logo (stored separately from personal profile picture)
    platformLogo: {
      type: String,
      default: "",
    },

    profileBanner: {
      type: String,
      default: "",
    },

    signature: {
      type: String,
      default: "",
    },

    phoneNumber: {
      type: String,
      default: "",
    },

    // ðŸŽ“ Faculty profile fields
    qualification: {
      type: String,
      default: "",
    },

    department: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
      maxlength: 300,
    },

    address: {
      type: String,
      default: "",
    },

    hobby: {
      type: String,
      default: "",
    },

    // Faculty: comma-separated list of subjects they teach
    subjectsAssigned: {
      type: String,
      default: "",
    },

    // ðŸ¢ HR Module: Biometric Turnstile ID mapping
    biometricId: {
      type: String,
      sparse: true,
      trim: true,
      default: null,
    },

    // ðŸ¢ HR Module: Payroll details
    payroll_config: {
      salary_mode: { type: String, enum: ["hourly", "monthly", "none"], default: "none" },
      hourly_rate: { type: Number, default: 0 },
      base_monthly_salary: { type: Number, default: 0 },
    },

    profileBanner: {
      type: String,
      default: "",
    },

    // ðŸ” hashed password (for manual auth)
    password: {
      type: String, // hashed
      default: null,
      select: false, // Don't return by default
    },

    // â³ password expiry (optional policy)
    passwordExpiresAt: {
      type: Date,
      default: null,
    },

    // ðŸ—“ï¸ Track password changes for JWT invalidation
    passwordChangedAt: {
      type: Date,
    },

    // Password Reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    // Org Admin Activation Token (secure single-use, expires 7h)
    activationToken: { type: String, default: null },
    activationTokenExpires: { type: Date, default: null },
    activationCodeHash: { type: String, default: null },
    activationCodeExpires: { type: Date, default: null },
    activationUsedAt: { type: Date, default: null }, // Single-use: set when token is consumed
    activationAttempts: { type: Number, default: 0 }, // Rate limiting: failed activation attempts
    activationAttemptsExpiresAt: { type: Date, default: null }, // Rate limit window expiry

    // Force password reset on next login (set for admin-created faculty accounts)
    mustResetPassword: {
      type: Boolean,
      default: false,
    },

    // List of all auth providers used by this user
    linkedProviders: {
      type: [String],
      default: ["manual"],
    },

    // Current/Most recent auth provider used for this session
    authProvider: {
      type: String,
      enum: ["manual", "google", "facebook", "github", "linkedin"],
      default: "manual",
    },

    // Social IDs
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    linkedinId: { type: String, unique: true, sparse: true },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastSeen: {
      type: Date,
      default: null,
    },

    // ðŸ”’ Trusted devices â€” suppress login notification emails for known devices
    trustedDevices: [{
      fingerprint: { type: String, required: true }, // SHA-256 hash of userAgent + IP
      browser: { type: String, default: "" },
      os: { type: String, default: "" },
      ipHash: { type: String, default: "" }, // SHA-256 hash of IP
      addedAt: { type: Date, default: Date.now },
    }],

    // ðŸ”‡ Muted Chat Threads
    muted_chat_threads: {
      type: [String],
      default: []
    },

    // â­ Starred Chat Messages
    starred_chat_messages: {
      type: [String],
      default: []
    },

    // ðŸ—‘ï¸ Hidden Chat Messages (Delete for Me)
    hidden_chat_messages: {
      type: [String],
      default: []
    },

    // ðŸ—‘ï¸ Cleared Chat Threads (Thread ID -> Cleared At Timestamp)
    cleared_chat_threads: {
        type: Map,
        of: Date,
        default: {}
    },

    // ðŸ”” In-App notification preferences (Bell icon inbox)
    inAppNotifications: {
      global: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
      classroom: { type: Boolean, default: true },
      meetings: { type: Boolean, default: true },
      settings: { type: Boolean, default: true },
      attendance: { type: Boolean, default: true },
      assignments: { type: Boolean, default: true },
      fees: { type: Boolean, default: true },
    },

    // Legacy push notification preferences
    pushNotifications: {
      global: { type: Boolean, default: true },
      sidebarPanelEnabled: { type: Boolean, default: true }
    },

    fcmTokens: {
      type: [String],
      default: []
    },

    // ðŸ“§ Email notification preferences
    emailNotifications: {
      // Delivery mode: instant (default), daily digest, weekly summary
      digestMode: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'instant' },
      // Reliable digest tracking â€” queries from this date, not fixed 24h window
      lastDigestSentAt: { type: Date, default: null },
      // Global kill switch â€” if false, NO emails are sent
      global: { type: Boolean, default: true },
      // Per-type toggles (students + faculty)
      announcements: { type: Boolean, default: true },
      notes: { type: Boolean, default: true },
      quizzes: { type: Boolean, default: true },
      joinApproval: { type: Boolean, default: true },
      // Faculty-only: whether posting content triggers student emails
      emailOnPost: { type: Boolean, default: true },
      // Attendance report preference
      attendanceReportMode: { type: String, enum: ['daily', 'weekly', 'off'], default: 'off' },
    },

    // ðŸ§ª Demo / Role Sandbox flags
    is_demo: {
      type: Boolean,
      default: false,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ðŸ§ª Sandbox isolation â€” sandbox users cannot affect real data/analytics
    isSandbox: {
      type: Boolean,
      default: false,
    },

    sandboxCreatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Plaintext password for sandbox accounts only (so admin can view it in the dashboard)
    sandboxPassword: {
      type: String,
      default: null,
    },

    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    resetAttempts: {
      type: Number,
      default: 0,
    },
    resetAttemptsExpiresAt: {
      type: Date,
      default: null,
    },

    // --- Integrations ---
    google_access_token: {
      type: String,
      default: null,
    },
    google_refresh_token: {
      type: String,
      default: null,
    },
    google_token_expiry: {
      type: Date,
      default: null,
    },
    google_email: {
      type: String,
      default: null,
    },
    google_name: {
      type: String,
      default: null,
    },
    vercel_access_token: {
      type: String,
      default: null,
    },
    vercel_team_id: {
      type: String,
      default: null,
    },
    notion_access_token: {
      type: String,
      default: null,
    },
    notion_refresh_token: {
      type: String,
      default: null,
    },
    notion_token_expiry: {
      type: Date,
      default: null,
    },
    zoom_access_token: {
      type: String,
      default: null,
    },
    zoom_refresh_token: {
      type: String,
      default: null,
    },
    zoom_token_expiry: {
      type: Date,
      default: null,
    },
    microsoft_access_token: {
      type: String,
      default: null,
    },
    microsoft_refresh_token: {
      type: String,
      default: null,
    },
    microsoft_token_expiry: {
      type: Date,
      default: null,
    },
    microsoft_email: {
      type: String,
      default: null,
    },
    github_access_token: {
      type: String,
      default: null,
    },
    github_refresh_token: {
      type: String,
      default: null,
    },
    github_email: {
      type: String,
      default: null,
    },
    github_name: {
      type: String,
      default: null,
    },
    slack_access_token: {
      type: String,
      default: null,
    },
    slack_refresh_token: {
      type: String,
      default: null,
    },
    slack_email: {
      type: String,
      default: null,
    },
    slack_name: {
      type: String,
      default: null,
    },
    webex_access_token: {
      type: String,
      default: null,
    },
    webex_refresh_token: {
      type: String,
      default: null,
    },
    webex_token_expiry: {
      type: Date,
      default: null,
    },
    // 🤖 AI Configuration (Personal Token Pools)
    ai_tokens: {
        free_weekly_limit: { type: Number, default: 100000 }, 
        used_this_week: { type: Number, default: 0 },
        week_reset_date: { type: Date, default: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d; } }
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

// email index is already created by unique: true
userSchema.index({ organization_id: 1 });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true }); // fast reset-token lookups
userSchema.index({ activationToken: 1 }, { sparse: true }); // fast activation-token lookups
userSchema.index({ activationCodeHash: 1 }, { sparse: true });
// PRN unique per organization (same PRN cannot exist twice in one org)
// partialFilterExpression ensures null PRNs don't conflict
userSchema.index(
  { organization_id: 1, prn: 1 },
  { unique: true, partialFilterExpression: { prn: { $type: "string" } } }
);

// ðŸ›¡ï¸ Auto-verify all @classgrid.in emails
userSchema.pre('save', async function() {
  if (this.email && this.email.toLowerCase().endsWith('@classgrid.in')) {
    this.isEmailVerified = true;
    this.verification_status = 'verified';
  }
});

// ðŸ”„ Auto-sync newly created users to Supabase blog_subscribers
// Track isNew before save fires (isNew becomes false after save)
userSchema.pre('save', async function() {
  this.$wasNew = this.isNew;
});

userSchema.post('save', function(doc) {
  // Only trigger on initial document creation, not on updates
  if (doc.$wasNew) {
    syncUserToBlogSubscribers(doc.email, doc.name).catch(console.error);
  }
});

export default mongoose.models.User || mongoose.model("User", userSchema);


--- File: UserProfile.js ---
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

// Profile details schema handling the 100+ fields from the 17 stepper sections
const userProfileSchema = new mongoose.Schema(
  {
    organization_id: {









        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    user: {









      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One profile per user
    },
    organization: {









      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    // ── Section 1: Personal Details ──────────────────────────────
    identity: {









      first_name: { type: String, default: "" },
      middle_name: { type: String, default: "" },
      last_name: { type: String, default: "" },
      date_of_birth: { type: Date, default: null },
      gender: { type: String, default: "" },
      gender_other: { type: String, default: "" },
      blood_group: { type: String, default: "" },
      nationality: { type: String, default: "Indian" },
      other_nationality: { type: String, default: "" },
      mother_tongue: { type: String, default: "" },
      other_mother_tongue: { type: String, default: "" },
      government_id_type: { type: String, default: "" },
      government_id_number: { type: String, default: "" },
      birth_country: { type: String, default: "" },
      birth_state: { type: String, default: "" },
      birth_place: { type: String, default: "" },
      profile_photo_url: { type: String, default: "" },
      
      organization_type: { type: String, default: "" },
      role_category: { type: String, default: "" },
      academic_departments_handled: { type: String, default: "" },
      
      domicile: { type: String, default: "" },
      marital_status: { type: String, default: "Single" },
      aadhar_number: { type: String, default: "" },
      pan_number: { type: String, default: "" },
      native_place: { type: String, default: "" },
      student_id: { type: String, default: "" },
      employee_id: { type: String, default: "" },
      qualification: { type: String, default: "" },
      specialization: { type: String, default: "" },
      teacher_training_certificate: { type: String, default: "" },
      tet_qualified: { type: Boolean, default: false },
      tet_score: { type: Number, default: 0 },
      recruitment_type: { type: String, default: "" },
      date_of_joining: { type: Date, default: null },
      educational_qualifications: { type: String, default: "" },
      professional_memberships: { type: String, default: "" },
      certifications: { type: String, default: "" },
      confirmation_status: { type: Boolean, default: false },
      department: { type: String, default: "" },
      designation: { type: String, default: "" },
      employee_category: { type: String, default: "" },
      date_of_retirement: { type: Date, default: null },
      pay_scale: { type: Number, default: 0 },
      reporting_to: { type: String, default: "" },
      supervisory_roles: { type: String, default: "" },
    },
    religion_details: {









      religion: { type: String, default: "" },
      caste: { type: String, default: "" },
      sub_caste: { type: String, default: "" },
      creamy_layer: { type: Boolean, default: false },
    },
    handicap_details: {









      physically_handicapped: { type: Boolean, default: false },
      ph_type: { type: String, default: "" },
      ph_percentage: { type: Number, default: 0 },
    },
    minority_details: {









      belongs_to_minority: { type: Boolean, default: false },
      minority_type: { type: String, default: "" },
    },
    passport_details: {









      passport_number: { type: String, default: "" },
      passport_valid_upto: { type: Date, default: null },
      visa_number: { type: String, default: "" },
    },
    admission_details: {









      admission_main_category: { type: String, default: "" },
      seat_type: { type: String, default: "" },
      cap_round: { type: String, default: "" },
      lateral_entry: { type: Boolean, default: false },
    },

    // ── Section 2: Contact Details ───────────────────────────────
    contact: {









      permanent_address: { type: String, default: "" },
      permanent_state: { type: String, default: "" },
      permanent_city: { type: String, default: "" },
      permanent_district: { type: String, default: "" },
      permanent_pincode: { type: String, default: "" },
      current_address: { type: String, default: "" },
      current_state: { type: String, default: "" },
      current_city: { type: String, default: "" },
      current_pincode: { type: String, default: "" },
      emergency_contact_name: { type: String, default: "" },
      emergency_contact_mobile: { type: String, default: "" },
      emergency_contact_relation: { type: String, default: "" },
      personal_email: { type: String, default: "" },
      work_email: { type: String, default: "" },
      alternate_phone: { type: String, default: "" },
      whatsapp_number: { type: String, default: "" },
      permanent_country: { type: Number, default: 0 },
      current_country: { type: Number, default: 0 },
      official_phone: { type: String, default: "" },
      office_extension: { type: String, default: "" },
      primary_contact_for: { type: String, default: "" },
    },

    // ── Section 3: Family Details ────────────────────────────────
    family: {
      father_name: { type: String, default: "" },
      father_occupation: { type: String, default: "" },
      father_income: { type: Number, default: 0 },
      father_mobile: { type: String, default: "" },
      father_email: { type: String, default: "" },
      father_education: { type: String, default: "" },
      
      mother_name: { type: String, default: "" },
      mother_occupation: { type: String, default: "" },
      mother_income: { type: Number, default: 0 },
      mother_mobile: { type: String, default: "" },
      mother_email: { type: String, default: "" },
      mother_education: { type: String, default: "" },
      
      has_local_guardian: { type: String, enum: ["Yes", "No", ""], default: "" },
      local_guardian_name: { type: String, default: "" },
      local_guardian_mobile: { type: String, default: "" },
      local_guardian_address: { type: String, default: "" },
      
      spouse_name: { type: String, default: "" },
      spouse_occupation: { type: String, default: "" },
      spouse_contact: { type: String, default: "" },
      number_of_children: { type: Number, default: 0 },
      undergraduate_degree: { type: String, default: "" },
      undergraduate_specialization: { type: String, default: "" },
      undergraduate_percentage: { type: Number, default: 0 },
      undergraduate_university: { type: String, default: "" },
      undergraduate_year: { type: Date, default: null },
      postgraduate_degree: { type: String, default: "" },
      postgraduate_specialization: { type: String, default: "" },
      postgraduate_percentage: { type: Number, default: 0 },
      postgraduate_university: { type: String, default: "" },
      postgraduate_year: { type: Date, default: null },
      b_ed_degree: { type: String, default: "" },
      b_ed_percentage: { type: Number, default: 0 },
      b_ed_university: { type: String, default: "" },
      b_ed_year: { type: Date, default: null },
      phd: { type: String, default: "" },
      phd_specialization: { type: String, default: "" },
      phd_university: { type: String, default: "" },
      phd_year: { type: Date, default: null },
      net_qualified: { type: Boolean, default: false },
      slet_qualified: { type: Boolean, default: false },
    },

    // ── Section 4: Education Details ─────────────────────────────
    education: {









      tenth_board: { type: String, default: "" }, // 10th
      tenth_percentage: { type: Number, default: 0 },
      twelfth_board: { type: String, default: "" }, // 12th
      twelfth_percentage: { type: Number, default: 0 },
      pcm_percentage: { type: Number, default: 0 },
      diploma_percentage: { type: Number, default: 0 },
      previous_school: { type: String, default: "" },
      previous_percentage: { type: Number, default: 0 },
      en_number: { type: String, default: "" },
      cet_score: { type: Number, default: 0 },
      jee_score: { type: Number, default: 0 },
      entrance_score: { type: Number, default: 0 },
      university_prn_number: { type: String, default: "" },
    },

    // ── Section 5: Bank Details ──────────────────────────────────
    bank: {









      bank_account_number: { type: String, default: "" },
      bank_ifsc_code: { type: String, default: "" },
      bank_name: { type: String, default: "" },
      bank_branch: { type: String, default: "" },
      bank_micr_code: { type: String, default: "" },
      account_holder_name: { type: Number, default: 0 },
      uan_number: { type: String, default: "" },
      pf_number: { type: String, default: "" },
      nominee_name: { type: String, default: "" },
      nominee_relation: { type: String, default: "" },
      financial_authorization: { type: String, default: "" },
    },

    // ── Section 6: Documents ─────────────────────────────────────
    documents: [{
      document_name: { type: String, required: true },
      document_type: { type: String, default: "" },
      document_number: { type: String, default: "" },
      issued_date: { type: Date, default: null },
      expiry_date: { type: Date, default: null },
      verified_status: { type: String, enum: ["Pending", "Verified", "Rejected"], default: "Pending" },
      verified_by: { type: String, default: "" },
      file_url: { type: String, required: true },
      uploaded_at: { type: Date, default: Date.now }
    }],

    // ── Section 7: Experience Details (Faculty) ──────────────────
    experience: {
      experience_years: { type: Number, default: 0 },
      experience_details: { type: String, default: "" },
      total_years_teaching: { type: Date, default: null },
      years_in_current_school: { type: Date, default: null },
      previous_schools: { type: String, default: "" },
      administrative_roles_held: { type: String, default: "" },
      board_experience: { type: String, default: "" },
      ncert_expert_panel: { type: String, default: "" },
      textbook_committee: { type: String, default: "" },
      subjects_taught: { type: String, default: "" },
      curriculum_development_experience: { type: String, default: "" },
      teacher_training_conducted: { type: String, default: "" },
      affiliation_experience: { type: String, default: "" },
      school_inspection_experience: { type: String, default: "" },
      responsibilities: { type: String, default: "" },
      work_shift: { type: String, default: "" },
      parent_teacher_meetings_conducted: { type: String, default: "" },
    },

    // ── Section 8: Awards / Participation ────────────────────────
    awards_participation: {









      awards: { type: String, default: "" },
      participation: { type: String, default: "" },
      sports: { type: String, default: "" },
      cultural_activities: { type: String, default: "" },
      best_teacher_award: { type: String, default: "" },
      national_seminar_attended: { type: String, default: "" },
      workshop_attended: { type: String, default: "" },
      publications: { type: String, default: "" },
      patents: { type: String, default: "" },
      best_principal_award: { type: String, default: "" },
      national_awards: { type: String, default: "" },
      state_awards: { type: String, default: "" },
      research_articles: { type: String, default: "" },
      workshop_conducted: { type: String, default: "" },
    },

    // ── Section 9: Student Activity ──────────────────────────────
    activity: {









      clubs_joined: { type: String, default: "" },
      committees: { type: String, default: "" },
      nss_ncc: { type: String, default: "" },
      internships: { type: String, default: "" },
      projects: { type: String, default: "" },
    },

    // ── Section 10: Social Details ───────────────────────────────
    social: {









      instagram_url: { type: String, default: "" },
      facebook_url: { type: String, default: "" },
      linkedin_url: { type: String, default: "" },
      github_url: { type: String, default: "" },
      portfolio_url: { type: String, default: "" },
      professional_blog: { type: String, default: "" },
      research_gate: { type: String, default: "" },
      google_scholar: { type: String, default: "" },
      orcid_id: { type: String, default: "" },
      educational_forum_memberships: { type: String, default: "" },
    },

    // ── Section 12: Medical Details ──────────────────────────────
    medical: {









      medical_conditions: { type: String, default: "" },
      allergies: { type: String, default: "" },
      disability_type: { type: String, default: "" },
      medical_insurance: { type: String, default: "" },
      blood_group: { type: String, default: "" },
      emergency_medical_contact: { type: String, default: "" },
      last_health_checkup_date: { type: Date, default: null },
    },

    // ── Section 13: Person Skill & Interest ──────────────────────
    skills_interests: {









      skills: { type: String, default: "" },
      interests: { type: String, default: "" },
      languages_known: { type: String, default: "" },
      career_goal: { type: String, default: "" },
      technical_skills: { type: String, default: "" },
      soft_skills: { type: String, default: "" },
      pedagogical_skills: { type: String, default: "" },
      classroom_management_skills: { type: String, default: "" },
      multi_lingual_skills: { type: String, default: "" },
      cpd_courses_completed: { type: String, default: "" },
      leadership_skills: { type: String, default: "" },
      financial_management_skills: { type: String, default: "" },
      hr_management_skills: { type: String, default: "" },
      communication_skills: { type: String, default: "" },
      negotiation_skills: { type: String, default: "" },
      technology_proficiency: { type: String, default: "" },
      data_analysis_skills: { type: Boolean, default: false },
      lms_proficiency: { type: String, default: "" },
    },

    // ── Section 14: Anti-Ragging Details ─────────────────────────
    anti_ragging: {









      anti_ragging_link: { type: String, default: "" },
      anti_ragging_date: { type: Date, default: null },
    },
    
  },
  { timestamps: true }
);

export default mongoose.models.UserProfile || mongoose.model("UserProfile", userProfileSchema);


--- File: Verification.js ---
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

// models/Verification.js
import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  verificationToken: {
    type: String,
    required: true,
    unique: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  resendCount: {
    type: Number,
    default: 0,
    max: 5
  },
  lastResentAt: Date,
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 86400 } // 24 hours TTL
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Verification", verificationSchema);


--- File: VideoProgress.js ---
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

const videoProgressSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    classroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Classroom",
        required: true,
        index: true
    },
    materialId: {
        type: String, // ID of the specific YouTube material in the classroom
        required: true
    },
    youtubeId: {
        type: String, // e.g., "dQw4w9WgXcQ" (Only for YouTube sources)
        default: ""
    },
    watchTimeSeconds: {
        type: Number,
        default: 0
    },
    totalDurationSeconds: {
        type: Number,
        default: 0
    },
    percentageWatched: {
        type: Number,
        default: 0
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index for fast lookup of a student's progress on a specific video
videoProgressSchema.index({ user: 1, materialId: 1 }, { unique: true });

export default mongoose.models.VideoProgress || mongoose.model("VideoProgress", videoProgressSchema);


--- File: VivaRecord.js ---
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

import mongoose from 'mongoose';

const VivaRecordSchema = new mongoose.Schema({
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    userId: {
        type: String, // Clerk ID or MongoDB ID string
        required: true,
        index: true
    },
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: false
    },
    topic: {
        type: String,
        required: true
    },
    subject: {
        type: String
    },
    mode: {
        type: String,
        enum: ['practice', 'exam', 'rapid_fire'],
        default: 'practice'
    },
    totalScore: {
        type: Number,
        required: true,
        min: 0,
        max: 5
    },
    parameters: {
        knowledge: { type: Number, min: 0, max: 5 },
        clarity: { type: Number, min: 0, max: 5 },
        confidence: { type: Number, min: 0, max: 5 },
        accuracy: { type: Number, min: 0, max: 5 }
    },
    weakAreas: [{
        type: String
    }],
    strongAreas: [{
        type: String
    }],
    feedback: {
        type: String
    },
    sessionTranscript: [{
        role: { type: String, enum: ['examiner', 'student'] },
        content: { type: String },
        timestamp: { type: Date, default: Date.now }
    }],
    durationSeconds: {
        type: Number
    },
    status: {
        type: String,
        enum: ['completed', 'abandoned', 'interrupted'],
        default: 'completed'
    },
    metadata: {
        voiceConfidence: { type: Number }, // Detected through hesitation analysis
        thinkingTimeAvg: { type: Number }  // Average seconds per answer
    }
}, { timestamps: true });

// Index for analytics: latest viva first
VivaRecordSchema.index({ userId: 1, createdAt: -1 });

const VivaRecord = mongoose.model('VivaRecord', VivaRecordSchema);
export default VivaRecord;


--- File: WebhookEvent.js ---
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

const webhookEventSchema = new mongoose.Schema(
    {
        provider: { // e.g. "RAZORPAY"
            type: String,
            required: true,
            uppercase: true,
        },
        providerEventId: { // e.g. "ev_abcdefgh"
            type: String,
            required: true,
        },
        eventType: { // e.g. "payment.captured", "refund.processed"
            type: String,
            required: true,
        },
        payloadHash: { // To detect if payload changed for same event ID
            type: String,
            required: true,
        },
        signatureValid: {
            type: Boolean,
            required: true,
        },
        payload: {
            type: mongoose.Schema.Types.Mixed, // The raw unparsed JSON payload
            required: true,
        },
        receivedAt: {
            type: Date,
            default: Date.now,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        processingStatus: {
            type: String,
            enum: ["PENDING", "PROCESSED", "FAILED", "IGNORED"], // Ignored for events we don't care about
            default: "PENDING",
        },
        retryCount: {
            type: Number,
            default: 0,
        },
        lastError: {
            type: String,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

// Redact sensitive payload data before saving
webhookEventSchema.pre("save", function() {
    if (this.isModified("payload") && this.payload) {
        const redact = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            const sensitiveKeys = ["vpa", "card_id", "card", "billing_address"];
            for (const key in obj) {
                if (typeof obj[key] === 'object') {
                    redact(obj[key]);
                } else if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                    obj[key] = "[REDACTED]";
                }
            }
        };
        // Deep clone payload to avoid modifying the original request object reference
        const safePayload = JSON.parse(JSON.stringify(this.payload));
        redact(safePayload);
        this.payload = safePayload;
    }
});

// Deduplication index
webhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });

export default mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", webhookEventSchema);


`
