// The sign-up codes of chat.classgrid.in, the desktop app and the phone app (2026-11-25): the email code
// (POST /api/auth/chat/verify-email-otp) and the WhatsApp code (POST /api/auth/chat/verify-whatsapp-otp-step, then
// POST /api/auth/chat/finalize-onboarding). Both are kept in OnboardingOTP, one per target and type.
//
// Before this, a wrong code was never counted, so the six digits could be tried until one fitted. Now, as the
// added-email code and the Delete Account code already did: each try is counted in one step before the code is
// compared, so tries sent all at once still stop at five, and then the code is dead; a code that fits is used up in
// one step, so a second request with it finds nothing. The WhatsApp step check is only a look before the account is
// finished: it does not use the code up (finalize-onboarding needs it once more) and a code that fits gives its try
// back, so the person's own path costs one try.
import OnboardingOTP from "../models/OnboardingOTP.js";
import { CODE_MAX_TRIES, sameCode } from "../utils/code-lifetime.js";

/**
 * Checks a sign-up code. Resolves "none" (no code was sent, or it was used), "expired", "tries" (five tries are used
 * up), "wrong" or "ok". `use: false` checks without using the code up.
 */
export async function checkSignupCode({ target, type, code, use = true, now = Date.now() }) {
    const record = await OnboardingOTP.findOne({ target, type }).lean();
    if (!record) return "none";
    if (!record.expires_at || new Date(record.expires_at).getTime() <= now) {
        await OnboardingOTP.deleteOne({ _id: record._id });
        return "expired";
    }
    // The count belongs to this code: a new code sent meanwhile is another code
    const counted = await OnboardingOTP.findOneAndUpdate(
        { _id: record._id, otp: record.otp, $or: [{ attempts: null }, { attempts: { $lt: CODE_MAX_TRIES } }] },
        { $inc: { attempts: 1 } },
        { projection: { _id: 1 } },
    );
    if (!counted) return "tries";
    if (!sameCode(record.otp, code)) return "wrong";
    if (!use) {
        await OnboardingOTP.updateOne({ _id: record._id, otp: record.otp }, { $inc: { attempts: -1 } });
        return "ok";
    }
    const used = await OnboardingOTP.findOneAndDelete({ _id: record._id, otp: record.otp, expires_at: { $gt: new Date(now) } });
    return used ? "ok" : "expired";
}
