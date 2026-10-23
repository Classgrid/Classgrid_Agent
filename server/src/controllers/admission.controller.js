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
 * The ffffrontend is hosted 100% on Vercel. EC2 is only for the backend.
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

import AdmissionConfig from "../models/AdmissionConfig.js";
import AdmissionApplication from "../models/AdmissionApplication.js";
import CETAllotment from "../models/CETAllotment.js";
import AdmissionOTP from "../models/AdmissionOTP.js";
import { sendEmail } from "../services/aws-ses.service.js";
import {
    getAdmissionFeeReceiptHtml,
    getAdmissionFeeReceiptPlainText
} from "../services/email-templates.service.js";
import jwt from "jsonwebtoken";
import connectDB from "../../config/db.js";
import Organization from "../models/Organization.js";
import { checkDuplicate } from "../services/admissions/duplicate-detector.service.js";
import { checkTransitionGates, ADMISSION_STAGES, promoteWaitlistInternal } from "../services/admissions/admission-workflow.service.js";
import scholarshipService from "../services/admissions/scholarship.service.js";
import admin from "firebase-admin";
import "../services/firebase.service.js"; // Ensure firebase-admin is initialized
import { validateENNumber } from "../utils/admission-en-validator.js";
import { getAdmissionStrategy, getResolvedAdmissionStrategy } from "../services/admissions/strategy-selector.js";
import storageService from "../services/storage.service.js";
import seatMatrixService from "../services/admissions/seat-matrix.service.js";
import razorpayService from "../services/razorpay.service.js";
import FeeStructure from "../models/FeeStructure.js";
import StudentFeeLedger from "../models/StudentFeeLedger.js";
import FeeTransaction from "../models/FeeTransaction.js";
import FeeRecord from "../models/FeeRecord.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { generatePRNForApplication } from "../services/admissions/prn-generator.service.js";
import {
    CLAIMABLE_CET_STATUSES,
    getEngineeringInstituteCode,
    hasAdmissionFieldValue,
} from "../services/admissions/admission-engine.helpers.js";
import {
    getDefaultQuotaByStructureType,
    isCETStructureType,
    isCoachingStructureType,
    isJuniorCollegeStructureType,
    isSchoolStructureType,
    resolveStructureType,
} from "../services/admissions/organization-admission-type.service.js";
import { executeAllocation } from "../services/admissions/division-allocator.service.js";
import { generateDTEExport, generateSARALExport, generateAICTEExport, generateStateBoardExport } from "../services/admissions/govt-export.service.js";
import * as xlsx from "xlsx";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const emitSeatBroadcast = (orgId, type, seatResult) => {
    if (!seatResult?.success) {
        return;
    }

    seatMatrixService.broadcastUpdate(orgId, type, {
        hierarchyId: seatResult.hierarchyId,
        quotaName: seatResult.quotaName,
        vacancy: seatResult.vacancy,
        totalFilled: seatResult.totalFilled,
    });
};

const getWebhookRawBody = (body) => {
    if (Buffer.isBuffer(body)) {
        return body;
    }

    if (typeof body === "string") {
        return Buffer.from(body, "utf8");
    }

    return Buffer.from(JSON.stringify(body || {}), "utf8");
};

const parseWebhookEvent = (body) => {
    const rawBody = getWebhookRawBody(body);
    const rawText = rawBody.toString("utf8").trim();
    return rawText ? JSON.parse(rawText) : {};
};

/**
 * Admin: Import CET Allotments from JSON/Excel/CSV
 */
export const importCETAllotments = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        let { allotments, cap_round } = req.body;

        if (!cap_round) {
            return res.status(400).json({ error: "cap_round is required." });
        }

        const org = await Organization.findById(orgId).select("admission_config").lean();
        const instituteCode = getEngineeringInstituteCode(org);

        let parsedAllotments = [];

        // Handle File Upload (Excel/CSV)
        if (req.file) {
            const buffer = req.file.buffer;
            const workbook = xlsx.read(buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Expected headers: en_number, candidate_name, merit_number, mht_cet_score, gender, category, candidature_type, etc.
            const rawData = xlsx.utils.sheet_to_json(worksheet);

            parsedAllotments = rawData.map(row => {
                // Map possible header variations
                return {
                    en_number: row["EN Number"] || row["Application ID"] || row["en_number"] || String(row["EN_NO"] || ""),
                    candidate_name: row["Candidate Name"] || row["Name"] || row["candidate_name"] || String(row["NAME"] || ""),
                    gender: row["Gender"] || row["gender"] || "M", // Default fallback if missing
                    category: row["Category"] || row["category"] || "OPEN",
                    branch_name: row["Branch"] || row["course_name"] || row["branch_name"] || row["branch_allotted"],
                    seat_type: row["Seat Type"] || row["seat_type"] || row["allotted_seat_type"],
                    mht_cet_score: row["CET Score"] || row["mht_cet_score"],
                    merit_number: row["State Merit No"] || row["merit_number"]
                };
            });
        } else if (allotments && (typeof allotments === "string" || Array.isArray(allotments))) {
            // Handle raw JSON body
            parsedAllotments = typeof allotments === "string" ? JSON.parse(allotments) : allotments;
        }

        if (!parsedAllotments || !Array.isArray(parsedAllotments) || parsedAllotments.length === 0) {
            return res.status(400).json({ error: "Invalid allotments data format or empty file." });
        }

        // Validate and Sanitize
        const validOps = [];
        const invalidRows = [];

        for (const item of parsedAllotments) {
            if (!item.en_number || !item.candidate_name) {
                invalidRows.push({ item, error: "Missing required fields" });
                continue;
            }

            const cleanEN = item.en_number.toString().trim().toUpperCase();

            // Validate EN Checksum and Institute Code match
            const checksumResult = validateENNumber(cleanEN, instituteCode);
            if (!checksumResult.valid) {
                invalidRows.push({ item, error: checksumResult.error });
                continue;
            }

            validOps.push({
                updateOne: {
                    filter: { organization_id: orgId, cap_round, en_number: cleanEN },
                    update: {
                        ...item,
                        en_number: cleanEN,
                        organization_id: orgId,
                        cap_round
                    },
                    upsert: true,
                },
            });
        }

        if (validOps.length > 0) {
            await CETAllotment.bulkWrite(validOps);
        }

        // ─── AUTO-UPGRADE DETECTION (Edge Case: CAP Round Upgrade Flagging) ───
        // When importing a later CAP round, check if any EN numbers in this batch
        // already have an active application from an earlier round.
        // If so, flag them for admin review as potential upgrades.
        const importedENs = validOps.map(op => op.updateOne.filter.en_number);
        let autoFlaggedUpgrades = [];

        if (importedENs.length > 0) {
            // Find applications from earlier rounds that match these EN numbers
            const existingApps = await AdmissionApplication.find({
                organization_id: orgId,
                en_number: { $in: importedENs },
                status: { $nin: ["withdrawn", "upgraded"] },
                is_deleted: false
            }).select("en_number full_name status");

            if (existingApps.length > 0) {
                for (const app of existingApps) {
                    // Flag in stage_history for admin review
                    app.stage_history.push({
                        status: app.status,
                        comment: `⚠️ AUTO-FLAG: Same EN (${app.en_number}) appeared in ${cap_round} import. Student may be upgrading to another college. Review required.`,
                        timestamp: new Date()
                    });
                    await app.save();
                    autoFlaggedUpgrades.push({ en: app.en_number, name: app.full_name, current_status: app.status });
                }
            }
        }

        res.json({
            success: true,
            message: `Successfully processed file. Imported ${validOps.length} allotments. Failed: ${invalidRows.length}.${autoFlaggedUpgrades.length > 0 ? ` ⚠️ ${autoFlaggedUpgrades.length} potential upgrade(s) detected.` : ""}`,
            imported_count: validOps.length,
            failed_count: invalidRows.length,
            failed_rows: invalidRows.slice(0, 10),
            auto_flagged_upgrades: autoFlaggedUpgrades
        });

    } catch (err) {
        console.error("Import Error:", err);
        res.status(500).json({ error: "Import failed", details: err.message });
    }
};

/**
 * Student: Validate EN Number
 */
export const validateEN = async (req, res) => {
    try {
        await connectDB();
        const { en_number, organization_id } = req.body;

        // 1. Validate Organization and Portal State
        const org = await Organization.findById(organization_id).select("admission_config").lean();
        if (!org || !org.admission_config?.is_portal_open) {
            return res.status(403).json({ error: "Portal is closed or Organization not found." });
        }

        // 2. Checksum Validation (Pre-DB)
        const checksumResult = validateENNumber(en_number, getEngineeringInstituteCode(org));
        if (!checksumResult.valid) {
            return res.status(400).json({ error: checksumResult.error });
        }

        // 3. Database Lookup
        const allotment = await CETAllotment.findOne({
            organization_id,
            en_number,
            status: { $in: CLAIMABLE_CET_STATUSES },
        })
            .sort({ cap_round: -1 });

        if (!allotment) {
            return res.status(404).json({
                error: "No active allotment found for this EN number.",
                hint: "Ensure you are entering the correct number and that the allotment is for this institute."
            });
        }

        res.json({
            message: "Allotment found.",
            candidate_name: allotment.candidate_name,
            branch: allotment.branch_name
        });
    } catch (err) {
        res.status(500).json({ error: "Validation failed" });
    }
};

/**
 * Student: Send OTP to provided email
 */
export const sendENOTP = async (req, res) => {
    try {
        await connectDB();
        const { en_number, email, organization_id } = req.body;

        const org = await Organization.findById(organization_id).select("admission_config").lean();

        // 1. Checksum Check
        const checksumResult = validateENNumber(en_number, getEngineeringInstituteCode(org));
        if (!checksumResult.valid) {
            return res.status(400).json({ error: checksumResult.error });
        }

        // 2. Rate Limiting (3 per hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const otpCount = await AdmissionOTP.countDocuments({
            organization_id,
            en_number,
            createdAt: { $gte: oneHourAgo }
        });

        if (otpCount >= 3) {
            return res.status(429).json({ error: "Too many OTP requests. Please try again in an hour." });
        }

        // 3. Check if EN exists
        const allotment = await CETAllotment.findOne({
            organization_id,
            en_number,
            status: { $in: CLAIMABLE_CET_STATUSES },
        });
        if (!allotment) return res.status(404).json({ error: "Identity not recognized or already claimed." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        await AdmissionOTP.create({
            organization_id,
            en_number,
            email,
            otp,
            expires_at,
            purpose: "en_validation"
        });

        // 4. Send Email
        await sendEmail({
            to: email,
            subject: "Classgrid Admission OTP",
            html: `<p>Your verification code for admission is: <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
            text: `Your verification code is: ${otp}`
        });

        res.json({ message: "OTP sent to your email." });
    } catch (err) {
        res.status(500).json({ error: "Failed to send OTP", details: err.message });
    }
};

/**
 * Student: Verify OTP and Create/Return Application Session
 */
export const verifyENOTP = async (req, res) => {
    try {
        await connectDB();
        const { en_number, email, otp, organization_id } = req.body;

        const record = await AdmissionOTP.findOne({ organization_id, en_number, email });
        if (!record || record.otp !== otp || record.expires_at < new Date()) {
            return res.status(400).json({ error: "Invalid or expired OTP." });
        }

        // OTP Valid. Find or Create Application
        let application = await AdmissionApplication.findOne({ organization_id, en_number });

        if (!application) {
            const allotment = await CETAllotment.findOne({ organization_id, en_number }).sort({ cap_round: -1 });
            application = await AdmissionApplication.create({
                organization_id,
                en_number,
                full_name: allotment.candidate_name,
                email,
                status: "draft",
                allotment_history: [{
                    round: allotment.cap_round,
                    branch: allotment.branch_name,
                    seat_type: allotment.seat_type
                }]
            });
        }

        // Cleanup OTP
        await AdmissionOTP.deleteOne({ _id: record._id });

        // Issue Admission Session Token
        const token = jwt.sign(
            {
                application_id: application._id,
                en_number: application.en_number,
                organization_id,
                role: "admission_candidate"
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            message: "Authentication successful.",
            token,
            application_id: application._id,
            status: application.status
        });
    } catch (err) {
        res.status(500).json({ error: "Verification failed" });
    }
};

/**
 * Student: Send Email OTP (For Classgrid App Credentials in Form)
 */
export const sendEmailOTP = async (req, res) => {
    try {
        await connectDB();
        const { email, organization_id, phone } = req.body;

        if (!email || !organization_id) {
            return res.status(400).json({ error: "Email and organization ID are required." });
        }

        // Rate Limiting (3 per hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const otpCount = await AdmissionOTP.countDocuments({
            organization_id,
            email,
            createdAt: { $gte: oneHourAgo }
        });

        if (otpCount >= 3) {
            return res.status(429).json({ error: "Too many OTP requests. Please try again in an hour." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        await AdmissionOTP.create({
            organization_id,
            email,
            phone,
            otp,
            expires_at,
            purpose: "email_validation"
        });

        const { sendEmail } = await import("../services/aws-ses.service.js");
        await sendEmail({
            to: email,
            subject: "Verify Your Classgrid Login Email",
            html: `<p>Your verification code to setup your Classgrid App Profile is: <br/><br/><strong style="font-size:24px;">${otp}</strong><br/><br/>It expires in 10 minutes.</p>`,
            text: `Your verification code is: ${otp}`
        });

        res.json({ message: "OTP sent to your email." });
    } catch (err) {
        res.status(500).json({ error: "Failed to send Email OTP", details: err.message });
    }
};

/**
 * Student: Verify Email OTP
 */
export const verifyEmailOTP = async (req, res) => {
    try {
        await connectDB();
        const { email, otp, organization_id } = req.body;

        const record = await AdmissionOTP.findOne({
            organization_id,
            email,
            purpose: "email_validation"
        }).sort({ createdAt: -1 });

        if (!record || record.otp !== otp || record.expires_at < new Date()) {
            return res.status(400).json({ error: "Invalid or expired OTP." });
        }

        // OTP Valid. Securely mark instead of deleting immediately.
        record.purpose = "email_verified_success";
        await record.save();

        res.json({ success: true, message: "Email verified successfully." });
    } catch (err) {
        res.status(500).json({ error: "Email verification failed" });
    }
};

/**
 * Student (Direct): Verify Firebase Phone OTP & Check Duplicates
 * POST /api/admission/verify-phone
 */
export const verifyPhoneOTP = async (req, res) => {
    try {
        await connectDB();
        const { idToken, organization_id } = req.body;

        if (!idToken || !organization_id) {
            return res.status(400).json({ error: "Missing ID token or organization ID." });
        }

        // 1. Verify Firebase ID Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { phone_number: phone } = decodedToken;

        if (!phone) {
            return res.status(400).json({ error: "Phone number not found in token." });
        }

        // 2. Fetch Organization to check if portal is open
        const org = await Organization.findById(organization_id).lean();
        if (!org || !org.admission_config?.is_portal_open) {
            return res.status(403).json({ error: "Admission portal is closed for this organization." });
        }

        // 2.5 Block Engineering / Diploma Direct Apply (Must go through CET Validation)
        const structureType = resolveStructureType(org);
        if (isCETStructureType(structureType)) {
            return res.status(403).json({
                error: "Engineering/Diploma admissions are managed strictly through CET profile validation.",
                hint: "Use the authentic CET portal flow: /api/admission/cet/validate-en"
            });
        }

        // 3. Check for Duplicates (Active applications only)
        const duplicate = await checkDuplicate(organization_id, { phone });

        // If an application already exists under this phone, return it
        let application = duplicate;

        if (!application) {
            // Check if there's any record that was withdrawn—we might allow re-application
            // For now, we reuse the existing record if it exists
            application = await AdmissionApplication.create({
                organization_id,
                phone,
                full_name: "New Applicant", // Temporary placeholder
                status: ADMISSION_STAGES.DRAFT,
                stage_history: [{ status: ADMISSION_STAGES.DRAFT, comment: "Initial registration via Phone OTP" }]
            });
        }

        // 4. Issue Admission Session Token
        const token = jwt.sign(
            {
                application_id: application._id,
                phone: application.phone,
                organization_id,
                role: "admission_candidate"
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            message: "Phone verified successfully.",
            token,
            application_id: application._id,
            status: application.status,
            phone: application.phone
        });

    } catch (err) {
        console.error("verifyPhoneOTP Error:", err);
        res.status(500).json({ error: "Phone verification failed", details: err.message });
    }
};

/**
 * Student: Save Draft Application
 * POST /api/admission/save-draft
 */
export const saveApplicationDraft = async (req, res) => {
    try {
        await connectDB();
        const { application_id } = req.admission_payload; // From middleware
        const { full_name, dob, form_data } = req.body;

        const application = await AdmissionApplication.findById(application_id);
        if (!application) return res.status(404).json({ error: "Application not found." });

        if (application.status !== ADMISSION_STAGES.DRAFT) {
            return res.status(400).json({ error: "Cannot save draft. Application is already submitted." });
        }

        // Check for Name + DOB duplicate if changed
        if (full_name && dob && (full_name !== application.full_name || new Date(dob).getTime() !== application.dob?.getTime())) {
            const aadhar = form_data?.student_aadhar;
            const duplicate = await checkDuplicate(application.organization_id, { full_name, dob, aadhar });
            if (duplicate && duplicate._id.toString() !== application_id) {
                return res.status(409).json({
                    error: "An application with this Name, Date of Birth, or Aadhaar already exists.",
                    duplicate_found: true
                });
            }
        }

        if (full_name) application.full_name = full_name;
        if (dob) application.dob = dob;
        if (form_data) {
            // Merge form data
            application.form_data = { ...application.form_data, ...form_data };
        }

        await application.save();
        res.json({ message: "Draft saved.", application });

    } catch (err) {
        res.status(500).json({ error: "Failed to save draft" });
    }
};

import { z } from "zod";

const admissionSubmitSchema = z.object({
    full_name: z.string().min(1, "Full name is required"),
    dob: z.date({ required_error: "Date of Birth is required" }),
    form_data: z.object({
        parent_details: z.object({
            father_name: z.string().optional(),
            father_aadhaar: z.string().optional(),
            mother_name: z.string().optional(),
            mother_aadhaar: z.string().optional(),
        }).optional(),
    }).optional(),
});

/**
 * Student: Final Submit Application
 * POST /api/admission/submit
 */
export const submitApplication = async (req, res) => {
    try {
        await connectDB();
        const { application_id } = req.admission_payload;

        const application = await AdmissionApplication.findById(application_id).populate("organization_id");
        if (!application) return res.status(404).json({ error: "Application not found." });

        // Basic Zod Validation on the payload before submission
        try {
            admissionSubmitSchema.parse({
                full_name: application.full_name,
                dob: application.dob,
                form_data: application.form_data,
            });
        } catch (validationError) {
            return res.status(400).json({ error: "Incomplete application details.", details: validationError.errors });
        }

        const { allowed, reason } = await checkTransitionGates(
            application,
            ADMISSION_STAGES.APPLIED,
            application.organization_id
        );
        if (!allowed) {
            return res.status(400).json({ error: reason });
        }

        const { verified_main_email } = req.body;
        if (verified_main_email) {
            // Cryptographically verify email by ensuring a success token exists
            const verifiedToken = await AdmissionOTP.findOne({
                organization_id: application.organization_id._id,
                email: verified_main_email,
                purpose: "email_verified_success"
            });

            if (!verifiedToken) {
                return res.status(403).json({ error: "Email verification failed. No valid verification context proven." });
            }

            application.credentials = {
                verified_main_email: verified_main_email,
                is_email_verified: true
            };

            await AdmissionOTP.deleteOne({ _id: verifiedToken._id });
        }
        // ---------------------------

        application.status = ADMISSION_STAGES.APPLIED;
        application.stage_history.push({
            status: ADMISSION_STAGES.APPLIED,
            comment: "Application submitted by candidate"
        });

        await application.save();

        // Dispatch APPLICATION_RECEIVED with tracking link
        const { dispatchNotification } = await import("../services/admissions/admission-notification.service.js");
        await dispatchNotification("APPLICATION_RECEIVED", {
            application,
            orgName: application.organization_id.name,
            extra: {
                appId: application._id.toString().slice(-6).toUpperCase(),
                track_url: `https://${application.organization_id.subdomain || 'www'}.classgrid.in/admission/track/${application._id}`
            }
        });

        res.json({ message: "Application submitted successfully.", status: application.status });

    } catch (err) {
        console.error("Submit Error:", err);
        res.status(500).json({ error: "Submission failed" });
    }
};

/**
 * Candidate: Get list of required documents for their track
 */
export const getRequiredDocsChecklist = async (req, res) => {
    try {
        const { application_id } = req.admission_payload; // Injected by isAdmissionCandidate middleware
        const application = await AdmissionApplication.findById(application_id).populate("organization_id");

        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        const org = application.organization_id;
        const strategy = getResolvedAdmissionStrategy(org);

        // Merge existing document status with the required checklist
        const checklist = strategy.resolved_documents.map(docName => {
            const existing = application.documents.find(d => d.name === docName);
            return {
                name: docName,
                status: existing ? existing.status : "pending",
                url: existing ? existing.url : null,
                rejection_reason: existing ? existing.rejection_reason : null
            };
        });

        res.status(200).json({ success: true, checklist });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Candidate: Upload a document
 */
export const uploadAdmissionDoc = async (req, res) => {
    try {
        const { application_id, organization_id } = req.admission_payload;
        const { docName, issueDate } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        if (!docName) {
            return res.status(400).json({ success: false, message: "Document name is required" });
        }

        const application = await AdmissionApplication.findById(application_id);
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        // --- Edge Case 4: Application Edit Window Enforcement (with per-student override) ---
        const org = await Organization.findById(organization_id).select("admission_config").lean();
        const editableUntil = org?.admission_config?.enrollment_config?.editable_until;
        if (editableUntil && new Date() > new Date(editableUntil)) {
            // Check if admin has unlocked this specific student
            if (!application.edit_lock_override?.unlocked) {
                return res.status(403).json({
                    error: "Document upload window has closed.",
                    hint: "The deadline to submit or edit applications and documents has passed. Contact your admin to request an extension."
                });
            }
        }

        // --- Edge Case 5: Document Validity Day Limits ---
        if (issueDate) {
            const validityLimit = org?.admission_config?.application_config?.document_validity_days?.[docName];
            if (validityLimit) {
                const issueTimestamp = new Date(issueDate).getTime();
                const cutoffTimestamp = new Date().getTime() - (validityLimit * 24 * 60 * 60 * 1000);
                if (issueTimestamp < cutoffTimestamp) {
                    return res.status(400).json({
                        success: false,
                        message: `Document has expired. Maximum validity for ${docName} is ${validityLimit} days.`
                    });
                }
            }
        }

        // 1. Upload to Supabase
        const folderPath = `admissions/${organization_id}/${application_id}`;
        const uploadResult = await storageService.uploadDocument(
            file.buffer,
            file.originalname,
            file.mimetype,
            folderPath
        );

        // 2. Update Application model
        const docIndex = application.documents.findIndex(d => d.name === docName);
        const docData = {
            name: docName,
            url: uploadResult.storage_path, // Store the path for signature generation
            status: "pending",
            rejection_reason: null
        };

        if (docIndex > -1) {
            application.documents[docIndex] = docData;
        } else {
            application.documents.push(docData);
        }

        // If this was the first document, move to under_verification if needed
        if (application.status === "applied") {
            application.status = "under_verification";
        }

        await application.save();

        res.status(200).json({
            success: true,
            message: "Document uploaded successfully",
            document: docData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Verify/Reject a document
 */
export const verifyAdmissionDoc = async (req, res) => {
    try {
        const { application_id, docName, status, rejection_reason } = req.body;

        if (!["verified", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const application = await AdmissionApplication.findById(application_id);
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        const doc = application.documents.find(d => d.name === docName);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Document record not found" });
        }

        doc.status = status;
        if (status === "rejected") {
            doc.rejection_reason = rejection_reason;
        } else {
            doc.rejection_reason = null;
        }

        // Audit log
        application.stage_history.push({
            status: application.status,
            changed_by: req.user?._id, // Set by auth middleware
            comment: `${status === "verified" ? "Verified" : "Rejected"} doc: ${docName}`
        });

        await application.save();

        // ── Auto email: DOCUMENTS_VERIFIED or DOCUMENTS_REJECTED ──
        (async () => {
            try {
                const { dispatchNotification: dn } = await import("../services/admissions/admission-notification.service.js");
                const org = await Organization.findById(application.organization_id).select("name").lean();
                const trigger = status === "verified" ? "DOCUMENTS_VERIFIED" : "DOCUMENTS_REJECTED";
                const trackUrl = `${process.env.CLIENT_URL || "https://classgrid.in"}/apply/${application.organization_id}`;
                await dn(trigger, {
                    application: application.toObject(),
                    orgName: org?.name || "Institution",
                    fcmTokens: [],
                    extra: {
                        track_url: trackUrl,
                        appId: application._id,
                        reason: rejection_reason || null
                    }
                });
            } catch (notifErr) {
                console.warn(`[Notify] Doc ${status} email failed:`, notifErr.message);
            }
        })();

        res.status(200).json({ success: true, message: `Document ${status} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Common: Get Document View Link (Signed URL)
 */
export const getDocViewLink = async (req, res) => {
    try {
        const { path } = req.query; // e.g. "admissions/org_id/app_id/uuid.pdf"

        if (!path) {
            return res.status(400).json({ success: false, message: "Path is required" });
        }

        // Security check: If candidate, they can only view their own docs
        if (req.admission_payload) {
            if (!path.includes(req.admission_payload.application_id)) {
                return res.status(403).json({ success: false, message: "Unauthorized access to document" });
            }
        }

        const signedUrl = await storageService.getSignedUrl(path);

        if (!signedUrl) {
            return res.status(404).json({ success: false, message: "Could not generate link or file missing" });
        }

        res.status(200).json({ success: true, url: signedUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Student: Initiate Admission Fee Payment
 * POST /api/admission/pay/initiate
 */
export const initiateFeePayment = async (req, res) => {
    try {
        await connectDB();
        const { application_id, organization_id } = req.admission_payload;

        const application = await AdmissionApplication.findById(application_id);
        if (!application) return res.status(404).json({ error: "Application not found." });

        if (application.status !== ADMISSION_STAGES.FEE_PENDING && application.status !== ADMISSION_STAGES.VERIFIED && application.status !== ADMISSION_STAGES.APPLIED) {
            // Allowing 'applied' or 'verified' to initiate if the workflow requires immediate fee
            console.log(`[Fees] Application ${application_id} initiating payment from state: ${application.status}`);
        }

        // 1. Fetch Organization Config to get Fee Structure ID
        const org = await Organization.findById(organization_id);

        // 🏁 Day 17: Scholarship Check
        const feeStructureId = scholarshipService.calculateFeeStructure(application, org);

        if (!feeStructureId) {
            return res.status(400).json({ error: "Admission Fee Structure not configured for this category/seat-type." });
        }

        // 2. Fetch Fee Structure
        const structure = await FeeStructure.findById(feeStructureId);
        if (!structure) return res.status(404).json({ error: "Fee structure not found." });

        // 3. Create Razorpay Order
        const order = await razorpayService.createOrder(
            organization_id,
            structure.totalAmount,
            "INR",
            `ADM-${application_id}`,
            "fees",
            {
                type: "admission_fee",
                application_id: application_id.toString(),
                organization_id: organization_id.toString()
            }
        );

        // 4. Update Application with Order ID
        application.payment_details = {
            ...application.payment_details,
            razorpay_order_id: order.id
        };
        await application.save();

        res.json({
            order_id: order.id,
            amount: structure.totalAmount,
            currency: "INR",
            key_id: org.fees_razorpay_key_id // Send public key to frontend
        });

    } catch (err) {
        console.error("Initiate Payment Error:", err);
        res.status(500).json({ error: "Failed to initiate payment", details: err.message });
    }
};

/**
 * Internal Helper: Confirm payment, create ledger, and enroll student
 */
async function confirmPaymentInternal(application_id, organization_id, razorpay_payment_id, razorpay_order_id, session) {
    const application = await AdmissionApplication.findById(application_id).session(session);
    if (!application || application.fee_paid) return;

    // 1. Update Application Status
    application.fee_paid = true;
    if (!application.payment_details) application.payment_details = {};
    application.payment_details.razorpay_payment_id = razorpay_payment_id;
    application.payment_details.payment_status = "success";
    application.status = ADMISSION_STAGES.ENROLLED;
    application.stage_history.push({
        status: ADMISSION_STAGES.ENROLLED,
        comment: `Online payment confirmed. ID: ${razorpay_payment_id}`
    });

    // 2. Create Permanent Fee Ledger
    const org = await Organization.findById(organization_id).session(session);
    const feeStructureId = org.admission_config?.admission_fee_structure_id;
    const structure = await FeeStructure.findById(feeStructureId).session(session);

    if (structure) {
        const ledger = new StudentFeeLedger({
            studentId: application._id,
            organizationId: organization_id,
            structureId: structure._id,
            totalPayable: structure.totalAmount,
            installments: structure.components.map(c => ({
                title: "Admission Fee Component",
                amount: c.amount,
                dueDate: new Date(),
                paidAmount: c.amount,
                status: 'paid'
            }))
        });

        await ledger.save({ session });
        application.ledger_id = ledger._id;

        // 3. Record Transaction
        const transaction = new FeeTransaction({
            ledgerId: ledger._id,
            studentId: application._id,
            organizationId: organization_id,
            amount: structure.totalAmount,
            method: "gateway",
            methodDetails: { razorpay_payment_id, razorpay_order_id },
            receiptNo: `ADM-RCPT-${Date.now()}`,
            status: "success",
            remarks: "Online Admission Fee Payment"
        });

        await transaction.save({ session });

        // 4. Send Digital Receipt Email
        try {
            await sendEmail({
                to: application.email,
                subject: `Admission Fee Receipt - ${org.name}`,
                channel: "billing",
                html: getAdmissionFeeReceiptHtml({
                    candidate_name: application.full_name,
                    organization_name: org.name,
                    receipt_no: transaction.receiptNo,
                    amount: transaction.amount,
                    payment_id: razorpay_payment_id
                }),
                text: getAdmissionFeeReceiptPlainText({
                    candidate_name: application.full_name,
                    organization_name: org.name,
                    receipt_no: transaction.receiptNo,
                    amount: transaction.amount,
                    payment_id: razorpay_payment_id
                })
            });
        } catch (emailErr) {
            console.error("[Fees] Failed to send receipt email:", emailErr);
        }
    }

    await application.save({ session });
}

/**
 * Student: Verify Payment & Enroll (Client-Side Callback)
 * POST /api/admission/pay/verify
 */
export const verifyFeePayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await connectDB();
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        const { application_id, organization_id } = req.admission_payload;

        // 1. Verify Signature
        const isValid = await razorpayService.verifySignature(
            organization_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) throw new Error("Invalid payment signature.");

        // 2. Process Confirmation
        await confirmPaymentInternal(application_id, organization_id, razorpay_payment_id, razorpay_order_id, session);

        await session.commitTransaction();
        session.endSession();

        res.json({ message: "Payment verified and Enrollment confirmed!" });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Verify Payment Error:", err);
        res.status(500).json({ error: "Payment verification failed" });
    }
};

/**
 * Webhook: Razorpay Payment Callback (Server-to-Server)
 * POST /api/admission/payments/webhook
 */
export const handlePaymentWebhook = async (req, res) => {
    try {
        await connectDB();
        const signature = req.headers["x-razorpay-signature"];
        if (!signature) {
            return res.status(400).send("Missing signature");
        }

        const rawBody = getWebhookRawBody(req.body);

        let event;
        try {
            event = parseWebhookEvent(req.body);
        } catch (parseErr) {
            return res.status(400).send("Invalid webhook payload");
        }

        const payment = event?.payload?.payment?.entity;
        const orderId = payment?.order_id;

        let resolvedOrganizationId = req.query.organizationId;
        let application = null;
        if (orderId) {
            application = await AdmissionApplication.findOne({
                "payment_details.razorpay_order_id": orderId
            }).select("_id organization_id fee_paid");

            if (!resolvedOrganizationId && application?.organization_id) {
                resolvedOrganizationId = String(application.organization_id);
            }
        }

        if (!resolvedOrganizationId) {
            return res.status(400).send("Webhook organization context missing");
        }

        const isValid = await razorpayService.verifyWebhookSignature(resolvedOrganizationId, rawBody, signature);
        if (!isValid) return res.status(400).send("Invalid signature");

        if (event.event === "payment.captured" && payment && orderId) {
            if (!application) {
                application = await AdmissionApplication.findOne({
                    "payment_details.razorpay_order_id": orderId
                }).select("_id organization_id fee_paid");
            }

            if (application && !application.fee_paid) {
                const session = await mongoose.startSession();
                session.startTransaction();
                try {
                    await confirmPaymentInternal(application._id, resolvedOrganizationId, payment.id, orderId, session);
                    await session.commitTransaction();
                    console.log(`[Webhook] Confirmed Application: ${application._id}`);
                } catch (err) {
                    await session.abortTransaction();
                    throw err;
                } finally {
                    session.endSession();
                }
            }
        }

        res.json({ status: "ok" });
    } catch (err) {
        console.error("Webhook Error:", err);
        res.status(500).send("Webhook failed");
    }
};


/**
 * Admin: Manually Enroll a Student (Final Step)
 * This triggers seat allocation and broadcast.
 */
export const adminEnrollStudent = async (req, res) => {
    const session = await mongoose.startSession();
    let allocation = null;
    try {
        await connectDB();
        session.startTransaction();
        const { application_id, quota_name } = req.body;
        const orgId = req.user.organization_id;

        const application = await AdmissionApplication.findById(application_id).session(session);
        if (!application) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Application not found" });
        }

        // 1. Workflow transition check
        const { allowed, reason } = await checkTransitionGates(application, ADMISSION_STAGES.ENROLLED);
        if (!allowed) {
            await session.abortTransaction();
            return res.status(400).json({ error: reason });
        }

        // 2. Atomic Seat Allocation
        if (application.hierarchy_id) {
            allocation = await seatMatrixService.allocateSeat(
                orgId,
                application.hierarchy_id,
                quota_name || "CAP",
                { session, suppressBroadcast: true }
            );
        }

        if (allocation && !allocation.success) {
            await session.abortTransaction();
            return res.status(400).json({ error: allocation.error });
        }

        // 3. Update Application Status
        application.status = ADMISSION_STAGES.ENROLLED;
        application.stage_history.push({
            status: ADMISSION_STAGES.ENROLLED,
            changed_by: req.user._id,
            comment: `Student enrolled under ${quota_name || "CAP"} quota.`
        });

        await application.save({ session });

        await session.commitTransaction();
        emitSeatBroadcast(orgId, "SEAT_ALLOCATED", allocation);

        res.json({
            success: true,
            message: "Student enrolled successfully",
            vacancy_left: allocation?.vacancy ?? null
        });

    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        res.status(500).json({ error: err.message });
    } finally {
        session.endSession();
    }
};

/**
 * Admin: Promote Next Waitlisted Student
 * POST /api/admission/waitlist/promote
 */
export const promoteWaitlist = async (req, res) => {
    try {
        const { hierarchy_id } = req.body;
        const orgId = req.user.organization_id;

        const candidate = await promoteWaitlistInternal(orgId, hierarchy_id);
        if (!candidate) return res.status(404).json({ error: "No waitlisted students found for this branch." });

        res.json({ success: true, message: `Promoted ${candidate.full_name} from waitlist.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Student/Admin: Withdraw Application & Request Refund
 * POST /api/admission/applications/:id/withdraw
 */
export const withdrawApplication = async (req, res) => {
    const session = await mongoose.startSession();
    let releasedSeat = null;
    let promotedStudent = null;
    try {
        await connectDB();
        session.startTransaction();
        const { id } = req.params;
        const orgId = req.user?.organization_id || req.admission_payload?.organization_id;

        const application = await AdmissionApplication.findById(id).session(session);
        if (!application) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Application not found" });
        }

        const org = await Organization.findById(orgId).session(session);
        const feeConfig = org.admission_config?.fee_config;

        // 1. Mark as Withdrawn
        const oldStatus = application.status;
        application.status = ADMISSION_STAGES.WITHDRAWN;
        application.stage_history.push({
            status: ADMISSION_STAGES.WITHDRAWN,
            changed_by: req.user?._id,
            comment: req.body.reason || "Student requested withdrawal."
        });

        // 2. Release Seat if ENROLLED
        if (oldStatus === ADMISSION_STAGES.ENROLLED && application.hierarchy_id) {
            releasedSeat = await seatMatrixService.releaseSeat(
                orgId,
                application.hierarchy_id,
                application.seat_type || "CAP",
                { session, suppressBroadcast: true, suppressWaitlist: true }
            );
            if (!releasedSeat.success) {
                await session.abortTransaction();
                return res.status(400).json({ error: releasedSeat.error });
            }
        }

        // 3. Calculate Refund if portal suggests it
        let refundDetails = { eligible: false, amount: 0 };
        if (application.fee_paid && feeConfig?.refund_policy?.enabled) {
            const rules = feeConfig.refund_policy.rules || [];
            const sessionStart = feeConfig.session_start_date;

            if (sessionStart) {
                const now = new Date();
                const diffTime = (new Date(sessionStart)) - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const rule = rules.find(r => diffDays >= r.days_before_start);
                if (rule) {
                    // Logic to fetch ledger and calculate percentage
                    refundDetails.eligible = true;
                    refundDetails.percentage = rule.refund_percentage;
                }
            }
        }

        await application.save({ session });
        await session.commitTransaction();

        emitSeatBroadcast(orgId, "SEAT_RELEASED", releasedSeat);
        if (releasedSeat?.waitlistCount > 0 && org.admission_config?.auto_promotion_enabled) {
            promotedStudent = await promoteWaitlistInternal(orgId, application.hierarchy_id);
        }

        res.json({
            success: true,
            message: "Application withdrawn successfully",
            refundDetails,
            promoted_from_waitlist: promotedStudent ? promotedStudent.full_name : null,
        });
    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        res.status(500).json({ error: err.message });
    } finally {
        session.endSession();
    }
};

/**
 * Admin: Bulk Import Scholarship Mappings
 * POST /api/admission/scholarship/bulk-import
 */
export const importScholarships = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Please upload a CSV/Excel file." });

        const orgId = req.user.organization_id;
        const result = await scholarshipService.processScholarshipImport(orgId, req.file.buffer);

        res.json({
            success: true,
            message: `Processed ${result.successCount} updates.`,
            errors: result.errors
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// DAY 13: Admission Engine — APIs & Operations
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Public: Apply for Admission (Dynamic Validation per org structure_type)
 * POST /api/admission/apply
 * 
 * This is the unified "Apply" endpoint that validates fields dynamically
 * based on the organization's structure_type (engineering, school, coaching, etc.)
 */
export const applyForAdmission = async (req, res) => {
    try {
        await connectDB();
        const { organization_id, form_data, phone, email, full_name, dob } = req.body;

        if (!organization_id || !full_name) {
            return res.status(400).json({ error: "organization_id and full_name are required." });
        }

        // 1. Fetch org and strategy
        const org = await Organization.findById(organization_id).select("admission_config structure_type").lean();
        if (!org) return res.status(404).json({ error: "Organization not found." });

        if (!org.admission_config?.is_portal_open) {
            return res.status(403).json({ error: "Admission portal is currently closed." });
        }

        const structureType = resolveStructureType(org) || "custom";

        // --- 1.2 Edge Case 4: Application Edit Window Enforcement (with per-student override) ---
        const editableUntil = org.admission_config?.enrollment_config?.editable_until;
        if (editableUntil && new Date() > new Date(editableUntil)) {
            // For new applications, check if phone/email already has an unlocked override
            const existingApp = phone ? await AdmissionApplication.findOne({ organization_id, phone }).select("edit_lock_override").lean() : null;
            if (!existingApp?.edit_lock_override?.unlocked) {
                return res.status(403).json({
                    error: "Application window has closed.",
                    hint: "The deadline to submit or edit applications has passed. Contact your admin to request an extension."
                });
            }
        }

        // --- 1.5 Track Isolation Gate ---
        // Engineering and Diploma (all variants) must use the CET allotment flow.
        // Allowing them through the portal apply endpoint would create orphaned
        // AdmissionApplications that have no linked CETAllotment record.
        if (isCETStructureType(structureType)) {
            return res.status(400).json({
                error: "Engineering/Diploma admissions are managed through CET allotment.",
                hint: "Use the CET portal flow: /api/admission/cet/validate-en",
                structure_type: structureType
            });
        }

        let strategy;
        try {
            strategy = getResolvedAdmissionStrategy(org);
        } catch (e) {
            return res.status(400).json({ error: e.message });
        }

        // 2. Dynamic field validation from strategy
        const missingFields = [];
        const submissionPayload = { full_name, phone, email, dob, form_data: form_data || {} };
        for (const field of strategy.resolved_required_fields || []) {
            if (!hasAdmissionFieldValue(submissionPayload, field)) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: `Missing required fields for ${structureType} admission.`,
                missing_fields: missingFields,
                required_fields: strategy.resolved_required_fields
            });
        }

        // 3. Duplicate detection
        const duplicate = await checkDuplicate(organization_id, {
            phone,
            full_name,
            dob,
            en_number: form_data?.en_number
        });

        if (duplicate) {
            return res.status(409).json({
                error: "Duplicate application detected.",
                existing_application_id: duplicate._id,
                existing_status: duplicate.status,
                hint: "An application with this identity already exists. Contact admin to merge or resolve."
            });
        }

        // 4. Create Application
        const application = new AdmissionApplication({
            organization_id,
            entry_mode: form_data?.en_number ? "CET" : "PORTAL",
            full_name,
            phone,
            email,
            dob: dob ? new Date(dob) : undefined,
            en_number: form_data?.en_number,
            category: form_data?.category,
            seat_type: form_data?.seat_type,
            form_data: form_data || {},
            status: ADMISSION_STAGES.APPLIED,
            stage_history: [{
                status: ADMISSION_STAGES.APPLIED,
                comment: `Application submitted via ${strategy.auth_method} track.`
            }]
        });

        await application.save();

        // 5. Generate Printout (If Required by Track A)
        if (strategy.requires_printout) {
            try {
                const { generateAdmissionPrintout } = await import("../services/admissions/admission-printout.service.js");
                const printoutUrl = await generateAdmissionPrintout(application, org);

                application.printout_generated = true;
                application.printout_url = printoutUrl;
                await application.save();
            } catch (pdfErr) {
                console.error("Failed to generate admission printout:", pdfErr);
                // We don't fail the admission, just log it. Admin can trigger retry later.
            }
        }

        res.status(201).json({
            success: true,
            application_id: application._id,
            status: application.status,
            printout_url: application.printout_url || null,
            message: `Application submitted successfully for ${structureType} admission.`
        });
    } catch (err) {
        console.error("Apply Error:", err);
        res.status(500).json({ error: "Application submission failed.", details: err.message });
    }
};

/**
 * Admin: Desk Enrollment (Walk-in Fast Path)
 * POST /api/admission/desk-enroll
 * 
 * Directly enrolls a walk-in student without OTP/portal flow.
 * Supports Cash/Cheque/UPI payment modes.
 * Skips all stages → directly ENROLLED.
 */
export const deskEnroll = async (req, res) => {
    const session = await mongoose.startSession();
    let seatAllocation = null;
    try {
        await connectDB();
        session.startTransaction();
        const orgId = req.user.organization_id;
        const {
            full_name, phone, email, dob, gender,
            hierarchy_id, form_data,
            fee_mode, fee_amount, receipt_number,
            quota_name
        } = req.body;

        if (!full_name) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Student name is required." });
        }

        // 1. Duplicate check
        const duplicate = await checkDuplicate(orgId, { phone, full_name, dob });
        if (duplicate) {
            await session.abortTransaction();
            return res.status(409).json({
                error: "Duplicate student detected.",
                existing_id: duplicate._id,
                hint: "Use the merge endpoint or reject this entry."
            });
        }

        // 2. Create Application (directly as ENROLLED)
        const application = new AdmissionApplication({
            organization_id: orgId,
            hierarchy_id,
            entry_mode: "DESK",
            full_name,
            phone,
            email,
            dob: dob ? new Date(dob) : undefined,
            form_data: {
                ...form_data,
                gender,
                desk_enrollment: true,
                fee_mode: fee_mode || "cash",
                fee_amount: fee_amount || 0,
                receipt_number: receipt_number || "",
                enrolled_by: req.user._id
            },
            status: ADMISSION_STAGES.ENROLLED,
            fee_paid: true,
            stage_history: [
                {
                    status: ADMISSION_STAGES.APPLIED,
                    changed_by: req.user._id,
                    comment: "Desk enrollment — walk-in admission."
                },
                {
                    status: ADMISSION_STAGES.ENROLLED,
                    changed_by: req.user._id,
                    comment: `Instant enrollment. Fee: ₹${fee_amount || 0} via ${fee_mode || "cash"}. Receipt: ${receipt_number || "N/A"}.`
                }
            ]
        });

        await application.save({ session });

        // 3. Allocate seat if hierarchy specified
        // Default quota is org-type-aware: GENERAL for schools, REGULAR for coaching, CAP for colleges.
        if (hierarchy_id) {
            try {
                const orgForQuota = await Organization.findById(orgId).select("structure_type").lean();
                const structureType = resolveStructureType(orgForQuota);
                const defaultQuota = getDefaultQuotaByStructureType(structureType);
                seatAllocation = await seatMatrixService.allocateSeat(
                    orgId,
                    hierarchy_id,
                    quota_name || defaultQuota,
                    { session, suppressBroadcast: true }
                );
            } catch (seatErr) {
                seatAllocation = { success: false, error: seatErr.message };
            }

            if (!seatAllocation?.success) {
                await session.abortTransaction();
                return res.status(400).json({
                    error: `Seat allocation failed: ${seatAllocation?.error || "Unknown seat allocation error"}`
                });
            }
        }

        // 4. Create User Account instantly for Desk Enrollment (fixing coaching delay issue)
        const studentEmail = email || `${phone}@admission.classgrid.in`;
        const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit generic
        const hashedPassword = await bcrypt.hash(generatedPassword, 12);

        let newUser = await User.findOne({ email: studentEmail }).session(session);
        if (!newUser) {
            newUser = new User({
                name: full_name,
                email: studentEmail,
                password: hashedPassword,
                role: "student",
                organization_id: orgId,
                dob: dob ? new Date(dob) : null,
                phoneNumber: phone || "",
                gender: gender || null,
                batch: hierarchy_id || null, // Map the target course/batch directly for coaching
                isEmailVerified: true,
                profile_completed: false,
                mustResetPassword: true,
                linkedProviders: ["manual"]
            });
            await newUser.save({ session });
        }

        application.student_id = newUser._id;
        await application.save({ session });

        // 5. Generate Initial Admission Fee Record instantly based on desk payment
        if (fee_amount > 0) {
            await FeeRecord.create([{
                student: newUser._id,
                organizationId: orgId,
                title: "Walk-in Admission Fee",
                category: "college",
                amount: fee_amount,
                dueDate: new Date(),
                paidAmount: fee_amount,
                status: "paid",
                paidAt: new Date(),
                paymentReference: receipt_number || `DESK-${fee_mode}`,
                remarks: `Walk-in payment via ${fee_mode || "cash"}`
            }], { session });
        }

        await session.commitTransaction();
        emitSeatBroadcast(orgId, "SEAT_ALLOCATED", seatAllocation);

        // Return credentials so admin can hand it to student right at the desk
        res.status(201).json({
            success: true,
            application_id: application._id,
            message: `${full_name} enrolled via desk enrollment.`,
            status: "enrolled",
            credentials: {
                login_id: studentEmail,
                password: generatedPassword
            }
        });
    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Desk Enroll Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        session.endSession();
    }
};

/**
 * Admin: Export DTE Maharashtra CSV
 * GET /api/admission/export/dte
 */
export const exportDTE = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { cap_round, status, academic_year } = req.query;

        const result = await generateDTEExport(orgId, { cap_round, status, academic_year });

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.send(result.csv);
    } catch (err) {
        res.status(500).json({ error: "DTE export failed.", details: err.message });
    }
};

/**
 * Admin: Export SARAL School CSV
 * GET /api/admission/export/saral
 */
export const exportSARAL = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { standard, status } = req.query;

        const result = await generateSARALExport(orgId, { standard, status });

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.send(result.csv);
    } catch (err) {
        res.status(500).json({ error: "SARAL export failed.", details: err.message });
    }
};

/**
 * Admin: Export AICTE National CSV
 * GET /api/admission/export/aicte
 */
export const exportAICTE = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { status, academic_year } = req.query;

        const result = await generateAICTEExport(orgId, { status, academic_year });

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.send(result.csv);
    } catch (err) {
        res.status(500).json({ error: "AICTE export failed.", details: err.message });
    }
};

/**
 * Admin: Export Maharashtra State Board CSV (Junior College / HSC Admission)
 * GET /api/admission/export/state-board
 * 
 * Supports stream and standard filters.
 * Computes Best-of-5 merit from subject-level data if available.
 */
export const exportStateBoard = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { stream, standard, status } = req.query;

        const result = await generateStateBoardExport(orgId, { stream, standard, status });

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.send(result.csv);
    } catch (err) {
        res.status(500).json({ error: "State Board export failed.", details: err.message });
    }
};

/**
 * Admin: Full Enrollment — Application → User Account + PRN + Welcome Email
 * POST /api/admission/enroll
 * 
 * This is the COMPLETE enrollment flow (Day 19 design, built now):
 * 1. Validates the application is in a valid state for enrollment
 * 2. Allocates seat atomically
 * 3. Generates PRN (if org config enables it)
 * 4. Creates a new User account (role: 'student')
 * 5. Sends welcome email via Brevo with credentials
 * 6. Transitions application to ENROLLED
 */
export const fullEnrollStudent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    let seatAllocation = null;

    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { application_id, quota_name, division, roll_number, gr_number, password } = req.body;

        if (!application_id) {
            await session.abortTransaction();
            return res.status(400).json({ error: "application_id is required." });
        }

        // 1. Fetch application
        const application = await AdmissionApplication.findById(application_id).session(session);
        if (!application) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Application not found." });
        }

        if (application.student_id) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Student already enrolled. User account exists.", user_id: application.student_id });
        }

        // 2. Fetch org config early so workflow gating can use the resolved strategy
        const org = await Organization.findById(orgId).select("admission_config name structure_type").lean();
        if (!org) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Organization not found." });
        }

        // 3. Workflow transition check
        const { allowed, reason } = await checkTransitionGates(application, ADMISSION_STAGES.ENROLLED, org);
        if (!allowed && application.status !== ADMISSION_STAGES.FEE_PENDING && application.status !== ADMISSION_STAGES.VERIFIED) {
            await session.abortTransaction();
            return res.status(400).json({ error: reason || "Application is not in a valid state for enrollment." });
        }
        const structureType = resolveStructureType(org);
        const isSchool = isSchoolStructureType(structureType);
        const isCollege = isCETStructureType(structureType) || isJuniorCollegeStructureType(structureType);
        const isCoaching = isCoachingStructureType(structureType);

        // 4. Generate PRN (Colleges only) or GR Number (Schools only)
        let prn = application.prn;
        if (isCollege && !prn && org.admission_config?.prn_template?.enabled) {
            try {
                prn = await generatePRNForApplication(orgId, {
                    branch_name: application.form_data?.branch_allotted || application.form_data?.stream_applying || "General",
                    division: division || application.form_data?.assigned_division || "",
                    is_rejoin: application.form_data?.is_rejoin || false,
                    is_readmission: application.form_data?.is_readmission || false,
                });
            } catch (prnErr) {
                console.warn("[Enroll] PRN generation skipped:", prnErr.message);
            }
        }

        // 5. Allocate seat
        if (application.hierarchy_id) {
            seatAllocation = await seatMatrixService.allocateSeat(
                orgId,
                application.hierarchy_id,
                quota_name || application.seat_type || "CAP",
                { session, suppressBroadcast: true }
            );
            if (!seatAllocation.success) {
                await session.abortTransaction();
                return res.status(400).json({ error: `Seat allocation failed: ${seatAllocation.error}` });
            }
        }

        // 6. Create User account using the verified admission email whenever required.
        const isDeskEnrollment = application.entry_mode === "DESK" || application.form_data?.desk_enrollment === true;
        const verifiedAdmissionEmail = application.credentials?.verified_main_email?.trim();
        const studentEmail = verifiedAdmissionEmail || (
            isDeskEnrollment ? (application.email || `${application.phone}@admission.classgrid.in`) : null
        );

        if (!studentEmail) {
            await session.abortTransaction();
            return res.status(400).json({
                error: "Verified admission email is required before final enrollment.",
                hint: "Portal-based enrollments must complete the verified email flow before Classgrid account creation.",
            });
        }
        const isEmailTrusted = Boolean(verifiedAdmissionEmail) || isDeskEnrollment;

        // Password is set directly at the desk by the student (they are physically present)
        if (!password) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Password is required. The student must set their Classgrid password at the desk." });
        }
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if user already exists with this email
        let existingUser = await User.findOne({ email: studentEmail }).session(session);
        let newUser;

        if (existingUser) {
            // Link existing user to this application
            newUser = existingUser;
            newUser.organization_id = orgId;
            newUser.role = "student";
            newUser.password = hashedPassword;
            newUser.isEmailVerified = isEmailTrusted;
            newUser.mustResetPassword = true;
            newUser.linkedProviders = ["manual"];
            if (prn) newUser.prn = prn;
            newUser.branch = application.form_data?.branch_allotted || application.form_data?.stream_applying || "";
            if (isCoaching && application.hierarchy_id) {
                newUser.batch = application.hierarchy_id;
            }
            newUser.category = application.category;
            newUser.admission_type = application.en_number ? "CAP" : "Direct";

            if (isCollege) {
                if (application.form_data?.abc_id) newUser.abc_id = application.form_data.abc_id;
                if (application.form_data?.anti_ragging_undertaking_no) newUser.anti_ragging_undertaking_no = application.form_data.anti_ragging_undertaking_no;
            }

            await newUser.save({ session });
        } else {
            newUser = new User({
                name: application.full_name,
                email: studentEmail,
                password: hashedPassword,
                role: "student",
                organization_id: orgId,
                prn: prn || undefined,
                branch: application.form_data?.branch_allotted || application.form_data?.stream_applying || "",
                batch: isCoaching ? application.hierarchy_id : null,
                dob: application.dob,
                gender: application.form_data?.gender || null,
                phoneNumber: application.phone || "",
                category: application.category,
                admission_type: application.en_number ? "CAP" : "Direct",
                abc_id: isCollege ? application.form_data?.abc_id || null : null,
                anti_ragging_undertaking_no: isCollege ? application.form_data?.anti_ragging_undertaking_no || null : null,
                isEmailVerified: isEmailTrusted,
                profile_completed: false,
                mustResetPassword: true,
                linkedProviders: ["manual"],
            });
            await newUser.save({ session });
        }

        // 7. Update application record
        application.status = ADMISSION_STAGES.ENROLLED;
        application.student_id = newUser._id;
        if (isCollege && prn) application.prn = prn;
        if (division) application.form_data.assigned_division = division;
        if (isSchool && roll_number) application.form_data.assigned_roll_number = roll_number;
        if (isSchool && gr_number) application.form_data.gr_number = gr_number;
        application.stage_history.push({
            status: ADMISSION_STAGES.ENROLLED,
            changed_by: req.user._id,
            comment: `Enrolled. ${isCollege ? `PRN: ${prn || "N/A"}` : `GR: ${gr_number || "N/A"}, Roll: ${roll_number || "N/A"}`}. User ID: ${newUser._id}. Division: ${division || "TBD"}.`
        });
        await application.save({ session });

        // 7a. Engineering/CET Final Sync
        if (isCollege && application.en_number) {
            const allotment = await CETAllotment.findOne({ organization_id: orgId, en_number: application.en_number }).session(session);
            if (allotment) {
                allotment.status = "enrolled";
                allotment.linked_user_id = newUser._id;
                await allotment.save({ session });
            }
        }

        // 7b. Generate Registration FeeRecord
        if (application.payment_details?.amount_paid > 0 || application.payment_details?.fee_amount > 0) {
            const finalPaid = application.payment_details.amount_paid || application.payment_details.fee_amount;
            await FeeRecord.create([{
                student: newUser._id,
                organizationId: orgId,
                title: "Admission / Registration Fee",
                category: "college",
                amount: finalPaid,
                dueDate: new Date(),
                paidAmount: finalPaid,
                status: "paid",
                paidAt: application.updatedAt,
                paymentReference: application.payment_details.razorpay_payment_id || "Desk Payment",
                remarks: "Auto-generated from admission enrollment."
            }], { session });
        }

        await session.commitTransaction();
        emitSeatBroadcast(orgId, "SEAT_ALLOCATED", seatAllocation);

        // 8. Resolve college workspace email (if Google Workspace is configured)
        const workspaceEmail = org.admission_config?.google_workspace_domain
            ? `${application.full_name.toLowerCase().replace(/\s+/g, '.')}.${new Date().getFullYear()}@${org.admission_config.google_workspace_domain}`
            : null;

        // 9. Send Congratulations Confirmation Email (async, don't block response)
        setImmediate(async () => {
            try {
                const collegeStartDate = org.admission_config?.session_start_date
                    ? new Date(org.admission_config.session_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                    : "To be announced";

                await sendEmail({
                    to: studentEmail,
                    fromName: `${org.name} Admissions`,
                    replyTo: org.email || process.env.BREVO_SENDER_EMAIL,
                    subject: `🎉 Congratulations! Admission Confirmed — Welcome to ${org.name}`,
                    html: `
                        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 12px; overflow: hidden; border: 1px solid #27272a;">
                            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
                                <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Admission Confirmed!</h1>
                                <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">Welcome to ${org.name}</p>
                            </div>
                            <div style="padding: 32px;">
                                <p>Dear <strong>${application.full_name}</strong>,</p>
                                <p>Congratulations! Your admission is officially confirmed. Below are your Classgrid ERP credentials:</p>
                                <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #18181b; border-radius: 8px; border: 1px solid #27272a;">
                                    <tr><td style="padding: 10px 12px; color: #a1a1aa;">Login ID (Email)</td><td style="padding: 10px 12px; font-weight: bold;">${studentEmail}</td></tr>
                                    <tr><td style="padding: 10px 12px; color: #a1a1aa;">Password</td><td style="padding: 10px 12px; font-weight: bold;">${password}</td></tr>
                                    ${isCollege && prn ? `<tr><td style="padding: 10px 12px; color: #a1a1aa;">PRN</td><td style="padding: 10px 12px; font-weight: bold;">${prn}</td></tr>` : ""}
                                    ${isSchool && gr_number ? `<tr><td style="padding: 10px 12px; color: #a1a1aa;">GR Number</td><td style="padding: 10px 12px; font-weight: bold;">${gr_number}</td></tr>` : ""}
                                    ${division ? `<tr><td style="padding: 10px 12px; color: #a1a1aa;">Division / Class</td><td style="padding: 10px 12px; font-weight: bold;">${division}</td></tr>` : ""}
                                    ${isSchool && roll_number ? `<tr><td style="padding: 10px 12px; color: #a1a1aa;">Roll Number</td><td style="padding: 10px 12px; font-weight: bold;">${roll_number}</td></tr>` : ""}
                                    ${workspaceEmail ? `<tr><td style="padding: 10px 12px; color: #a1a1aa;">${isSchool ? "School" : "College"} Email</td><td style="padding: 10px 12px; font-weight: bold;">${workspaceEmail}</td></tr>` : ""}
                                    <tr><td style="padding: 10px 12px; color: #a1a1aa;">College Starts</td><td style="padding: 10px 12px; font-weight: bold;">${collegeStartDate}</td></tr>
                                </table>
                                <p style="color: #ef4444; font-weight: bold;">⚠️ Please change your password after first login for security.</p>
                                <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px; text-align: center;">This is an automated email from Classgrid. Do not reply.</p>
                            </div>
                        </div>
                    `,
                    text: `Congratulations! Admission Confirmed at ${org.name}. Login: ${studentEmail} / ${password}. PRN: ${prn || "TBD"}. Division: ${division || "TBD"}. ${workspaceEmail ? `College Email: ${workspaceEmail}.` : ""} College starts: ${collegeStartDate}.`
                });
                console.log(`[Enroll] Congratulations email sent to ${studentEmail}`);
            } catch (emailErr) {
                console.error("[Enroll] Welcome email failed:", emailErr.message);
            }
        });

        res.json({
            success: true,
            message: `${application.full_name} enrolled successfully.`,
            user_id: newUser._id,
            prn: prn || null,
            email: studentEmail,
            workspace_email: workspaceEmail,
            division: division || null,
            roll_number: roll_number || null
        });

    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Full Enroll Error:", err);
        res.status(500).json({ error: "Enrollment failed.", details: err.message });
    } finally {
        session.endSession();
    }
};

/**
 * Admin: Allot Division + Roll Number for CET Student
 * PATCH /api/admission/cet/:en/allot-division
 */
export const allotDivisionForCET = async (req, res) => {
    try {
        await connectDB();
        const { en } = req.params;
        const { division, roll_number } = req.body;
        const orgId = req.user.organization_id;

        if (!division) {
            return res.status(400).json({ error: "Division is required (e.g., 'A', 'B', 'C')." });
        }

        const application = await AdmissionApplication.findOne({
            organization_id: orgId,
            en_number: en,
            is_deleted: false
        });

        if (!application) {
            return res.status(404).json({ error: `No application found for EN: ${en}` });
        }

        application.form_data = application.form_data || {};
        application.form_data.assigned_division = division;
        if (roll_number) {
            application.form_data.assigned_roll_number = roll_number;
        }

        application.stage_history.push({
            status: application.status,
            changed_by: req.user._id,
            comment: `Division allotted: ${division}${roll_number ? `, Roll No: ${roll_number}` : ""}.`
        });

        await application.save();

        // Also update the linked User record if it exists
        if (application.student_id) {
            await User.findByIdAndUpdate(application.student_id, {
                branch: application.form_data?.branch_allotted || "",
                batch: division
            });
        }

        res.json({
            success: true,
            en_number: en,
            division,
            roll_number: roll_number || null,
            message: `Division ${division} allotted to ${application.full_name}.`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Admin: Mark CET Student as Upgraded (Left for better college in later CAP round)
 * PATCH /api/admission/cet/:en/mark-upgraded
 */
export const markCETUpgraded = async (req, res) => {
    const session = await mongoose.startSession();
    let releasedSeat = null;
    try {
        await connectDB();
        session.startTransaction();
        const { en } = req.params;
        const { reason, target_college, cap_round_upgraded_to } = req.body;
        const orgId = req.user.organization_id;

        const application = await AdmissionApplication.findOne({
            organization_id: orgId,
            en_number: en,
            is_deleted: false
        }).session(session);

        if (!application) {
            await session.abortTransaction();
            return res.status(404).json({ error: `No application found for EN: ${en}` });
        }

        if (application.status === ADMISSION_STAGES.UPGRADED) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Application is already marked as upgraded." });
        }

        const oldStatus = application.status;

        // 1. Mark as upgraded
        application.status = ADMISSION_STAGES.UPGRADED;
        application.rla_status = "upgraded";
        application.stage_history.push({
            status: ADMISSION_STAGES.UPGRADED,
            changed_by: req.user._id,
            comment: `Upgraded from ${oldStatus}. Reason: ${reason || "Student got better college in later CAP round."}${target_college ? ` Target: ${target_college}.` : ""}${cap_round_upgraded_to ? ` CAP Round: ${cap_round_upgraded_to}.` : ""}`
        });

        // Track upgrade in allotment history
        application.allotment_history.push({
            round: cap_round_upgraded_to || 0,
            branch: application.form_data?.branch_allotted || "",
            seat_type: application.seat_type || "CAP",
            date: new Date()
        });

        await application.save({ session });

        // 2. Release the seat
        if (application.hierarchy_id) {
            releasedSeat = await seatMatrixService.releaseSeat(
                orgId,
                application.hierarchy_id,
                application.seat_type || "CAP",
                { session, suppressBroadcast: true, suppressWaitlist: true }
            );
            if (!releasedSeat.success) {
                await session.abortTransaction();
                return res.status(400).json({ error: releasedSeat.error });
            }
        }

        // 3. Mark CET Allotment as upgraded
        await CETAllotment.findOneAndUpdate(
            { organization_id: orgId, en_number: en },
            { status: "upgraded_to_other" },
            { session }
        );

        // 4. Deactivate User account if one was created
        if (application.student_id) {
            await User.findByIdAndUpdate(application.student_id, {
                status: "suspended",
                admission_type: null // Clear admission link
            }, { session });
        }

        // 5. Auto-promote from waitlist if enabled
        const org = await Organization.findById(orgId).select("admission_config").lean().session(session);
        await session.commitTransaction();

        emitSeatBroadcast(orgId, "SEAT_RELEASED", releasedSeat);
        let promotedStudent = null;
        if (releasedSeat?.waitlistCount > 0 && org?.admission_config?.auto_promotion_enabled && application.hierarchy_id) {
            promotedStudent = await promoteWaitlistInternal(orgId, application.hierarchy_id);
        }

        res.json({
            success: true,
            en_number: en,
            old_status: oldStatus,
            new_status: ADMISSION_STAGES.UPGRADED,
            seat_released: true,
            promoted_from_waitlist: promotedStudent ? promotedStudent.full_name : null,
            message: `${application.full_name} (${en}) marked as upgraded. Seat released.`
        });
    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Mark Upgraded Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        session.endSession();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 MVC: Dashboard Controller Functions (delegating to admission.service.js)
// ─────────────────────────────────────────────────────────────────────────────
import {
    getAdmissionsDashboard,
    getApplicationDetails,
    updateApplicationStatus
} from '../services/admission.service.js';

/**
 * GET /api/admissions/dashboard
 * Org Admin: Paginated list of all applications with filters.
 */
export const getAdmissions = async (req, res) => {
    try {
        const orgId = req.institutionOrganization?._id || req.user.organization_id;
        const { status, search, page, limit } = req.query;

        const data = await getAdmissionsDashboard(orgId, { status, search, page, limit });

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Admission Controller] getAdmissions error:', err);
        return res.status(500).json({ success: false, message: err.message || 'Failed to fetch admissions.' });
    }
};

/**
 * GET /api/admissions/:id
 * Org Admin: Full details for a single application.
 */
export const getApplication = async (req, res) => {
    try {
        const { id } = req.params;

        const data = await getApplicationDetails(id);

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Admission Controller] getApplication error:', err);
        const statusCode = err.message === 'Admission application not found.' ? 404 : 500;
        return res.status(statusCode).json({ success: false, message: err.message || 'Failed to fetch application.' });
    }
};

/**
 * PATCH /api/admissions/:id/status
 * Org Admin: Change application status with audit trail.
 */
export const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status: newStatus, reviewNotes } = req.body;
        const adminUserId = req.user._id;

        if (!newStatus) {
            return res.status(400).json({ success: false, message: 'New status is required.' });
        }

        const data = await updateApplicationStatus(id, newStatus, reviewNotes, adminUserId);

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Admission Controller] updateStatus error:', err);
        const statusCode = err.message === 'Admission application not found.' ? 404 : 500;
        return res.status(statusCode).json({ success: false, message: err.message || 'Failed to update application status.' });
    }
};
