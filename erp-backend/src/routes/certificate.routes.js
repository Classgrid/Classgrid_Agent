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
import { primarySupabaseClient as supabase } from '../config/supabaseClient.js';
import ClassroomMembership from '../models/ClassroomMembership.js';
import Classroom from '../models/Classroom.js';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════
// HELPER: Auto-verify certificate link against trusted domains
// ══════════════════════════════════════════════════════════════════════════
async function autoVerifyLink(link) {
    if (!link) return { verified: false, method: null };

    try {
        const url = new URL(link);
        const hostname = url.hostname.replace(/^www\./, ''); // strip www.

        // Fetch active trusted domains
        const { data: domains } = await supabase
            .from('trusted_domains')
            .select('domain_name, platform_name')
            .eq('is_active', true);

        if (!domains || domains.length === 0) return { verified: false, method: null };

        // Safe endsWith() matching to prevent spoofing (fake-coursera.com won't match)
        const match = domains.find(d => {
            return hostname === d.domain_name || hostname.endsWith('.' + d.domain_name);
        });

        if (match) {
            return { verified: true, method: 'domain_match', platform: match.platform_name };
        }

        return { verified: false, method: null };
    } catch {
        return { verified: false, method: null };
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 1. POST / — Add Certificate
// College mode: Student self-adds → auto-verify if link matches
// School mode: Teacher/Admin awards → status = approved directly
// ══════════════════════════════════════════════════════════════════════════
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const {
            student_id,       // Required (for school mode, teacher selects student)
            title,
            type,
            issuer,
            subject,
            certificate_date,
            valid_until,
            file_url,
            certificate_link,
            division_id,
            classroom_id,
            mode               // 'college' or 'school'
        } = req.body;

        if (!title || !type) {
            return res.status(400).json({ message: "Title and type are required" });
        }

        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        const addedBy = req.user._id.toString();
        const addedByRole = req.user.role;

        // Determine the target student
        const targetStudentId = student_id || addedBy; // Self-add if no student_id

        // Build base record
        const record = {
            org_id: orgId,
            student_id: targetStudentId,
            division_id: division_id || null,
            classroom_id: classroom_id || null,
            title: title.trim(),
            type,
            issuer: issuer || null,
            subject: subject || null,
            certificate_date: certificate_date || null,
            valid_until: valid_until || null,
            file_url: file_url || null,
            certificate_link: certificate_link || null,
            added_by: addedBy,
            added_by_role: addedByRole
        };

        // Mode-based logic
        const isSchoolMode = mode === 'school';

        if (isSchoolMode) {
            // School mode: No verification, directly approved
            record.verification_status = 'normal';
            record.verification_method = null;
            record.status = 'approved';
        } else {
            // College mode: Auto-verify if link provided
            if (certificate_link) {
                const verification = await autoVerifyLink(certificate_link);
                if (verification.verified) {
                    record.verification_status = 'verified';
                    record.verification_method = 'domain_match';
                    record.status = 'approved'; // Auto-approved when domain matched
                } else {
                    record.verification_status = 'pending';
                    record.verification_method = null;
                    record.status = 'pending'; // Needs admin review
                }
            } else if (file_url) {
                record.verification_status = 'pending';
                record.verification_method = 'document_uploaded';
                record.status = 'pending';
            } else {
                record.verification_status = 'normal';
                record.verification_method = null;
                record.status = 'pending';
            }

            // If added by admin/teacher → auto-approve
            if (['org_admin', 'teacher'].includes(addedByRole)) {
                record.status = 'approved';
                if (!record.verification_method) record.verification_method = 'manual_verified';
                if (record.verification_status === 'pending') record.verification_status = 'verified';
            }
        }

        const { data: cert, error } = await supabase
            .from('certificates')
            .insert(record)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ message: "Duplicate certificate — this certificate already exists for this student." });
            }
            throw error;
        }

        res.status(201).json({ message: "Certificate added", certificate: cert });
    } catch (err) {
        console.error("[Certificates] POST / error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 2. GET / — List Certificates (Role-Based Scoping + Filters)
// Student: own certs only
// Teacher: division certs (class teacher sees all, subject teacher sees tagged)
// Admin: all org certs
// ══════════════════════════════════════════════════════════════════════════
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        const { type, subject, student_id, status } = req.query;

        let query = supabase
            .from('certificates')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });

        // Role-based scoping
        if (req.user.role === 'student') {
            // Students see only their own certificates
            query = query.eq('student_id', req.user._id.toString());
        } else if (req.user.role === 'teacher') {
            // Teachers see certificates from their division(s)
            // If a specific student is queried, allow it (they're viewing a student profile)
            if (student_id) {
                query = query.eq('student_id', student_id);
            }
            // Otherwise, fetch all approved certificates visible to their scope
        } else if (req.user.role === 'org_admin') {
            // Admin sees all. Optionally filter by student
            if (student_id) {
                query = query.eq('student_id', student_id);
            }
        }

        // Filters
        if (type) query = query.eq('type', type);
        if (subject) query = query.ilike('subject', `%${subject}%`);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;

        res.json({ certificates: data || [] });
    } catch (err) {
        console.error("[Certificates] GET / error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 3. PATCH /:id/status — Approve or Reject (Admin/Teacher only)
// ══════════════════════════════════════════════════════════════════════════
router.patch('/:id/status', isAuthenticated, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
        }

        // Only admin or teacher can approve/reject
        if (!['org_admin', 'teacher'].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const updates = {
            status,
            verification_method: 'manual_verified'
        };

        if (status === 'approved') updates.verification_status = 'verified';
        if (status === 'rejected') updates.verification_status = 'rejected';

        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        const { data, error } = await supabase
            .from('certificates')
            .update(updates)
            .eq('id', req.params.id)
            .eq('org_id', orgId)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: `Certificate ${status}`, certificate: data });
    } catch (err) {
        console.error("[Certificates] PATCH /:id/status error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 4. GET /trusted-domains — Return active domains for frontend display
// ══════════════════════════════════════════════════════════════════════════
router.get('/trusted-domains', isAuthenticated, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('trusted_domains')
            .select('*')
            .eq('is_active', true)
            .order('platform_name', { ascending: true });

        if (error) throw error;
        res.json({ domains: data || [] });
    } catch (err) {
        console.error("[Certificates] GET /trusted-domains error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 5. DELETE /:id — Delete certificate
// Student can delete own; Admin can delete any
// ══════════════════════════════════════════════════════════════════════════
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        let query = supabase
            .from('certificates')
            .delete()
            .eq('id', req.params.id)
            .eq('org_id', orgId);

        // Students can only delete their own
        if (req.user.role === 'student') {
            query = query.eq('student_id', req.user._id.toString());
        }

        const { error } = await query;
        if (error) throw error;

        res.json({ message: "Certificate deleted" });
    } catch (err) {
        console.error("[Certificates] DELETE /:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 6. GET /analytics — Certificate stats for admin dashboard
// ══════════════════════════════════════════════════════════════════════════
router.get('/analytics', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        const { data: all, error } = await supabase
            .from('certificates')
            .select('type, verification_status, issuer, student_id')
            .eq('org_id', orgId)
            .eq('status', 'approved');

        if (error) throw error;

        const total = all?.length || 0;
        const verified = all?.filter(c => c.verification_status === 'verified').length || 0;
        const byType = {};
        const byIssuer = {};
        const byStudent = {};

        (all || []).forEach(c => {
            byType[c.type] = (byType[c.type] || 0) + 1;
            if (c.issuer) byIssuer[c.issuer] = (byIssuer[c.issuer] || 0) + 1;
            byStudent[c.student_id] = (byStudent[c.student_id] || 0) + 1;
        });

        // Top 5 students by cert count
        const topStudents = Object.entries(byStudent)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id, count]) => ({ student_id: id, count }));

        res.json({
            total,
            verified,
            byType,
            topIssuers: Object.entries(byIssuer).sort(([, a], [, b]) => b - a).slice(0, 10),
            topStudents
        });
    } catch (err) {
        console.error("[Certificates] GET /analytics error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
