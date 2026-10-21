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

import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";

const router = express.Router();

const ALLOWED_FIELDS = [
    "school_name",
    "branch_department",
    "class_year",
    "course_name",
    "batch_year",
    "semester",
    "division_section",
    "roll_number",
    "prn",
    "admission_number",
];

// ─────────────────────────────────────────────
// GET — Fetch student's academic info
// ─────────────────────────────────────────────
router.get("/", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id.toString();

        const { data, error } = await supabase
            .from("student_academic_info")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) throw error;

        // Return empty defaults if no record exists yet
        res.json({
            academicInfo: data || {
                school_name: "",
                branch_department: "",
                class_year: "",
                course_name: "",
                batch_year: "",
                semester: "",
                division_section: "",
                roll_number: "",
                prn: "",
                admission_number: "",
            },
        });
    } catch (err) {
        console.error("GET academic info error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// PUT — Upsert student's academic info
// ─────────────────────────────────────────────
router.put("/", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id.toString();

        // Sanitise: only allow known fields, trim strings
        const updates = {};
        for (const field of ALLOWED_FIELDS) {
            if (req.body[field] !== undefined) {
                updates[field] = (req.body[field] || "").toString().trim().substring(0, 200);
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No valid fields provided" });
        }

        // Upsert: insert if not exists, update if exists (keyed on user_id)
        const { data, error } = await supabase
            .from("student_academic_info")
            .upsert(
                { user_id: userId, ...updates },
                { onConflict: "user_id" }
            )
            .select()
            .single();

        if (error) throw error;

        res.json({ message: "Academic info saved", academicInfo: data });
    } catch (err) {
        console.error("PUT academic info error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
