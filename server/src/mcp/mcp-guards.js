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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Extra checks the remote MCP server runs before a Grid/chat tool. The tool handlers in tools.js trust
 * the AI chat to pass only the user's own thread/group ids, so over MCP the server first checks that the
 * token's user is a member of the chat being read or written (and an admin for announcements).
 * The AI chat does not go through this file, so its behaviour is unchanged.
 */

// args.threadId -> that 1:1 thread
const THREAD_TOOLS = new Set(["read_chat_messages", "send_chat_message", "upload_file_to_chat"]);
// args.groupId -> the group's thread
const GROUP_TOOLS = new Set([
    "read_group_chat_details", "read_group_chat_messages", "send_group_chat_message", "upload_file_to_group_chat",
    "send_group_announcement", "list_group_polls", "create_group_poll", "list_group_members", "count_group_members",
]);
// args.messageId -> the message's thread
const MESSAGE_TOOLS = new Set(["get_chat_attachment_url", "get_group_chat_attachment_url"]);
// args.pollId -> the poll's thread
const POLL_TOOLS = new Set(["read_group_poll_details"]);
const GROUP_ADMIN_TOOLS = new Set(["send_group_announcement"]);

export const MCP_GUARDED_CHAT_TOOLS = Object.freeze(new Set([...THREAD_TOOLS, ...GROUP_TOOLS, ...MESSAGE_TOOLS, ...POLL_TOOLS]));

// Supabase UUIDs and similar ids (single character class, no nested repeat)
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const isId = (value) => typeof value === "string" && ID_RE.test(value);

const NOT_MEMBER = "Not found, or you are not a member of this chat.";

/**
 * Returns checkChatAccess(name, args, ctx) -> null when allowed, or an error message.
 * getSb returns the chat Supabase client (injected so tests use a mock).
 */
export function createChatGuard({ getSb }) {
    const one = async (query) => {
        const { data, error } = await query.maybeSingle();
        if (error) throw new Error("Chat lookup failed");
        return data || null;
    };

    return async function checkChatAccess(name, args, ctx) {
        if (!MCP_GUARDED_CHAT_TOOLS.has(name)) return null;
        if (!ctx?.userId) return "User context is required.";
        const sb = getSb();

        let threadId = null;
        if (THREAD_TOOLS.has(name)) {
            if (!isId(args.threadId)) return "A valid threadId is required.";
            threadId = args.threadId;
        } else if (GROUP_TOOLS.has(name)) {
            if (!isId(args.groupId)) return "A valid groupId is required.";
            const thread = await one(sb.from("chat_threads").select("id").eq("group_id", args.groupId));
            threadId = thread?.id || null;
        } else if (MESSAGE_TOOLS.has(name)) {
            if (!isId(args.messageId)) return "A valid messageId is required.";
            const message = await one(sb.from("chat_messages").select("thread_id").eq("id", args.messageId));
            threadId = message?.thread_id || null;
        } else if (POLL_TOOLS.has(name)) {
            if (!isId(args.pollId)) return "A valid pollId is required.";
            const poll = await one(sb.from("chat_polls").select("thread_id").eq("id", args.pollId));
            threadId = poll?.thread_id || null;
        }
        if (!threadId) return NOT_MEMBER;

        const member = await one(
            sb.from("chat_thread_members").select("role").eq("thread_id", threadId).eq("user_id", ctx.userId)
        );
        if (!member) return NOT_MEMBER;
        if (GROUP_ADMIN_TOOLS.has(name) && member.role !== "admin") return "Only group admins can send announcements.";
        return null;
    };
}

const REGEX_SPECIALS = new Set(["\\", "^", "$", ".", "*", "+", "?", "(", ")", "[", "]", "{", "}", "|", "-", "/"]);
const escapeRegexLiteral = (text) => [...text].map((ch) => (REGEX_SPECIALS.has(ch) ? `\\${ch}` : ch)).join("");

/**
 * MCP version of search_users_for_chat. The chat tool searches every user on the platform with a raw
 * regex; over MCP the query is matched as plain text, only inside the caller's own organization, and
 * a user without an organization can only find someone by their exact email address.
 */
export function createMcpUserSearch({ getUserModel }) {
    return async function searchUsersForChat(args, ctx) {
        const query = typeof args.query === "string" ? args.query.trim().slice(0, 64) : "";
        if (query.length < 2) return { content: [{ type: "text", text: "Error: query must be at least 2 characters." }], isError: true };
        const limit = Math.min(Math.max(Math.floor(Number(args.limit)) || 10, 1), 10);
        const User = await getUserModel();

        let filter;
        if (ctx.orgId) {
            const pattern = escapeRegexLiteral(query);
            filter = {
                organization_id: ctx.orgId,
                $or: [{ name: { $regex: pattern, $options: "i" } }, { email: { $regex: pattern, $options: "i" } }],
            };
        } else {
            filter = { email: query.toLowerCase() };
        }
        const users = await User.find(filter).select("name email role").limit(limit).lean().maxTimeMS(5000);
        return { content: [{ type: "text", text: JSON.stringify(users || [], null, 2) }] };
    };
}
