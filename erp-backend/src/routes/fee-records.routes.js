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
import { attachInstitutionProfile } from '../middleware/institution-profile.middleware.js';
import FeeRecord from '../models/FeeRecord.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

const router = express.Router();

router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

router.get('/institution-profile', attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        fee_profile: req.institutionProfile.feeProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/fee-records/create
 * Assign a fee record to one or multiple students in bulk.
 * Sends a notification to each student about the new charge.
 */
router.post('/create', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { studentIds, title, category, amount, dueDate, remarks } = req.body;
        const orgId = req.user.organization_id;

        if (!studentIds || !studentIds.length || !title || !amount || !dueDate) {
            return res.status(400).json({ message: "studentIds, title, amount, and dueDate are required" });
        }

        const records = studentIds.map(sid => ({
            student: sid,
            organizationId: orgId,
            title,
            category: category || 'college',
            amount: Number(amount),
            dueDate: new Date(dueDate),
            remarks: remarks || ''
        }));

        const createdRecords = await FeeRecord.insertMany(records);

        // Send notification to each student
        const notificationPromises = studentIds.map(sid =>
            Notification.create({
                recipient: sid,
                type: 'fee_assigned',
                title: `💰 New Fee: ${title}`,
                message: `A fee of ₹${amount} has been assigned. Due date: ${new Date(dueDate).toLocaleDateString('en-IN')}`,
                link: '/modules/fees'
            }).catch(e => console.error('[Fee] Notif error:', e.message))
        );
        await Promise.allSettled(notificationPromises);

        res.status(201).json({
            message: `Fee "${title}" assigned to ${studentIds.length} students`,
            count: createdRecords.length
        });
    } catch (err) {
        console.error("[FeeRecords] Bulk Create Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/fee-records/all
 * Admin view: All fee records across the org with student names populated.
 * Supports filters: ?status=pending&category=exam&overdue=true
 */
router.get('/all', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { status, category, overdue } = req.query;
        const filter = { organizationId: orgId };

        if (status) filter.status = status;
        if (category) filter.category = category;
        if (overdue === 'true') {
            filter.status = { $ne: 'paid' };
            filter.dueDate = { $lt: new Date() };
        }

        const records = await FeeRecord.find(filter)
            .populate('student', 'name email prn profilePicture')
            .sort({ dueDate: 1 })
            .lean();

        res.json({ total: records.length, records });
    } catch (err) {
        console.error("[FeeRecords] GET /all Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/fee-records/summary
 * Admin dashboard: Financial overview with category-wise breakdown.
 */
router.get('/summary', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const records = await FeeRecord.find({ organizationId: orgId }).lean();
        const today = new Date();

        const totalAmount = records.reduce((s, r) => s + r.amount, 0);
        const totalPaid = records.reduce((s, r) => s + r.paidAmount, 0);
        const paidCount = records.filter(r => r.status === 'paid').length;
        const partialCount = records.filter(r => r.status === 'partially_paid').length;
        const pendingCount = records.filter(r => r.status === 'pending').length;
        const overdueCount = records.filter(r => r.status !== 'paid' && r.dueDate < today).length;

        // Category-wise breakdown
        const categoryBreakdown = {};
        records.forEach(r => {
            const cat = r.category || 'other';
            if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { total: 0, paid: 0, pending: 0, count: 0 };
            categoryBreakdown[cat].total += r.amount;
            categoryBreakdown[cat].paid += r.paidAmount;
            categoryBreakdown[cat].pending += (r.amount - r.paidAmount);
            categoryBreakdown[cat].count++;
        });

        res.json({
            overview: {
                totalAmount,
                totalPaid,
                balance: totalAmount - totalPaid,
                collectionRate: records.length > 0 ? Math.round((paidCount / records.length) * 100) : 0
            },
            counts: {
                total: records.length,
                paid: paidCount,
                partial: partialCount,
                pending: pendingCount,
                overdue: overdueCount
            },
            categoryBreakdown
        });
    } catch (err) {
        console.error("[FeeRecords] GET /summary Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/fee-records/reminders
 * Auto-flag overdue students and return the list.
 * Also auto-updates status from 'pending' to 'overdue' for past-due records.
 */
router.get('/reminders', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Auto-flag overdue records
        const result = await FeeRecord.updateMany(
            {
                organizationId: orgId,
                status: { $in: ['pending', 'partially_paid'] },
                dueDate: { $lt: today }
            },
            { $set: { status: 'overdue' } }
        );

        // Fetch all overdue records with student info
        const overdueRecords = await FeeRecord.find({
            organizationId: orgId,
            status: 'overdue'
        })
            .populate('student', 'name email prn phone')
            .sort({ dueDate: 1 })
            .lean();

        // Group by student for a clean reminder list
        const studentReminders = {};
        overdueRecords.forEach(r => {
            const sid = r.student?._id?.toString() || 'unknown';
            if (!studentReminders[sid]) {
                studentReminders[sid] = {
                    student: r.student,
                    overdueItems: [],
                    totalDue: 0
                };
            }
            studentReminders[sid].overdueItems.push({
                title: r.title,
                category: r.category,
                amount: r.amount,
                paid: r.paidAmount,
                remaining: r.amount - r.paidAmount,
                dueDate: r.dueDate
            });
            studentReminders[sid].totalDue += (r.amount - r.paidAmount);
        });

        const reminderList = Object.values(studentReminders)
            .sort((a, b) => b.totalDue - a.totalDue); // Highest dues first

        res.json({
            flaggedCount: result.modifiedCount,
            totalOverdueStudents: reminderList.length,
            totalOverdueAmount: reminderList.reduce((s, r) => s + r.totalDue, 0),
            reminders: reminderList
        });
    } catch (err) {
        console.error("[FeeRecords] GET /reminders Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// ═══════════════════════════════════════════════════════════════
// PAYMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * PATCH /api/fee-records/:recordId/pay
 * Record a partial or full payment for a specific fee record.
 */
router.patch('/:recordId/pay', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const { amount, paymentReference } = req.body;
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ message: "Valid payment amount is required" });
        }

        const record = await FeeRecord.findById(req.params.recordId);
        if (!record) return res.status(404).json({ message: "Fee record not found" });

        record.paidAmount += Number(amount);
        record.paymentReference = paymentReference || record.paymentReference;
        record.paidAt = new Date();

        if (record.paidAmount >= record.amount) {
            record.status = 'paid';
            record.paidAmount = record.amount; // Prevent overpayment
        } else if (record.paidAmount > 0) {
            record.status = 'partially_paid';
        }

        await record.save();

        // Notify student
        await Notification.create({
            recipient: record.student,
            type: 'fee_payment',
            title: record.status === 'paid' ? '✅ Fee Paid in Full' : '💳 Payment Received',
            message: `₹${amount} received for "${record.title}". ${record.status === 'paid' ? 'Fully settled!' : `Balance: ₹${record.amount - record.paidAmount}`}`,
            link: '/modules/fees'
        }).catch(e => console.error('[Fee] Notif error:', e.message));

        res.json({ message: "Payment recorded successfully", record });
    } catch (err) {
        console.error("[FeeRecords] PATCH /pay Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// ═══════════════════════════════════════════════════════════════
// STUDENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/fee-records/me
 * Student's own fee records with summary
 */
router.get('/me', isAuthenticated, async (req, res) => {
    try {
        const studentId = req.user._id.toString();
        const records = await FeeRecord.find({ student: studentId }).sort({ dueDate: 1 }).lean();
        const today = new Date();

        const totalAmount = records.reduce((s, r) => s + r.amount, 0);
        const totalPaid = records.reduce((s, r) => s + r.paidAmount, 0);
        const overdueItems = records.filter(r => r.status !== 'paid' && r.dueDate < today);

        res.json({
            summary: {
                totalAmount,
                totalPaid,
                balance: totalAmount - totalPaid,
                overdueCount: overdueItems.length
            },
            records
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/fee-records/student/:studentId
 * Faculty/Admin can view a specific student's fees
 */
router.get('/student/:studentId', isAuthenticated, async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // ACL: students can only see their own
        if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
            return res.status(403).json({ message: "Access denied" });
        }

        const records = await FeeRecord.find({ student: studentId }).sort({ dueDate: 1 }).lean();
        const student = await User.findById(studentId).select('name prn email').lean();

        const totalAmount = records.reduce((s, r) => s + r.amount, 0);
        const totalPaid = records.reduce((s, r) => s + r.paidAmount, 0);

        res.json({
            student: student || { name: 'Unknown' },
            summary: { totalAmount, totalPaid, balance: totalAmount - totalPaid },
            records
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
