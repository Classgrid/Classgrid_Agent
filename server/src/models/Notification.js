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
        enum: ["request_approved", "request_rejected", "new_content", "content_update", "system", "chat", "attendance", "attendance_ended", "assignment", "quiz", "meeting_reminder", "result", "fee_reminder", "fee_assigned", "fee_payment", "quick_leave", "alert", "join_request", "library", "feedback_assigned", "viva_scheduled", "support_update", "group_join"],
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

// Live bell: tell the recipient's open tabs/devices over their Socket.IO user channel that a new
// notification arrived (covers every Notification.create / insertMany in the codebase).
function pushLive(docs) {
    const recipients = [...new Set((docs || []).map((d) => d?.recipient?.toString()).filter(Boolean))];
    if (!recipients.length) return;
    import("../services/realtimeBroadcast.js")
        .then(({ broadcastToChannel }) => recipients.forEach((id) => broadcastToChannel(`user:${id}`, "notification_new", {})))
        .catch(() => {});
}
notificationSchema.post("save", function (doc) { pushLive([doc]); });
notificationSchema.post("insertMany", function (docs) { pushLive(docs); });

export default mongoose.model("Notification", notificationSchema);
