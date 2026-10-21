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
import { 
    importCETAllotments, 
    validateEN, 
    sendENOTP, 
    verifyENOTP,
    verifyPhoneOTP,
    sendEmailOTP,
    verifyEmailOTP,
    saveApplicationDraft,
    submitApplication,
    getRequiredDocsChecklist,
    uploadAdmissionDoc,
    verifyAdmissionDoc,
    getDocViewLink,
    initiateFeePayment,
    verifyFeePayment,
    handlePaymentWebhook,
    adminEnrollStudent,
    promoteWaitlist,
    withdrawApplication,
    importScholarships,
    // Day 13: APIs & Operations
    applyForAdmission,
    deskEnroll,
    exportDTE,
    exportSARAL,
    fullEnrollStudent,
    allotDivisionForCET,
    markCETUpgraded,
    exportAICTE,
    exportStateBoard,
    getAdmissions,
    getApplication,
    updateStatus
} from "../controllers/admission.controller.js";
import {
    getAdmissionConfig,
    updateAdmissionConfig,
    injectPreset,
    getMasterFieldPool,
    getMasterDocumentPool
} from "../controllers/admission-config.controller.js";
import { 
    getLiveMeritList, 
    getLiveSeatMatrix, 
    callCandidate 
} from "../controllers/admission-broadcast.controller.js";
import {
    validateDocumentExpiry,
    generateMerit,
    getMeritList,
    getApplicationsList,
    getApplicationPrintData,
    mergeApplications,
    allocateDivisions,
    batchGeneratePRNsRoute,
    reportRLA,
    sendAdmissionNotification,
    getSmsBudget,
    parentLogin,
    parentGetStatus,
    parentGetDocuments,
    getAdmissionAnalytics,
    getCETDashboard,
    isParent,
    acapRegister,
    acapGenerateMerit,
    verifyGateEntry,
    getLiveMeritListOptimized,
    updateApplicationStage,
    bulkVerifyApplications,
    bulkSelectApplications,
    requestNOC,
    confirmUpgrade,
    advanceAdmissionRound,
    unlockStudentEditWindow,
    lockStudentEditWindow
} from "../controllers/admission-operations.controller.js";
import { bulkUpdateCompliance } from "../controllers/student-compliance.controller.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/auth.middleware.js";
import { requireAdmissionRole } from "../middleware/admission-roles.middleware.js";
import { isAdmissionCandidate } from "../middleware/admission-auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import { requireCETTrack, requireDirectTrack } from "../middleware/admission-track.middleware.js";
import {
    otpSendLimiter,
    loginLimiter,
    admissionApplyLimiter,
    admissionParentLoginLimiter,
    admissionLiveMeritLimiter,
} from "../middleware/rateLimiter.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 🟢 Public Auth: Admission Candidate flows
router.post("/cet/validate-en", requireCETTrack, validateEN);
router.post("/cet/send-otp", requireCETTrack, otpSendLimiter, sendENOTP);
router.post("/cet/verify-otp", requireCETTrack, loginLimiter, verifyENOTP);
router.post("/verify-phone", requireDirectTrack, loginLimiter, verifyPhoneOTP); // Firebase Phone OTP verify
router.post("/send-email-otp", otpSendLimiter, sendEmailOTP);
router.post("/verify-email-otp", loginLimiter, verifyEmailOTP);

// 📝 Application Forms (Session Required)
router.post("/save-draft", isAdmissionCandidate, saveApplicationDraft);
router.post("/submit", isAdmissionCandidate, submitApplication);

// Protected: Admin Configuration
router.get("/institution-profile", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_counselor", "admission_clerk", "admission_verifier"]), attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        admission_profile: req.institutionProfile.admissionProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});
router.get("/config", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), attachInstitutionProfile(), getAdmissionConfig);
router.patch("/config", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), attachInstitutionProfile(), updateAdmissionConfig);
router.post("/config/preset", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), attachInstitutionProfile(), injectPreset);
router.get("/master-field-pool", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), getMasterFieldPool);
router.get("/master-document-pool", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), getMasterDocumentPool);

// 📁 Document Management
router.get("/docs/checklist", isAdmissionCandidate, getRequiredDocsChecklist);
router.post("/docs/upload", isAdmissionCandidate, upload.single("file"), uploadAdmissionDoc);
router.get("/docs/view", isAuthenticated, getDocViewLink); // Generic view (checks auth inside)
router.get("/candidate/docs/view", isAdmissionCandidate, getDocViewLink); // Candidate-specific view

// Protected: Admin-only operations
router.post("/cet/import", isAuthenticated, requireCETTrack, requireAdmissionRole(["org_admin", "admission_head"]), upload.single("file"), importCETAllotments);
router.patch("/admin/verify-doc", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_verifier"]), verifyAdmissionDoc);

// 📡 Broadcast & Live Projector Endpoints
router.get("/broadcast/merit-list/:hierarchyId", isAuthenticated, getLiveMeritList);
router.get("/broadcast/seat-matrix", isAuthenticated, getLiveSeatMatrix);
router.post("/broadcast/call-candidate", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_counselor"]), callCandidate);

// 💰 Fees & Payments
router.post("/pay/initiate", isAdmissionCandidate, initiateFeePayment);
router.post("/pay/verify", isAdmissionCandidate, verifyFeePayment);
router.post("/payments/webhook", handlePaymentWebhook); // Public (verified via signature)

// 🎓 Final Enrollment
router.post("/admin/enroll", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_clerk"]), adminEnrollStudent);

// 📈 Waitlist & Scholarships
router.post("/admin/waitlist/promote", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), promoteWaitlist);
router.post("/admin/scholarship/bulk-import", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), upload.single("file"), importScholarships);

// 🔄 Withdrawal
router.post("/applications/:id/withdraw", isAuthenticated, withdrawApplication); // Admin withdrawal
router.post("/candidate/withdraw/:id", isAdmissionCandidate, withdrawApplication); // Candidate self-withdrawal

// 🟢 Public: Dynamic Apply (validates per org structure_type)
router.post("/apply", requireDirectTrack, admissionApplyLimiter, applyForAdmission);

// 🏢 Admin: Desk Enrollment (Walk-in fast-path, no OTP needed)
router.post("/desk-enroll", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_clerk"]), deskEnroll);

// 📊 Admin: Government CSV Exports
router.get("/export/dte", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), exportDTE);
router.get("/export/saral", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), exportSARAL);
router.get("/export/aicte", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), exportAICTE);
router.get("/export/state-board", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), exportStateBoard);

// 🎓 Admin: Full Enrollment (Application → User Account + PRN + Welcome Email)
router.post("/enroll", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_clerk"]), fullEnrollStudent);

// 🏗️ Admin: CET Division Allotment & CAP Upgrade
router.patch("/cet/:en/allot-division", isAuthenticated, requireCETTrack, requireAdmissionRole(["org_admin", "admission_head"]), allotDivisionForCET);
router.patch("/cet/:en/mark-upgraded", isAuthenticated, requireCETTrack, requireAdmissionRole(["org_admin", "admission_head", "admission_verifier"]), markCETUpgraded);

// 📋 Day 15: Document Processing & Merit Engine
router.get("/applications", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_counselor", "admission_clerk", "admission_verifier"]), getApplicationsList);
router.post("/docs/validate-expiry", isAuthenticated, validateDocumentExpiry);
router.post("/direct/generate-merit", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), generateMerit);
router.get("/direct/merit-list", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_counselor"]), getMeritList);
router.get("/print/application/:id", isAuthenticated, getApplicationPrintData);

// 🔀 Day 16: Merge, Division Allocation & Batch PRN
router.post("/applications/merge", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), mergeApplications);
router.post("/allocate-divisions", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), allocateDivisions);
router.post("/generate-prns", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), batchGeneratePRNsRoute);

// 📊 Day 18 & Phase D: RLA, NOC, & Upgrades
router.post("/cet/:en_number/report", isAuthenticated, requireCETTrack, requireAdmissionRole(["org_admin", "admission_head", "admission_verifier"]), reportRLA);
router.post("/cet/:en_number/request-noc", isAuthenticated, requireCETTrack, requireAdmissionRole(["org_admin", "admission_head"]), requestNOC);
router.post("/cet/:en_number/confirm-upgrade", isAuthenticated, requireCETTrack, requireAdmissionRole(["org_admin", "admission_head"]), confirmUpgrade);

// 🔔 Day 19: Notification Dispatch
router.post("/notify", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), sendAdmissionNotification);
router.get("/sms-budget", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), getSmsBudget);

// 👨‍👩‍👧 Day 20: Parent Tracking Portal (Public Auth)
router.post("/parent/login", admissionParentLoginLimiter, parentLogin);
router.get("/parent/status/:applicationId", isParent, parentGetStatus);
router.get("/parent/documents/:applicationId", isParent, parentGetDocuments);

// 📈 Day 20: Admin Analytics & Engineering Dashboard
router.get("/analytics", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), getAdmissionAnalytics);
router.get("/cet/dashboard", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), getCETDashboard);

// 🎯 Day 21: ACAP Operations
router.post("/acap/register", admissionApplyLimiter, acapRegister); // Public
router.post("/acap/generate-merit", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), acapGenerateMerit);
router.post("/acap/verify-gate", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_verifier"]), verifyGateEntry);

// 📡 Day 21: Live Merit List (Public-accessible with org_id, cached 5s)
router.get("/merit-list/live", admissionLiveMeritLimiter, getLiveMeritListOptimized);

// 📋 Day 22: Admin Verification & Selection
router.patch("/applications/:id/stage", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_verifier"]), updateApplicationStage);
router.post("/admin/bulk-verify", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head", "admission_verifier"]), bulkVerifyApplications);
router.post("/admin/bulk-select", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), bulkSelectApplications);
router.post("/admin/bulk-update-compliance", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), bulkUpdateCompliance);

// 🔄 Day 24: Round Management
router.post("/round/advance", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), advanceAdmissionRound);

// 🔓 Edge Case 4 Extension: Per-Student Edit Lock Override
router.patch("/applications/:id/unlock-edit", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), unlockStudentEditWindow);
router.patch("/applications/:id/lock-edit", isAuthenticated, requireAdmissionRole(["org_admin", "admission_head"]), lockStudentEditWindow);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 MVC: Org Admin Dashboard Routes
// ─────────────────────────────────────────────────────────────────────────────
router.get("/dashboard/list", isAuthenticated, requireRole("org_admin"), attachInstitutionProfile(), getAdmissions);
router.get("/dashboard/:id", isAuthenticated, requireRole("org_admin"), getApplication);
router.patch("/dashboard/:id/status", isAuthenticated, requireRole("org_admin"), updateStatus);

export default router;
