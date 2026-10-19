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
