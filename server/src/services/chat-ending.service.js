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
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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
// end_conversation / warn_user: lets the AI close a chat, with safeguards.
//  - Two steps: the first call only asks for confirmation; the real end needs a LATER request (a user turn in between).
//  - Never ends a chat when the user's message looks like self-harm or a crisis.
//  - Abuse reasons need at least one earlier warn_user. Staff accounts can only be ended on their own request.
//  - Only "user_requested" endings can be reopened by the owner.
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";
import redis from "../config/redis.js";

export const END_REASONS = ["user_requested", "abusive_behavior", "harassment", "spam", "other"];
const STAFF_ROLES = new Set(["super_admin", "co_super_admin"]);
const PENDING_TTL_SECONDS = 600;

const CRISIS_RE = /\b(kill\s+myself|suicid\w*|end\s+my\s+life|want\s+to\s+die|don'?t\s+want\s+to\s+live|self[\s-]?harm|hurt\s+myself|cut\s+myself|marna\s+chah\w*|jaan\s+de\w*)\b/i;
export const isCrisisText = (text) => CRISIS_RE.test(String(text || ""));

const pendingKey = (sessionId) => `ai:end-pending:${sessionId}`;

async function loadSession(sessionId, userEmail) {
    const { data, error } = await supabase.from("ai_chat_sessions").select("*").eq("id", sessionId).single();
    if (error || !data) return null;
    if (data.user_email !== userEmail) return null;
    return data;
}

export async function requestEndConversation({ sessionId, userEmail, role, reason, summary, confirm, lastUserText, requestId }) {
    if (!sessionId) return { ok: false, text: "REFUSED: This chat is not saved (incognito), so it cannot be ended. Just tell the user they can close the window." };
    if (!END_REASONS.includes(reason)) return { ok: false, text: `REFUSED: reason must be one of ${END_REASONS.join(", ")}.` };

    const session = await loadSession(sessionId, userEmail);
    if (!session) return { ok: false, text: "REFUSED: Session not found for this user." };
    if (session.ended) return { ok: true, text: "This chat is already ended." };

    // Safeguard 1: never end on a crisis message. Respond with care instead.
    if (isCrisisText(lastUserText)) {
        return { ok: false, text: "REFUSED: The user may be in distress. Do NOT end this chat. Reply with warmth, encourage them to reach out to someone they trust or a local helpline (India: Tele-MANAS 14416), and keep talking." };
    }

    // Safeguard 2: abuse endings are not available for staff accounts, and need a prior warning.
    if (reason !== "user_requested") {
        if (STAFF_ROLES.has(role)) return { ok: false, text: "REFUSED: Staff chats can only be ended when the user asks for it (reason user_requested)." };
        if ((session.warned_count || 0) < 1) return { ok: false, text: "REFUSED: Warn the user first with warn_user. A chat can only be ended for abuse after at least one warning." };
    }

    const key = pendingKey(sessionId);
    if (!confirm) {
        await redis.set(key, requestId, "EX", PENDING_TTL_SECONDS).catch(() => {});
        return {
            ok: false,
            pending: true,
            text: reason === "user_requested"
                ? "CONFIRMATION REQUIRED: Ask the user one short question: 'Do you want to end this chat? You will not be able to send more messages in it (you can start a new chat anytime).' Do NOT call end_conversation again in this reply. Wait for their answer."
                : "CONFIRMATION REQUIRED: Tell the user, calmly and without insults, that the chat will be ended if the behaviour continues. Do NOT call end_conversation again in this reply. If they continue in a later message, call it again with confirm=true.",
        };
    }

    // Step 2 must come from a later request than step 1, so the model can't confirm on its own in one go.
    const pendingFrom = await redis.get(key).catch(() => null);
    if (!pendingFrom) return { ok: false, text: "REFUSED: No pending confirmation. Call end_conversation with confirm=false first." };
    if (pendingFrom === requestId) return { ok: false, text: "REFUSED: Confirmation must come from the user's next message, not the same reply." };

    const { error } = await supabase.from("ai_chat_sessions").update({
        ended: true,
        ended_at: new Date().toISOString(),
        end_reason: reason,
        end_summary: String(summary || "").slice(0, 500),
    }).eq("id", sessionId);
    if (error) return { ok: false, text: `FAILED to end chat: ${error.message}` };

    await redis.del(key).catch(() => {});
    return {
        ok: true,
        ended: true,
        reason,
        canReopen: reason === "user_requested",
        text: "SUCCESS: The chat is ended. Write ONE short, kind closing message. Do not call any more tools.",
    };
}

export async function warnUser({ sessionId, userEmail, message }) {
    if (!sessionId) return { ok: true, text: "Warning noted (unsaved chat). Tell the user politely to keep the conversation respectful." };
    const session = await loadSession(sessionId, userEmail);
    if (!session) return { ok: false, text: "REFUSED: Session not found for this user." };
    const warned = (session.warned_count || 0) + 1;
    const { error } = await supabase.from("ai_chat_sessions").update({
        warned_count: warned,
        last_warning_at: new Date().toISOString(),
    }).eq("id", sessionId);
    if (error) return { ok: false, text: `FAILED to record warning: ${error.message}` };
    return { ok: true, warned, text: `Warning ${warned} recorded. Now tell the user politely${message ? ` (${String(message).slice(0, 200)})` : ""} that the chat may be ended if this continues.` };
}

export async function reopenConversation(sessionId, userEmail) {
    const session = await loadSession(sessionId, userEmail);
    if (!session) return { status: 404, body: { error: "Session not found" } };
    if (!session.ended) return { status: 200, body: { ok: true } };
    if (session.end_reason !== "user_requested") return { status: 403, body: { error: "This chat was ended by Classgrid AI and cannot be reopened.", code: "CHAT_ENDED" } };
    const { error } = await supabase.from("ai_chat_sessions").update({ ended: false, ended_at: null, end_reason: null, end_summary: null }).eq("id", sessionId);
    if (error) return { status: 500, body: { error: "Failed to reopen chat" } };
    return { status: 200, body: { ok: true } };
}
