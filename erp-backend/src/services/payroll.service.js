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

import FacultyBiometricLog from "../models/FacultyBiometricLog.js";
import FacultyPayroll from "../models/FacultyPayroll.js";
import User from "../models/User.js";

/**
 * Normalizes logs to pair IN and OUT events.
 * Assumes logs are sorted by timestamp ASC.
 */
function calculateHoursForDay(logs) {
    let totalMs = 0;
    let lastIn = null;

    for (const log of logs) {
        if (log.log_type === "IN" || log.log_type === "UNKNOWN") {
            // UNKNOWN acts as IN if we don't have a state, or OUT if we do
            if (!lastIn) {
                lastIn = new Date(log.timestamp);
            } else if (log.log_type === "UNKNOWN") {
                // If it's UNKNOWN and we already have an IN, treat it as an OUT
                const outTime = new Date(log.timestamp);
                totalMs += (outTime - lastIn);
                lastIn = null;
            }
        } else if (log.log_type === "OUT") {
            if (lastIn) {
                const outTime = new Date(log.timestamp);
                totalMs += (outTime - lastIn);
                lastIn = null;
            }
        }
    }

    // Convert ms to hours
    return totalMs / (1000 * 60 * 60);
}

/**
 * Generate Payroll for a specific month (format: YYYY-MM)
 */
export const generatePayrollForMonth = async (orgId, monthString) => {
    // 1. Boundary dates
    const [year, month] = monthString.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1)); // First day of next month

    // Total working days in month (rough approx: weekdays only)
    // To be precise we need to count Monday-Friday
    let totalWorkingDays = 0;
    for (let d = new Date(startDate); d < endDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const dayOfWeek = d.getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday/Saturday
            totalWorkingDays++;
        }
    }

    // 2. Fetch all faculty
    const facultyMembers = await User.find({
        organization_id: orgId,
        role: { $in: ["faculty", "teacher", "org_admin"] },
        status: "active"
    });

    const payrollResults = [];

    for (const faculty of facultyMembers) {
        // Find biometric logs
        const logs = await FacultyBiometricLog.find({
            organization: orgId,
            faculty: faculty._id,
            timestamp: { $gte: startDate, $lt: endDate }
        }).sort({ timestamp: 1 });

        // Group by day String "YYYY-MM-DD"
        const logsByDay = {};
        for (const log of logs) {
            const dateKey = log.timestamp.toISOString().split("T")[0];
            if (!logsByDay[dateKey]) logsByDay[dateKey] = [];
            logsByDay[dateKey].push(log);
        }

        let presentDays = Object.keys(logsByDay).length;
        let totalHoursWorked = 0;

        for (const [dateKey, dayLogs] of Object.entries(logsByDay)) {
            const hours = calculateHoursForDay(dayLogs);
            totalHoursWorked += hours;
        }

        const absentDays = Math.max(0, totalWorkingDays - presentDays); 
        // Note: Actual implementation would query LeaveRequest to find approved leaves.

        const payrollConfig = faculty.payroll_config || { salary_mode: "none", hourly_rate: 0, base_monthly_salary: 0 };
        let grossSalary = 0;

        if (payrollConfig.salary_mode === "hourly") {
            grossSalary = totalHoursWorked * (payrollConfig.hourly_rate || 0);
        } else if (payrollConfig.salary_mode === "monthly") {
            const baseSalary = payrollConfig.base_monthly_salary || 0;
            // Salary calculation: (Base / Working Days) * (Present Days + Approved Paid Leaves).
            // Simplified formula:
            const dailyRate = totalWorkingDays > 0 ? (baseSalary / totalWorkingDays) : 0;
            grossSalary = dailyRate * presentDays; 
        }

        let netSalary = grossSalary; // Minus deductions (Tax, PF) omitted for now.

        // Upsert the Payroll record
        const payrollRecord = await FacultyPayroll.findOneAndUpdate(
            { organization: orgId, faculty: faculty._id, month: monthString },
            {
                total_working_days: totalWorkingDays,
                present_days: presentDays,
                absent_days: absentDays,
                leaves_taken: 0, // Placeholder
                total_hours_worked: totalHoursWorked,
                gross_salary: grossSalary,
                deductions: 0,
                net_salary: netSalary,
            },
            { returnDocument: 'after', upsert: true }
        );

        payrollResults.push(payrollRecord);

        // Mark logs as processed sequentially
        await FacultyBiometricLog.updateMany(
            { _id: { $in: logs.map(l => l._id) } },
            { $set: { processed: true } }
        );
    }

    return payrollResults;
};
