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

import * as XLSX from "xlsx";
import User from "../models/User.js";
import ClassroomMembership from "../models/ClassroomMembership.js";

// ──────────────────────────────────────────────────────────
// 📊 MARKS SERVICE — Excel parsing, PRN matching, analytics
// ──────────────────────────────────────────────────────────

// ── Fuzzy keyword lists for column detection ──
const PRN_KEYWORDS = ["prn", "roll", "enrollment", "student id", "roll no", "roll number", "rollno", "rollnumber", "id", "reg", "registration", "enroll"];
const MARKS_KEYWORDS = ["marks", "score", "total", "obtained", "marks obtained", "result", "mark", "scored"];
const NAME_KEYWORDS = ["name", "student name", "full name", "student"];

/**
 * Parse an Excel file buffer → extract headers + data rows.
 * Returns { headers: string[], rows: object[], sheetName: string } or throws.
 */
export function parseExcelFile(buffer, originalName = "") {
    try {
        const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error("Excel file has no sheets");
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            throw new Error("Could not read the first sheet");
        }

        // Convert to JSON (each row is an object with header keys)
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
            throw new Error("Excel file has no data rows");
        }

        if (rawRows.length > 500) {
            throw new Error("Excel file has too many rows (max 500). Please split the file.");
        }

        const headers = Object.keys(rawRows[0]);

        return {
            headers,
            rows: rawRows,
            sheetName,
            totalRows: rawRows.length,
            fileName: originalName,
        };
    } catch (err) {
        if (err.message.includes("sheets") || err.message.includes("data rows") || err.message.includes("too many")) {
            throw err; // Re-throw our own errors
        }
        throw new Error("Invalid Excel file. Please upload a valid .xlsx or .xls file.");
    }
}

/**
 * Auto-detect which columns are PRN, Name, and Marks.
 * Returns { prnColumn, nameColumn, marksColumn } or null for undetected.
 */
export function autoDetectColumns(headers) {
    const result = { prnColumn: null, nameColumn: null, marksColumn: null };

    for (const header of headers) {
        const h = header.toLowerCase().trim();

        // PRN detection
        if (!result.prnColumn) {
            for (const kw of PRN_KEYWORDS) {
                if (h === kw || h.includes(kw)) {
                    result.prnColumn = header;
                    break;
                }
            }
        }

        // Name detection
        if (!result.nameColumn) {
            for (const kw of NAME_KEYWORDS) {
                if (h === kw || h.includes(kw)) {
                    result.nameColumn = header;
                    break;
                }
            }
        }

        // Marks detection
        if (!result.marksColumn) {
            for (const kw of MARKS_KEYWORDS) {
                if (h === kw || h.includes(kw)) {
                    result.marksColumn = header;
                    break;
                }
            }
        }
    }

    return result;
}

/**
 * Normalize a PRN value for comparison.
 * Trims, lowercases, strips leading zeros, removes common prefixes.
 */
export function normalizePRN(prn) {
    if (!prn) return "";
    let val = String(prn).trim().toLowerCase();
    // Remove common prefixes
    val = val.replace(/^(prn[-_\s]?|roll[-_\s]?|reg[-_\s]?|enr[-_\s]?)/i, "");
    // Strip leading zeros
    val = val.replace(/^0+/, "") || "0";
    return val;
}

/**
 * Match Excel rows to classroom students by PRN.
 * Returns { matched: [], unmatched: [], duplicates: [] }
 */
export async function mapStudentsToExcel(rows, prnColumn, marksColumn, nameColumn, classroomId, orgId) {
    // 1. Get all approved students in this classroom
    const memberships = await ClassroomMembership.find({
        classroom: classroomId,
        status: "approved",
    }).select("student").lean();

    const studentIds = memberships.map(m => m.student);
    const students = await User.find({
        _id: { $in: studentIds },
        organization_id: orgId,
    }).select("_id name email prn").lean();

    // 2. Build normalized PRN → student lookup
    const prnMap = new Map();
    for (const student of students) {
        if (student.prn) {
            const normalized = normalizePRN(student.prn);
            prnMap.set(normalized, student);
        }
    }

    // 3. Match each Excel row
    const matched = [];
    const unmatched = [];
    const duplicates = [];
    const seenPRNs = new Set();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawPRN = row[prnColumn];
        const marks = parseFloat(row[marksColumn]);
        const name = nameColumn ? row[nameColumn] : "";

        if (!rawPRN && rawPRN !== 0) {
            unmatched.push({ rowIndex: i + 1, rawPRN: "(empty)", name, marks, reason: "No PRN value" });
            continue;
        }

        const normalizedPRN = normalizePRN(rawPRN);

        // Check for duplicate PRN in Excel
        if (seenPRNs.has(normalizedPRN)) {
            duplicates.push({ rowIndex: i + 1, rawPRN: String(rawPRN), name, marks, reason: "Duplicate PRN in Excel" });
            continue;
        }
        seenPRNs.add(normalizedPRN);

        // Check marks validity
        if (isNaN(marks)) {
            unmatched.push({ rowIndex: i + 1, rawPRN: String(rawPRN), name, marks: row[marksColumn], reason: "Invalid marks value" });
            continue;
        }

        // Find matching student
        const student = prnMap.get(normalizedPRN);
        if (!student) {
            unmatched.push({ rowIndex: i + 1, rawPRN: String(rawPRN), name, marks, reason: "No matching student found" });
            continue;
        }

        matched.push({
            rowIndex: i + 1,
            rawPRN: String(rawPRN),
            studentId: student._id,
            studentName: student.name,
            studentEmail: student.email,
            studentPRN: student.prn,
            marksObtained: marks,
            name: name || student.name,
        });
    }

    return { matched, unmatched, duplicates, totalStudentsInClass: students.length };
}

/**
 * Calculate grade from percentage.
 */
export function calculateGrade(percentage) {
    if (percentage >= 90) return "A";
    if (percentage >= 75) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 45) return "D";
    return "F";
}

/**
 * Assign ranks to marks array (sorted by marksObtained descending).
 * Handles ties — same marks = same rank.
 */
export function assignRanks(marks) {
    // Sort by marks descending
    const sorted = [...marks].sort((a, b) => b.marksObtained - a.marksObtained);

    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i].marksObtained === sorted[i - 1].marksObtained) {
            sorted[i].rank = sorted[i - 1].rank; // Same rank for ties
        } else {
            sorted[i].rank = currentRank;
        }
        currentRank++;
    }

    return sorted;
}

/**
 * Calculate class analytics from an array of marks.
 * Returns the analytics object to store in ExamRecord.
 */
export function calculateAnalytics(marksArray, totalMarks, passingMarks = 0) {
    if (!marksArray || marksArray.length === 0) {
        return {
            classAverage: 0, classMedian: 0, highest: 0, lowest: 0,
            passCount: 0, failCount: 0, passPercentage: 0,
            standardDeviation: 0,
            gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        };
    }

    const scores = marksArray.map(m => m.marksObtained);
    const n = scores.length;

    // Sort for median
    const sorted = [...scores].sort((a, b) => a - b);

    // Basic stats
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / n;
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];
    const highest = sorted[n - 1];
    const lowest = sorted[0];

    // Standard deviation
    const variance = scores.reduce((acc, s) => acc + Math.pow(s - average, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    // Pass/fail (use passingMarks if set, else 45% of total)
    const passThreshold = passingMarks > 0 ? passingMarks : totalMarks * 0.45;
    const passCount = scores.filter(s => s >= passThreshold).length;
    const failCount = n - passCount;
    const passPercentage = Math.round((passCount / n) * 100);

    // Grade distribution
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const score of scores) {
        const pct = (score / totalMarks) * 100;
        const grade = calculateGrade(pct);
        gradeDistribution[grade]++;
    }

    return {
        classAverage: Math.round(average * 100) / 100,
        classMedian: Math.round(median * 100) / 100,
        highest,
        lowest,
        passCount,
        failCount,
        passPercentage,
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        gradeDistribution,
    };
}
