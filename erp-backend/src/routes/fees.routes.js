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

import express from "express";
import crypto from "crypto";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import { trackOnboardingEvent } from "../services/onboarding-event.service.js";
import { markOnboardingStep, syncDerivedOnboardingProgress } from "../services/onboarding-progress.service.js";

const router = express.Router();
const attachOptionalInstitutionProfile = attachInstitutionProfile({ required: false });

router.get("/institution-profile", isAuthenticated, attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        fee_profile: req.institutionProfile.feeProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});

// Helper: Get org's own Razorpay keys (NO platform fallback)
// If org hasn't configured keys → online payment is blocked
async function getOrgRazorpayKeys(orgId) {
    const org = await Organization.findById(orgId).select("fees_razorpay_key_id fees_razorpay_key_secret fees_razorpay_webhook_secret").lean();
    return {
        keyId: org?.fees_razorpay_key_id || "",
        keySecret: org?.fees_razorpay_key_secret || "",
        webhookSecret: org?.fees_razorpay_webhook_secret || "",
        configured: !!(org?.fees_razorpay_key_id && org?.fees_razorpay_key_secret)
    };
}

// ══════════════════════════════════════════════════════════════════════════
// 1. POST /structures — Create fee structure (Admin only)
// ══════════════════════════════════════════════════════════════════════════
router.post("/structures", isAuthenticated, attachOptionalInstitutionProfile, requireRole("org_admin"), async (req, res) => {
    try {
        const { name, academic_year, division_id, total_amount, due_date, late_fine_per_day, components } = req.body;
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        // Create structure
        const { data: structure, error } = await supabase
            .from("fee_structures")
            .insert({
                org_id: orgId,
                name,
                academic_year: academic_year || null,
                division_id: division_id || null,
                total_amount: total_amount || 0,
                due_date: due_date || null,
                late_fine_per_day: late_fine_per_day || 0,
                payment_mode: req.body.payment_mode || "manual",
                created_by: req.user._id.toString()
            })
            .select()
            .single();

        if (error) throw error;

        // Insert components if provided
        if (components && components.length > 0) {
            const rows = components.map((c, i) => ({
                structure_id: structure.id,
                name: c.name,
                amount: c.amount || 0,
                sort_order: i
            }));

            await supabase.from("fee_components").insert(rows);

            // Auto-calculate total from components
            const total = rows.reduce((sum, c) => sum + Number(c.amount), 0);
            await supabase.from("fee_structures").update({ total_amount: total }).eq("id", structure.id);
            structure.total_amount = total;
        }

        await markOnboardingStep(orgId, "fee_structure_configured", true);
        await syncDerivedOnboardingProgress(orgId);
        await trackOnboardingEvent({
            organizationId: orgId,
            userId: req.user?._id || null,
            eventType: "fee_structure_created",
            stage: "setup",
            actorRole: req.user?.role || "org_admin",
            metadata: {
                structureId: structure.id,
                totalAmount: structure.total_amount,
            },
        });

        res.status(201).json({ structure });
    } catch (err) {
        console.error("[Fees] POST /structures error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 2. GET /structures — List all fee structures for org
// ══════════════════════════════════════════════════════════════════════════
router.get("/structures", isAuthenticated, attachOptionalInstitutionProfile, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        const { data, error } = await supabase
            .from("fee_structures")
            .select("*, fee_components(*)")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json({ structures: data || [] });
    } catch (err) {
        console.error("[Fees] GET /structures error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 3. DELETE /structures/:id — Delete fee structure
// ══════════════════════════════════════════════════════════════════════════
router.delete("/structures/:id", isAuthenticated, attachOptionalInstitutionProfile, requireRole("org_admin"), async (req, res) => {
    try {
        const { error } = await supabase
            .from("fee_structures")
            .delete()
            .eq("id", req.params.id);

        if (error) throw error;
        res.json({ message: "Fee structure deleted" });
    } catch (err) {
        console.error("[Fees] DELETE /structures/:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 4. POST /assign — Assign fee structure to students in a division
//    Auto-generates student_fees records
// ══════════════════════════════════════════════════════════════════════════
router.post("/assign", isAuthenticated, attachOptionalInstitutionProfile, requireRole("org_admin"), async (req, res) => {
    try {
        const { structure_id, student_ids } = req.body;
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        // Fetch structure details
        const { data: structure } = await supabase
            .from("fee_structures")
            .select("*")
            .eq("id", structure_id)
            .single();

        if (!structure) return res.status(404).json({ message: "Structure not found" });

        // Create fee records for each student
        const records = student_ids.map(sid => ({
            org_id: orgId,
            student_id: sid,
            structure_id: structure.id,
            division_id: structure.division_id || null,
            total_amount: structure.total_amount,
            paid_amount: 0,
            due_date: structure.due_date || null,
            status: "unpaid"
        }));

        const { data, error } = await supabase
            .from("student_fees")
            .upsert(records, { onConflict: "student_id,structure_id" })
            .select();

        if (error) throw error;
        res.json({ message: `Fees assigned to ${student_ids.length} students`, records: data });
    } catch (err) {
        console.error("[Fees] POST /assign error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 5. POST /pay — Record a payment (Admin/Teacher)
//    Auto-updates paid_amount and status
// ══════════════════════════════════════════════════════════════════════════
router.post("/pay", isAuthenticated, attachOptionalInstitutionProfile, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.status(403).json({ message: "Students cannot record payments" });
        }

        const { student_fee_id, amount, payment_method, reference_number, notes, payment_date } = req.body;
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        // Get current fee record
        const { data: feeRecord } = await supabase
            .from("student_fees")
            .select("*")
            .eq("id", student_fee_id)
            .single();

        if (!feeRecord) return res.status(404).json({ message: "Fee record not found" });

        // Insert payment
        const { data: payment, error: payErr } = await supabase
            .from("fee_payments")
            .insert({
                org_id: orgId,
                student_fee_id,
                student_id: feeRecord.student_id,
                amount: Number(amount),
                payment_date: payment_date || new Date().toISOString().split("T")[0],
                payment_method: payment_method || "cash",
                reference_number: reference_number || null,
                notes: notes || null,
                recorded_by: req.user._id.toString()
            })
            .select()
            .single();

        if (payErr) throw payErr;

        // Update paid_amount and status
        const newPaid = Number(feeRecord.paid_amount) + Number(amount);
        let newStatus = "partial";
        if (newPaid >= Number(feeRecord.total_amount)) newStatus = "paid";
        else if (newPaid === 0) newStatus = "unpaid";

        await supabase
            .from("student_fees")
            .update({ paid_amount: newPaid, status: newStatus, is_blocked: newStatus !== "paid" && feeRecord.is_blocked })
            .eq("id", student_fee_id);

        res.json({ message: "Payment recorded", payment, new_status: newStatus, new_paid: newPaid });
    } catch (err) {
        console.error("[Fees] POST /pay error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 6. GET /students — List all student fees (Admin view with filters)
// ══════════════════════════════════════════════════════════════════════════
router.get("/students", isAuthenticated, attachOptionalInstitutionProfile, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        const { status, division_id, structure_id } = req.query;

        let query = supabase
            .from("student_fees")
            .select("*, fee_structures(name, academic_year)")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false });

        if (status) query = query.eq("status", status);
        if (division_id) query = query.eq("division_id", division_id);
        if (structure_id) query = query.eq("structure_id", structure_id);

        const { data, error } = await query;
        if (error) throw error;

        res.json({ fees: data || [] });
    } catch (err) {
        console.error("[Fees] GET /students error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 7. GET /me — Student's own fee records + payment history
// ══════════════════════════════════════════════════════════════════════════
router.get("/me", isAuthenticated, attachOptionalInstitutionProfile, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        const studentId = req.user._id.toString();

        const { data: fees } = await supabase
            .from("student_fees")
            .select("*, fee_structures(name, academic_year, fee_components(*))")
            .eq("org_id", orgId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false });

        const { data: payments } = await supabase
            .from("fee_payments")
            .select("*")
            .eq("student_id", studentId)
            .eq("org_id", orgId)
            .order("payment_date", { ascending: false });

        // Summary
        const totalPayable = (fees || []).reduce((s, f) => s + Number(f.total_amount), 0);
        const totalPaid = (fees || []).reduce((s, f) => s + Number(f.paid_amount), 0);

        // Check if org has Razorpay configured
        const rzpKeys = await getOrgRazorpayKeys(orgId);

        res.json({
            fees: fees || [],
            payments: payments || [],
            summary: { totalPayable, totalPaid, balance: totalPayable - totalPaid },
            razorpay_configured: rzpKeys.configured
        });
    } catch (err) {
        console.error("[Fees] GET /me error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 8. GET /payments — All payments (Admin transactions view)
// ══════════════════════════════════════════════════════════════════════════
router.get("/payments", isAuthenticated, attachOptionalInstitutionProfile, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        const { data, error } = await supabase
            .from("fee_payments")
            .select("*")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) throw error;
        res.json({ payments: data || [] });
    } catch (err) {
        console.error("[Fees] GET /payments error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 9. GET /analytics — Collection summary (Admin dashboard)
// ══════════════════════════════════════════════════════════════════════════
router.get("/analytics", isAuthenticated, attachOptionalInstitutionProfile, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        const { data: allFees } = await supabase
            .from("student_fees")
            .select("total_amount, paid_amount, status, due_date")
            .eq("org_id", orgId);
            
        const { data: payments } = await supabase
            .from("fee_payments")
            .select("amount, payment_date, payment_method, payment_status")
            .eq("org_id", orgId)
            .eq("payment_status", "success");

        const today = new Date().toISOString().split("T")[0];
        const records = allFees || [];
        const paymentRecords = payments || [];

        const totalCollection = records.reduce((s, f) => s + Number(f.paid_amount), 0);
        const totalPayable = records.reduce((s, f) => s + Number(f.total_amount), 0);
        const totalPending = totalPayable - totalCollection;
        
        // Status Counts
        const paidCount = records.filter(f => f.status === "paid").length;
        const partialCount = records.filter(f => f.status === "partial").length;
        const unpaidCount = records.filter(f => f.status === "unpaid").length;
        const overdueCount = records.filter(f => f.status !== "paid" && f.due_date && f.due_date < today).length;

        // Daily Trends (last 14 days)
        const dailyTrendsMap = {};
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dailyTrendsMap[d.toISOString().split("T")[0]] = 0;
        }
        
        paymentRecords.forEach(p => {
            const dateStr = p.payment_date?.split("T")[0];
            if (dailyTrendsMap[dateStr] !== undefined) {
                dailyTrendsMap[dateStr] += Number(p.amount);
            }
        });
        const dailyTrend = Object.keys(dailyTrendsMap).map(date => ({
            date,
            amount: dailyTrendsMap[date]
        }));

        // Payment Mode Breakdown
        const modeMap = {};
        paymentRecords.forEach(p => {
            const mode = p.payment_method || "unknown";
            modeMap[mode] = (modeMap[mode] || 0) + Number(p.amount);
        });
        const paymentModeBreakdown = Object.keys(modeMap).map(mode => ({
            mode,
            amount: modeMap[mode]
        }));

        // Status Breakdown for Donut Chart
        const statusBreakdown = [
            { status: "Paid", count: paidCount },
            { status: "Partial", count: partialCount },
            { status: "Unpaid", count: unpaidCount }
        ];

        // Defaulters list (Top 10)
        const defaulters = records.filter(f => f.status !== "paid" && f.due_date && f.due_date < today).slice(0, 10);

        res.json({
            success: true,
            totalCollection,
            totalPayable,
            totalPending,
            totalStudents: records.length,
            paidCount,
            partialCount,
            unpaidCount,
            overdueCount,
            collectionRate: records.length > 0 ? Math.round((paidCount / records.length) * 100) : 0,
            charts: {
                dailyTrend,
                paymentModeBreakdown,
                statusBreakdown
            },
            defaulters
        });
    } catch (err) {
        console.error("[Fees] GET /analytics error:", err);
        res.status(500).json({ message: "Server error", success: false });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 10. PATCH /students/:id/block — Toggle block/unblock student
// ══════════════════════════════════════════════════════════════════════════
router.patch("/students/:id/block", isAuthenticated, attachOptionalInstitutionProfile, requireRole("org_admin"), async (req, res) => {
    try {
        const { is_blocked } = req.body;

        const { data, error } = await supabase
            .from("student_fees")
            .update({ is_blocked: !!is_blocked })
            .eq("id", req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: is_blocked ? "Student blocked" : "Student unblocked", record: data });
    } catch (err) {
        console.error("[Fees] PATCH /block error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 11. POST /razorpay/order — Create Razorpay order (Student pays online)
// ══════════════════════════════════════════════════════════════════════════
router.post("/razorpay/order", isAuthenticated, attachOptionalInstitutionProfile, async (req, res) => {
    try {
        const { student_fee_id } = req.body;

        // Get fee record
        const { data: feeRecord } = await supabase
            .from("student_fees")
            .select("*, fee_structures(name, payment_mode)")
            .eq("id", student_fee_id)
            .single();

        if (!feeRecord) return res.status(404).json({ message: "Fee record not found" });

        // Get per-org Razorpay keys (college's own keys)
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        const rzpKeys = await getOrgRazorpayKeys(orgId);

        if (!rzpKeys.configured) {
            return res.status(400).json({ message: "Online payment is not available for this organization. Please use manual payment." });
        }

        const paymentMode = feeRecord.fee_structures?.payment_mode || "manual";
        if (paymentMode === "manual") {
            return res.status(400).json({ message: "Online payment not enabled for this structure" });
        }

        const pendingAmount = Number(feeRecord.total_amount) - Number(feeRecord.paid_amount);
        if (pendingAmount <= 0) {
            return res.status(400).json({ message: "No pending amount" });
        }

        const amountToPay = Number(req.body.amount) || pendingAmount;

        // Create Razorpay order using COLLEGE'S keys
        const orderData = JSON.stringify({
            amount: Math.round(amountToPay * 100), // paise
            currency: "INR",
            receipt: `fee_${student_fee_id.substring(0, 8)}`,
            notes: {
                student_fee_id,
                student_id: feeRecord.student_id,
                org_id: feeRecord.org_id
            }
        });

        const auth = Buffer.from(`${rzpKeys.keyId}:${rzpKeys.keySecret}`).toString("base64");

        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`
            },
            body: orderData
        });

        const order = await response.json();
        if (order.error) throw new Error(order.error.description);

        res.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: rzpKeys.keyId,
            student_fee_id,
            student_name: req.user.name,
            student_email: req.user.email
        });
    } catch (err) {
        console.error("[Fees] Razorpay order error:", err);
        res.status(500).json({ message: err.message || "Failed to create order" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 12. POST /razorpay/verify — Verify payment after checkout (frontend calls)
// ══════════════════════════════════════════════════════════════════════════
router.post("/razorpay/verify", isAuthenticated, attachOptionalInstitutionProfile, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, student_fee_id, amount } = req.body;

        // Get per-org Razorpay keys
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        const rzpKeys = await getOrgRazorpayKeys(orgId);

        if (!rzpKeys.keySecret) {
            return res.status(400).json({ message: "Razorpay not configured for this organization" });
        }

        // Verify signature using COLLEGE'S secret
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", rzpKeys.keySecret)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Payment verification failed — invalid signature" });
        }

        // Get fee record
        const { data: feeRecord } = await supabase
            .from("student_fees")
            .select("*")
            .eq("id", student_fee_id)
            .single();

        if (!feeRecord) return res.status(404).json({ message: "Fee record not found" });

        const paidAmount = Number(amount) / 100; // Convert from paise

        // Insert payment record
        const { data: payment } = await supabase
            .from("fee_payments")
            .insert({
                org_id: feeRecord.org_id,
                student_fee_id,
                student_id: feeRecord.student_id,
                amount: paidAmount,
                payment_date: new Date().toISOString().split("T")[0],
                payment_method: "online",
                reference_number: razorpay_payment_id,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                payment_status: "success",
                recorded_by: req.user._id.toString(),
                notes: "Paid via Razorpay"
            })
            .select()
            .single();

        // Update paid_amount and status
        const newPaid = Number(feeRecord.paid_amount) + paidAmount;
        let newStatus = "partial";
        if (newPaid >= Number(feeRecord.total_amount)) newStatus = "paid";

        await supabase
            .from("student_fees")
            .update({ paid_amount: newPaid, status: newStatus, is_blocked: false })
            .eq("id", student_fee_id);

        res.json({ message: "Payment verified & recorded!", payment, new_status: newStatus });
    } catch (err) {
        console.error("[Fees] Razorpay verify error:", err);
        res.status(500).json({ message: "Payment verification failed" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 13. POST /razorpay/webhook — Razorpay server-to-server webhook
//     Fallback: if frontend verify fails, webhook catches it
// ══════════════════════════════════════════════════════════════════════════
router.post("/razorpay/webhook", async (req, res) => {
    try {
        const event = req.body.event;
        if (event === "payment.captured") {
            const payment = req.body.payload.payment.entity;
            const orgId = payment.notes?.org_id;

            // Get org's webhook secret for signature verification
            if (orgId) {
                const rzpKeys = await getOrgRazorpayKeys(orgId);
                const webhookSecret = rzpKeys.webhookSecret || rzpKeys.keySecret;
                const signature = req.headers["x-razorpay-signature"];
                if (signature && webhookSecret) {
                    const shasum = crypto.createHmac("sha256", webhookSecret);
                    shasum.update(JSON.stringify(req.body));
                    const digest = shasum.digest("hex");
                    if (digest !== signature) {
                        return res.status(400).json({ message: "Invalid webhook signature" });
                    }
                }
            }
            const studentFeeId = payment.notes?.student_fee_id;

            if (!studentFeeId) {
                return res.json({ message: "No student_fee_id in notes, skipping" });
            }

            // Check if already recorded (idempotent)
            const { data: existing } = await supabase
                .from("fee_payments")
                .select("id")
                .eq("razorpay_payment_id", payment.id)
                .maybeSingle();

            if (existing) {
                return res.json({ message: "Payment already recorded" });
            }

            // Get fee record
            const { data: feeRecord } = await supabase
                .from("student_fees")
                .select("*")
                .eq("id", studentFeeId)
                .single();

            if (!feeRecord) return res.json({ message: "Fee record not found" });

            const paidAmount = payment.amount / 100;

            // Insert payment
            await supabase.from("fee_payments").insert({
                org_id: feeRecord.org_id,
                student_fee_id: studentFeeId,
                student_id: feeRecord.student_id,
                amount: paidAmount,
                payment_date: new Date().toISOString().split("T")[0],
                payment_method: "online",
                reference_number: payment.id,
                razorpay_order_id: payment.order_id,
                razorpay_payment_id: payment.id,
                payment_status: "success",
                recorded_by: "razorpay_webhook",
                notes: `Webhook: ${payment.method}`
            });

            // Update status
            const newPaid = Number(feeRecord.paid_amount) + paidAmount;
            let newStatus = newPaid >= Number(feeRecord.total_amount) ? "paid" : "partial";

            await supabase
                .from("student_fees")
                .update({ paid_amount: newPaid, status: newStatus, is_blocked: false })
                .eq("id", studentFeeId);
        }

        res.json({ message: "Webhook processed" });
    } catch (err) {
        console.error("[Fees] Webhook error:", err);
        res.status(500).json({ message: "Webhook processing failed" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 14. PUT /razorpay/config — Admin saves org's Razorpay keys
// ══════════════════════════════════════════════════════════════════════════
router.put("/razorpay/config", isAuthenticated, attachOptionalInstitutionProfile, requireRole("org_admin"), async (req, res) => {
    try {
        const { fees_razorpay_key_id, fees_razorpay_key_secret, fees_razorpay_webhook_secret } = req.body;
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        const org = await Organization.findByIdAndUpdate(
            orgId,
            {
                fees_razorpay_key_id: fees_razorpay_key_id || "",
                fees_razorpay_key_secret: fees_razorpay_key_secret || "",
                fees_razorpay_webhook_secret: fees_razorpay_webhook_secret || ""
            },
            { returnDocument: 'after' }
        ).select("fees_razorpay_key_id");

        if (!org) return res.status(404).json({ message: "Organization not found" });

        res.json({ message: "Razorpay keys saved. Payments will now go directly to your account.", configured: !!fees_razorpay_key_id });
    } catch (err) {
        console.error("[Fees] PUT /razorpay/config error:", err);
        res.status(500).json({ message: "Failed to save Razorpay config" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 15. GET /razorpay/config — Check if org has Razorpay configured
// ══════════════════════════════════════════════════════════════════════════
router.get("/razorpay/config", isAuthenticated, attachOptionalInstitutionProfile, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        const rzpKeys = await getOrgRazorpayKeys(orgId);
        res.json({ configured: !!rzpKeys.keyId, key_id_preview: rzpKeys.keyId ? `${rzpKeys.keyId.substring(0, 12)}...` : "" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
