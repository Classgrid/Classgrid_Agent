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

import Classroom from "../models/Classroom.js";
import { getChatSb } from "../config/supabaseClient.js";

/**
 * Ensures a student can only access or join classrooms that belong to their explicitly assigned division.
 * Older "generic" classrooms (without a division_id) are bypassed.
 */
export const enforceClassroomAccess = async (req, res, next) => {
    try {
        // Teachers/Admins are allowed to bypass strict division checks
        if (req.user.role !== 'student') {
            return next();
        }

        // Identify the target classroom from params (join by link/click) or body (join by code)
        let targetClassroom = null;
        if (req.params.id) {
            targetClassroom = await Classroom.findById(req.params.id);
        } else if (req.body.classroomId) {
            targetClassroom = await Classroom.findById(req.body.classroomId);
        } else if (req.body.classCode) {
            targetClassroom = await Classroom.findOne({ classCode: req.body.classCode.toUpperCase().trim() });
        }

        // If classroom isn't found, let the main controller handle the 404
        if (!targetClassroom) {
            return next();
        }

        // If the classroom isn't linked to the new ERP structure (legacy), bypass check
        if (!targetClassroom.division_id) {
            return next();
        }

        // Fetch the student's assigned division from the 'students' table in Supabase
        const { data: studentRecord, error } = await getChatSb()
            .from('students')
            .select('division_id')
            .eq('user_id', req.user._id.toString())
            .single();

        if (error || !studentRecord) {
            return res.status(403).json({
                message: "We could not find your student record. Please contact your administrator.",
                code: "STUDENT_RECORD_MISSING"
            });
        }

        if (!studentRecord.division_id) {
            return res.status(403).json({
                message: "You have not been assigned to an academic division yet. Please wait for assignment.",
                code: "NO_DIVISION_ASSIGNED"
            });
        }

        // STRICT ENFORCEMENT
        if (studentRecord.division_id !== targetClassroom.division_id) {
            return res.status(403).json({
                message: "You are not assigned to this classroom's division. Access blocked.",
                code: "DIVISION_MISMATCH"
            });
        }

        // Passed checks
        next();
    } catch (err) {
        console.error("Access Control Middleware Error:", err);
        res.status(500).json({ message: "Server error verifying classroom access" });
    }
};
