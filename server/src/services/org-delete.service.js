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

import Organization from "../models/Organization.js";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import Notification from "../models/Notification.js";
import ActivityLog from "../models/ActivityLog.js";
import Message from "../models/Message.js";
import NoteView from "../models/NoteView.js";
import Quiz from "../models/Quiz.js";
import OrganizationPending from "../models/OrganizationPending.js";
import Verification from "../models/Verification.js";
import { classroomClient, studentNotesClient, getChatSb } from "../config/supabaseClient.js";
import mongoose from "mongoose";
import connectDB from "../../config/db.js";
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";


// ─────────────────────────────────────────────────────────
// DELETE TOKEN MODEL (for org admin email verification)
// Stored in MongoDB with TTL auto-expiry (30 minutes)
// ─────────────────────────────────────────────────────────
const orgDeleteTokenSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true,
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 1800, // Auto-delete after 30 minutes (TTL index)
    },
});

export const OrgDeleteToken = mongoose.models.OrgDeleteToken ||
    mongoose.model("OrgDeleteToken", orgDeleteTokenSchema);

// Chat Supabase client — now uses centralized getChatSb()
function getChatSupabase() {
    try { return getChatSb(); } catch { return null; }
}

// ─────────────────────────────────────────────────────────
// HARD DELETE ALL ORGANISATION DATA
// This is the core atomic deletion function used by both
// Super Admin (direct) and Org Admin (after email verification)
// ─────────────────────────────────────────────────────────
export async function hardDeleteOrganization(orgId) {
    await connectDB();

    // 1. Find the organization
    const org = await Organization.findById(orgId);
    if (!org) throw new Error("Organization not found");

    const orgName = org.name;

    // 2. Find all classrooms belonging to this organization
    const classrooms = await Classroom.find({ organization_id: orgId }).select("_id").lean();
    const classroomIds = classrooms.map(c => c._id);
    const classroomIdStrings = classroomIds.map(id => id.toString());

    // 3. Find all users belonging to this organization (excluding super_admin)
    const users = await User.find({
        organization_id: orgId,
        role: { $ne: "super_admin" }
    }).select("_id email").lean();
    const userIds = users.map(u => u._id);
    const userEmails = users.map(u => u.email);

    // ====================================================
    // PHASE 1: DELETE SUPABASE DATA (Content + Chat + Storage)
    // ====================================================
    const supabaseErrors = [];

    // 4A. Delete classroom content from Supabase (materials, announcements, quizzes)
    if (classroomIdStrings.length > 0) {
        for (const table of ["materials", "announcements", "quizzes"]) {
            try {
                const { error } = await classroomClient
                    .from(table)
                    .delete()
                    .in("classroom_id", classroomIdStrings);
                if (error) supabaseErrors.push(`${table}: ${error.message}`);
            } catch (e) {
                supabaseErrors.push(`${table}: ${e.message}`);
            }
        }
    }

    // 4B. Delete classroom chat messages from Chat Supabase project
    const sb = getChatSupabase();
    if (sb && classroomIdStrings.length > 0) {
        try {
            const { error } = await sb
                .from("classroom_messages")
                .delete()
                .in("classroom_id", classroomIdStrings);
            if (error) supabaseErrors.push(`classroom_messages: ${error.message}`);
        } catch (e) {
            supabaseErrors.push(`classroom_messages: ${e.message}`);
        }
    }

    // 4C. Delete storage files (notes-files bucket)
    try {
        // Delete org logo if exists
        if (org.logo_url && org.logo_url.includes("notes-files")) {
            const logoPath = org.logo_url.split("/notes-files/")[1];
            if (logoPath) {
                await Promise.all([logoPath].map(p => deleteFromR2(p)));
            }
        }

        // Delete classroom-related files (each classroom may have uploaded files)
        for (const cid of classroomIdStrings) {
            try {
                const { data: files } = await studentNotesClient.storage
                    .from("notes-files")
                    .list(`classroom/${cid}`);
                if (files && files.length > 0) {
                    const paths = files.map(f => `classroom/${cid}/${f.name}`);
                    await Promise.all(paths.map(p => deleteFromR2(p)));
                }
            } catch (e) {
                // Non-fatal — folder may not exist
            }
        }
    } catch (e) {
        supabaseErrors.push(`storage: ${e.message}`);
    }

    // ====================================================
    // PHASE 2: DELETE MONGODB DATA (in dependency order)
    // ====================================================

    // 5. Delete Activity Logs (references classroom + user)
    if (classroomIds.length > 0) {
        await ActivityLog.deleteMany({ classroom: { $in: classroomIds } });
    }

    // 6. Delete MongoDB Messages (references classroom)
    if (classroomIds.length > 0) {
        await Message.deleteMany({ classroom: { $in: classroomIds } });
    }

    // 7. Delete Classroom Memberships
    if (classroomIds.length > 0) {
        await ClassroomMembership.deleteMany({ classroom: { $in: classroomIds } });
    }

    // 8. Delete NoteViews (references user)
    if (userIds.length > 0) {
        await NoteView.deleteMany({ studentId: { $in: userIds } });
    }

    // 9. Delete Quizzes (references user as createdBy)
    if (userIds.length > 0) {
        await Quiz.deleteMany({ createdBy: { $in: userIds } });
    }

    // 10. Delete Notifications (references user as recipient)
    if (userIds.length > 0) {
        await Notification.deleteMany({ recipient: { $in: userIds } });
    }

    // 11. Delete Verification tokens for org users
    if (userEmails.length > 0) {
        await Verification.deleteMany({ email: { $in: userEmails } });
    }

    // 12. Delete all Classrooms
    if (classroomIds.length > 0) {
        await Classroom.deleteMany({ _id: { $in: classroomIds } });
    }

    // 13. Delete all Users in this organization (except super_admin)
    await User.deleteMany({ organization_id: orgId, role: { $ne: "super_admin" } });

    // 14. Delete matching OrganizationPending records
    if (org.ownerEmail) {
        await OrganizationPending.deleteMany({ owner_email: org.ownerEmail });
    }

    // 15. Delete the Organization itself
    await Organization.findByIdAndDelete(orgId);

    // 16. Delete any remaining delete-verification tokens for this org
    await OrgDeleteToken.deleteMany({ organizationId: orgId });

    return {
        orgName,
        deletedClassrooms: classroomIds.length,
        deletedUsers: userIds.length,
        supabaseErrors: supabaseErrors.length > 0 ? supabaseErrors : null,
    };
}
