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
