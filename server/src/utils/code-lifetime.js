// How long every one-time code and one-time link lasts (owner, 2026-11-25: "make all 10 minutes, all means all").
// Every code a person types or clicks uses this: email, WhatsApp and SMS codes, new-device sign-in codes, the payment
// and demo payment codes, the Delete Account code, the added-email code, the super admin security code, password
// reset links, sign-up verification links, activation links and codes, and the desktop app's and the editor's
// sign-in hand-offs. The stored expiry, the check and every text that states the time all come from here.
// The client (client/src/lib/codeLifetime.ts) and the phone app (CODE_VALID_MINUTES in src/screens/login/AuthUI.tsx)
// keep the same number: change all three together.
import crypto from "crypto";

export const CODE_TTL_MINUTES = 10;
export const CODE_TTL_MS = CODE_TTL_MINUTES * 60 * 1000;
export const CODE_TTL_SECONDS = CODE_TTL_MINUTES * 60;

// Wrong tries a code takes before it is dead (each try counted in one step before the code is compared). The payment
// code keeps its own three tries (routes/billing-checkout.routes.js).
export const CODE_MAX_TRIES = 5;

/** When a code made now (or at `now`) runs out. */
export const codeExpiresAt = (now = Date.now()) => new Date(now + CODE_TTL_MS);

/** Whether a typed code is the code that was sent, compared in constant time. */
export function sameCode(sent, typed) {
    const a = Buffer.from(String(sent ?? ""));
    const b = Buffer.from(String(typed ?? "").trim());
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * A template's data as it may be kept in a log: the code itself (`otp`) left out. A code is only ever in the
 * message to the person, never in a log row or a console line (2026-11-25).
 */
export function withoutCodeValue(data) {
    if (!data || typeof data !== "object") return data;
    const { otp, ...rest } = data;
    return otp === undefined ? data : rest;
}
