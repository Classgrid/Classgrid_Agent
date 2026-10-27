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
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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

import mongoose from "mongoose";

const globalAiConfigSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: "singleton", // Enforces a single document store
        },
        // --- Tokens & Usage Limits ---
        global_pro_pool_limit: {
            type: Number,
            default: 500000
        },
        global_user_weekly_limit: {
            type: Number,
            default: 100000
        },
        global_image_weekly_limit: {
            type: Number,
            default: 20
        },
        global_whatsapp_scheduling_limit: {
            type: Number,
            default: 10
        },
        classgrid_custom_limits_enabled: { type: Boolean, default: false },
        classgrid_pro_pool_limit: { type: Number },
        classgrid_user_weekly_limit: { type: Number },
        classgrid_image_weekly_limit: { type: Number },
        classgrid_whatsapp_scheduling_limit: { type: Number },
        global_token_reset_value: { type: Number },
        global_token_reset_unit: { type: String },
        global_image_reset_value: { type: Number },
        global_image_reset_unit: { type: String },
        global_whatsapp_reset_value: { type: Number },
        global_whatsapp_reset_unit: { type: String },
        classgrid_token_reset_value: { type: Number },
        classgrid_token_reset_unit: { type: String },
        classgrid_image_reset_value: { type: Number },
        classgrid_image_reset_unit: { type: String },
        classgrid_whatsapp_reset_value: { type: Number },
        classgrid_whatsapp_reset_unit: { type: String },
        // --- Pricing & Cost Config ---
        credits_per_inr: { 
            type: Number,
            default: 3000
        },
        image_generation_token_cost: { 
            type: Number,
            default: 5000
        },
        // Cloudflare official costs (USD) - for reference & margin calculation
        cf_input_cost_per_million: { 
            type: Number,
            default: 1.32  // DeepSeek V4 Pro input
        },
        cf_output_cost_per_million: { 
            type: Number,
            default: 3.96  // DeepSeek V4 Pro output
        },
        cf_image_cost_per_unit: { 
            type: Number,
            default: 0.0005  // Flux-1-Schnell per image
        },
        // --- Access Controls ---
        global_ai_blocked: {
            type: Boolean,
            default: false,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.GlobalAiConfig || mongoose.model("GlobalAiConfig", globalAiConfigSchema);
