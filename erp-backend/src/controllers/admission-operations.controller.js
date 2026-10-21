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
 * Thefdgdg frontend is hosted 100% on Vercel. EC2 is only for the backend.
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

import AdmissionApplication from "../models/AdmissionApplication.js";
import Organization from "../models/Organization.js";
import CETAllotment from "../models/CETAllotment.js";
import SeatConfig from "../models/SeatConfig.js";
import User from "../models/User.js";
import AcademicHierarchy from "../models/AcademicHierarchy.js";
import connectDB from "../../config/db.js";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import "../services/firebase.service.js";
import { ADMISSION_STAGES } from "../services/admissions/admission-workflow.service.js";
import { checkDocumentValidity, validateAllDocuments } from "../services/admissions/document-validity.service.js";
import { generateMeritList, persistMeritScores } from "../services/admissions/merit-engine.service.js";
import { executeAllocation } from "../services/admissions/division-allocator.service.js";
import { batchGeneratePRNs } from "../services/admissions/prn-generator.service.js";
import { dispatchNotification, getSMSBudgetStatus } from "../services/admissions/admission-notification.service.js";
import { getEngineeringInstituteCode } from "../services/admissions/admission-engine.helpers.js";
import { getFormSchema } from "../services/admissions/admission-form-builder.service.js";
import { getResolvedAdmissionStrategy } from "../services/admissions/strategy-selector.js";
import seatMatrixService from "../services/admissions/seat-matrix.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// ══════════════════════════════════════════════════════════════════════════════
// DAY 15: Document Processing & Merit Engine
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admission/docs/validate-expiry
 * Checks whether uploaded documents are still within their validity window.
 */
export const validateDocumentExpiry = async (req, res) => {
    try {
        await connectDB();
        const { application_id, documents } = req.body;

        if (application_id) {
            const app = await AdmissionApplication.findById(application_id).select("documents").lean();
            if (!app) return res.status(404).json({ error: "Application not found" });
            const result = validateAllDocuments(app.documents || []);
            return res.json(result);
        }

        if (documents && Array.isArray(documents)) {
            const result = validateAllDocuments(documents);
            return res.json(result);
        }

        return res.status(400).json({ error: "Provide application_id or documents array." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admission/direct/generate-merit
 * Triggers merit score normalization for all applicants.
 */
export const generateMerit = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { hierarchy_id } = req.body;

        // 1. Persist normalized scores to all applications
        const result = await persistMeritScores(orgId, hierarchy_id || null);

        // 2. Fetch the sorted merit list to return
        const meritList = await generateMeritList(orgId, hierarchy_id || null);

        res.json({
            success: true,
            message: `Merit scores normalized for ${result.updated} applications.`,
            count: meritList.length,
            merit_list: meritList.slice(0, 50) // Return top 50 for preview
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admission/direct/merit-list
 * Returns the full ranked merit list for admin dashboard.
 */
export const getMeritList = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { hierarchy_id, category, seat_type, gender, page = 1, limit = 100 } = req.query;

        const meritList = await generateMeritList(orgId, hierarchy_id || null, {
            category_filter: category || null,
            seat_type_filter: seat_type || null,
            gender_filter: gender || null
        });

        const startIdx = (parseInt(page) - 1) * parseInt(limit);
        const paginatedList = meritList.slice(startIdx, startIdx + parseInt(limit));

        res.json({
            success: true,
            total: meritList.length,
            page: parseInt(page),
            limit: parseInt(limit),
            merit_list: paginatedList
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admission/applications
 * Returns a paginated list of all admission applications for the org with search & filters.
 */
export const getApplicationsList = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { hierarchy_id, status, search, page = 1, limit = 50 } = req.query;

        const query = {
            organization_id: orgId,
            is_deleted: false
        };

        if (hierarchy_id) query.hierarchy_id = hierarchy_id;
        if (status) query.status = status;

        if (search) {
            query.$or = [
                { full_name: { $regex: search, $options: "i" } },
                { en_number: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [applications, total] = await Promise.all([
            AdmissionApplication.find(query)
                .select("full_name en_number phone email category seat_type merit_score documents status createdAt hierarchy_id")
                .populate("hierarchy_id", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            AdmissionApplication.countDocuments(query)
        ]);

        res.json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            applications
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admission/print/application/:id
 * Generates a printable application summary as JSON (frontend renders PDF).
 */
export const getApplicationPrintData = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;

        const app = await AdmissionApplication.findById(id)
            .populate("organization_id", "name address admission_config structure_type org_type")
            .populate("hierarchy_id", "name code level_type parent_id")
            .lean();

        if (!app) return res.status(404).json({ error: "Application not found" });

        const org = app.organization_id || {};
        const orgId = org._id || app.organization_id;
        let cetAllotment = null;
        if (app.en_number) {
            cetAllotment = await CETAllotment.findOne({ en_number: app.en_number, organization_id: orgId }).lean();
        }

        const readFormValue = (paths = []) => {
            for (const path of paths) {
                const value = path.split(".").reduce((acc, key) => acc?.[key], app.form_data || {});
                if (value !== undefined && value !== null && value !== "") return value;
            }
            return "";
        };

        const structureType = org.structure_type || org.admission_config?.structure_type || "school_no_div";
        const orgForStrategy = {
            ...org,
            structure_type: structureType,
            admission_config: {
                ...(org.admission_config || {}),
                structure_type: structureType,
            },
        };

        let formSchema = null;
        let strategy = null;
        try {
            formSchema = getFormSchema(orgForStrategy);
            strategy = getResolvedAdmissionStrategy(orgForStrategy);
        } catch (schemaErr) {
            console.error("Application schema resolution failed:", schemaErr);
        }

        const hierarchyPath = [];
        if (app.hierarchy_id?._id) {
            let current = await AcademicHierarchy.findOne({
                _id: app.hierarchy_id._id,
                organization_id: orgId,
            }).select("name code level_type parent_id").lean();

            const seen = new Set();
            while (current && !seen.has(String(current._id))) {
                seen.add(String(current._id));
                hierarchyPath.unshift({
                    _id: current._id,
                    name: current.name,
                    code: current.code,
                    level_type: current.level_type,
                });

                if (!current.parent_id) break;
                current = await AcademicHierarchy.findOne({
                    _id: current.parent_id,
                    organization_id: orgId,
                }).select("name code level_type parent_id").lean();
            }
        }

        const parentDetails = {
            father_name: readFormValue(["father_name", "father_full_name", "family.father_name", "family.father_full_name", "father.name"]),
            father_mobile: readFormValue(["father_mobile", "family.father_mobile", "father.mobile", "father.phone"]),
            mother_name: readFormValue(["mother_name", "mother_full_name", "family.mother_name", "family.mother_full_name", "mother.name"]),
            mother_mobile: readFormValue(["mother_mobile", "family.mother_mobile", "mother.mobile", "mother.phone"]),
            guardian_name: readFormValue(["guardian_name", "guardian.full_name", "guardian.name", "family.guardian_name"]),
            guardian_phone: readFormValue(["guardian_phone", "guardian.mobile", "guardian.phone", "family.guardian_phone"]),
        };

        const parentSigner =
            parentDetails.guardian_name ||
            parentDetails.father_name ||
            parentDetails.mother_name ||
            "Parent / Guardian";

        res.json({
            success: true,
            print_data: {
                organization: {
                    name: app.organization_id?.name,
                    address: app.organization_id?.address,
                    institute_code: getEngineeringInstituteCode(app.organization_id) || "N/A",
                    structure_type: structureType,
                },
                structure_type: structureType,
                admission_strategy: strategy ? {
                    auth_method: strategy.auth_method,
                    ranking_type: strategy.ranking_type,
                    workflow_variant: strategy.workflow_variant,
                    entry_modes: strategy.entry_modes,
                    supports_rla: strategy.supports_rla,
                    supports_cap_upgrade: strategy.supports_cap_upgrade,
                    govt_exports: strategy.govt_exports,
                } : null,
                form_schema: formSchema,
                applicant: {
                    full_name: app.full_name,
                    dob: app.dob,
                    phone: app.phone,
                    email: app.email,
                    en_number: app.en_number || null,
                    category: app.category,
                    seat_type: app.seat_type || app.form_data?.custom_fields?.allotted_seat_type || ""
                },
                parent_details: parentDetails,
                program: {
                    name: app.hierarchy_id?.name,
                    code: app.hierarchy_id?.code,
                    level_type: app.hierarchy_id?.level_type,
                    rla_status: app.rla_status
                },
                hierarchy_path: hierarchyPath,
                cet_allotment_details: cetAllotment ? {
                    cap_round: cetAllotment.cap_round,
                    merit_number: cetAllotment.merit_number,
                    mht_cet_score: cetAllotment.mht_cet_score,
                    candidature_type: cetAllotment.candidature_type,
                    defence_type: cetAllotment.defence_type,
                    supernumerary_quota: cetAllotment.supernumerary_quota,
                    choice_code: cetAllotment.choice_code
                } : null,
                form_data: app.form_data,
                documents: (app.documents || []).map(d => ({
                    name: d.name,
                    status: d.status
                })),
                merit_score: app.merit_score,
                status: app.status,
                prn: app.prn,
                application_id: app._id,
                applied_at: app.createdAt,
                stage_history: app.stage_history,
                print_declaration: "I confirm that the admission details and uploaded documents are correct to the best of my knowledge.",
                signature_lines: [
                    { label: "Parent / Guardian Signature", signer: parentSigner, required: true },
                    { label: "Admission Officer Signature", signer: req.user?.name || "Admission Officer", required: true }
                ]
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// DAY 16: Application Merge & Division Triggers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admission/applications/merge
 * Merges a duplicate application into the primary one.
 */
export const mergeApplications = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { primary_id, duplicate_id } = req.body;

        if (!primary_id || !duplicate_id) {
            return res.status(400).json({ error: "primary_id and duplicate_id are required." });
        }

        const primary = await AdmissionApplication.findOne({ _id: primary_id, organization_id: orgId });
        const duplicate = await AdmissionApplication.findOne({ _id: duplicate_id, organization_id: orgId });

        if (!primary || !duplicate) {
            return res.status(404).json({ error: "One or both applications not found." });
        }

        // Merge form_data (duplicate fills gaps in primary)
        const mergedFormData = { ...duplicate.form_data, ...primary.form_data };
        primary.form_data = mergedFormData;

        // Merge documents (dedupe by name, keep primary's version if both exist)
        const primaryDocNames = new Set((primary.documents || []).map(d => d.name));
        for (const doc of (duplicate.documents || [])) {
            if (!primaryDocNames.has(doc.name)) {
                primary.documents.push(doc);
            }
        }

        // Take higher merit score
        if ((duplicate.merit_score || 0) > (primary.merit_score || 0)) {
            primary.merit_score = duplicate.merit_score;
        }

        // Fill missing identity fields
        if (!primary.phone && duplicate.phone) primary.phone = duplicate.phone;
        if (!primary.email && duplicate.email) primary.email = duplicate.email;
        if (!primary.en_number && duplicate.en_number) primary.en_number = duplicate.en_number;

        primary.stage_history.push({
            status: primary.status,
            changed_by: req.user._id,
            comment: `Merged duplicate application (${duplicate_id}) into this record.`
        });

        await primary.save();

        // Soft-delete the duplicate
        duplicate.is_deleted = true;
        duplicate.stage_history.push({
            status: "merged",
            changed_by: req.user._id,
            comment: `Merged into primary application (${primary_id}).`
        });
        await duplicate.save();

        res.json({
            success: true,
            message: "Applications merged successfully.",
            primary_id: primary._id,
            deleted_duplicate: duplicate._id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admission/allocate-divisions
 * Runs the division allocation algorithm for a branch/standard.
 */
export const allocateDivisions = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { hierarchy_id, divisions, method } = req.body;

        if (!hierarchy_id || !divisions || !Array.isArray(divisions)) {
            return res.status(400).json({ error: "hierarchy_id and divisions array are required." });
        }

        const result = await executeAllocation(orgId, hierarchy_id, divisions, method || "alphabetical");

        res.json({
            success: true,
            message: `${result.totalAllocated} students allocated across ${divisions.length} divisions.`,
            ...result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admission/generate-prns
 * Batch-generate PRNs for multiple applications.
 */
export const batchGeneratePRNsRoute = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { application_ids } = req.body;

        if (!application_ids || !Array.isArray(application_ids)) {
            return res.status(400).json({ error: "application_ids array is required." });
        }

        const results = await batchGeneratePRNs(orgId, application_ids);

        const successCount = results.filter(r => r.prn && !r.error).length;
        res.json({
            success: true,
            message: `PRNs generated for ${successCount}/${application_ids.length} applications.`,
            results
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// DAY 19: Notification Dispatch Endpoints
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admission/notify
 * Admin manually dispatches a notification to one or more applicants.
 */
export const sendAdmissionNotification = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { application_ids, trigger } = req.body;

        if (!application_ids || !trigger) {
            return res.status(400).json({ error: "application_ids and trigger are required." });
        }

        const org = await Organization.findById(orgId).select("name").lean();
        const results = [];

        for (const appId of application_ids) {
            const app = await AdmissionApplication.findById(appId).lean();
            if (!app) {
                results.push({ id: appId, error: "Not found" });
                continue;
            }

            // Fetch FCM tokens if student_id is linked
            let fcmTokens = [];
            if (app.student_id) {
                const user = await User.findById(app.student_id).select("fcmTokens").lean();
                fcmTokens = user?.fcmTokens || [];
            }

            const result = await dispatchNotification(trigger, {
                application: app,
                orgName: org?.name || "Institution",
                fcmTokens,
                extra: null
            });

            results.push({ id: appId, name: app.full_name, ...result });
        }

        res.json({ success: true, total: results.length, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admission/sms-budget
 * Returns the current SMS spending status.
 */
export const getSmsBudget = async (req, res) => {
    res.json(getSMSBudgetStatus());
};

// ══════════════════════════════════════════════════════════════════════════════
// DAY 20: Parent Tracking Portal & Analytics
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admission/parent/login
 * Parent login via Firebase Phone OTP → Returns scoped JWT for application viewing.
 */
export const parentLogin = async (req, res) => {
    try {
        await connectDB();
        const { id_token } = req.body;

        if (!id_token) return res.status(400).json({ error: "Firebase ID token required." });

        const decodedToken = await admin.auth().verifyIdToken(id_token);
        const { phone_number: phone } = decodedToken;

        if (!phone) return res.status(400).json({ error: "Phone number not found in token." });

        // Find all applications linked to this phone (supports multi-child)
        const applications = await AdmissionApplication.find({
            $or: [
                { phone },
                { "form_data.parent_phone": phone },
                { "form_data.guardian_phone": phone }
            ],
            is_deleted: false
        })
            .select("_id full_name status organization_id hierarchy_id createdAt")
            .populate("organization_id", "name")
            .lean();

        if (applications.length === 0) {
            return res.status(404).json({ error: "No applications found for this phone number." });
        }

        // Generate parent-scoped JWT
        const token = jwt.sign({
            role: "parent",
            phone,
            application_ids: applications.map(a => a._id),
        }, JWT_SECRET, { expiresIn: "24h" });

        res.json({
            success: true,
            token,
            children: applications.map(a => ({
                application_id: a._id,
                student_name: a.full_name,
                status: a.status,
                organization: a.organization_id?.name,
                applied_at: a.createdAt
            }))
        });
    } catch (err) {
        if (err.code === "auth/id-token-expired") {
            return res.status(401).json({ error: "Token expired. Please login again." });
        }
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admission/parent/status/:applicationId
 * Returns a clean, limited readout for parents.
 */
export const parentGetStatus = async (req, res) => {
    try {
        await connectDB();
        const { applicationId } = req.params;

        // Verify parent has access to this application
        const parentPayload = req.parent_payload;
        if (!parentPayload?.application_ids?.includes(applicationId)) {
            return res.status(403).json({ error: "You do not have access to this application." });
        }

        const app = await AdmissionApplication.findById(applicationId)
            .populate("organization_id", "name")
            .populate("hierarchy_id", "name code")
            .select("full_name status merit_score prn fee_paid category seat_type form_data stage_history createdAt")
            .lean();

        if (!app) return res.status(404).json({ error: "Application not found." });

        // Return sanitized data (no admin comments, no internal IDs)
        res.json({
            success: true,
            student_name: app.full_name,
            status: app.status,
            organization: app.organization_id?.name,
            program: app.hierarchy_id?.name,
            category: app.category,
            merit_score: app.merit_score,
            prn: app.prn,
            fee_paid: app.fee_paid,
            applied_at: app.createdAt,
            timeline: (app.stage_history || []).map(s => ({
                status: s.status,
                date: s.timestamp
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admission/parent/documents/:applicationId
 * Returns document download links (receipts, letters) for parents.
 */
export const parentGetDocuments = async (req, res) => {
    try {
        await connectDB();
        const { applicationId } = req.params;

        const parentPayload = req.parent_payload;
        if (!parentPayload?.application_ids?.includes(applicationId)) {
            return res.status(403).json({ error: "You do not have access to this application." });
        }

        const app = await AdmissionApplication.findById(applicationId)
            .select("documents full_name prn")
            .lean();

        if (!app) return res.status(404).json({ error: "Application not found." });

        // Return only verified/uploaded documents (no rejected ones)
        const safeDocuments = (app.documents || [])
            .filter(d => d.status !== "rejected")
            .map(d => ({
                name: d.name,
                status: d.status,
                url: d.url
            }));

        res.json({
            success: true,
            student_name: app.full_name,
            prn: app.prn,
            documents: safeDocuments
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admission/analytics
 * Admission funnel analytics for admin dashboard.
 */
export const getAdmissionAnalytics = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { hierarchy_id } = req.query;

        const matchStage = { organization_id: orgId, is_deleted: false };
        if (hierarchy_id) matchStage.hierarchy_id = hierarchy_id;

        // Stage-wise counts
        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ];

        const stageCounts = await AdmissionApplication.aggregate(pipeline);

        // Category-wise breakdown
        const categoryPipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ];
        const categoryCounts = await AdmissionApplication.aggregate(categoryPipeline);

        // Seat type breakdown
        const seatTypePipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: "$seat_type",
                    count: { $sum: 1 }
                }
            }
        ];
        const seatTypeCounts = await AdmissionApplication.aggregate(seatTypePipeline);

        // Daily application trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyTrend = await AdmissionApplication.aggregate([
            { $match: { ...matchStage, createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fee collection summary
        const feeStats = await AdmissionApplication.aggregate([
            { $match: { ...matchStage, fee_paid: true } },
            {
                $group: {
                    _id: null,
                    paid_count: { $sum: 1 },
                    total_revenue: { $sum: "$form_data.fee_amount" }
                }
            }
        ]);

        // Document verification summary
        const docStats = await AdmissionApplication.aggregate([
            { $match: matchStage },
            { $unwind: "$documents" },
            {
                $group: {
                    _id: "$documents.status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const document_summary = { pending: 0, verified: 0, rejected: 0 };
        for (const stat of docStats) {
            if (document_summary[stat._id] !== undefined) {
                document_summary[stat._id] = stat.count;
            }
        }

        // Merit list rounds status
        const meritStats = await AdmissionApplication.aggregate([
            { $match: { ...matchStage, round_allotted: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: "$round_allotted",
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Build funnel
        const funnel = {};
        for (const item of stageCounts) {
            funnel[item._id] = item.count;
        }

        // Score Distribution (Histogram data)
        const scoreDistribution = await AdmissionApplication.aggregate([
            { $match: { ...matchStage, "form_data.10th_percentage": { $exists: true, $ne: null } } },
            {
                $bucket: {
                    groupBy: "$form_data.10th_percentage",
                    boundaries: [0, 50, 60, 70, 80, 90, 101],
                    default: "Other",
                    output: { count: { $sum: 1 } }
                }
            }
        ]);

        const totalApps = Object.values(funnel).reduce((sum, v) => sum + v, 0);

        res.json({
            success: true,
            summary: {
                total_applications: totalApps,
                funnel,
                fee_paid_count: feeStats[0]?.paid_count || 0,
                fee_total_revenue: feeStats[0]?.total_revenue || 0,
                conversion_rate: totalApps > 0
                    ? `${((funnel.enrolled || 0) / totalApps * 100).toFixed(1)}%`
                    : "0%"
            },
            document_summary,
            fee_summary: {
                total_collected: feeStats[0]?.total_revenue || 0,
                paid_count: feeStats[0]?.paid_count || 0,
                pending_count: totalApps - (feeStats[0]?.paid_count || 0)
            },
            merit_rounds_status: meritStats,
            breakdown: {
                by_category: categoryCounts,
                by_seat_type: seatTypeCounts
            },
            daily_trend: dailyTrend,
            score_distribution: scoreDistribution
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admission/cet/dashboard
 * Engineering-specific analytics: CAP round stats, seat fill rates.
 */
export const getCETDashboard = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;

        // CAP Round wise allotment counts
        // Note: CETAllotment has no is_claimed field. "Claimed" = status reached enrolled/prn_generated/division_allotted.
        const CLAIMED_STATUSES = ["prn_generated", "admin_verified", "division_allotted", "enrolled"];
        const capRoundStats = await CETAllotment.aggregate([
            { $match: { organization_id: orgId } },
            {
                $group: {
                    _id: "$cap_round",
                    total: { $sum: 1 },
                    claimed: {
                        $sum: {
                            $cond: [{ $in: ["$status", CLAIMED_STATUSES] }, 1, 0]
                        }
                    },
                    upgraded: {
                        $sum: { $cond: [{ $eq: ["$status", "upgraded_to_other"] }, 1, 0] }
                    },
                    cancelled: {
                        $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Branch-wise fill rates
        const branchStats = await CETAllotment.aggregate([
            { $match: { organization_id: orgId } },
            {
                $group: {
                    _id: "$branch_name",
                    total: { $sum: 1 },
                    claimed: {
                        $sum: {
                            $cond: [{ $in: ["$status", CLAIMED_STATUSES] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // RLA Status breakdown
        const rlaStats = await AdmissionApplication.aggregate([
            { $match: { organization_id: orgId, en_number: { $exists: true, $ne: null }, is_deleted: false } },
            {
                $group: {
                    _id: "$rla_status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Seat matrix live state
        const seatMatrix = await seatMatrixService.getFullMatrix(orgId);

        res.json({
            success: true,
            cap_rounds: capRoundStats,
            branch_fill_rates: branchStats,
            rla_breakdown: rlaStats,
            seat_matrix: seatMatrix
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// DAY 21: ACAP Operations & Live Systems
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admission/acap/register
 * Time-bound ACAP registration (Spot Round / Institutional).
 */
export const acapRegister = async (req, res) => {
    try {
        await connectDB();
        const { organization_id, full_name, phone, email, dob, form_data, acap_type } = req.body;

        if (!organization_id || !full_name || !acap_type) {
            return res.status(400).json({ error: "organization_id, full_name, and acap_type are required." });
        }

        // Validate ACAP type
        const validTypes = ["spot", "institutional", "management"];
        if (!validTypes.includes(acap_type)) {
            return res.status(400).json({ error: `acap_type must be one of: ${validTypes.join(", ")}` });
        }

        // Check if ACAP registration window is open
        const org = await Organization.findById(organization_id).select("admission_config").lean();
        const acapConfig = org?.admission_config?.acap_config;

        if (acapConfig) {
            const now = new Date();
            const windowKey = `${acap_type}_window`;
            const window = acapConfig[windowKey];
            if (window) {
                if (now < new Date(window.opens_at)) {
                    return res.status(403).json({ error: `${acap_type} registration has not opened yet.` });
                }
                if (now > new Date(window.closes_at)) {
                    return res.status(403).json({ error: `${acap_type} registration window has closed.` });
                }
            }
        }

        // Scholarships:  Spot = YES, Institutional = NO, Management = NO
        const scholarshipsEnabled = acap_type === "spot";

        const application = new AdmissionApplication({
            organization_id,
            full_name,
            phone,
            email,
            dob: dob ? new Date(dob) : undefined,
            form_data: {
                ...form_data,
                acap_type,
                acap_registered_at: new Date(),
                scholarships_enabled: scholarshipsEnabled,
            },
            status: ADMISSION_STAGES.APPLIED,
            stage_history: [{
                status: ADMISSION_STAGES.APPLIED,
                comment: `ACAP ${acap_type} registration.`
            }]
        });

        await application.save();

        res.status(201).json({
            success: true,
            application_id: application._id,
            acap_type,
            scholarships_enabled: scholarshipsEnabled,
            message: `Registered for ${acap_type} round.`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admission/acap/generate-merit
 * Generates the Provisional/Final merit list for a specific ACAP type.
 */
export const acapGenerateMerit = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { hierarchy_id, acap_type, list_type } = req.body;

        if (!acap_type) return res.status(400).json({ error: "acap_type is required." });

        // Filter applications by ACAP type
        const query = {
            organization_id: orgId,
            "form_data.acap_type": acap_type,
            is_deleted: false,
            status: { $in: ["applied", "verified"] }
        };
        if (hierarchy_id) query.hierarchy_id = hierarchy_id;

        const applications = await AdmissionApplication.find(query)
            .select("full_name phone merit_score category form_data createdAt")
            .sort({ merit_score: -1, createdAt: 1 })
            .lean();

        // Assign rank
        const meritList = applications.map((app, idx) => ({
            merit_rank: idx + 1,
            full_name: app.full_name,
            phone: app.phone,
            merit_score: app.merit_score,
            category: app.category,
            acap_type: app.form_data?.acap_type,
            applied_at: app.createdAt,
            _id: app._id
        }));

        res.json({
            success: true,
            acap_type,
            list_type: list_type || "provisional",
            count: meritList.length,
            merit_list: meritList
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admission/acap/verify-gate
 * Gate verification — checks if a student is on the final merit list before issuing boarding token.
 */
export const verifyGateEntry = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { application_id, phone, en_number } = req.body;

        let application;
        if (application_id) {
            application = await AdmissionApplication.findOne({ _id: application_id, organization_id: orgId });
        } else if (phone) {
            application = await AdmissionApplication.findOne({ organization_id: orgId, phone, is_deleted: false });
        } else if (en_number) {
            application = await AdmissionApplication.findOne({ organization_id: orgId, en_number, is_deleted: false });
        }

        if (!application) {
            return res.status(404).json({
                verified: false,
                error: "Student not found on the merit list.",
                action: "DENY_ENTRY"
            });
        }

        // Check status — only verified/applied students can enter
        const allowedStatuses = ["applied", "verified", "fee_pending"];
        if (!allowedStatuses.includes(application.status)) {
            return res.status(403).json({
                verified: false,
                error: `Application status is "${application.status}". Entry not allowed.`,
                action: "DENY_ENTRY"
            });
        }

        // Generate boarding token
        const boardingToken = `BT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        application.form_data = application.form_data || {};
        application.form_data.boarding_token = boardingToken;
        application.form_data.gate_verified_at = new Date();
        await application.save();

        // Broadcast gate entry event
        seatMatrixService.broadcastUpdate(orgId, "GATE_ENTRY", {
            full_name: application.full_name,
            merit_score: application.merit_score,
            boarding_token: boardingToken
        });

        res.json({
            verified: true,
            action: "ALLOW_ENTRY",
            boarding_token: boardingToken,
            full_name: application.full_name,
            merit_score: application.merit_score,
            category: application.category,
            status: application.status
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/admission/merit-list/live
 * Highly-optimized broadcast-ready endpoint for projector displays.
 * Returns cached merit list with minimal payload.
 */
export const getLiveMeritListOptimized = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.query.org_id || req.user?.organization_id;
        const { hierarchy_id, category, limit = 200 } = req.query;

        if (!orgId) return res.status(400).json({ error: "org_id is required." });

        const query = {
            organization_id: orgId,
            is_deleted: false,
            status: { $in: ["applied", "verified", "fee_pending", "enrolled"] }
        };
        if (hierarchy_id) query.hierarchy_id = hierarchy_id;
        if (category) query.category = category;

        const candidates = await AdmissionApplication.find(query)
            .select("full_name en_number merit_score category status is_called form_data.boarding_token form_data.assigned_division")
            .sort({ merit_score: -1, createdAt: 1 })
            .limit(parseInt(limit))
            .lean();

        // Add rank
        const rankedList = candidates.map((c, idx) => ({
            rank: idx + 1,
            name: c.full_name,
            en: c.en_number || null,
            score: c.merit_score,
            cat: c.category,
            status: c.status,
            called: c.is_called,
            token: c.form_data?.boarding_token || null,
            div: c.form_data?.assigned_division || null
        }));

        // Set cache headers for CDN/proxy caching
        res.setHeader("Cache-Control", "public, max-age=5"); // 5-second cache for rapid polling
        res.setHeader("X-Total-Count", rankedList.length);

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            count: rankedList.length,
            list: rankedList
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// DAY 22: Admin Verification & Selection APIs
// ══════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/admission/applications/:id/stage
 * Advances or reverts a single application stage.
 */
export const updateApplicationStage = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { status, comment } = req.body;
        const orgId = req.user.organization_id;

        const application = await AdmissionApplication.findOne({ _id: id, organization_id: orgId });
        if (!application) return res.status(404).json({ error: "Application not found." });

        application.status = status;
        application.stage_history.push({
            status,
            changed_by: req.user._id,
            comment: comment || `Stage manually updated to ${status}.`
        });

        await application.save();

        // ── Auto email notification on stage change ──
        const STAGE_TRIGGER_MAP = {
            verified: "DOCUMENTS_VERIFIED",
            fee_pending: "FEE_PAYMENT_PENDING",
            selected: "SELECTED",
            waitlisted: "WAITLISTED",
            enrolled: "ENROLLED",
            under_verification: "APPLICATION_UNDER_REVIEW",
        };
        const trigger = STAGE_TRIGGER_MAP[status];
        if (trigger) {
            try {
                const org = await Organization.findById(orgId).select("name").lean();
                const trackUrl = `${process.env.CLIENT_URL || "https://classgrid.in"}/apply/${orgId}`;
                await dispatchNotification(trigger, {
                    application: application.toObject(),
                    orgName: org?.name || "Institution",
                    fcmTokens: [],
                    extra: { track_url: trackUrl, appId: application._id }
                });
            } catch (notifErr) {
                console.warn(`[Notify] Stage email failed for ${status}:`, notifErr.message);
            }
        }

        res.json({
            success: true,
            message: `Application stage updated to ${status}.`,
            application_id: id,
            status
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admission/admin/bulk-verify
 * Bulk verifies selected demographic and medical documents.
 */
export const bulkVerifyApplications = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { application_ids, comment } = req.body;

        if (!application_ids || !Array.isArray(application_ids)) {
            return res.status(400).json({ error: "application_ids array required." });
        }

        const updateResult = await AdmissionApplication.updateMany(
            { _id: { $in: application_ids }, organization_id: orgId },
            {
                $set: { status: "verified" },
                $push: {
                    stage_history: {
                        status: "verified",
                        changed_by: req.user._id,
                        comment: comment || "Bulk verification of demographics and documents.",
                        timestamp: new Date()
                    }
                }
            }
        );

        // Fire DOCUMENTS_VERIFIED email for each verified candidate (async, non-blocking)
        (async () => {
            try {
                const org = await Organization.findById(orgId).select("name").lean();
                const trackUrl = `${process.env.CLIENT_URL || "https://classgrid.in"}/apply/${orgId}`;
                const apps = await AdmissionApplication.find({ _id: { $in: application_ids } }).lean();
                for (const app of apps) {
                    await dispatchNotification("DOCUMENTS_VERIFIED", {
                        application: app,
                        orgName: org?.name || "Institution",
                        fcmTokens: [],
                        extra: { track_url: trackUrl, appId: app._id }
                    }).catch(e => console.warn("[Notify] bulk-verify email failed:", e.message));
                }
            } catch (e) { console.warn("[Notify] bulk-verify batch error:", e.message); }
        })();

        res.json({
            success: true,
            message: `Successfully verified ${updateResult.modifiedCount} applications.`,
            count: updateResult.modifiedCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/admission/admin/bulk-select
 * Bulk select top merit candidates and move them to fee_pending.
 */
export const bulkSelectApplications = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { application_ids, comment } = req.body;

        if (!application_ids || !Array.isArray(application_ids)) {
            return res.status(400).json({ error: "application_ids array required." });
        }

        const updateResult = await AdmissionApplication.updateMany(
            { _id: { $in: application_ids }, organization_id: orgId },
            {
                $set: { status: "fee_pending", is_called: true },
                $push: {
                    stage_history: {
                        status: "fee_pending",
                        changed_by: req.user._id,
                        comment: comment || "Selected from merit list. Awaiting fee payment.",
                        timestamp: new Date()
                    }
                }
            }
        );

        // Fire SELECTED + FEE_PAYMENT_PENDING notifications (async, non-blocking)
        (async () => {
            try {
                const org = await Organization.findById(orgId).select("name").lean();
                const trackUrl = `${process.env.CLIENT_URL || "https://classgrid.in"}/apply/${orgId}`;
                const apps = await AdmissionApplication.find({ _id: { $in: application_ids } }).lean();
                for (const app of apps) {
                    await dispatchNotification("SELECTED", {
                        application: app,
                        orgName: org?.name || "Institution",
                        fcmTokens: [],
                        extra: { track_url: trackUrl, appId: app._id }
                    }).catch(e => console.warn("[Notify] SELECTED email failed:", e.message));
                    await dispatchNotification("FEE_PAYMENT_PENDING", {
                        application: app,
                        orgName: org?.name || "Institution",
                        fcmTokens: [],
                        extra: { track_url: trackUrl, appId: app._id }
                    }).catch(e => console.warn("[Notify] FEE_PAYMENT_PENDING email failed:", e.message));
                }
            } catch (e) { console.warn("[Notify] bulk-select batch error:", e.message); }
        })();

        res.json({
            success: true,
            message: `Successfully selected ${updateResult.modifiedCount} candidates for admission.`,
            count: updateResult.modifiedCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── Parent Auth Middleware ───

/**
 * Middleware: Verify parent JWT token.
 */
export const isParent = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) return res.status(401).json({ error: "Parent session token required." });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== "parent") {
            return res.status(403).json({ error: "Invalid session type." });
        }
        req.parent_payload = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Session expired or invalid." });
    }
};

// ==========================================
// 🏛️ PHASE D: RLA & UPGRADE FLOWS (DTE MAHARASHTRA)
// ==========================================

/**
 * Admin: Mark student as physically reported (RLA)
 * POST /api/admission/cet/:en_number/report
 */
export const reportRLA = async (req, res) => {
    try {
        await connectDB();
        const { en_number } = req.params;
        const orgId = req.user.organization_id;

        const allotment = await CETAllotment.findOne({ organization_id: orgId, en_number });
        if (!allotment) return res.status(404).json({ error: "CET Allotment not found." });

        if (allotment.rla_status === "reported" || allotment.rla_status === "confirmed") {
            return res.status(400).json({ error: "Student is already marked as reported/confirmed." });
        }

        allotment.rla_status = "reported";
        allotment.reported_at = new Date();
        allotment.reported_to_officer = req.user._id;

        allotment.audit_log.push({
            action: "RLA_REPORTED",
            performed_by: req.user._id,
            timestamp: new Date()
        });

        await allotment.save();

        // Sync RLA status to AdmissionApplication so workflow gates unlock correctly
        const application = await AdmissionApplication.findOne({ organization_id: orgId, en_number });
        if (application) {
            application.rla_status = "reported";
            await application.save();
        }

        res.json({ success: true, message: "Student physically reported successfully. Fee payment unlocked.", rla_status: allotment.rla_status });
    } catch (err) {
        res.status(500).json({ error: "Failed to mark RLA.", details: err.message });
    }
};

/**
 * Admin: Request NOC (Student leaving this college for an upgrade)
 * POST /api/admission/cet/:en_number/request-noc
 */
export const requestNOC = async (req, res) => {
    try {
        await connectDB();
        const { en_number } = req.params;
        const orgId = req.user.organization_id;

        const allotment = await CETAllotment.findOne({ organization_id: orgId, en_number });
        if (!allotment) return res.status(404).json({ error: "CET Allotment not found." });

        // Logic: Mark the student as leaving, release their seat locally.
        allotment.rla_status = "upgraded";
        allotment.status = "upgraded_to_other";

        allotment.noc_details = {
            issued: true,
            issued_at: new Date(),
            issued_by: req.user._id,
            seat_released_at: new Date()
        };

        allotment.audit_log.push({
            action: "NOC_ISSUED_NODE_RELEASED",
            performed_by: req.user._id,
            timestamp: new Date()
        });

        // Add back to Seat Matrix logic would trigger here.
        await allotment.save();

        // Sync RLA status to AdmissionApplication
        const application = await AdmissionApplication.findOne({ organization_id: orgId, en_number });
        if (application) {
            application.rla_status = "upgraded";
            await application.save();
        }

        res.json({ success: true, message: "NOC Issued. Seat released to pool." });
    } catch (err) {
        res.status(500).json({ error: "Failed to issue NOC.", details: err.message });
    }
};

/**
 * Admin: Confirm CAP Upgrade (Student arriving from another college)
 * POST /api/admission/cet/:en_number/confirm-upgrade
 */
export const confirmUpgrade = async (req, res) => {
    try {
        await connectDB();
        const { en_number } = req.params;
        const orgId = req.user.organization_id;

        const allotment = await CETAllotment.findOne({ organization_id: orgId, en_number });
        // The student MUST be in our allotment DB for the newly allotted round (e.g. CAP-II)
        if (!allotment) return res.status(404).json({ error: "No incoming allotment found for this EN number in current round." });

        // The admin must verify the NOC from the previous college.
        allotment.upgrade_transfer = {
            transferred_at: new Date(),
            to_round: allotment.cap_round
        };

        // We treat them identically to a reported student now
        allotment.rla_status = "reported";
        allotment.reported_at = new Date();
        allotment.reported_to_officer = req.user._id;

        allotment.audit_log.push({
            action: "UPGRADE_CONFIRMED",
            performed_by: req.user._id,
            timestamp: new Date()
        });

        await allotment.save();

        res.json({ success: true, message: "Upgrade transfer confirmed successfully. Proceed to Fee Payment." });
    } catch (err) {
        res.status(500).json({ error: "Failed to confirm upgrade.", details: err.message });
    }
};
/**
 * Admin: Advance Admission Round (Day 23)
 * Edge Case 7: Multi-Round Admission Tracking
 */
export const advanceAdmissionRound = async (req, res) => {
    try {
        await connectDB();
        const organization_id = req.user.organization_id;

        const org = await Organization.findById(organization_id);
        if (!org) {
            return res.status(404).json({ error: "Organization not found" });
        }

        const admissionRound = org.admission_config?.admission_round || { current_round: 1, max_rounds: 3, round_history: [] };

        if (admissionRound.current_round >= admissionRound.max_rounds) {
            return res.status(400).json({ error: "Maximum number of rounds reached." });
        }

        // Calculate seats filled
        const seatsFilled = await AdmissionApplication.countDocuments({
            organization_id,
            status: { $in: ["enrolled", "fees_paid"] }
        });

        // Calculate total allotted seats from org config
        const totalSeats = org.admission_config?.selection_config?.seat_capacity || 0;
        const seatsRemaining = totalSeats > 0 ? totalSeats - seatsFilled : 0;

        // Push current round to history
        admissionRound.round_history.push({
            round_number: admissionRound.current_round,
            merit_list_published_at: new Date(),
            seats_filled: seatsFilled,
            seats_remaining: seatsRemaining
        });

        // Advance to next round
        admissionRound.current_round += 1;

        // Save
        org.set("admission_config.admission_round", admissionRound);
        // Ensure we close the portal if it's the final round and no seats remain
        if (totalSeats > 0 && seatsRemaining === 0) {
            org.set("admission_config.is_portal_open", false);
        }

        await org.save();

        res.json({
            success: true,
            message: `Advanced to Round ${admissionRound.current_round}`,
            round_data: admissionRound
        });

    } catch (err) {
        console.error("Advance Round Error:", err);
        res.status(500).json({ error: "Failed to advance admission round", details: err.message });
    }
};

/**
 * Admin: Unlock a specific student's edit window
 * PATCH /api/admission/applications/:id/unlock-edit
 * 
 * Edge Case 4 Extension: Allows org_admin/admission_head to override
 * the org-wide editable_until deadline for individual students.
 */
export const unlockStudentEditWindow = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user._id;
        const orgId = req.user.organization_id;

        if (!reason || reason.trim().length < 5) {
            return res.status(400).json({ error: "A reason is required (min 5 chars) for audit compliance." });
        }

        const application = await AdmissionApplication.findOne({
            _id: id,
            organization_id: orgId,
            is_deleted: false
        });

        if (!application) {
            return res.status(404).json({ error: "Application not found." });
        }

        if (application.edit_lock_override?.unlocked) {
            return res.status(400).json({
                error: "Application is already unlocked.",
                unlocked_at: application.edit_lock_override.unlocked_at
            });
        }

        application.edit_lock_override = {
            unlocked: true,
            unlocked_by: adminId,
            unlocked_at: new Date(),
            unlock_reason: reason.trim()
        };

        application.stage_history.push({
            status: application.status,
            changed_by: adminId,
            comment: `Edit window unlocked by admin. Reason: ${reason.trim()}`,
            timestamp: new Date()
        });

        await application.save();

        res.json({
            success: true,
            message: `Edit window unlocked for ${application.full_name}.`,
            application_id: id,
            unlocked_by: adminId
        });

    } catch (err) {
        console.error("Unlock Edit Window Error:", err);
        res.status(500).json({ error: "Failed to unlock edit window", details: err.message });
    }
};

/**
 * Admin: Re-lock a student's edit window (revoke override)
 * PATCH /api/admission/applications/:id/lock-edit
 */
export const lockStudentEditWindow = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const orgId = req.user.organization_id;

        const application = await AdmissionApplication.findOne({
            _id: id,
            organization_id: orgId,
            is_deleted: false
        });

        if (!application) {
            return res.status(404).json({ error: "Application not found." });
        }

        application.edit_lock_override = {
            unlocked: false,
            unlocked_by: null,
            unlocked_at: null,
            unlock_reason: null
        };

        application.stage_history.push({
            status: application.status,
            changed_by: req.user._id,
            comment: "Edit window re-locked by admin.",
            timestamp: new Date()
        });

        await application.save();

        res.json({ success: true, message: `Edit window re-locked for ${application.full_name}.` });

    } catch (err) {
        console.error("Lock Edit Window Error:", err);
        res.status(500).json({ error: "Failed to lock edit window", details: err.message });
    }
};
