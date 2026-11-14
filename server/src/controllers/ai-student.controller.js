// Student prices (owner, 2026-11-14): a user confirms a school or university email with a 6-digit code, and can then
// buy Pro or Max at the student price (buyPlan checks it). The email endings that count and how long a verification
// lasts are set by the super admin (GlobalAiConfig: student_email_domains, student_verification_months).
//   GET  /api/ai/student          the user's state
//   POST /api/ai/student/start    { email }  sends the code (at most one a minute, five a day)
//   POST /api/ai/student/confirm  { code }   confirms it (five tries per code, the code lasts 15 minutes)
import crypto from "crypto";
import User from "../models/User.js";
import GlobalAiConfig, { STUDENT_EMAIL_DOMAINS_DEFAULT } from "../models/GlobalAiConfig.js";
import { enqueueEmail } from "../services/email-queue.service.js";
import { baseTemplate } from "../services/email-templates.service.js";
import { dayKey } from "../services/plan-usage.service.js";

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const CODES_PER_DAY = 5;
const MAX_TRIES = 5;

const hashCode = (userId, code) => crypto.createHash("sha256").update(`${userId}:${code}`).digest("hex");
const cleanEmail = (v) => String(v || "").trim().toLowerCase();
const looksLikeEmail = (v) => /^[^\s@]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v) && v.length <= 254;

async function settings() {
    const cfg = await GlobalAiConfig.findOne({ key: "singleton" }).select("student_email_domains student_verification_months").lean().catch(() => null);
    const domains = Array.isArray(cfg?.student_email_domains) && cfg.student_email_domains.length ? cfg.student_email_domains : STUDENT_EMAIL_DOMAINS_DEFAULT;
    const months = Number(cfg?.student_verification_months) > 0 ? Number(cfg.student_verification_months) : 12;
    return { domains: domains.map((d) => String(d).toLowerCase()), months };
}

const isSchoolEmail = (email, domains) => {
    const host = email.split("@")[1] || "";
    return domains.some((d) => (d.startsWith(".") ? host.endsWith(d) : host === d || host.endsWith(`.${d}`)));
};

function stateOf(sv) {
    const now = Date.now();
    const verified = !!sv?.verified_at && !(sv.expires_at && new Date(sv.expires_at).getTime() < now);
    return {
        verified,
        email: verified ? sv.email || null : null,
        method: verified ? sv.method || "email" : null,
        verified_at: verified ? sv.verified_at : null,
        expires_at: verified ? sv.expires_at || null : null,
        expired: !!sv?.verified_at && !verified,
        pending_email: !verified && sv?.pending_email && sv?.code_expires_at && new Date(sv.code_expires_at).getTime() > now ? sv.pending_email : null,
    };
}

export const getStudentStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("student_verification").lean();
        const { domains } = await settings();
        res.json({ success: true, data: { ...stateOf(user?.student_verification), domains } });
    } catch (err) {
        console.error("[student] status", err);
        res.status(500).json({ success: false, error: "Couldn't read your student verification." });
    }
};

export const startStudentVerification = async (req, res) => {
    try {
        const email = cleanEmail(req.body?.email);
        if (!looksLikeEmail(email)) return res.status(400).json({ success: false, error: "Enter your full school or university email." });
        const { domains } = await settings();
        if (!isSchoolEmail(email, domains)) {
            return res.status(400).json({ success: false, code: "not_school_email", error: "This email is not from a school or university we know. Use your school email, for example one ending in .edu, .ac.in or .edu.in." });
        }
        // The same school email can confirm one Classgrid account only
        const taken = await User.findOne({ _id: { $ne: req.user._id }, "student_verification.email": email, "student_verification.verified_at": { $ne: null } }).select("_id").lean();
        if (taken) return res.status(409).json({ success: false, error: "This school email already confirmed another Classgrid account." });

        const now = Date.now();
        const today = dayKey();
        // Claimed in one step (several requests at once get one code): not within a minute of the last code, and under
        // five codes today
        const before = await User.findOneAndUpdate(
            { _id: req.user._id, $and: [
                { $or: [{ "student_verification.code_sent_at": null }, { "student_verification.code_sent_at": { $lt: new Date(now - RESEND_MS) } }] },
                { $or: [{ "student_verification.codes_day": { $ne: today } }, { "student_verification.codes_today": { $lt: CODES_PER_DAY } }] },
            ] },
            { $set: { "student_verification.code_sent_at": new Date(now) } },
            { projection: { student_verification: 1, name: 1 }, returnDocument: "before" }
        ).lean();
        if (!before) {
            const cur = await User.findById(req.user._id).select("student_verification").lean();
            const s = cur?.student_verification || {};
            const tooSoon = s.code_sent_at && now - new Date(s.code_sent_at).getTime() < RESEND_MS;
            return res.status(429).json({ success: false, error: tooSoon ? "A code was just sent. Wait a minute before asking for a new one." : "Too many codes today. Try again tomorrow." });
        }
        const user = before;
        const sv = user?.student_verification || {};
        const sentToday = sv.codes_day === today ? Number(sv.codes_today) || 0 : 0;

        const code = String(crypto.randomInt(100000, 1000000));
        await User.updateOne({ _id: req.user._id }, { $set: {
            "student_verification.pending_email": email,
            "student_verification.code_hash": hashCode(req.user._id, code),
            "student_verification.code_expires_at": new Date(now + CODE_TTL_MS),
            "student_verification.code_attempts": 0,
            "student_verification.code_sent_at": new Date(now),
            "student_verification.codes_day": today,
            "student_verification.codes_today": sentToday + 1,
        } });
        const name = String(user?.name || "there").replace(/[<>&]/g, "");
        const html = baseTemplate({
            title: "Your Classgrid student code",
            content: `
                <h2 style="margin:0 0 12px">Confirm your student email</h2>
                <p>Hi ${name}, enter this code in Classgrid (Settings &rsaquo; Billing) to get student prices:</p>
                <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
                <p style="color:#666;font-size:13px">The code works for 15 minutes. If you did not ask for it, you can ignore this email.</p>`,
        });
        await enqueueEmail({ to: email, subject: `${code} is your Classgrid student code`, html, type: "other", userId: req.user._id });
        res.json({ success: true, data: { pending_email: email, expires_in_minutes: 15 } });
    } catch (err) {
        console.error("[student] start", err);
        res.status(500).json({ success: false, error: "Couldn't send the code. Please try again." });
    }
};

export const confirmStudentVerification = async (req, res) => {
    try {
        const code = String(req.body?.code || "").replace(/\s+/g, "");
        if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, error: "Enter the 6-digit code from the email." });
        const user = await User.findById(req.user._id).select("student_verification").lean();
        const sv = user?.student_verification || {};
        if (!sv.code_hash || !sv.pending_email || !sv.code_expires_at || new Date(sv.code_expires_at).getTime() < Date.now()) {
            return res.status(400).json({ success: false, error: "This code has run out. Ask for a new one." });
        }
        // Each try is counted in one step before the code is compared, so tries sent all at once still stop at five
        const counted = await User.findOneAndUpdate(
            { _id: req.user._id, $or: [{ "student_verification.code_attempts": null }, { "student_verification.code_attempts": { $lt: MAX_TRIES } }] },
            { $inc: { "student_verification.code_attempts": 1 } },
            { projection: { _id: 1 } }
        );
        if (!counted) return res.status(429).json({ success: false, error: "Too many wrong tries. Ask for a new code." });
        const ok = crypto.timingSafeEqual(Buffer.from(hashCode(req.user._id, code)), Buffer.from(String(sv.code_hash)));
        if (!ok) return res.status(400).json({ success: false, error: "That code is not right. Check the email and try again." });
        // The same school email confirms one account only (checked again: two accounts may have asked at once)
        const taken = await User.findOne({ _id: { $ne: req.user._id }, "student_verification.email": sv.pending_email, "student_verification.verified_at": { $ne: null } }).select("_id").lean();
        if (taken) return res.status(409).json({ success: false, error: "This school email already confirmed another Classgrid account." });
        const { months } = await settings();
        const now = new Date();
        const expires = new Date(now); expires.setMonth(expires.getMonth() + months);
        await User.updateOne({ _id: req.user._id }, {
            $set: { "student_verification.email": sv.pending_email, "student_verification.verified_at": now, "student_verification.expires_at": expires, "student_verification.method": "email" },
            $unset: { "student_verification.pending_email": "", "student_verification.code_hash": "", "student_verification.code_expires_at": "", "student_verification.code_attempts": "" },
        });
        const fresh = await User.findById(req.user._id).select("student_verification").lean();
        res.json({ success: true, data: stateOf(fresh?.student_verification) });
    } catch (err) {
        console.error("[student] confirm", err);
        res.status(500).json({ success: false, error: "Couldn't confirm the code. Please try again." });
    }
};

/** Super admin: confirm a student by hand (no school email), or remove a verification */
export const adminSetStudent = async (req, res) => {
    try {
        const { months } = await settings();
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
            await User.updateOne({ _id: target._id }, { $unset: { "student_verification.verified_at": "", "student_verification.expires_at": "", "student_verification.method": "", "student_verification.email": "" } });
        }
        const fresh = await User.findById(target._id).select("student_verification").lean();
        res.json({ success: true, data: stateOf(fresh?.student_verification) });
    } catch (err) {
        console.error("[student] admin set", err);
        res.status(500).json({ success: false, error: "Couldn't change the student verification." });
    }
};
