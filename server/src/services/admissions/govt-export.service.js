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

import AdmissionApplication from "../../models/AdmissionApplication.js";
import CETAllotment from "../../models/CETAllotment.js";
import Organization from "../../models/Organization.js";
import { getEngineeringAicteId, getEngineeringInstituteCode } from "./admission-engine.helpers.js";

/**
 * govt-export.service.js — Government CSV Export Engine
 * 
 * Generates compliance-ready CSV data for Maharashtra state govt submissions.
 * 
 * Supported Formats:
 *   1. DTE (Directorate of Technical Education) — Engineering colleges
 *   2. SARAL (Simplified Application for Registration & Academic Listing) — Schools
 *   3. AICTE (All India Council for Technical Education) — National reporting
 */

// ─── DTE MAHARASHTRA CSV COLUMNS ───
const DTE_COLUMNS = [
    "Sr.No", "EN Number", "Candidate Name", "Gender", "Category",
    "Candidature Type", "Seat Type", "MHT-CET Score", "Merit No",
    "Institute Code", "Branch Name", "Choice Code", "CAP Round",
    "Admission Date", "PRN", "Division", "Roll Number",
    "RLA Status", "Fee Paid", "Status"
];

// ─── SARAL SCHOOL CSV COLUMNS ───
const SARAL_COLUMNS = [
    "Sr.No", "Student Name", "Father Name", "Mother Name",
    "Date of Birth", "Gender", "Category", "Caste",
    "Aadhaar Number", "Contact Number", "Email",
    "Previous School", "Standard", "Division", "Roll Number",
    "Admission Date", "Status"
];

/**
 * Escapes a CSV field — handles commas, quotes, and newlines.
 * @param {*} value 
 * @returns {string}
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Converts an array of objects into a CSV string.
 * @param {Array<string>} headers 
 * @param {Array<Array<string>>} rows 
 * @returns {string}
 */
function toCSV(headers, rows) {
    const headerLine = headers.map(escapeCSV).join(",");
    const dataLines = rows.map(row => row.map(escapeCSV).join(","));
    return [headerLine, ...dataLines].join("\n");
}

/**
 * Generate DTE Maharashtra export CSV.
 * Used by Engineering colleges for government compliance reporting.
 * 
 * @param {string} orgId 
 * @param {Object} filters - { cap_round, status, academic_year }
 * @returns {Promise<{ csv: string, count: number, filename: string }>}
 */
export async function generateDTEExport(orgId, filters = {}) {
    const org = await Organization.findById(orgId).select("name admission_config").lean();
    const instituteCode = getEngineeringInstituteCode(org) || "UNKNOWN";

    // Build query
    const query = { organization_id: orgId, is_deleted: false };
    if (filters.status) query.status = filters.status;
    if (filters.cap_round) query["form_data.cap_round"] = filters.cap_round;

    const applications = await AdmissionApplication.find(query)
        .sort({ en_number: 1 })
        .lean();

    // Enrich with CET allotment data
    const enNumbers = applications.filter(a => a.en_number).map(a => a.en_number);
    const allotments = await CETAllotment.find({
        organization_id: orgId,
        en_number: { $in: enNumbers }
    }).lean();
    const allotmentMap = {};
    for (const a of allotments) {
        allotmentMap[a.en_number] = a;
    }

    const rows = applications.map((app, idx) => {
        const cet = allotmentMap[app.en_number] || {};
        return [
            idx + 1,                                          // Sr.No
            app.en_number || "",                              // EN Number
            app.full_name || "",                              // Candidate Name
            app.form_data?.gender || "",                      // Gender
            app.category || cet.category || "",               // Category
            cet.candidature_type || "",                       // Candidature Type
            app.seat_type || cet.seat_type || "",             // Seat Type
            cet.mht_cet_score != null ? cet.mht_cet_score : "",    // MHT-CET Score
            cet.merit_number || "",                                  // Merit No
            instituteCode,                                    // Institute Code
            cet.branch_name || app.form_data?.branch_allotted || "", // Branch Name
            cet.choice_code || "",                            // Choice Code
            app.form_data?.cap_round || cet.cap_round || "",  // CAP Round
            app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "", // Admission Date
            app.prn || "",                                    // PRN
            app.form_data?.assigned_division || "",           // Division
            app.form_data?.assigned_roll_number || "",        // Roll Number
            app.rla_status || "pending",                      // RLA Status
            app.fee_paid ? "Yes" : "No",                      // Fee Paid
            app.status || ""                                  // Status
        ];
    });

    const academicYear = filters.academic_year || `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
    const filename = `DTE_Export_${instituteCode}_${academicYear}.csv`;

    return {
        csv: toCSV(DTE_COLUMNS, rows),
        count: rows.length,
        filename
    };
}

/**
 * Generate SARAL School format export CSV.
 * Used by Schools for Maharashtra SARAL portal compliance.
 * 
 * @param {string} orgId 
 * @param {Object} filters - { standard, status }
 * @returns {Promise<{ csv: string, count: number, filename: string }>}
 */
export async function generateSARALExport(orgId, filters = {}) {
    const org = await Organization.findById(orgId).select("name").lean();

    const query = { organization_id: orgId, is_deleted: false };
    if (filters.status) query.status = filters.status;
    if (filters.standard) query["form_data.standard_applying"] = filters.standard;

    const applications = await AdmissionApplication.find(query)
        .sort({ full_name: 1 })
        .lean();

    const rows = applications.map((app, idx) => {
        const fd = app.form_data || {};
        return [
            idx + 1,                                                 // Sr.No
            app.full_name || "",                                     // Student Name
            fd.family?.father?.full_name || fd.father_name || fd.parent_name || "",                  // Father Name
            fd.family?.mother?.full_name || fd.mother_name || "",                                    // Mother Name
            app.dob ? new Date(app.dob).toLocaleDateString("en-IN") : "", // DOB
            fd.personal_details?.gender || fd.gender || "",                                         // Gender
            app.category || fd.category || fd.personal_details?.category || "",                       // Category
            fd.personal_details?.caste || fd.caste || "",                                          // Caste
            fd.personal_details?.aadhar_no || fd.aadhar_no || "",                                      // Aadhaar
            app.phone || "",                                         // Contact Number
            app.email || "",                                         // Email
            fd.previous_education?.[0]?.institution_name || fd.previous_school || "",                                // Previous School
            fd.standard_applying || "",                              // Standard
            fd.assigned_division || "",                               // Division
            fd.assigned_roll_number || "",                            // Roll Number
            app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "", // Admission Date
            app.status || ""                                          // Status
        ];
    });

    const filename = `SARAL_Export_${org?.name || "School"}_${new Date().getFullYear()}.csv`;

    return {
        csv: toCSV(SARAL_COLUMNS, rows),
        count: rows.length,
        filename
    };
}

// ─── AICTE NATIONAL CSV COLUMNS ───
const AICTE_COLUMNS = [
    "Sr.No", "AICTE Permanent ID", "Institute Name", "State",
    "EN Number", "Student Name", "Gender", "Category", "PWD Status",
    "Admission Type", "Branch/Course", "Seat Type",
    "Year of Admission", "PRN/Enrollment No", "Date of Birth",
    "Contact Number", "Email", "Status"
];

/**
 * Generate AICTE National format export CSV.
 * Used by Engineering/Diploma colleges for annual AICTE compliance.
 * 
 * @param {string} orgId 
 * @param {Object} filters - { status, academic_year }
 * @returns {Promise<{ csv: string, count: number, filename: string }>}
 */
export async function generateAICTEExport(orgId, filters = {}) {
    const org = await Organization.findById(orgId).select("name admission_config").lean();
    const aicteId = getEngineeringAicteId(org);
    const instituteCode = getEngineeringInstituteCode(org) || "UNKNOWN";

    const query = { organization_id: orgId, is_deleted: false };
    if (filters.status) query.status = filters.status;

    const applications = await AdmissionApplication.find(query)
        .sort({ en_number: 1, full_name: 1 })
        .lean();

    const rows = applications.map((app, idx) => {
        const fd = app.form_data || {};
        return [
            idx + 1,                                             // Sr.No
            aicteId,                                             // AICTE Permanent ID
            org?.name || "",                                     // Institute Name
            "Maharashtra",                                       // State
            app.en_number || "",                                  // EN Number
            app.full_name || "",                                  // Student Name
            fd.gender || "",                                      // Gender
            app.category || "",                                   // Category
            fd.pwd_status || "No",                                // PWD Status
            app.en_number ? "CAP" : "Direct",                    // Admission Type
            fd.branch_name || fd.branch_allotted || fd.stream_applying || "",       // Branch/Course
            app.seat_type || "",                                  // Seat Type
            filters.academic_year || `${new Date().getFullYear()}`, // Year of Admission
            app.prn || "",                                        // PRN/Enrollment No
            app.dob ? new Date(app.dob).toLocaleDateString("en-IN") : "", // DOB
            app.phone || "",                                      // Contact
            app.email || "",                                      // Email
            app.status || ""                                      // Status
        ];
    });

    const academicYear = filters.academic_year || `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;
    const filename = `AICTE_Export_${instituteCode}_${academicYear}.csv`;

    return {
        csv: toCSV(AICTE_COLUMNS, rows),
        count: rows.length,
        filename
    };
}

export default {
    generateDTEExport,
    generateSARALExport,
    generateAICTEExport,
    generateStateBoardExport,
};

// ─── STATE BOARD (Junior College / HSC) CSV COLUMNS ───
// Used for Maharashtra State Board HSC admission compliance reporting.
const STATE_BOARD_COLUMNS = [
    "Sr.No", "Student Name", "Father Name", "Mother Name",
    "Date of Birth", "Gender", "Category", "Caste",
    "Aadhaar Number", "Contact Number", "Email",
    "10th Board", "10th Seat No", "10th % / CGPA", "10th Passing Year",
    "Stream Applied", "Seat Type",
    "Division", "Roll Number",
    "Admission Date", "Merit Score", "Status"
];

/**
 * Generate Maharashtra State Board (HSC / Junior College) admission export CSV.
 * Used by Junior Colleges for state compliance reporting.
 *
 * Handles Best-of-5 computed merit:
 *   - If subjects array is present in previous_education, picks top 5 subject marks.
 *   - Falls back to flat 10th_percentage field if subjects array is absent.
 *
 * @param {string} orgId
 * @param {Object} filters - { stream, standard, status }
 * @returns {Promise<{ csv: string, count: number, filename: string }>}
 */
export async function generateStateBoardExport(orgId, filters = {}) {
    const org = await Organization.findById(orgId).select("name").lean();

    const query = { organization_id: orgId, is_deleted: false };
    if (filters.status) query.status = filters.status;
    if (filters.stream) query["form_data.stream_applying"] = filters.stream;
    if (filters.standard) query["form_data.standard_applying"] = filters.standard;

    const applications = await AdmissionApplication.find(query)
        .sort({ merit_score: -1, full_name: 1 })
        .lean();

    const rows = applications.map((app, idx) => {
        const fd = app.form_data || {};

        // ── Best-of-5 Subject Merit Calculation ──
        // Try to read from the structured previous_education array first (10th level entry).
        let tenthPercent = fd["10th_percentage"] || fd.previous_percentage || app.merit_score || 0;
        let tenthBoard = fd["10th_board"] || "STATE";
        let tenthSeatNo = "";
        let tenthYear = "";

        if (Array.isArray(fd.previous_education)) {
            const tenthRecord = fd.previous_education.find(e => e.level === "10th");
            if (tenthRecord) {
                tenthBoard = tenthRecord.board_name || tenthBoard;
                tenthSeatNo = tenthRecord.seat_number || "";
                tenthYear = tenthRecord.passing_year || "";

                // If subject-level marks exist, compute Best-of-5
                if (Array.isArray(tenthRecord.subjects) && tenthRecord.subjects.length > 0) {
                    const validSubjects = tenthRecord.subjects
                        .filter(s => s.marks_obtained !== undefined && s.max_marks > 0)
                        .sort((a, b) =>
                            (b.marks_obtained / b.max_marks) - (a.marks_obtained / a.max_marks)
                        )
                        .slice(0, 5);

                    if (validSubjects.length === 5) {
                        const totalObtained = validSubjects.reduce((sum, s) => sum + s.marks_obtained, 0);
                        const totalMax = validSubjects.reduce((sum, s) => sum + s.max_marks, 0);
                        tenthPercent = Math.round((totalObtained / totalMax) * 10000) / 100; // 2 decimal precision
                    }
                } else if (tenthRecord.percentage_or_cgpa) {
                    tenthPercent = tenthRecord.percentage_or_cgpa;
                }
            }
        }

        return [
            idx + 1,                                                                // Sr.No
            app.full_name || "",                                                    // Student Name
            fd.father_name || fd.father_full_name || "",                            // Father Name
            fd.mother_name || fd.mother_full_name || "",                            // Mother Name
            app.dob ? new Date(app.dob).toLocaleDateString("en-IN") : "",           // DOB
            fd.gender || "",                                                        // Gender
            app.category || fd.category || "",                                      // Category
            fd.caste || "",                                                         // Caste
            fd.aadhar_number || fd.aadhar_no || "",                                // Aadhaar
            app.phone || "",                                                        // Contact
            app.email || "",                                                        // Email
            tenthBoard,                                                             // 10th Board
            tenthSeatNo,                                                            // 10th Seat No
            tenthPercent,                                                           // 10th % / CGPA
            tenthYear,                                                              // 10th Passing Year
            fd.stream_applying || "",                                               // Stream Applied
            app.seat_type || "GENERAL",                                            // Seat Type
            fd.assigned_division || "",                                             // Division
            fd.assigned_roll_number || "",                                          // Roll Number
            app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "", // Admission Date
            app.merit_score || tenthPercent,                                        // Merit Score
            app.status || ""                                                        // Status
        ];
    });

    const filename = `StateBoardHSC_Export_${org?.name || "JuniorCollege"}_${new Date().getFullYear()}.csv`;

    return {
        csv: toCSV(STATE_BOARD_COLUMNS, rows),
        count: rows.length,
        filename
    };
}
