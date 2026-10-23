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
// Bell notifications for Grid chat events (added to group, removed, made admin, reactions, polls).
// Never sent between blocked users; dispatchNotification applies the recipient's bell switches and the
// Notification model pushes it live over the recipient's WebSocket channel.
import { dispatchNotification } from "./notification.service.js";
import { blockStateBetween } from "./chat-block.service.js";

export async function notifyChatEvent({ actorId, recipientId, title, message, threadId = null }) {
    try {
        if (!recipientId || String(recipientId) === String(actorId)) return null;
        if (actorId) {
            const st = await blockStateBetween(String(actorId), String(recipientId));
            if (st.iBlocked || st.blockedMe) return null;
        }
        return await dispatchNotification({
            recipientId,
            type: "chat",
            title,
            message: message || title,
            link: threadId ? `/platform/chat?threadId=${threadId}` : "/platform/chat",
            relatedId: threadId || "",
            sendPush: true,
        });
    } catch (err) {
        console.error("[ChatNotify]", err.message);
        return null;
    }
}

// Reactions: at most one bell entry per reactor+message every 10 minutes, so quick toggles don't spam.
const recentReactions = new Map();
export function shouldNotifyReaction(reactorId, messageId) {
    const key = `${reactorId}:${messageId}`;
    const now = Date.now();
    if (now - (recentReactions.get(key) || 0) < 10 * 60 * 1000) return false;
    if (recentReactions.size > 5000) recentReactions.delete(recentReactions.keys().next().value);
    recentReactions.set(key, now);
    return true;
}
