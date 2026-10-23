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
        "user", "student", "teacher", "faculty", "org_admin", "super_admin", "co_super_admin",
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
        "user", "student", "teacher", "faculty", "org_admin", "super_admin", "co_super_admin",
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

    // How the last successful login was made (shown as "Last used" on the chat login page)
    lastLoginMethod: {
      type: String,
      enum: ["google", "github", "email", null],
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

    // Blocked users in Grid chat (user ids I blocked): they can't see my online status or profile,
    // and their messages to me are never delivered (WhatsApp-style)
    blocked_users: {
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

    // One domain the user proved they own with a DNS TXT record (verify only, nothing is hosted on it)
    verifiedDomain: {
      domain: { type: String, default: null, lowercase: true, trim: true },
      token: { type: String, default: null },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date, default: null },
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

    privacySettings: {
      hideEmail: { type: Boolean, default: false },
      hideHobbies: { type: Boolean, default: false },
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
    sanity_project_id: {
      type: String,
      default: null,
    },
    sanity_access_token: {
      type: String,
      default: null,
    },
    supabase_access_token: {
      type: String,
      default: null,
    },
    supabase_refresh_token: {
      type: String,
      default: null,
    },
    meta_access_token: {
      type: String,
      default: null,
    },
    meta_page_id: {
      type: String,
      default: null,
    },
    meta_ig_account_id: {
      type: String,
      default: null,
    },
    facebook_access_token: {
      type: String,
      default: null,
    },
    facebook_page_id: {
      type: String,
      default: null,
    },
    instagram_access_token: {
      type: String,
      default: null,
    },
    instagram_account_id: {
      type: String,
      default: null,
    },
    // 🤖 AI Configuration (Personal Token Pools)
    ai_tokens: {
      custom_limits_enabled: { type: Boolean, default: false }, // If false, fallback to GlobalAiConfig
      free_weekly_limit: { type: Number, default: 100000 },
      used_this_week: { type: Number, default: 0 },
      week_reset_date: { type: Date, default: null },
      // When the current token period started; its end is always worked out from the dashboard timing (tokenWindowEnd)
      window_start: { type: Date, default: null },
      is_ai_blocked: { type: Boolean, default: false },
      
      // Paid Credits
      ai_credits_balance: { type: Number, default: 0 },
      total_ai_credits_purchased: { type: Number, default: 0 },
      ai_credits_start_date: { type: Date, default: null },
      ai_credits_end_date: { type: Date, default: null },        // Promotion Credits
      promotion_credits_balance: { type: Number, default: 0 },
      total_promotion_credits_granted: { type: Number, default: 0 },
      promotion_credits_start_date: { type: Date, default: null },
      promotion_credits_end_date: { type: Date, default: null },
      promotion_credits_paused: { type: Boolean, default: false },
      promotion_credits_revoked: { type: Boolean, default: false },

      ai_image_free_weekly_limit: { type: Number, default: 20 },
      ai_image_free_weekly_used: { type: Number, default: 0 },
      total_ai_tokens_used: { type: Number, default: 0 }
    },
    ai_image_free_weekly_used: { type: Number },
    ai_image_reset_date: { type: Date },
    // 🧠 AI Chat Customization & Defaults
    ai_preferences: {
      tone: { type: String, default: 'balanced' },
      verbosity: { type: String, default: 'balanced' },
      format: { type: String, default: 'markdown' },
      emoji: { type: String, default: 'default' },
      level: { type: String, default: 'intermediate' },
      nickname: { type: String, default: '' },
      occupation: { type: String, default: '' },
      aboutMe: { type: String, default: '' },
      howToRespond: { type: String, default: '' },
      activeDefaults: { type: [String], default: ['truth', 'privacy'] }
    },
    // 🧠 Custom AI Skills
    ai_custom_skills: [
      {
        name: { type: String, required: true },
        instructions: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
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
userSchema.index({ blocked_users: 1 }, { sparse: true }); // "who blocked me" lookups for Grid blocking
// PRN unique per organization (same PRN cannot exist twice in one org)
// partialFilterExpression ensures null PRNs don't conflict
userSchema.index(
  { organization_id: 1, prn: 1 },
  { unique: true, partialFilterExpression: { prn: { $type: "string" } } }
);

// ðŸ›¡ï¸ Auto-verify all @classgrid.in emails
userSchema.pre('save', async function () {
  if (this.email && this.email.toLowerCase().endsWith('@classgrid.in')) {
    this.isEmailVerified = true;
    this.verification_status = 'verified';
  }
});

// ðŸ”„ Auto-sync newly created users to Supabase blog_subscribers
// Track isNew before save fires (isNew becomes false after save)
userSchema.pre('save', async function () {
  this.$wasNew = this.isNew;
});

userSchema.post('save', function (doc) {
  // Only trigger on initial document creation, not on updates
  if (doc.$wasNew) {
    syncUserToBlogSubscribers(doc.email, doc.name).catch(console.error);
  }
});

export default mongoose.models.User || mongoose.model("User", userSchema);
