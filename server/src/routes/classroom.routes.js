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

import express from "express";
import { classroomClient, studentNotesClient, getChatSb } from "../config/supabaseClient.js";
import { isAuthenticated, requireRole, requireOrganization } from "../middleware/auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import { requireClassroomMember, requireClassroomOwner } from "../middleware/classroom.middleware.js";
import { enforceClassroomAccess } from "../middleware/classroom-access.middleware.js";
import Classroom from "../models/Classroom.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import Notification from "../models/Notification.js";
import ActivityLog from "../models/ActivityLog.js";
import Organization from "../models/Organization.js";
import connectDB from "../../config/db.js";
import {
    sendClassroomActivityEmails,
    sendJoinRequestEmail,
    sendJoinApprovedEmail,
    sendBulkJoinApprovedEmails,
} from "../services/notification-email.service.js";

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { Groq } from "groq-sdk";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });

// Supabase Client — centralized via supabaseClient.js
// getChatSb() is imported from config, no local createClient needed.

import multer from "multer";
import { joinClassroomLimiter } from "../middleware/rateLimiter.js";
import { validateClassroom, validateJoinCode } from "../middleware/validation.middleware.js";



const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 40 * 1024 * 1024 } // 40MB per file
});

function getClassroomCourseType(profile) {
    const orgType = profile?.admissionProfile?.baseOrgType || profile?.organization?.org_type;
    const typeMap = {
        school: "SCHOOL",
        junior_college: "JUNIOR_COLLEGE",
        engineering: "ENGINEERING",
        coaching: "COACHING",
        diploma: "DIPLOMA",
    };

    return typeMap[orgType] || "COLLEGE";
}

function toBoolean(value) {
    return value === true || value === "true";
}

// ─────────────────────────────────────────────
// PROXY PDF DOWNLOAD (Bypass CORS)
// ─────────────────────────────────────────────
router.get("/proxy/pdf", isAuthenticated, async (req, res) => {
    try {
        const fileUrl = req.query.url;
        if (!fileUrl) return res.status(400).json({ message: "Missing URL parameter" });

        // Basic security check to ensure it's a supabase URL (prevent SSRF)
        if (!fileUrl.includes('supabase.co/storage')) {
            return res.status(403).json({ message: "Only Supabase storage URLs are allowed" });
        }

        const fetchRes = await fetch(fileUrl);
        if (!fetchRes.ok) throw new Error(`Failed to fetch from storage (HTTP ${fetchRes.status})`);

        const buffer = await fetchRes.arrayBuffer();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.send(Buffer.from(buffer));

    } catch (err) {
        console.error("Proxy PDF Error:", err);
        res.status(500).json({ message: "Error proxying PDF", error: err.message });
    }
});

// ─────────────────────────────────────────────
import { getChatReply } from "../services/chat.js";

// ─────────────────────────────────────────────
// GROQ/Cloudflare SUMMARIZE PROXY (Replaces Hugging Face)
// Frontend sends text chunk → backend calls Groq → returns summary
// ─────────────────────────────────────────────
router.post("/hf-summarize", isAuthenticated, async (req, res) => {
    try {
        const { text, title } = req.body;
        if (!text || typeof text !== "string") {
            return res.status(400).json({ message: "Missing or invalid 'text' field" });
        }

        // We use our existing chat service which automatically routes to Groq (primary)
        // and falls back to Cloudflare if rate limited! This prevents 504 timeouts.

        const prompt = `You are an expert academic assistant. Please summarize the following text extracted from a document${title ? ` titled "${title}"` : ""}. 
Make the summary concise, clear, and highlight the key educational concepts.
Do not include conversational filler, just provide the summary directly.

TEXT TO SUMMARIZE:
"""
${text}
"""`;

        const summary = await getChatReply(prompt, 'groq');

        if (!summary) return res.status(500).json({ message: "No summary returned from model" });

        res.json({ summary });

    } catch (err) {
        console.error("[Groq Summarize API] Error:", err.message);
        res.status(500).json({ message: "Server error while summarizing", error: err.message });
    }
});

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// CREATE CLASSROOM (Teacher/Faculty only)
// ─────────────────────────────────────────────
router.post("/", isAuthenticated, requireRole("teacher", "faculty", "org_admin", "super_admin"), requireOrganization, attachInstitutionProfile(), validateClassroom, async (req, res) => {
    try {
        await connectDB();
        const orgId = req.effectiveOrganizationId || req.user.organization_id;
        const { 
            name, description, subject, subjectSlug, settings,
            course_type, academic_year, term, stream, year, branch, semester, standard,
            division, division_id, sub_batch, sub_batch_id, subject_id,
            class_teacher, class_teacher_id, assistant_teacher, assistant_teacher_id,
            mentor, mentor_id, is_entrance_batch, entrance_exam, entrance_course
        } = req.body;

        if (!name || (!subject && !subject_id)) {
            return res.status(400).json({ message: "Name and subject are required" });
        }

        if (!req.user || !req.user._id || !orgId) {
            return res.status(400).json({ message: "Invalid user session or missing organization ID. Please re-login." });
        }

        const classroomData = {
            name,
            description: description || "",
            subject,
            subjectSlug: subjectSlug || subject.toLowerCase().replace(/\s+/g, "-"),
            teacher: req.user._id,
            organization_id: orgId,
            // ── STRUCTURED ERP FIELDS ──
            course_type: course_type || getClassroomCourseType(req.institutionProfile),
            academic_year: academic_year || null,
            term: term || null,
            stream: stream || null,
            year: year || null,
            branch: branch || null,
            semester: semester || null,
            standard: standard || null,
            division: division || null,
            division_id: division_id || null,
            subject_id: subject_id || null,
            sub_batch: sub_batch || null,
            sub_batch_id: sub_batch_id || null,
            class_teacher: class_teacher || class_teacher_id || null,
            assistant_teacher: assistant_teacher || assistant_teacher_id || null,
            mentor: mentor || mentor_id || null,
            is_entrance_batch: toBoolean(is_entrance_batch),
            entrance_exam: entrance_exam || null,
            entrance_course: entrance_course || null,
        };

        // Settings
        classroomData.settings = {
            allowJoinRequests: settings?.allowJoinRequests !== undefined ? settings.allowJoinRequests : true,
            isArchived: false,
        };

        const classroom = await Classroom.create(classroomData);

        res.status(201).json({
            message: "Classroom created successfully",
            classroom,
        });
    } catch (err) {
        console.error("Create classroom error:", err);
        if (err.code === 11000) {
            return res.status(400).json({ message: "A classroom with that code already exists. Please try again." });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: "Database validation failed", error: err.message });
        }
        res.status(500).json({ message: "Server error creating classroom", error: err.message });
    }
});

// ─────────────────────────────────────────────
// UPLOAD CLASSROOM BANNER/COVER
// ─────────────────────────────────────────────
router.put("/:id/cover", isAuthenticated, requireClassroomOwner, upload.single("coverImage"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) return res.status(404).json({ message: "Classroom not found" });

        const { uploadBufferToR2 } = await import("../config/r2Client.js");
        const fileExt = file.originalname.split('.').pop() || 'png';
        const path = `banners/${req.params.id}_${Date.now()}.${fileExt}`;

        const publicUrl = await uploadBufferToR2(file.buffer, file.originalname, file.mimetype, path);

        classroom.coverImage = publicUrl;
        await classroom.save();

        res.json({ message: "Banner updated successfully", coverImage: publicUrl });
    } catch (err) {
        console.error("Cover upload error:", err);
        res.status(500).json({ message: "Server error uploading banner" });
    }
});

// ─────────────────────────────────────────────
// LIST CLASSROOMS (role-aware)
// ─────────────────────────────────────────────
router.get("/", isAuthenticated, requireOrganization, attachInstitutionProfile(), async (req, res) => {
    try {
        await connectDB();
        if (req.user.role === "teacher" || req.user.role === "faculty") {
            // Teachers/Faculty see their own classrooms (isolated by org automatically since they only create in their org, but enforce it)
            const classrooms = await Classroom.find({
                teacher: req.user._id,
                organization_id: req.user.organization_id
            })
                .populate("teacher", "name email profilePicture qualification department bio")
                .sort({ createdAt: -1 })
                .lean();

            // Attach pending request counts
            const classroomIds = classrooms.map(c => c._id);
            const pendingCounts = await ClassroomMembership.aggregate([
                { $match: { classroom: { $in: classroomIds }, status: "pending" } },
                { $group: { _id: "$classroom", count: { $sum: 1 } } },
            ]);

            const pendingMap = {};
            pendingCounts.forEach(p => { pendingMap[p._id.toString()] = p.count; });

            const enriched = classrooms.map(c => ({
                ...c,
                pendingRequests: pendingMap[c._id.toString()] || 0,
            }));

            return res.json({ classrooms: enriched });
        }

        if (req.user.role === "org_admin") {
            const classrooms = await Classroom.find({
                organization_id: req.user.organization_id
            })
                .populate("teacher", "name email profilePicture qualification department bio")
                .sort({ createdAt: -1 })
                .lean();
            
            return res.json({ classrooms });
        }

        // Students: show approved + pending classrooms
        const { data: supaMemberships, error: supaErr } = await getChatSb()
            .from('classroom_memberships')
            .select('*')
            .eq('student_id', req.user._id.toString())
            .in('status', ["approved", "pending"]);

        if (supaErr) throw supaErr;

        const classroomIds = supaMemberships.map(m => m.classroom_id);
        
        const classrooms = await Classroom.find({ _id: { $in: classroomIds } })
            .populate("teacher", "name email profilePicture qualification department bio")
            .lean();

        const classroomMap = {};
        classrooms.forEach(c => { classroomMap[c._id.toString()] = c; });

        const myClassrooms = supaMemberships
            .filter(m => classroomMap[m.classroom_id]) // Exclude if classroom deleted
            .map(m => ({
                ...classroomMap[m.classroom_id],
                membershipStatus: m.status,
                membershipId: m.id,
            }));

        return res.json({ classrooms: myClassrooms });
    } catch (err) {
        console.error("List classrooms error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// ALL PENDING JOIN REQUESTS (Faculty - all their classrooms)
// ─────────────────────────────────────────────
router.get("/all-requests", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        if (!['faculty', 'teacher', 'org_admin'].includes(req.user.role)) {
            return res.status(403).json({ message: "Teachers only" });
        }

        // Get all classrooms this teacher owns
        const classrooms = await Classroom.find({ teacher: req.user._id })
            .select('_id name subject')
            .lean();

        if (!classrooms.length) return res.json({ requests: [] });

        const classroomIds = classrooms.map(c => c._id.toString());
        const classroomMap = {};
        classrooms.forEach(c => { classroomMap[c._id.toString()] = c; });

        // Fetch all pending (+ recent approved/rejected) memberships from Supabase
        const { data: memberships, error: memErr } = await getChatSb()
            .from('classroom_memberships')
            .select('*')
            .in('classroom_id', classroomIds)
            .eq('status', 'pending')  // Only pending requests
            .order('created_at', { ascending: false });

        if (memErr) throw memErr;
        if (!memberships || memberships.length === 0) return res.json({ requests: [] });

        // Fetch full student info from MongoDB
        const { default: User } = await import("../models/User.js");
        const studentIds = [...new Set(memberships.map(m => m.student_id))];
        const students = await User.find({ _id: { $in: studentIds } })
            .select('_id name email prn roll_number department branch batch')
            .lean();
        const studentMongoMap = {};
        students.forEach(s => { studentMongoMap[s._id.toString()] = s; });

        // Fetch academic info from Supabase for PRN/Roll No / dept
        const { primarySupabaseClient } = await import("../config/supabaseClient.js");
        const { data: academicInfos } = await primarySupabaseClient
            .from('student_academic_info')
            .select('user_id, prn, roll_number, branch_department, batch_year, class_year')
            .in('user_id', studentIds);

        const acaMap = {};
        if (academicInfos) {
            academicInfos.forEach(a => { acaMap[a.user_id] = a; });
        }

        // Enrich each membership with student and classroom info
        const enriched = memberships.map(m => {
            const mongoStudent = studentMongoMap[m.student_id] || {};
            const aca = acaMap[m.student_id] || {};
            const classroom = classroomMap[m.classroom_id] || {};
            return {
                id: m.id,
                classroom_id: m.classroom_id,
                classroomName: classroom.name || 'Unknown Classroom',
                classroomSubject: classroom.subject || '',
                status: m.status,
                request_message: m.request_message || '',
                created_at: m.created_at,
                student: {
                    id: m.student_id,
                    name: mongoStudent.name || 'Unknown',
                    email: mongoStudent.email || '',
                    prn: mongoStudent.prn || aca.prn || null,
                    rollNo: mongoStudent.roll_number || aca.roll_number || null,
                    department: mongoStudent.department || aca.branch_department || null,
                    branch: mongoStudent.branch || aca.branch_department || null,
                    batch: mongoStudent.batch || aca.batch_year || aca.class_year || null,
                }
            };
        });

        res.json({ requests: enriched });
    } catch (err) {
        console.error("All requests error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// MY JOIN REQUESTS (Student - their own requests)
// ─────────────────────────────────────────────
router.get("/my-requests", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const userId = req.user._id.toString();

        // Fetch student's own memberships (all statuses)
        const { data: memberships, error: memErr } = await getChatSb()
            .from('classroom_memberships')
            .select('*')
            .eq('student_id', userId)
            .order('created_at', { ascending: false });

        if (memErr) throw memErr;
        if (!memberships || memberships.length === 0) return res.json({ requests: [] });

        // Fetch classroom details from MongoDB
        const classroomIds = memberships.map(m => m.classroom_id);
        const classrooms = await Classroom.find({ _id: { $in: classroomIds } })
            .select('_id name subject teacher')
            .populate('teacher', 'name')
            .lean();
        const classroomMap = {};
        classrooms.forEach(c => { classroomMap[c._id.toString()] = c; });

        const enriched = memberships.map(m => {
            const classroom = classroomMap[m.classroom_id] || {};
            return {
                id: m.id,
                classroom_id: m.classroom_id,
                classroomName: classroom.name || 'Unknown Classroom',
                classroomSubject: classroom.subject || '',
                teacherName: classroom.teacher?.name || '',
                status: m.status,
                request_message: m.request_message || '',
                created_at: m.created_at,
                updated_at: m.updated_at,
            };
        });

        res.json({ requests: enriched });
    } catch (err) {
        console.error("My requests error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// DISCOVER / BROWSE CLASSROOMS (Students)
// ─────────────────────────────────────────────
router.get("/discover", isAuthenticated, requireOrganization, attachInstitutionProfile(), async (req, res) => {
    try {
        await connectDB();
        const { search, subject } = req.query;

        // Fetch the student's assigned division
        const { data: studentRecord } = await getChatSb()
            .from('students')
            .select('division_id')
            .eq('user_id', req.user._id.toString())
            .single();

        const filter = {
            "settings.isArchived": false,
            "settings.allowJoinRequests": true,
            organization_id: req.user.organization_id,
        };

        if (studentRecord && studentRecord.division_id) {
            // Show only classrooms matching their division OR generic legacy classrooms without a division
            filter.$or = [
                { division_id: studentRecord.division_id },
                { division_id: null },
                { division_id: { $exists: false } }
            ];
        }

        if (subject) filter.subject = subject.toLowerCase();
        if (search) filter.name = { $regex: search, $options: "i" };

        const classrooms = await Classroom.find(filter)
            .populate("teacher", "name email profilePicture")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const classroomIds = classrooms.map(c => c._id.toString());

        // Check existing memberships for this student using Supabase
        const { data: existingMemberships, error: supaErr } = await getChatSb()
            .from('classroom_memberships')
            .select('classroom_id, status')
            .eq('student_id', req.user._id.toString())
            .in('classroom_id', classroomIds);

        if (supaErr) throw supaErr;

        const membershipMap = {};
        if (existingMemberships) {
            existingMemberships.forEach(m => {
                membershipMap[m.classroom_id] = m.status;
            });
        }

        const enriched = classrooms
            .map(c => ({
                ...c,
                membershipStatus: membershipMap[c._id.toString()] || null,
            }))
            .filter(c => c.membershipStatus !== 'approved'); // Don't show already joined classrooms

        res.json({ classrooms: enriched });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET ALL ORG CLASSROOMS (Students)
// ─────────────────────────────────────────────
router.get("/my-organization", isAuthenticated, requireOrganization, attachInstitutionProfile(), async (req, res) => {
    try {
        await connectDB();
        const classrooms = await Classroom.find({
            organization_id: req.user.organization_id,
            "settings.isArchived": false
        })
            .populate("teacher", "name email profilePicture")
            .sort({ createdAt: -1 })
            .lean();

        res.json({ classrooms });
    } catch (err) {
        console.error("Get org classrooms error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// JOIN BY CLASS CODE (Student) - AUTO APPROVE
// ─────────────────────────────────────────────
router.post("/join-by-code", isAuthenticated, joinClassroomLimiter, enforceClassroomAccess, validateJoinCode, async (req, res) => {
    try {
        await connectDB();
        const { classCode, requestMessage } = req.body;

        if (!classCode) {
            return res.status(400).json({ message: "Class code is required" });
        }

        // Direct class code join
        const classroom = await Classroom.findOne({
            classCode: classCode.toUpperCase().trim(),
        }).populate("organization_id");

        if (!classroom) {
            return res.status(404).json({ message: "Invalid class code. No classroom found." });
        }

        // Profile requirement moved to GET /:id route so students can join but not enter.

        // ── TEMPORARY OPEN DOMAIN CHECK ───────────────────────
        if (classroom.organization_id && classroom.organization_id.allowed_domains && classroom.organization_id.allowed_domains.length > 0) {
            // Strict domain check is enabled
            const emailParts = req.user.email.split("@");
            if (emailParts.length === 2) {
                const userDomain = emailParts[1].toLowerCase().trim();
                const allowed = classroom.organization_id.allowed_domains.map(d => d.toLowerCase().trim());
                if (!allowed.includes(userDomain)) {
                    // Log the rejected join request (could add to ActivityLog but console is fine for now)
                    console.log(`[Domain Restricted] User ${req.user.email} attempted to join org ${classroom.organization_id.name} with restricted domains.`);
                    return res.status(403).json({
                        message: "You are not part of this organization (email domain mismatch).",
                        code: "DOMAIN_RESTRICTED"
                    });
                }
            }
        }



        // Allow joining even if requests are disabled, as code implies invite? 
        // Or strictly follow settings? User said "direct join". Usually code overrides "request" setting.
        // But let's respect "isArchived" if any. 
        if (classroom.settings.isArchived) {
            return res.status(403).json({ message: "This classroom is archived" });
        }

        // ── STRICT SINGLE-ORG ENFORCEMENT ──────────────────────────
        // If user already belongs to an org AND it doesn't match classroom's org → reject
        if (req.user.organization_id && classroom.organization_id) {
            const userOrgId = req.user.organization_id.toString();
            // In case organization_id is populated from earlier
            const classOrgId = classroom.organization_id._id ? classroom.organization_id._id.toString() : classroom.organization_id.toString();
            if (userOrgId !== classOrgId) {
                return res.status(403).json({
                    message: "You already belong to another organization. You cannot join classrooms from a different organization.",
                    code: "ORG_CONFLICT"
                });
            }
        }

        // Auto-link student to the classroom's org if not yet linked
        if (req.user.role === "student" && !req.user.organization_id && classroom.organization_id) {
            const { default: User } = await import("../models/User.js");
            await User.findByIdAndUpdate(req.user._id, { organization_id: classroom.organization_id });
        }

        // Check if teacher is trying to join their own classroom
        if (classroom.teacher.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You are the owner of this classroom" });
        }

        // Check existing membership in Supabase
        const { data: existingMem, error: checkErr } = await getChatSb()
            .from('classroom_memberships')
            .select('*')
            .eq('classroom_id', classroom._id.toString())
            .eq('student_id', req.user._id.toString())
            .single();

        if (existingMem) {
            if (existingMem.status === "approved") {
                console.warn(`[JoinAttempt] Duplicate join blocked: User ${req.user.email} is already an approved member of classroom ${classroom._id} (Code Join)`);
                return res.status(400).json({ message: "You are already a member of this classroom" });
            }
            // If pending or rejected, upgrade to approved since they have the code
            const { error: upErr } = await getChatSb()
                .from('classroom_memberships')
                .update({
                    status: "approved",
                    joined_at: new Date().toISOString()
                })
                .eq('id', existingMem.id);

            if (upErr) throw upErr;

            // Double writes to Mongo
            await ClassroomMembership.findOneAndUpdate(
                { classroom: classroom._id, student: req.user._id },
                { status: "approved", respondedAt: new Date() },
                { upsert: true }
            );

            // Increment count in Mongo (keep for transition)
            await Classroom.findByIdAndUpdate(classroom._id, { $inc: { memberCount: 1 } });

            return res.json({
                message: "Joined classroom successfully!",
                classroomName: classroom.name
            });
        }



        // Create APPROVED membership in Supabase
        const { data: newMem, error: createErr } = await getChatSb()
            .from('classroom_memberships')
            .insert([{
                classroom_id: classroom._id.toString(),
                student_id: req.user._id.toString(),
                status: "approved",
                request_message: requestMessage || "Joined via Class Code",
                joined_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (createErr) throw createErr;

        // Double write to Mongo
        await ClassroomMembership.findOneAndUpdate(
            { classroom: classroom._id, student: req.user._id },
            { status: "approved", respondedAt: new Date() },
            { upsert: true }
        );

        // Increment count in Mongo (keep for transition)
        await Classroom.findByIdAndUpdate(classroom._id, { $inc: { memberCount: 1 } });

        // Notify Teacher via Supabase
        await getChatSb()
            .from('notifications')
            .insert([{
                recipient_id: classroom.teacher.toString(),
                type: "system",
                title: "New Student Joined",
                message: `${req.user.name} joined "${classroom.name}" via class code.`,
                link: `/manage-classroom?id=${classroom._id}&tab=members`
            }]);

        res.status(201).json({
            message: "Joined classroom successfully!",
            membership: newMem,
            classroomName: classroom.name,
        });
    } catch (err) {
        console.error("Join by code error:", err);
        if (err.code === 11000) {
            return res.status(400).json({ message: "You are already in this classroom" });
        }
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// REQUEST TO JOIN (Student, by classroom ID)
// ─────────────────────────────────────────────
router.post("/:id/join", isAuthenticated, joinClassroomLimiter, enforceClassroomAccess, async (req, res) => {
    try {
        await connectDB();
        const classroom = await Classroom.findById(req.params.id).populate("organization_id");

        if (!classroom) {
            return res.status(404).json({ message: "Classroom not found" });
        }

        // Profile requirement moved to GET /:id route so students can join but not enter.

        // ── TEMPORARY OPEN DOMAIN CHECK ───────────────────────
        if (classroom.organization_id && classroom.organization_id.allowed_domains && classroom.organization_id.allowed_domains.length > 0) {
            const emailParts = req.user.email.split("@");
            if (emailParts.length === 2) {
                const userDomain = emailParts[1].toLowerCase().trim();
                const allowed = classroom.organization_id.allowed_domains.map(d => d.toLowerCase().trim());
                if (!allowed.includes(userDomain)) {
                    console.log(`[Domain Restricted] User ${req.user.email} attempted to request join for org ${classroom.organization_id.name}.`);
                    return res.status(403).json({
                        message: "You are not part of this organization (email domain mismatch).",
                        code: "DOMAIN_RESTRICTED"
                    });
                }
            }
        }

        if (!classroom.settings.allowJoinRequests) {
            return res.status(403).json({ message: "This classroom is not accepting join requests" });
        }

        if (classroom.teacher.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You own this classroom" });
        }

        const myId = req.user._id.toString();
        const sb = getChatSb();

        // Check existing in Supabase
        const { data: existing, error: checkErr } = await sb
            .from('classroom_memberships')
            .select('*')
            .eq('classroom_id', classroom._id.toString())
            .eq('student_id', myId)
            .single();

        if (existing) {
            if (existing.status === "approved") {
                console.warn(`[JoinAttempt] Duplicate request blocked: User ${req.user.email} is already an approved member of classroom ${classroom._id} (Request Join)`);
                return res.status(400).json({ message: "Already a member" });
            }
            if (existing.status === "pending") {
                console.warn(`[JoinAttempt] Duplicate request blocked: User ${req.user.email} already has a pending request for classroom ${classroom._id}`);
                return res.status(400).json({ message: "Request already pending" });
            }
            
            // rejected — allow re-request
            const { error: upErr } = await sb
                .from('classroom_memberships')
                .update({ status: "pending", created_at: new Date().toISOString() })
                .eq('id', existing.id);

            if (upErr) throw upErr;

            await ClassroomMembership.findOneAndUpdate(
                { classroom: classroom._id, student: myId },
                { status: "pending", requestedAt: new Date() },
                { upsert: true }
            );

            // Notify Teacher via Supabase
            await sb.from('notifications').insert([{
                recipient_id: classroom.teacher.toString(),
                type: "system",
                title: "Join Re-request",
                message: `${req.user.name} has re-requested to join "${classroom.name}".`,
                link: "/manage-classroom#requests",
                related_id: existing.id
            }]);

            return res.json({ message: "Join request re-submitted" });
        }

        // Create in Supabase
        const { data: membership, error: createErr } = await sb
            .from('classroom_memberships')
            .insert([{
                classroom_id: classroom._id.toString(),
                student_id: myId,
                status: "pending",
                request_message: req.body.requestMessage || ""
            }])
            .select()
            .single();

        if (createErr) throw createErr;

        await ClassroomMembership.findOneAndUpdate(
            { classroom: classroom._id, student: myId },
            { status: "pending", requestedAt: new Date() },
            { upsert: true }
        );

        // Notify Teacher
        await sb.from('notifications').insert([{
            recipient_id: classroom.teacher.toString(),
            type: "system",
            title: "New Join Request",
            message: `${req.user.name} has requested to join "${classroom.name}".`,
            link: "/manage-classroom#requests",
            related_id: membership.id
        }]);

        // Notify Student
        await sb.from('notifications').insert([{
            recipient_id: myId,
            type: "system",
            title: "Request Sent",
            message: `Your request to join "${classroom.name}" has been sent successfully.`,
            related_id: classroom._id.toString()
        }]);

        // 📧 Fire-and-forget: email faculty about join request
        sendJoinRequestEmail({ classroom, student: req.user })
            .catch(err => console.error('[EmailNotification] join request email error:', err.message));

        res.status(201).json({ message: "Join request sent!" });
    } catch (err) {
        console.error("Join request error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET JOIN REQUESTS (Teacher)
// ─────────────────────────────────────────────
router.get("/:id/requests", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { status } = req.query;
        let query = getChatSb()
            .from('classroom_memberships')
            .select('*')
            .eq('classroom_id', req.params.id);
        
        if (status) query = query.eq('status', status);
        
        const { data: supaRequests, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        // Populate student names from Mongo (until Users are migrated)
        const User = (await import("../models/User.js")).default;
        const studentIds = supaRequests.map(r => r.student_id);
        const students = await User.find({ _id: { $in: studentIds } }).select("name email profilePicture role").lean();
        const studentMap = students.reduce((acc, s) => ({ ...acc, [s._id.toString()]: s }), {});

        const requests = supaRequests.map(r => ({
            ...r,
            _id: r.id, // Compatibility
            student: studentMap[r.student_id] || { name: "Unknown" }
        }));

        res.json({ requests });
    } catch (err) {
        console.error("Get requests error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// APPROVE / REJECT REQUEST (Teacher)
// ─────────────────────────────────────────────
router.put("/:id/requests/:requestId", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;
        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
        }

        const sb = getChatSb();
        const { data: membership, error: findErr } = await sb
            .from('classroom_memberships')
            .select('*')
            .eq('id', req.params.requestId)
            .eq('classroom_id', req.params.id)
            .single();

        if (findErr || !membership) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (membership.status !== "pending") {
            return res.status(400).json({ message: `Request is already ${membership.status}` });
        }


        const status = action === "approve" ? "approved" : "rejected";
        const { error: upErr } = await sb
            .from('classroom_memberships')
            .update({
                status,
                joined_at: action === "approve" ? new Date().toISOString() : null,
                // responded_at can be added to schema if needed
            })
            .eq('id', membership.id);

        if (upErr) throw upErr;

        await ClassroomMembership.findOneAndUpdate(
            { classroom: req.params.id, student: membership.student_id },
            { status, respondedAt: new Date(), respondedBy: req.user._id },
            { upsert: true }
        );

        // Update member count on classroom in Mongo
        if (action === "approve") {
            await Classroom.findByIdAndUpdate(req.params.id, { $inc: { memberCount: 1 } });

            // Create Notification in Supabase
            await sb.from('notifications').insert([{
                recipient_id: membership.student_id,
                type: "request_approved",
                title: "Join Request Approved",
                message: `Your request to join "${req.classroom.name}" has been accepted.`,
                link: `/view-classroom?id=${req.params.id}`,
                related_id: req.params.id
            }]);

            // 📧 Fire-and-forget: email student about approval (keep for now)
            sendJoinApprovedEmail({ classroom: req.classroom, studentId: membership.student_id })
                .catch(err => console.error('[EmailNotification] join approved email error:', err.message));
        }

        res.json({ message: `Request ${action}d successfully` });
    } catch (err) {
        console.error("Approve/reject error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// BULK APPROVE/REJECT REQUESTS (Teacher)
// ─────────────────────────────────────────────
router.put("/:id/requests-bulk", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { requestIds, action } = req.body;
        if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
            return res.status(400).json({ message: "requestIds array required" });
        }
        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
        }

        const sb = getChatSb();


        const newStatus = action === "approve" ? "approved" : "rejected";

        // Fetch memberships from Supabase before updating to get student IDs
        const { data: pendingMembers, error: fetchErr } = await sb
            .from('classroom_memberships')
            .select('*')
            .in('id', requestIds)
            .eq('status', 'pending');

        if (fetchErr) throw fetchErr;

        // Perform bulk update in Supabase
        const { error: upErr } = await sb
            .from('classroom_memberships')
            .update({
                status: newStatus,
                joined_at: action === "approve" ? new Date().toISOString() : null
            })
            .in('id', requestIds)
            .eq('status', 'pending');

        if (upErr) throw upErr;

        // NEW: Double write to MongoDB
        for (const m of pendingMembers) {
            await ClassroomMembership.findOneAndUpdate(
                { classroom: req.params.id, student: m.student_id },
                { status: newStatus, respondedAt: new Date(), respondedBy: req.user._id },
                { upsert: true }
            );
        }

        // Update member count & Notify
        if (action === "approve" && pendingMembers.length > 0) {
            await Classroom.findByIdAndUpdate(req.params.id, {
                $inc: { memberCount: pendingMembers.length },
            });

            // Bulk Notifications in Supabase
            const notifications = pendingMembers.map(m => ({
                recipient_id: m.student_id,
                type: "request_approved",
                title: "Join Request Approved",
                message: `Your request to join "${req.classroom.name}" has been accepted.`,
                link: `/view-classroom?id=${req.params.id}`,
                related_id: req.params.id
            }));

            if (notifications.length > 0) {
                await sb.from('notifications').insert(notifications);
            }

            // 📧 Fire-and-forget: bulk email students about approval
            const approvedStudentIds = pendingMembers.map(m => m.student_id);
            sendBulkJoinApprovedEmails({ classroom: req.classroom, studentIds: approvedStudentIds })
                .catch(err => console.error('[EmailNotification] bulk approved email error:', err.message));
        }

        res.json({ message: `${pendingMembers.length} requests ${action}d` });
    } catch (err) {
        console.error("Bulk action error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET CLASSROOM DETAILS (Members only)
// ─────────────────────────────────────────────
router.get("/:id", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id)
            .populate("teacher", "name email profilePicture subject qualification department bio")
            .lean();

        if (!classroom) {
            return res.status(404).json({ message: "Classroom not found" });
        }

        // ── PROFILE & PRN REQUIRED ENFORCEMENT FOR ENTRY ──────────────────
        if (req.user.role === 'student' && classroom.organization_id) {
            const org = await Organization.findById(classroom.organization_id).select('academic_config').lean();
            const { default: User } = await import("../models/User.js");
            const freshUser = await User.findById(req.user._id).select("prn branch batch department profile_completed").lean();
            
            const { primarySupabaseClient } = await import("../config/supabaseClient.js");
            const { data: aca } = await primarySupabaseClient
                .from('student_academic_info')
                .select('*')
                .eq('user_id', req.user._id.toString())
                .maybeSingle();
            
            const acConfig = org?.academic_config || {};
            const reqFields = acConfig.requiredFields || {};
            const idCardFields = acConfig.idCardFields || ["prn"];
            
            const needsPrn = idCardFields.includes("prn") || idCardFields.includes("both");
            const needsRollNo = idCardFields.includes("rollNo") || idCardFields.includes("both");
            
            // Is ID enforced at all?
            const idEnforced = acConfig.prnRequired !== false && reqFields.prn !== false;
            const branchRequired = reqFields.branch !== false;
            const batchRequired = reqFields.batch !== false;

            const hasPrn = !!(freshUser.prn || aca?.prn);
            const hasRollNo = !!aca?.roll_number;

            const userBranch = freshUser.branch || aca?.branch_department;
            const userBatch = freshUser.batch || aca?.batch_year || aca?.class_year;
            const userDept = freshUser.department || aca?.branch_department;
            
            let missingIdLabel = null;
            if (idEnforced) {
                if (needsPrn && !hasPrn) {
                    missingIdLabel = org?.rollNumberLabel || "PRN";
                }
                // Roll Number is always optional — never blocks classroom access
            }

            let missing = [];
            if (missingIdLabel) missing.push(missingIdLabel);
            if (branchRequired && !userBranch) missing.push("Branch / Department");
            if (batchRequired && !userBatch) missing.push("Batch / Class Year");
            if (!userDept) missing.push("Department");

            if (missing.length > 0 && !freshUser.profile_completed) {
                return res.status(403).json({ 
                    message: `Your academic profile is incomplete. Please go to Account > Profile and fill in your Academic Information (${missing.join(', ')}).`,
                    code: "PROFILE_INCOMPLETE",
                    missingFields: missing
                });
            }
            
            // Explicit ID enforcement even if profile is marked complete (edge case)
            if (missingIdLabel) {
                return res.status(403).json({ 
                    message: `Your organization requires a ${missingIdLabel} to be set before accessing classrooms. Please update your Academic Information in your Account.`,
                    code: "PRN_REQUIRED",
                    missingIdLabel
                });
            }
        }


        res.json({ classroom, isOwner: req.isClassroomOwner });
    } catch (err) {
        console.error("Get classroom error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// UPDATE CLASSROOM (Owner only)
// ─────────────────────────────────────────────
router.put("/:id", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const allowedUpdates = ["name", "description", "coverImage", "settings"];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const classroom = await Classroom.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { returnDocument: "after", runValidators: true }
        );

        res.json({ message: "Classroom updated", classroom });
    } catch (err) {
        console.error("Update classroom error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// DELETE CLASSROOM (Owner only)
// ─────────────────────────────────────────────
router.delete("/:id", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        // Delete all related data
        const sb = getChatSb();
        await Promise.all([
            sb.from('classroom_memberships').delete().eq('classroom_id', req.params.id),
            sb.from('notifications').delete().eq('related_id', req.params.id), // Cleanup notifications related to classroom
            ActivityLog.deleteMany({ classroom: req.params.id }),
            Classroom.findByIdAndDelete(req.params.id),
        ]);

        res.json({ message: "Classroom deleted successfully" });
    } catch (err) {
        console.error("Delete classroom error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// GET MEETINGS for a CLASSROOM
// ─────────────────────────────────────────────
router.get("/:id/meetings", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const { primarySupabaseClient: supabase } = await import("../config/supabaseClient.js");
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('meetings')
            .select('*')
            .eq('classroom_id', req.params.id)
            .gte('start_time', oneHourAgo)
            .order('start_time', { ascending: true });

        if (error) throw error;
        res.json({ meetings: data || [] });
    } catch (err) {
        console.error("Get classroom meetings error:", err.message);
        res.status(500).json({ message: "Server error fetching meetings" });
    }
});

// GET MEMBERS (Members can see roster)
// ─────────────────────────────────────────────
router.get("/:id/members", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const { data: supaMembers, error } = await getChatSb()
            .from('classroom_memberships')
            .select('*')
            .eq('classroom_id', req.params.id)
            .eq('status', "approved")
            .order('joined_at', { ascending: true });

        if (error) throw error;

        // Populate student names from Mongo
        const User = (await import("../models/User.js")).default;
        const studentIds = supaMembers.map(m => m.student_id);
        const students = await User.find({ 
            _id: { $in: studentIds },
            isSandbox: { $ne: true }
        }).select("name email profilePicture role lastLoginAt prn isSandbox").lean();
        
        const studentMap = students.reduce((acc, s) => ({ ...acc, [s._id.toString()]: s }), {});

        const filteredMembers = supaMembers
            .map(m => ({
                ...m,
                _id: m.id,
                student: studentMap[m.student_id]
            }))
            .filter(m => m.student != null);

        res.json({ members: filteredMembers, total: filteredMembers.length });
    } catch (err) {
        console.error("Get members error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// REMOVE MEMBER (Owner only)
// ─────────────────────────────────────────────
router.delete("/:id/members/:userId", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const sb = getChatSb();
        const { data: result, error } = await sb
            .from('classroom_memberships')
            .delete()
            .eq('classroom_id', req.params.id)
            .eq('student_id', req.params.userId)
            .select()
            .single();

        if (error || !result) {
            return res.status(404).json({ message: "Member not found" });
        }

        if (result.status === "approved") {
            await Classroom.findByIdAndUpdate(req.params.id, { $inc: { memberCount: -1 } });
        }

        res.json({ message: "Member removed" });
    } catch (err) {
        console.error("Remove member error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// ─────────────────────────────────────────────
// GENERATE SIGNED UPLOAD URLS (Avoids 413 & RLS)
// ─────────────────────────────────────────────
router.post("/:id/upload-urls", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { files } = req.body;
        if (!files || !Array.isArray(files)) return res.status(400).json({ message: "Files array required" });

        // Uses global supabase client

        const urls = [];
        for (const file of files) {
            const path = `${req.params.id}/${Date.now()}_${Math.floor(Math.random() * 1000)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { getPresignedUploadUrl } = await import("../config/r2Client.js");
            const { uploadUrl, publicUrl } = await getPresignedUploadUrl(file.name, file.type || 'application/octet-stream', 3600, path);

            urls.push({
                originalname: file.name,
                path: path,
                token: "r2-token",
                signedUrl: uploadUrl,
                publicUrl: publicUrl
            });
        }
        res.json({ urls });
    } catch (err) {
        console.error("Upload URL error:", err);
        res.status(500).json({ message: "Server error generating URLs" });
    }
});
// ─────────────────────────────────────────────
// CREATE CONTENT (Teacher / Owner only)
// ─────────────────────────────────────────────
router.post("/:id/content/:type", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { type } = req.params;
        if (!["materials", "announcements", "quizzes"].includes(type)) {
            return res.status(400).json({ message: "Invalid content type" });
        }

        const { title, description, message, tags, link, provider } = req.body;
        const classroomId = req.params.id;

        // Import classroomClient client
        // Uses global classroomClient client

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) return res.status(404).json({ message: "Classroom not found" });

        const slug = classroom.subjectSlug || "general";
        let insertedItems = [];

        if (type === "materials") {
            const uploadedFiles = req.body.uploaded_files || [];

            if (!uploadedFiles.length) {
                return res.status(400).json({ message: "At least one file is required for materials. Please use the signed URL upload flow." });
            }

            // Frontend uploaded to Supabase directly (Avoids 413 Payload Too Large)
            for (let i = 0; i < uploadedFiles.length; i++) {
                const fileObj = uploadedFiles[i];

                const dbData = {
                    title: (uploadedFiles.length === 1 && title) ? title : (title ? `${title} - ${fileObj.originalname}` : fileObj.originalname),
                    subject_slug: slug,
                    file_url: fileObj.fileurl,
                    uploaded_by: req.user.name,
                    type: fileObj.fileExt,
                    classroom_id: classroomId
                };

                const { data, error } = await classroomClient
                    .from(type)
                    .insert([dbData])
                    .select()
                    .single();

                if (error) throw error;
                insertedItems.push(data);
            }
        } else if (type === "quizzes") {
            if (!title || !link) return res.status(400).json({ message: "Title and link are required" });
            const dbData = {
                title,
                subject_slug: slug,
                quiz_url: link,
                provider: provider || 'Google Forms',
                classroom_id: classroomId
            };

            const { data, error } = await classroomClient
                .from(type)
                .insert([dbData])
                .select()
                .single();

            if (error) throw error;
            insertedItems.push(data);
        } else if (type === "announcements") {
            if (!message) return res.status(400).json({ message: "Message is required" });
            const dbData = {
                message,
                subject_slug: slug,
                posted_by: req.user.name,
                tags: tags ? (Array.isArray(tags) ? tags : [tags]) : ["General"],
                classroom_id: classroomId
            };

            const { data, error } = await classroomClient
                .from(type)
                .insert([dbData])
                .select()
                .single();

            if (error) throw error;
            insertedItems.push(data);
        }

        try {
            const { data: supaMembers, error: memErr } = await getChatSb()
                .from('classroom_memberships')
                .select('student_id')
                .eq('classroom_id', classroomId)
                .eq('status', 'approved');

            if (memErr) throw memErr;
            
            if (supaMembers && supaMembers.length > 0) {
                const memberIds = supaMembers.map(m => m.student_id);
                // Fetch users from Mongo to check push settings
                const { default: User } = await import("../models/User.js");
                const members = await User.find({ _id: { $in: memberIds } }).select("_id pushNotifications").lean();

                const notifTitle = type === 'materials'
                    ? `New Material${insertedItems.length > 1 ? 's' : ''}`
                    : type === 'quizzes' ? 'New Quiz' : 'New Announcement';
                const notifMsg = type === 'materials' && insertedItems.length > 1
                    ? `${insertedItems.length} new files uploaded to ${classroom.name}`
                    : `New content added to ${classroom.name}: ${title || (message && message.substring(0, 30) + '...') || 'Untitled'}`;

                const notifications = [];
                for (const m of members) {
                    if (m.pushNotifications?.global !== false) {
                        notifications.push({
                            recipient_id: m._id.toString(),
                            type: "content_update",
                            title: notifTitle,
                            message: notifMsg,
                            link: `/view-classroom?id=${classroomId}`,
                            related_id: classroomId
                        });
                    }
                }
                
                if (notifications.length > 0) {
                    await getChatSb().from('notifications').insert(notifications);
                }
            }

            // 📧 Queue email notifications (reliable, with retry)
            const emailResult = await sendClassroomActivityEmails({
                classroom,
                faculty: req.user,
                contentType: type,
                title: title || (message && message.substring(0, 80)) || 'Untitled',
                preview: (message || description || '').substring(0, 150),
            });

            // Track email status on notifications
            if (emailResult?.emailAttempted && members.length > 0) {
                try {
                    await Notification.updateMany(
                        {
                            relatedId: classroomId, type: "content_update", emailSent: false,
                            createdAt: { $gte: new Date(Date.now() - 10000) }
                        },
                        { $set: { emailSent: true, emailSentAt: new Date() } }
                    );
                } catch (trackErr) {
                    console.error('[EmailNotification] tracking update failed:', trackErr.message);
                }
            }

            console.log(`[Content] ${type} created in classroom ${classroomId}, emailJobsCreated=${emailResult?.jobsCreated || 0}`);
        } catch (notifErr) {
            console.error(`Failed to send notifications for ${type}:`, notifErr);
            // Do not throw the error; allow the upload to succeed
        }

        res.status(201).json({
            message: `${insertedItems.length} item(s) uploaded successfully`,
            items: insertedItems,
            item: insertedItems[0],
            emailJobsCreated: 0 // Will be overridden if available
        });

    } catch (err) {
        console.error(`Create ${req.params.type} error:`, err);
        res.status(500).json({ message: "Server error creating content" });
    }
});

// ─────────────────────────────────────────────
// RESEND FAILED EMAIL NOTIFICATIONS (Faculty)
// ─────────────────────────────────────────────
router.post("/:id/resend-notification", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { resendClassroomEmails } = await import("../services/email-queue.service.js");
        const { type } = req.body; // optional: filter by content type
        const resetCount = await resendClassroomEmails(req.params.id, type || null);

        if (resetCount === 0) {
            return res.json({ message: "No failed email jobs found for this classroom" });
        }

        console.log(`[Classroom] Faculty ${req.user._id} triggered resend for classroom ${req.params.id}, reset=${resetCount}`);
        res.json({
            message: `${resetCount} failed email(s) re-queued for delivery`,
            resetCount,
        });
    } catch (err) {
        console.error("Resend notification error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET CONTENT (Materials, Announcements, Quizzes)
// ─────────────────────────────────────────────
router.get("/:id/content/:type", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const { type } = req.params;
        if (!["materials", "announcements", "quizzes"].includes(type)) {
            return res.status(400).json({ message: "Invalid content type" });
        }

        // Import classroomClient client
        // Uses global classroomClient client

        let content = [];
        let source = "classroom";

        // STRICT: Only fetch content that belongs to THIS classroom
        // No subject_slug fallback — prevents cross-classroom data leakage
        const { data, error } = await classroomClient
            .from(type)
            .select("*")
            .eq("classroom_id", req.params.id)
            .order("created_at", { ascending: false });

        if (!error && data) {
            content = data;
        }

        // Deduplicate by id to prevent the same item appearing twice
        const seen = new Set();
        content = content.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });

        // Normalize announcements: map "message" to "title"/"content" for frontend
        if (type === "announcements") {
            content = content.map(a => ({
                ...a,
                title: a.title || a.message || "",
                content: a.content || a.message || "",
            }));
        }

        res.json({ content, source });
    } catch (err) {
        console.error(`Get ${req.params.type} error:`, err);
        res.status(500).json({ message: "Server error fetching content" });
    }
});

// Endpoint removed: merged into the actual summarize endpoint below.

// ─────────────────────────────────────────────
// NOTIFY CLASSROOM MEMBERS (Owner only)
// ─────────────────────────────────────────────
router.post("/:id/notify", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { title, message, type, link } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required" });
        }

        // Get all approved members
        const members = await ClassroomMembership.find({
            classroom: req.params.id,
            status: "approved"
        }).select("student");

        if (members.length === 0) {
            return res.json({ message: "No members to notify" });
        }

        const notifications = members.map(m => ({
            recipient: m.student,
            type: type || "system",
            title,
            message,
            link: link || `/view-classroom?id=${req.params.id}`,
            relatedId: req.params.id,
            createdAt: new Date()
        }));

        await Notification.insertMany(notifications);

        res.json({ message: "Notifications sent", count: members.length });
    } catch (err) {
        console.error("Notify classroom error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET STUDENTS LIST (Any member can see classmates)
// ─────────────────────────────────────────────
router.get("/:id/students", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const { data: supaMembers, error } = await getChatSb()
            .from('classroom_memberships')
            .select('*')
            .eq('classroom_id', req.params.id)
            .eq('status', "approved")
            .order('joined_at', { ascending: true });

        if (error) throw error;

        // Populate student names from Mongo
        const User = (await import("../models/User.js")).default;
        const studentIds = supaMembers.map(m => m.student_id);
        const studentsData = await User.find({ 
            _id: { $in: studentIds },
            isSandbox: { $ne: true }
        }).select("name email profilePicture role prn isSandbox").lean();
        
        const studentMap = studentsData.reduce((acc, s) => ({ ...acc, [s._id.toString()]: s }), {});

        const students = supaMembers
            .map(m => {
                const s = studentMap[m.student_id];
                if (!s) return null;
                return {
                    _id: s._id,
                    name: s.name || 'Unknown',
                    email: s.email || '',
                    profilePicture: s.profilePicture || '',
                    role: s.role || 'student',
                    prn: s.prn || null,
                    joinedAt: m.joined_at || m.created_at
                };
            })
            .filter(Boolean);

        res.json({ students, total: students.length });
    } catch (err) {
        console.error("Get students error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// UPDATE CONTENT (Teacher / Owner only)
// ─────────────────────────────────────────────
router.put("/:id/content/:type/:contentId", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { type, contentId } = req.params;
        if (!["materials", "announcements", "quizzes"].includes(type)) {
            return res.status(400).json({ message: "Invalid content type" });
        }

        // Build update object from ONLY allowed fields
        // IMPORTANT: 'content' is NOT a real Supabase column for announcements — use 'message'
        const updates = {};
        const allowedFields = {
            materials: ["title", "file_url"],
            announcements: ["message"],
            quizzes: ["title", "link"]
        };

        (allowedFields[type] || []).forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        // SAFETY: If frontend accidentally sends 'content' for announcements,
        // map it to 'message' (the real Supabase column) and never send 'content'
        if (type === "announcements" && req.body.content && !updates.message) {
            updates.message = req.body.content;
        }
        // Never allow 'content' to reach Supabase
        delete updates.content;

        console.log(`[UPDATE ${type}] ID=${contentId}, fields=`, JSON.stringify(updates));

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No valid fields to update" });
        }

        const { data, error } = await classroomClient
            .from(type)
            .update(updates)
            .eq("id", contentId)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: "Content updated", item: data });
    } catch (err) {
        console.error(`Update ${req.params.type} error:`, err);
        res.status(500).json({ message: "Server error updating content" });
    }
});

// ─────────────────────────────────────────────
// REPLACE MATERIAL FILE (Teacher / Owner only)
// ─────────────────────────────────────────────
router.put("/:id/content/materials/:contentId/replace", isAuthenticated, requireClassroomOwner, upload.single("file"), async (req, res) => {
    try {
        const { id, contentId } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No file provided" });
        }

        const classroom = await Classroom.findById(id);
        if (!classroom) return res.status(404).json({ message: "Classroom not found" });

        const slug = classroom.subjectSlug || "general";
        
        const path = `${slug}/${Date.now()}_${Math.floor(Math.random() * 1000)}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        // Import the clients we need
        const { studentNotesClient, classroomClient } = await import("../config/supabaseClient.js");
        
        const { uploadBufferToR2 } = await import("../config/r2Client.js");
        const publicUrl = await uploadBufferToR2(file.buffer, file.originalname, file.mimetype, path);

        const fileExt = file.originalname.split('.').pop() || 'unknown';

        const { data, error } = await classroomClient
            .from("materials")
            .update({ 
                file_url: publicUrl,
                type: fileExt
            })
            .eq("id", contentId)
            .eq("classroom_id", id)
            .select()
            .single();

        if (error) throw error;
        
        // Clear old summary cache since the file changed completely
        await classroomClient.from("material_summaries").delete().eq("material_id", contentId);

        res.json({ message: "Material file replaced successfully", item: data });
    } catch (err) {
        console.error("Replace material error:", err);
        res.status(500).json({ message: "Server error replacing material file" });
    }
});

// ─────────────────────────────────────────────
// DELETE CONTENT (Teacher / Owner only)
// ─────────────────────────────────────────────
router.delete("/:id/content/:type/:contentId", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { type, contentId } = req.params;
        if (!["materials", "announcements", "quizzes"].includes(type)) {
            return res.status(400).json({ message: "Invalid content type" });
        }

        const { error } = await classroomClient
            .from(type)
            .delete()
            .eq("id", contentId);

        if (error) throw error;

        res.json({ message: "Content deleted successfully" });
    } catch (err) {
        console.error(`Delete ${req.params.type} error:`, err);
        res.status(500).json({ message: "Server error deleting content" });
    }
});

// ─────────────────────────────────────────────
// SUMMARIZE PDF MATERIAL
// ─────────────────────────────────────────────
router.post("/:id/content/materials/:contentId/summarize", isAuthenticated, async (req, res) => {
    try {
        const { id, contentId } = req.params;

        // ── 1. Check Cache First ──
        const { data: cached } = await getChatSb()
            .from("material_summaries")
            .select("summary")
            .eq("material_id", contentId)
            .single();

        if (cached && cached.summary) {
            return res.json({ summary: cached.summary, cached: true });
        }

        // ── 2. Fetch material ──
        const { data: material, error } = await getChatSb()
            .from("materials")
            .select("*")
            .eq("id", contentId)
            .eq("classroom_id", id)
            .single();

        if (error || !material) {
            return res.status(404).json({ message: "Material not found" });
        }

        if (!material.type?.toLowerCase().includes("pdf")) {
            return res.status(400).json({ message: "Currently, only PDF files can be summarized." });
        }

        // ── 3. Fetch PDF and extract text ──
        const pdfRes = await fetch(material.file_url);
        if (!pdfRes.ok) throw new Error("Failed to fetch PDF from storage");
        const arrayBuffer = await pdfRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const pdfData = await pdfParse(buffer);
        const text = pdfData.text;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: "Could not extract text from this PDF. It might contain only images." });
        }

        // ── 4. Generate Summary with Groq ──
        const prompt = `You are an AI teaching assistant.
Summarize the following academic material clearly and concisely. Outline the main topics, key concepts, and important takeaways. Keep the summary structured and easy to read.
        
Material Title: ${material.title || "Untitled"}
Content: ${text.substring(0, 10000)}
`;

        const response = await groq.chat.completions.create({
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1000,
        });

        const summaryText = response.choices?.[0]?.message?.content || "Could not generate summary.";

        // ── 5. Cache the summary ──
        try {
            await getChatSb()
                .from("material_summaries")
                .upsert({
                    material_id: contentId,
                    classroom_id: id,
                    summary: summaryText,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: "material_id" });
        } catch (cacheErr) {
            console.warn("[Summarize] Cache saving failed:", cacheErr.message);
        }

        res.json({ summary: summaryText, cached: false });
    } catch (err) {
        console.error("Summarize error:", err);
        res.status(500).json({ message: "Server error summarizing material" });
    }
});
// ─────────────────────────────────────────────
// GET ACADEMIC STATUS
// ─────────────────────────────────────────────
router.get("/academic-status/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const User = (await import("../models/User.js")).default;
        const user = await User.findById(userId).select("role department branch batch").lean();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        let primaryText = user.department || user.branch || "Academic Status";
        let secondaryText = user.role === "student" ? (user.batch || "Student") : (user.role || "Member");

        // Format role to title case
        if (secondaryText) {
            secondaryText = secondaryText.charAt(0).toUpperCase() + secondaryText.slice(1).replace('_', ' ');
        }

        res.json({
            status: {
                primaryText: primaryText,
                secondaryText: secondaryText
            }
        });
    } catch (err) {
        console.error("Get academic status error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
