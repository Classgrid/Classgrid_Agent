// Whether an account has a password of its own. Passwords are only ever checked with bcrypt, so anything else in
// the password field is "no password": null (an account made with Google, GitHub or an email code that never chose
// one) or the plain random placeholder older chat sign-ups stored. One rule for every place that asks: the sign-in
// screen (auth.controller.js checkEmailForLogin), the first password at sign-up (chatSavePassword,
// chatFinalizeOnboarding) and Delete Account (services/account-delete-confirm.service.js).

/** How a bcrypt hash starts. Also used as a database filter, so the hash itself need not be loaded to ask. */
export const REAL_PASSWORD_HASH = /^\$2[aby]\$\d{2}\$/;

export function isRealPasswordHash(value) {
    return typeof value === "string" && REAL_PASSWORD_HASH.test(value);
}
