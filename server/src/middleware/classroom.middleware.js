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
import ClassroomMembership from "../models/ClassroomMembership.js";
import Classroom from "../models/Classroom.js";
import connectDB from "../../config/db.js";

/**
 * Middleware: Require user to be an approved member of the classroom
 * Expects :classroomId in route params
 */
export const requireClassroomMember = async (req, res, next) => {
    try {
        await connectDB();
        const classroomId = req.params.classroomId || req.params.id;

        if (!classroomId) {
            return res.status(400).json({ message: "Classroom ID required" });
        }

        // Validate ObjectId format to prevent BSONError
        if (!mongoose.Types.ObjectId.isValid(classroomId)) {
            return res.status(400).json({ message: "Invalid classroom ID" });
        }

        // Teachers who own the classroom always have access
        const classroom = await Classroom.findById(classroomId).lean();
        if (!classroom) {
            return res.status(404).json({ message: "Classroom not found" });
        }

        req.classroom = classroom;

        // If user is the classroom owner (teacher), grant access
        if (classroom.teacher.toString() === req.user._id.toString()) {
            req.isClassroomOwner = true;
            return next();
        }

        // Allow org_admin of the same organization, or super_admin
        if (req.user.role === 'super_admin' || (req.user.role === 'org_admin' && req.user.organization_id?.toString() === classroom.organization_id?.toString())) {
            req.isClassroomOwner = true; // Grant full owner privileges so they can edit
            return next();
        }

        // Check if student has approved membership in Supabase (minimal select for speed)
        const { getChatSb } = await import('../config/supabaseClient.js');
        const chatSb = getChatSb();
        
        const { data: membership, error } = await chatSb
            .from('classroom_memberships')
            .select('id')
            .eq('classroom_id', classroomId)
            .eq('student_id', req.user._id.toString())
            .eq('status', 'approved')
            .single();

        if (error || !membership) {
            return res.status(403).json({
                message: "You are not an approved member of this classroom",
            });
        }

        req.membership = membership;
        req.isClassroomOwner = false;
        next();
    } catch (err) {
        console.error("Classroom access check error:", err);
        res.status(500).json({ message: "Server error checking classroom access" });
    }
};

/**
 * Middleware: Require user to be the classroom owner (teacher)
 * Must be used AFTER isAuthenticated
 */
export const requireClassroomOwner = async (req, res, next) => {
    try {
        await connectDB();
        const classroomId = req.params.classroomId || req.params.id;

        if (!classroomId) {
            return res.status(400).json({ message: "Classroom ID required" });
        }

        // Validate ObjectId format to prevent BSONError
        if (!mongoose.Types.ObjectId.isValid(classroomId)) {
            return res.status(400).json({ message: "Invalid classroom ID" });
        }

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) {
            return res.status(404).json({ message: "Classroom not found" });
        }

        const isTeacher = classroom.teacher.toString() === req.user._id.toString();
        const isOrgAdmin = req.user.role === "org_admin" && req.user.organization_id?.toString() === classroom.organization_id?.toString();
        const isSuperAdmin = req.user.role === "super_admin";

        if (!isTeacher && !isOrgAdmin && !isSuperAdmin) {
            return res.status(403).json({
                message: "Only the classroom owner or organization admin can perform this action",
            });
        }

        req.classroom = classroom;
        req.isClassroomOwner = true;
        next();
    } catch (err) {
        console.error("Classroom owner check error:", err);
        res.status(500).json({ message: "Server error checking ownership" });
    }
};
