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
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import express from "express";
import connectDB from "../../config/db.js";
import { processDemoExpiryReminders } from "../services/demo-expiry-reminder.service.js";
import redis from "../config/redis.js";

const router = express.Router();

// Safe Redis unread increment helpers
async function incrUnreadSafe(userId, threadId) {
  try {
    if (redis && redis.status === 'ready') await redis.hincrby(`unread:${userId}`, threadId, 1);
  } catch (err) {}
}

async function incrMentionSafe(userId, threadId) {
  try {
    if (redis && redis.status === 'ready') await redis.hincrby(`mentions:${userId}`, threadId, 1);
  } catch (err) {}
}

/**
 * GET /api/cron/plan-expiry-check
 *
 * Checks real demo subscriptions from OrgSubscription and queues milestone emails for:
 * - 7 days left  -> review reminder
 * - 3 days left  -> demo ending soon
 * - 1 day left   -> final reminder
 * - expired      -> payment required / continue with paid access
 *
 * Secured by a CRON_SECRET header to prevent unauthorized access.
 */
router.get("/plan-expiry-check", async (req, res) => {
    try {
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers["authorization"];

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        await connectDB();
        const results = await processDemoExpiryReminders(new Date());

        return res.json({
            message: `Demo reminder check complete. ${results.queued} reminder(s) queued.`,
            ...results,
            errors: results.errors.length ? results.errors : undefined,
        });
    } catch (err) {
        console.error("[Cron] Plan expiry check error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

/**
 * GET /api/cron/process-email-queue
 *
 * Processes pending email jobs from the MongoDB queue.
 * Runs every minute via Vercel cron.
 *
 * Safeguards:
 *  - Max 10 emails per run (Vercel 10s limit)
 *  - 8-second execution time guard
 *  - Atomic job locking (prevents duplicate sends)
 *  - Exponential backoff retry on failure
 */
router.get("/process-email-queue", async (req, res) => {
    const cronStart = Date.now();
    try {
        const cronSecret = process.env.CRON_SECRET;
        const querySecret = req.query.secret;
        const authHeader = req.headers["authorization"];

        if (cronSecret && querySecret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await connectDB();

        const { processEmailQueue } = await import("../services/email-queue.service.js");

        console.log("[Cron] Email queue processing triggered");
        const stats = await processEmailQueue(10);

        const totalDuration = Date.now() - cronStart;
        console.log(
            `[Cron] Email queue run complete: fetched=${stats.fetched} sent=${stats.sent} failed=${stats.failed} duration=${totalDuration}ms`
        );

        res.json({
            message: "Email queue processed",
            ...stats,
            cronDurationMs: totalDuration,
        });
    } catch (err) {
        const totalDuration = Date.now() - cronStart;
        console.error("[Cron] Email queue error:", err.message, `duration=${totalDuration}ms`);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});
/**
 * GET /api/cron/calculate-organization-usage-daily
 *
 * Updates the daily Superadmin resource ledger from real internal/provider sources.
 * Current production metrics:
 * - Cloudflare R2 storage bytes/object count by organization-mapped object keys
 * - AWS SES email usage from sent EmailJob documents tagged with organizationId
 */
router.get("/calculate-organization-usage-daily", async (req, res) => {
    const cronStart = Date.now();
    try {
        const cronSecret = process.env.CRON_SECRET;
        const querySecret = req.query.secret;
        const authHeader = req.headers["authorization"];

        if (cronSecret && querySecret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await connectDB();

        const { calculateOrganizationUsageDaily } = await import("../services/organization-usage-metering.service.js");
        const date = req.query.date ? new Date(String(req.query.date)) : new Date();
        if (Number.isNaN(date.getTime())) {
            return res.status(400).json({ error: "Invalid date. Use YYYY-MM-DD or an ISO date." });
        }

        const result = await calculateOrganizationUsageDaily({ date });
        res.json({
            message: "Organization daily usage calculated",
            ...result,
            cronDurationMs: Date.now() - cronStart,
        });
    } catch (err) {
        console.error("[Cron] Organization usage daily error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

/**
 * GET /api/cron/auto-close-tickets
 *
 * Automatically closes SupportTickets that have been "resolved" for more than 7 days.
 * Can be triggered by cron-job.org or Vercel cron.
 */
router.get("/auto-close-tickets", async (req, res) => {
    try {
        const cronSecret = process.env.CRON_SECRET;
        const querySecret = req.query.secret;
        const authHeader = req.headers["authorization"];

        if (cronSecret && querySecret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await connectDB();
        
        const SupportTicket = (await import("../models/SupportTicket.js")).default;
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const result = await SupportTicket.collection.updateMany(
            {
                status: "resolved",
                resolvedAt: { $lt: sevenDaysAgo }
            },
            {
                $set: { status: "closed", updatedAt: new Date() },
                $push: {
                    events: {
                        type: 'statusChanged',
                        label: 'Ticket auto-closed after 7 days of inactivity',
                        from: 'resolved',
                        to: 'closed',
                        actorName: 'System',
                        actorRole: 'system',
                        createdAt: new Date()
                    }
                }
            }
        );

        res.json({
            message: "Ticket auto-close complete",
            closedCount: result.modifiedCount
        });
    } catch (err) {
        console.error("[Cron] Ticket auto-close error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

/**
 * GET /api/cron/process-scheduled-messages
 *
 * Processes pending scheduled messages from Supabase chat_scheduled_messages.
 * Can be triggered by cron-job.org or Vercel cron.
 */
router.get("/process-scheduled-messages", async (req, res) => {
    try {
        const cronSecret = process.env.CRON_SECRET;
        const querySecret = req.query.secret || req.query.token;
        const authHeader = req.headers["authorization"];

        if (cronSecret && querySecret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { primarySupabaseClient } = await import("../config/supabaseClient.js");
        const sb = primarySupabaseClient;
        const { broadcastToChannel } = await import("../services/realtimeBroadcast.js");

        // Fetch pending messages that are due
        const now = new Date().toISOString();
        const { data: pendingMessages, error: fetchErr } = await sb
            .from('chat_scheduled_messages')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_for', now);

        if (fetchErr) {
            console.error("[Cron] Error fetching scheduled messages:", fetchErr);
            return res.status(500).json({ error: "Failed to fetch scheduled messages" });
        }

        if (!pendingMessages || pendingMessages.length === 0) {
            return res.json({ message: "No scheduled messages to process", processedCount: 0 });
        }

        let processedCount = 0;
        let failedCount = 0;

        for (const msg of pendingMessages) {
            // Claim it first: mark it sent (only while still pending). If that doesn't work it isn't sent now, so a
            // message can never be sent again every minute (the old "sent" update set a sent_at column that doesn't
            // exist, failed silently and left it pending), and two server processes can't both send it.
            const { data: claimed, error: claimErr } = await sb
                .from('chat_scheduled_messages')
                .update({ status: 'sent' })
                .eq('id', msg.id)
                .eq('status', 'pending')
                .select('id');
            if (claimErr || !claimed || claimed.length === 0) {
                if (claimErr) console.error(`[Cron] Could not claim scheduled message ${msg.id}:`, claimErr.message);
                continue;
            }
            try {
                const { data: thread } = await sb
                    .from('chat_threads')
                    .select('message_ttl')
                    .eq('id', msg.thread_id)
                    .single();
                const expiresAt = thread?.message_ttl && thread.message_ttl > 0
                    ? new Date(Date.now() + thread.message_ttl * 1000).toISOString()
                    : null;

                // 1. Insert into chat_messages
                const { data: insertedMsg, error: insertErr } = await sb.from('chat_messages').insert({
                    thread_id: msg.thread_id,
                    sender_id: msg.sender_id,
                    sender_name: msg.sender_name,
                    user_avatar: null, // Could fetch if needed
                    message: msg.message || '',
                    reply_to: msg.reply_to,
                    created_at: new Date().toISOString(),
                    status: 'approved',
                    expires_at: expiresAt,
                }).select('id').single();

                if (insertErr) throw insertErr;
                const msgId = insertedMsg.id;

                // 2. Process attachments if any
                const attachments = [];
                if (msg.attachments && msg.attachments.length > 0) {
                    const attRecords = msg.attachments.map(att => ({
                        message_id: msgId,
                        file_url: att.file_url,
                        file_name: att.file_name,
                        file_type: att.file_type,
                        file_size: att.file_size
                    }));
                    const { data: insertedAtts, error: attErr } = await sb
                        .from('chat_attachments')
                        .insert(attRecords)
                        .select();
                    if (!attErr && insertedAtts) attachments.push(...insertedAtts);
                }

                // 3. Update thread last message
                let lastMsgText = msg.message || '';
                if (!lastMsgText && attachments.length > 0) {
                    lastMsgText = `[FILE] ${attachments.length} files`;
                }

                await sb.from('chat_threads')
                    .update({ last_message: lastMsgText, last_message_at: new Date().toISOString() })
                    .eq('id', msg.thread_id);

                // 4. Already marked 'sent' when it was claimed above

                // 5. Broadcast
                const broadcastPayload = {
                    id: msgId,
                    thread_id: msg.thread_id,
                    sender_id: msg.sender_id,
                    sender_name: msg.sender_name,
                    user_avatar: null,
                    message: msg.message || '',
                    reply_to: msg.reply_to,
                    is_deleted: false,
                    created_at: new Date().toISOString(),
                    expires_at: expiresAt,
                    attachments: attachments,
                };
                
                broadcastToChannel(`thread:${msg.thread_id}`, 'new_message', broadcastPayload);
                
                // Alert ALL thread members via their global user channel so their sidebars update
                sb.from('chat_thread_members').select('user_id').eq('thread_id', msg.thread_id).then(({ data: members }) => {
                   if (members) {
                       members.forEach(m => {
                           // ALWAYS broadcast thread update so sender's sidebar refreshes immediately
                           broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
                              threadId: msg.thread_id,
                              messageId: msgId,
                              message: broadcastPayload
                           });
                           
                           // ONLY increment unread counters for OTHER people
                           if (m.user_id !== msg.sender_id) {
                              incrUnreadSafe(m.user_id, msg.thread_id);
                              const mentionMatches = msg.message ? [...msg.message.matchAll(/@\[[^\]]+\]\(([a-fA-F0-9]{24})\)/g)] : [];
                              const mentionIds = mentionMatches.map(match => match[1]);
                              if (mentionIds.includes(m.user_id)) {
                                incrMentionSafe(m.user_id, msg.thread_id);
                              }
                           }
                       });
                   }
                });

                processedCount++;
            } catch (innerErr) {
                console.error(`[Cron] Failed to process scheduled message ${msg.id}:`, innerErr);
                // Mark as failed
                await sb.from('chat_scheduled_messages').update({ status: 'failed' }).eq('id', msg.id);
                failedCount++;
            }
        }

        res.json({
            message: "Scheduled messages processed",
            processedCount,
            failedCount
        });
    } catch (err) {
        console.error("[Cron] Process scheduled messages error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

/**
 * GET /api/cron/sync-group-members
 *
 * Synchronizes ERP roles (from MongoDB) with Supabase Chat Group memberships.
 * Handles adding missing users, removing users who lost the role, and promoting/demoting admins.
 */
router.get("/sync-group-members", async (req, res) => {
    try {
        const cronSecret = process.env.CRON_SECRET;
        const querySecret = req.query.secret || req.query.token;
        const authHeader = req.headers["authorization"];

        if (cronSecret && querySecret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await connectDB();
        const { primarySupabaseClient } = await import("../config/supabaseClient.js");
        const sb = primarySupabaseClient;
        const User = (await import("../models/User.js")).default;

        // 1. Fetch all groups that have either auto_add_roles or admin_roles
        const { data: groups, error: groupsErr } = await sb
            .from('chat_groups')
            .select('id, org_id, auto_add_roles, admin_roles');
            
        if (groupsErr) throw groupsErr;
        
        const autoGroups = groups.filter(g => 
            (g.auto_add_roles && g.auto_add_roles.length > 0) || 
            (g.admin_roles && g.admin_roles.length > 0)
        );

        let totalAdded = 0;
        let totalRemoved = 0;
        let totalPromoted = 0;
        let totalDemoted = 0;

        for (const group of autoGroups) {
            if (!group.org_id) continue;

            const memberRoles = group.auto_add_roles || [];
            const adminRoles = group.admin_roles || [];
            const allAllowedRoles = [...new Set([...memberRoles, ...adminRoles])];

            if (allAllowedRoles.length === 0) continue;

            // Fetch thread for group
            const { data: thread } = await sb.from('chat_threads').select('id').eq('group_id', group.id).single();
            if (!thread) continue;

            // 2. Query MongoDB for all matching users in this org
            const users = await User.find({
                organization_id: group.org_id,
                role: { $in: allAllowedRoles },
                status: 'active'
            }).select('_id role').lean();

            const expectedUsersMap = new Map();
            users.forEach(u => {
                expectedUsersMap.set(u._id.toString(), adminRoles.includes(u.role) ? 'admin' : 'member');
            });

            // 3. Query Supabase for current members of this thread
            const { data: currentMembers } = await sb
                .from('chat_thread_members')
                .select('id, user_id, role')
                .eq('thread_id', thread.id);
                
            const currentMembersMap = new Map();
            (currentMembers || []).forEach(m => {
                currentMembersMap.set(m.user_id, { id: m.id, role: m.role });
            });

            const toAdd = [];
            const toRemove = [];
            const toPromote = []; // member -> admin
            const toDemote = [];  // admin -> member

            // Check who needs to be added or updated
            for (const [userId, expectedRole] of expectedUsersMap.entries()) {
                const current = currentMembersMap.get(userId);
                if (!current) {
                    toAdd.push({ thread_id: thread.id, user_id: userId, role: expectedRole });
                } else if (current.role !== expectedRole) {
                    if (expectedRole === 'admin') toPromote.push(userId);
                    else toDemote.push(userId);
                }
            }

            // Check who needs to be removed
            // Strict enforcement: if you are in the group but not in expectedUsersMap, you get kicked.
            for (const [userId, current] of currentMembersMap.entries()) {
                if (!expectedUsersMap.has(userId)) {
                    toRemove.push(userId);
                }
            }

            // Execute changes
            if (toAdd.length > 0) {
                await sb.from('chat_thread_members').insert(toAdd);
                totalAdded += toAdd.length;
            }
            if (toRemove.length > 0) {
                await sb.from('chat_thread_members').delete().eq('thread_id', thread.id).in('user_id', toRemove);
                totalRemoved += toRemove.length;
            }
            if (toPromote.length > 0) {
                await sb.from('chat_thread_members').update({ role: 'admin' }).eq('thread_id', thread.id).in('user_id', toPromote);
                totalPromoted += toPromote.length;
            }
            if (toDemote.length > 0) {
                await sb.from('chat_thread_members').update({ role: 'member' }).eq('thread_id', thread.id).in('user_id', toDemote);
                totalDemoted += toDemote.length;
            }
        }

        res.json({
            message: "Group members synced successfully",
            stats: {
                totalGroupsProcessed: autoGroups.length,
                totalAdded,
                totalRemoved,
                totalPromoted,
                totalDemoted
            }
        });
    } catch (err) {
        console.error("[Cron] Sync group members error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

/**
 * GET /api/cron/delete-expired-messages
 *
 * Deletes messages where expires_at is in the past.
 * Runs every minute or hour via Vercel cron/cron-job.org.
 */
router.get("/delete-expired-messages", async (req, res) => {
    try {
        const cronSecret = process.env.CRON_SECRET;
        const querySecret = req.query.secret;
        const authHeader = req.headers["authorization"];

        if (cronSecret && querySecret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { primarySupabaseClient } = await import("../config/supabaseClient.js");
        const sb = primarySupabaseClient;

        const now = new Date().toISOString();
        
        // Find messages to delete
        const { data: expiredMessages, error: fetchErr } = await sb
            .from('chat_messages')
            .select('id, thread_id')
            .lt('expires_at', now)
            .eq('is_deleted', false);
            
        if (fetchErr) throw fetchErr;
        
        if (!expiredMessages || expiredMessages.length === 0) {
            return res.json({ message: "No expired messages to delete", count: 0 });
        }
        
        const messageIds = expiredMessages.map(m => m.id);
        
        // Fetch attachments for R2 cleanup
        const { data: attachments } = await sb
            .from('chat_attachments')
            .select('file_url')
            .in('message_id', messageIds);

        if (attachments && attachments.length > 0) {
            const { deleteFromR2 } = await import("../config/r2Client.js");
            for (const att of attachments) {
                if (att.file_url) {
                    await deleteFromR2(att.file_url).catch(e => console.error("[Cron R2 Delete Error]", e.message));
                }
            }
        }

        // Hard delete them
        const { error: deleteErr } = await sb
            .from('chat_messages')
            .delete()
            .in('id', messageIds);
            
        if (deleteErr) throw deleteErr;
        
        // Broadcast deletions (fire and forget)
        const { broadcastToChannel } = await import("../services/realtimeBroadcast.js");
        for (const msg of expiredMessages) {
            broadcastToChannel(`thread:${msg.thread_id}`, 'message_deleted', { messageId: msg.id });
        }

        res.json({
            message: "Expired messages deleted",
            count: expiredMessages.length,
            messageIds
        });
    } catch (err) {
        console.error("[Cron] Delete expired messages error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


/**
 * GET /api/cron/process-sandbox-expiries
 *
 * Runs daily to check for Sandbox organizations whose demoExpiresAt has passed.
 * Changes their status to "blocked" to prevent further access.
 * Secured by CRON_SECRET.
 */
router.get("/process-sandbox-expiries", async (req, res) => {
    const cronStart = Date.now();
    try {
        const cronSecret = process.env.CRON_SECRET;
        const querySecret = req.query.secret;
        const authHeader = req.headers["authorization"];

        if (cronSecret && querySecret !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const connectDB = (await import("../../config/db.js")).default;
        await connectDB();

        const Organization = (await import("../models/Organization.js")).default;

        const now = new Date();
        const result = await Organization.updateMany(
            {
                org_mode: "sandbox",
                status: "sandbox",
                demoExpiresAt: { $lt: now, $ne: null }
            },
            {
                $set: { status: "blocked" }
            }
        );

        res.json({
            message: "Sandbox expiries processed",
            blockedCount: result.modifiedCount,
            cronDurationMs: Date.now() - cronStart
        });
    } catch (err) {
        console.error("[Cron] Process sandbox expiries error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

export default router;

