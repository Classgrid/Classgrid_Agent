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
