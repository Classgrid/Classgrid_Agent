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

import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import { logGroupAudit } from '../services/chat-group-audit.service.js';
import { blockStateBetween, dmBlockState } from '../services/chat-block.service.js';
import { notifyChatEvent, shouldNotifyReaction } from '../services/chat-notify.service.js';
import Organization from '../models/Organization.js';
import { primarySupabaseClient } from '../config/supabaseClient.js';
import { broadcastToChannel } from '../services/realtimeBroadcast.js';
import { studentNotesClient } from '../config/supabaseClient.js';
import AIAssistantModule from '../services/ai/AIAssistantModule.js';
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";
import Notification from '../models/Notification.js';
import redis from '../config/redis.js';


const router = express.Router();
const sb = primarySupabaseClient;

// ──────────────────────────────────────────────
// REDIS UNREAD COUNTER HELPERS
// Key format: unread:{userId} → Hash { threadId: count }
// Falls back gracefully if Redis is unavailable (dev mode).
// ──────────────────────────────────────────────
const UNREAD_PREFIX = 'unread:';
const MENTION_PREFIX = 'unread_mentions:';

async function isRedisAvailable() {
  try {
    return redis && redis.status === 'ready';
  } catch { return false; }
}

async function incrUnread(userId, threadId) {
  try {
    if (!await isRedisAvailable()) return;
    await redis.hincrby(`${UNREAD_PREFIX}${userId}`, threadId, 1);
  } catch { /* Redis unavailable, unread counts will fall back to SQL */ }
}

async function incrUnreadMention(userId, threadId) {
  try {
    if (!await isRedisAvailable()) return;
    await redis.hincrby(`${MENTION_PREFIX}${userId}`, threadId, 1);
  } catch { /* Redis unavailable */ }
}

async function resetUnread(userId, threadId) {
  try {
    if (!await isRedisAvailable()) return;
    await Promise.all([
      redis.hdel(`${UNREAD_PREFIX}${userId}`, threadId),
      redis.hdel(`${MENTION_PREFIX}${userId}`, threadId)
    ]);
  } catch { /* Redis unavailable */ }
}

async function getUnreadCounts(userId) {
  try {
    if (!await isRedisAvailable()) return null; // null = fallback to SQL
    
    // Cache-aside pattern: check if Redis was populated for this user
    const isInitialized = await redis.get(`unread_init:${userId}`);
    if (!isInitialized) return null; // Force SQL fallback to repopulate Redis

    const [unreadHash, mentionHash] = await Promise.all([
      redis.hgetall(`${UNREAD_PREFIX}${userId}`),
      redis.hgetall(`${MENTION_PREFIX}${userId}`)
    ]);
    return { unread: unreadHash || {}, mentions: mentionHash || {} };
  } catch { return null; }
}

// Multi-file upload: max 80 files total, max 100MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 }
});

// CRON: Unpin expired messages
// Endpoint for cron-job.org to automatically unpin messages that have exceeded their duration
router.get('/cron/unpin-expired', async (req, res) => {
  try {
    const secret = req.query.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date().toISOString();
    
    // Find expired pinned messages
    const { data: expiredMessages, error: fetchError } = await sb
      .from('chat_messages')
      .select('id, thread_id')
      .eq('is_pinned', true)
      .lt('pinned_until', now);
      
    if (fetchError) throw fetchError;
    if (!expiredMessages || expiredMessages.length === 0) {
      return res.json({ success: true, message: 'No expired pins found' });
    }
    
    // Update them
    const expiredIds = expiredMessages.map(m => m.id);
    const { error: updateError } = await sb
      .from('chat_messages')
      .update({ is_pinned: false, pinned_until: null })
      .in('id', expiredIds);
      
    if (updateError) throw updateError;
    
    // Broadcast updates for each thread
    const threadIds = [...new Set(expiredMessages.map(m => m.thread_id))];
    for (const threadId of threadIds) {
      const messagesForThread = expiredMessages.filter(m => m.thread_id === threadId);
      for (const msg of messagesForThread) {
        broadcastToChannel(threadId, 'message_update', {
          id: msg.id,
          is_pinned: false,
          pinned_until: null
        });
      }
    }
    
    res.json({ success: true, count: expiredIds.length });
  } catch (error) {
    console.error('Cron unpin error:', error);
    res.status(500).json({ error: 'Failed to unpin messages' });
  }
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

const ALLOWED_MIME_PREFIXES = ['image/', 'audio/', 'video/', 'application/pdf', 'text/'];
const ALLOWED_MIME_EXACT = [
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-rar-compressed',
  'application/octet-stream',
  'application/json',
  'application/rtf'
];

function isAllowedMime(mimeType) {
  if (!mimeType) return true; // allow if browser fails to determine
  if (ALLOWED_MIME_PREFIXES.some(p => mimeType.startsWith(p))) return true;
  return ALLOWED_MIME_EXACT.includes(mimeType);
}

function toStorageSlug(value, fallback = 'unknown') {
  const raw = String(value || fallback).trim().toLowerCase();
  const ascii = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
}

function shortStorageId(value) {
  return String(value || 'unknown').replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'unknown';
}

function getChatFileFolder(mimeType = '') {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdfs';
  if (mimeType.includes('word') || mimeType.includes('presentation') || mimeType.includes('spreadsheet')) return 'documents';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archives';
  return 'files';
}

function buildLastMessagePreview(msgText, files, isPoll = false, isDeleted = false) {
  if (isDeleted) return 'This message was deleted';
  
  if (isPoll) {
    return '[POLL] ' + msgText;
  }

  // If there are files
  if (files && files.length > 0) {
    if (files.length === 1) {
      const mime = files[0].mimetype || files[0].file_type || '';
      const originalName = files[0].originalname || files[0].file_name || 'Document';
      let prefix = '[FILE]';
      let defaultText = originalName;

      if (mime.startsWith('image/')) {
        prefix = '[IMAGE]';
        defaultText = 'Photo';
      } else if (mime.startsWith('video/')) {
        prefix = '[VIDEO]';
        defaultText = 'Video';
      } else if (mime.startsWith('audio/')) {
        prefix = '[AUDIO]';
        defaultText = (mime.includes('webm') || mime.includes('ogg')) ? 'Voice message' : 'Audio';
      } else if (mime === 'application/pdf') {
        prefix = '[PDF]';
      } else if (mime.includes('word') || mime.includes('document')) {
        prefix = '[DOC]';
      }

      // If it has a caption, return prefix + caption
      if (msgText && msgText.trim()) {
        return `${prefix} ${msgText.trim()}`;
      }
      // Without caption
      return `${prefix} ${defaultText}`;
    } else {
      return `[FILE] ${files.length} files`;
    }
  }

  // Normal text, reply, forwarded
  return msgText || '';
}

function sanitizeStorageFileName(fileName) {
  const fallback = `upload-${Date.now()}`;
  return String(fileName || fallback)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120) || fallback;
}

async function getChatStorageContext(thread, threadId, group) {
  let orgLabel = thread.org_id || 'platform';

  if (thread.org_id && /^[0-9a-fA-F]{24}$/.test(thread.org_id)) {
    try {
      const org = await Organization.findById(thread.org_id)
        .select('name sidebar_name subdomain')
        .lean();
      orgLabel = org?.subdomain || org?.sidebar_name || org?.name || orgLabel;
    } catch (err) {
      console.warn('[Chat Storage] Failed to resolve organization name:', err.message);
    }
  }

  const chatLabel = thread.type === 'group'
    ? group?.name || `group-${thread.group_id || threadId}`
    : `direct-message-${threadId}`;

  return {
    orgFolder: `${toStorageSlug(orgLabel, 'platform')}-${shortStorageId(thread.org_id)}`,
    chatTypeFolder: thread.type === 'group' ? 'groups' : 'direct-messages',
    chatFolder: `${toStorageSlug(chatLabel, thread.type === 'group' ? 'group-chat' : 'direct-message')}-${shortStorageId(threadId)}`,
  };
}

function buildChatAttachmentStoragePath(file, context) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safeName = sanitizeStorageFileName(file.originalname);
  const folder = getChatFileFolder(file.mimetype || '');
  const storageContext = context || { orgFolder: 'platform-unknown', chatTypeFolder: 'unknown-chat', chatFolder: 'thread-unknown' };

  return [
    'chat',
    'orgs',
    storageContext.orgFolder,
    storageContext.chatTypeFolder,
    storageContext.chatFolder,
    folder,
    year,
    month,
    `${Date.now()}-${randomUUID()}-${safeName}`,
  ].join('/');
}

// ──────────────────────────────────────────────
// GET /link-preview - Fetch OpenGraph metadata
// ──────────────────────────────────────────────
router.get('/link-preview', isAuthenticated, async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'url is required' });

  try {
    const urlObj = new URL(targetUrl);
    
    // Check cache
    const cacheKey = `link_preview:${targetUrl}`;
    if (await isRedisAvailable()) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    // Fetch HTML (timeout 3s, max 1MB)
    const response = await fetch(targetUrl, {
      signal: AbortSignal.timeout(3000),
      headers: { 'User-Agent': 'ClassgridBot/1.0 (+https://classgrid.com)' }
    });
    
    if (!response.ok) throw new Error('Failed to fetch');
    const html = await response.text();
    
    // Quick regex parse for OG tags
    const getMeta = (property) => {
      const match = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i')) || 
                    html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i'));
      return match ? match[1] : null;
    };
    
    // Fallbacks
    const getTitleFallback = () => {
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? match[1].trim() : urlObj.hostname;
    };

    const getDescFallback = () => {
      const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      return match ? match[1] : null;
    };

    const previewData = {
      title: getMeta('title') || getTitleFallback(),
      description: getMeta('description') || getDescFallback(),
      image: getMeta('image'),
      url: targetUrl,
      domain: urlObj.hostname
    };

    // Store in cache for 24h
    if (await isRedisAvailable()) {
      await redis.set(cacheKey, JSON.stringify(previewData), 'EX', 86400);
    }

    res.json(previewData);
  } catch (err) {
    console.error('[Link Preview Error]', err.message);
    // Generic fallback for failed fetches
    try {
      const urlObj = new URL(targetUrl);
      res.json({ title: urlObj.hostname, description: null, image: null, url: targetUrl, domain: urlObj.hostname });
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
    }
  }
});

// ──────────────────────────────────────────────
// GET /search — Global Message Search
// ──────────────────────────────────────────────
router.get('/search', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { query, threadId, senderId, hasMedia, dateFrom, dateTo } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Find all threads the user is a member of
    let accessibleThreadIds = [];
    if (threadId) {
      // Validate membership in the specified thread
      const membership = await validateThreadMembership(userId, threadId);
      if (!membership) return res.status(403).json({ error: 'Not a member of this thread' });
      accessibleThreadIds = [threadId];
    } else {
      const { data: myThreads } = await sb.from('chat_thread_members').select('thread_id').eq('user_id', userId);
      accessibleThreadIds = (myThreads || []).map(t => t.thread_id);
    }

    if (accessibleThreadIds.length === 0) {
      return res.json({ results: [] });
    }

    // Build the query — use full-text search (GIN indexed) with ILIKE fallback
    // Convert search terms to tsquery format: "hello world" → "hello & world"
    const tsQuery = query.trim().split(/\s+/).filter(Boolean).join(' & ');

    let supabaseQuery = sb.from('chat_messages')
      .select(`
        *,
        chat_threads (id, name, type)
      `)
      .in('thread_id', accessibleThreadIds)
      .order('created_at', { ascending: false })
      .limit(50);

    // Try full-text search first (requires migration), fall back to ILIKE
    if (tsQuery) {
      supabaseQuery = supabaseQuery.textSearch('search_vector', tsQuery, { type: 'plain' });
    } else {
      supabaseQuery = supabaseQuery.ilike('message', `%${query}%`);
    }

    if (senderId) supabaseQuery = supabaseQuery.eq('sender_id', senderId);
    if (dateFrom) supabaseQuery = supabaseQuery.gte('created_at', new Date(dateFrom).toISOString());
    if (dateTo) supabaseQuery = supabaseQuery.lte('created_at', new Date(dateTo).toISOString());

    let { data: messages, error } = await supabaseQuery;

    // Fallback: if search_vector column doesn't exist yet, retry with ILIKE
    if (error && error.message && error.message.includes('search_vector')) {
      console.warn('[Search] search_vector column not found, falling back to ILIKE. Run the add_fulltext_search.sql migration.');
      supabaseQuery = sb.from('chat_messages')
        .select(`*, chat_threads (id, name, type)`)
        .in('thread_id', accessibleThreadIds)
        .ilike('message', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (senderId) supabaseQuery = supabaseQuery.eq('sender_id', senderId);
      if (dateFrom) supabaseQuery = supabaseQuery.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) supabaseQuery = supabaseQuery.lte('created_at', new Date(dateTo).toISOString());
      const fallbackResult = await supabaseQuery;
      messages = fallbackResult.data;
      error = fallbackResult.error;
    }
    if (error) throw error;

    // Filter out messages deleted for this user
    let results = (messages || []).filter(m => !(m.deleted_for || []).includes(userId) && !m.is_deleted);

    // Filter out expired messages
    const now = new Date();
    results = results.filter(m => !m.expires_at || new Date(m.expires_at) > now);

    res.json({ results });
  } catch (err) {
    console.error('[Global Search]', err);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

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
      .select('thread_id, role, is_pinned, is_archived')
      .eq('user_id', userId);
    if (memErr) throw memErr;

    const myRoles = {};
    const myPins = {};
    const myArchives = {};
    (memberships || []).forEach(m => { 
      myRoles[m.thread_id] = m.role; 
      myPins[m.thread_id] = m.is_pinned;
      myArchives[m.thread_id] = m.is_archived;
    });

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
      User.findById(userId).select('muted_chat_threads cleared_chat_threads').lean()
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
      const users = await User.find({ _id: { $in: otherUserIds } }).select('name profilePicture role email phoneNumber bio prn blocked_users').lean();
      const viewerId = req.user._id.toString();
      users.forEach(u => {
        // This person blocked me: only their name, no photo / bio / contact details (WhatsApp-style)
        if ((u.blocked_users || []).includes(viewerId)) {
          u.profilePicture = null; u.bio = null; u.phoneNumber = null; u.email = null;
        }
        delete u.blocked_users;
        userMap[u._id.toString()] = u;
      });
    }

    // Calculate unread counts per thread — Redis first, SQL fallback
    let unreadMap = {};
    let mentionMap = {};
    const redisCounts = await getUnreadCounts(userId);
    if (redisCounts) {
      // Fast path: Redis has the counts (single HGETALL call instead of ~100 SQL queries)
      (threads || []).forEach(thread => {
        unreadMap[thread.id] = parseInt(redisCounts.unread[thread.id] || '0', 10);
        mentionMap[thread.id] = parseInt(redisCounts.mentions[thread.id] || '0', 10);
      });
    } else {
      // Slow fallback: Redis unavailable (dev mode), use SQL counts
      const unreadCountPromises = (threads || []).map(async (thread) => {
        const lastRead = readMap[thread.id];
        let unreadQuery = sb
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', thread.id)
          .neq('sender_id', userId);
        
        let mentionQuery = sb
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', thread.id)
          .neq('sender_id', userId)
          .contains('mentioned_users', [userId]);

        if (lastRead) {
          unreadQuery = unreadQuery.gt('created_at', lastRead);
          mentionQuery = mentionQuery.gt('created_at', lastRead);
        }

        const [unreadRes, mentionRes] = await Promise.all([unreadQuery, mentionQuery]);
        return { threadId: thread.id, unread: unreadRes.count || 0, unreadMentions: mentionRes.count || 0 };
      });
      const unreadResults = await Promise.all(unreadCountPromises);
      unreadResults.forEach(r => { 
        unreadMap[r.threadId] = r.unread; 
        mentionMap[r.threadId] = r.unreadMentions;
      });

      // Repopulate Redis cache (fire-and-forget)
      isRedisAvailable().then(available => {
        if (available) {
          const multi = redis.multi();
          unreadResults.forEach(r => {
            if (r.unread > 0) multi.hset(`${UNREAD_PREFIX}${userId}`, r.threadId, r.unread);
            if (r.unreadMentions > 0) multi.hset(`${MENTION_PREFIX}${userId}`, r.threadId, r.unreadMentions);
          });
          // Set init flag so future requests use Redis instead of SQL fallback
          multi.set(`unread_init:${userId}`, '1', 'EX', 60 * 60 * 24 * 7); // 7 day TTL
          multi.exec().catch(err => console.error('Failed to repopulate Redis unread:', err));
        }
      });
    }

    // Build response
    const otherMemberMap = {};
    otherMembers.forEach(m => { otherMemberMap[m.thread_id] = m.user_id; });

    const formatted = (threads || []).map(thread => {
      const clearedAt = userResult?.cleared_chat_threads?.[thread.id];
      const threadLastMsgAt = thread.last_message_at ? new Date(thread.last_message_at) : null;
      let displayLastMessage = thread.last_message;

      if (clearedAt && threadLastMsgAt && threadLastMsgAt <= new Date(clearedAt)) {
        displayLastMessage = '';
      }

      if (thread.type === 'dm') {
        const otherUserId = otherMemberMap[thread.id];
        const otherUser = userMap[otherUserId];
        return {
          id: thread.id,
          type: 'dm',
          name: otherUser?.name || 'User',
          avatar: otherUser?.profilePicture || (otherUser?.name || 'U')[0].toUpperCase(),
          role: otherUser?.role ? (otherUser.role === 'super_admin' ? 'Classgrid Staff' : otherUser.role.charAt(0).toUpperCase() + otherUser.role.slice(1).replace('_', ' ')) : '',
          otherUserId,
          email: otherUser?.email || '',
          phoneNumber: otherUser?.phoneNumber || '',
          bio: otherUser?.bio || '',
          prn: otherUser?.prn || '',
          lastMessage: displayLastMessage,
          lastMessageAt: thread.last_message_at,
          unread: unreadMap[thread.id] || 0,
          unreadMentions: mentionMap[thread.id] || 0,
          createdAt: thread.created_at,
          isMuted: mutedThreads.has(thread.id),
          isPinned: myPins[thread.id] || false,
          isArchived: myArchives[thread.id] || false,
          messageTtl: thread.message_ttl || 0,
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
          lastMessage: displayLastMessage,
          lastMessageAt: thread.last_message_at,
          unread: unreadMap[thread.id] || 0,
          unreadMentions: mentionMap[thread.id] || 0,
          createdAt: thread.created_at,
          sendMessagesPolicy: group.send_message_policy || 'all',
          allowReplies: thread.allow_replies !== false,
          myRole: myRoles[thread.id] || 'member',
          isMuted: mutedThreads.has(thread.id),
          isPinned: myPins[thread.id] || false,
          isArchived: myArchives[thread.id] || false,
          isOfficial: group.is_official || false,
          messageTtl: thread.message_ttl || 0,
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
// POST /threads/:id/pin — Toggle pin status of a thread
// ──────────────────────────────────────────────
router.post('/:id/pin', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const threadId = req.params.id;
    const { is_pinned } = req.body;

    const { data: membership } = await sb
      .from('chat_thread_members')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this thread' });
    }

    const { error } = await sb
      .from('chat_thread_members')
      .update({ is_pinned: !!is_pinned })
      .eq('thread_id', threadId)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true, is_pinned: !!is_pinned });
  } catch (err) {
    console.error('Pin thread error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /threads/:id/archive — Toggle archive status of a thread
// ──────────────────────────────────────────────
router.post('/:id/archive', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const threadId = req.params.id;
    const { is_archived } = req.body;

    const { data: membership } = await sb
      .from('chat_thread_members')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this thread' });
    }

    const { error } = await sb
      .from('chat_thread_members')
      .update({ is_archived: !!is_archived })
      .eq('thread_id', threadId)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true, is_archived: !!is_archived });
  } catch (err) {
    console.error('Archive thread error:', err);
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

    // Existing DMs above still open (so a blocker can unblock from the chat); new ones are refused.
    const dmBlock = await blockStateBetween(myId, otherId);
    if (dmBlock.iBlocked) return res.status(403).json({ error: 'You blocked this contact. Unblock to send messages.', code: 'you_blocked' });

    // Create new DM thread
    const { data: newThread, error: createErr } = await sb
      .from('chat_threads')
      .insert([{
        type: 'dm',
        org_id: threadOrgId || null,
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

    // Broadcast to both users so the new DM instantly appears in their sidebars
    broadcastToChannel(`user:${myId}`, 'thread_updated', { threadId: newThread.id, action: 'new_group' });
    if (!dmBlock.blockedMe) broadcastToChannel(`user:${otherId}`, 'thread_updated', { threadId: newThread.id, action: 'new_group' });

    res.status(201).json({ thread: newThread, isreturnDocument: 'after' });
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
      User.findById(userId).select('cleared_chat_threads hidden_chat_messages blocked_users').lean()
    ]);

    const membership = membershipResult;
    if (!membership) return res.status(403).json({ error: 'Not a member of this thread' });
    const myBlocked = new Set((userResult?.blocked_users || []).map(String));

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
    const hiddenMessages = userResult?.hidden_chat_messages || [];
    const now = new Date();
    const messages = (rawMessages || []).filter(m => {
      // Check if deleted for me
      if (hiddenMessages.includes(m.id) || (m.deleted_for && m.deleted_for.includes(userId))) return false;
      // Check cleared_at
      if (clearedAt && new Date(m.created_at) <= new Date(clearedAt)) return false;
      // Check expires_at
      if (m.expires_at && new Date(m.expires_at) <= now) return false;
      return true;
    });

    // Fetch attachments, reactions, acknowledgements, AND thread reads ALL IN PARALLEL
    const messageIds = (messages || []).map(m => m.id);
    let attachments = [];
    let reactions = [];
    let acknowledgements = [];
    let reads = [];
    if (messageIds.length > 0) {
      const [attResult, reactResult, ackResult, readsResult] = await Promise.all([
        sb.from('chat_attachments').select('*').in('message_id', messageIds),
        sb.from('chat_reactions').select('message_id, emoji, user_id').in('message_id', messageIds),
        sb.from('chat_message_acknowledgements').select('*').in('message_id', messageIds),
        sb.from('thread_reads').select('user_id, last_read_at').eq('thread_id', threadId)
      ]);
      attachments = attResult.data || [];
      reactions = reactResult.data || [];
      acknowledgements = ackResult.data || [];
      reads = readsResult.data || [];
    } else {
      // No messages, but still fetch reads for consistency
      const readsResult = await sb.from('thread_reads').select('user_id, last_read_at').eq('thread_id', threadId);
      reads = readsResult.data || [];
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
    // Find the latest read timestamp among OTHER users (for DMs)
    let latestOtherReadAt = null;
    if (reads && reads.length > 0) {
      let otherReads = reads.filter(r => r.user_id !== userId && r.last_read_at);
      // Blocking hides read receipts both ways: no blue ticks from someone who blocked me or whom I blocked.
      if (otherReads.length > 0) {
        const ids = otherReads.map(r => r.user_id).filter(id => /^[0-9a-fA-F]{24}$/.test(id));
        const blockedMeDocs = ids.length ? await User.find({ _id: { $in: ids }, blocked_users: userId }).select('_id').lean() : [];
        const blockedMe = new Set(blockedMeDocs.map(d => String(d._id)));
        otherReads = otherReads.filter(r => !blockedMe.has(String(r.user_id)) && !myBlocked.has(String(r.user_id)));
      }
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
router.post('/:id/messages', isAuthenticated, upload.array('files', 80), async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const threadId = req.params.id;
    const { message, replyTo, scheduledFor, isSilent, priority, expiresAt, mentionedUsers } = req.body;
    const files = req.files || [];
    const preuploaded_attachments = req.body.preuploaded_attachments ? JSON.parse(req.body.preuploaded_attachments) : [];
    const msgText = message?.trim() || '';

    // Rate limit
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Max 200 messages per minute.' });
    }

    // Empty guard
    if (!msgText && files.length === 0 && preuploaded_attachments.length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Message length
    if (msgText.length > 65536) {
      return res.status(400).json({ error: 'Message too long (max 65536 characters)' });
    }

    // ── PARALLEL: Validate membership + fetch thread in one round-trip ──
    const [membershipResult, threadResult] = await Promise.all([
      validateThreadMembership(userId, threadId),
      sb.from('chat_threads').select('org_id, type, group_id, message_ttl').eq('id', threadId).single(),
    ]);

    const membership = membershipResult;
    if (!membership) return res.status(403).json({ error: 'Not a member of this thread' });

    const thread = threadResult.data;
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    const isSuperAdmin = req.user.role === 'super_admin';
    if (!isSuperAdmin && thread.org_id && thread.org_id !== req.user.organization_id?.toString()) {
      return res.status(403).json({ error: 'Organization mismatch' });
    }

    // Blocking (DMs only): I blocked them → I can't send; they blocked me → saved and shown to me as sent,
    // but never delivered to them (no inbox update, unread count, notification or message in their chat)
    let blockedRecipientId = null;
    if (thread.type === 'dm') {
      const { data: dmMembers } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', threadId);
      const otherId = (dmMembers || []).map(m => m.user_id).find(id => id !== userId);
      if (otherId && /^[0-9a-fA-F]{24}$/.test(otherId)) {
        const [meDoc, otherDoc] = await Promise.all([
          User.findById(userId).select('blocked_users').lean(),
          User.findById(otherId).select('blocked_users').lean(),
        ]);
        if ((meDoc?.blocked_users || []).includes(otherId)) {
          return res.status(403).json({ error: 'You blocked this contact. Unblock to send messages.', code: 'you_blocked' });
        }
        if ((otherDoc?.blocked_users || []).includes(userId)) blockedRecipientId = otherId;
      }
    }

    // Check group policies
    let msgStatus = 'approved';
    const requires_acknowledgement = req.body.requires_acknowledgement === true || req.body.requires_acknowledgement === 'true';
    let groupForThread = null;

    if (thread.type === 'group' && thread.group_id) {
      const { data: group } = await sb.from('chat_groups')
        .select('name, send_message_policy, send_attachments_policy, require_message_approval')
        .eq('id', thread.group_id)
        .single();

      if (group) {
        groupForThread = group;
        const isSuperAdmin = req.user.role === 'super_admin';
        const isFaculty = ['faculty', 'teacher', 'hod', 'principal', 'vice_principal'].includes(req.user.role);
        const isAdmin = membership.role === 'admin' || isSuperAdmin;

        // Check send_message_policy
        if (group.send_message_policy === 'admin_only' && !isAdmin) {
          return res.status(403).json({ error: 'Only admins can send messages in this group' });
        }
        if (group.send_message_policy === 'admin_faculty' && !isAdmin && !isFaculty) {
          return res.status(403).json({ error: 'Only admins and faculty can send messages in this group' });
        }



        // Check send_attachments_policy
        if ((files && files.length > 0) || (preuploaded_attachments && preuploaded_attachments.length > 0)) {
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

    // Validate file types and limits (local, no DB call)
    let imgCount = 0, vidCount = 0, pdfCount = 0, otherCount = 0;
    for (const file of files) {
      if (!isAllowedMime(file.mimetype)) {
        return res.status(400).json({ error: `File type not allowed: ${file.mimetype}` });
      }
      
      const isImage = file.mimetype.startsWith('image/');
      const isVideo = file.mimetype.startsWith('video/');
      const isPdf = file.mimetype === 'application/pdf';
      
      if (isImage) {
        if (file.size > 12 * 1024 * 1024) return res.status(400).json({ error: `Image too large: max 12MB. (${file.originalname})` });
        imgCount++;
      } else if (isVideo) {
        if (file.size > 150 * 1024 * 1024) return res.status(400).json({ error: `Video too large: max 150MB. (${file.originalname})` });
        vidCount++;
      } else if (isPdf) {
        if (file.size > 150 * 1024 * 1024) return res.status(400).json({ error: `PDF too large: max 150MB. (${file.originalname})` });
        pdfCount++;
      } else {
        if (file.size > 150 * 1024 * 1024) return res.status(400).json({ error: `File too large: max 150MB. (${file.originalname})` });
        otherCount++;
      }
    }
    
    if (imgCount > 30) return res.status(400).json({ error: `Max 30 images allowed.` });
    if (vidCount > 10) return res.status(400).json({ error: `Max 10 videos allowed.` });
    if (pdfCount > 20) return res.status(400).json({ error: `Max 20 PDFs allowed.` });
    if (otherCount > 20) return res.status(400).json({ error: `Max 20 other files allowed.` });

    // Parse reply_to (local, no DB call)
    let replyData = null;
    if (replyTo) {
      try {
        replyData = typeof replyTo === 'string' ? JSON.parse(replyTo) : replyTo;
      } catch { replyData = null; }
    }

    const storageContext = files.length > 0
      ? await getChatStorageContext(thread, threadId, groupForThread)
      : null;

    // ── Handle Scheduled Messages (Pro V2) ──
    if (scheduledFor) {
      const scheduledTime = new Date(scheduledFor);
      if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
        return res.status(400).json({ error: 'scheduledFor must be a valid future date' });
      }

      const uploadedAttachments = [];
      // 1) Handle traditional multer memory files (legacy fallback)
      for (const file of files) {
        const storagePath = buildChatAttachmentStoragePath(file, storageContext);
        const publicUrl = await uploadBufferToR2(file.buffer, file.originalname || 'upload.file', file.mimetype || 'application/octet-stream', storagePath);
        uploadedAttachments.push({
          file_url: publicUrl,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size,
        });
      }
      
      // 2) Handle pre-uploaded R2 files
      for (const pre of preuploaded_attachments) {
        uploadedAttachments.push({
          file_url: pre.file_url,
          file_name: pre.file_name,
          file_type: pre.file_type,
          file_size: pre.file_size,
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
         return res.status(500).json({ error: schedErr.message || 'Failed to schedule message' });
      }
      return res.status(201).json({ message: schedMsg, isScheduled: true });
    }

    // Calculate dynamic expires_at if thread has a TTL setting
    let finalExpiresAt = expiresAt || null;
    if (!finalExpiresAt && thread.message_ttl && thread.message_ttl > 0) {
      finalExpiresAt = new Date(Date.now() + thread.message_ttl * 1000).toISOString();
    }

    // Parse mentionedUsers (local, no DB call)
    let parsedMentionedUsers = [];
    if (mentionedUsers) {
      try {
        parsedMentionedUsers = typeof mentionedUsers === 'string' ? JSON.parse(mentionedUsers) : mentionedUsers;
      } catch { parsedMentionedUsers = []; }
    }

    // Parse linkPreview
    let parsedLinkPreview = null;
    if (req.body.linkPreview) {
      try {
        parsedLinkPreview = typeof req.body.linkPreview === 'string' ? JSON.parse(req.body.linkPreview) : req.body.linkPreview;
      } catch { parsedLinkPreview = null; }
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
      expires_at: finalExpiresAt,
      mentioned_users: parsedMentionedUsers,
      link_preview: parsedLinkPreview
    }).select('id').single();

    if (insertErr) {
      console.error("[Message Insert Error]", insertErr);
      return res.status(500).json({ error: 'Failed to send message' });
    }
    const msgId = insertedMsg.id;

    // Blocked by the recipient: hide it from them for good (their message list skips hidden messages)
    if (blockedRecipientId) {
      await User.updateOne({ _id: blockedRecipientId }, { $addToSet: { hidden_chat_messages: msgId } }).catch(() => {});
    }

    // Calculate last message text for sidebar snippet
    const lastMsgText = buildLastMessagePreview(msgText, files, false, false);

    // Update thread metadata manually (not when blocked: the shared inbox preview would show it to them)
    if (!blockedRecipientId) sb.from('chat_threads')
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
      expires_at: finalExpiresAt,
      mentioned_users: parsedMentionedUsers,
      attachments: [],
    };

    // ── Asynchronous Global Ping (Fire-and-forget) ──
    // Alert ALL thread members via their global user channel so their sidebars update
    sb.from('chat_thread_members').select('user_id').eq('thread_id', threadId).then(async ({ data: members }) => {
      if (members) {
        // The chat-list update goes out first: the lookups below are only for unread counts and notifications
        members.forEach((m) => {
          // Blocked by this member: no sidebar update for them
          if (blockedRecipientId && m.user_id === blockedRecipientId) return;
          // Broadcast to ALL members including sender so their sidebar also updates instantly
          broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
            threadId,
            messageId: msgId,
            message: broadcastPayload,
          });
        });

        // Fetch user preferences to check mutes
        const memberIds = members.map(m => m.user_id).filter(id => id !== userId && /^[0-9a-fA-F]{24}$/.test(id));
        let userMutes = {};
        const bellOff = new Set(); // people who turned off "All Notifications" or "Grid messages"
        const blockedPair = new Set(); // members on either side of a block with the sender (no @mention alert)
        if (memberIds.length > 0) {
          const users = await User.find({ _id: { $in: memberIds } }).select('_id muted_chat_threads inAppNotifications blocked_users').lean();
          const senderBlocked = new Set(((await User.findById(userId).select('blocked_users').lean())?.blocked_users || []).map(String));
          users.forEach(u => {
            userMutes[u._id.toString()] = u.muted_chat_threads || [];
            if ((u.blocked_users || []).map(String).includes(userId) || senderBlocked.has(u._id.toString())) blockedPair.add(u._id.toString());
            if (u.inAppNotifications?.global === false || u.inAppNotifications?.chat === false) bellOff.add(u._id.toString());
          });
        }

        const notificationsToInsert = [];

        members.forEach((m) => {
          // Blocked by this member: no unread count or notification for them
          if (blockedRecipientId && m.user_id === blockedRecipientId) return;

          if (m.user_id !== userId) {
            // Increment Redis unread counter for OTHER members only (not the sender)
            incrUnread(m.user_id, threadId);
            // If this user was mentioned, also increment mention counter
            if (parsedMentionedUsers && parsedMentionedUsers.includes(m.user_id)) {
              incrUnreadMention(m.user_id, threadId);
            }

            // If not muted and not silent, add an in-app notification
            const mutes = userMutes[m.user_id] || [];
            // An @mention reaches you even in a muted chat (like WhatsApp), unless there's a block between you
            const isMentioned = thread.type === 'group' && !blockedPair.has(m.user_id) && (parsedMentionedUsers || []).includes(m.user_id);
            if ((!mutes.includes(threadId) || isMentioned) && !bellOff.has(m.user_id) && !(isSilent === 'true' || isSilent === true)) {
              notificationsToInsert.push({
                recipient: m.user_id,
                type: 'chat',
                title: isMentioned ? `${req.user.name || 'Someone'} mentioned you in ${groupForThread?.name || 'a group'}` : thread.type === 'group' ? `New message in ${groupForThread?.name || 'Group'}` : `New message from ${req.user.name || 'User'}`,
                message: lastMsgText || 'New message',
                link: `/platform/chat?threadId=${threadId}`,
                relatedId: threadId,
                organization_id: thread.org_id || req.user.organization_id,
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
    if (files.length === 0 && preuploaded_attachments.length === 0) {
      // Fire and forget server broadcast (do not await)
      broadcastToChannel(`thread:${threadId}`, 'new_message', broadcastPayload);
      res.status(201).json({ message: broadcastPayload });
      return;
    }

    // ── Files: update last_message + upload (slower path) ──
    if (!blockedRecipientId) sb.from('chat_threads')
      .update({ last_message: lastMsgText })
      .eq('id', threadId)
      .then(() => {})
      .catch(() => {});

    const uploadedAttachments = [];
    
    // 1) Handle multer legacy fallback uploads
    for (const file of files) {
      const storagePath = buildChatAttachmentStoragePath(file, storageContext);

      const publicUrl = await uploadBufferToR2(file.buffer, file.originalname || 'upload.file', file.mimetype || 'application/octet-stream', storagePath);
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
    
    // 2) Handle pre-uploaded direct R2 attachments
    for (const pre of preuploaded_attachments) {
      const attRecord = {
        message_id: msgId,
        file_url: pre.file_url,
        file_name: pre.file_name,
        file_type: pre.file_type,
        file_size: pre.file_size,
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
// POST /threads/:id/presigned-urls — Get R2 presigned URLs for client-side uploads
// ──────────────────────────────────────────────
router.post('/:id/presigned-urls', isAuthenticated, express.json({ limit: '5mb' }), async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const threadId = req.params.id;
    const { files } = req.body; // Array of { fileName, fileType, fileSize }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files specified' });
    }

    // Verify membership
    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member of this thread' });

    // Build context to determine storage path
    const { data: thread } = await sb.from('chat_threads').select('*').eq('id', threadId).single();
    let groupForThread = null;
    if (thread?.type === 'group' && thread.group_id) {
      const { data: group } = await sb.from('chat_groups').select('*').eq('id', thread.group_id).single();
      groupForThread = group;
    }
    const storageContext = await getChatStorageContext(thread, threadId, groupForThread);

    const urls = [];
    for (const f of files) {
      if (!isAllowedMime(f.fileType)) {
        return res.status(400).json({ error: `File type not allowed: ${f.fileType}` });
      }

      // Generate the exact path used in our system
      // We need a dummy file object to reuse `buildChatAttachmentStoragePath`
      const mockFile = { originalname: f.fileName, mimetype: f.fileType };
      const customPath = buildChatAttachmentStoragePath(mockFile, storageContext);

      const urlData = await getPresignedUploadUrl(f.fileName, f.fileType, 3600, customPath);
      urls.push({
        fileName: f.fileName,
        fileType: f.fileType,
        fileSize: f.fileSize,
        uploadUrl: urlData.uploadUrl,
        publicUrl: urlData.publicUrl
      });
    }

    res.json({ urls });
  } catch (err) {
    console.error('Presigned URL error:', err);
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

    // Reset Redis unread counter for this user+thread (fire-and-forget)
    resetUnread(userId, threadId);

    // Broadcast read receipt (fire-and-forget — don't let Supabase Realtime failures crash this endpoint).
    // No read receipts between blocked DM partners.
    const block = await dmBlockState(threadId, userId).catch(() => null);
    if (!block || (!block.iBlocked && !block.blockedMe)) {
      broadcastToChannel(`thread:${threadId}`, 'read_receipt', {
        userId,
        lastReadAt: new Date().toISOString(),
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// DELETE /threads/:id/messages/:msgId — Soft delete
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// GET /threads/:id/messages/:msgId/info — Get Message Info (Read by / Delivered to)
// ──────────────────────────────────────────────
router.get('/:id/messages/:msgId/info', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id: threadId, msgId } = req.params;

    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    // 1. Get the message
    const { data: msg, error: msgErr } = await sb
      .from('chat_messages')
      .select('id, created_at, sender_id')
      .eq('id', msgId)
      .single();
    if (msgErr || !msg) return res.status(404).json({ error: 'Message not found' });

    // Only sender can view message info
    if (msg.sender_id !== userId) {
      return res.status(403).json({ error: 'Only the sender can view message info' });
    }

    // 2. Get all thread members except the sender
    const { data: members, error: memErr } = await sb
      .from('chat_thread_members')
      .select('user_id')
      .eq('thread_id', threadId)
      .neq('user_id', userId);
    if (memErr) throw memErr;

    const memberIds = members.map(m => m.user_id);
    if (memberIds.length === 0) {
      return res.json({ readBy: [], deliveredTo: [] });
    }

    // 3. Find who has read it (last_read_at >= message.created_at)
    const { data: reads, error: readsErr } = await sb
      .from('thread_reads')
      .select('user_id, last_read_at')
      .eq('thread_id', threadId)
      .in('user_id', memberIds)
      .gte('last_read_at', msg.created_at);
    if (readsErr) throw readsErr;

    const readUserIds = new Set(reads.map(r => r.user_id));
    const readUsersMap = {};
    reads.forEach(r => { readUsersMap[r.user_id] = r.last_read_at; });

    const deliveredUserIds = memberIds.filter(id => !readUserIds.has(id));

    // 4. Fetch user details from MongoDB
    const users = await User.find({ _id: { $in: memberIds } }).select('name profilePicture').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const readBy = [];
    const deliveredTo = [];

    memberIds.forEach(id => {
      const u = userMap[id];
      if (!u) return;
      const userObj = {
        id: u._id.toString(),
        name: u.name,
        avatar: u.profilePicture || (u.name || 'U')[0].toUpperCase(),
      };
      if (readUserIds.has(id)) {
        readBy.push({ ...userObj, readAt: readUsersMap[id] });
      } else {
        deliveredTo.push(userObj);
      }
    });

    res.json({ readBy, deliveredTo });
  } catch (err) {
    console.error('Message Info error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/messages/:msgId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id: threadId, msgId } = req.params;

    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const deleteType = req.query.type || 'everyone';

    // Use select('*') + maybeSingle() to avoid crashes if columns are missing
    const { data: msg, error: fetchErr } = await sb.from('chat_messages')
      .select('*')
      .eq('id', msgId)
      .eq('thread_id', threadId)
      .maybeSingle();

    if (fetchErr) {
      console.error('Supabase fetch error in message delete:', fetchErr);
      return res.status(500).json({ error: 'Database error: ' + fetchErr.message });
    }
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    
    if (deleteType === 'everyone') {
      if (msg.sender_id !== userId) return res.status(403).json({ error: 'Can only delete your own messages for everyone' });
      
      // Check if message has been seen by others
      const { data: reads } = await sb.from('thread_reads').select('user_id, last_read_at').eq('thread_id', threadId);
      const otherReads = (reads || []).filter(r => r.user_id !== userId && r.last_read_at);
      const isSeen = otherReads.some(r => new Date(msg.created_at) <= new Date(r.last_read_at));
      
      if (isSeen) {
        return res.status(403).json({ error: 'Cannot delete for everyone because the message has already been seen' });
      }

      // Delete attachments from DB
      await sb.from('chat_attachments').delete().eq('message_id', msgId);

      // Soft delete the message for everyone
      const { error } = await sb
        .from('chat_messages')
        .update({ message: 'This message was deleted', is_deleted: true })
        .eq('id', msgId);
      if (error) throw error;
      logGroupAudit(req, { threadId, action: 'message_deleted', targetType: 'message', targetId: msgId, oldValue: { message: String(msg.message || '').slice(0, 500), sender_id: msg.sender_id }, newValue: { deleted_by: msg.sender_id === userId ? 'author' : 'admin' } });
    } else if (deleteType === 'me') {
      // "Delete for me" — store in MongoDB (no Supabase column needed)
      await User.updateOne(
        { _id: userId },
        { $addToSet: { hidden_chat_messages: msgId } }
      );
      return res.status(200).json({ success: true, deletedForMe: true });
    }

    // Update thread's last_message preview
    const { data: latestMsg } = await sb.from('chat_messages')
      .select('message, is_deleted, chat_attachments(file_url, file_name, file_type, file_size), chat_polls(question)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestMsg) {
      const isPoll = latestMsg.chat_polls && latestMsg.chat_polls.length > 0;
      const preview = buildLastMessagePreview(
        isPoll ? latestMsg.chat_polls[0].question : latestMsg.message,
        latestMsg.chat_attachments,
        isPoll,
        latestMsg.is_deleted
      );
      await sb.from('chat_threads').update({ last_message: preview }).eq('id', threadId);
    }

    // Broadcast delete event
    broadcastToChannel(`thread:${threadId}`, 'message_deleted', { messageId: msgId });

    res.json({ ok: true });
  } catch (err) {
    console.error('Message delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /threads/:id/messages/bulk-delete — Delete 1000+ messages in ONE query
// ──────────────────────────────────────────────
router.post('/:id/messages/bulk-delete', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id: threadId } = req.params;
    const { messageIds, type } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }
    if (messageIds.length > 5000) {
      return res.status(400).json({ error: 'Cannot delete more than 5000 messages at once' });
    }

    const membership = await validateThreadMembership(userId, threadId);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const deleteType = type || 'me';

    if (deleteType === 'everyone') {
      // Fetch all target messages using select('*') for safety
      const { data: msgs, error: fetchErr } = await sb.from('chat_messages')
        .select('id, sender_id, created_at')
        .in('id', messageIds)
        .eq('thread_id', threadId);

      if (fetchErr) {
        console.error('Bulk delete fetch error:', fetchErr);
        return res.status(500).json({ error: 'Database error: ' + fetchErr.message });
      }
      if (!msgs || msgs.length === 0) return res.status(404).json({ error: 'No messages found' });

      // Separate mine vs not-mine
      const myMsgIds = msgs.filter(m => m.sender_id === userId).map(m => m.id);
      const notMine = msgs.filter(m => m.sender_id !== userId);

      // For "delete everyone", skip messages that aren't yours (don't block the whole operation)
      const { data: reads } = await sb.from('thread_reads').select('user_id, last_read_at').eq('thread_id', threadId);
      const otherReads = (reads || []).filter(r => r.user_id !== userId && r.last_read_at);

      const unseenIds = [];
      const seenIds = [];
      for (const m of msgs.filter(m => m.sender_id === userId)) {
        const isSeen = otherReads.some(r => new Date(m.created_at) <= new Date(r.last_read_at));
        if (isSeen) seenIds.push(m.id);
        else unseenIds.push(m.id);
      }

      if (unseenIds.length > 0) {
        await sb.from('chat_attachments').delete().in('message_id', unseenIds);
        await sb.from('chat_messages')
          .update({ message: 'This message was deleted', is_deleted: true })
          .in('id', unseenIds);
        broadcastToChannel(`thread:${threadId}`, 'messages_bulk_deleted', { messageIds: unseenIds });
        // One audit row for the whole batch (ids + a short preview of each)
        logGroupAudit(req, { threadId, action: 'messages_bulk_deleted', targetType: 'message', targetId: unseenIds[0], oldValue: { count: unseenIds.length, messages: msgs.filter(m => unseenIds.includes(m.id)).slice(0, 50).map(m => ({ id: m.id, message: String(m.message || '').slice(0, 120) })) }, newValue: { deleted_by: 'author' } });
      }

      // Update thread preview
      const { data: latestMsg } = await sb.from('chat_messages')
        .select('message, is_deleted, chat_attachments(file_url, file_name, file_type, file_size), chat_polls(question)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestMsg) {
        const isPoll = latestMsg.chat_polls && latestMsg.chat_polls.length > 0;
        const preview = buildLastMessagePreview(
          isPoll ? latestMsg.chat_polls[0].question : latestMsg.message,
          latestMsg.chat_attachments,
          isPoll,
          latestMsg.is_deleted
        );
        await sb.from('chat_threads').update({ last_message: preview }).eq('id', threadId);
      }

      return res.json({ ok: true, deleted: unseenIds.length, failed: seenIds.length + notMine.length, failedIds: [...seenIds, ...notMine.map(m => m.id)] });

    } else {
      // "Delete for me" — store in MongoDB (one atomic operation, no Supabase column needed)
      await User.updateOne(
        { _id: userId },
        { $addToSet: { hidden_chat_messages: { $each: messageIds } } }
      );

      return res.json({ ok: true, deleted: messageIds.length, deletedForMe: true });
    }
  } catch (err) {
    console.error('Bulk message delete error:', err);
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
      // Bell for the message's author (own messages only, throttled per reactor+message)
      if (shouldNotifyReaction(userId, msgId)) {
        sb.from('chat_messages').select('sender_id, message').eq('id', msgId).maybeSingle().then(({ data: target }) => {
          if (!target?.sender_id || target.sender_id === userId) return;
          const preview = String(target.message || '').replace(/\s+/g, ' ').slice(0, 60);
          notifyChatEvent({
            actorId: userId, recipientId: target.sender_id, threadId,
            title: `${userName} reacted ${emoji} to your message`,
            message: preview || 'Your message',
          });
        }).catch(() => {});
      }
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
      .select('sender_id, is_deleted, message')
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

    logGroupAudit(req, { threadId, action: 'message_edited', targetType: 'message', targetId: msgId, oldValue: { message: String(existingMsg.message || '').slice(0, 1000) }, newValue: { message: message.trim().slice(0, 1000) } });

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
const ALLOWED_DISAPPEARING_TTLS = new Set([0, 86400, 604800, 7776000]);

function getDisappearingTimeText(ttl) {
  if (ttl === 86400) return '24 hours';
  if (ttl === 604800) return '7 days';
  if (ttl === 7776000) return '90 days';
  return 'Off';
}

async function updateDisappearingMessages(req, res) {
  try {
    const threadId = req.params.id;
    const ttl = Number(req.body.ttl ?? 0);
    const userId = req.user._id.toString();

    if (!ALLOWED_DISAPPEARING_TTLS.has(ttl)) {
      return res.status(400).json({ error: 'Invalid disappearing message duration' });
    }

    const { data: member } = await sb
      .from('chat_thread_members')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const { error: threadErr } = await sb
      .from('chat_threads')
      .update({ message_ttl: ttl, updated_at: new Date().toISOString() })
      .eq('id', threadId);
    if (threadErr) throw threadErr;

    const timeText = getDisappearingTimeText(ttl);
    const msgText = ttl === 0
      ? 'Disappearing messages were turned off.'
      : `Disappearing messages were set to ${timeText}.`;

    const { data: msg, error: msgErr } = await sb.from('chat_messages').insert([{
      thread_id: threadId,
      sender_id: userId,
      sender_name: req.user.name || 'User',
      user_avatar: req.user.profilePicture || null,
      message: JSON.stringify({ type: 'system', action: 'set_ttl', ttl, text: msgText }),
    }]).select().single();
    if (msgErr) throw msgErr;

    broadcastToChannel(`thread:${threadId}`, 'new_message', { ...msg, attachments: [], reactions: {} });
    logGroupAudit(req, { threadId: threadId, action: 'disappearing_messages_changed', targetType: 'group', newValue: { message_ttl: ttl } });

    res.json({ success: true, ttl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.post('/:id/disappearing', isAuthenticated, updateDisappearingMessages);
router.post('/:id/disappearing-messages', isAuthenticated, updateDisappearingMessages);
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
      isAdmin = (membership?.role === 'admin');
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
    // Bell: "New poll in <group>" for the other members
    (async () => {
      const [{ data: th }, { data: pollMembers }] = await Promise.all([
        sb.from('chat_threads').select('type, group_id').eq('id', threadId).maybeSingle(),
        sb.from('chat_thread_members').select('user_id').eq('thread_id', threadId),
      ]);
      let where = req.user.name || 'a chat';
      if (th?.type === 'group' && th.group_id) {
        const { data: g } = await sb.from('chat_groups').select('name').eq('id', th.group_id).maybeSingle();
        where = g?.name || 'a group';
      }
      for (const m of pollMembers || []) {
        notifyChatEvent({ actorId: userId, recipientId: m.user_id, threadId, title: `New poll in ${where}`, message: question });
      }
    })().catch(() => {});
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

    let didUnvote = false;
    
    // Check if they are toggling the EXACT same option
    const { data: existing } = await sb.from('chat_poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .eq('option_id', optionId)
      .maybeSingle();

    if (existing) {
      // They clicked the same option, so we just remove it (un-vote)
      await sb.from('chat_poll_votes').delete().eq('id', existing.id);
      didUnvote = true;
    }

    // If allow_multiple is false, clear all other votes in this poll
    if (!poll.allow_multiple && !didUnvote) {
      await sb.from('chat_poll_votes').delete().eq('poll_id', pollId).eq('user_id', userId);
    }

    // Insert the new vote if they didn't just unvote it
    if (!didUnvote) {
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

    // Reset ALL Redis unread counters for this user (fire-and-forget)
    try {
      if (await isRedisAvailable()) {
        await Promise.all([
          redis.del(`${UNREAD_PREFIX}${userId}`),
          redis.del(`${MENTION_PREFIX}${userId}`)
        ]);
      }
    } catch { /* Redis unavailable */ }

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

    let validThreadIds = memberships?.map(m => m.thread_id) || [];
    if (validThreadIds.length === 0) {
      return res.status(403).json({ error: 'Not a member of any of the target threads' });
    }

    // Blocking: skip DMs with people I blocked; DMs with people who blocked me are sent but never delivered.
    const silentThreads = new Map(); // threadId -> recipient who blocked me
    const blockStates = await Promise.all(validThreadIds.map(tid => dmBlockState(tid, userId).catch(() => null)));
    validThreadIds = validThreadIds.filter((tid, i) => {
      const st = blockStates[i];
      if (st?.iBlocked) return false;
      if (st?.blockedMe) silentThreads.set(tid, st.otherId);
      return true;
    });
    if (validThreadIds.length === 0) {
      return res.status(403).json({ error: 'You blocked this contact. Unblock to send messages.', code: 'you_blocked' });
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
    const lastOriginalMsg = sortedMessages[sortedMessages.length - 1];
    const lastMsgAtts = originalAttachments?.filter(a => a.message_id === lastOriginalMsg.id) || [];
    const forwardPreview = buildLastMessagePreview(lastOriginalMsg.message, lastMsgAtts, false, false);

    // Hide undelivered copies from recipients who blocked me
    for (const [tid, recipientId] of silentThreads) {
      const ids = (insertedMessages || []).filter(m => m.thread_id === tid).map(m => m.id);
      if (ids.length) await User.updateOne({ _id: recipientId }, { $addToSet: { hidden_chat_messages: { $each: ids } } });
    }

    const updatePromises = validThreadIds.filter(tid => !silentThreads.has(tid)).map(tid =>
      sb.from('chat_threads')
        .update({
          last_message: forwardPreview,
          last_message_at: now
        })
        .eq('id', tid)
    );
    await Promise.all(updatePromises);

    // 5. Broadcast to all target threads
    const lastByThread = new Map(); // newest forwarded copy per chat, for the chat-list update
    const countByThread = new Map();
    for (const msg of insertedMessages || []) {
      const fullMsg = {
        ...msg,
        attachments: newAttachments?.filter(a => a.message_id === msg.id) || [],
        reactions: {},
        is_deleted: false
      };
      broadcastToChannel(`thread:${msg.thread_id}`, 'new_message', fullMsg);
      lastByThread.set(msg.thread_id, fullMsg);
      countByThread.set(msg.thread_id, (countByThread.get(msg.thread_id) || 0) + 1);
    }

    // 6. Every member's chat list (and unread count), like a normal message - forwarded copies used to show
    // only after a refresh. Chats with someone who blocked me stay silent.
    const listThreadIds = [...lastByThread.keys()].filter(tid => !silentThreads.has(tid));
    if (listThreadIds.length > 0) {
      const { data: members } = await sb.from('chat_thread_members').select('thread_id, user_id').in('thread_id', listThreadIds);
      for (const m of members || []) {
        broadcastToChannel(`user:${m.user_id}`, 'thread_updated', {
          threadId: m.thread_id,
          messageId: lastByThread.get(m.thread_id).id,
          message: lastByThread.get(m.thread_id),
        });
        if (m.user_id !== userId) {
          for (let i = 0; i < (countByThread.get(m.thread_id) || 0); i++) incrUnread(m.user_id, m.thread_id);
        }
      }
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
    const { is_pinned, durationHours } = req.body;

    const membership = await validateThreadMembership(userId, threadId);
    // Anyone in the thread can pin messages
    if (!membership) return res.status(403).json({ error: 'Not authorized' });

    let pinned_until = null;
    if (is_pinned && durationHours) {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + durationHours);
      pinned_until = expirationDate.toISOString();
    }

    // If we are pinning a new message, unpin any existing pinned messages in this thread
    if (is_pinned) {
      const { data: oldPins } = await sb.from('chat_messages')
        .update({ is_pinned: false, pinned_until: null, pinned_at: null, pinned_by: null })
        .eq('thread_id', threadId)
        .eq('is_pinned', true)
        .neq('id', messageId)
        .select();

      // Broadcast unpin event for any messages that were overwritten
      if (oldPins && oldPins.length > 0) {
        for (const oldPin of oldPins) {
          broadcastToChannel(`thread:${threadId}`, 'message_updated', oldPin);
        }
      }
    }

    const { data: updated, error } = await sb.from('chat_messages').update({
      is_pinned,
      pinned_by: is_pinned ? userId : null,
      pinned_at: is_pinned ? new Date().toISOString() : null,
      pinned_until: is_pinned ? pinned_until : null
    }).eq('id', messageId).eq('thread_id', threadId).select().single();

    if (error) throw error;

    // Audit Log
    logGroupAudit(req, { threadId, action: is_pinned ? 'message_pinned' : 'message_unpinned', targetType: 'message', targetId: messageId, newValue: { message: String(updated?.message || '').slice(0, 300) } });

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
    const membership = await validateThreadMembership(userId, threadId);
    if (membership?.role !== 'admin') return res.status(403).json({ error: 'Only admins can approve messages' });

    const { data: updated, error } = await sb.from('chat_messages').update({
      status: 'approved', approved_by: userId, approved_at: new Date().toISOString()
    }).eq('id', messageId).eq('thread_id', threadId).select().single();
    if (error) throw error;
    logGroupAudit(req, { threadId, action: 'message_approved', targetType: 'message', targetId: messageId, newValue: { message: String(updated?.message || '').slice(0, 300), sender_id: updated?.sender_id } });

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
    const membership = await validateThreadMembership(userId, threadId);
    if (membership?.role !== 'admin') return res.status(403).json({ error: 'Only admins can reject messages' });

    const { data: updated, error } = await sb.from('chat_messages').update({
      status: 'rejected', rejected_by: userId, rejected_at: new Date().toISOString(), rejection_reason: req.body.reason || null
    }).eq('id', messageId).eq('thread_id', threadId).select().single();
    if (error) throw error;
    logGroupAudit(req, { threadId, action: 'message_rejected', targetType: 'message', targetId: messageId, newValue: { message: String(updated?.message || '').slice(0, 300), sender_id: updated?.sender_id, reason: req.body.reason || null } });

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
    const isAdmin = membership?.role === 'admin';
    if (!membership) return res.status(403).json({ error: 'Not authorized' });

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
    const isAdmin = membership?.role === 'admin';

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
    const isAdmin = membership?.role === 'admin';

    // Verify ownership or admin
    const { data: existing } = await sb.from('chat_scheduled_messages').select('sender_id').eq('id', msgId).single();
    if (!existing) return res.status(404).json({ error: 'Scheduled message not found' });
    if (existing.sender_id !== userId && !isAdmin) return res.status(403).json({ error: 'Not authorized to cancel this message' });

    const { error } = await sb.from('chat_scheduled_messages').update({ status: 'cancelled' }).eq('id', msgId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// GET /threads/gifs/search — Search or get trending GIFs via GIPHY API
// ──────────────────────────────────────────────
router.get('/gifs/search', isAuthenticated, async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    const apiKey = process.env.GIPHY_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GIPHY_API_KEY is not configured on the server.' });
    }

    const isTrending = !q || q.trim() === '';
    const cacheKey = isTrending 
      ? `giphy:trending:limit${limit}:offset${offset}` 
      : `giphy:search:${q.trim().toLowerCase()}:limit${limit}:offset${offset}`;

    // Try Redis cache first
    try {
      if (global.redis) {
        const cached = await global.redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Redis cache read error for Giphy:", e.message);
    }

    // Call GIPHY API
    let url = '';
    if (isTrending) {
      url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&offset=${offset}&rating=g`;
    } else {
      const encodedQ = encodeURIComponent(q.trim());
      url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodedQ}&limit=${limit}&offset=${offset}&rating=g`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      console.error("Giphy API Error:", errText);
      return res.status(response.status).json({ error: 'Failed to fetch from GIPHY' });
    }

    const data = await response.json();
    
    // Map to a clean, unified format
    const results = data.data.map((gif) => {
      // Prefer fixed_width for masonry previews to save bandwidth and improve layout consistency
      const preview = gif.images.fixed_width;
      const original = gif.images.original;

      return {
        id: gif.id,
        url: original.url, // Full size for sending
        preview_url: preview.url, // Smaller size for the picker
        width: parseInt(preview.width),
        height: parseInt(preview.height),
        title: gif.title
      };
    });

    const responseData = { results, pagination: data.pagination };

    // Cache the result (Trending for 1 hour, Search for 15 mins)
    try {
      if (global.redis) {
        const ttl = isTrending ? 3600 : 900;
        await global.redis.setex(cacheKey, ttl, JSON.stringify(responseData));
      }
    } catch (e) {
      console.warn("Redis cache write error for Giphy:", e.message);
    }

    res.json(responseData);
  } catch (err) {
    console.error('Giphy API route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
