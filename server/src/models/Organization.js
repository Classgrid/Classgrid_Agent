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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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
            custom_limits_enabled: { type: Boolean, default: false }, // If false, fallback to GlobalAiConfig
            is_ai_blocked: { type: Boolean, default: false },
            pro_pool_limit: { type: Number },
            free_weekly_limit_per_user: { type: Number },
            image_generation_limit: { type: Number },
            whatsapp_scheduling_limit: { type: Number },
            pro_used_this_period: { type: Number, default: 0 },
            total_ai_tokens_used: { type: Number, default: 0 },
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
                Cloudflare_key: { type: String, default: "" },
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
