// How Delete Account is confirmed (controllers/auth.controller.js deleteAccount, sendDeleteAccountCode).
//
// An account with a password of its own confirms with that password, as it always did. An account without one (it
// signs in with Google, GitHub or an email code) could not delete itself at all: the server asked for a password it
// never had (2026-11-25; Google Play asks that every account can delete itself inside the app). Such an account
// now confirms with a 6-digit code sent to its own main email:
//   POST /api/auth/delete-account/code   sends the code (only for an account without a password)
//   POST /api/auth/delete-account        { password } or { code }
// Which of the two an account gives is decided here by one rule, utils/password-hash.js: a real (bcrypt) hash in
// the password field. An account without a password is never deleted with no confirmation, and never by sending a
// password: no password is compared for it at all.
//
// The code follows the codes the owner already accepted (the email code of Settings > Account > Emails, the payment
// code): 6 random digits; only a hash is kept, keyed with the server's secret and bound to this account and to
// deleting it, so it is no use for anything else and cannot be worked out from the database; it lasts 10 minutes,
// takes five tries (each counted in one step before the code is compared) and works once; at most one code a minute
// and five a day. Administrators are refused here as in deleteAccount.
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import { sendEmail } from "./aws-ses.service.js";
import { getDeleteAccountCodeHtml, getDeleteAccountCodePlainText } from "./email-templates.service.js";
import { getJwtSecret } from "../utils/jwt-secret.js";
import { REAL_PASSWORD_HASH, isRealPasswordHash } from "../utils/password-hash.js";
import { CODE_TTL_MINUTES, CODE_TTL_MS } from "../utils/code-lifetime.js";

export { CODE_TTL_MS };
export const RESEND_MS = 60 * 1000;
export const CODES_PER_DAY = 5;
export const MAX_TRIES = 5;

// What the person is told (deleteAccount's own three messages are unchanged)
const ADMIN = "Administrators must use the organization deletion process.";
const PASSWORD_NEEDED = "Password is required to confirm deletion.";
const PASSWORD_WRONG = "Incorrect password.";
// (a new app never sends this request without a code: it is what an older app is told)
const CODE_NEEDED = "This account has no password. Update the app to delete it with a code sent to your email.";
const CODE_RUN_OUT = "This code has run out. Ask for a new one.";
const CODE_WRONG = "That code is not right. Check the email and try again.";
const TOO_MANY_TRIES = "Too many wrong tries. Ask for a new code.";
const USE_PASSWORD = "This account has a password. Confirm with your password.";
const JUST_SENT = "A code was just sent. Wait a minute before asking for a new one.";
const TOO_MANY_CODES = "Too many codes today. Try again tomorrow.";
const NOT_SENT = "Couldn't send the code. Please try again.";
const SENT = `We sent a 6-digit code to your email. It works for ${CODE_TTL_MINUTES} minutes.`;

const isAdmin = (user) => user?.role === "org_admin" || user?.role === "super_admin";
const dayOf = (now) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));

/** Six random digits. */
export const makeDeleteCode = () => crypto.randomInt(100000, 1000000).toString();

/** The code as it is kept: keyed with the server's secret, for this account and for deleting it only. */
export const hashDeleteCode = (userId, code) => crypto.createHmac("sha256", getJwtSecret()).update(`account-delete:${userId}:${code}`).digest("hex");

const sameHash = (a, b) => {
    const x = Buffer.from(String(a || ""));
    const y = Buffer.from(String(b || ""));
    return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

/**
 * What a code is worth against what is kept for the account, with no database: "none" (no code was sent, or it was
 * used), "expired", "tries" (five tries are used up), "wrong" or "ok". The same order the real check follows.
 */
export function judgeDeleteCode({ pending, userId, code, now = Date.now() }) {
    const p = pending || {};
    if (!p.code_hash || !p.code_expires_at) return "none";
    if (new Date(p.code_expires_at).getTime() <= now) return "expired";
    if ((Number(p.code_attempts) || 0) >= MAX_TRIES) return "tries";
    if (!/^\d{6}$/.test(String(code || ""))) return "wrong";
    return sameHash(hashDeleteCode(userId, String(code)), p.code_hash) ? "ok" : "wrong";
}

/** Whether the account has a password of its own, asked of the database without loading the hash. */
export async function accountHasPassword(userId) {
    return !!(await User.exists({ _id: userId, password: { $regex: REAL_PASSWORD_HASH } }));
}

/**
 * The gate in front of Delete Account. `user` is the account with its password field loaded. Resolves null when
 * the deletion is confirmed, or { status, message } to answer with. A code that confirms is used up here, before
 * anything is deleted.
 */
export async function confirmAccountDeletion(user, { password, code } = {}) {
    if (isRealPasswordHash(user.password)) {
        // Exactly as before: the password is asked for first, then administrators are refused, then it is compared
        if (!password) return { status: 400, message: PASSWORD_NEEDED };
        if (isAdmin(user)) return { status: 403, message: ADMIN };
        let match = false;
        try { match = await bcrypt.compare(password, user.password); } catch { match = false; }
        return match ? null : { status: 401, message: PASSWORD_WRONG };
    }

    if (isAdmin(user)) return { status: 403, message: ADMIN };
    const typed = typeof code === "string" || typeof code === "number" ? String(code).replace(/\s+/g, "") : "";
    if (!/^\d{6}$/.test(typed)) return { status: 400, message: CODE_NEEDED, code: "delete_code_needed" };

    const pending = user.account_delete_code || {};
    const state = judgeDeleteCode({ pending, userId: user._id, code: typed });
    if (state === "none" || state === "expired") return { status: 400, message: CODE_RUN_OUT };
    // Each try is counted in one step before the code is compared, so tries sent all at once still stop at five.
    // The count belongs to this code: a new code sent meanwhile is another code.
    const counted = await User.findOneAndUpdate(
        { _id: user._id, "account_delete_code.code_hash": pending.code_hash, $or: [{ "account_delete_code.code_attempts": null }, { "account_delete_code.code_attempts": { $lt: MAX_TRIES } }] },
        { $inc: { "account_delete_code.code_attempts": 1 } },
        { projection: { _id: 1 } },
    );
    if (!counted) return { status: 429, message: TOO_MANY_TRIES };
    if (state !== "ok") return { status: 400, message: CODE_WRONG };
    // Used up in one step, only while it is still this code and still in time: a second request with the same code
    // finds nothing
    const used = await User.findOneAndUpdate(
        { _id: user._id, "account_delete_code.code_hash": pending.code_hash, "account_delete_code.code_expires_at": { $gt: new Date() } },
        { $unset: { "account_delete_code.code_hash": "", "account_delete_code.code_expires_at": "", "account_delete_code.code_attempts": "" } },
        { projection: { _id: 1 } },
    );
    return used ? null : { status: 400, message: CODE_RUN_OUT };
}

/**
 * Sends the code to the account's main email. `user` is the account with its password field loaded. Resolves
 * { status, body } to answer with.
 */
export async function sendDeleteAccountCode(user) {
    if (isAdmin(user)) return { status: 403, body: { message: ADMIN } };
    if (isRealPasswordHash(user.password)) return { status: 400, body: { message: USE_PASSWORD, code: "use_password" } };

    const now = Date.now();
    const today = dayOf(now);
    // Claimed in one step (several requests at once send one code): a minute since the last code, under five today
    const before = await User.findOneAndUpdate(
        { _id: user._id, $and: [
            { $or: [{ "account_delete_code.code_sent_at": null }, { "account_delete_code.code_sent_at": { $lt: new Date(now - RESEND_MS) } }] },
            { $or: [{ "account_delete_code.codes_day": { $ne: today } }, { "account_delete_code.codes_today": null }, { "account_delete_code.codes_today": { $lt: CODES_PER_DAY } }] },
        ] },
        { $set: { "account_delete_code.code_sent_at": new Date(now) } },
        { projection: { account_delete_code: 1 }, returnDocument: "before" },
    ).lean();
    if (!before) {
        const current = await User.findById(user._id).select("account_delete_code").lean();
        const sentAt = current?.account_delete_code?.code_sent_at ? new Date(current.account_delete_code.code_sent_at).getTime() : 0;
        const wait = Math.ceil((sentAt + RESEND_MS - now) / 1000);
        return wait > 0
            ? { status: 429, body: { message: JUST_SENT, retryAfter: wait } }
            : { status: 429, body: { message: TOO_MANY_CODES } };
    }
    const kept = before.account_delete_code || {};
    const sentToday = kept.codes_day === today ? Number(kept.codes_today) || 0 : 0;

    const code = makeDeleteCode();
    await User.updateOne({ _id: user._id }, { $set: {
        "account_delete_code.code_hash": hashDeleteCode(user._id, code),
        "account_delete_code.code_expires_at": new Date(now + CODE_TTL_MS),
        "account_delete_code.code_attempts": 0,
        "account_delete_code.code_sent_at": new Date(now),
        "account_delete_code.codes_day": today,
        "account_delete_code.codes_today": sentToday + 1,
    } });
    try {
        await sendEmail({
            to: user.email,
            subject: "Classgrid - Your code to delete your account",
            html: getDeleteAccountCodeHtml(user.name, code),
            text: getDeleteAccountCodePlainText(user.name, code),
            fromName: "Classgrid",
            userId: user._id,
        });
    } catch (e) {
        // No email went out: the code is taken back, and so is the wait and the day's count, so the person can ask again
        console.error("[delete account] the code could not be sent:", e?.message || e);
        await User.updateOne({ _id: user._id }, {
            $unset: { "account_delete_code.code_hash": "", "account_delete_code.code_expires_at": "", "account_delete_code.code_attempts": "", "account_delete_code.code_sent_at": "" },
            $set: { "account_delete_code.codes_day": today, "account_delete_code.codes_today": sentToday },
        }).catch(() => {});
        return { status: 500, body: { message: NOT_SENT } };
    }
    return { status: 200, body: { message: SENT, expiresInMinutes: CODE_TTL_MINUTES } };
}
