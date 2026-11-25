// How long every code and link Classgrid sends works (owner, 2026-11-25: every one-time code is 10 minutes): sign-in,
// sign-up and WhatsApp codes, add-email and delete-account codes, the payment code, the editor sign-in code, the super
// admin security code and the password reset link. Every screen that states the time or counts it down reads it from
// here. Keep in step with server/src/utils/code-lifetime.js and the phone app's CODE_VALID_MINUTES.

export const CODE_TTL_MINUTES = 10;
export const CODE_TTL_SECONDS = CODE_TTL_MINUTES * 60;
