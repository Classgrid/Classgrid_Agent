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
import express from 'express';
import multer from 'multer';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import { primarySupabaseClient } from '../config/supabaseClient.js';
import { broadcastToChannel } from '../services/realtimeBroadcast.js';
import { studentNotesClient } from '../config/supabaseClient.js';
import AIAssistantModule from '../services/ai/AIAssistantModule.js';
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";
import Notification from '../models/Notification.js';


const router = express.Router();
const sb = primarySupabaseClient;

// Multi-file upload: max 50 files, 40MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 }
});

// ──────────────────────────────────────────────
// RATE LIMITER (in-memory, per user, 30 msg/min)
// ──────────────────────────────────────────────
const rateLimitStore = {};
function checkRateLimit(userId) {
  const now = Date.now();
  if (!rateLimitStore[userId]) rateLimitStore[userId] = [];
  // Purge entries older than 60s
  rateLimitStore[userId] = rateLimitStore[userId].filter(ts => now - ts < 60000);
  if (rateLimitStore[userId].length >= 200) return false;
  rateLimitStore[userId].push(now);
  return true;
}

// ──────────────────────────────────────────────
// VALIDATION HELPERS
// ──────────────────────────────────────────────
async function validateThreadMembership(userId, threadId) {
  const { data, error } = await sb
    .from('chat_thread_members')
    .select('id, role')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data; // null if not a member
}

const ALLOWED_MIME_PREFIXES = ['image/', 'audio/', 'video/', 'application/pdf'];
const ALLOWED_MIME_EXACT = [
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-rar-compressed'
];

function isAllowedMime(mimeType) {
  if (ALLOWED_MIME_PREFIXES.some(p => mimeType.startsWith(p))) return true;
  return ALLOWED_MIME_EXACT.includes(mimeType);
}

// ──────────────────────────────────────────────
// GET /threads — List user's threads (LIMIT 50)
// ──────────────────────────────────────────────
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const orgId = req.user.organization_id?.toString();
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!orgId && !isSuperAdmin) return res.json({ threads: [] });

    // ── ROLE SYNC & AUTOMATION ──
    if (orgId && req.user.role) {
      const userRoleStr = req.user.role;
      try {
        const { data: autoGroups } = await sb.from('chat_groups').select('id, auto_add_roles, admin_roles').eq('org_id', orgId);
        if (autoGroups && autoGroups.length > 0) {
          const groupsToJoinAsMember = autoGroups.filter(g => (g.auto_add_roles || []).includes(userRoleStr)).map(g => g.id);
          const groupsToJoinAsAdmin = autoGroups.filter(g => (g.admin_roles || []).includes(userRoleStr)).map(g => g.id);
          const allGroupsToJoin = [...new Set([...groupsToJoinAsMember, ...groupsToJoinAsAdmin])];
          
          if (allGroupsToJoin.length > 0) {
            const { data: groupThreads } = await sb.from('chat_threads').select('id, group_id').in('group_id', allGroupsToJoin);
            if (groupThreads && groupThreads.length > 0) {
              const { data: myMems } = await sb.from('chat_thread_members').select('thread_id, role').eq('user_id', userId).in('thread_id', groupThreads.map(t => t.id));
              const myMemMap = {};
              (myMems || []).forEach(m => { myMemMap[m.thread_id] = m.role; });
              
              const newMemberships = [];
              const upgradeMemberships = [];
              for (const t of groupThreads) {
                const shouldBeAdmin = groupsToJoinAsAdmin.includes(t.group_id);
                const targetRole = shouldBeAdmin ? 'admin' : 'member';
                const currentRole = myMemMap[t.id];
                if (!currentRole) {
                  newMemberships.push({ thread_id: t.id, user_id: userId, role: targetRole, joined_at: new Date().toISOString() });
                } else if (shouldBeAdmin && currentRole !== 'admin') {
                  upgradeMemberships.push(t.id);
                }
              }
              if (newMemberships.length > 0) await sb.from('chat_thread_members').insert(newMemberships);
              if (upgradeMemberships.length > 0) await sb.from('chat_thread_members').update({ role: 'admin' }).eq('user_id', userId).in('thread_id', upgradeMemberships);
            }
          }
        }
      } catch (err) {
        console.error("Role Sync Error:", err);
      }
    }

    const filter = req.query.filter || 'All';

    // Get thread IDs where user is a member
    const { data: memberships, error: memErr } = await sb
      .from('chat_thread_members')
      .select('thread_id, role')
      .eq('user_id', userId);
    if (memErr) throw memErr;
    
    const myRoles = {};
    (memberships || []).forEach(m => { myRoles[m.thread_id] = m.role; });

    const threadIds = (memberships || []).map(m => m.thread_id);
    if (threadIds.length === 0) return res.json({ threads: [] });

    // Run threads + reads + members queries IN PARALLEL
    let threadQuery = sb.from('chat_threads').select('*').in('id', threadIds);
    if (!isSuperAdmin) {
      threadQuery = threadQuery.eq('org_id', orgId);
    }
    
    // Apply category filters
    if (filter === 'Groups') {
      threadQuery = threadQuery.eq('type', 'group');
    } else if (filter === 'Admins' || filter === 'Faculty') {
      threadQuery = threadQuery.eq('type', 'dm');
    }
    
    threadQuery = threadQuery.order('last_message_at', { ascending: false, nullsFirst: false }).limit(50);

    const [threadsResult, readsResult, userResult] = await Promise.all([
      threadQuery,
      sb.from('thread_reads').select('thread_id, last_read_at').eq('user_id', userId).in('thread_id', threadIds),
      User.findById(userId).select('muted_chat_threads').lean()
    ]);

    if (threadsResult.error) throw threadsResult.error;
    const threads = threadsResult.data || [];
    const readMap = {};
    (readsResult.data || []).forEach(r => { readMap[r.thread_id] = r.last_read_at; });
    const mutedThreads = new Set(userResult?.muted_chat_threads || []);

    // Now that we have threads, run DM members + group info IN PARALLEL
    const dmThreadIds = threads.filter(t => t.type === 'dm').map(t => t.id);
    const groupIds = threads.filter(t => t.type === 'group' && t.group_id).map(t => t.group_id);

    const [membersResult, groupsResult] = await Promise.all([
      dmThreadIds.length > 0
        ? sb.from('chat_thread_members').select('thread_id, user_id').in('thread_id', dmThreadIds).neq('user_id', userId)
        : { data: [] },
      groupIds.length > 0
        ? sb.from('chat_groups').select('*').in('id', groupIds)
        : { data: [] },
    ]);

    const otherMembers = membersResult.data || [];
    let groupInfoMap = {};
    (groupsResult.data || []).forEach(g => { groupInfoMap[g.id] = g; });

    // Get user profiles from MongoDB
    const otherUserIds = otherMembers.map(m => m.user_id).filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    let userMap = {};
    if (otherUserIds.length > 0) {
      const users = await User.find({ _id: { $in: otherUserIds } }).select('name profilePicture role email phoneNumber bio prn').lean();
      users.forEach(u => { userMap[u._id.toString()] = u; });
    }

    // Calculate unread counts per thread
    const unreadCountPromises = (threads || []).map(async (thread) => {
      const lastRead = readMap[thread.id];
      if (!lastRead) {
        // Never read — count all messages not from me
        const { count } = await sb
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', thread.id)
          .neq('sender_id', userId);
        return { threadId: thread.id, unread: count || 0 };
      }
      const { count } = await sb
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('thread_id', thread.id)
        .neq('sender_id', userId)
        .gt('created_at', lastRead);
      return { threadId: thread.id, unread: count || 0 };
    });
    const unreadResults = await Promise.all(unreadCountPromises);
    const unreadMap = {};
    unreadResults.forEach(r => { unreadMap[r.threadId] = r.unread; });

    // Build response
    const otherMemberMap = {};
    otherMembers.forEach(m => { otherMemberMap[m.thread_id] = m.user_id; });

    const formatted = (threads || []).map(thread => {
      if (thread.type === 'dm') {
        const otherUserId = otherMemberMap[thread.id];
        const otherUser = userMap[otherUserId];
        return {
          id: thread.id,
          type: 'dm',
          name: otherUser?.name || 'User',
          avatar: otherUser?.profilePicture || (otherUser?.name || 'U')[0].toUpperCase(),
          role: otherUser?.role ? (otherUser.role === 'super_admin' ? 'Super Admin' : otherUser.role.charAt(0).toUpperCase() + otherUser.role.slice(1).replace('_', ' ')) : '',
          otherUserId,
          email: otherUser?.email || '',
          phoneNumber: otherUser?.phoneNumber || '',
          bio: otherUser?.bio || '',
          prn: otherUser?.prn || '',
          lastMessage: thread.last_message,
          lastMessageAt: thread.last_message_at,
          unread: unreadMap[thread.id] || 0,
          createdAt: thread.created_at,
          isMuted: mutedThreads.has(thread.id),
        };
      } else {
        const group = groupInfoMap[thread.group_id] || {};
        return {
          id: thread.id,
          type: 'group',
          groupId: thread.group_id,
          name: group.name || 'Group',
          description: group.description || '',
          avatar: group.avatar_url || null,
          avatarColor: group.avatar_color || '#1a73e8',
          lastMessage: thread.last_message,
          lastMessageAt: thread.last_message_at,
          unread: unreadMap[thread.id] || 0,
          createdAt: thread.created_at,
          sendMessagesPolicy: group.send_message_policy || 'all',
          allowReplies: thread.allow_replies !== false,
          myRole: myRoles[thread.id] || 'member',
          isMuted: mutedThreads.has(thread.id),
          isOfficial: group.is_official || false,
        };
      }
    });

    // Apply role and unread filters AFTER formatting (since roles and unread counts are calculated here)
    let finalFormatted = formatted;
    if (filter === 'Unread') {
      finalFormatted = formatted.filter(t => t.unread > 0);
    } else if (filter === 'Admins') {
      finalFormatted = formatted.filter(t => t.role && t.role.toLowerCase().includes('admin'));
    } else if (filter === 'Faculty') {
      finalFormatted = formatted.filter(t => t.role && t.role.toLowerCase() === 'faculty');
    }

    res.json({ threads: finalFormatted });
  } catch (err) {
    console.error('Thread list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /threads/dm/:userId/shared-media — Get media, docs, links shared in a DM
// ──────────────────────────────────────────────
router.get('/:threadId/shared-media', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.threadId;

    // Fetch messages to extract links and get message IDs for attachments
    const { data: messages, error: msgErr } = await sb
      .from('chat_messages')
      .select('id, sender_id, sender_name, message, created_at, is_deleted')
      .eq('thread_id', threadId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (msgErr) throw msgErr;

    const messageIds = (messages || []).map(m => m.id);
    let attachments = [];
    if (messageIds.length > 0) {
      const { data: atts, error: attErr } = await sb
        .from('chat_attachments')
        .select('*')
        .in('message_id', messageIds);
      if (attErr) throw attErr;
      attachments = atts || [];
    }

    // Attach sender and timestamp info to attachments
    const messageMap = {};
    (messages || []).forEach(m => { messageMap[m.id] = m; });

    const media = [];
    const docs = [];
    const links = [];

    // Process Attachments
    attachments.forEach(att => {
      const msg = messageMap[att.message_id];
      if (!msg) return;

      const enrichedAtt = {
        ...att,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        created_at: msg.created_at
      };

      if (isAllowedMime(att.file_type)) {
        if (['image/', 'video/', 'audio/'].some(p => att.file_type.startsWith(p))) {
          media.push(enrichedAtt);
        } else {
          docs.push(enrichedAtt);
        }
      }
    });

    // Process Links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    (messages || []).forEach(msg => {
      if (!msg.message) return;
      const urls = msg.message.match(urlRegex);
      if (urls) {
        urls.forEach(url => {
          links.push({
            id: msg.id + '_' + url,
            url,
            sender_id: msg.sender_id,
            sender_name: msg.sender_name,
            created_at: msg.created_at
          });
        });
      }
    });

    res.json({ media, docs, links });
  } catch (err) {
    console.error('Get shared media error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /threads/dm/:userId/shared-media — Get media, docs, links shared in a DM
router.get('/dm/:userId/shared-media', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const otherId = req.params.userId;
    
    // Find DM thread ID
    const { data: myThreads } = await sb.from('chat_thread_members').select('thread_id').eq('user_id', myId);
    const { data: theirThreads } = await sb.from('chat_thread_members').select('thread_id').eq('user_id', otherId);

    const myThreadIds = new Set((myThreads || []).map(t => t.thread_id));
    const commonThreadIds = (theirThreads || []).filter(t => myThreadIds.has(t.thread_id)).map(t => t.thread_id);

    let threadId = null;
    if (commonThreadIds.length > 0) {
      const { data: dmThreads } = await sb.from('chat_threads').select('id').in('id', commonThreadIds).eq('type', 'dm').maybeSingle();
      if (dmThreads) threadId = dmThreads.id;
    }

    if (!threadId) {
      return res.json({ media: [], docs: [], links: [] });
    }

    // Fetch messages to extract links and get message IDs for attachments
    const { data: messages, error: msgErr } = await sb
      .from('chat_messages')
      .select('id, sender_id, sender_name, message, created_at, is_deleted')
      .eq('thread_id', threadId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (msgErr) throw msgErr;

    const messageIds = (messages || []).map(m => m.id);
    let attachments = [];
    if (messageIds.length > 0) {
      const { data: atts, error: attErr } = await sb
        .from('chat_attachments')
        .select('*')
        .in('message_id', messageIds);
      if (attErr) throw attErr;
      attachments = atts || [];
    }

    // Attach sender and timestamp info to attachments
    const messageMap = {};
    (messages || []).forEach(m => { messageMap[m.id] = m; });

    const media = [];
    const docs = [];
    const links = [];

    // Process Attachments
    attachments.forEach(att => {
      const msg = messageMap[att.message_id];
      if (!msg) return;

      const enrichedAtt = {
        ...att,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        created_at: msg.created_at
      };

      if (isAllowedMime(att.file_type)) {
        if (['image/', 'video/', 'audio/'].some(p => att.file_type.startsWith(p))) {
          media.push(enrichedAtt);
        } else {
          docs.push(enrichedAtt);
        }
      }
    });

    // Process Links (Regex to find URLs in message text)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    (messages || []).forEach(msg => {
      if (!msg.message) return;
      const urls = msg.message.match(urlRegex);
      if (urls) {
        urls.forEach(url => {
          links.push({
            id: msg.id + '_' + url,
            url,
            sender_id: msg.sender_id,
            sender_name: msg.sender_name,
            created_at: msg.created_at
          });
        });
      }
    });

    // Sort all arrays by created_at descending
    const sortDesc = (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    media.sort(sortDesc);
    docs.sort(sortDesc);
    links.sort(sortDesc);

    res.json({ media, docs, links });
  } catch (err) {
    console.error('Shared media error:', err);
    res.status(500).json({ error: err.message });
  }
});


// ──────────────────────────────────────────────
// POST /threads/dm/:userId — Find-or-create DM
// ──────────────────────────────────────────────
router.post('/dm/:userId', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const otherId = req.params.userId;
    const myOrgId = req.user.organization_id?.toString();
    const myRole = req.user.role;
    
    if (myId === otherId) return res.status(400).json({ error: 'Cannot message yourself' });

    // Verify other user exists
    const otherUser = await User.findById(otherId).select('name organization_id profilePicture role').lean();
    if (!otherUser) return res.status(404).json({ error: 'User not found' });

    const otherOrgId = otherUser.organization_id?.toString();
    const isCrossTenantAllowed = myRole === 'super_admin' || otherUser.role === 'super_admin';

    if (!isCrossTenantAllowed && (!myOrgId || myOrgId !== otherOrgId)) {
      return res.status(403).json({ error: 'Cannot message users from another organization' });
    }

    // Determine which org_id owns the thread (used for filtering)
    // If one is super_admin, the thread belongs to the standard user's org. If both super, it's null.
    const threadOrgId = myRole === 'super_admin' ? (otherOrgId || null) : myOrgId;

    // Find existing DM thread between these two users
    const { data: myThreads } = await sb
      .from('chat_thread_members')
      .select('thread_id')
      .eq('user_id', myId);

    const { data: theirThreads } = await sb
      .from('chat_thread_members')
      .select('thread_id')
      .eq('user_id', otherId);

    const myThreadIds = new Set((myThreads || []).map(t => t.thread_id));
    const commonThreadIds = (theirThreads || []).filter(t => myThreadIds.has(t.thread_id)).map(t => t.thread_id);

    if (commonThreadIds.length > 0) {
      // Check if any of these are DM threads
      const { data: dmThreads } = await sb
        .from('chat_threads')
        .select('*')
        .in('id', commonThreadIds)
        .eq('type', 'dm');

      if (dmThreads && dmThreads.length > 0) {
        return res.json({ thread: dmThreads[0], isNew: false });
      }
    }

    // Create new DM thread
    const { data: newThread, error: createErr } = await sb
      .from('chat_threads')
      .insert([{
        type: 'dm',
        org_id: threadOrgId,
        group_id: null,
        last_message: null,
        last_message_at: null,
      }])
      .select()
      .single();
    if (createErr) throw createErr;

    // Add both members
    const { error: memberErr } = await sb
      .from('chat_thread_members')
      .insert([
        { thread_id: newThread.id, user_id: myId, role: 'member' },
        { thread_id: newThread.id, user_id: otherId, role: 'member' },
      ]);
    if (memberErr) throw memberErr;

    res.status(201).json({ thread: newThread, isNew: true });
  } catch (err) {
    console.error('DM create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /threads/:id/messages — Cursor-based pagination
// ──────────────────────────────────────────────
router.get('/:id/messages', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const threadId = req.params.id;
    const { before } = req.query; // cursor timestamp

    // Run membership, messages, and user cleared_at query IN PARALLEL
    const [membershipResult, userResult] = await Promise.all([
      validateThreadMembership(userId, threadId),
      User.findById(userId).select('cleared_chat_threads').lean()
    ]);
    
    const membership = membershipResult;
    if (!membership) return res.status(403).json({ error: 'Not a member of this thread' });

    const isAdmin = membership.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'org_admin';

    let query = sb.from('chat_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: false }).limit(50);
    if (before) query = query.lt('created_at', before);
    
    // Status Filter for Pro ERP Backend
    if (!isAdmin) {
      // Normal members only see approved messages, or their own pending/rejected messages
      query = query.or(`status.eq.approved,sender_id.eq.${userId}`);
    }

    const { data: rawMessages, error } = await query;
    if (error) throw error;

    // Filter out messages older than the user's cleared_at timestamp for this thread, and filter out expired messages
    const clearedAt = userResult?.cleared_chat_threads?.[threadId];
    const now = new Date();
    const messages = (rawMessages || []).filter(m => {
      // Check cleared_at
      if (clearedAt && new Date(m.created_at) <= new Date(clearedAt)) return false;
      // Check expires_at
      if (m.expires_at && new Date(m.expires_at) <= now) return false;
      return true;
    });

    // Fetch attachments, reactions, and acknowledgements for these messages
    const messageIds = (messages || []).map(m => m.id);
    let attachments = [];
    let reactions = [];
    let acknowledgements = [];
    if (messageIds.length > 0) {
      const [attResult, reactResult, ackResult] = await Promise.all([
        sb.from('chat_attachments').select('*').in('message_id', messageIds),
        sb.from('chat_reactions').select('message_id, emoji, user_id').in('message_id', messageIds),
        sb.from('chat_message_acknowledgements').select('*').in('message_id', messageIds)
      ]);
      attachments = attResult.data || [];
      reactions = reactResult.data || [];
      acknowledgements = ackResult.data || [];
    }

    // Group attachments by message_id
    const attachmentMap = {};
    attachments.forEach(a => {
      if (!attachmentMap[a.message_id]) attachmentMap[a.message_id] = [];
      attachmentMap[a.message_id].push(a);
    });

    // Group reactions by message_id → emoji → [user_ids]
    const reactionMap = {};
    reactions.forEach(r => {
      if (!reactionMap[r.message_id]) reactionMap[r.message_id] = {};
      if (!reactionMap[r.message_id][r.emoji]) reactionMap[r.message_id][r.emoji] = [];
      reactionMap[r.message_id][r.emoji].push(r.user_id);
    });

    // Group acknowledgements by message_id
    const ackMap = {};
    acknowledgements.forEach(ack => {
      if (!ackMap[ack.message_id]) ackMap[ack.message_id] = [];
      ackMap[ack.message_id].push(ack);
    });

    // Fetch thread reads to determine 'isSeen' for sent messages
    const { data: reads } = await sb.from('thread_reads').select('user_id, last_read_at').eq('thread_id', threadId);
    // Find the latest read timestamp among OTHER users (for DMs)
    let latestOtherReadAt = null;
    if (reads && reads.length > 0) {
      const otherReads = reads.filter(r => r.user_id !== userId && r.last_read_at);
      if (otherReads.length > 0) {
        // use the most recent read timestamp among peers
        latestOtherReadAt = otherReads.reduce((max, r) => r.last_read_at > max ? r.last_read_at : max, otherReads[0].last_read_at);
      }
    }

    // Attach files + reactions to messages and reverse to chronological order
    const result = (messages || []).map(m => {
      // Message is seen if it was created before or exactly at the time another user read the thread
      const isSeen = latestOtherReadAt ? new Date(m.created_at) <= new Date(latestOtherReadAt) : false;
      const acks = ackMap[m.id] || [];
      const has_acknowledged = acks.some(a => a.user_id === userId);

      return {
        ...m,
        attachments: attachmentMap[m.id] || [],
        reactions: reactionMap[m.id] || {},
        acknowledgements: acks,
        isSeen,
        has_acknowledged,
        // Hide content for deleted messages
        message: m.is_deleted ? 'This message was deleted' : m.message,
      };
    }).reverse();

    res.json({ messages: result });
  } catch (err) {
    console.error('Message fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /threads/:id/messages — Send message (atomic)
// ──────────────────────────────────────────────
router.post('/:id/messages', isAuthenticated, upload.array('files', 50), async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const threadId = req.params.id;
    const { message, replyTo, scheduledFor, isSilent, priority, expiresAt } = req.body;
    const files = req.files || [];
    const msgText = message?.trim() || '';

    // Rate limit
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Max 200 messages per minute.' });
    }

    // Empty guard
    if (!msgText && files.length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Message length
    if (msgText.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    // ── PARALLEL: Validate membership + fetch thread in one round-trip ──
    const [membershipResult, threadResult] = await Promise.all([
      validateThreadMembership(userId, threadId),
      sb.from('chat_threads').select('org_id, type, group_id').eq('id', threadId).single(),
    ]);

    const membership = membershipResult;
    if (!membership) return res.status(403).json({ error: 'Not a member of this thread' });

    const thread = threadResult.data;
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    const isSuperAdmin = req.user.role === 'super_admin';
    if (!isSuperAdmin && thread.org_id && thread.org_id !== req.user.organization_id?.toString()) {
      return res.status(403).json({ error: 'Organization mismatch' });
    }

    // Check group policies
    let msgStatus = 'approved';
    const requires_acknowledgement = req.body.requires_acknowledgement === true || req.body.requires_acknowledgement === 'true';
    
    if (thread.type === 'group' && thread.group_id) {
      const { data: group } = await sb.from('chat_groups')
        .select('send_message_policy, send_attachments_policy, require_message_approval, reply_policy')
        .eq('id', thread.group_id)
        .single();
        
      if (group) {
        const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(req.user.role);
        const isFaculty = ['faculty', 'teacher', 'hod', 'principal', 'vice_principal'].includes(req.user.role);
        const isAdmin = membership.role === 'admin' || isOrgAdmin;

        // Check send_message_policy
        if (group.send_message_policy === 'admin_only' && !isAdmin) {
          return res.status(403).json({ error: 'Only admins can send messages in this group' });
        }
        if (group.send_message_policy === 'admin_faculty' && !isAdmin && !isFaculty) {
          return res.status(403).json({ error: 'Only admins and faculty can send messages in this group' });
        }
        
        // Check allow_replies on thread
        if (thread.allow_replies === false && !isAdmin) {
          return res.status(403).json({ error: 'Replies are disabled for this thread' });
        }

        // Check reply_policy
        if (replyTo && group.reply_policy) {
          if (group.reply_policy === 'admin_only' && !isAdmin) {
            return res.status(403).json({ error: 'Only admins can reply to messages in this group' });
          }
          if (group.reply_policy === 'admin_faculty' && !isAdmin && !isFaculty) {
            return res.status(403).json({ error: 'Only admins and faculty can reply to messages in this group' });
          }
        }

        // Check send_attachments_policy
        if (files && files.length > 0) {
          if (group.send_attachments_policy === 'admin_only' && !isAdmin) {
             return res.status(403).json({ error: 'Only admins can send attachments in this group' });
          }
          if (group.send_attachments_policy === 'admin_faculty' && !isAdmin && !isFaculty) {
             return res.status(403).json({ error: 'Only admins and faculty can send attachments in this group' });
          }
        }
        
        // Check message approval
        if (group.require_message_approval && !isAdmin) {
           msgStatus = 'pending';
        }
      }
    }

    // Validate file types (local, no DB call)
    for (const file of files) {
      if (!isAllowedMime(file.mimetype)) {
        return res.status(400).json({ error: `File type not allowed: ${file.mimetype}` });
      }
    }

    // Parse reply_to (local, no DB call)
    let replyData = null;
    if (replyTo) {
      try {
        replyData = typeof replyTo === 'string' ? JSON.parse(replyTo) : replyTo;
      } catch { replyData = null; }
    }

    // ── Handle Scheduled Messages (Pro V2) ──
    if (scheduledFor) {
      const scheduledTime = new Date(scheduledFor);
      if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
        return res.status(400).json({ error: 'scheduledFor must be a valid future date' });
      }
      
      const uploadedAttachments = [];
      for (const file of files) {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `chat/threads/${threadId}/${Date.now()}_${safeName}`;
        const publicUrl = await uploadBufferToR2(file.buffer, file.buffer.originalname || 'upload.file', file.buffer.mimetype || 'application/octet-stream', storagePath);
        uploadedAttachments.push({
          file_url: publicUrl,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size,
        });
      }

      const { data: schedMsg, error: schedErr } = await sb.from('chat_scheduled_messages').insert({
        thread_id: threadId,
        sender_id: userId,
        sender_name: req.user.name || 'User',
        message: msgText || '',
        reply_to: replyData,
        attachments: uploadedAttachments,
        scheduled_for: scheduledTime.toISOString(),
        status: 'pending'
      }).select().single();

      if (schedErr) {
         console.error("[Schedule Insert Error]", schedErr);
         return res.status(500).json({ error: 'Failed to schedule message' });
      }
      return res.status(201).json({ message: schedMsg, isScheduled: true });
    }

    // Insert message directly
    const now = new Date().toISOString();
    const { data: insertedMsg, error: insertErr } = await sb.from('chat_messages').insert({
      thread_id: threadId,
      sender_id: userId,
      sender_name: req.user.name || 'User',
      user_avatar: req.user.profilePicture || null,
      message: msgText || '',
      reply_to: replyData,
      created_at: now,
      status: msgStatus,
      requires_acknowledgement: requires_acknowledgement,
      is_silent: isSilent === 'true' || isSilent === true,
      priority: priority || 'normal',
      expires_at: expiresAt || null
    }).select('id').single();
    
    if (insertErr) {
      console.error("[Message Insert Error]", insertErr);
      return res.status(500).json({ error: 'Failed to send message' });
    }
    const msgId = insertedMsg.id;

    // Calculate last message text for sidebar snippet
    let lastMsgText = msgText || '';
    if (!lastMsgText && files && files.length > 0) {
      if (files.length === 1) {
        const mime = files[0].mimetype || '';
        if (mime.startsWith('image/')) lastMsgText = '[IMAGE] Photo';
        else if (mime.startsWith('video/')) lastMsgText = '[VIDEO] Video';
        else if (mime.startsWith('audio/')) lastMsgText = '[AUDIO] Audio';
        else if (mime === 'application/pdf') lastMsgText = '[PDF] Document';
        else if (mime.includes('word') || mime.includes('document')) lastMsgText = '[DOC] Document';
        else lastMsgText = '[FILE] Document';
      } else {
        lastMsgText = `[FILE] ${files.length} files`;
      }
    }

    // Update thread metadata manually
    sb.from('chat_threads')
      .update({ 
        last_message: lastMsgText, 
        last_message_at: now 
      })
      .eq('id', threadId)
      .then(() => {})
      .catch(() => {});

    // ── Build response from known data instead of re-fetching ──
    const broadcastPayload = {
      id: msgId,
      thread_id: threadId,
      sender_id: userId,
      sender_name: req.user.name || 'User',
      user_avatar: req.user.profilePicture || null,
      message: msgText || '',
      reply_to: replyData,
      is_deleted: false,
      created_at: now,
      is_silent: isSilent === 'true' || isSilent === true,
      priority: priority || 'normal',
      expires_at: expiresAt || null,
      attachments: [],
    };

    // ── Asynchronous Global Ping (Fire-and-forget) ──
    // Alert ALL thread members via their global user channel so their sidebars update
    sb.from('chat_thread_members').select('user_id').eq('thread_id', threadId).then(async ({ data: members }) => {
      if (members) {
        // Fetch user preferences to check mutes
        const memberIds = members.map(m => m.user_id).filter(id => id !== userId && /^[0-9a-fA-F]{24}$/.test(id));
        let userMutes = {};
        if (memberIds.length > 0) {
          const users = await User.find({ _id: { $in: memberIds } }).select('_id muted_chat_threads').lean();
          users.forEach(u => { userMutes[u._id.toString()] = u.muted_chat_threads || []; });
        }

        const notificationsToInsert = [];

        members.forEach((m) => {
          if (m.user_id !== userId) {
            broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
              threadId,
              messageId: msgId,
              message: broadcastPayload, // Instantly inject the full message for zero-latency sidebar updates!
            });

            // If not muted and not silent, add an in-app notification
            const mutes = userMutes[m.user_id] || [];
            if (!mutes.includes(threadId) && !(isSilent === 'true' || isSilent === true)) {
              notificationsToInsert.push({
                recipient: m.user_id,
                type: 'chat',
                title: thread.type === 'group' ? `New message in ${thread.name || 'Group'}` : `New message from ${req.user.name || 'User'}`,
                message: lastMsgText,
                link: `/platform/chat?threadId=${threadId}`,
                relatedId: threadId,
                isRead: false,
                emailSent: false,
                createdAt: new Date()
              });
            }
          }
        });

        if (notificationsToInsert.length > 0) {
          try {
            await Notification.insertMany(notificationsToInsert);
          } catch (e) {
            console.error("Failed to insert chat notifications:", e);
          }
        }
      }
    }).catch(err => console.error('Failed to broadcast to global channels:', err));

    // ── RESPOND IMMEDIATELY for text-only messages ──
    if (files.length === 0) {
      // Fire and forget server broadcast (do not await)
      broadcastToChannel(`thread:${threadId}`, 'new_message', broadcastPayload);
      res.status(201).json({ message: broadcastPayload });
      return;
    }

    // ── Files: update last_message + upload (slower path) ──
    sb.from('chat_threads')
      .update({ last_message: lastMsgText })
      .eq('id', threadId)
      .then(() => {})
      .catch(() => {});

    const uploadedAttachments = [];
    for (const file of files) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `chat/threads/${threadId}/${Date.now()}_${safeName}`;

      const publicUrl = await uploadBufferToR2(file.buffer, file.buffer.originalname || 'upload.file', file.buffer.mimetype || 'application/octet-stream', storagePath);
      /* Error handled by route try-catch */

      const signedData = { signedUrl: publicUrl }; /* Signed URL mocked by R2 public URL */

      const attRecord = {
        message_id: msgId,
        file_url: signedData?.signedUrl || storagePath,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
      };

      const { data: att, error: attErr } = await sb
        .from('chat_attachments')
        .insert([attRecord])
        .select()
        .single();
      if (!attErr && att) uploadedAttachments.push(att);
    }

    broadcastPayload.attachments = uploadedAttachments;

    // Broadcast with attachments
    broadcastToChannel(`thread:${threadId}`, 'new_message', broadcastPayload);

    res.status(201).json({ message: broadcastPayload });
  } catch (err) {
    console.error('Message send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /threads/:id/read — Mark thread as read
// ──────────────────────────────────────────────
router.post('/:id/read', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const threadId = req.params.id;

    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    // Upsert thread_reads
    const { error } = await sb
      .from('thread_reads')
      .upsert({
        thread_id: threadId,
        user_id: userId,
        last_read_at: new Date().toISOString(),
      }, { onConflict: 'thread_id,user_id' });
    if (error) throw error;

    // Broadcast read receipt (fire-and-forget — don't let Supabase Realtime failures crash this endpoint)
    broadcastToChannel(`thread:${threadId}`, 'read_receipt', {
      userId,
      lastReadAt: new Date().toISOString(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// DELETE /threads/:id/messages/:msgId — Soft delete
// ──────────────────────────────────────────────
router.delete('/:id/messages/:msgId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id: threadId, msgId } = req.params;

    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    // Verify message exists and belongs to sender
    const { data: msg } = await sb.from('chat_messages').select('sender_id').eq('id', msgId).single();
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_id !== userId) return res.status(403).json({ error: 'Can only delete your own messages' });

    // Delete attachments from DB (and optionally from storage)
    const { data: attachments } = await sb.from('chat_attachments').select('file_url').eq('message_id', msgId);
    await sb.from('chat_attachments').delete().eq('message_id', msgId);

    // Soft delete the message
    const { error } = await sb
      .from('chat_messages')
      .update({ message: 'This message was deleted', is_deleted: true })
      .eq('id', msgId);
    if (error) throw error;

    // Broadcast delete event (fire-and-forget)
    broadcastToChannel(`thread:${threadId}`, 'message_deleted', { messageId: msgId });

    res.json({ ok: true });
  } catch (err) {
    console.error('Message delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /threads/:id/messages/:msgId/reactions — Toggle reaction
// ──────────────────────────────────────────────
router.post('/:id/messages/:msgId/reactions', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const userName = req.user.name || 'User';
    const { id: threadId, msgId } = req.params;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    // Check if reaction already exists
    const { data: existing } = await sb
      .from('chat_reactions')
      .select('id')
      .eq('message_id', msgId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Remove reaction
      await sb.from('chat_reactions').delete().eq('id', existing.id);
    } else {
      // Add reaction
      await sb.from('chat_reactions').insert({
        message_id: msgId,
        user_id: userId,
        user_name: userName,
        emoji,
      });
    }

    // Fetch updated reactions for this message
    const { data: reactions } = await sb
      .from('chat_reactions')
      .select('emoji, user_id, user_name')
      .eq('message_id', msgId);

    // Group by emoji (include user_name for frontend display)
    const grouped = {};
    (reactions || []).forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push({ id: r.user_id, name: r.user_name });
    });

    // Broadcast to thread
    broadcastToChannel(`thread:${threadId}`, 'reaction_update', {
      messageId: msgId,
      reactions: grouped,
    });

    res.json({ ok: true, reactions: grouped });
  } catch (err) {
    console.error('Reaction toggle error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// PATCH /threads/:id/messages/:msgId — Edit message
// ──────────────────────────────────────────────
router.patch('/:id/messages/:msgId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id: threadId, msgId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    // Ensure the user actually sent this message
    const { data: existingMsg } = await sb
      .from('chat_messages')
      .select('sender_id, is_deleted')
      .eq('id', msgId)
      .maybeSingle();

    if (!existingMsg) return res.status(404).json({ error: 'Message not found' });
    if (existingMsg.sender_id !== userId) return res.status(403).json({ error: 'Cannot edit messages sent by others' });
    if (existingMsg.is_deleted) return res.status(400).json({ error: 'Cannot edit deleted messages' });

    // Update message
    const { error } = await sb
      .from('chat_messages')
      .update({ message: message.trim() })
      .eq('id', msgId);

    if (error) throw error;
    
    // Broadcast is handled by the client now

    res.json({ ok: true });
  } catch (err) {
    console.error('Message edit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// AI Assistant Routes
// ==========================================

// Summarize Thread
router.post('/:id/summarize', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const { data: messages, error } = await primarySupabaseClient
      .from('thread_messages')
      .select('message, sender_name, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!messages || messages.length === 0) return res.json({ summary: 'No messages to summarize.' });

    // Reverse to chronological
    const summary = await AIAssistantModule.summarizeThread(messages.reverse(), 'this thread');
    res.json({ summary });
  } catch (err) {
    console.error('AI Summary Error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Suggest Replies
router.post('/:id/suggest-replies', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const { data: messages, error } = await primarySupabaseClient
      .from('thread_messages')
      .select('message, sender_name, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!messages || messages.length === 0) return res.json({ replies: [] });

    const replies = await AIAssistantModule.suggestReplies(messages.reverse());
    res.json({ replies });
  } catch (err) {
    console.error('AI Smart Reply Error:', err);
    res.status(500).json({ error: 'Failed to generate smart replies' });
  }
});

// Convert to Notes
router.post('/:id/notes', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const studentId = req.user.id;

    // Fetch last 100 messages for deep context
    const { data: messages, error: fetchErr } = await primarySupabaseClient
      .from('thread_messages')
      .select('message, sender_name, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchErr) throw fetchErr;
    if (!messages || messages.length === 0) return res.status(400).json({ error: 'No chat history to convert.' });

    // Generate markdown string
    const markdownNotes = await AIAssistantModule.convertToNotes(messages.reverse());

    // Automatically push to the student's personal `student_notes` platform DB
    const { data: noteInsert, error: insertErr } = await studentNotesClient
      .from('student_notes')
      .insert({
        student_id: studentId,
        title: `Auto-Notes: Chat Thread Analysis`,
        content: markdownNotes,
        type: 'chat_summary',
        source_id: threadId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertErr) {
        console.error('Notes Save Error:', insertErr);
        // We can just return the text so the user still sees it instead of failing absolutely.
        return res.json({ notes: markdownNotes, saved: false });
    }

    res.json({ notes: markdownNotes, saved: true, noteId: noteInsert.id });
  } catch (err) {
    console.error('AI Convert to Notes Error:', err);
    res.status(500).json({ error: 'Failed to convert chat to notes' });
  }
});

// ==========================================
// Thread Management Routes
// ==========================================

// Clear Chat (Hide messages before now)
router.post('/:id/clear', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user._id.toString();
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.cleared_chat_threads) {
      user.cleared_chat_threads = new Map();
    }
    user.cleared_chat_threads.set(threadId, new Date());
    await user.save();
    
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Mute / Unmute Chat Thread
router.post('/:id/mute', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user._id.toString();
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let isMuted = false;
    if (user.muted_chat_threads.includes(threadId)) {
      user.muted_chat_threads = user.muted_chat_threads.filter(id => id !== threadId);
    } else {
      user.muted_chat_threads.push(threadId);
      isMuted = true;
    }
    await user.save();
    
    res.json({ success: true, isMuted });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read
router.post('/mark-all-read', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Just upsert for all active threads... but since we don't know them, we can do it by querying all user's threads first.
    const userThreads = await sb.from('chat_thread_members').select('thread_id').eq('user_id', userId);
    if (!userThreads.data) return res.json({ ok: true });

    const upserts = userThreads.data.map(t => ({
      thread_id: t.thread_id,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    }));

    await sb.from('thread_reads').upsert(upserts, { onConflict: 'thread_id,user_id' });

    res.json({ ok: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Bulk Mute
// ==========================================
router.post('/bulk-mute', isAuthenticated, async (req, res) => {
  try {
    const { threadIds } = req.body;
    if (!threadIds || !Array.isArray(threadIds)) return res.status(400).json({ error: 'Invalid threadIds' });

    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const muted = new Set(user.muted_chat_threads || []);
    threadIds.forEach(id => muted.add(id));

    user.muted_chat_threads = Array.from(muted);
    await user.save();

    res.json({ success: true, muted: user.muted_chat_threads });
  } catch (err) {
    console.error('Bulk mute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Bulk Delete
// ==========================================
router.post('/bulk-delete', isAuthenticated, async (req, res) => {
  try {
    const { threadIds } = req.body;
    if (!threadIds || !Array.isArray(threadIds)) return res.status(400).json({ error: 'Invalid threadIds' });

    const userId = req.user._id.toString();
    
    // For DMs, delete the thread_members record for this user (hide it)
    // For Groups, leave the group.
    
    for (const threadId of threadIds) {
      await sb.from('chat_thread_members').delete().match({ thread_id: threadId, user_id: userId });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete Chat
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user._id.toString();
    const isSuperAdmin = req.user.role === 'super_admin';

    const { data: member } = await sb
      .from('chat_thread_members')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member && !isSuperAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await sb.from('chat_threads').delete().eq('id', threadId);
    if (error) throw error;

    broadcastToChannel(threadId, { type: 'THREAD_DELETED', threadId });
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Disappearing Messages
// ==========================================
router.post('/:id/disappearing', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const { ttl } = req.body;
    const userId = req.user._id.toString();

    // Verify membership
    const { data: member } = await sb.from('chat_thread_members').select('id').eq('thread_id', threadId).eq('user_id', userId).maybeSingle();
    if (!member) return res.status(403).json({ error: 'Not a member' });

    // Format the time text
    let timeText = 'Off';
    if (ttl === 86400) timeText = '24 hours';
    else if (ttl === 604800) timeText = '7 days';
    else if (ttl === 7776000) timeText = '90 days';

    // Insert a system message noting the change
    const msgText = ttl === 0 
      ? `Disappearing messages were turned off.`
      : `Disappearing messages were set to ${timeText}.`;

    const { data: msg } = await sb.from('chat_messages').insert([{
      thread_id: threadId,
      sender_id: userId,
      message: JSON.stringify({ type: 'system', action: 'set_ttl', ttl, text: msgText }),
    }]).select().single();

    broadcastToChannel(`thread:${threadId}`, 'new_message', { ...msg, attachments: [], reactions: {} });
    res.json({ success: true, ttl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Thread Settings
// ==========================================
router.put('/:id/replies', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user._id.toString();
    const { allowReplies } = req.body;

    const { data: thread } = await sb.from('chat_threads').select('id, group_id').eq('id', threadId).single();
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    let isAdmin = false;
    if (thread.group_id) {
      const { data: membership } = await sb.from('chat_thread_members').select('role').eq('thread_id', threadId).eq('user_id', userId).single();
      const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(req.user.role);
      isAdmin = (membership?.role === 'admin') || isOrgAdmin;
    }

    if (!isAdmin) return res.status(403).json({ error: 'Only admins can change thread settings' });

    const { data, error } = await sb
      .from('chat_threads')
      .update({ allow_replies: allowReplies === true })
      .eq('id', threadId)
      .select()
      .single();

    if (error) throw error;
    
    // Broadcast the setting change
    broadcastToChannel(`thread:${threadId}`, 'thread_updated', { allow_replies: data.allow_replies });

    res.json({ success: true, allowReplies: data.allow_replies });
  } catch (err) {
    console.error('Thread replies error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Polls (Threads)
// ==========================================
router.post('/:id/polls', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const { question, options, allowMultiple } = req.body;
    const userId = req.user._id.toString();

    const { data: member } = await sb.from('chat_thread_members').select('id').eq('thread_id', threadId).eq('user_id', userId).maybeSingle();
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const { data: msg, error: insertErr } = await sb.from('chat_messages').insert([{
      thread_id: threadId,
      sender_id: userId,
      sender_name: req.user.name || 'User',
      user_avatar: req.user.profilePicture || null,
      message: 'Created a poll: ' + question,
    }]).select().single();
    if (insertErr) throw insertErr;

    await sb.from('chat_threads').update({
      last_message: '[POLL] ' + question,
      last_message_at: new Date().toISOString()
    }).eq('id', threadId);

    // Format options with IDs
    const formattedOptions = options.map((text, i) => ({
      id: String.fromCharCode(97 + i), // a, b, c, ...
      text: typeof text === 'string' ? text.trim() : text.text?.trim() || '',
    }));

    const { data: poll } = await sb.from('chat_polls').insert([{
      thread_id: threadId,
      message_id: msg.id,
      question,
      options: formattedOptions,
      allow_multiple: !!allowMultiple,
      created_by: userId
    }]).select().single();

    // Broadcast the message AND the poll so both appear in real-time
    broadcastToChannel(`thread:${threadId}`, 'new_message', {
      ...msg,
      sender_name: req.user.name || 'User',
      user_avatar: req.user.profilePicture || null,
      attachments: [],
      reactions: {},
    });
    broadcastToChannel(`thread:${threadId}`, 'new_poll', {
      poll: {
        ...poll,
        voteCounts: {},
        totalVoters: 0,
        myVotes: [],
      },
      messageId: msg.id,
    });
    res.status(201).json({ poll });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// GET /threads/:id/polls/:pollId/voters — Get poll voters
// ==========================================
router.get('/:id/polls/:pollId/voters', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id: threadId, pollId } = req.params;

    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const { data: votes, error } = await sb
      .from('chat_poll_votes')
      .select('option_id, user_id')
      .eq('poll_id', pollId);

    if (error) throw error;
    res.json({ votes: votes || [] });
  } catch (err) {
    console.error('Fetch poll voters error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/polls/:pollId/vote', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const pollId = req.params.pollId;
    const { optionId } = req.body;
    const userId = req.user._id.toString();

    const { data: poll } = await sb.from('chat_polls').select('*').eq('id', pollId).single();
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    if (!poll.allow_multiple) {
      await sb.from('chat_poll_votes').delete().eq('poll_id', pollId).eq('user_id', userId);
    }
    
    const { data: existing } = await sb.from('chat_poll_votes').select('id').eq('poll_id', pollId).eq('user_id', userId).eq('option_id', optionId).maybeSingle();
    
    if (existing) {
      await sb.from('chat_poll_votes').delete().eq('id', existing.id);
    } else {
      await sb.from('chat_poll_votes').insert([{ poll_id: pollId, user_id: userId, option_id: optionId }]);
    }

    const { data: allVotes } = await sb.from('chat_poll_votes').select('option_id, user_id').eq('poll_id', pollId);
    const voteCounts = {};
    (allVotes || []).forEach(v => {
      voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
    });

    broadcastToChannel(`thread:${threadId}`, 'poll_vote', { 
      pollId, 
      voteCounts,
      totalVoters: new Set((allVotes || []).map(v => v.user_id)).size 
    });
    res.json({ ok: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/polls/:pollId/voters', isAuthenticated, async (req, res) => {
  try {
    const pollId = req.params.pollId;
    const { data: votes } = await sb.from('chat_poll_votes').select('option_id, user_id').eq('poll_id', pollId);
    res.json({ votes: votes || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/polls', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const { data: polls } = await sb.from('chat_polls').select('*').eq('thread_id', threadId).order('created_at', { ascending: false });
    
    const result = await Promise.all((polls || []).map(async (poll) => {
      const { data: votes } = await sb.from('chat_poll_votes').select('option_id, user_id').eq('poll_id', poll.id);
      const voteCounts = {};
      const myVotes = [];
      let totalVoters = new Set();
      (votes || []).forEach(v => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
        totalVoters.add(v.user_id);
        if (v.user_id === req.user._id.toString()) myVotes.push(v.option_id);
      });
      return { ...poll, voteCounts, myVotes, totalVoters: totalVoters.size };
    }));

    res.json({ polls: result });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// Mute / Unmute Notifications
// ==========================================
router.post('/:id/mute', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let muted = user.muted_chat_threads || [];
    const isMuted = muted.includes(threadId);

    if (isMuted) {
      muted = muted.filter(id => id !== threadId);
    } else {
      muted.push(threadId);
    }

    user.muted_chat_threads = muted;
    await user.save();

    res.json({ success: true, isMuted: !isMuted });
  } catch (err) {
    console.error('Mute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Star / Unstar Message
// ==========================================
router.post('/messages/:id/star', isAuthenticated, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let starred = user.starred_chat_messages || [];
    const isStarred = starred.includes(messageId);

    if (isStarred) {
      starred = starred.filter(id => id !== messageId);
    } else {
      starred.push(messageId);
    }

    user.starred_chat_messages = starred;
    await user.save();

    res.json({ success: true, isStarred: !isStarred });
  } catch (err) {
    console.error('Star error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Get Starred Messages
// ==========================================
router.get('/starred-messages', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    const starredIds = user?.starred_chat_messages || [];

    if (starredIds.length === 0) return res.json({ messages: [] });

    // Fetch the actual messages from Supabase
    const { data: messages, error } = await sb
      .from('chat_messages')
      .select('*')
      .in('id', starredIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ messages: messages || [] });
  } catch (err) {
    console.error('Fetch starred error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Mark All as Read
// ==========================================
router.post('/read-all', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Find all thread IDs the user belongs to
    const { data: memberships } = await sb
      .from('chat_thread_members')
      .select('thread_id')
      .eq('user_id', userId);

    if (!memberships || memberships.length === 0) {
      return res.json({ success: true });
    }

    const threadIds = memberships.map(m => m.thread_id);
    const now = new Date().toISOString();

    // Upsert read records for all these threads
    const upserts = threadIds.map(tid => ({
      thread_id: tid,
      user_id: userId,
      last_read_at: now
    }));

    await sb.from('thread_reads').upsert(upserts, { onConflict: 'thread_id,user_id' });

    res.json({ success: true });
  } catch (err) {
    console.error('Read all error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Forward Messages
// ==========================================
router.post('/forward', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { messageIds, targetThreadIds } = req.body;

    if (!messageIds || !targetThreadIds || messageIds.length === 0 || targetThreadIds.length === 0) {
      return res.status(400).json({ error: 'Missing messageIds or targetThreadIds' });
    }

    // 1. Fetch original messages
    const { data: originalMessages, error: fetchErr } = await sb
      .from('chat_messages')
      .select('*')
      .in('id', messageIds)
      .eq('is_deleted', false);

    if (fetchErr || !originalMessages || originalMessages.length === 0) {
      return res.status(404).json({ error: 'Messages not found' });
    }

    // 2. Validate membership for all target threads
    const { data: memberships } = await sb
      .from('chat_thread_members')
      .select('thread_id')
      .eq('user_id', userId)
      .in('thread_id', targetThreadIds);

    const validThreadIds = memberships?.map(m => m.thread_id) || [];
    if (validThreadIds.length === 0) {
      return res.status(403).json({ error: 'Not a member of any of the target threads' });
    }

    // 3. Prepare new messages and attachments
    const newMessagesToInsert = [];
    
    // Sort original messages by creation time so they are forwarded in order
    const sortedMessages = originalMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const now = new Date().toISOString();

    for (const targetThreadId of validThreadIds) {
      for (const msg of sortedMessages) {
        newMessagesToInsert.push({
          thread_id: targetThreadId,
          sender_id: userId,
          sender_name: req.user.name || 'User',
          user_avatar: req.user.profilePicture || null,
          message: msg.message,
          reply_to: { isForwarded: true },
          created_at: now
        });
      }
    }

    // Insert new messages
    const { data: insertedMessages, error: insertErr } = await sb
      .from('chat_messages')
      .insert(newMessagesToInsert)
      .select('*');

    if (insertErr) {
      console.error("[Forward Insert Error]", insertErr);
      return res.status(500).json({ error: 'Failed to forward messages' });
    }

    // Note: If original messages had attachments, we would need to copy them in `chat_attachments`.
    // Since we don't have attachments grouped in original query, we can fetch them and copy them.
    const { data: originalAttachments } = await sb
      .from('chat_attachments')
      .select('*')
      .in('message_id', messageIds);

    let newAttachments = [];
    if (originalAttachments && originalAttachments.length > 0) {
      // Map new inserted messages back to original messages
      // This is slightly complex since we lose original mapping in the insert response if we don't track it.
      // But we inserted in order of validThreadIds x sortedMessages
      let index = 0;
      for (const targetThreadId of validThreadIds) {
        for (const msg of sortedMessages) {
          const newMsgId = insertedMessages[index]?.id;
          if (newMsgId) {
            const msgAttachments = originalAttachments.filter(a => a.message_id === msg.id);
            for (const att of msgAttachments) {
              newAttachments.push({
                message_id: newMsgId,
                file_url: att.file_url,
                file_name: att.file_name,
                file_type: att.file_type,
                file_size: att.file_size
              });
            }
          }
          index++;
        }
      }

      if (newAttachments.length > 0) {
        await sb.from('chat_attachments').insert(newAttachments);
      }
    }

    // 4. Update last_message metadata for all target threads
    const updatePromises = validThreadIds.map(tid => 
      sb.from('chat_threads')
        .update({ 
          last_message: 'Forwarded message', 
          last_message_at: now 
        })
        .eq('id', tid)
    );
    await Promise.all(updatePromises);

    // 5. Broadcast to all target threads
    for (const msg of insertedMessages || []) {
      const fullMsg = {
        ...msg,
        attachments: newAttachments?.filter(a => a.message_id === msg.id) || [],
        reactions: {},
        is_deleted: false
      };
      broadcastToChannel(`thread:${msg.thread_id}`, 'new_message', fullMsg);
    }

    res.json({ success: true, forwardedCount: insertedMessages?.length });
  } catch (err) {
    console.error('Forward error:', err);
    res.status(500).json({ error: err.message });
  }
});
// ──────────────────────────────────────────────
// PATCH /threads/:id/messages/:messageId/pin
// ──────────────────────────────────────────────
router.patch('/:id/messages/:messageId/pin', isAuthenticated, async (req, res) => {
  try {
    const { id: threadId, messageId } = req.params;
    const userId = req.user._id.toString();
    const { is_pinned } = req.body;

    const membership = await validateThreadMembership(userId, threadId);
    const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(req.user.role);
    if (!membership && !isOrgAdmin) return res.status(403).json({ error: 'Not authorized' });
    if (membership?.role !== 'admin' && !isOrgAdmin) return res.status(403).json({ error: 'Only admins can pin messages' });

    const { data: updated, error } = await sb.from('chat_messages').update({
      is_pinned,
      pinned_by: is_pinned ? userId : null,
      pinned_at: is_pinned ? new Date().toISOString() : null
    }).eq('id', messageId).eq('thread_id', threadId).select().single();

    if (error) throw error;
    
    // Audit Log
    const { data: thread } = await sb.from('chat_threads').select('group_id').eq('id', threadId).single();
    if (thread?.group_id) {
       await sb.from('chat_group_audit_logs').insert({
         group_id: thread.group_id, actor_id: userId, actor_name: req.user.name || 'Admin', action: is_pinned ? 'message_pinned' : 'message_unpinned'
       });
    }

    broadcastToChannel(`thread:${threadId}`, 'message_updated', updated);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// PATCH /threads/:id/messages/:messageId/approve
// ──────────────────────────────────────────────
router.patch('/:id/messages/:messageId/approve', isAuthenticated, async (req, res) => {
  try {
    const { id: threadId, messageId } = req.params;
    const userId = req.user._id.toString();
    const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(req.user.role);
    const membership = await validateThreadMembership(userId, threadId);
    if (membership?.role !== 'admin' && !isOrgAdmin) return res.status(403).json({ error: 'Only admins can approve messages' });

    const { data: updated, error } = await sb.from('chat_messages').update({
      status: 'approved', approved_by: userId, approved_at: new Date().toISOString()
    }).eq('id', messageId).eq('thread_id', threadId).select().single();
    if (error) throw error;

    broadcastToChannel(`thread:${threadId}`, 'message_updated', updated);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// PATCH /threads/:id/messages/:messageId/reject
// ──────────────────────────────────────────────
router.patch('/:id/messages/:messageId/reject', isAuthenticated, async (req, res) => {
  try {
    const { id: threadId, messageId } = req.params;
    const userId = req.user._id.toString();
    const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(req.user.role);
    const membership = await validateThreadMembership(userId, threadId);
    if (membership?.role !== 'admin' && !isOrgAdmin) return res.status(403).json({ error: 'Only admins can reject messages' });

    const { data: updated, error } = await sb.from('chat_messages').update({
      status: 'rejected', rejected_by: userId, rejected_at: new Date().toISOString(), rejection_reason: req.body.reason || null
    }).eq('id', messageId).eq('thread_id', threadId).select().single();
    if (error) throw error;

    broadcastToChannel(`thread:${threadId}`, 'message_updated', updated);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// PATCH /threads/:id/messages/:messageId/acknowledge
// ──────────────────────────────────────────────
router.patch('/:id/messages/:messageId/acknowledge', isAuthenticated, async (req, res) => {
  try {
    const { id: threadId, messageId } = req.params;
    const userId = req.user._id.toString();
    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const { error } = await sb.from('chat_message_acknowledgements').insert({
      message_id: messageId, user_id: userId, user_name: req.user.name || 'User', user_role: req.user.role || 'student'
    });
    if (error && error.code !== '23505') throw error; // Ignore duplicates

    const { data: acks } = await sb.from('chat_message_acknowledgements').select('*').eq('message_id', messageId);
    broadcastToChannel(`thread:${threadId}`, 'message_acknowledged', { message_id: messageId, acknowledgements: acks });
    res.json({ success: true, acknowledgements: acks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// GET /threads/:id/messages/scheduled — List scheduled messages
// ──────────────────────────────────────────────
router.get('/:id/messages/scheduled', isAuthenticated, async (req, res) => {
  try {
    const threadId = req.params.id;
    const userId = req.user._id.toString();
    const membership = await validateThreadMembership(userId, threadId);
    
    // Allow users to see their own scheduled messages, admins to see all
    const isAdmin = membership?.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'org_admin';
    if (!membership && !isAdmin) return res.status(403).json({ error: 'Not authorized' });

    let query = sb.from('chat_scheduled_messages').select('*').eq('thread_id', threadId).eq('status', 'pending');
    if (!isAdmin) {
       query = query.eq('sender_id', userId);
    }
    const { data: messages, error } = await query.order('scheduled_for', { ascending: true });
    
    if (error) throw error;
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// PATCH /threads/:id/messages/scheduled/:msgId — Edit a scheduled message
// ──────────────────────────────────────────────
router.patch('/:id/messages/scheduled/:msgId', isAuthenticated, async (req, res) => {
  try {
    const { id: threadId, msgId } = req.params;
    const userId = req.user._id.toString();
    const { message, scheduledFor } = req.body;
    
    const membership = await validateThreadMembership(userId, threadId);
    const isAdmin = membership?.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'org_admin';

    // Verify ownership or admin
    const { data: existing } = await sb.from('chat_scheduled_messages').select('sender_id, status').eq('id', msgId).single();
    if (!existing || existing.status !== 'pending') return res.status(404).json({ error: 'Scheduled message not found or not pending' });
    if (existing.sender_id !== userId && !isAdmin) return res.status(403).json({ error: 'Not authorized to edit this message' });

    const updates = {};
    if (message !== undefined) updates.message = message;
    if (scheduledFor !== undefined) {
      const scheduledTime = new Date(scheduledFor);
      if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) return res.status(400).json({ error: 'scheduledFor must be a valid future date' });
      updates.scheduled_for = scheduledTime.toISOString();
    }

    const { data: updated, error } = await sb.from('chat_scheduled_messages').update(updates).eq('id', msgId).select().single();
    if (error) throw error;
    res.json({ message: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// DELETE /threads/:id/messages/scheduled/:msgId — Cancel a scheduled message
// ──────────────────────────────────────────────
router.delete('/:id/messages/scheduled/:msgId', isAuthenticated, async (req, res) => {
  try {
    const { id: threadId, msgId } = req.params;
    const userId = req.user._id.toString();
    const membership = await validateThreadMembership(userId, threadId);
    const isAdmin = membership?.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'org_admin';

    // Verify ownership or admin
    const { data: existing } = await sb.from('chat_scheduled_messages').select('sender_id').eq('id', msgId).single();
    if (!existing) return res.status(404).json({ error: 'Scheduled message not found' });
    if (existing.sender_id !== userId && !isAdmin) return res.status(403).json({ error: 'Not authorized to cancel this message' });

    const { error } = await sb.from('chat_scheduled_messages').update({ status: 'cancelled' }).eq('id', msgId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
