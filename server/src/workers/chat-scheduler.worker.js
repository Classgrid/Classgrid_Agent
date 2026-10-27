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

import cron from 'node-cron';
import { primarySupabaseClient as sb } from '../config/supabaseClient.js';
import { broadcastToChannel } from '../services/realtimeBroadcast.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import redis from '../config/redis.js';
import { dmBlockState } from '../services/chat-block.service.js';

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
export function initChatSchedulerCron() {
  console.log('⏳ Initializing Chat Scheduler Cron Job');
  
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date().toISOString();
      
      // Find all pending messages that should be sent now
      const { data: pendingMessages, error: fetchErr } = await sb
        .from('chat_scheduled_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now);

      if (fetchErr) {
        console.error('[ChatScheduler] Error fetching pending messages:', fetchErr);
        return;
      }

      if (!pendingMessages || pendingMessages.length === 0) {
        return;
      }

      console.log(`[ChatScheduler] Found ${pendingMessages.length} scheduled messages to send.`);

      for (const schedMsg of pendingMessages) {
        try {
          // Check if thread still exists
          const { data: thread, error: threadErr } = await sb.from('chat_threads').select('type, group_id, message_ttl').eq('id', schedMsg.thread_id).single();
          if (threadErr || !thread) {
            console.error('[ChatScheduler] Thread fetch failed', threadErr);
            await sb.from('chat_scheduled_messages').update({ status: 'failed' }).eq('id', schedMsg.id);
            continue;
          }

          // Blocking: a DM to someone the sender blocked fails; a DM to someone who blocked the sender is
          // stored for the sender only and never delivered.
          let blockedRecipientId = null;
          if (thread.type === 'dm') {
            const block = await dmBlockState(schedMsg.thread_id, schedMsg.sender_id).catch(() => null);
            if (block?.iBlocked) {
              await sb.from('chat_scheduled_messages').update({ status: 'failed' }).eq('id', schedMsg.id);
              continue;
            }
            if (block?.blockedMe) blockedRecipientId = block.otherId;
          }

          // Check if group requires approval
          let msgStatus = 'approved';
          let groupName = 'Group';
          if (thread.type === 'group' && thread.group_id) {
            const { data: group } = await sb.from('chat_groups').select('require_message_approval, name').eq('id', thread.group_id).single();
            if (group) {
              groupName = group.name || 'Group';
              if (group.require_message_approval) {
                const { data: membership } = await sb.from('chat_thread_members').select('role').eq('thread_id', schedMsg.thread_id).eq('user_id', schedMsg.sender_id).single();
                if (membership?.role !== 'admin') {
                  msgStatus = 'pending';
                }
              }
            }
          }

          const expiresAt = thread.message_ttl && thread.message_ttl > 0
            ? new Date(Date.now() + thread.message_ttl * 1000).toISOString()
            : null;

          // Insert into chat_messages
          const { data: insertedMsg, error: insertErr } = await sb.from('chat_messages').insert({
            thread_id: schedMsg.thread_id,
            sender_id: schedMsg.sender_id,
            sender_name: schedMsg.sender_name,
            message: schedMsg.message,
            reply_to: schedMsg.reply_to,
            created_at: new Date().toISOString(),
            status: msgStatus,
            expires_at: expiresAt,
            requires_acknowledgement: false // Could be added to scheduled messages if needed
          }).select('id').single();

          if (insertErr) throw insertErr;
          if (blockedRecipientId) {
            await User.updateOne({ _id: blockedRecipientId }, { $addToSet: { hidden_chat_messages: insertedMsg.id } });
          }

          // Insert attachments if any
          const uploadedAttachments = schedMsg.attachments || [];
          const actualAttachments = [];
          if (uploadedAttachments.length > 0) {
            for (const att of uploadedAttachments) {
              const { data: savedAtt, error: attErr } = await sb.from('chat_attachments').insert({
                message_id: insertedMsg.id,
                file_url: att.file_url,
                file_name: att.file_name,
                file_type: att.file_type,
                file_size: att.file_size
              }).select().single();
              if (!attErr && savedAtt) actualAttachments.push(savedAtt);
            }
          }

          // Broadcast payload
          const broadcastPayload = {
            id: insertedMsg.id,
            thread_id: schedMsg.thread_id,
            sender_id: schedMsg.sender_id,
            sender_name: schedMsg.sender_name,
            message: schedMsg.message,
            reply_to: schedMsg.reply_to,
            is_deleted: false,
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
            attachments: actualAttachments,
          };

          // Mark as sent
          await sb.from('chat_scheduled_messages').update({ status: 'sent' }).eq('id', schedMsg.id);

          // Update thread metadata
          let lastMsgText = schedMsg.message || '';
          if (!lastMsgText && actualAttachments.length > 0) {
            lastMsgText = `[FILE] ${actualAttachments.length} files`;
          }
          if (!blockedRecipientId) await sb.from('chat_threads').update({ last_message: lastMsgText, last_message_at: new Date().toISOString() }).eq('id', schedMsg.thread_id);

          // Broadcast to connected clients
          broadcastToChannel(`thread:${schedMsg.thread_id}`, 'new_message', broadcastPayload);

          // Global notifications for sidebar updates
          sb.from('chat_thread_members').select('user_id').eq('thread_id', schedMsg.thread_id).then(async ({ data: members }) => {
            if (members) {
              const memberIds = members.map(m => m.user_id).filter(id => id !== schedMsg.sender_id && /^[0-9a-fA-F]{24}$/.test(id));
              let userMutes = {};
              const bellOff = new Set(); // turned off "All Notifications" or "Grid messages"
              if (memberIds.length > 0) {
                const users = await User.find({ _id: { $in: memberIds } }).select('_id muted_chat_threads inAppNotifications').lean();
                users.forEach(u => {
                  userMutes[u._id.toString()] = u.muted_chat_threads || [];
                  if (u.inAppNotifications?.global === false || u.inAppNotifications?.chat === false) bellOff.add(u._id.toString());
                });
              }
              const notificationsToInsert = [];
              members.forEach((m) => {
                if (blockedRecipientId && m.user_id === blockedRecipientId) return;
                // ALWAYS broadcast thread update so sender's sidebar refreshes immediately
                broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
                  threadId: schedMsg.thread_id, messageId: insertedMsg.id, message: broadcastPayload
                });
                
                // ONLY send actual notifications/dings/unread increments to other people
                if (m.user_id !== schedMsg.sender_id) {
                  // Increment Redis Unread Counters
                  incrUnreadSafe(m.user_id, schedMsg.thread_id);
                  const mentionMatches = schedMsg.message ? [...schedMsg.message.matchAll(/@\[[^\]]+\]\(([a-fA-F0-9]{24})\)/g)] : [];
                  const mentionIds = mentionMatches.map(match => match[1]);
                  if (mentionIds.includes(m.user_id)) {
                    incrMentionSafe(m.user_id, schedMsg.thread_id);
                  }

                  const mutes = userMutes[m.user_id] || [];
                  if (!mutes.includes(schedMsg.thread_id) && !bellOff.has(m.user_id)) {
                    notificationsToInsert.push({
                      recipient: m.user_id,
                      type: 'chat',
                      title: thread.type === 'group' ? `New scheduled message in ${groupName}` : `New message from ${schedMsg.sender_name}`,
                      message: lastMsgText,
                      link: `/platform/chat?threadId=${schedMsg.thread_id}`,
                      relatedId: schedMsg.thread_id,
                      isRead: false, emailSent: false, createdAt: new Date()
                    });
                  }
                }
              });
              if (notificationsToInsert.length > 0) {
                try { await Notification.insertMany(notificationsToInsert); } catch (e) { }
              }
            }
          }).catch(() => {});

        } catch (msgErr) {
          console.error(`[ChatScheduler] Failed to send scheduled message ${schedMsg.id}:`, msgErr);
          await sb.from('chat_scheduled_messages').update({ status: 'failed' }).eq('id', schedMsg.id);
        }
      }
    } catch (err) {
      console.error('[ChatScheduler] Cron Error:', err);
    }
  });
}
