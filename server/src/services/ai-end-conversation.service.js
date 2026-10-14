/**
 * End-conversation support for the AI chat.
 *
 * Mirrors the Claude.ai "end_conversation" tool:
 *  - two-step commit (first call asks for confirmation, second call with confirm=true ends the chat)
 *  - the abuse path requires a prior explicit warning (warn_user) recorded on the session
 *  - NEVER allowed when the recent conversation shows self-harm / crisis / harm-to-others signals.
 *    This guard runs in code, so the model cannot bypass it with a prompt.
 */
import { primarySupabaseClient } from "../config/supabaseClient.js";

export const END_REASONS = ["user_requested", "abusive_after_warning", "spam_after_warning"];

// Conservative keyword screen. Any hit blocks ending the chat; we would rather keep a chat open by mistake
// than close one on a person in distress.
const CRISIS_PATTERNS = [
    /\b(suicid\w*|kill\s+myself|end\s+my\s+life|take\s+my\s+(own\s+)?life|self[-\s]?harm|hurt\s+myself|cut\s+myself)\b/i,
    /\b(don'?t\s+want\s+to\s+(live|be\s+alive)|no\s+reason\s+to\s+live|better\s+off\s+dead|want\s+to\s+die)\b/i,
    /\b(kill\s+(him|her|them|someone|people|everyone)|hurt\s+(him|her|them|someone|people)|shoot\s+(up|them|people)|bomb\s+(the|a)\b)/i,
    /\b(overdose|hang\s+myself|jump\s+off)\b/i,
    // Hindi / Hinglish
    /\b(aatmahatya|khudkushi|marna\s+chahta|marna\s+chahti|jeena\s+nahi\s+chahta|jaan\s+de\s+du)\b/i,
];

/** Returns true when any of the given texts contains a crisis / harm signal. */
export function detectCrisis(texts) {
    for (const t of texts || []) {
        if (typeof t !== "string" || !t) continue;
        if (CRISIS_PATTERNS.some((re) => re.test(t))) return true;
    }
    return false;
}

/** Pull the plain text of the last N user messages out of the LLM message array (any provider shape). */
export function recentUserTexts(messages, question, n = 8) {
    const out = [];
    for (let i = (messages || []).length - 1; i >= 0 && out.length < n; i--) {
        const m = messages[i];
        if (!m || m.role !== "user") continue;
        const c = m.content;
        if (typeof c === "string") out.push(c);
        else if (Array.isArray(c)) out.push(c.map((p) => (typeof p === "string" ? p : p?.text || "")).join(" "));
    }
    if (question) out.push(String(question));
    return out;
}

export async function markSessionWarned(sessionId) {
    const { error } = await primarySupabaseClient
        .from("ai_chat_sessions")
        .update({ warned_at: new Date().toISOString() })
        .eq("id", sessionId);
    if (error) throw error;
}

export async function endSession(sessionId, reason) {
    if (!END_REASONS.includes(reason)) throw new Error(`Invalid end reason: ${reason}`);
    const { data, error } = await primarySupabaseClient
        .from("ai_chat_sessions")
        .update({ ended: true, ended_at: new Date().toISOString(), end_reason: reason === "spam_after_warning" ? "abusive_after_warning" : reason })
        .eq("id", sessionId)
        .select("id, ended, ended_at, end_reason")
        .single();
    if (error) throw error;
    return data;
}

/** Super-admin only (checked by the route). Lets staff reopen a chat a school asks about. */
export async function reopenSession(sessionId) {
    const { data, error } = await primarySupabaseClient
        .from("ai_chat_sessions")
        .update({ ended: false, ended_at: null, end_reason: null })
        .eq("id", sessionId)
        .select("id, ended")
        .single();
    if (error) throw error;
    return data;
}

/**
 * Builds the two tool handlers for one /ask request.
 * ctx: { sessionId, isIncognito, messages, question, res, log }
 * The confirmation state is per request on purpose: a stale "pending confirm" can never leak into a later turn.
 */
export function buildEndConversationHandlers(ctx) {
    const { sessionId, isIncognito, messages, question, res } = ctx;
    const log = ctx.log || console;
    const requestStartedAt = Date.now(); // a warning only counts if it was given in an earlier message

    const crisis = () => detectCrisis(recentUserTexts(messages, question));

    return {
        warn_user: async (args) => {
            if (!sessionId || isIncognito) return "ERROR: warn_user needs a saved (non-incognito) chat session.";
            if (crisis()) return "REFUSED: the recent messages show possible self-harm or harm to others. Never warn or end in this case. Stay supportive.";
            const behavior = typeof args?.behavior === "string" ? args.behavior.trim().slice(0, 300) : "";
            if (!behavior) return "ERROR: warn_user needs 'behavior' (one line naming the problematic behavior).";
            try {
                await markSessionWarned(sessionId);
            } catch (err) {
                log.error("[warn_user] failed to record warning:", err);
                return `ERROR: could not record the warning (${err?.message || err}).`;
            }
            return "OK: warning recorded on this session. Now tell the user clearly, in your reply, what the problem is, how to continue productively, and that the chat may be ended if it continues.";
        },

        end_conversation: async (args) => {
            const reason = args?.reason;
            const confirm = args?.confirm === true;
            if (!END_REASONS.includes(reason)) return `ERROR: end_conversation needs reason: one of ${END_REASONS.join(", ")}.`;
            if (!sessionId || isIncognito) return "ERROR: this is an incognito/unsaved chat; there is nothing to end. Tell the user to simply close the window.";
            if (crisis()) return "REFUSED: the recent messages show possible self-harm or harm to others. Never end the conversation in this case. Stay engaged and supportive, and do not mention ending the chat.";

            if (reason === "abusive_after_warning" || reason === "spam_after_warning") {
                const { data } = await primarySupabaseClient.from("ai_chat_sessions").select("warned_at").eq("id", sessionId).single();
                if (!data?.warned_at) return "REFUSED: no warning has been recorded on this session. Call warn_user first and give the user a chance to change the behavior.";
                if (new Date(data.warned_at).getTime() >= requestStartedAt) return "REFUSED: the warning was given in this same reply. Give the user a chance to change the behavior; you may end the chat only if they continue in a later message.";
            }

            if (!confirm) {
                return "CONFIRMATION_REQUIRED: Re-read the end_conversation tool guidance. Confirm this conversation meets those criteria and that you are certain you want to end it (the user explicitly confirmed, or the user persisted after a warning given in an earlier message). If so, call end_conversation again now with confirm=true to actually end the conversation. Otherwise, continue the conversation instead.";
            }

            try {
                await endSession(sessionId, reason);
            } catch (err) {
                log.error("[end_conversation] failed to end session:", err);
                return `ERROR: could not end the chat (${err?.message || err}).`;
            }
            if (res && !res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: "chat_ended", sessionId, reason, canReopen: reason === "user_requested" })}\n\n`);
            }
            return { text: "ENDED: the chat is now closed.", stopAnswer: "This conversation has ended." };
        },
    };
}
