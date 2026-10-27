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

import mongoose from "mongoose";
import OrganizationAnnouncement from "../models/OrganizationAnnouncement.js";
import Classroom from "../models/Classroom.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import User from "../models/User.js";
import { bulkDispatchNotification } from "./notification.service.js";

function toObjectId(value) {
    if (!value) return null;
    const id = value.toString();
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function toDateOrNull(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeClassroomIds(classroomIds = []) {
    return classroomIds
        .map((id) => toObjectId(id))
        .filter(Boolean);
}

function compactMessage(content = "") {
    const normalized = String(content || "").replace(/\s+/g, " ").trim();
    if (!normalized) return "New organization announcement";
    return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

export async function syncSupabaseAnnouncementToMongo(announcement, fallbackCreatedBy = null) {
    if (!announcement?.id) return null;

    const orgId = toObjectId(announcement.organization_id);
    const createdBy = toObjectId(announcement.created_by) || toObjectId(fallbackCreatedBy);
    if (!orgId || !createdBy) {
        console.warn("[OrgAnnouncementSync] Skipping Mongo mirror due to invalid ids", {
            supabaseId: announcement.id,
            organization_id: announcement.organization_id,
            created_by: announcement.created_by,
        });
        return null;
    }

    const payload = {
        source: "supabase",
        supabase_id: announcement.id.toString(),
        title: announcement.title,
        content: announcement.content,
        type: announcement.type || "announcement",
        organization_id: orgId,
        created_by: createdBy,
        creator_name: announcement.creator_name || "",
        target_type: announcement.target_type || "specific",
        target_classrooms: announcement.target_type === "all" ? [] : normalizeClassroomIds(announcement.target_classrooms || []),
        status: announcement.status || "published",
        sent_at: toDateOrNull(announcement.sent_at),
        expires_at: toDateOrNull(announcement.expires_at),
        attachment_url: announcement.attachment_url || "",
        attachment_name: announcement.attachment_name || "",
        attachment_type: announcement.attachment_type || "",
    };

    const update = { $set: payload };
    const createdAt = toDateOrNull(announcement.created_at);
    if (createdAt) update.$setOnInsert = { createdAt };
    const updatedAt = toDateOrNull(announcement.updated_at);
    if (updatedAt) update.$set.updatedAt = updatedAt;

    return OrganizationAnnouncement.findOneAndUpdate(
        { supabase_id: announcement.id.toString() },
        update,
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
}

export async function deleteMongoAnnouncementBySupabaseId(supabaseId, organizationId) {
    if (!supabaseId) return { deletedCount: 0 };

    const filter = { supabase_id: supabaseId.toString() };
    const orgId = toObjectId(organizationId);
    if (orgId) filter.organization_id = orgId;

    return OrganizationAnnouncement.deleteOne(filter);
}

async function resolveAnnouncementRecipients(announcement) {
    const orgId = toObjectId(announcement.organization_id);
    if (!orgId) return [];

    if (announcement.target_type === "all") {
        const users = await User.find({ organization_id: orgId, status: "active" }).select("_id").lean();
        return users.map((user) => user._id.toString());
    }

    const classroomIds = normalizeClassroomIds(announcement.target_classrooms || []);
    if (classroomIds.length === 0) return [];

    const [memberships, classrooms] = await Promise.all([
        ClassroomMembership.find({ classroom: { $in: classroomIds }, status: "approved" }).select("student").lean(),
        Classroom.find({ _id: { $in: classroomIds }, organization_id: orgId })
            .select("teacher class_teacher assistant_teacher mentor")
            .lean(),
    ]);

    const candidateIds = new Set();
    memberships.forEach((membership) => {
        if (membership.student) candidateIds.add(membership.student.toString());
    });
    classrooms.forEach((classroom) => {
        [classroom.teacher, classroom.class_teacher, classroom.assistant_teacher, classroom.mentor]
            .filter(Boolean)
            .forEach((id) => candidateIds.add(id.toString()));
    });

    if (candidateIds.size === 0) return [];

    const activeUsers = await User.find({
        _id: { $in: [...candidateIds] },
        organization_id: orgId,
        status: "active",
    }).select("_id").lean();

    return activeUsers.map((user) => user._id.toString());
}

export async function deliverPublishedOrganizationAnnouncement(announcement) {
    if (!announcement || announcement.status !== "published") {
        return { delivered: false, recipientCount: 0 };
    }

    const recipientIds = await resolveAnnouncementRecipients(announcement);
    if (recipientIds.length === 0) {
        return { delivered: false, recipientCount: 0 };
    }

    await bulkDispatchNotification({
        recipientIds,
        type: announcement.type === "emergency" ? "alert" : "new_content",
        title: announcement.title,
        message: compactMessage(announcement.content),
        link: "/notifications",
        relatedId: (announcement.id || announcement.supabase_id || announcement._id || "").toString(),
        sendPush: true,
    });

    return { delivered: true, recipientCount: recipientIds.length };
}
