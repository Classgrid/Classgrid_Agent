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

/**
 * Single source of truth for the JWT signing secret.
 *
 * There is deliberately NO fallback value. A hardcoded default secret means anyone
 * who can read this repository can mint valid tokens for production, so a missing
 * secret must fail loudly instead of silently signing with "dev_secret".
 *
 * Set JWT_SECRET in the environment (server/.env on EC2, Vercel env vars, etc.).
 */
export function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not set. Refusing to sign or verify tokens with a default secret.");
    }
    return secret;
}

export default getJwtSecret;
