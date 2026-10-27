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
// WhatsApp-style blocking helpers for Grid DMs. The block list lives on the Mongo User (blocked_users).
import User from "../models/User.js";
import { primarySupabaseClient } from "../config/supabaseClient.js";

const sb = primarySupabaseClient;
const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id || ""));

/** Block state between two users: iBlocked = a blocked b, blockedMe = b blocked a. */
export async function blockStateBetween(a, b) {
    if (!isObjectId(a) || !isObjectId(b)) return { iBlocked: false, blockedMe: false };
    const [aDoc, bDoc] = await Promise.all([
        User.findById(a).select("blocked_users").lean(),
        User.findById(b).select("blocked_users").lean(),
    ]);
    return {
        iBlocked: (aDoc?.blocked_users || []).map(String).includes(String(b)),
        blockedMe: (bDoc?.blocked_users || []).map(String).includes(String(a)),
    };
}

/** For a DM thread, returns { otherId, iBlocked, blockedMe }; null when the thread isn't a DM. */
export async function dmBlockState(threadId, userId) {
    const { data: thread } = await sb.from("chat_threads").select("type").eq("id", threadId).maybeSingle();
    if (thread?.type !== "dm") return null;
    const { data: members } = await sb.from("chat_thread_members").select("user_id").eq("thread_id", threadId);
    const otherId = (members || []).map((m) => m.user_id).find((id) => id !== userId);
    if (!otherId) return null;
    return { otherId, ...(await blockStateBetween(userId, otherId)) };
}
