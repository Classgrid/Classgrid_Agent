// The code that confirms a WhatsApp number from Settings > Verify WhatsApp number and the profile's number change
// (POST /api/user/send-whatsapp-otp, /api/user/verify-whatsapp-otp in routes/user.routes.js). The code is kept in
// Redis for 10 minutes (utils/code-lifetime.js) and takes five wrong tries.
//
// Before 2026-11-25 a wrong try was counted by reading the count and writing it back, so tries sent at the same moment
// all saw the same count and the five could be passed. Now each try is counted in one step (INCR on a counter of its
// own) before the code is compared, and a code that fits is used up in one step, so it works once.
import { CODE_TTL_SECONDS, CODE_MAX_TRIES, sameCode } from "../utils/code-lifetime.js";

export const codeKey = (userId) => `whatsapp_otp:${userId}`;
export const triesKey = (userId) => `whatsapp_otp_tries:${userId}`;

/** Keeps a code just sent to `phoneNumber` ("+<digits>"), with its tries back at zero. */
export async function keepWhatsappCode(redis, userId, { otp, phoneNumber, sentAt = Date.now() }) {
    await redis.multi()
        .set(codeKey(userId), JSON.stringify({ otp, phoneNumber, sentAt }), "EX", CODE_TTL_SECONDS)
        .del(triesKey(userId))
        .exec();
}

/** The code waiting for this account, or null. */
export async function pendingWhatsappCode(redis, userId) {
    try { return JSON.parse((await redis.get(codeKey(userId))) || "null"); } catch { return null; }
}

/**
 * Checks a typed code. Resolves { state: "none" } (no code, or it ran out or was used), { state: "tries" } (that was
 * the last of the five: the code is gone), { state: "wrong", left }, or { state: "ok", phoneNumber } (the code is
 * used up).
 */
export async function checkWhatsappCode(redis, userId, typed) {
    const pending = await pendingWhatsappCode(redis, userId);
    if (!pending?.otp) return { state: "none" };
    const tries = await redis.incr(triesKey(userId));
    if (tries === 1) await redis.expire(triesKey(userId), CODE_TTL_SECONDS);
    if (tries > CODE_MAX_TRIES) {
        await redis.del(codeKey(userId));
        return { state: "tries" };
    }
    if (!sameCode(pending.otp, typed)) {
        if (tries >= CODE_MAX_TRIES) {
            await redis.del(codeKey(userId), triesKey(userId));
            return { state: "tries" };
        }
        return { state: "wrong", left: CODE_MAX_TRIES - tries };
    }
    // Used up in one step: of two requests with the same code, only the one that deletes it goes on
    const removed = await redis.del(codeKey(userId));
    await redis.del(triesKey(userId));
    return removed ? { state: "ok", phoneNumber: pending.phoneNumber } : { state: "none" };
}
