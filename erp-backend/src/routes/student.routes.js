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
import { getStudentDashboardData } from '../controllers/student-dashboard.controller.js';
import { getChatSb } from '../config/supabaseClient.js';
import User from '../models/User.js';
import DeviceVerification from '../models/DeviceVerification.js';
import { sendEmail } from '../services/aws-ses.service.js';

const router = express.Router();

// ======================================================
// GET /api/student/org-students
// Fetches all students for the admin's organization
// ======================================================
router.get('/org-students', isAuthenticated, async (req, res) => {
  if (req.user.role !== 'org_admin') {
    return res.status(403).json({ message: 'Only org admins can view all students.' });
  }
  try {
    const students = await User.find({
      organization_id: req.user.organization_id,
      role: 'student'
    }).select('name email studentData profilePicture status').sort({ createdAt: -1 }).lean();
    res.json({ students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

// ======================================================
// POST /api/student/send-onboarding-otp
// Sends a 6-digit OTP to the student's email for onboarding verification
// ======================================================
router.post('/send-onboarding-otp', isAuthenticated, async (req, res) => {
  try {
    const email = req.user.email;
    const name = req.user.name || 'Student';
    const fpKey = `onboarding-${req.user._id.toString()}`;

    // Rate limit: check if OTP was sent within last 60 seconds
    const existing = await DeviceVerification.findOne({ email, deviceFingerprint: fpKey });
    if (existing && existing.lastResentAt && Date.now() - existing.lastResentAt.getTime() < 60000) {
      return res.status(429).json({ message: 'Please wait 60 seconds before requesting a new code.' });
    }
    if (existing && existing.resendCount >= 5) {
      return res.status(429).json({ message: 'Maximum resend limit reached. Please contact support.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await DeviceVerification.findOneAndUpdate(
      { email, deviceFingerprint: fpKey },
      {
        otp,
        isUsed: false,
        failedAttempts: 0,
        resendCount: (existing?.resendCount || 0) + 1,
        lastResentAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const { getNewDeviceOtpHtml, getNewDeviceOtpPlainText } = await import('../services/email-templates.service.js');

    await sendEmail({
      to: email,
      subject: '🔐 Verify Your Email — Classgrid Onboarding',
      html: getNewDeviceOtpHtml(name, otp),
      text: getNewDeviceOtpPlainText(name, otp),
    });

    res.json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('[Onboarding OTP Error]:', err);
    res.status(500).json({ message: 'Failed to send verification code.' });
  }
});

// ======================================================
// POST /api/student/verify-onboarding-otp
// Verifies the 6-digit OTP entered by the student
// ======================================================
router.post('/verify-onboarding-otp', isAuthenticated, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: 'Verification code is required.' });

    const email = req.user.email;
    const fpKey = `onboarding-${req.user._id.toString()}`;

    const record = await DeviceVerification.findOne({ email, deviceFingerprint: fpKey });

    if (!record) return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    if (record.isUsed) return res.status(400).json({ message: 'This code has already been used.' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'Code expired. Please request a new one.' });
    if (record.failedAttempts >= 5) return res.status(429).json({ message: 'Too many failed attempts. Request a new code.' });

    if (record.otp !== otp.trim()) {
      record.failedAttempts += 1;
      await record.save();
      return res.status(400).json({ message: `Invalid code. ${5 - record.failedAttempts} attempts remaining.` });
    }

    // Mark as used
    record.isUsed = true;
    await record.save();

    res.json({ message: 'Email verified successfully.', verified: true });
  } catch (err) {
    console.error('[Verify Onboarding OTP Error]:', err);
    res.status(500).json({ message: 'Verification failed.' });
  }
});

// ======================================================
// POST /api/student/onboarding
// Creates a Supabase student record and marks profile_completed = true
// ======================================================
router.post('/onboarding', isAuthenticated, requireOrganization, attachInstitutionProfile(), async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const orgId = (req.effectiveOrganizationId || req.user.organization_id)?.toString();

    if (!orgId) {
      return res.status(400).json({ message: 'You do not belong to any organization.' });
    }

    const { full_name, division_id, prn, roll_no, year, abc_id } = req.body;

    if (!division_id) return res.status(400).json({ message: 'Division is required.' });
    if (!full_name || !full_name.trim()) return res.status(400).json({ message: 'Full name is required.' });

    const sb = getChatSb();

    // ── 1. Validate Division belongs to this organization ──
    const { data: divCheck, error: divErr } = await sb
      .from('divisions')
      .select('id, name')
      .eq('id', division_id)
      .eq('org_id', orgId)
      .maybeSingle();

    if (divErr || !divCheck) {
      return res.status(400).json({ message: 'Invalid division selected.' });
    }

    const resolvedOrgType = req.institutionProfile?.admissionProfile?.baseOrgType || 'school';
    const identifierLabel = req.institutionProfile?.terminology?.identifier || 'Identifier';
    const usesPrimaryIdentifier = ['engineering', 'diploma'].includes(resolvedOrgType);
    const cleanPrn = prn?.trim().toUpperCase() || null;
    const cleanRoll = roll_no?.trim() || null;
    const cleanAbcId = abc_id?.trim() || null;

    if (cleanAbcId && !usesPrimaryIdentifier) {
      return res.status(400).json({ message: 'ABC ID is only supported for higher-education profiles.' });
    }

    if (cleanAbcId && !/^[0-9]{12}$/.test(cleanAbcId)) {
      return res.status(400).json({ message: 'ABC ID must be a 12-digit number.' });
    }

    if (usesPrimaryIdentifier) {
      if (!cleanPrn) return res.status(400).json({ message: `${identifierLabel} is required.` });
      if (!/^[A-Z0-9]{1,15}$/.test(cleanPrn)) {
        return res.status(400).json({ message: `${identifierLabel} must be alphanumeric and up to 15 characters.` });
      }
      // ── Uniqueness: PRN within org ──
      const { data: prnCheck } = await sb
        .from('students')
        .select('id')
        .eq('org_id', orgId)
        .eq('prn', cleanPrn)
        .maybeSingle();

      if (prnCheck) {
        return res.status(409).json({ message: `This ${identifierLabel} is already registered in your organization. Contact your admin if this is an error.` });
      }
    } else {
      if (!cleanRoll) return res.status(400).json({ message: `${identifierLabel} is required.` });
      // ── Uniqueness: Roll No within division ──
      const { data: rollCheck } = await sb
        .from('students')
        .select('id')
        .eq('division_id', division_id)
        .eq('roll_no', cleanRoll)
        .maybeSingle();

      if (rollCheck) {
        return res.status(409).json({ message: `This ${identifierLabel} is already taken in this division.` });
      }
    }

    // ── 2. Check for existing student record ──
    const { data: existing } = await sb
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const studentPayload = {
      user_id: userId,
      org_id: orgId,
      name: full_name.trim(),
      division_id,
      prn: cleanPrn,
      roll_no: cleanRoll,
    };

    let studentRecord;
    if (existing) {
      // Update existing record
      const { data, error } = await sb
        .from('students')
        .update(studentPayload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      studentRecord = data;
    } else {
      // Insert new record
      const { data, error } = await sb
        .from('students')
        .insert(studentPayload)
        .select()
        .single();
      if (error) throw error;
      studentRecord = data;
    }

    // ── 3. Sync to MongoDB — update name, prn, branch, profile_completed ──
    const mongoUpdate = {
      name: full_name.trim(),
      profile_completed: true,
    };
    if (cleanPrn) mongoUpdate.prn = cleanPrn;
    if (cleanAbcId) mongoUpdate.abc_id = cleanAbcId;
    if (usesPrimaryIdentifier && year) mongoUpdate.batch = year;

    await User.findByIdAndUpdate(req.user._id, { $set: mongoUpdate });

    res.json({
      message: 'Student profile created successfully.',
      student: studentRecord,
    });
  } catch (err) {
    console.error('[Student Onboarding Error]:', err);
    const msg = err?.message || 'Server error during onboarding.';
    if (msg.includes('violates row-level security')) {
      return res.status(500).json({ message: 'Database permission error. Please contact your admin.' });
    }
    res.status(500).json({ message: msg });
  }
});

// ======================================================
// GET /api/student/profile
// Returns the Supabase student profile for the logged-in student
// ======================================================
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const sb = getChatSb();

    const { data, error } = await sb
      .from('students')
      .select('*, divisions(name, org_id)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    res.json({ student: data });
  } catch (err) {
    console.error('[Student Profile Error]:', err);
    res.status(500).json({ message: 'Failed to load student profile.' });
  }
});

// ======================================================
// 13-STEP ONBOARDING — ACADEMIC HISTORY (SSC/HSC/CET/JEE)
// ======================================================

// GET /api/student/academic-history
router.get('/academic-history', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const orgId = req.user.organization_id?.toString();
    const sb = getChatSb();

    const { data, error } = await sb
      .from('student_academic_history')
      .select('*')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .order('qual_type');

    if (error) throw error;
    res.json({ history: data || [] });
  } catch (err) {
    console.error('[Academic History GET]:', err);
    res.status(500).json({ message: 'Failed to fetch academic history.' });
  }
});

// PUT /api/student/academic-history
// Upsert one qualification record (SSC, HSC, CET, etc.)
router.put('/academic-history', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const orgId = req.user.organization_id?.toString();
    if (!orgId) return res.status(400).json({ message: 'No organization found.' });

    const {
      qual_type, board_university, marks_obtained, marks_total,
      percentage, cgpa, grade, passing_year, stream,
      seat_type, rank, score
    } = req.body;

    const VALID_TYPES = ['SSC', 'HSC', 'DIPLOMA', 'GRADUATION', 'POST_GRADUATION', 'CET', 'JEE', 'NEET', 'OTHER'];
    if (!qual_type || !VALID_TYPES.includes(qual_type)) {
      return res.status(400).json({ message: `Invalid qual_type. Use one of: ${VALID_TYPES.join(', ')}` });
    }

    const sb = getChatSb();
    const payload = {
      user_id: userId,
      org_id: orgId,
      qual_type,
      board_university: board_university || '',
      marks_obtained: marks_obtained ?? null,
      marks_total: marks_total ?? null,
      percentage: percentage ?? null,
      cgpa: cgpa ?? null,
      grade: grade || null,
      passing_year: passing_year ?? null,
      stream: stream || null,
      seat_type: seat_type || null,
      rank: rank ?? null,
      score: score ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from('student_academic_history')
      .upsert(payload, { onConflict: 'user_id,org_id,qual_type' })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Academic history saved.', record: data });
  } catch (err) {
    console.error('[Academic History PUT]:', err);
    res.status(500).json({ message: 'Failed to save academic history.' });
  }
});

// DELETE /api/student/academic-history/:qual_type
router.delete('/academic-history/:qual_type', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const orgId = req.user.organization_id?.toString();
    const sb = getChatSb();

    const { error } = await sb
      .from('student_academic_history')
      .delete()
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('qual_type', req.params.qual_type);

    if (error) throw error;
    res.json({ message: 'Record deleted.' });
  } catch (err) {
    console.error('[Academic History DELETE]:', err);
    res.status(500).json({ message: 'Failed to delete record.' });
  }
});

// ======================================================
// 13-STEP ONBOARDING — ADDRESS INFO
// ======================================================

// GET /api/student/address
router.get('/address', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const sb = getChatSb();

    const { data, error } = await sb
      .from('student_addresses')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    res.json({ address: data || {} });
  } catch (err) {
    console.error('[Address GET]:', err);
    res.status(500).json({ message: 'Failed to fetch address.' });
  }
});

// PUT /api/student/address
router.put('/address', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const orgId = req.user.organization_id?.toString();
    if (!orgId) return res.status(400).json({ message: 'No organization found.' });

    const sb = getChatSb();
    const {
      permanent_address_line1, permanent_address_line2, permanent_city,
      permanent_state, permanent_pincode, permanent_country,
      correspondence_same_as_permanent,
      correspondence_address_line1, correspondence_address_line2, correspondence_city,
      correspondence_state, correspondence_pincode, correspondence_country
    } = req.body;

    const payload = {
      user_id: userId,
      org_id: orgId,
      permanent_address_line1: permanent_address_line1 || '',
      permanent_address_line2: permanent_address_line2 || '',
      permanent_city: permanent_city || '',
      permanent_state: permanent_state || '',
      permanent_pincode: permanent_pincode || '',
      permanent_country: permanent_country || 'India',
      correspondence_same_as_permanent: correspondence_same_as_permanent ?? true,
      correspondence_address_line1: correspondence_address_line1 || '',
      correspondence_address_line2: correspondence_address_line2 || '',
      correspondence_city: correspondence_city || '',
      correspondence_state: correspondence_state || '',
      correspondence_pincode: correspondence_pincode || '',
      correspondence_country: correspondence_country || 'India',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from('student_addresses')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Address saved.', address: data });
  } catch (err) {
    console.error('[Address PUT]:', err);
    res.status(500).json({ message: 'Failed to save address.' });
  }
});

// ======================================================
// 13-STEP ONBOARDING — PROGRESS TRACKER
// Returns which steps are complete for the student
// ======================================================
router.get('/onboarding-progress', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const orgId = req.user.organization_id?.toString();
    const sb = getChatSb();

    // Parallel checks
    const [profileRes, familyRes, qualsRes, docsRes, historyRes, addressRes] = await Promise.all([
      sb.from('students').select('id, name, prn, roll_no, division_id').eq('user_id', userId).maybeSingle(),
      sb.from('student_family_info').select('id').eq('user_id', userId).maybeSingle(),
      sb.from('student_past_qualifications').select('id').eq('user_id', userId),
      sb.from('student_documents').select('id').eq('user_id', userId),
      sb.from('student_academic_history').select('id, qual_type').eq('user_id', userId).eq('org_id', orgId || ''),
      sb.from('student_addresses').select('id').eq('user_id', userId).maybeSingle(),
    ]);

    const user = req.user;
    const historyTypes = (historyRes.data || []).map(h => h.qual_type);

    const steps = {
      // Step 1: Email verified
      email_verified: user.isEmailVerified || false,
      // Step 2: Basic profile (name, division)
      basic_profile: !!(profileRes.data?.name && profileRes.data?.division_id),
      // Step 3: PRN/Roll No assigned
      identifier_set: !!(profileRes.data?.prn || profileRes.data?.roll_no),
      // Step 4: Profile photo uploaded
      photo_uploaded: !!user.profilePicture,
      // Step 5: Family info
      family_info: !!familyRes.data,
      // Step 6: Permanent address
      address: !!addressRes.data,
      // Step 7: SSC marks
      ssc_marks: historyTypes.includes('SSC'),
      // Step 8: HSC marks
      hsc_marks: historyTypes.includes('HSC'),
      // Step 9: Entrance exam (CET/JEE/NEET or Diploma)
      entrance_exam: historyTypes.includes('CET') || historyTypes.includes('JEE') ||
                     historyTypes.includes('NEET') || historyTypes.includes('DIPLOMA'),
      // Step 10: Past qualifications (Supabase table)
      past_qualifications: (qualsRes.data || []).length > 0,
      // Step 11: Documents upload
      documents: (docsRes.data || []).length > 0,
      // Step 12: Phone number
      phone_number: !!user.phoneNumber,
      // Step 13: MongoDB profile_completed flag
      profile_completed: user.profile_completed || false,
    };

    const completedCount = Object.values(steps).filter(Boolean).length;
    const totalSteps = Object.keys(steps).length;

    res.json({
      steps,
      completed: completedCount,
      total: totalSteps,
      percentage: Math.round((completedCount / totalSteps) * 100),
    });
  } catch (err) {
    console.error('[Onboarding Progress]:', err);
    res.status(500).json({ message: 'Failed to compute onboarding progress.' });
  }
});

// ======================================================
// BATCH STUDENT IMPORT (Org Admin — CSV)
// POST /api/student/batch-import
// Body: { students: [{ name, email, prn, roll_no, division_id, branch, batch }] }
// ======================================================
router.post('/batch-import', isAuthenticated, async (req, res) => {
  try {
    if (!['org_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only org admins can batch import students.' });
    }

    const orgId = req.user.organization_id?.toString();
    if (!orgId) return res.status(400).json({ message: 'No organization found.' });

    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Students array is required.' });
    }
    if (students.length > 500) {
      return res.status(400).json({ message: 'Max 500 students per batch.' });
    }

    const sb = getChatSb();
    const bcryptModule = await import('bcryptjs');
    const hashedPass = await bcryptModule.default.hash('classgrid@123', 10);
    const results = { created: 0, skipped: 0, errors: [] };

    for (const s of students) {
      try {
        const fullName = s.name ? s.name.trim() : `${s.first_name || ''} ${s.last_name || ''}`.trim();
        if (!fullName || !s.email) {
          results.errors.push({ email: s.email, reason: 'Name (or First/Last name) and email are required.' });
          results.skipped++;
          continue;
        }

        // Check if user already exists in MongoDB
        let user = await User.findOne({ email: s.email.toLowerCase().trim() });

        if (user) {
          // Update existing user if they belong to this org
          if (user.organization_id?.toString() === orgId) {
            if (s.prn) user.prn = s.prn.trim().toUpperCase();
            if (s.branch) user.branch = s.branch;
            if (s.batch) user.batch = s.batch;
            await user.save();
            results.skipped++;
          } else {
            results.errors.push({ email: s.email, reason: 'User belongs to a different organization.' });
            results.skipped++;
          }
          continue;
        }

        // Create new user in MongoDB

        user = await User.create({
          name: fullName,
          email: s.email.toLowerCase().trim(),
          password: hashedPass,
          role: 'student',
          organization_id: orgId,
          phone: s.phone || s.phone_number || null,
          prn: s.prn?.trim().toUpperCase() || null,
          branch: s.branch || null,
          batch: s.batch || null,
          profile_completed: false,
          mustResetPassword: true,
        });

        // Create student record in Supabase
        if (s.division_id) {
          await sb.from('students').insert({
            user_id: user._id.toString(),
            org_id: orgId,
            name: s.name.trim(),
            division_id: s.division_id,
            prn: s.prn?.trim().toUpperCase() || null,
            roll_no: s.roll_no || null,
          });
        }

        results.created++;
      } catch (innerErr) {
        results.errors.push({ email: s.email, reason: innerErr.message });
        results.skipped++;
      }
    }

    res.json({
      message: `Batch import complete. ${results.created} created, ${results.skipped} skipped.`,
      ...results,
    });
  } catch (err) {
    console.error('[Batch Import Error]:', err);
    res.status(500).json({ message: 'Batch import failed.' });
  }
});

// ======================================================
// GET /api/student/dashboard/summary
// Real MongoDB data via Controller layer
// ======================================================
router.get('/dashboard/summary', isAuthenticated, requireOrganization, attachInstitutionProfile(), getStudentDashboardData);

export default router;
