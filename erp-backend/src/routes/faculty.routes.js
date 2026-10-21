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
import { isAuthenticated, requireOrganization } from '../middleware/auth.middleware.js';
import { attachInstitutionProfile } from '../middleware/institution-profile.middleware.js';
import { getFacultyDashboardData } from '../controllers/faculty-dashboard.controller.js';
import User from '../models/User.js';

const router = express.Router();

// ======================================================
// GET /api/faculty/org-faculty
// Fetches all faculty for the admin's organization
// ======================================================
router.get('/org-faculty', isAuthenticated, async (req, res) => {
  if (req.user.role !== 'org_admin') {
    return res.status(403).json({ message: 'Only org admins can view all faculty.' });
  }
  try {
    const faculty = await User.find({
      organization_id: req.user.organization_id,
      role: 'faculty'
    }).select('name email department role profilePicture status').sort({ createdAt: -1 }).lean();
    res.json({ faculty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch faculty' });
  }
});

// ======================================================
// GET /api/faculty/dashboard/summary
// Real MongoDB data via Controller layer
// ======================================================
router.get('/dashboard/summary', isAuthenticated, requireOrganization, attachInstitutionProfile(), getFacultyDashboardData);

// ======================================================
// BATCH FACULTY IMPORT (Org Admin)
// POST /api/faculty/batch-import
// Body: { faculty: [{ name, email, department, designation }] }
// ======================================================
router.post('/batch-import', isAuthenticated, async (req, res) => {
  try {
    if (!['org_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only org admins can batch import faculty.' });
    }

    const orgId = req.user.organization_id?.toString();
    if (!orgId) return res.status(400).json({ message: 'No organization found.' });

    const { faculty } = req.body;
    if (!Array.isArray(faculty) || faculty.length === 0) {
      return res.status(400).json({ message: 'Faculty array is required.' });
    }
    if (faculty.length > 500) {
      return res.status(400).json({ message: 'Max 500 faculty members per batch.' });
    }

    const User = (await import('../models/User.js')).default;
    const bcryptModule = await import('bcryptjs');
    const hashedPass = await bcryptModule.default.hash('classgrid@123', 10);

    const results = { created: 0, skipped: 0, errors: [] };

    for (const f of faculty) {
      try {
        const fullName = f.name ? f.name.trim() : `${f.first_name || ''} ${f.last_name || ''}`.trim();
        if (!fullName || !f.email) {
          results.errors.push({ email: f.email, reason: 'Name (or First/Last name) and email are required.' });
          results.skipped++;
          continue;
        }

        let user = await User.findOne({ email: f.email.toLowerCase().trim() });
        if (user) {
          if (user.organization_id?.toString() === orgId) {
            results.errors.push({ email: f.email, reason: 'User already exists in this organization.' });
          } else {
            results.errors.push({ email: f.email, reason: 'User belongs to a different organization.' });
          }
          results.skipped++;
          continue;
        }

        await User.create({
          name: fullName,
          email: f.email.toLowerCase().trim(),
          password: hashedPass,
          role: 'faculty',
          organization_id: orgId,
          phone: f.phone || f.phone_number || null,
          department: f.department || null,
          designation: f.designation || null,
          profile_completed: false,
          mustResetPassword: true,
        });

        results.created++;
      } catch (innerErr) {
        results.errors.push({ email: f.email, reason: innerErr.message });
        results.skipped++;
      }
    }

    // Update onboarding progress
    const Organization = (await import('../models/Organization.js')).default;
    await Organization.findByIdAndUpdate(orgId, {
      $set: { 'onboarding_progress.faculty_imported': true }
    });

    res.json({
      message: `Batch import complete. ${results.created} created, ${results.skipped} skipped.`,
      ...results,
    });
  } catch (err) {
    console.error('[Faculty Batch Import Error]:', err);
    res.status(500).json({ message: 'Batch import failed.' });
  }
});

export default router;
