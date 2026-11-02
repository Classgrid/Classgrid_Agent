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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import { primarySupabaseClient } from "../config/supabaseClient.js";
import { triggerMemoryAgent } from "../services/ai-chat.service.js";

// POST /api/ai/sessions/import — desktop app: a chat saved on this computer by another Classgrid account goes on
// under the account that is logged in now (like switching accounts in Claude Code: only who pays changes).
// The app sends the saved copy's title and messages (the same shape GET /api/ai/sessions/:id/messages sends);
// a new chat of this user is made with those messages, so the AI's history (getHistory warms from these rows on
// its first read) and the chat's long-term memory have the whole conversation.

const MAX_MESSAGES = 300; // only the last 300 messages are kept
const MAX_TOTAL_CHARS = 4 * 1024 * 1024; // about 4 MB of text in all (newest messages win)
const MAX_MESSAGE_CHARS = 400 * 1024; // one message bigger than this is cut down
const MAX_FILES = 20;
const MEMORY_EVERY = 8; // same mark as the memory agent: shorter chats need no summary

// A message too big to keep whole: a saved AI answer keeps its text (its steps and thinking go), anything else is cut
function cutDown(content) {
    if (content.length <= MAX_MESSAGE_CHARS) return content;
    if (content.trim().startsWith("{")) {
        try {
            const inner = JSON.parse(content);
            if (inner?.classgrid_ai_message) {
                const slim = JSON.stringify({ classgrid_ai_message: true, content: String(inner.content || "").slice(0, MAX_MESSAGE_CHARS - 200) });
                if (slim.length <= MAX_MESSAGE_CHARS) return slim;
            }
        } catch { /* plain text */ }
    }
    return `${content.slice(0, MAX_MESSAGE_CHARS - 100)}\n\n[cut short when this chat was continued]`;
}

/**
 * The rows to save, oldest first: only user / assistant messages with text or files, at most the last 300 and
 * about 4 MB. Times stay as they were but always go up by at least 1 ms, so the chat keeps its order.
 */
export function importRows(sessionId, messages, now = Date.now()) {
    const clean = [];
    for (const m of Array.isArray(messages) ? messages : []) {
        if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
        const content = typeof m.content === "string" ? cutDown(m.content) : "";
        const files = (Array.isArray(m.file_urls) ? m.file_urls : [])
            .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u) && u.length <= 2000)
            .slice(0, MAX_FILES);
        if (!content && !files.length) continue;
        const at = Date.parse(m.created_at);
        clean.push({ role: m.role, content, file_urls: files, at: Number.isFinite(at) && at <= now ? at : null });
    }
    const kept = [];
    let total = 0;
    for (let i = clean.length - 1; i >= 0 && kept.length < MAX_MESSAGES; i--) {
        total += clean[i].content.length + clean[i].file_urls.join("").length;
        if (total > MAX_TOTAL_CHARS) break;
        kept.unshift(clean[i]);
    }
    let prev = null;
    return kept.map((m, i) => {
        let at = m.at ?? (prev !== null ? prev + 1 : now - (kept.length - i));
        if (prev !== null && at <= prev) at = prev + 1;
        prev = at;
        return { session_id: sessionId, role: m.role, content: m.content, file_urls: m.file_urls, created_at: new Date(at).toISOString() };
    });
}

/** Makes the new chat for this user and saves its messages. Returns { sessionId, count }. */
export async function importChat({ email, title, messages }, sb = primarySupabaseClient, summarize = triggerMemoryAgent) {
    const name = String(title || "").trim().slice(0, 200) || "New chat";
    const rows = importRows(null, messages);
    if (!rows.length) return { sessionId: null, count: 0 };
    const { data: session, error } = await sb
        .from("ai_chat_sessions")
        .insert([{ user_email: email, title: name, is_incognito: false }])
        .select()
        .single();
    if (error || !session?.id) throw error || new Error("Could not make the chat");

    for (const row of rows) row.session_id = session.id;
    try {
        // A few at a time, so one big chat is not one huge request
        for (let i = 0; i < rows.length; i += 100) {
            const { error: insertErr } = await sb.from("ai_chat_messages").insert(rows.slice(i, i + 100));
            if (insertErr) throw insertErr;
        }
    } catch (err) {
        // Half a chat is worse than none: the new chat goes again
        await sb.from("ai_chat_messages").delete().eq("session_id", session.id).then(() => {}, () => {});
        await sb.from("ai_chat_sessions").delete().eq("id", session.id).then(() => {}, () => {});
        throw err;
    }

    // Long chats get their long-term memory written now (in the background), so the AI knows the older part too
    if (rows.length >= MEMORY_EVERY) Promise.resolve().then(() => summarize(session.id, { force: true })).catch((err) => console.error("[ChatImport] memory error:", err?.message));
    return { sessionId: session.id, count: rows.length };
}

export const importChatSession = async (req, res) => {
    try {
        const email = req.user?.email;
        if (!email) return res.status(401).json({ error: "Unauthorized" });
        const { title, messages } = req.body || {};
        if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "This chat has no messages." });
        const { sessionId, count } = await importChat({ email, title, messages });
        if (!sessionId) return res.status(400).json({ error: "This chat has no messages." });
        console.log(`[ChatImport] ${email} continued a chat from another account on this computer: ${sessionId} (${count} messages)`);
        res.json({ sessionId, count });
    } catch (e) {
        console.error("Error importing chat:", e);
        res.status(500).json({ error: "Couldn't continue this chat. Please try again." });
    }
};
