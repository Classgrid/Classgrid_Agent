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

const adminSecurityCodeSchema = new mongoose.Schema(
    {
        superAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        code: {
            type: String,
            required: true,
            trim: true
        },
        action: {
            type: String,
            required: true,
            enum: ["RESET_ORG_USAGE", "BLOCK_ORG_AI", "GENERAL_AI_MUTATION", "BLOCK_USER_AI", "RESET_USER_USAGE"],
            default: "GENERAL_AI_MUTATION",
            index: true
        },
        orgId: {
            type: String,
            default: null
        },
        attempts: {
            type: Number,
            default: 0
        },
        used: {
            type: Boolean,
            default: false,
            index: true
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 } // MongoDB TTL index: automatically deletes expired records
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.AdminSecurityCode || mongoose.model("AdminSecurityCode", adminSecurityCodeSchema);
