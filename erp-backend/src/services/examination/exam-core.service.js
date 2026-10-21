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

import Exam from "../../models/Exam.js";
import AcademicHierarchy from "../../models/AcademicHierarchy.js";

// ══════════════════════════════════════════════════════════════════════════════
// EXAM CORE SERVICE — Pure CRUD business logic for the Exam master documents.
// No grading, no results, no routes. Just clean, testable functions.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new Exam document after validating the hierarchy target and marks.
 *
 * @param {Object} examData - The exam payload from the request body.
 * @param {string} orgId    - The organization ID (tenant isolation).
 * @param {string} facultyId - The creating faculty's User._id.
 * @returns {Promise<Object>} The saved Exam document.
 */
export async function createExam(examData, orgId, facultyId) {
    const {
        title,
        description,
        date,
        duration_minutes,
        subject_id,
        hierarchy_id,
        max_marks,
        passing_marks,
        status,
    } = examData;

    // ── Mandatory field checks ──
    if (!title || !title.trim()) {
        throw new Error("Exam title is required.");
    }
    if (!date) {
        throw new Error("Exam date is required.");
    }
    if (!duration_minutes || duration_minutes < 1) {
        throw new Error("Duration must be at least 1 minute.");
    }
    if (!subject_id) {
        throw new Error("Subject ID is required.");
    }
    if (!hierarchy_id) {
        throw new Error("Hierarchy ID (target classroom DNA) is required.");
    }
    if (!max_marks || max_marks < 1) {
        throw new Error("Max marks must be at least 1.");
    }
    if (passing_marks == null || passing_marks < 0) {
        throw new Error("Passing marks must be 0 or greater.");
    }
    if (passing_marks > max_marks) {
        throw new Error("Passing marks cannot exceed max marks.");
    }

    // ── Validate the hierarchy node belongs to this org ──
    const hierarchyNode = await AcademicHierarchy.findOne({
        _id: hierarchy_id,
        organization_id: orgId,
        is_active: true,
    }).lean();

    if (!hierarchyNode) {
        throw new Error(
            "Invalid hierarchy_id. The target classroom does not exist or does not belong to this organization."
        );
    }

    // ── Create and save ──
    const exam = new Exam({
        title: title.trim(),
        description: description?.trim() || "",
        date: new Date(date),
        duration_minutes,
        subject_id,
        faculty_id: facultyId,
        hierarchy_id,
        organization_id: orgId,
        max_marks,
        passing_marks,
        status: status || "draft",
    });

    const saved = await exam.save();
    return saved.toObject();
}

/**
 * Returns all exams created by a specific faculty member,
 * populated with the AcademicHierarchy details so the UI
 * knows exactly which 4x2 DNA classes the tests belong to.
 *
 * @param {string} facultyId - The faculty User._id.
 * @param {string} orgId     - Tenant isolation.
 * @param {Object} [filters] - Optional filters { status, subject_id }.
 * @returns {Promise<Array>}  Array of Exam documents.
 */
export async function getExamsByFaculty(facultyId, orgId, filters = {}) {
    if (!facultyId) {
        throw new Error("Faculty ID is required.");
    }

    const query = {
        faculty_id: facultyId,
        organization_id: orgId,
    };

    if (filters.status) query.status = filters.status;
    if (filters.subject_id) query.subject_id = filters.subject_id;

    const exams = await Exam.find(query)
        .populate("hierarchy_id", "name code level_type parent_id")
        .populate("subject_id", "name code")
        .sort({ date: -1 })
        .lean();

    return exams;
}

/**
 * Returns exams targeted at any of the student's hierarchy node IDs.
 * A student may belong to multiple hierarchy levels (e.g., a Division
 * AND its parent Semester AND its parent Department). This function
 * matches exams assigned to ANY of those nodes.
 *
 * @param {string[]} studentHierarchyIds - Array of AcademicHierarchy._id values
 *                                         the student is enrolled in (all ancestors included).
 * @param {string}   orgId               - Tenant isolation.
 * @param {Object}   [filters]           - Optional { status }.
 * @returns {Promise<Array>}             Array of Exam documents.
 */
export async function getExamsByStudent(studentHierarchyIds, orgId, filters = {}) {
    if (!Array.isArray(studentHierarchyIds) || studentHierarchyIds.length === 0) {
        throw new Error("At least one hierarchy ID is required to look up student exams.");
    }

    const query = {
        hierarchy_id: { $in: studentHierarchyIds },
        organization_id: orgId,
    };

    // By default, students should only see scheduled/active/completed exams
    if (filters.status) {
        query.status = filters.status;
    } else {
        query.status = { $in: ["scheduled", "active", "completed"] };
    }

    const exams = await Exam.find(query)
        .populate("hierarchy_id", "name code level_type parent_id")
        .populate("subject_id", "name code")
        .populate("faculty_id", "name email")
        .sort({ date: -1 })
        .lean();

    return exams;
}

/**
 * Fetches a single exam by ID with full population.
 * Validates tenant isolation.
 *
 * @param {string} examId - The Exam._id.
 * @param {string} orgId  - Tenant isolation.
 * @returns {Promise<Object>} The Exam document.
 */
export async function getExamById(examId, orgId) {
    if (!examId) throw new Error("Exam ID is required.");

    const exam = await Exam.findOne({ _id: examId, organization_id: orgId })
        .populate("hierarchy_id", "name code level_type parent_id")
        .populate("subject_id", "name code")
        .populate("faculty_id", "name email")
        .lean();

    if (!exam) {
        throw new Error("Exam not found or does not belong to this organization.");
    }

    return exam;
}

/**
 * Updates an existing Exam document.
 * Only allows updates when the exam is in "draft" or "scheduled" status.
 *
 * @param {string} examId    - The Exam._id.
 * @param {Object} updates   - The fields to update.
 * @param {string} orgId     - Tenant isolation.
 * @param {string} facultyId - The requesting faculty (ownership check).
 * @returns {Promise<Object>} The updated Exam document.
 */
export async function updateExam(examId, updates, orgId, facultyId) {
    const exam = await Exam.findOne({ _id: examId, organization_id: orgId });

    if (!exam) {
        throw new Error("Exam not found or does not belong to this organization.");
    }

    if (exam.faculty_id.toString() !== facultyId) {
        throw new Error("Only the exam creator can modify this exam.");
    }

    if (!["draft", "scheduled"].includes(exam.status)) {
        throw new Error(`Cannot update an exam in "${exam.status}" status. Only draft or scheduled exams can be modified.`);
    }

    // If hierarchy_id is being changed, validate the new node
    if (updates.hierarchy_id && updates.hierarchy_id !== exam.hierarchy_id.toString()) {
        const node = await AcademicHierarchy.findOne({
            _id: updates.hierarchy_id,
            organization_id: orgId,
            is_active: true,
        }).lean();

        if (!node) {
            throw new Error("Invalid hierarchy_id. The target classroom does not exist.");
        }
    }

    // Guard marks integrity
    if (updates.passing_marks != null && updates.max_marks != null) {
        if (updates.passing_marks > updates.max_marks) {
            throw new Error("Passing marks cannot exceed max marks.");
        }
    } else if (updates.passing_marks != null && updates.passing_marks > exam.max_marks) {
        throw new Error("Passing marks cannot exceed max marks.");
    }

    // Apply safe updates
    const ALLOWED_FIELDS = [
        "title", "description", "date", "duration_minutes",
        "subject_id", "hierarchy_id", "max_marks", "passing_marks", "status",
    ];

    for (const field of ALLOWED_FIELDS) {
        if (updates[field] !== undefined) {
            exam[field] = updates[field];
        }
    }

    const saved = await exam.save();
    return saved.toObject();
}

/**
 * Soft-deletes (or hard-deletes) an exam.
 * Only allows deletion when the exam is in "draft" status.
 *
 * @param {string} examId    - The Exam._id.
 * @param {string} orgId     - Tenant isolation.
 * @param {string} facultyId - Ownership check.
 * @returns {Promise<{ deleted: boolean, examId: string }>}
 */
export async function deleteExam(examId, orgId, facultyId) {
    const exam = await Exam.findOne({ _id: examId, organization_id: orgId });

    if (!exam) {
        throw new Error("Exam not found or does not belong to this organization.");
    }

    if (exam.faculty_id.toString() !== facultyId) {
        throw new Error("Only the exam creator can delete this exam.");
    }

    if (exam.status !== "draft") {
        throw new Error(`Cannot delete an exam in "${exam.status}" status. Only draft exams can be deleted.`);
    }

    await Exam.deleteOne({ _id: examId });

    return { deleted: true, examId };
}

/**
 * Returns all exams for an organization (admin-level), optionally filtered.
 * Used by the Examination Department Dashboard.
 *
 * @param {string} orgId     - Tenant isolation.
 * @param {Object} [filters] - { status, hierarchy_id, subject_id, date_from, date_to }.
 * @returns {Promise<Array>}  Array of Exam documents.
 */
export async function getExamsByOrganization(orgId, filters = {}) {
    const query = { organization_id: orgId };

    if (filters.status) query.status = filters.status;
    if (filters.hierarchy_id) query.hierarchy_id = filters.hierarchy_id;
    if (filters.subject_id) query.subject_id = filters.subject_id;

    if (filters.date_from || filters.date_to) {
        query.date = {};
        if (filters.date_from) query.date.$gte = new Date(filters.date_from);
        if (filters.date_to) query.date.$lte = new Date(filters.date_to);
    }

    const exams = await Exam.find(query)
        .populate("hierarchy_id", "name code level_type parent_id")
        .populate("subject_id", "name code")
        .populate("faculty_id", "name email")
        .sort({ date: -1 })
        .lean();

    return exams;
}
