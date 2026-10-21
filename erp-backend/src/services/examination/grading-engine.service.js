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
import ExamResult from "../../models/ExamResult.js";

// ══════════════════════════════════════════════════════════════════════════════
// GRADING ENGINE SERVICE — Core business logic for processing and storing
// student exam results. Handles single entry, bulk entry, and result feeds.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Submits or updates a grade for a single student on a specific exam.
 * Validates the marks against the exam configuration and automatically
 * calculates the pass/fail status.
 *
 * @param {string} examId        - The Exam._id.
 * @param {string} studentId     - The student User._id.
 * @param {number|null} obtainedMarks - The marks obtained (or null/absent string for absent).
 * @param {string} remarks       - Optional faculty remarks.
 * @param {string} facultyId     - The requesting faculty User._id (for validation).
 * @returns {Promise<Object>}    The saved ExamResult document.
 */
export async function submitStudentGrade(examId, studentId, obtainedMarks, remarks, facultyId) {
    if (!examId || !studentId || !facultyId) {
        throw new Error("examId, studentId, and facultyId are required.");
    }

    // 1. Fetch the exam to validate ownership and constraints
    const exam = await Exam.findById(examId).lean();
    if (!exam) {
        throw new Error("Exam not found.");
    }

    // Ensure only the creator (or an admin, though we assume faculty here) can grade
    if (exam.faculty_id.toString() !== facultyId.toString()) {
        throw new Error("Only the exam creator can submit grades for this exam.");
    }

    // 2. Determine status and validate marks
    let status = "absent";
    let numericMarks = 0;

    // Check for absent inputs
    const isAbsent = obtainedMarks === null || 
                     obtainedMarks === undefined || 
                     String(obtainedMarks).toLowerCase() === "absent" || 
                     String(obtainedMarks).toLowerCase() === "ab";

    if (!isAbsent) {
        numericMarks = Number(obtainedMarks);
        if (isNaN(numericMarks) || numericMarks < 0) {
            throw new Error(`Invalid marks provided for student ${studentId}.`);
        }
        if (numericMarks > exam.max_marks) {
            throw new Error(`Obtained marks (${numericMarks}) cannot exceed exam maximum marks (${exam.max_marks}).`);
        }
        
        status = numericMarks >= exam.passing_marks ? "pass" : "fail";
    }

    // 3. Upsert the result (Create if not exists, Update if exists)
    const resultDoc = await ExamResult.findOneAndUpdate(
        {
            exam_id: examId,
            student_id: studentId,
        },
        {
            organization_id: exam.organization_id, // Inherit from exam
            obtained_marks: isAbsent ? 0 : numericMarks,
            status,
            faculty_remarks: remarks?.trim() || "",
        },
        {
            returnDocument: 'after',
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true,
        }
    );

    return resultDoc.toObject();
}

/**
 * Mass submits grades for an entire batch using MongoDB bulkWrite for performance.
 * 
 * @param {string} examId        - The Exam._id.
 * @param {Array} gradesArray    - Array of { studentId, obtainedMarks, remarks }.
 * @param {string} facultyId     - The requesting faculty User._id.
 * @returns {Promise<Object>}    Result of the bulkWrite operation.
 */
export async function bulkSubmitGrades(examId, gradesArray, facultyId) {
    if (!examId || !facultyId) {
        throw new Error("examId and facultyId are required.");
    }
    if (!Array.isArray(gradesArray) || gradesArray.length === 0) {
        throw new Error("gradesArray must be a non-empty array.");
    }

    // 1. Fetch exam configuration
    const exam = await Exam.findById(examId).lean();
    if (!exam) {
        throw new Error("Exam not found.");
    }
    if (exam.faculty_id.toString() !== facultyId.toString()) {
        throw new Error("Only the exam creator can submit grades for this exam.");
    }

    // 2. Prepare bulk operations
    const bulkOps = [];
    const errors = [];

    for (let i = 0; i < gradesArray.length; i++) {
        const { studentId, obtainedMarks, remarks } = gradesArray[i];

        if (!studentId) {
            errors.push(`Row ${i + 1}: Missing studentId.`);
            continue;
        }

        let status = "absent";
        let numericMarks = 0;

        const isAbsent = obtainedMarks === null || 
                         obtainedMarks === undefined || 
                         String(obtainedMarks).toLowerCase() === "absent" || 
                         String(obtainedMarks).toLowerCase() === "ab";

        if (!isAbsent) {
            numericMarks = Number(obtainedMarks);
            if (isNaN(numericMarks) || numericMarks < 0) {
                errors.push(`Row ${i + 1}: Invalid marks for student ${studentId}.`);
                continue;
            }
            if (numericMarks > exam.max_marks) {
                errors.push(`Row ${i + 1}: Marks (${numericMarks}) exceed maximum (${exam.max_marks}).`);
                continue;
            }
            status = numericMarks >= exam.passing_marks ? "pass" : "fail";
        }

        bulkOps.push({
            updateOne: {
                filter: { exam_id: examId, student_id: studentId },
                update: {
                    $set: {
                        organization_id: exam.organization_id,
                        obtained_marks: isAbsent ? 0 : numericMarks,
                        status,
                        faculty_remarks: remarks?.trim() || "",
                    }
                },
                upsert: true
            }
        });
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed for some records:\n${errors.join("\n")}`);
    }

    if (bulkOps.length === 0) {
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    // 3. Execute bulkWrite
    const bulkResult = await ExamResult.bulkWrite(bulkOps, { ordered: false });
    
    return {
        matchedCount: bulkResult.matchedCount,
        modifiedCount: bulkResult.modifiedCount,
        upsertedCount: bulkResult.upsertedCount,
        totalProcessed: bulkOps.length
    };
}

/**
 * Returns all student results for a specific exam.
 * Used by Faculty and Admins to view the completed gradebook.
 *
 * @param {string} examId - The Exam._id.
 * @param {string} orgId  - Tenant isolation.
 * @returns {Promise<Array>} Array of populated ExamResult documents.
 */
export async function getExamResults(examId, orgId) {
    if (!examId || !orgId) {
        throw new Error("examId and orgId are required.");
    }

    const results = await ExamResult.find({
        exam_id: examId,
        organization_id: orgId
    })
    .populate("student_id", "name email prn roll_no profilePicture")
    .populate({
        path: "exam_id",
        select: "title date max_marks passing_marks duration_minutes status"
    })
    .sort({ "student_id.name": 1 }) // Sort by student name alphabetically
    .lean();

    return results;
}

/**
 * Returns all graded exams for a specific student.
 * Heavily populates the Exam details to build the Student Report Card UI.
 *
 * @param {string} studentId - The student User._id.
 * @param {string} orgId     - Tenant isolation.
 * @returns {Promise<Array>}   Array of populated ExamResult documents.
 */
export async function getStudentResultsFeed(studentId, orgId) {
    if (!studentId || !orgId) {
        throw new Error("studentId and orgId are required.");
    }

    const results = await ExamResult.find({
        student_id: studentId,
        organization_id: orgId
    })
    .populate({
        path: "exam_id",
        populate: [
            { path: "subject_id", select: "name code" },
            { path: "faculty_id", select: "name" },
            { path: "hierarchy_id", select: "name level_type" }
        ]
    })
    .sort({ createdAt: -1 }) // Newest results first
    .lean();

    // Filter out results where the exam is still in 'draft' or 'scheduled' 
    // (In case grades were entered early but exam isn't published yet)
    // Depending on business logic, we might only want to show 'completed' exams.
    const visibleResults = results.filter(res => 
        res.exam_id && 
        ["active", "completed", "archived"].includes(res.exam_id.status)
    );

    return visibleResults;
}
