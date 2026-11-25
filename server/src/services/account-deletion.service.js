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
//     made that are in their Library, and the profile photo saved at sign-up (also the one saved while the account
//     was still being set up, found by the id of the organization record the person owns)
//   - files stored under a name that does not say whose they are, found by the row written when each was stored
//     (models/StoredFile.js, since 2026-11-25): office files and edited PDFs the AI made, pictures it made, files and
//     videos it put on the CDN (also when the Library was full), a video's still frames, files the person sent on
//     WhatsApp. A file goes only when no Library record and no other row still points to it.
// Kept on purpose: payments, invoices, credit and platform transactions, credit spends and Google Play purchases
// (the business must keep them by law), and the admin audit log and the system logs (the record of what was done).
// Also left, because it is not this person's to delete or cannot be told to be theirs:
//   - reports other people sent about this person's docs, pages or comments (they belong to the Classgrid team's
//     moderation; they carry the name and a short piece of what was reported)
//   - the files of the kinds above that were stored before 2026-11-25: they have no row, and nothing else proves
//     whose they are. A link in the person's chats is not proof: anyone can paste a link or import a chat that holds
//     one (controllers/ai-chat-import.controller.js), and the names can be guessed (a time and a file name), so
//     deleting what a chat links to would let one person delete another person's files. They need a one-time
//     read of all chats by the Classgrid team to write their rows; nothing here does that.
//   - files other parts of the server store under a name without the account and without a row yet: pictures of
//     the person's screen and parts of files read from their computer ("assets/<time>-<random>", local-runner.service.js
//     and routes/upload.routes.js), attachments read from their mailbox ("email-files/", agent-mail.service.js),
//     files staged from their Drive or Gmail ("ai-temp-cache/", mcp/tools.js), PDFs made by generate_pdf
//     ("reports/<title>.pdf", mcp/tools.js: one name for everyone who uses the same title), a plugin's icon
//     ("custom-mcp-icons/"), and published sites ("websites/")
//   - the proof document of an application for student prices ("private/student-proofs/<their id>/",
//     controllers/ai-student.controller.js): it has the account's id in its name, and no part here deletes it yet
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
import { storedFileProblem } from "./stored-files.service.js";
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
import Organization from "../models/Organization.js";
import PushSubscription from "../models/PushSubscription.js";
import RemoteChat, { RemoteDevice } from "../models/RemoteChat.js";
import SavedSong from "../models/SavedSong.js";
import SharePage from "../models/SharePage.js";
import StoredFile from "../models/StoredFile.js";
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
 * The WhatsApp number whose things are this account's alone: the number confirmed on the account
 * (metadata.whatsappPhone), and only when no other account has it. A test number several accounts share, or a
 * number two accounts both have, gives no number and `left` says why. What is kept by number (the inbox in Redis, a
 * stored file written down with a number and no account) goes only for this number.
 */
async function ownWhatsappNumber(user) {
    const number = normalizeWhatsappNumber(user?.metadata?.whatsappPhone);
    if (!number) return { number: "", left: "" };
    if (isSharedTestWhatsapp(number)) return { number: "", left: "left: a test number several accounts share" };
    const sameEnding = await User.find({ _id: { $ne: user._id }, "metadata.whatsappPhone": { $regex: `${number.slice(-10)}$` } })
        .select("metadata.whatsappPhone").lean();
    if (sameEnding.some((other) => normalizeWhatsappNumber(other.metadata?.whatsappPhone) === number)) return { number: "", left: "left: another account has the same number" };
    return { number, left: "" };
}

/**
 * What the person wrote to Classgrid's WhatsApp number that Redis still keeps (whatsapp-inbox.service.js: the last
 * messages, 3 days). It is kept by number, so it goes only for the number that is this account's alone.
 */
async function deleteWhatsappInbox(user) {
    const { number, left } = await ownWhatsappNumber(user);
    if (!number) return left || 0;
    return forgetNumber(number);
}

const ACCOUNT_ID = /^[a-f0-9]{24}$/i;
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A stored file's row (models/StoredFile.js) as deleteStoredFiles takes it: where the file is, and which row it is. */
const recordedFile = (row) => ({ stored: String(row._id), store: row.store, bucket: row.bucket || null, key: row.key, folder: !!row.folder });

/**
 * One file found by its row: the object (or every object of the folder) goes from its own store, and then the row.
 * The object stays, and only the row goes, when a Library record or another row still points to it: the same object
 * written down for another account, or twice for this one (the last of its rows deletes it). A file that cannot be
 * deleted keeps its row, so it can still be found. Resolves how many objects went.
 */
async function deleteRecordedFile(file) {
    const problem = storedFileProblem(file);
    if (problem) throw new Error(problem);
    const sameObject = file.folder ? { $regex: `^${escapeRegex(file.key)}` } : file.key;
    const inLibrary = await AiLibraryFile.find({ file_key: sameObject }).select("_id").lean();
    const otherRows = await StoredFile.find({ _id: { $ne: file.stored }, store: file.store, bucket: file.bucket || null, key: sameObject }).select("_id").lean();
    let deleted = 0;
    if (!inLibrary.length && !otherRows.length) {
        if (file.store === "s3") {
            const bucket = file.bucket || AI_FILES_BUCKET;
            deleted = file.folder ? await deletePrefixFromS3(file.key, bucket) : Number(await deleteFromS3(file.key, bucket));
        } else {
            deleted = file.folder ? await deletePrefixFromR2(file.key, file.bucket || undefined) : Number(await deleteFromR2(file.key, file.bucket || undefined));
        }
    }
    await StoredFile.deleteOne({ _id: file.stored });
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
    // Files stored under a name that does not say whose they are, found by the rows written when each was stored
    // (models/StoredFile.js). They are only listed here: deleteStoredFiles deletes each file and then its row, so a
    // file that could not be deleted still has its row and can be found again.
    await step("storedFiles", async () => {
        const rows = await StoredFile.find({ userId: user._id }).select("store bucket key folder").lean();
        files.push(...rows.map(recordedFile));
        return rows.length;
    });
    // The same for a file written down with a WhatsApp number and no account: only for the number that is this
    // account's alone, like the inbox below
    await step("whatsappFiles", async () => {
        const { number, left } = await ownWhatsappNumber(user);
        if (!number) return left || 0;
        const rows = await StoredFile.find({ userId: null, whatsappNumber: number }).select("store bucket key folder").lean();
        files.push(...rows.map(recordedFile));
        return rows.length;
    });
    // The profile photo saved while the account was still being set up ("profile_pictures/pending_<id>-<time>",
    // auth.controller.js): the id in its name is the id of the organization record this person owns (owner_id, which
    // only the server sets, when the account is made). It is found by that id, never by the link kept on the account.
    await step("signUpPhoto", async () => {
        const owned = await Organization.find({ owner_id: user._id }).select("_id").lean();
        const ids = owned.map((o) => String(o._id)).filter((id) => ACCOUNT_ID.test(id));
        files.push(...ids.map((id) => ({ s3Folder: `profile_pictures/pending_${id}-`, bucket: PHOTO_BUCKET })));
        return ids.length;
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
 * Two more kinds are listed by deleteAccountData: a file found by its row ({ stored, store, bucket, key, folder },
 * see deleteRecordedFile; one at a time, so two rows of one object never both leave it for the other), and the
 * profile photo from before the account existed ({ s3Folder: "profile_pictures/pending_<id>-", bucket }).
 * Runs after the reply; failures are logged.
 */
export async function deleteStoredFiles(userId, files) {
    let deleted = 0;
    const recorded = files.filter((file) => file?.stored);
    const pendingPhotos = files.filter((file) => /^profile_pictures\/pending_[a-f0-9]{24}-$/i.test(file?.s3Folder || ""));
    // (an AI-made Library file that also has a row is left to its row, so it is deleted and counted once)
    const withRow = new Set(recorded.filter((file) => file.store === "s3" && !file.folder && !file.bucket).map((file) => file.key));
    const listed = files.filter((file) => typeof file === "string" || (file?.s3 && !withRow.has(file.s3)));
    for (const part of chunks(listed, 20)) {
        const done = await Promise.all(part.map((file) => (
            file?.s3 ? deleteFromS3(file.s3, AI_FILES_BUCKET) : deleteFromR2(file)
        ).then(() => 1).catch(() => 0)));
        deleted += done.reduce((a, b) => a + b, 0);
    }
    for (const file of recorded) {
        deleted += await deleteRecordedFile(file).catch((e) => {
            console.error(`[account delete] stored file ${file.store} ${file.key} failed (its row is kept):`, e.message);
            return e.deleted || 0;
        });
    }
    for (const prefix of [`${userId}/`, `ai-chat-uploads/${userId}/`]) {
        deleted += await deletePrefixFromR2(prefix).catch((e) => {
            console.error(`[account delete] storage folder ${prefix} failed:`, e.message);
            return 0;
        });
    }
    const cdnFolders = pendingPhotos.map((file) => [file.s3Folder, file.bucket || PHOTO_BUCKET]);
    if (ACCOUNT_ID.test(userId)) cdnFolders.unshift([`studio-shots/${userId}/`, AI_FILES_BUCKET], [`profile_pictures/${userId}-`, PHOTO_BUCKET]);
    for (const [prefix, bucket] of cdnFolders) {
        deleted += await deletePrefixFromS3(prefix, bucket).catch((e) => {
            console.error(`[account delete] CDN folder ${prefix} failed:`, e.message);
            return e.deleted || 0;
        });
    }
    return deleted;
}
