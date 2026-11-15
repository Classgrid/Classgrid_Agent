// Delete Account removes the person's data with the account (owner, 2026-11-15: "after delete account ... all his
// data gets deleted?"; before, only the User record went and every chat, file and project stayed).
//
// deleteAccountData(user, { io }) runs before the User record is deleted (auth.controller.js deleteAccount):
//   - Share Grid chats: the person leaves each shared chat the way Delete chat does (a chat they own goes to the
//     member who joined first, so the others keep it; a chat nobody else is in is deleted below)
//   - their own chats with every message, their cached history, their public share links (snapshots)
//   - Library files and saved songs (the files in storage too), projects (their cloud workspace folder too)
//   - skills (the AI's memory of them), schedules, agent tasks, calls, chat folders, custom plugins, live docs,
//     published pages, sign-ins they gave other apps, push and in-app notifications, profile, onboarding,
//     usage logs, email jobs, the plan counters kept in Redis
// Kept on purpose: payments, invoices, credit and platform transactions (the business must keep them by law).
//
// Each part is tried on its own; one that fails is logged and the rest still run, so a storage hiccup never leaves
// the account half deleted. The files in storage are listed here and removed by deleteStoredFiles after the reply.
import { primarySupabaseClient as sb } from "../config/supabaseClient.js";
import redis from "../config/redis.js";
import { deleteFromR2, deletePrefixFromR2 } from "../config/r2Client.js";
import { forgetSession } from "./ai-chat.service.js";
import { invalidateHistoryCache } from "./ai-chat-history.service.js";
import { leaveSharedChat } from "./ai-chat-grid.service.js";
import { sandboxSsh } from "./ide-project.service.js";
import AgentTask from "../models/AgentTask.js";
import AiLibraryFile from "../models/AiLibraryFile.js";
import AiSchedule from "../models/AiSchedule.js";
import AiSkill from "../models/AiSkill.js";
import AiUsageLog from "../models/AiUsageLog.js";
import Call from "../models/Call.js";
import ChatGroup from "../models/ChatGroup.js";
import CustomMcpServer from "../models/CustomMcpServer.js";
import EmailJob from "../models/EmailJob.js";
import IdeProject from "../models/IdeProject.js";
import LiveDoc from "../models/LiveDoc.js";
import Notification from "../models/Notification.js";
import NotificationLog from "../models/NotificationLog.js";
import OnboardingEvent from "../models/OnboardingEvent.js";
import PushSubscription from "../models/PushSubscription.js";
import SavedSong from "../models/SavedSong.js";
import SharePage from "../models/SharePage.js";
import UserProfile from "../models/UserProfile.js";
import UserStorageQuota from "../models/UserStorageQuota.js";
import { OAuthAuthCode, OAuthToken } from "../models/OAuth.js";

const CHUNK = 200;
const chunks = (list, size = CHUNK) => {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
};

/** Every id of a Supabase query that pages 1000 rows at a time. */
async function allIds(query) {
    const ids = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await query().range(from, from + 999);
        if (error) throw error;
        ids.push(...(data || []).map((r) => r.id ?? r.session_id));
        if (!data || data.length < 1000) return ids;
    }
}

/** The person leaves every shared chat they are in (owned ones pass to another member). */
async function leaveSharedChats(emails, io) {
    const sessionIds = [...new Set(await allIds(() => sb.from("ai_chat_grid_members").select("session_id").in("user_email", emails).is("removed_at", null)))];
    let left = 0;
    for (const id of sessionIds) {
        const { data: session } = await sb.from("ai_chat_sessions").select("*").eq("id", id).maybeSingle();
        if (!session) continue;
        const outcome = await leaveSharedChat(session, emails[0]);
        if (outcome !== "delete") {
            left += 1;
            io?.to(`aigrid:${id}`).emit("aigrid:update", { sessionId: id, kind: "members", by: emails[0] });
        }
    }
    return left;
}

/** Their own chats: messages, Share Grid rows and invites, public share links, the chats, the cached history. */
async function deleteOwnChats(emails) {
    const ids = await allIds(() => sb.from("ai_chat_sessions").select("id").in("user_email", emails));
    for (const part of chunks(ids)) {
        for (const table of ["ai_chat_messages", "ai_chat_grid_members", "ai_chat_grid_invites"]) {
            const { error } = await sb.from(table).delete().in("session_id", part);
            if (error) throw error;
        }
        const { error } = await sb.from("ai_chat_sessions").delete().in("id", part);
        if (error) throw error;
        await Promise.all(part.map((id) => {
            forgetSession(id);
            return invalidateHistoryCache(id).catch(() => {});
        }));
    }
    const { error } = await sb.from("shared_chat_snapshots").delete().in("user_email", emails);
    if (error) throw error;
    return ids.length;
}

/** Projects and their folder in the cloud workspace (the GitHub repos are the person's own and stay on GitHub). */
async function deleteProjects(userId) {
    const removed = await IdeProject.deleteMany({ owner: userId });
    let ssh;
    try {
        ssh = await sandboxSsh();
        await ssh.execCommand(`rm -rf /home/ubuntu/ide_users/${userId}`);
    } finally {
        ssh?.dispose();
    }
    return removed.deletedCount || 0;
}

/** The plan counters and voice clock kept in Redis for this person. */
async function deleteRedisKeys(userId) {
    let cursor = "0";
    let deleted = 0;
    do {
        const [next, keys] = await redis.scan(cursor, "MATCH", `plan:*${userId}*`, "COUNT", 500);
        cursor = next;
        if (keys.length) deleted += await redis.del(...keys);
    } while (cursor !== "0");
    return deleted;
}

export async function deleteAccountData(user, { io = null } = {}) {
    const userId = String(user._id);
    const emails = [...new Set([String(user.email || "").trim(), String(user.email || "").trim().toLowerCase()].filter(Boolean))];
    const report = {};
    const files = [];
    const step = async (name, fn) => {
        try {
            report[name] = await fn();
        } catch (e) {
            report[name] = `failed: ${e.message}`;
            console.error(`[account delete] ${name} failed for ${userId}:`, e.message);
        }
    };

    if (emails.length) {
        await step("sharedChatsLeft", () => leaveSharedChats(emails, io));
        await step("chats", () => deleteOwnChats(emails));
    }
    await step("libraryFiles", async () => {
        const rows = await AiLibraryFile.find({ user_id: user._id }).select("file_key").lean();
        files.push(...rows.map((r) => r.file_key).filter(Boolean));
        return (await AiLibraryFile.deleteMany({ user_id: user._id })).deletedCount || 0;
    });
    await step("songs", async () => {
        const rows = await SavedSong.find({ userId: user._id }).select("r2Key").lean();
        files.push(...rows.map((r) => r.r2Key).filter(Boolean));
        return (await SavedSong.deleteMany({ userId: user._id })).deletedCount || 0;
    });
    await step("projects", () => deleteProjects(userId));

    const byUser = [
        ["skills", AiSkill, { userId: user._id }],
        ["schedules", AiSchedule, { user_id: user._id }],
        ["agentTasks", AgentTask, { user_id: user._id }],
        ["calls", Call, { user_id: user._id }],
        ["chatFolders", ChatGroup, { userId: user._id }],
        ["plugins", CustomMcpServer, { userId: user._id }],
        ["liveDocs", LiveDoc, { owner: user._id }],
        ["publishedPages", SharePage, { owner: user._id }],
        ["appTokens", OAuthToken, { userId: user._id }],
        ["appCodes", OAuthAuthCode, { userId: user._id }],
        ["pushSubscriptions", PushSubscription, { userId: user._id }],
        ["notifications", Notification, { recipient: user._id }],
        ["notificationLogs", NotificationLog, { userId: user._id }],
        ["onboarding", OnboardingEvent, { userId: user._id }],
        ["emailJobs", EmailJob, { userId: user._id }],
        ["usageLogs", AiUsageLog, { userId: user._id }],
        ["profile", UserProfile, { user: user._id }],
        ["storageQuota", UserStorageQuota, { user_id: user._id }],
    ];
    for (const [name, Model, filter] of byUser) {
        await step(name, async () => (await Model.deleteMany(filter)).deletedCount || 0);
    }

    await step("phoneTokens", async () => {
        const { error } = await sb.from("device_tokens").delete().eq("user_id", userId);
        if (error) throw error;
        return "done";
    });
    await step("bellNotifications", async () => {
        const { error } = await sb.from("notifications").delete().eq("recipient_id", userId);
        if (error) throw error;
        return "done";
    });
    await step("redis", () => deleteRedisKeys(userId));

    return { report, files };
}

/**
 * The files in storage: each listed one (Library uploads, saved songs), then everything in the person's own folders
 * (profile photo, project logos, pictures sent in chats). Runs after the reply; failures are logged.
 */
export async function deleteStoredFiles(userId, files) {
    let deleted = 0;
    for (const part of chunks(files, 20)) {
        const done = await Promise.all(part.map((key) => deleteFromR2(key).then(() => 1).catch(() => 0)));
        deleted += done.reduce((a, b) => a + b, 0);
    }
    for (const prefix of [`${userId}/`, `ai-chat-uploads/${userId}/`]) {
        deleted += await deletePrefixFromR2(prefix).catch((e) => {
            console.error(`[account delete] storage folder ${prefix} failed:`, e.message);
            return 0;
        });
    }
    return deleted;
}
