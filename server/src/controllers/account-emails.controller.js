// Settings > Account > Emails (owner, 2026-11-15, like GitHub's): an account can add up to two emails besides its
// main one (three in all), each confirmed with a 6-digit code sent to it. Signing in works with any confirmed email
// and the same password; usage and limits stay those of the one account. At most one school email per account. An
// email that already belongs to another Classgrid account (its main or an added one) cannot be added.
//   GET    /api/user/emails              the account's emails
//   POST   /api/user/emails              { email }  sends the code (at most one a minute, five a day)
//   POST   /api/user/emails/confirm      { code }   adds the email (five tries per code, the code lasts 10 minutes)
//   DELETE /api/user/emails/:email       removes an added email
import crypto from "crypto";
import User from "../models/User.js";
import { enqueueEmail } from "../services/email-queue.service.js";
import { baseTemplate } from "../services/email-templates.service.js";
import { dayKey } from "../services/plan-usage.service.js";
import { isSchoolEmail } from "../services/student-school.service.js";
import { MAX_ACCOUNT_EMAILS, cleanEmail, looksLikeEmail, emailOwnerQuery } from "../utils/account-email.js";
import { CODE_TTL_MINUTES, CODE_TTL_MS } from "../utils/code-lifetime.js";

const RESEND_MS = 60 * 1000;
const CODES_PER_DAY = 5;
const MAX_TRIES = 5;
const EXTRA_MAX = MAX_ACCOUNT_EMAILS - 1;

// The test college's addresses (owner, 2026-11-26): "@classgridtest.ac.in" does not exist, so its code is always
// 123456 and no email is sent. Only this one test domain; every real address gets a real code.
const TEST_EMAIL_DOMAIN = "classgridtest.ac.in";
const TEST_EMAIL_CODE = "123456";
const isTestEmail = (email) => String(email || "").toLowerCase().endsWith(`@${TEST_EMAIL_DOMAIN}`);
const hashCode = (userId, email, code) => crypto.createHash("sha256").update(`${userId}:${email}:${code}`).digest("hex");

export async function accountEmailsOf(userId) {
    const u = await User.findById(userId).select("email account_emails account_email_pending").lean();
    if (!u) return null;
    const p = u.account_email_pending || {};
    const pending = p.email && p.code_expires_at && new Date(p.code_expires_at).getTime() > Date.now() ? p.email : null;
    return {
        primary: { email: u.email, school: await isSchoolEmail(u.email) },
        emails: await Promise.all((u.account_emails || []).filter((a) => a?.verified_at).map(async (a) => ({ email: a.email, verified_at: a.verified_at, school: await isSchoolEmail(a.email) }))),
        pending_email: pending,
        max: MAX_ACCOUNT_EMAILS,
    };
}

/**
 * Why `email` cannot be added to this account, or null. `others`: also whether another account has it, which is
 * only told once the code has proved the inbox is the user's (so nobody can use this to look up who has an account).
 */
async function cannotAdd(user, email, { others = false } = {}) {
    if (email === cleanEmail(user.email)) return { status: 409, error: "This is already your main email." };
    const added = (user.account_emails || []).filter((a) => a?.verified_at);
    if (added.some((a) => a.email === email)) return { status: 409, error: "This email is already on your account." };
    if (added.length >= EXTRA_MAX) return { status: 409, code: "emails_full", error: `An account can have up to ${MAX_ACCOUNT_EMAILS} emails. Remove one to add another.` };
    if (await isSchoolEmail(email)) {
        // (judged by today's school list: a school added to it later counts too)
        const flags = await Promise.all([user.email, ...added.map((a) => a.email)].map((e) => isSchoolEmail(e)));
        if (flags.some(Boolean)) return { status: 409, code: "school_email_taken", error: "Your account already has a school email. Remove it to add another one." };
    }
    if (others) {
        const owner = await User.findOne({ ...emailOwnerQuery(email), _id: { $ne: user._id } }).select("_id").lean();
        if (owner) return { status: 409, code: "email_in_use", error: "This email is already used by another Classgrid account." };
    }
    return null;
}

export const listAccountEmails = async (req, res) => {
    try {
        const data = await accountEmailsOf(req.user._id);
        if (!data) return res.status(404).json({ success: false, error: "Account not found." });
        res.json({ success: true, data });
    } catch (err) {
        console.error("[account emails] list", err);
        res.status(500).json({ success: false, error: "Couldn't load your emails." });
    }
};

export const addAccountEmail = async (req, res) => {
    try {
        const email = cleanEmail(req.body?.email);
        if (!looksLikeEmail(email)) return res.status(400).json({ success: false, error: "Enter a full email address." });
        const user = await User.findById(req.user._id).select("email name account_emails").lean();
        if (!user) return res.status(404).json({ success: false, error: "Account not found." });
        const no = await cannotAdd(user, email);
        if (no) return res.status(no.status).json({ success: false, code: no.code, error: no.error });

        const now = Date.now();
        const today = dayKey();
        // Claimed in one step (several requests at once send one code): a minute since the last code, under five today
        const before = await User.findOneAndUpdate(
            { _id: req.user._id, $and: [
                { $or: [{ "account_email_pending.code_sent_at": null }, { "account_email_pending.code_sent_at": { $lt: new Date(now - RESEND_MS) } }] },
                { $or: [{ "account_email_pending.codes_day": { $ne: today } }, { "account_email_pending.codes_today": { $lt: CODES_PER_DAY } }] },
            ] },
            { $set: { "account_email_pending.code_sent_at": new Date(now) } },
            { projection: { account_email_pending: 1 }, returnDocument: "before" }
        ).lean();
        if (!before) {
            const cur = await User.findById(req.user._id).select("account_email_pending").lean();
            const s = cur?.account_email_pending || {};
            const tooSoon = s.code_sent_at && now - new Date(s.code_sent_at).getTime() < RESEND_MS;
            return res.status(429).json({ success: false, error: tooSoon ? "A code was just sent. Wait a minute before asking for a new one." : "Too many codes today. Try again tomorrow." });
        }
        const p = before.account_email_pending || {};
        const sentToday = p.codes_day === today ? Number(p.codes_today) || 0 : 0;
        const code = isTestEmail(email) ? TEST_EMAIL_CODE : String(crypto.randomInt(100000, 1000000));
        await User.updateOne({ _id: req.user._id }, { $set: {
            "account_email_pending.email": email,
            "account_email_pending.code_hash": hashCode(req.user._id, email, code),
            "account_email_pending.code_expires_at": new Date(now + CODE_TTL_MS),
            "account_email_pending.code_attempts": 0,
            "account_email_pending.code_sent_at": new Date(now),
            "account_email_pending.codes_day": today,
            "account_email_pending.codes_today": sentToday + 1,
        } });
        // (the test college's address gets no email: its code is 123456)
        if (isTestEmail(email)) return res.json({ success: true, data: { pending_email: email, expires_in_minutes: CODE_TTL_MINUTES } });
        const name = String(user.name || "there").replace(/[<>&]/g, "");
        const html = baseTemplate({
            title: "Confirm your email for Classgrid",
            content: `
                <h2 style="margin:0 0 12px">Confirm this email for your Classgrid account</h2>
                <p>Hi ${name}, enter this code in Classgrid to add this email to your account:</p>
                <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
                <p>Once it is added, you can sign in with this email and your Classgrid password.</p>
                <p style="color:#666;font-size:13px">The code works for ${CODE_TTL_MINUTES} minutes. If you did not ask for it, you can ignore this email: nothing changes without the code.</p>`,
        });
        const text = `Hi ${name}, enter this code in Classgrid to add this email to your account: ${code}\n\n`
            + `Once it is added, you can sign in with this email and your Classgrid password.\n\n`
            + `The code works for ${CODE_TTL_MINUTES} minutes. If you did not ask for it, you can ignore this email: nothing changes without the code.`;
        await enqueueEmail({ to: email, subject: `${code} is your Classgrid email code`, html, text, type: "other", userId: req.user._id });
        res.json({ success: true, data: { pending_email: email, expires_in_minutes: CODE_TTL_MINUTES } });
    } catch (err) {
        console.error("[account emails] add", err);
        res.status(500).json({ success: false, error: "Couldn't send the code. Please try again." });
    }
};

export const confirmAccountEmail = async (req, res) => {
    try {
        const code = String(req.body?.code || "").replace(/\s+/g, "");
        if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, error: "Enter the 6-digit code from the email." });
        const user = await User.findById(req.user._id).select("email name account_emails account_email_pending").lean();
        const p = user?.account_email_pending || {};
        if (!p.code_hash || !p.email || !p.code_expires_at || new Date(p.code_expires_at).getTime() < Date.now()) {
            return res.status(400).json({ success: false, error: "This code has run out. Ask for a new one." });
        }
        // Each try is counted in one step before the code is compared, so tries sent all at once still stop at five
        const counted = await User.findOneAndUpdate(
            { _id: req.user._id, $or: [{ "account_email_pending.code_attempts": null }, { "account_email_pending.code_attempts": { $lt: MAX_TRIES } }] },
            { $inc: { "account_email_pending.code_attempts": 1 } },
            { projection: { _id: 1 } }
        );
        if (!counted) return res.status(429).json({ success: false, error: "Too many wrong tries. Ask for a new code." });
        const ok = crypto.timingSafeEqual(Buffer.from(hashCode(req.user._id, p.email, code)), Buffer.from(String(p.code_hash)));
        if (!ok) return res.status(400).json({ success: false, error: "That code is not right. Check the email and try again." });
        // Checked again (this account may have changed since the code was sent), and now whether another account has it
        const no = await cannotAdd(user, p.email, { others: true });
        if (no) return res.status(no.status).json({ success: false, code: no.code, error: no.error });
        const school = await isSchoolEmail(p.email);
        const now = new Date();
        // Added in one step, only while the account still has room and does not have the email yet
        const added = await User.findOneAndUpdate(
            { _id: req.user._id, "account_emails.email": { $ne: p.email }, $expr: { $lt: [{ $size: { $ifNull: ["$account_emails", []] } }, EXTRA_MAX] } },
            {
                $push: { account_emails: { email: p.email, verified_at: now, added_at: now, school } },
                $unset: { "account_email_pending.email": "", "account_email_pending.code_hash": "", "account_email_pending.code_expires_at": "", "account_email_pending.code_attempts": "" },
            },
            { projection: { _id: 1 } }
        );
        if (!added) return res.status(409).json({ success: false, code: "emails_full", error: `An account can have up to ${MAX_ACCOUNT_EMAILS} emails. Remove one to add another.` });
        res.json({ success: true, data: await accountEmailsOf(req.user._id) });
    } catch (err) {
        console.error("[account emails] confirm", err);
        res.status(500).json({ success: false, error: "Couldn't confirm the code. Please try again." });
    }
};

export const removeAccountEmail = async (req, res) => {
    try {
        const email = cleanEmail(req.params.email);
        const r = await User.updateOne({ _id: req.user._id, "account_emails.email": email }, { $pull: { account_emails: { email } } });
        if (!r.modifiedCount) return res.status(404).json({ success: false, error: "This email is not on your account." });
        res.json({ success: true, data: await accountEmailsOf(req.user._id) });
    } catch (err) {
        console.error("[account emails] remove", err);
        res.status(500).json({ success: false, error: "Couldn't remove the email. Please try again." });
    }
};
