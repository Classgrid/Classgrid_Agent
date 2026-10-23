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

import User from '../../models/User.js';
import StudentMark from '../../models/StudentMark.js';
import AttendanceSession from '../../models/AttendanceSession.js';
import AttendanceRecord from '../../models/AttendanceRecord.js';
import FeeRecord from '../../models/FeeRecord.js';
import Timetable from '../../models/Timetable.js';
import Classroom from '../../models/Classroom.js';
import FeedbackResponse from '../../models/FeedbackResponse.js';
import NotePackage from '../../models/NotePackage.js';
import mongoose from 'mongoose';

/**
 * audit.service.js (MODULE 24 — REBUILT)
 * 
 * NAAC / NBA Auto-Data Auditor — Real Aggregation Pipeline
 * Pulls LIVE data from all Classgrid modules to auto-generate
 * the 7-criteria NAAC self-study report data.
 * 
 * NAAC Criteria:
 *   1. Curricular Aspects
 *   2. Teaching-Learning & Evaluation
 *   3. Research, Innovations & Extension
 *   4. Infrastructure & Learning Resources
 *   5. Student Support & Progression
 *   6. Governance, Leadership & Management
 *   7. Institutional Values & Best Practices
 */

// ═══════════════════════════════════════════════════════════════════
// CRITERION 2: Teaching-Learning & Evaluation
// ═══════════════════════════════════════════════════════════════════

/**
 * Aggregate academic results per classroom for pass rate analysis.
 */
async function getAcademicPerformance(orgId, startDate, endDate) {
    const results = await StudentMark.aggregate([
        {
            $match: {
                organization_id: new mongoose.Types.ObjectId(orgId),
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }
        },
        {
            $group: {
                _id: "$classroom",
                totalStudents: { $sum: 1 },
                passedStudents: { $sum: { $cond: ["$isPassed", 1, 0] } },
                avgPercentage: { $avg: "$percentage" },
                avgCGPA: { $avg: "$cgpa" },
                highestScore: { $max: "$percentage" },
                lowestScore: { $min: "$percentage" },
            }
        },
        {
            $lookup: {
                from: "classrooms",
                localField: "_id",
                foreignField: "_id",
                as: "classroomInfo"
            }
        },
        { $unwind: { path: "$classroomInfo", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                classroomName: "$classroomInfo.name",
                totalStudents: 1,
                passedStudents: 1,
                passRate: {
                    $cond: [
                        { $gt: ["$totalStudents", 0] },
                        { $multiply: [{ $divide: ["$passedStudents", "$totalStudents"] }, 100] },
                        0
                    ]
                },
                avgPercentage: { $round: ["$avgPercentage", 2] },
                avgCGPA: { $round: ["$avgCGPA", 2] },
                highestScore: 1,
                lowestScore: 1
            }
        },
        { $sort: { passRate: -1 } }
    ]);

    return results;
}

/**
 * Subject-wise failure analysis for Criterion 2.
 */
async function getSubjectWiseFailure(orgId, startDate, endDate) {
    const failures = await StudentMark.aggregate([
        {
            $match: {
                organization_id: new mongoose.Types.ObjectId(orgId),
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }
        },
        { $unwind: "$subjectMarks" },
        {
            $group: {
                _id: "$subjectMarks.subjectName",
                totalAttempts: { $sum: 1 },
                totalFailed: {
                    $sum: {
                        $cond: [
                            { $lt: [
                                { $divide: ["$subjectMarks.marksObtained", "$subjectMarks.maxMarks"] },
                                0.4 // 40% passing threshold
                            ] },
                            1, 0
                        ]
                    }
                },
                avgScore: { $avg: { $multiply: [{ $divide: ["$subjectMarks.marksObtained", "$subjectMarks.maxMarks"] }, 100] } }
            }
        },
        {
            $project: {
                subjectName: "$_id",
                totalAttempts: 1,
                totalFailed: 1,
                failureRate: {
                    $cond: [
                        { $gt: ["$totalAttempts", 0] },
                        { $round: [{ $multiply: [{ $divide: ["$totalFailed", "$totalAttempts"] }, 100] }, 2] },
                        0
                    ]
                },
                avgScore: { $round: ["$avgScore", 2] }
            }
        },
        { $sort: { failureRate: -1 } }
    ]);

    return failures;
}

// ═══════════════════════════════════════════════════════════════════
// CRITERION 2 (cont.): Attendance Analysis
// ═══════════════════════════════════════════════════════════════════

async function getAttendanceStats(orgId, startDate, endDate) {
    const records = await AttendanceRecord.aggregate([
        {
            $lookup: {
                from: "attendancesessions",
                localField: "session",
                foreignField: "_id",
                as: "sessionInfo"
            }
        },
        { $unwind: "$sessionInfo" },
        {
            $match: {
                "sessionInfo.organization_id": new mongoose.Types.ObjectId(orgId),
                "sessionInfo.date": { $gte: new Date(startDate), $lte: new Date(endDate) }
            }
        },
        {
            $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                presentCount: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
                absentCount: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
                lateCount: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
            }
        },
        {
            $project: {
                totalRecords: 1,
                presentCount: 1,
                absentCount: 1,
                lateCount: 1,
                overallAttendanceRate: {
                    $cond: [
                        { $gt: ["$totalRecords", 0] },
                        { $round: [{ $multiply: [{ $divide: [{ $add: ["$presentCount", "$lateCount"] }, "$totalRecords"] }, 100] }, 2] },
                        0
                    ]
                }
            }
        }
    ]);

    return records[0] || { totalRecords: 0, presentCount: 0, absentCount: 0, lateCount: 0, overallAttendanceRate: 0 };
}

// ═══════════════════════════════════════════════════════════════════
// CRITERION 6: Faculty Workload from Timetable
// ═══════════════════════════════════════════════════════════════════

async function getFacultyWorkload(orgId) {
    // Calculate weekly hours per faculty from timetable
    const timetableEntries = await Timetable.find({ organization: orgId }).lean();

    const facultyMap = {};

    for (const entry of timetableEntries) {
        const key = entry.teacher || entry.user?.toString() || "Unassigned";

        if (!facultyMap[key]) {
            facultyMap[key] = {
                name: entry.teacher || "Unassigned",
                totalSlots: 0,
                totalHoursPerWeek: 0,
                subjects: new Set(),
                lectureCount: 0,
                labCount: 0,
            };
        }

        // Parse time to calculate hours
        const [startH, startM] = (entry.startTime || "0:0").split(":").map(Number);
        const [endH, endM] = (entry.endTime || "0:0").split(":").map(Number);
        const durationHours = (endH * 60 + endM - startH * 60 - startM) / 60;

        facultyMap[key].totalSlots += 1;
        facultyMap[key].totalHoursPerWeek += Math.max(0, durationHours);
        facultyMap[key].subjects.add(entry.subject);

        if (entry.type === "Lab") facultyMap[key].labCount += 1;
        else facultyMap[key].lectureCount += 1;
    }

    // Convert Set to Array for JSON
    return Object.values(facultyMap).map(f => ({
        ...f,
        subjects: Array.from(f.subjects),
        totalHoursPerWeek: Math.round(f.totalHoursPerWeek * 100) / 100,
    })).sort((a, b) => b.totalHoursPerWeek - a.totalHoursPerWeek);
}

// ═══════════════════════════════════════════════════════════════════
// CRITERION 5: Financial Audit (Fee Collection vs Outstanding)
// ═══════════════════════════════════════════════════════════════════

async function getFinancialAudit(orgId, startDate, endDate) {
    const feeStats = await FeeRecord.aggregate([
        {
            $match: {
                organizationId: new mongoose.Types.ObjectId(orgId),
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }
        },
        {
            $group: {
                _id: "$category",
                totalDemanded: { $sum: "$amount" },
                totalCollected: { $sum: "$paidAmount" },
                totalRecords: { $sum: 1 },
                paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
                overdueCount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
                pendingCount: { $sum: { $cond: [{ $in: ["$status", ["pending", "partially_paid"]] }, 1, 0] } },
            }
        },
        {
            $project: {
                category: "$_id",
                totalDemanded: 1,
                totalCollected: 1,
                outstanding: { $subtract: ["$totalDemanded", "$totalCollected"] },
                collectionRate: {
                    $cond: [
                        { $gt: ["$totalDemanded", 0] },
                        { $round: [{ $multiply: [{ $divide: ["$totalCollected", "$totalDemanded"] }, 100] }, 2] },
                        0
                    ]
                },
                totalRecords: 1,
                paidCount: 1,
                overdueCount: 1,
                pendingCount: 1,
            }
        },
        { $sort: { outstanding: -1 } }
    ]);

    // Overall totals
    const totals = feeStats.reduce((acc, cat) => ({
        totalDemanded: acc.totalDemanded + cat.totalDemanded,
        totalCollected: acc.totalCollected + cat.totalCollected,
        outstanding: acc.outstanding + cat.outstanding,
    }), { totalDemanded: 0, totalCollected: 0, outstanding: 0 });

    return { byCategory: feeStats, totals };
}

// ═══════════════════════════════════════════════════════════════════
// ENROLLMENT STATISTICS
// ═══════════════════════════════════════════════════════════════════

async function getEnrollmentStats(orgId, startDate, endDate) {
    const query = {
        organization_id: new mongoose.Types.ObjectId(orgId),
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    const totalStudents = await User.countDocuments({ organization_id: orgId, role: 'student', status: 'active' });
    const totalFaculty = await User.countDocuments({ organization_id: orgId, role: { $in: ['faculty', 'teacher'] }, status: 'active' });
    const newEnrollments = await User.countDocuments({ ...query, role: 'student' });
    const totalClassrooms = await Classroom.countDocuments({ organization: orgId });

    const studentFacultyRatio = totalFaculty > 0 ? Math.round(totalStudents / totalFaculty) : 0;

    return {
        totalStudents,
        totalFaculty,
        newEnrollments,
        totalClassrooms,
        studentFacultyRatio: `${studentFacultyRatio}:1`,
    };
}

// ═══════════════════════════════════════════════════════════════════
// MARKETPLACE & LEARNING RESOURCES (Criterion 4)
// ═══════════════════════════════════════════════════════════════════

async function getLearningResourcesAudit(orgId, startDate, endDate) {
    const marketplaceRevenue = await NotePackage.aggregate([
        { $match: { orgId: new mongoose.Types.ObjectId(orgId), createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
        { $group: { _id: null, totalRevenue: { $sum: "$price" }, salesCount: { $sum: "$stats.sales" }, packageCount: { $sum: 1 } } }
    ]);

    return {
        marketplaceRevenue: marketplaceRevenue[0]?.totalRevenue || 0,
        salesCount: marketplaceRevenue[0]?.salesCount || 0,
        totalPackages: marketplaceRevenue[0]?.packageCount || 0,
    };
}

// ═══════════════════════════════════════════════════════════════════
// MASTER EXPORT: generateAuditData
// ═══════════════════════════════════════════════════════════════════

/**
 * generateAuditData
 * Master aggregation function — pulls real data from all modules.
 * 
 * @param {string} orgId      Organization ObjectId
 * @param {string} startDate  ISO date string
 * @param {string} endDate    ISO date string
 * @param {object} options    { criteria: [2,5,6] } — selective criterion generation
 * @returns {object}          Complete audit data object
 */
export const generateAuditData = async (orgId, startDate, endDate, options = {}) => {
    try {
        const selectedCriteria = options.criteria || [1, 2, 3, 4, 5, 6, 7]; // Default: all

        const data = {
            orgId,
            period: { startDate, endDate },
            generatedAt: new Date().toISOString(),
        };

        // Always fetch enrollment stats
        data.enrollment = await getEnrollmentStats(orgId, startDate, endDate);

        // Criterion 2: Teaching-Learning & Evaluation
        if (selectedCriteria.includes(2)) {
            data.criterion2 = {
                academicPerformance: await getAcademicPerformance(orgId, startDate, endDate),
                subjectWiseFailure: await getSubjectWiseFailure(orgId, startDate, endDate),
                attendance: await getAttendanceStats(orgId, startDate, endDate),
            };
        }

        // Criterion 4: Infrastructure & Learning Resources
        if (selectedCriteria.includes(4)) {
            data.criterion4 = {
                learningResources: await getLearningResourcesAudit(orgId, startDate, endDate),
            };
        }

        // Criterion 5: Student Support (Financial)
        if (selectedCriteria.includes(5)) {
            data.criterion5 = {
                financialAudit: await getFinancialAudit(orgId, startDate, endDate),
            };
        }

        // Criterion 6: Governance (Faculty Workload)
        if (selectedCriteria.includes(6)) {
            data.criterion6 = {
                facultyWorkload: await getFacultyWorkload(orgId),
            };
        }

        // Backward compat: flatten stats for existing PDF template
        data.stats = {
            totalStudents: data.enrollment.totalStudents,
            totalFaculty: data.enrollment.totalFaculty,
            newEnrollments: data.enrollment.newEnrollments,
            avgAttendance: data.criterion2?.attendance?.overallAttendanceRate
                ? `${data.criterion2.attendance.overallAttendanceRate}%`
                : "N/A",
            revenue: {
                marketplace: data.criterion4?.learningResources?.marketplaceRevenue || 0,
                salesCount: data.criterion4?.learningResources?.salesCount || 0,
            },
        };

        return data;
    } catch (err) {
        console.error("[Audit Service] Aggregation Error:", err);
        throw err;
    }
};

/**
 * generateCriterionReport
 * Generates data for a single NAAC criterion.
 */
export const generateCriterionReport = async (orgId, startDate, endDate, criterionNumber) => {
    return generateAuditData(orgId, startDate, endDate, { criteria: [criterionNumber] });
};
