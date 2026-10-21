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

import { generatePayrollForMonth } from "../services/payroll.service.js";
import FacultyPayroll from "../models/FacultyPayroll.js";

/**
 * Trigger manual calculation of payroll.
 * POST /api/payroll/calculate
 * Body: { month: "2026-04" }
 */
export const calculatePayroll = async (req, res) => {
    try {
        const { month } = req.body;
        const orgId = req.user.organization_id;

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM." });
        }

        const results = await generatePayrollForMonth(orgId, month);

        res.status(200).json({
            success: true,
            message: `Payroll calculation complete for ${month}.`,
            data: { recordsProcessed: results.length }
        });
    } catch (error) {
        console.error("Payroll calculation error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Get Org-wide payroll summary for a month
 * GET /api/payroll/summary?month=2026-04
 */
export const getPayrollSummary = async (req, res) => {
    try {
        const { month } = req.query;
        const orgId = req.user.organization_id;

        if (!month) {
            return res.status(400).json({ success: false, message: "Month is required." });
        }

        const payrolls = await FacultyPayroll.find({ organization: orgId, month })
            .populate("faculty", "name email prn");

        res.status(200).json({
            success: true,
            data: payrolls
        });
    } catch (error) {
        console.error("Payroll summary error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Get individual payslip
 * GET /api/payroll/me?month=2026-04
 */
export const getMyPayslip = async (req, res) => {
    try {
        const { month } = req.query;
        const orgId = req.user.organization_id;
        const facultyId = req.user._id;

        if (!month) {
            return res.status(400).json({ success: false, message: "Month is required." });
        }

        const payslip = await FacultyPayroll.findOne({ organization: orgId, faculty: facultyId, month });

        if (!payslip) {
            return res.status(404).json({ success: false, message: "Payslip not found." });
        }

        res.status(200).json({
            success: true,
            data: payslip
        });
    } catch (error) {
        console.error("My payslip error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
