/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
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
// Public chat (chat.classgrid.in) accounts must finish sign-up — a verified WhatsApp number and age —
// before they can use the AI. ERP users, staff and impersonation sessions are never affected.

export const CHAT_PUBLIC_ORG_ID = "6ac4b95e0f8a97f45e98b0ff";

export function isPublicChatAccount(user) {
    if (!user) return false;
    const orgId = String(user.organization_id?._id || user.organization_id || "");
    // Older chat sign-ups were saved as "student" in the public org
    return orgId === CHAT_PUBLIC_ORG_ID && (user.role === "user" || user.role === "student");
}

export function needsChatOnboarding(user) {
    if (!isPublicChatAccount(user)) return false;
    if (String(user.email || "").toLowerCase().endsWith("@classgrid.in")) return false;
    const meta = user.metadata || {};
    return !meta.whatsappPhone || !meta.age;
}

// The owner's own WhatsApp number may be linked to several test accounts: it skips the
// "one number per account" rule (it still has to be verified with a real code). Extra numbers can be
// added with WHATSAPP_SHARED_TEST_NUMBERS (comma-separated, any format).
const SHARED_TEST_WHATSAPP = ["918623947038"];

export function isSharedTestWhatsapp(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return false;
    const extra = String(process.env.WHATSAPP_SHARED_TEST_NUMBERS || "").split(",").map((n) => n.replace(/\D/g, "")).filter(Boolean);
    // Match with or without the country code (a 10-digit entry matches "+91…" too)
    return [...SHARED_TEST_WHATSAPP, ...extra].some((n) => digits === n || digits.endsWith(n) || (n.endsWith(digits) && digits.length >= 10));
}

// Job roles are stored and shown as readable names ("Software Engineer"), never as keys like "software_engineer"
export function readableJobRole(role) {
    const value = String(role || "").trim();
    if (!value || !/[_-]/.test(value) && value !== value.toLowerCase()) return value;
    if (value.toLowerCase() === "hr") return "Human Resources";
    return value.split(/[_\-\s]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
