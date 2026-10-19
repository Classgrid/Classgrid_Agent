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
