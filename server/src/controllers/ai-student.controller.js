// Student prices (owner, 2026-11-15, like GitHub's student benefits): a student applies in Settings > Billing.
//   1. They pick their school from the school list, or type its name and give its details when it is not listed.
//   2. When the school gives students an email (a listed school's domains, or the one the student gave), that school
//      email must be confirmed on their account first (Settings > Account > Emails, or right in the application).
//   3. They upload a document that shows they study there (student ID card, fee receipt, bonafide certificate).
//   4. A super admin reviews it within 2 days (Super admin > Student applications) and approves or rejects it; the
//      student gets an email either way. Approved = student prices on Pro and Max for student_verification_months.
// The document is kept privately (never a public link: only the super admin's page streams it) and deleted 30 days
// after the decision (workers/student-proof-cleanup.worker.js).
//   GET  /api/ai/student                  the user's state, latest application and emails
//   GET  /api/ai/student/schools?q=       the school picker (two characters at least)
//   POST /api/ai/student/apply            multipart: document + fields (see applyStudent)
// Super admin (routes/super-admin/student.routes.js): applications, decisions, documents, the school list, and
// confirming or removing a student by hand (adminSetStudent).
import crypto from "crypto";
import path from "path";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import User from "../models/User.js";
import School from "../models/School.js";
import StudentApplication from "../models/StudentApplication.js";
import { enqueueEmail } from "../services/email-queue.service.js";
import { baseTemplate } from "../services/email-templates.service.js";
import { r2Client, uploadPrivateBufferToR2 } from "../config/r2Client.js";
import { studentSettings, cleanDomain, emailInDomain, searchSchools, isFreeMailDomain } from "../services/student-school.service.js";
import { confirmedEmails, cleanEmail } from "../utils/account-email.js";
import { accountEmailsOf } from "./account-emails.controller.js";

const R2_BUCKET = process.env.R2_BUCKET_NAME || "classgrid-storage";
const REVIEW_DAYS = 2;
const KEEP_DOCUMENT_DAYS = 30;
const APPLICATIONS_PER_MONTH = 3;
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;
const PROOF_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
export const SCHOOL_KINDS = ["University", "College", "School", "Coaching or training institute", "Other"];
export const SCHOOL_SIZES = ["Under 500", "500 to 2,000", "2,000 to 10,000", "Over 10,000"];

const safe = (v) => String(v ?? "").replace(/[<>&]/g, "");
const text = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const fmtDay = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const chatUrl = () => String(process.env.CHAT_APP_URL || "https://chat.classgrid.in").replace(/\/$/, "");
const billingUrl = () => `${chatUrl()}/agent/settings?section=billing`;
const pricingUrl = () => String(process.env.PRICING_PAGE_URL || "https://classgrid.in/pricing");

/** Whether the file's first bytes are really the type it says (a JPEG, PNG, WebP or PDF) */
function bytesMatch(buf, mime) {
    if (!buf || buf.length < 12) return false;
    if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (mime === "image/png") return buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mime === "image/webp") return buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP";
    if (mime === "application/pdf") return buf.slice(0, 5).toString("ascii") === "%PDF-";
    return false;
}

function verifiedState(sv) {
    const now = Date.now();
    const verified = !!sv?.verified_at && !(sv.expires_at && new Date(sv.expires_at).getTime() < now);
    return {
        verified,
        email: verified ? sv.email || null : null,
        method: verified ? sv.method || "email" : null,
        verified_at: verified ? sv.verified_at : null,
        expires_at: verified ? sv.expires_at || null : null,
        expired: !!sv?.verified_at && !verified,
    };
}

const applicationSummary = (a) => (a ? {
    id: String(a._id),
    status: a.status,
    school: a.school?.name || "",
    school_email: a.school_email || null,
    submitted_at: a.submitted_at,
    decided_at: a.decided_at || null,
    reject_reason: a.status === "rejected" ? a.reject_reason || "" : "",
} : null);

export const getStudentStatus = async (req, res) => {
    try {
        const [user, latest, emails, { endings }] = await Promise.all([
            User.findById(req.user._id).select("student_verification").lean(),
            StudentApplication.findOne({ user_id: req.user._id }).sort({ submitted_at: -1 }).lean(),
            accountEmailsOf(req.user._id),
            studentSettings(),
        ]);
        res.json({ success: true, data: {
            ...verifiedState(user?.student_verification),
            application: applicationSummary(latest),
            emails,
            endings,
            review_days: REVIEW_DAYS,
            kinds: SCHOOL_KINDS,
            sizes: SCHOOL_SIZES,
            max_document_mb: PROOF_MAX_BYTES / (1024 * 1024),
        } });
    } catch (err) {
        console.error("[student] status", err);
        res.status(500).json({ success: false, error: "Couldn't read your student status." });
    }
};

export const findSchools = async (req, res) => {
    try {
        res.json({ success: true, data: await searchSchools(req.query.q) });
    } catch (err) {
        console.error("[student] schools", err);
        res.status(500).json({ success: false, error: "Couldn't search the schools." });
    }
};

/**
 * POST /api/ai/student/apply (multipart/form-data)
 *   document       the proof (JPG, PNG, WebP or PDF, up to 10 MB)
 *   school_id      a school from the list, or instead:
 *   school_name, school_website, school_email_domain (what the school gives students, like name@students.x.edu),
 *   school_kind, school_students, school_street, school_city, school_state, school_country
 *   school_email   the confirmed email of the account to apply with (required when the school gives students one)
 */
export const applyStudent = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select("name email account_emails student_verification").lean();
        if (!user) return res.status(404).json({ success: false, error: "Account not found." });
        if (verifiedState(user.student_verification).verified) {
            return res.status(409).json({ success: false, code: "already_student", error: "You're already confirmed as a student." });
        }
        const pending = await StudentApplication.exists({ user_id: userId, status: "pending" });
        if (pending) return res.status(409).json({ success: false, code: "application_pending", error: `Your application is being reviewed. We'll email you within ${REVIEW_DAYS} days.` });
        const recent = await StudentApplication.countDocuments({ user_id: userId, submitted_at: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
        if (recent >= APPLICATIONS_PER_MONTH) return res.status(429).json({ success: false, error: "You've sent 3 applications in the last 30 days. Try again later." });

        const b = req.body || {};
        // The school: from the list, or typed by the student with its details
        let school;
        let schoolId = null;
        if (b.school_id) {
            const row = await School.findById(String(b.school_id)).lean().catch(() => null);
            if (!row) return res.status(400).json({ success: false, error: "Pick your school again from the list." });
            schoolId = row._id;
            school = { name: row.name, listed: true, domains: row.domains || [], website: row.website || "", kind: row.kind || "", students: row.students || "", street: row.street || "", city: row.city || "", state: row.state || "", country: row.country || "" };
        } else {
            const name = text(b.school_name, 160);
            if (name.length < 3) return res.status(400).json({ success: false, error: "Enter your school's full name." });
            const kind = SCHOOL_KINDS.includes(b.school_kind) ? b.school_kind : "";
            const students = SCHOOL_SIZES.includes(b.school_students) ? b.school_students : "";
            const city = text(b.school_city, 80);
            const country = text(b.school_country, 80);
            if (!kind || !students || !city || !country) return res.status(400).json({ success: false, error: "Fill in what kind of school it is, how many students it has, its city and its country." });
            const domainGiven = text(b.school_email_domain, 200);
            const domain = domainGiven ? cleanDomain(domainGiven) : "";
            if (domainGiven && !domain) return res.status(400).json({ success: false, error: "Enter the school email the way your school gives it, for example name@students.yourschool.edu." });
            if (domain && isFreeMailDomain(domain)) return res.status(400).json({ success: false, error: "Enter the email your school gives students, not a personal one like Gmail. Leave it empty if your school gives none." });
            // A school that is on the list (by its name, or by the email domain given) is picked from the list, so its
            // students apply with its school email
            const listed = await School.findOne({ $or: [{ name_lower: name.toLowerCase() }, ...(domain ? [{ domains: domain }] : [])] }).select("name").lean();
            if (listed) return res.status(400).json({ success: false, code: "school_listed", error: `${listed.name} is on our school list. Go back and pick it from the list.` });
            school = { name, listed: false, domains: domain ? [domain] : [], website: text(b.school_website, 200), kind, students, street: text(b.school_street, 160), city, state: text(b.school_state, 80), country };
        }

        // The school email: required when the school gives students one, and it must be confirmed on this account
        const own = confirmedEmails(user);
        let schoolEmail = cleanEmail(b.school_email) || null;
        if (school.domains.length) {
            if (!schoolEmail) return res.status(400).json({ success: false, code: "school_email_needed", error: `Add and confirm your school email (ending in ${school.domains.join(" or ")}) first.` });
            if (!school.domains.some((d) => emailInDomain(schoolEmail, d))) return res.status(400).json({ success: false, code: "school_email_needed", error: `Students of ${school.name} apply with a school email ending in ${school.domains.join(" or ")}.` });
        }
        if (schoolEmail && !own.includes(schoolEmail)) return res.status(400).json({ success: false, code: "school_email_needed", error: "Confirm this school email on your account first." });
        if (schoolEmail) {
            const taken = await User.findOne({ _id: { $ne: userId }, "student_verification.email": schoolEmail, "student_verification.verified_at": { $ne: null } }).select("_id").lean();
            if (taken) return res.status(409).json({ success: false, error: "This school email already confirmed another Classgrid account." });
        }

        // The proof document
        const file = req.file;
        if (!file?.buffer?.length) return res.status(400).json({ success: false, code: "document_needed", error: "Upload a document that shows you study there." });
        const mime = String(file.mimetype || "").toLowerCase();
        if (!PROOF_TYPES[mime] || !bytesMatch(file.buffer, mime)) return res.status(400).json({ success: false, error: "Upload a JPG, PNG, WebP or PDF file." });
        if (file.buffer.length > PROOF_MAX_BYTES) return res.status(413).json({ success: false, error: "The file is over 10 MB. Upload a smaller one." });
        const key = `private/student-proofs/${userId}/${crypto.randomUUID()}${PROOF_TYPES[mime]}`;
        await uploadPrivateBufferToR2(file.buffer, key, mime);

        let app;
        try {
            app = await StudentApplication.create({
                user_id: userId, user_email: user.email, user_name: user.name || "",
                status: "pending", school_id: schoolId, school, school_email: schoolEmail,
                document: { key, name: text(path.basename(String(file.originalname || "document")), 200), mime, size: file.buffer.length },
                submitted_at: new Date(),
            });
        } catch (e) {
            // Sent twice at once: the database keeps one pending application per student; this upload goes
            r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })).catch(() => {});
            if (e?.code === 11000) return res.status(409).json({ success: false, code: "application_pending", error: `Your application is being reviewed. We'll email you within ${REVIEW_DAYS} days.` });
            throw e;
        }

        const name = safe(user.name || "there");
        enqueueEmail({
            to: user.email, type: "other", userId,
            subject: "We got your Classgrid student application",
            html: baseTemplate({
                title: "We got your student application",
                content: `
                    <h2 style="margin:0 0 12px">We got your student application</h2>
                    <p>Hi ${name}, thanks for applying for student prices for ${safe(school.name)}.</p>
                    <p>We review every application by hand, within ${REVIEW_DAYS} days, and email you the answer.</p>
                    <p style="color:#666;font-size:13px">See its status in <a href="${billingUrl()}">Settings &rsaquo; Billing</a>.</p>`,
            }),
        }).catch((e) => console.error("[student] submitted email", e.message));
        const admin = String(process.env.SUPER_ADMIN_EMAIL || "support@classgrid.in").trim();
        enqueueEmail({
            to: admin, type: "other",
            subject: `New student application: ${text(user.name || user.email, 80)} (${text(school.name, 80)})`,
            html: baseTemplate({
                title: "New student application",
                content: `<p>${name} (${safe(user.email)}) applied for student prices for <strong>${safe(school.name)}</strong>${school.listed ? "" : " (not on the school list)"}.</p><p>Review it in the super admin under Student applications.</p>`,
            }),
        }).catch((e) => console.error("[student] admin email", e.message));

        res.json({ success: true, data: applicationSummary(app.toObject()) });
    } catch (err) {
        console.error("[student] apply", err);
        res.status(500).json({ success: false, error: "Couldn't send your application. Please try again." });
    }
};

// ─── Super admin ─────────────────────────────────────────────

const adminRow = (a) => ({
    id: String(a._id),
    status: a.status,
    user: { id: String(a.user_id), name: a.user_name || "", email: a.user_email || "" },
    school_id: a.school_id ? String(a.school_id) : null,
    school: a.school || {},
    school_email: a.school_email || null,
    document: { name: a.document?.name || "", mime: a.document?.mime || "", size: a.document?.size || 0, deleted: !!a.document_deleted_at },
    submitted_at: a.submitted_at,
    decided_at: a.decided_at || null,
    decided_by_email: a.decided_by_email || "",
    reject_reason: a.reject_reason || "",
    added_school_id: a.added_school_id ? String(a.added_school_id) : null,
});

export const adminListApplications = async (req, res) => {
    try {
        const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : "pending";
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 20;
        const [rows, total, counts] = await Promise.all([
            StudentApplication.find({ status }).sort({ submitted_at: status === "pending" ? 1 : -1 }).skip((page - 1) * limit).limit(limit).lean(),
            StudentApplication.countDocuments({ status }),
            StudentApplication.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
        ]);
        res.json({ success: true, data: {
            rows: rows.map(adminRow), total, page, pages: Math.max(1, Math.ceil(total / limit)),
            counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
        } });
    } catch (err) {
        console.error("[student] admin list", err);
        res.status(500).json({ success: false, error: "Couldn't load the applications." });
    }
};

/** The proof document, streamed to the super admin's page (never a public link) */
export const adminGetDocument = async (req, res) => {
    try {
        const a = await StudentApplication.findById(req.params.id).select("document document_deleted_at").lean().catch(() => null);
        if (!a?.document?.key) return res.status(404).json({ success: false, error: "Application not found." });
        if (a.document_deleted_at) return res.status(410).json({ success: false, error: "This document was deleted 30 days after the decision." });
        const obj = await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: a.document.key }));
        res.setHeader("Content-Type", a.document.mime || "application/octet-stream");
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        obj.Body.pipe(res);
    } catch (err) {
        console.error("[student] admin document", err);
        if (!res.headersSent) res.status(500).json({ success: false, error: "Couldn't load the document." });
    }
};

/** POST { approve: true, add_school?: bool, school_domains?: string[] } or { approve: false, reason } */
export const adminDecide = async (req, res) => {
    try {
        const approve = req.body?.approve === true;
        const reason = text(req.body?.reason, 600);
        if (!approve && reason.length < 5) return res.status(400).json({ success: false, error: "Write why it is not approved: the student sees this in the email." });
        const current = await StudentApplication.findById(req.params.id).lean().catch(() => null);
        if (!current) return res.status(404).json({ success: false, error: "Application not found." });
        if (current.status !== "pending") return res.status(409).json({ success: false, error: "This application was already decided." });

        if (approve && current.school_email) {
            const taken = await User.findOne({ _id: { $ne: current.user_id }, "student_verification.email": current.school_email, "student_verification.verified_at": { $ne: null } }).select("_id").lean();
            if (taken) return res.status(409).json({ success: false, error: "This student email already confirmed another Classgrid account." });
            const applicant = await User.findById(current.user_id).select("email account_emails").lean();
            if (!applicant) return res.status(404).json({ success: false, error: "The student's account no longer exists." });
            if (!confirmedEmails(applicant).includes(current.school_email)) return res.status(409).json({ success: false, error: "They removed this student email from their account. Reject it so they can apply again." });
        }
        const now = new Date();
        // Claimed in one step: two super admins deciding at once decide it once
        const a = await StudentApplication.findOneAndUpdate(
            { _id: current._id, status: "pending" },
            { $set: {
                status: approve ? "approved" : "rejected", decided_at: now, decided_by: req.user._id, decided_by_email: req.user.email || "",
                reject_reason: approve ? "" : reason, document_delete_after: new Date(now.getTime() + KEEP_DOCUMENT_DAYS * 24 * 60 * 60 * 1000),
            } },
            { returnDocument: "after" }
        ).lean();
        if (!a) return res.status(409).json({ success: false, error: "This application was already decided." });

        const user = await User.findById(a.user_id).select("name email").lean();
        let expires = null;
        if (approve) {
            const { months } = await studentSettings();
            expires = new Date(now); expires.setMonth(expires.getMonth() + months);
            try {
                await User.updateOne({ _id: a.user_id }, { $set: {
                    "student_verification.email": a.school_email || null,
                    "student_verification.verified_at": now,
                    "student_verification.expires_at": expires,
                    "student_verification.method": "review",
                    "student_verification.application_id": a._id,
                } });
            } catch (e) {
                // Not saved on the account: the application goes back to the list, to be approved again
                await StudentApplication.updateOne({ _id: a._id }, { $set: { status: "pending", decided_at: null, decided_by: null, decided_by_email: "", document_delete_after: null } }).catch(() => {});
                throw e;
            }
            // A school the student typed in can join the list, with the email domains its students use
            if (!a.school?.listed && req.body?.add_school === true) {
                const domains = [...new Set((Array.isArray(req.body.school_domains) ? req.body.school_domains : a.school?.domains || []).map(cleanDomain).filter((d) => d && !isFreeMailDomain(d)))].slice(0, 10);
                const s = await School.create({
                    name: a.school.name, domains, website: a.school.website || "", kind: a.school.kind || "", students: a.school.students || "",
                    street: a.school.street || "", city: a.school.city || "", state: a.school.state || "", country: a.school.country || "",
                    from_application: a._id, created_by: req.user._id,
                });
                await StudentApplication.updateOne({ _id: a._id }, { $set: { added_school_id: s._id } });
            }
        }

        if (user?.email) {
            const name = safe(user.name || "there");
            const html = approve
                ? baseTemplate({
                    title: "You're confirmed as a student",
                    content: `
                        <h2 style="margin:0 0 12px">You're confirmed as a student</h2>
                        <p>Hi ${name}, your student application for ${safe(a.school?.name)} is approved.</p>
                        <p>You can buy Pro and Max at the student price until <strong>${fmtDay(expires)}</strong>.</p>
                        <p><a href="${pricingUrl()}?student=1" style="display:inline-block;padding:10px 20px;background:#111111;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">See student prices</a></p>`,
                })
                : baseTemplate({
                    title: "Your student application was not approved",
                    content: `
                        <h2 style="margin:0 0 12px">Your student application was not approved</h2>
                        <p>Hi ${name}, we could not approve your student application for ${safe(a.school?.name)}.</p>
                        <p><strong>Why:</strong> ${safe(reason)}</p>
                        <p>You can apply again with a clearer or newer document in <a href="${billingUrl()}">Settings &rsaquo; Billing</a>.</p>`,
                });
            enqueueEmail({
                to: user.email, type: "other", userId: a.user_id, html,
                subject: approve ? "You're confirmed as a Classgrid student" : "Your Classgrid student application was not approved",
            }).catch((e) => console.error("[student] decision email", e.message));
        }
        res.json({ success: true, data: adminRow(await StudentApplication.findById(a._id).lean()) });
    } catch (err) {
        console.error("[student] admin decide", err);
        res.status(500).json({ success: false, error: "Couldn't save the decision." });
    }
};

/**
 * Deletes the documents whose 30 days after the decision are over. Each is claimed for 10 minutes in one step (so
 * several server copies never delete one twice), and counts as deleted only once R2 has deleted it; a failed delete
 * is tried again on a later run.
 */
export async function deleteOldProofs(limit = 100) {
    for (let i = 0; i < limit; i++) {
        const now = new Date();
        const a = await StudentApplication.findOneAndUpdate(
            { document_delete_after: { $lte: now }, document_deleted_at: null, "document.key": { $ne: "" },
              $or: [{ document_delete_claimed_until: null }, { document_delete_claimed_until: { $lt: now } }] },
            { $set: { document_delete_claimed_until: new Date(now.getTime() + 10 * 60 * 1000) } },
            { projection: { document: 1 } }
        ).lean();
        if (!a) return;
        try {
            await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: a.document.key }));
            await StudentApplication.updateOne({ _id: a._id }, { $set: { document_deleted_at: new Date() } });
        } catch (e) {
            console.error("[student] delete proof", e.message);
        }
    }
}

// The school list
const schoolRow = (s) => ({
    id: String(s._id), name: s.name, domains: s.domains || [], website: s.website || "", kind: s.kind || "", students: s.students || "",
    street: s.street || "", city: s.city || "", state: s.state || "", country: s.country || "",
    from_application: s.from_application ? String(s.from_application) : null, created_at: s.createdAt,
});

const schoolFields = (b) => ({
    name: text(b?.name, 160),
    domains: [...new Set((Array.isArray(b?.domains) ? b.domains : String(b?.domains || "").split(/[,\s]+/)).map(cleanDomain).filter((d) => d && !isFreeMailDomain(d)))].slice(0, 10),
    website: text(b?.website, 200), kind: text(b?.kind, 60), students: text(b?.students, 60),
    street: text(b?.street, 160), city: text(b?.city, 80), state: text(b?.state, 80), country: text(b?.country, 80),
});

export const adminListSchools = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim().toLowerCase().slice(0, 100);
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 30;
        const filter = q ? { $or: [{ name_lower: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } }, { domains: q }] } : {};
        const [rows, total] = await Promise.all([
            School.find(filter).sort({ name_lower: 1 }).skip((page - 1) * limit).limit(limit).lean(),
            School.countDocuments(filter),
        ]);
        res.json({ success: true, data: { rows: rows.map(schoolRow), total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
    } catch (err) {
        console.error("[student] admin schools", err);
        res.status(500).json({ success: false, error: "Couldn't load the list of places of study." });
    }
};

export const adminSaveSchool = async (req, res) => {
    try {
        const f = schoolFields(req.body);
        if (f.name.length < 3) return res.status(400).json({ success: false, error: "Enter its full name (3 characters at least)." });
        let s;
        if (req.params.id) {
            s = await School.findById(req.params.id).catch(() => null);
            if (!s) return res.status(404).json({ success: false, error: "It is no longer on the list." });
            Object.assign(s, f);
            await s.save();
        } else {
            s = await School.create({ ...f, created_by: req.user._id });
        }
        res.json({ success: true, data: schoolRow(s.toObject()) });
    } catch (err) {
        console.error("[student] admin save school", err);
        res.status(500).json({ success: false, error: "Couldn't save it." });
    }
};

export const adminDeleteSchool = async (req, res) => {
    try {
        const r = await School.deleteOne({ _id: req.params.id }).catch(() => ({ deletedCount: 0 }));
        if (!r.deletedCount) return res.status(404).json({ success: false, error: "It is no longer on the list." });
        res.json({ success: true });
    } catch (err) {
        console.error("[student] admin delete school", err);
        res.status(500).json({ success: false, error: "Couldn't take it off the list." });
    }
};

/** Super admin: confirm a student by hand, or remove a verification */
export const adminSetStudent = async (req, res) => {
    try {
        const { months } = await studentSettings();
        const target = await User.findById(req.params.userId).select("_id student_verification").lean();
        if (!target) return res.status(404).json({ success: false, error: "User not found" });
        if (req.body?.verified === true) {
            const now = new Date();
            const expires = new Date(now); expires.setMonth(expires.getMonth() + months);
            await User.updateOne({ _id: target._id }, { $set: {
                "student_verification.verified_at": now, "student_verification.expires_at": expires, "student_verification.method": "admin",
                "student_verification.email": target.student_verification?.email || null,
            } });
        } else {
            await User.updateOne({ _id: target._id }, { $unset: { "student_verification.verified_at": "", "student_verification.expires_at": "", "student_verification.method": "", "student_verification.email": "", "student_verification.application_id": "" } });
        }
        const fresh = await User.findById(target._id).select("student_verification").lean();
        res.json({ success: true, data: verifiedState(fresh?.student_verification) });
    } catch (err) {
        console.error("[student] admin set", err);
        res.status(500).json({ success: false, error: "Couldn't change the student verification." });
    }
};
