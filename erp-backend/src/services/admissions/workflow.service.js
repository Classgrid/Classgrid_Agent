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

import AdmissionApplication from '../../models/AdmissionApplication.js';
import User from '../../models/User.js';
import { reserveAndProvisionEmail } from '../email-reservation.service.js';
import AcademicHierarchy from '../../models/AcademicHierarchy.js';
import { getAdmissionStrategy } from './strategy-selector.js';
import crypto from 'crypto';

/**WHAT U
 * AdmissionWorkflowService
 * Manages the state machine of an admission application.
 */
export const updateApplicationStatus = async (applicationId, nextStatus, { actorId, comment, organizationId }) => {
    const application = await AdmissionApplication.findOne({ _id: applicationId, organization_id: organizationId });
    if (!application) throw new Error("Application not found");

    const prevStatus = application.status;

    // 1. Basic transition validation
    const validTransitions = {
        'draft': ['applied'],
        'applied': ['under_verification', 'withdrawn'],
        'under_verification': ['verified', 'rejected'],
        'verified': ['fee_pending', 'enrolled'],
        'fee_pending': ['enrolled'],
        'enrolled': [], // Terminal state
        'rejected': ['under_verification'], // Allow re-verification
        'withdrawn': ['applied']
    };

    if (validTransitions[prevStatus] && !validTransitions[prevStatus].includes(nextStatus)) {
        throw new Error(`Invalid status transition from ${prevStatus} to ${nextStatus}`);
    }

    // 2. Perform actions based on new status
    if (nextStatus === 'enrolled') {
        await finalizeEnrollment(application, organizationId);
    }

    // 3. Update status and history
    application.status = nextStatus;
    application.stage_history.push({
        status: nextStatus,
        changed_by: actorId,
        comment,
        timestamp: new Date()
    });

    await application.save();
    return application;
};

/**
 * finalizeEnrollment
 * Logic to promote an applicant to a full student.
 */
async function finalizeEnrollment(application, organizationId) {
    if (application.student_id) return; // Already enrolled

    // A. Robust Duplicate Detection
    const existingUser = await User.findOne({
        organization_id: organizationId,
        $or: [
            { email: application.email },
            { phoneNumber: application.phone },
            { prn: application.en_number } // check if EN number was previously used as PRN
        ]
    });
    if (existingUser) throw new Error(`Duplicate identity detected: User already exists for this enrollment data.`);

    // B. Generate Institution Credentials
    const { default: Organization } = await import('../../models/Organization.js');
    const org = await Organization.findById(organizationId).lean();
    const strategy = getAdmissionStrategy(org.structure_type);

    let reservedEmail = null;
    let tempPassword = crypto.randomBytes(8).toString('hex');

    if (strategy?.credential_generation) {
        const domain = org.allowed_domains?.[0] || `${org.subdomain}.classgrid.in`;
        const names = application.full_name.trim().toLowerCase().split(' ');
        const firstName = names[0] || 'user';
        const lastName = names.length > 1 ? names[names.length - 1] : application.phone.slice(-4);
        const shortYear = new Date().getFullYear().toString().slice(-2);
        
        // Anti-Collision Generator
        let baseEmail = `${firstName}.${lastName}.${shortYear}`;
        reservedEmail = `${baseEmail}@${domain}`;
        let isReserved = false;
        let attempt = 0;

        while (!isReserved && attempt < 5) {
            try {
                await reserveAndProvisionEmail({
                    organizationId,
                    email: reservedEmail,
                    provider: strategy.credential_generation.platforms[0],
                    password: tempPassword
                });
                isReserved = true; // Success! Broken out of loop
            } catch (err) {
                if (err.message.includes('reserved') || err.message.includes('11000')) {
                    attempt++;
                    // Collision! Switch to: rahul.sharma1.26@domain.com
                    reservedEmail = `${firstName}.${lastName}${attempt}.${shortYear}@${domain}`;
                } else {
                    console.error("Email Provisioning API failed entirely:", err.message);
                    break; // Hard crash from API, fallback to personal email
                }
            }
        }
    }

    // C. 16-Digit PRN Generation (University Style: YYYY + [OrgID-Short] + [Sequential])
    // Format: 2026 5050 0000 0001
    const year = new Date().getFullYear().toString();
    const orgPart = organizationId.toString().slice(-4).padStart(4, '0');
    const seqPart = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8-digit random/sequential
    const prn = `${year}${orgPart}${seqPart}`;

    // D. Create User Record
    // IMPORTANT: Two-Email Architecture for Engineering
    // - `email` = Official login ID (provisioned via Google Workspace for engineering, personal email for others)
    // - `personal_email` = The verified personal email from admission (used to SEND credentials to)
    const loginEmail = reservedEmail || application.email;
    const personalEmail = application.email; // Always the OTP-verified personal email

    const newUser = new User({
        name: application.full_name,
        email: loginEmail,
        personal_email: personalEmail, // Credentials delivery target
        phoneNumber: application.phone,
        role: 'student',
        organization_id: organizationId,
        isEmailVerified: true,
        status: 'active',
        dob: application.dob,
        prn: prn,
        enrollmentDate: new Date(),
        tempAuth: { password: tempPassword, mustChange: true }
    });
    await newUser.save();

    // E. Update Application back-reference
    application.student_id = newUser._id;
    application.prn = prn;

    // F. Automatic Hierarchy Assignment
    // Check if allotment data contains a specific class/division preference
    if (application.allotment_data?.branch) {
        const node = await AcademicHierarchy.findOne({
            organization: organizationId,
            type: 'division',
            name: { $regex: new RegExp(application.allotment_data.branch, 'i') }
        });
        if (node) {
            newUser.academicSession = node._id;
            await newUser.save();
        }
    }
}

export default { updateApplicationStatus };
