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
//   - their place in other people's live docs (shared with them, or asked for), and their pins
//   - Remote PC: the chats they turned on for the phone, and their computers' switches
//   - the reports they sent about a doc, a page or a comment, and their rows in the old activity log
//   - the feedback they sent on answers (thumbs up or down and their words), under every email of the account
//   - WhatsApp: the count of messages the AI sent for them, and what they wrote to Classgrid's number that is still
//     kept (the last messages, 3 days)
//   - on the CDN: the screenshots the AI took in their chats (and the lists of them), the files and videos the AI
//     made that are in their Library, and the profile photo saved at sign-up
// Kept on purpose: payments, invoices, credit and platform transactions, credit spends and Google Play purchases
// (the business must keep them by law), and the admin audit log and the system logs (the record of what was done).
// Also left, because it is not this person's to delete or cannot be told to be theirs:
//   - reports other people sent about this person's docs, pages or comments (they belong to the Classgrid team's
//     moderation; they carry the name and a short piece of what was reported)
//   - files the AI made that are not in the Library (office files, edited PDFs, "@Create image" pictures, a video's
//     still frames, anything made while the Library was full): their names carry no account id, so nothing here
//     can say whose they are. The same for a file the person sent on WhatsApp.
//
// Each part is tried on its own; one that fails is logged and the rest still run, so a storage hiccup never leaves
// the account half deleted. The files in storage are listed here and removed by deleteStoredFiles after the reply.
import { primarySupabaseClient as sb } from "../config/supabaseClient.js";
import redis from "../config/redis.js";
import { deleteFromR2, deletePrefixFromR2 } from "../config/r2Client.js";
import { AI_FILES_BUCKET, BUCKET_NAME as PHOTO_BUCKET, deleteFromS3, deletePrefixFromS3 } from "../config/s3Client.js";
import { forgetSession } from "./ai-chat.service.js";
import { invalidateHistoryCache } from "./ai-chat-history.service.js";
import { leaveSharedChat } from "./ai-chat-grid.service.js";
import { sandboxSsh } from "./ide-project.service.js";
import { normalizeWhatsappNumber } from "./ai-feature-limits.js";
import { forgetNumber } from "./whatsapp-inbox.service.js";
import { confirmedEmails } from "../utils/account-email.js";
import { isSharedTestWhatsapp } from "../utils/chat-onboarding.js";
import { aiMadeFileKey } from "../utils/library-file-key.js";
import ActivityLog from "../models/ActivityLog.js";
import AgentTask from "../models/AgentTask.js";
import AiLibraryFile from "../models/AiLibraryFile.js";
import AiMemoryNote from "../models/AiMemoryNote.js";
import AiSchedule from "../models/AiSchedule.js";
import AiSkill from "../models/AiSkill.js";
import AiUsageLog from "../models/AiUsageLog.js";
import Call from "../models/Call.js";
import ChatGroup from "../models/ChatGroup.js";
import ContentReport from "../models/ContentReport.js";
import CustomMcpServer from "../models/CustomMcpServer.js";
import EmailJob from "../models/EmailJob.js";
import IdeProject from "../models/IdeProject.js";
import LiveDoc from "../models/LiveDoc.js";
import Notification from "../models/Notification.js";
import NotificationLog from "../models/NotificationLog.js";
import OnboardingEvent from "../models/OnboardingEvent.js";
import PushSubscription from "../models/PushSubscription.js";
import RemoteChat, { RemoteDevice } from "../models/RemoteChat.js";
import SavedSong from "../models/SavedSong.js";
import SharePage from "../models/SharePage.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import UserStorageQuota from "../models/UserStorageQuota.js";
import { OAuthAuthCode, OAuthToken } from "../models/OAuth.js";
import UserSession from "../models/UserSession.js";
import WhatsappDirectSend from "../models/WhatsappDirectSend.js";

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

/**
 * What Redis keeps under this person's id: the plan counters and voice clock, the list of screenshots of each of
 * their chats (studio-browser-tools.js SHOTS) and the count of WhatsApp messages the AI sent for them
 * (ai-feature-limits.js directSendKey).
 */
async function deleteRedisKeys(userId) {
    let deleted = await redis.del(`ai:wa-direct:${userId}`);
    for (const pattern of [`plan:*${userId}*`, `studio:shots:${userId}:*`]) {
        let cursor = "0";
        do {
            const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 500);
            cursor = next;
            if (keys.length) deleted += await redis.del(...keys);
        } while (cursor !== "0");
    }
    return deleted;
}

/**
 * What the person wrote to Classgrid's WhatsApp number that Redis still keeps (whatsapp-inbox.service.js: the last
 * messages, 3 days). It is kept by number, so it goes only for the number confirmed on this account
 * (metadata.whatsappPhone), and only when no other account has that number: a test number several accounts share,
 * or a number two accounts both have, is left alone.
 */
async function deleteWhatsappInbox(user) {
    const number = normalizeWhatsappNumber(user?.metadata?.whatsappPhone);
    if (!number) return 0;
    if (isSharedTestWhatsapp(number)) return "left: a test number several accounts share";
    const sameEnding = await User.find({ _id: { $ne: user._id }, "metadata.whatsappPhone": { $regex: `${number.slice(-10)}$` } })
        .select("metadata.whatsappPhone").lean();
    if (sameEnding.some((other) => normalizeWhatsappNumber(other.metadata?.whatsappPhone) === number)) return "left: another account has the same number";
    return forgetNumber(number);
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
        const rows = await AiLibraryFile.find({ user_id: user._id }).select("file_key source").lean();
        // (the records first: when they cannot be deleted, no file of theirs is listed for deletion either)
        const deleted = (await AiLibraryFile.deleteMany({ user_id: user._id })).deletedCount || 0;
        // A file's own object goes only when no Library record is left that points to it: an object another
        // account also has a record of stays for that account.
        const keys = [...new Set(rows.map((r) => r.file_key).filter(Boolean))];
        const stillKept = new Set(keys.length ? (await AiLibraryFile.find({ file_key: { $in: keys } }).select("file_key").lean()).map((r) => r.file_key) : []);
        // A file the AI made is on the CDN bucket, anything else in R2 (utils/library-file-key.js): listed as
        // { s3: key } or as the key itself, so deleteStoredFiles takes each from its own storage. Until 2026-11-25
        // every key was sent to R2, and the AI-made files stayed on the CDN.
        files.push(...rows.filter((r) => r.file_key && !stillKept.has(r.file_key)).map((r) => (aiMadeFileKey(r) ? { s3: aiMadeFileKey(r) } : r.file_key)));
        return deleted;
    });
    await step("songs", async () => {
        const rows = await SavedSong.find({ userId: user._id }).select("r2Key").lean();
        files.push(...rows.map((r) => r.r2Key).filter(Boolean));
        return (await SavedSong.deleteMany({ userId: user._id })).deletedCount || 0;
    });
    await step("projects", () => deleteProjects(userId));

    const byUser = [
        ["skills", AiSkill, { userId: user._id }],
        ["memory notes", AiMemoryNote, { userId: user._id }],
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
        ["signIns", UserSession, { user_id: user._id }], // Settings > Devices: the sign-in rows (user-session.service.js)
        ["remoteChats", RemoteChat, { userId: user._id }], // Remote PC: the chats turned on for the phone
        ["remoteDevices", RemoteDevice, { userId: user._id }], // Remote PC: each computer's switch and connected time
        // Only the reports this person sent. A report someone else sent about this person's content (reportedUser)
        // stays: it is the other person's report and the Classgrid team's moderation record
        ["reportsSent", ContentReport, { reportedBy: user._id }],
        ["activityLog", ActivityLog, { user: user._id }], // the old activity log: what this person opened and did
        ["whatsappSends", WhatsappDirectSend, { userId: user._id }], // the WhatsApp limit's count (its Redis copy goes with "redis")
    ];
    for (const [name, Model, filter] of byUser) {
        await step(name, async () => (await Model.deleteMany(filter)).deletedCount || 0);
    }

    // Other people's live docs this person was let into, or asked to be let into: their place and their requests go
    await step("docAccess", async () => {
        const mine = { $or: [{ userId: user._id }, ...(emails.length ? [{ email: { $in: emails.map((e) => e.toLowerCase()) } }] : [])] };
        const r = await LiveDoc.updateMany(
            { $or: [{ "members.userId": user._id }, { "requests.userId": user._id }, { pinnedBy: user._id }, ...(emails.length ? [{ "members.email": { $in: emails.map((e) => e.toLowerCase()) } }] : [])] },
            { $pull: { members: mine, requests: mine, pinnedBy: user._id } },
            { timestamps: false },
        );
        return r.modifiedCount || 0;
    });

    // The same for other people's published pages
    await step("pageAccess", async () => {
        const mine = { $or: [{ userId: user._id }, ...(emails.length ? [{ email: { $in: emails.map((e) => e.toLowerCase()) } }] : [])] };
        const r = await SharePage.updateMany(
            { $or: [{ "members.userId": user._id }, { "requests.userId": user._id }, { pinnedBy: user._id }, ...(emails.length ? [{ "members.email": { $in: emails.map((e) => e.toLowerCase()) } }] : [])] },
            { $pull: { members: mine, requests: mine, pinnedBy: user._id } },
            { timestamps: false },
        );
        return r.modifiedCount || 0;
    });

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
    // The feedback they sent on answers (ai-chat.controller.js submitAiFeedback keeps it under the email they had):
    // every email of the account, the added ones too (utils/account-email.js; no other account can have them)
    const feedbackEmails = [...new Set([...emails, ...confirmedEmails(user)])];
    if (feedbackEmails.length) {
        await step("feedback", async () => {
            const { error } = await sb.from("ai_agent_reviews").delete().in("user_email", feedbackEmails);
            if (error) throw error;
            return "done";
        });
    }
    await step("whatsappInbox", () => deleteWhatsappInbox(user));
    await step("redis", () => deleteRedisKeys(userId));

    return { report, files };
}

/**
 * The files in storage: each listed one (Library uploads and saved songs in R2; a Library file the AI made, listed
 * as { s3: key }, on the CDN bucket), then everything in the person's own folders: in R2 the profile photo, project
 * logos and pictures sent in chats; on the CDN bucket the screenshots the AI took in their chats
 * (studio-browser-tools.js saveShot, "studio-shots/<their id>/") and the profile photo saved at sign-up
 * (auth.controller.js uploadBase64ToS3, "profile_pictures/<their id>-<time>"). A CDN folder is only ever named by
 * the account's own id, never by a link kept on the account (a person can put any link there).
 * Runs after the reply; failures are logged.
 */
export async function deleteStoredFiles(userId, files) {
    let deleted = 0;
    for (const part of chunks(files, 20)) {
        const done = await Promise.all(part.map((file) => (
            file?.s3 ? deleteFromS3(file.s3, AI_FILES_BUCKET) : deleteFromR2(file)
        ).then(() => 1).catch(() => 0)));
        deleted += done.reduce((a, b) => a + b, 0);
    }
    for (const prefix of [`${userId}/`, `ai-chat-uploads/${userId}/`]) {
        deleted += await deletePrefixFromR2(prefix).catch((e) => {
            console.error(`[account delete] storage folder ${prefix} failed:`, e.message);
            return 0;
        });
    }
    if (/^[a-f0-9]{24}$/i.test(userId)) {
        for (const [prefix, bucket] of [[`studio-shots/${userId}/`, AI_FILES_BUCKET], [`profile_pictures/${userId}-`, PHOTO_BUCKET]]) {
            deleted += await deletePrefixFromS3(prefix, bucket).catch((e) => {
                console.error(`[account delete] CDN folder ${prefix} failed:`, e.message);
                return e.deleted || 0;
            });
        }
    }
    return deleted;
}
