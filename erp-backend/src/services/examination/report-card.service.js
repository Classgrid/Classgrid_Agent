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
import User from "../../models/User.js";
import AcademicHierarchy from "../../models/AcademicHierarchy.js";

// ══════════════════════════════════════════════════════════════════════════════
// REPORT CARD ENGINE SERVICE — Complex aggregation logic for the Examination module.
// Generates cumulative student report cards and master batch reports.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Standard utility to determine grade based on percentage.
 * @param {number} percentage 
 * @returns {string} Grade (A+, A, B+, B, C, D, F)
 */
function calculateGrade(percentage) {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    if (percentage >= 40) return "D";
    return "F";
}

/**
 * Generates a comprehensive report card for a single student across a specific hierarchy term.
 * Fetches all exams for the hierarchy, pairs them with the student's results, 
 * and computes the cumulative statistics.
 *
 * @param {string} studentId   - The student's User._id.
 * @param {string} hierarchyId - The AcademicHierarchy._id (e.g., Sem 1, Class 10).
 * @param {string} orgId       - Tenant isolation.
 * @returns {Promise<Object>}    Structured JSON report card data.
 */
export async function generateStudentReportCard(studentId, hierarchyId, orgId) {
    if (!studentId || !hierarchyId || !orgId) {
        throw new Error("studentId, hierarchyId, and orgId are required.");
    }

    // 1. Fetch student info and target hierarchy details
    const [student, hierarchy] = await Promise.all([
        User.findOne({ _id: studentId, organization_id: orgId }).select("name prn roll_no profilePicture").lean(),
        AcademicHierarchy.findOne({ _id: hierarchyId, organization_id: orgId }).select("name level_type").lean()
    ]);

    if (!student) throw new Error("Student not found.");
    if (!hierarchy) throw new Error("Hierarchy (Classroom target) not found.");

    // 2. Fetch all completed/active exams for this hierarchy
    const exams = await Exam.find({
        hierarchy_id: hierarchyId,
        organization_id: orgId,
        status: { $in: ["completed", "active"] } // Exclude draft/scheduled
    })
    .populate("subject_id", "name code")
    .lean();

    if (!exams.length) {
        return {
            student,
            hierarchy,
            summary: { total_exams: 0, max_marks: 0, obtained_marks: 0, percentage: 0, overall_grade: "N/A", status: "N/A" },
            subject_details: []
        };
    }

    const examIds = exams.map(e => e._id);

    // 3. Fetch the student's results for these exams
    const results = await ExamResult.find({
        student_id: studentId,
        exam_id: { $in: examIds },
        organization_id: orgId
    }).lean();

    // Index results by exam_id for O(1) lookup
    const resultMap = results.reduce((acc, res) => {
        acc[res.exam_id.toString()] = res;
        return acc;
    }, {});

    // 4. Calculate overarching stats
    let totalMaxMarks = 0;
    let totalObtainedMarks = 0;
    let hasFailedAnySubject = false;
    const subjectDetails = [];

    for (const exam of exams) {
        const result = resultMap[exam._id.toString()];
        const obtained = result ? result.obtained_marks : 0;
        const status = result ? result.status : "absent";
        const remarks = result ? result.faculty_remarks : "";

        if (status === "fail" || status === "absent") {
            hasFailedAnySubject = true;
        }

        totalMaxMarks += exam.max_marks;
        totalObtainedMarks += obtained;

        subjectDetails.push({
            exam_id: exam._id,
            subject_name: exam.subject_id?.name || "Unknown",
            subject_code: exam.subject_id?.code || "",
            exam_title: exam.title,
            exam_date: exam.date,
            max_marks: exam.max_marks,
            passing_marks: exam.passing_marks,
            obtained_marks: obtained,
            status: status,
            remarks: remarks,
            is_absent: status === "absent"
        });
    }

    const percentage = totalMaxMarks > 0 ? (totalObtainedMarks / totalMaxMarks) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 100) / 100;

    const summary = {
        total_exams: exams.length,
        max_marks: totalMaxMarks,
        obtained_marks: totalObtainedMarks,
        percentage: roundedPercentage,
        overall_grade: hasFailedAnySubject ? "F" : calculateGrade(roundedPercentage),
        status: hasFailedAnySubject ? "FAIL" : "PASS"
    };

    return {
        student,
        hierarchy,
        summary,
        subject_details: subjectDetails
    };
}

/**
 * Generates a master analytical report for an entire batch/division.
 * Aggregates results across all exams in the hierarchy to find batch averages,
 * top rankers, and students requiring intervention (failures).
 *
 * @param {string} hierarchyId - The AcademicHierarchy._id representing the batch.
 * @param {string} orgId       - Tenant isolation.
 * @returns {Promise<Object>}    Structured JSON batch report data.
 */
export async function generateBatchReport(hierarchyId, orgId) {
    if (!hierarchyId || !orgId) {
        throw new Error("hierarchyId and orgId are required.");
    }

    const hierarchy = await AcademicHierarchy.findOne({ _id: hierarchyId, organization_id: orgId }).select("name level_type").lean();
    if (!hierarchy) throw new Error("Hierarchy (Batch target) not found.");

    // 1. Fetch all relevant exams
    const exams = await Exam.find({
        hierarchy_id: hierarchyId,
        organization_id: orgId,
        status: { $in: ["completed", "active"] }
    }).lean();

    if (!exams.length) {
        return {
            hierarchy,
            total_exams: 0,
            total_students_evaluated: 0,
            batch_average_percentage: 0,
            pass_rate: 0,
            top_ranker: null,
            at_risk_students: []
        };
    }

    const examIds = exams.map(e => e._id);
    const totalMaxMarksPossible = exams.reduce((sum, e) => sum + e.max_marks, 0);

    // 2. Fetch ALL results for these exams
    const allResults = await ExamResult.find({
        exam_id: { $in: examIds },
        organization_id: orgId
    }).lean();

    // 3. Group results by Student
    const studentMap = {}; // studentId -> { total_obtained, failed_exams_count }
    const uniqueStudentIds = new Set();

    for (const res of allResults) {
        const sid = res.student_id.toString();
        uniqueStudentIds.add(sid);

        if (!studentMap[sid]) {
            studentMap[sid] = { total_obtained: 0, failed_exams_count: 0, is_absent_count: 0 };
        }

        studentMap[sid].total_obtained += (res.obtained_marks || 0);
        
        if (res.status === "fail") {
            studentMap[sid].failed_exams_count += 1;
        }
        if (res.status === "absent") {
            studentMap[sid].is_absent_count += 1;
        }
    }

    if (uniqueStudentIds.size === 0) {
        return {
            hierarchy,
            total_exams: exams.length,
            total_students_evaluated: 0,
            batch_average_percentage: 0,
            pass_rate: 0,
            top_ranker: null,
            at_risk_students: []
        };
    }

    // 4. Calculate batch metrics and identify toppers / failures
    let batchTotalObtained = 0;
    let passedStudentsCount = 0;
    let highestPercentage = -1;
    let topRankerId = null;
    
    // Convert to array for sorting and processing
    const studentStatsArray = [];

    for (const [sid, stats] of Object.entries(studentMap)) {
        batchTotalObtained += stats.total_obtained;
        
        const percentage = (stats.total_obtained / totalMaxMarksPossible) * 100;
        stats.percentage = Math.round(percentage * 100) / 100;
        stats.student_id = sid;
        
        // Pass condition: Did not fail any exam and was not absent
        const passedAll = stats.failed_exams_count === 0 && stats.is_absent_count === 0;
        if (passedAll) passedStudentsCount += 1;

        if (passedAll && stats.percentage > highestPercentage) {
            highestPercentage = stats.percentage;
            topRankerId = sid;
        }

        studentStatsArray.push(stats);
    }

    const batchAveragePercentage = (batchTotalObtained / (uniqueStudentIds.size * totalMaxMarksPossible)) * 100;
    const passRate = (passedStudentsCount / uniqueStudentIds.size) * 100;

    // Isolate at-risk students (failed at least one exam)
    const atRiskIds = studentStatsArray
        .filter(s => s.failed_exams_count > 0 || s.is_absent_count > 0)
        .map(s => s.student_id);

    // 5. Fetch user data to populate the report payload
    let topRankerInfo = null;
    let atRiskStudentsInfo = [];

    if (topRankerId || atRiskIds.length > 0) {
        const usersToFetch = new Set(atRiskIds);
        if (topRankerId) usersToFetch.add(topRankerId);

        const users = await User.find({
            _id: { $in: Array.from(usersToFetch) }
        }).select("name prn roll_no profilePicture").lean();

        const userLookup = users.reduce((acc, u) => {
            acc[u._id.toString()] = u;
            return acc;
        }, {});

        if (topRankerId && userLookup[topRankerId]) {
            topRankerInfo = {
                ...userLookup[topRankerId],
                percentage: highestPercentage
            };
        }

        atRiskStudentsInfo = atRiskIds.map(id => {
            const u = userLookup[id];
            const stat = studentMap[id];
            return {
                student_id: id,
                name: u?.name || "Unknown",
                prn: u?.prn || "",
                roll_no: u?.roll_no || "",
                percentage: stat.percentage,
                failed_exams_count: stat.failed_exams_count,
                is_absent_count: stat.is_absent_count
            };
        });
    }

    return {
        hierarchy,
        total_exams: exams.length,
        total_students_evaluated: uniqueStudentIds.size,
        batch_average_percentage: Math.round(batchAveragePercentage * 100) / 100,
        pass_rate: Math.round(passRate * 100) / 100,
        top_ranker: topRankerInfo,
        at_risk_students: atRiskStudentsInfo
    };
}
