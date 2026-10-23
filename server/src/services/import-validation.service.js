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
import ImportBatch from "../models/ImportBatch.js";
import connectDB from "../lib/mongodb.js";

/**
 * Import Validation Service — Pre-Upload Validation Layer
 * 
 * Before committing a bulk import (students/faculty), this service:
 *   1. Validates every row for required fields
 *   2. Detects duplicate emails/phones within the upload AND existing DB
 *   3. Flags invalid roles, malformed DOBs, etc.
 *   4. Returns a validation report (can be used as "dry run")
 *   5. If committed, creates an ImportBatch for rollback capability
 */

/**
 * Validate a batch of staff/student records before import
 * @param {Array} rows - Array of { name, email, phone, role, ... } objects
 * @param {string} orgId - Organization ID
 * @param {string} importType - "students" or "faculty"
 * @returns {Object} - Validation report
 */
export const validateImportBatch = async (rows, orgId, importType) => {
    await connectDB();

    const validRows = [];
    const invalidRows = [];
    const duplicateRows = [];

    const VALID_ROLES = [
        // Core Academic & Students
        "student", "parent", "teacher", "faculty", "professor", "asst_professor", "lecturer", "instructor", "lab_assistant",
        // Leadership & Admin
        "org_admin", "principal", "vice_principal", "headmaster", "dean", "director", "center_head", "hod",
        // Department Managers
        "exam_controller", "test_series_manager", "fee_manager", "hr_manager", 
        // Admissions
        "admission_head", "admission_verifier", "admission_counselor", "admission_clerk",
        // Operations & Compliance
        "library_manager", "transport_manager", "hostel_warden", "canteen_manager", "nba_naac_coordinator",
        // Specialized
        "tpo_officer", "counselor", "coordinator", "batch_coordinator"
    ];

    // Collect all emails/phones from the upload to detect intra-batch duplicates
    const seenEmails = new Map();
    const seenPhones = new Map();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 because row 1 is headers, data starts at row 2
        const errors = [];

        // --- Required Field Validation ---
        if (!row.name || row.name.trim().length < 2) {
            errors.push("Name is required (min 2 chars)");
        }
        if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            errors.push("Valid email is required");
        }

        // --- Role Validation ---
        if (importType === "faculty" && row.role) {
            const normalizedRole = row.role.toLowerCase().trim().replace(/\s+/g, "_");
            if (!VALID_ROLES.includes(normalizedRole)) {
                errors.push(`Invalid role '${row.role}'. Valid: ${VALID_ROLES.join(", ")}`);
            }
        }

        // --- DOB Validation ---
        if (row.dob) {
            const parsedDob = new Date(row.dob);
            if (isNaN(parsedDob.getTime())) {
                errors.push(`Invalid date of birth: ${row.dob}`);
            }
        }

        // --- Intra-Batch Duplicate Check ---
        if (row.email) {
            const lowerEmail = row.email.toLowerCase().trim();
            if (seenEmails.has(lowerEmail)) {
                duplicateRows.push({
                    row_number: rowNum,
                    data: row,
                    conflict_field: "email",
                    existing_record_id: null,
                    note: `Duplicate email in upload (same as row ${seenEmails.get(lowerEmail)})`
                });
                continue;
            }
            seenEmails.set(lowerEmail, rowNum);
        }

        if (row.phone) {
            const cleanPhone = row.phone.replace(/\D/g, "");
            if (cleanPhone && seenPhones.has(cleanPhone)) {
                duplicateRows.push({
                    row_number: rowNum,
                    data: row,
                    conflict_field: "phone",
                    existing_record_id: null,
                    note: `Duplicate phone in upload (same as row ${seenPhones.get(cleanPhone)})`
                });
                continue;
            }
            if (cleanPhone) seenPhones.set(cleanPhone, rowNum);
        }

        if (errors.length > 0) {
            invalidRows.push({ row_number: rowNum, data: row, error: errors.join("; ") });
        } else {
            validRows.push({ ...row, _rowNum: rowNum });
        }
    }

    // --- Cross-Check Against Existing DB Records ---
    const emailList = validRows.map(r => r.email?.toLowerCase().trim()).filter(Boolean);
    const existingByEmail = await User.find({
        email: { $in: emailList },
        organization_id: orgId,
    }).select("_id email name").lean();

    const existingEmailMap = new Map(existingByEmail.map(u => [u.email, u]));

    const finalValid = [];
    for (const row of validRows) {
        const email = row.email?.toLowerCase().trim();
        if (existingEmailMap.has(email)) {
            const existing = existingEmailMap.get(email);
            duplicateRows.push({
                row_number: row._rowNum,
                data: row,
                conflict_field: "email",
                existing_record_id: existing._id,
                note: `Already exists in database as '${existing.name}'`
            });
        } else {
            delete row._rowNum;
            finalValid.push(row);
        }
    }

    return {
        total_rows: rows.length,
        valid_count: finalValid.length,
        invalid_count: invalidRows.length,
        duplicate_count: duplicateRows.length,
        valid_rows: finalValid,
        invalid_rows: invalidRows,
        duplicate_rows: duplicateRows,
        can_commit: invalidRows.length === 0 && duplicateRows.length === 0,
    };
};

/**
 * Rollback a committed import batch
 * @param {string} batchId - ImportBatch ID
 * @param {string} adminId - User ID of the admin performing rollback
 * @returns {Object} - Rollback result
 */
export const rollbackImportBatch = async (batchId, adminId) => {
    await connectDB();

    const batch = await ImportBatch.findById(batchId);
    if (!batch) throw new Error("Import batch not found.");
    if (batch.status === "rolled_back") throw new Error("This import has already been rolled back.");
    if (batch.status === "dry_run") throw new Error("Cannot rollback a dry run — no records were created.");

    // Delete all records created by this import
    const deleteResult = await User.deleteMany({
        _id: { $in: batch.created_record_ids },
    });

    // Update batch status
    batch.status = "rolled_back";
    batch.rolled_back_at = new Date();
    batch.rolled_back_by = adminId;
    await batch.save();

    return {
        batch_id: batchId,
        records_deleted: deleteResult.deletedCount,
        rolled_back_at: batch.rolled_back_at,
    };
};

/**
 * Generate an error CSV string for download
 * @param {Array} failedRows - Array of { row_number, data, error }
 * @returns {string} - CSV content
 */
export const generateErrorCsv = (failedRows) => {
    if (!failedRows || failedRows.length === 0) return "No errors found.\n";

    const allKeys = new Set();
    failedRows.forEach(r => {
        if (r.data && typeof r.data === "object") {
            Object.keys(r.data).forEach(k => allKeys.add(k));
        }
    });

    const dataHeaders = [...allKeys];
    const headers = ["Row Number", ...dataHeaders, "Error"];
    const csvRows = [headers.join(",")];

    for (const row of failedRows) {
        const values = [
            row.row_number,
            ...dataHeaders.map(h => `"${String(row.data?.[h] || "").replace(/"/g, '""')}"`),
            `"${String(row.error || row.note || "").replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(","));
    }

    return csvRows.join("\n") + "\n";
};
