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

import User from "../models/User.js";
import AdmissionApplication from "../models/AdmissionApplication.js";
import connectDB from "../lib/mongodb.js";

/**
 * Data Export Service — Organization Data Ownership & Exit Plan
 * 
 * When an org's subscription expires or they decide to leave,
 * this service generates a complete data export of all their records.
 * 
 * Exported data includes:
 *   - All staff accounts (names, emails, roles)
 *   - All student records (names, PRNs, enrollment data)
 *   - Admission applications
 *   - Fee records summary
 * 
 * Data is returned as structured JSON. The controller converts to CSV/ZIP.
 */

/**
 * Generate a full data export for an organization
 * @param {string} orgId - Organization ID
 * @returns {Object} - Structured export data
 */
export const generateOrgDataExport = async (orgId) => {
    await connectDB();

    // 1. Staff Data
    const staff = await User.find({
        organization_id: orgId,
        role: { $ne: "student" },
        is_demo: { $ne: true },
    }).select("name email phoneNumber role department qualification additional_roles status createdAt").lean();

    // 2. Student Data
    const students = await User.find({
        organization_id: orgId,
        role: "student",
        is_demo: { $ne: true },
    }).select("name email phoneNumber prn branch batch dob gender category admission_type status createdAt").lean();

    // 3. Admission Applications
    const applications = await AdmissionApplication.find({
        organization_id: orgId,
        is_deleted: false,
    }).select("full_name phone email en_number status category merit_score fee_paid prn createdAt").lean();

    // 4. Export Metadata
    const exportMeta = {
        exported_at: new Date().toISOString(),
        organization_id: orgId,
        total_staff: staff.length,
        total_students: students.length,
        total_applications: applications.length,
        data_format: "JSON",
        retention_notice: "This data export contains all records associated with your organization. Per our data retention policy, data is retained for 90 days after subscription expiry before permanent deletion.",
    };

    return {
        metadata: exportMeta,
        staff,
        students,
        applications,
    };
};

/**
 * Convert export data to CSV format
 * @param {Array} records - Array of objects
 * @param {string} type - Record type label
 * @returns {string} - CSV string
 */
export const recordsToCsv = (records, type) => {
    if (!records || records.length === 0) return `No ${type} records found.\n`;

    const headers = Object.keys(records[0]).filter(k => k !== "_id" && k !== "__v");
    const csvRows = [headers.join(",")];

    for (const record of records) {
        const row = headers.map(h => {
            let val = record[h];
            if (val === null || val === undefined) val = "";
            if (val instanceof Date) val = val.toISOString();
            if (typeof val === "object") val = JSON.stringify(val);
            // Escape commas and quotes for CSV
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        csvRows.push(row.join(","));
    }

    return csvRows.join("\n") + "\n";
};

/**
 * Grace Period Logic
 * After subscription expires, orgs get 90 days before data deletion.
 * During grace period: read-only access, export still available.
 * After grace period: data is permanently deleted.
 */
export const GRACE_PERIOD_DAYS = 90;

export const isInGracePeriod = (subscription) => {
    if (!subscription || !subscription.expiresAt) return false;
    const expiryDate = new Date(subscription.expiresAt);
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);
    const now = new Date();
    return now > expiryDate && now <= gracePeriodEnd;
};

export const isGracePeriodExpired = (subscription) => {
    if (!subscription || !subscription.expiresAt) return false;
    const expiryDate = new Date(subscription.expiresAt);
    const gracePeriodEnd = new Date(expiryDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);
    return new Date() > gracePeriodEnd;
};
