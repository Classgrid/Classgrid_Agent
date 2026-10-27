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
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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

import mongoose from 'mongoose';
import AdmissionApplication from '../models/AdmissionApplication.js';

/**
 * Retrieves the admissions dashboard data with pagination and filters.
 * Populates hierarchy_id to expose the precise Target Classroom DNA (Course/Branch/Standard)
 * ensuring 4x2 capabilities can dynamically render terminology.
 * 
 * @param {string} orgId 
 * @param {Object} filters - Includes status, search, page, limit
 * @returns {Object} { applications, pagination }
 */
export async function getAdmissionsDashboard(orgId, filters = {}) {
    const { status, search, page = 1, limit = 20 } = filters;
    const query = { organization_id: orgId, is_deleted: false };
    
    if (status && status !== 'all') {
        query.status = status;
    }

    if (search) {
        query.$or = [
            { full_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { en_number: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const applications = await AdmissionApplication.find(query)
        .populate('hierarchy_id')
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(Number(limit))
        .lean();

    const total = await AdmissionApplication.countDocuments(query);

    return {
        applications,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }
    };
}

/**
 * Fetches a single complete application with all demographic data,
 * documents, and hierarchy details.
 * 
 * @param {string} applicationId 
 * @returns {Object} application details
 */
export async function getApplicationDetails(applicationId) {
    const application = await AdmissionApplication.findById(applicationId)
        .populate('hierarchy_id')
        .populate('stage_history.changed_by', 'full_name email')
        .populate('application_logs.performed_by', 'full_name email')
        .lean();

    if (!application) {
        throw new Error('Admission application not found.');
    }

    return application;
}

/**
 * Updates the admission status and appends a detailed tracking log
 * to both stage_history and application_logs.
 * 
 * @param {string} applicationId 
 * @param {string} newStatus 
 * @param {string} reviewNotes 
 * @param {string} adminUserId - Optional user ID of the admin making the change
 * @returns {Object} updated application
 */
export async function updateApplicationStatus(applicationId, newStatus, reviewNotes, adminUserId = null) {
    const application = await AdmissionApplication.findById(applicationId);
    
    if (!application) {
        throw new Error('Admission application not found.');
    }

    application.status = newStatus;
    
    // Add to stage history
    application.stage_history.push({
        status: newStatus,
        changed_by: adminUserId,
        comment: reviewNotes || `Status manually changed to ${newStatus}`
    });

    // Add to overarching application audit logs
    application.application_logs.push({
        action: `status_updated_to_${newStatus}`,
        performed_by: adminUserId,
        notes: reviewNotes || ''
    });

    await application.save();

    // Return plain JS object
    return application.toObject();
}
