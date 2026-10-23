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

import express from 'express';
import { isAuthenticated, requireRole } from '../middleware/auth.middleware.js';
import { generateAuditData, generateCriterionReport } from '../services/ai/audit.service.js';
import puppeteer from 'puppeteer';

const router = express.Router();

const isAdmin = requireRole('org_admin', 'super_admin');

// ═══════════════════════════════════════════════════════════════════
// MODULE 24: NAAC / NBA Auto-Data Auditor Pipeline
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/audit/data
 * Returns raw JSON audit data (for frontend dashboard rendering)
 * Query: ?startDate=2025-06-01&endDate=2026-05-31&criteria=2,5,6
 */
router.get('/data', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { startDate, endDate, criteria } = req.query;
        const orgId = req.user.organization_id;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start and end dates are required" });
        }

        const options = {};
        if (criteria) {
            options.criteria = criteria.split(",").map(Number).filter(n => n >= 1 && n <= 7);
        }

        const auditData = await generateAuditData(orgId, startDate, endDate, options);
        res.json({ success: true, data: auditData });
    } catch (err) {
        console.error("[Audit Route] Data Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/audit/criterion/:number
 * Returns audit data for a single NAAC criterion
 */
router.get('/criterion/:number', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const criterionNumber = parseInt(req.params.number);
        const orgId = req.user.organization_id;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start and end dates are required" });
        }

        if (criterionNumber < 1 || criterionNumber > 7) {
            return res.status(400).json({ error: "Criterion number must be between 1 and 7" });
        }

        const report = await generateCriterionReport(orgId, startDate, endDate, criterionNumber);
        res.json({ success: true, criterion: criterionNumber, data: report });
    } catch (err) {
        console.error("[Audit Route] Criterion Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/audit/export/csv
 * Exports audit data as a CSV file for government upload portals
 */
router.get('/export/csv', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const orgId = req.user.organization_id;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start and end dates are required" });
        }

        const auditData = await generateAuditData(orgId, startDate, endDate);

        // Build CSV from academic performance data
        const rows = [
            ["NAAC Auto-Generated Audit Report"],
            [`Organization ID: ${orgId}`],
            [`Period: ${startDate} to ${endDate}`],
            [`Generated: ${auditData.generatedAt}`],
            [],
            ["=== ENROLLMENT STATISTICS ==="],
            ["Metric", "Value"],
            ["Total Students", auditData.enrollment.totalStudents],
            ["Total Faculty", auditData.enrollment.totalFaculty],
            ["New Enrollments (Period)", auditData.enrollment.newEnrollments],
            ["Student-Faculty Ratio", auditData.enrollment.studentFacultyRatio],
            ["Total Classrooms", auditData.enrollment.totalClassrooms],
            [],
            ["=== ATTENDANCE OVERVIEW ==="],
            ["Overall Attendance Rate (%)", auditData.stats.avgAttendance],
        ];

        // Academic Performance per Classroom
        if (auditData.criterion2?.academicPerformance?.length > 0) {
            rows.push(
                [],
                ["=== ACADEMIC PERFORMANCE (Criterion 2) ==="],
                ["Classroom", "Total Students", "Passed", "Pass Rate (%)", "Avg %", "Avg CGPA"]
            );
            auditData.criterion2.academicPerformance.forEach(c => {
                rows.push([
                    c.classroomName || c._id,
                    c.totalStudents,
                    c.passedStudents,
                    Math.round(c.passRate * 100) / 100,
                    c.avgPercentage,
                    c.avgCGPA || "N/A"
                ]);
            });
        }

        // Subject-wise Failure
        if (auditData.criterion2?.subjectWiseFailure?.length > 0) {
            rows.push(
                [],
                ["=== SUBJECT-WISE FAILURE ANALYSIS ==="],
                ["Subject", "Total Attempts", "Failures", "Failure Rate (%)", "Avg Score (%)"]
            );
            auditData.criterion2.subjectWiseFailure.forEach(s => {
                rows.push([s.subjectName, s.totalAttempts, s.totalFailed, s.failureRate, s.avgScore]);
            });
        }

        // Financial Audit
        if (auditData.criterion5?.financialAudit?.byCategory?.length > 0) {
            rows.push(
                [],
                ["=== FINANCIAL AUDIT (Criterion 5) ==="],
                ["Category", "Demanded (₹)", "Collected (₹)", "Outstanding (₹)", "Collection Rate (%)"]
            );
            auditData.criterion5.financialAudit.byCategory.forEach(f => {
                rows.push([f.category, f.totalDemanded, f.totalCollected, f.outstanding, f.collectionRate]);
            });
            const t = auditData.criterion5.financialAudit.totals;
            rows.push(["TOTAL", t.totalDemanded, t.totalCollected, t.outstanding, ""]);
        }

        // Faculty Workload
        if (auditData.criterion6?.facultyWorkload?.length > 0) {
            rows.push(
                [],
                ["=== FACULTY WORKLOAD (Criterion 6) ==="],
                ["Faculty Name", "Weekly Hours", "Lectures", "Labs", "Subjects"]
            );
            auditData.criterion6.facultyWorkload.forEach(f => {
                rows.push([f.name, f.totalHoursPerWeek, f.lectureCount, f.labCount, f.subjects.join("; ")]);
            });
        }

        // Convert to CSV string
        const csvContent = rows.map(row =>
            row.map(cell => {
                const str = String(cell ?? "");
                return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(",")
        ).join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=NAAC_Audit_${startDate}_to_${endDate}.csv`);
        res.send(csvContent);
    } catch (err) {
        console.error("[Audit Route] CSV Export Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/audit/report
 * Generates a full PDF audit report for government compliance.
 * Uses Puppeteer to render HTML → PDF with charts.
 */
router.get('/report', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const orgId = req.user.organization_id;

        if (!startDate || !endDate) return res.status(400).json({ error: "Start and end dates are required" });

        // 1. Fetch Aggregated Data
        const auditData = await generateAuditData(orgId, startDate, endDate);

        // 2. Build academic performance table rows
        const academicRows = (auditData.criterion2?.academicPerformance || [])
            .map(c => `
                <tr>
                    <td>${c.classroomName || c._id}</td>
                    <td>${c.totalStudents}</td>
                    <td>${c.passedStudents}</td>
                    <td><strong>${(c.passRate || 0).toFixed(1)}%</strong></td>
                    <td>${c.avgPercentage || 'N/A'}</td>
                    <td>${c.avgCGPA || 'N/A'}</td>
                </tr>
            `).join("");

        // Subject failure rows
        const failureRows = (auditData.criterion2?.subjectWiseFailure || [])
            .slice(0, 10) // Top 10 high-failure subjects
            .map(s => `
                <tr>
                    <td>${s.subjectName}</td>
                    <td>${s.totalAttempts}</td>
                    <td>${s.totalFailed}</td>
                    <td style="color: ${s.failureRate > 30 ? '#dc2626' : '#16a34a'}">${s.failureRate}%</td>
                    <td>${s.avgScore}%</td>
                </tr>
            `).join("");

        // Fee audit rows
        const feeRows = (auditData.criterion5?.financialAudit?.byCategory || [])
            .map(f => `
                <tr>
                    <td>${f.category}</td>
                    <td>₹${f.totalDemanded?.toLocaleString('en-IN')}</td>
                    <td>₹${f.totalCollected?.toLocaleString('en-IN')}</td>
                    <td style="color: ${f.outstanding > 0 ? '#dc2626' : '#16a34a'}">₹${f.outstanding?.toLocaleString('en-IN')}</td>
                    <td>${f.collectionRate}%</td>
                </tr>
            `).join("");

        // Faculty workload rows
        const facultyRows = (auditData.criterion6?.facultyWorkload || [])
            .slice(0, 20)
            .map(f => `
                <tr>
                    <td>${f.name}</td>
                    <td>${f.totalHoursPerWeek} hrs</td>
                    <td>${f.lectureCount}</td>
                    <td>${f.labCount}</td>
                    <td>${f.subjects.join(", ")}</td>
                </tr>
            `).join("");

        // 3. Generate HTML Template
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; font-size: 12px; }
                    .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 20px; margin-bottom: 30px; }
                    .title { font-size: 22px; font-weight: bold; color: #1e293b; }
                    .subtitle { font-size: 14px; color: #1d4ed8; margin-top: 4px; }
                    .meta { color: #64748b; font-size: 11px; margin-top: 5px; }
                    .section { margin-bottom: 35px; page-break-inside: avoid; }
                    .section-title { font-size: 16px; font-weight: bold; margin-bottom: 12px; border-left: 4px solid #1d4ed8; padding-left: 10px; color: #1e293b; }
                    .stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                    .stat-card { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                    .stat-value { font-size: 22px; font-weight: bold; margin-top: 4px; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                    th { background: #f1f5f9; color: #475569; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 600; }
                    td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .footer { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
                    .badge-green { background: #dcfce7; color: #166534; }
                    .badge-red { background: #fef2f2; color: #991b1b; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">NAAC Self-Study Report — Auto-Generated Data</div>
                    <div class="subtitle">Classgrid Institutional Audit Engine (Module 24)</div>
                    <div class="meta">Organization ID: ${orgId} | Period: ${startDate} to ${endDate} | Generated: ${new Date().toLocaleDateString('en-IN')}</div>
                </div>

                <!-- Enrollment Overview -->
                <div class="section">
                    <div class="section-title">Enrollment & Infrastructure Overview</div>
                    <div class="stat-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total Student Strength</div>
                            <div class="stat-value">${auditData.enrollment.totalStudents}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Faculty</div>
                            <div class="stat-value">${auditData.enrollment.totalFaculty}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Student-Faculty Ratio</div>
                            <div class="stat-value">${auditData.enrollment.studentFacultyRatio}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">New Enrollments (Period)</div>
                            <div class="stat-value">${auditData.enrollment.newEnrollments}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Overall Attendance Rate</div>
                            <div class="stat-value">${auditData.stats.avgAttendance}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Active Classrooms</div>
                            <div class="stat-value">${auditData.enrollment.totalClassrooms}</div>
                        </div>
                    </div>
                </div>

                <!-- Criterion 2: Academic Performance -->
                ${academicRows ? `
                <div class="section">
                    <div class="section-title">Criterion 2 — Academic Performance by Classroom</div>
                    <table>
                        <thead>
                            <tr><th>Classroom</th><th>Students</th><th>Passed</th><th>Pass Rate</th><th>Avg %</th><th>Avg CGPA</th></tr>
                        </thead>
                        <tbody>${academicRows}</tbody>
                    </table>
                </div>
                ` : ''}

                <!-- Subject Failure Analysis -->
                ${failureRows ? `
                <div class="section">
                    <div class="section-title">Subject-Wise Failure Analysis (Top 10)</div>
                    <table>
                        <thead>
                            <tr><th>Subject</th><th>Attempts</th><th>Failures</th><th>Failure Rate</th><th>Avg Score</th></tr>
                        </thead>
                        <tbody>${failureRows}</tbody>
                    </table>
                </div>
                ` : ''}

                <!-- Criterion 5: Financial Audit -->
                ${feeRows ? `
                <div class="section">
                    <div class="section-title">Criterion 5 — Financial Audit (Fee Collection)</div>
                    <table>
                        <thead>
                            <tr><th>Category</th><th>Demanded</th><th>Collected</th><th>Outstanding</th><th>Collection Rate</th></tr>
                        </thead>
                        <tbody>${feeRows}</tbody>
                    </table>
                </div>
                ` : ''}

                <!-- Criterion 6: Faculty Workload -->
                ${facultyRows ? `
                <div class="section">
                    <div class="section-title">Criterion 6 — Faculty Workload (Weekly Hours)</div>
                    <table>
                        <thead>
                            <tr><th>Faculty</th><th>Hours/Week</th><th>Lectures</th><th>Labs</th><th>Subjects</th></tr>
                        </thead>
                        <tbody>${facultyRows}</tbody>
                    </table>
                </div>
                ` : ''}

                <div class="footer">
                    This is a computer-generated document by <strong>Classgrid Auditor Engine v2.0</strong>.<br/>
                    All data is aggregated in real-time from institutional records. No manual data entry required.<br/>
                    Confidential | For Administrative & Regulatory Use Only
                </div>
            </body>
            </html>
        `;

        // 4. Convert to PDF via Puppeteer
        const browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });
        await browser.close();

        // 5. Return PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=NAAC_Audit_Report_${Date.now()}.pdf`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error("[Audit Route] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
