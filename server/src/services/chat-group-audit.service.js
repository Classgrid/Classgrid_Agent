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
// Group audit log (Grid): one row per group action in chat_group_audit_logs (migrations/007).
// Never blocks or fails the action itself: errors are logged and swallowed.
import { primarySupabaseClient } from "../config/supabaseClient.js";

const sb = primarySupabaseClient;
const EXTENDED_COLUMNS = ["actor_role", "target_id", "target_type", "target_name", "ip_address", "user_agent", "org_id", "group_name"];
let extendedColumnsMissing = false; // set when the migration hasn't been run yet; then only the original columns are written

// group / thread -> { group_id, org_id, name } (small in-memory cache, groups rarely move)
const groupCache = new Map();
const threadCache = new Map();
const CACHE_MAX = 1000;
function remember(map, key, value) {
    if (map.size >= CACHE_MAX) map.delete(map.keys().next().value);
    map.set(key, value);
}

async function groupInfo(groupId) {
    if (!groupId) return null;
    if (groupCache.has(groupId)) return groupCache.get(groupId);
    const { data } = await sb.from("chat_groups").select("id, name, org_id").eq("id", groupId).maybeSingle();
    const info = data ? { group_id: data.id, org_id: data.org_id || null, name: data.name || null } : null;
    if (info) remember(groupCache, groupId, info);
    return info;
}

async function groupIdForThread(threadId) {
    if (!threadId) return null;
    if (threadCache.has(threadId)) return threadCache.get(threadId);
    const { data } = await sb.from("chat_threads").select("group_id").eq("id", threadId).maybeSingle();
    const gid = data?.group_id || null;
    remember(threadCache, threadId, gid);
    return gid;
}

function clientIp(req) {
    const fwd = req?.headers?.["x-forwarded-for"];
    const first = typeof fwd === "string" ? fwd.split(",")[0].trim() : "";
    return (first || req?.ip || req?.socket?.remoteAddress || "").replace(/^::ffff:/, "") || null;
}

/**
 * Logs one group action. Give groupId, or threadId for message actions (only group threads are logged).
 * @param {import("express").Request} req
 * @param {{ groupId?: string, threadId?: string, action: string, targetId?: string, targetType?: string,
 *           targetName?: string, oldValue?: any, newValue?: any, groupName?: string }} event
 */
export async function logGroupAudit(req, event) {
    try {
        const groupId = event.groupId || (await groupIdForThread(event.threadId));
        if (!groupId) return; // a DM, not a group
        const info = await groupInfo(groupId);
        const row = {
            group_id: groupId,
            actor_id: req?.user?._id ? String(req.user._id) : null,
            actor_name: req?.user?.name || req?.user?.email || "Unknown",
            action: event.action,
            old_value: event.oldValue === undefined ? null : event.oldValue,
            new_value: event.newValue === undefined ? null : event.newValue,
            actor_role: req?.user?.role || null,
            target_id: event.targetId ? String(event.targetId) : null,
            target_type: event.targetType || null,
            target_name: event.targetName || null,
            ip_address: clientIp(req),
            user_agent: String(req?.headers?.["user-agent"] || "").slice(0, 300) || null,
            org_id: info?.org_id ? String(info.org_id) : null,
            group_name: event.groupName || info?.name || null,
        };
        if (extendedColumnsMissing) EXTENDED_COLUMNS.forEach((c) => delete row[c]);
        let { error } = await sb.from("chat_group_audit_logs").insert(row);
        if (error && !extendedColumnsMissing && /column/i.test(error.message || "")) {
            // Migration 007 not run yet: keep logging with the original columns
            extendedColumnsMissing = true;
            EXTENDED_COLUMNS.forEach((c) => delete row[c]);
            ({ error } = await sb.from("chat_group_audit_logs").insert(row));
        }
        if (error) console.warn(`[GroupAudit] ${event.action} not logged: ${error.message}`);
    } catch (err) {
        console.warn(`[GroupAudit] ${event?.action} not logged: ${err.message}`);
    }
}

/** Forget cached group info (call after a group is renamed or deleted). */
export function forgetGroup(groupId) {
    groupCache.delete(groupId);
}
