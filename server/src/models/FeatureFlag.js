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
