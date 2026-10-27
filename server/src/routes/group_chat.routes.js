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

import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import RoleRequest from '../models/RoleRequest.js';
import { primarySupabaseClient, studentNotesClient } from '../config/supabaseClient.js';
import { broadcastToChannel } from '../services/realtimeBroadcast.js';
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";


const router = express.Router();
const sb = primarySupabaseClient;
import { logGroupAudit, forgetGroup } from '../services/chat-group-audit.service.js';
import { notifyChatEvent } from '../services/chat-notify.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // Increased to 25MB for group photos
});

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

function sanitizeStorageFileName(fileName) {
  const fallback = `group-photo-${Date.now()}`;
  return String(fileName || fallback)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120) || fallback;
}

async function getGroupAssetStorageContext(group, thread) {
  let orgLabel = thread?.org_id || group?.org_id || 'platform';
  if (orgLabel && /^[0-9a-fA-F]{24}$/.test(orgLabel)) {
    try {
      const org = await Organization.findById(orgLabel)
        .select('name sidebar_name subdomain')
        .lean();
      orgLabel = org?.subdomain || org?.sidebar_name || org?.name || orgLabel;
    } catch (err) {
      console.warn('[Group Storage] Failed to resolve organization name:', err.message);
    }
  }

  const groupLabel = group?.name || `group-${group?.id || thread?.group_id || 'unknown'}`;

  return {
    orgFolder: `${toStorageSlug(orgLabel, 'platform')}-${shortStorageId(thread?.org_id || group?.org_id)}`,
    groupFolder: `${toStorageSlug(groupLabel, 'group-chat')}-${shortStorageId(thread?.id || group?.id)}`,
  };
}

function buildGroupPhotoStoragePath(file, type, context) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safeName = sanitizeStorageFileName(file.originalname);
  const assetFolder = type === 'banner' ? 'banners' : 'avatars';

  return [
    'chat',
    'orgs',
    context.orgFolder,
    'groups',
    context.groupFolder,
    'group-profile',
    assetFolder,
    year,
    month,
    `${Date.now()}-${randomUUID()}-${safeName}`,
  ].join('/');
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
async function getGroupMembership(userId, groupId) {
  // Get group + thread + membership in one flow
  const { data: group } = await sb.from('chat_groups').select('*').eq('id', groupId).single();
  if (!group) return { group: null, thread: null, membership: null };

  const { data: thread } = await sb.from('chat_threads').select('*').eq('group_id', groupId).single();
  if (!thread) return { group, thread: null, membership: null };

  const { data: membership } = await sb
    .from('chat_thread_members')
    .select('*')
    .eq('thread_id', thread.id)
    .eq('user_id', userId)
    .maybeSingle();

  return { group, thread, membership };
}

// ──────────────────────────────────────────────
// POST /groups — Create group
// ──────────────────────────────────────────────
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const orgId = req.user.organization_id?.toString();
    const isSuperAdmin = req.user.role === 'super_admin';
    if (!orgId && !isSuperAdmin) return res.status(403).json({ error: 'Must be in an organization' });

    const { 
      name, 
      description, 
      memberIds,
      group_type,
      is_private,
      require_join_approval,
      send_message_policy,
      admin_roles,
      message_ttl,
      is_official,
      edit_info_policy,
      add_member_policy,
      create_poll_policy,
      send_attachments_policy,
      auto_add_roles
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required' });
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'At least one member is required' });
    }

    // Validate all members are in the same org
    const allIds = [...new Set([userId, ...memberIds])];
    const users = await User.find({ _id: { $in: allIds } }).select('organization_id name role').lean();
    
    let threadOrgId = orgId || null;
    
    if (isSuperAdmin) {
      const firstMemberOrg = users.find(u => u._id.toString() !== userId && u.organization_id)?.organization_id?.toString();
      threadOrgId = firstMemberOrg || null;
    } else {
      const invalidUsers = users.filter(u => u.organization_id?.toString() !== orgId);
      if (invalidUsers.length > 0) {
        const invalidNames = invalidUsers.map(u => u.name).join(', ');
        return res.status(400).json({ error: `Cannot create group. The following users are not in your organization: ${invalidNames}` });
      }
    }

    // Create group
    const { data: group, error: groupErr } = await sb
      .from('chat_groups')
      .insert([{
        name: name.trim(),
        description: description ? description.trim() : null,
        created_by: userId,
        org_id: threadOrgId,
        group_type: group_type || 'general',
        is_private: is_private || false,
        require_join_approval: require_join_approval || false,
        send_message_policy: send_message_policy || 'all',
        admin_roles: admin_roles || [],
        message_ttl: message_ttl || 0,
        is_official: isSuperAdmin ? true : (is_official || false),
        edit_info_policy: edit_info_policy || 'admin_only',
        add_member_policy: add_member_policy || 'admin_only',
        create_poll_policy: create_poll_policy || 'all',
        send_attachments_policy: send_attachments_policy || 'all',
        auto_add_roles: auto_add_roles || []
      }])
      .select()
      .single();
    if (groupErr) throw groupErr;

    // Create thread
    const { data: thread, error: threadErr } = await sb
      .from('chat_threads')
      .insert([{
        type: 'group',
        org_id: threadOrgId,
        group_id: group.id,
      }])
      .select()
      .single();
    if (threadErr) throw threadErr;

    // Add members (creator as admin, rest as members, unless they match auto-grant admin roles)
    const memberRecords = allIds.map(id => {
      const u = users.find(user => user._id.toString() === id);
      const isAutoAdmin = admin_roles && admin_roles.includes(u?.role);
      return {
        thread_id: thread.id,
        user_id: id,
        role: (id === userId || isAutoAdmin) ? 'admin' : 'member',
      };
    });

    const { error: memErr } = await sb.from('chat_thread_members').insert(memberRecords);
    if (memErr) throw memErr;

    // Broadcast to all members so their sidebar updates in real-time
    Promise.all(allIds.map(memberId => 
      broadcastToChannel(`user:${memberId}`, 'thread_updated', {
        id: thread.id,
        threadId: thread.id,
        action: 'new_group',
        groupId: group.id
      })
    )).catch(err => console.error('Group broadcast error:', err));

    // Bell: "X added you to <group>" for everyone the creator added
    allIds.filter(id => id !== userId).forEach(id => notifyChatEvent({
      actorId: userId, recipientId: id, threadId: thread.id,
      title: `${req.user.name || 'Someone'} added you to ${group.name || 'a group'}`,
    }));

    if (!is_private && threadOrgId) {
       broadcastToChannel(`org:${threadOrgId}`, 'explore_groups_update', { groupId: group.id }).catch(() => {});
    }

    logGroupAudit(req, { groupId: group.id, action: 'group_created', targetType: 'group', targetId: group.id, targetName: group.name, groupName: group.name, newValue: { name: group.name, description: group.description || null, is_private: group.is_private ?? null, group_type: group.group_type || null } });

    res.status(201).json({ group, thread });
  } catch (err) {
    console.error('Group create error:', err);
    res.status(500).json({ error: err.message || err.details || JSON.stringify(err) || 'Unknown error' });
  }
});

// ──────────────────────────────────────────────
// GET /explore — Explore public and approval-required groups in org
// ──────────────────────────────────────────────
router.get('/explore', isAuthenticated, async (req, res) => {
  try {
    const orgId = req.user.organization_id?.toString();
    const isSuperAdmin = req.user.role === 'super_admin';
    if (!orgId && !isSuperAdmin) return res.status(403).json({ error: 'Must be in an org' });

    let query = sb.from('chat_groups').select('*').eq('is_private', false);
    if (!isSuperAdmin) {
      query = query.eq('org_id', orgId);
    }
    
    const { data: groups, error } = await query;
    if (error) throw error;
    
    const groupIds = groups.map(g => g.id);
    const { data: threads } = await sb.from('chat_threads').select('id, group_id').in('group_id', groupIds);
    const threadIds = threads ? threads.map(t => t.id) : [];
    
    let memberCounts = {};
    if (threadIds.length > 0) {
       const { data: members } = await sb.from('chat_thread_members').select('thread_id').in('thread_id', threadIds);
       if (members) {
          members.forEach(m => {
             memberCounts[m.thread_id] = (memberCounts[m.thread_id] || 0) + 1;
          });
       }
    }

    const creatorIds = [...new Set(groups.map(g => g.created_by).filter(Boolean))];
    let creatorMap = {};
    if (creatorIds.length > 0) {
       const creators = await User.find({ _id: { $in: creatorIds } }).select('name email').lean();
       creators.forEach(c => { creatorMap[c._id.toString()] = c; });
    }

    const userId = req.user._id.toString();
    const { data: myRequests } = await sb.from('chat_group_join_requests')
       .select('group_id')
       .eq('user_id', userId)
       .eq('status', 'pending');
    
    const pendingGroupIds = new Set(myRequests?.map(r => r.group_id) || []);

    const result = groups.map(g => {
       const thread = threads?.find(t => t.group_id === g.id);
       return {
          ...g,
          creator: creatorMap[g.created_by] || null,
          member_count: thread ? (memberCounts[thread.id] || 0) : 0,
          has_pending_request: pendingGroupIds.has(g.id)
       };
    });
    
    res.json({ groups: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /join-requests/unified — Get incoming and outgoing requests
// ──────────────────────────────────────────────
router.get('/join-requests/unified', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    const { data: outgoing, error: outErr } = await sb.from('chat_group_join_requests')
      .select('*, group:chat_groups(name, avatar_url, description)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (outErr) throw outErr;

    let incoming = [];
    if (req.user.role !== 'student') {
       const { data: adminMemberships } = await sb.from('chat_thread_members')
         .select('thread_id')
         .eq('user_id', userId)
         .in('role', ['admin', 'creator']);
         
       if (adminMemberships && adminMemberships.length > 0) {
          const threadIds = adminMemberships.map(m => m.thread_id);
          const { data: threads } = await sb.from('chat_threads').select('group_id').in('id', threadIds).not('group_id', 'is', null);
          const groupIds = threads ? threads.map(t => t.group_id) : [];
          
          if (groupIds.length > 0) {
             const { data: inReqs, error: inErr } = await sb.from("chat_group_join_requests")
               .select("*, group:chat_groups(name, avatar_url)")
               .in("group_id", groupIds)
               .order("created_at", { ascending: false });
               
             if (inErr) throw inErr;
             
             // Fetch real names/emails from MongoDB
             const uIds = (inReqs || []).map(r => r.user_id);
             const mUsers = await User.find({ _id: { $in: uIds } }).select("name email profilePicture").lean();
             const mUserMap = {};
             mUsers.forEach(u => { mUserMap[u._id.toString()] = u; });

             incoming = (inReqs || []).map(r => ({
               ...r,
               user_name: mUserMap[r.user_id]?.name || r.user_name || "Unknown",
               user_email: mUserMap[r.user_id]?.email || "",
               user_avatar: mUserMap[r.user_id]?.profilePicture || r.user_avatar || null
             }));
          }
       }
    }
    
    // --- Fetch Role Requests from MongoDB ---
    const orgId = req.user.organization_id;
    let roleIncoming = [];
    let roleOutgoing = [];
    
    // Outgoing Role Requests
    const myRoleRequests = await RoleRequest.find({ user_id: userId }).lean();
    if (myRoleRequests.length > 0) {
        const orgIds = myRoleRequests.map(r => r.organization_id);
        const orgs = await Organization.find({ _id: { $in: orgIds } }).select('name logo_url').lean();
        const orgMap = {};
        orgs.forEach(o => { orgMap[o._id.toString()] = o; });
        
        roleOutgoing = myRoleRequests.map(r => ({
            id: r._id.toString(), // format it for UI
            type: 'role_request',
            group_id: r.organization_id.toString(), // for UI compat
            status: r.status,
            created_at: r.createdAt,
            group: {
                name: `Role: ${r.role} at ${orgMap[r.organization_id.toString()]?.name || 'Organization'}`,
                avatar: orgMap[r.organization_id.toString()]?.logo_url || null
            }
        }));
    }

    // Incoming Role Requests (only if org_admin)
    if (req.user.role === 'org_admin' && orgId) {
        const pendingRoleRequests = await RoleRequest.find({ organization_id: orgId }).lean();
        if (pendingRoleRequests.length > 0) {
            const requesterIds = pendingRoleRequests.map(r => r.user_id);
            const requesters = await User.find({ _id: { $in: requesterIds } }).select("name email profilePicture").lean();
            const userMap = {};
            requesters.forEach(u => { userMap[u._id.toString()] = u; });
            
            roleIncoming = pendingRoleRequests.map(r => ({
                id: r._id.toString(), // format it for UI
                type: 'role_request',
                group_id: r.organization_id.toString(),
                status: r.status,
                created_at: r.createdAt,
                user_name: userMap[r.user_id.toString()]?.name || r.email || "Unknown User",
                user_email: userMap[r.user_id.toString()]?.email || r.email || "",
                user_avatar: userMap[r.user_id.toString()]?.profilePicture || null,
                group: {
                    name: `Role: ${r.role}`,
                    avatar: null
                }
            }));
        }
    }

    // Merge and sort
    const finalIncoming = [...incoming, ...roleIncoming].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const finalOutgoing = [...(outgoing || []), ...roleOutgoing].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ incoming: finalIncoming, outgoing: finalOutgoing });
  } catch (err) {
    console.error('Unified requests error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /groups/:id — Group info + members
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// GET /group-chat/analytics — Chat Analytics for super admins only (superadmin portal → Chat Analytics)
// New chat.classgrid.in sign-ups (MongoDB) + messages, groups and join requests (Supabase, migration 008).
// Cached 60 s in memory so refreshing never hammers the free Supabase.
// ──────────────────────────────────────────────
router.get('/analytics', isAuthenticated, async (req, res) => {
  if (req.user?.role !== 'super_admin') return res.status(403).json({ error: 'Only Classgrid super admins can see chat analytics' });
  try {
    const { getChatAnalytics } = await import('../services/chat-analytics.service.js');
    res.json(await getChatAnalytics({ maxAgeMs: req.query.fresh === '1' ? 0 : 60 * 1000 }));
  } catch (err) {
    console.error('Chat analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /group-chat/audit-logs — group audit log with filters and paging (Audit Logs page)
//   ?page=1&pageSize=50&search=&action=&groupId=&actorId=&from=ISO&to=ISO&format=csv
// Who sees what: super admin → everything; org admins → their org's groups; anyone else → groups they are an admin of.
// (Defined before '/:id' so "audit-logs" is not read as a group id.)
// ──────────────────────────────────────────────
const AUDIT_ORG_ADMIN_ROLES = ['org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'];
router.get('/audit-logs', isAuthenticated, async (req, res) => {
  try {
    const me = req.user;
    const myId = me._id.toString();
    const csv = req.query.format === 'csv';
    const pageSize = csv ? 5000 : Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    // Groups this person may see logs for
    let allowedGroupIds = null; // null = all
    let orgFilter = null;
    if (me.role === 'super_admin') {
      // everything
    } else if (AUDIT_ORG_ADMIN_ROLES.includes(me.role) && me.organization_id) {
      orgFilter = me.organization_id.toString();
    } else {
      const { data: adminRows } = await sb.from('chat_thread_members').select('thread_id').eq('user_id', myId).eq('role', 'admin');
      const threadIds = (adminRows || []).map(r => r.thread_id);
      if (threadIds.length === 0) return csv ? res.type('text/csv').send('') : res.json({ logs: [], total: 0, page, pageSize, groups: [] });
      const { data: threads } = await sb.from('chat_threads').select('group_id').in('id', threadIds).not('group_id', 'is', null);
      allowedGroupIds = [...new Set((threads || []).map(t => t.group_id))];
      if (allowedGroupIds.length === 0) return csv ? res.type('text/csv').send('') : res.json({ logs: [], total: 0, page, pageSize, groups: [] });
    }

    let query = sb.from('chat_group_audit_logs').select('*', { count: csv ? undefined : 'exact' });
    if (allowedGroupIds) query = query.in('group_id', allowedGroupIds);
    if (orgFilter) query = query.eq('org_id', orgFilter);
    if (req.query.groupId) query = query.eq('group_id', String(req.query.groupId));
    if (req.query.action) query = query.in('action', String(req.query.action).split(',').filter(Boolean).slice(0, 30));
    if (req.query.actorId) query = query.eq('actor_id', String(req.query.actorId));
    if (req.query.from) query = query.gte('created_at', new Date(String(req.query.from)).toISOString());
    if (req.query.to) query = query.lte('created_at', new Date(String(req.query.to)).toISOString());
    const search = String(req.query.search || '').trim().replace(/[%,()]/g, ' ').slice(0, 80);
    if (search) query = query.or(`actor_name.ilike.%${search}%,target_name.ilike.%${search}%,group_name.ilike.%${search}%,action.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    const { data: logs, error, count } = await query;
    if (error) throw error;

    if (csv) {
      const cols = ['created_at', 'group_name', 'action', 'actor_name', 'actor_role', 'target_type', 'target_name', 'target_id', 'old_value', 'new_value', 'ip_address', 'user_agent'];
      const cell = (v) => { const t = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v)); return `"${t.replace(/"/g, '""')}"`; };
      const body = [cols.join(','), ...(logs || []).map(l => cols.map(c => cell(l[c])).join(','))].join('\n');
      res.setHeader('Content-Disposition', `attachment; filename="group-audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.type('text/csv').send(body);
    }

    // Groups for the filter dropdown (only ones this person may see)
    let groupsQuery = sb.from('chat_groups').select('id, name').order('name').limit(500);
    if (allowedGroupIds) groupsQuery = groupsQuery.in('id', allowedGroupIds);
    if (orgFilter) groupsQuery = groupsQuery.eq('org_id', orgFilter);
    const { data: groups } = await groupsQuery;

    res.json({ logs: logs || [], total: count ?? (logs || []).length, page, pageSize, groups: groups || [] });
  } catch (err) {
    console.error('Group audit logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { group, thread, membership } = await getGroupMembership(userId, req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    let organizationName = null;
    let organizationLogo = null;
    if (group.org_id) {
      const org = await Organization.findById(group.org_id).select('name logo_url').lean();
      if (org) {
        organizationName = org.name;
        organizationLogo = org.logo_url;
      }
    }
    
    // Attach organization details to the group object for the frontend
    group.organization_name = organizationName;
    group.organization_logo = organizationLogo;

    if (group.created_by) {
      const creator = await User.findById(group.created_by).select('role').lean();
      if (creator && (creator.role === 'super_admin' || creator.role === 'Super Admin')) {
        group.is_created_by_super_admin = true;
      }
    }

    // Get all members
    const { data: members } = await sb
      .from('chat_thread_members')
      .select('user_id, role, joined_at')
      .eq('thread_id', thread.id);

    // Get user profiles from MongoDB
    const memberUserIds = (members || []).map(m => m.user_id).filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    const mongoUsers = await User.find({ _id: { $in: memberUserIds } }).select('name profilePicture role email').lean();
    const userMap = {};
    mongoUsers.forEach(u => { userMap[u._id.toString()] = u; });

    const formattedMembers = (members || []).map(m => {
      const u = userMap[m.user_id];
      return {
        userId: m.user_id,
        name: u?.name || 'User',
        profilePicture: u?.profilePicture || null,
        role: m.role,
        userRole: u?.role || 'student',
        email: u?.email || null,
        joinedAt: m.joined_at,
      };
    });

    res.json({
      group,
      threadId: thread.id,
      members: formattedMembers,
      memberCount: formattedMembers.length,
      myRole: membership.role,
    });
  } catch (err) {
    console.error('Group info error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// PUT /groups/:id — Update group info
// ──────────────────────────────────────────────
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { group, thread, membership } = await getGroupMembership(userId, req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    // Check permissions
    if (membership.role !== 'admin' && group.edit_info_policy === 'admin_only') {
      return res.status(403).json({ error: 'Only admins can edit group info' });
    }

    const { name, description } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const { data, error } = await sb
      .from('chat_groups')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    // Update thread's updated_at
    await sb.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('group_id', req.params.id);

    // Broadcast to active thread chat
    broadcastToChannel(`thread:${thread.id}`, 'thread_updated', { id: thread.id, groupId: req.params.id, ...updates });

    // Broadcast to all members' sidebars
    const { data: members } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', thread.id);
    if (members) {
      Promise.all(members.map(m => 
        broadcastToChannel(`user:${m.user_id}`, 'thread_updated', { 
          id: thread.id, 
          threadId: thread.id, 
          action: 'group_updated',
          groupId: req.params.id,
          ...updates 
        })
      )).catch(err => console.error('Group update broadcast error:', err));
    }

    {
      const oldValue = {}, newValue = {};
      for (const k of Object.keys(updates)) {
        if ((group[k] ?? null) !== (updates[k] ?? null)) { oldValue[k] = group[k] ?? null; newValue[k] = updates[k]; }
      }
      if (Object.keys(newValue).length) {
        forgetGroup(req.params.id);
        logGroupAudit(req, { groupId: req.params.id, action: 'group_details_changed', targetType: 'group', targetId: req.params.id, targetName: data?.name, oldValue, newValue });
      }
    }

    res.json({ group: data });
  } catch (err) {
    console.error('Group update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /groups/:id/photo — Upload group photo
// ──────────────────────────────────────────────
router.post('/:id/photo', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { group, thread, membership } = await getGroupMembership(userId, req.params.id);
    if (!group || !membership) return res.status(403).json({ error: 'Not authorized' });
    
    // Check permissions
    if (membership.role !== 'admin' && group.edit_info_policy === 'admin_only') {
      return res.status(403).json({ error: 'Only admins can change group photo' });
    }

    if (!req.file) return res.status(400).json({ error: 'No photo provided' });

    const type = req.body.type || 'avatar';
    if (type !== 'avatar' && type !== 'banner') return res.status(400).json({ error: 'Invalid photo type' });

    const storageContext = await getGroupAssetStorageContext(group, thread);
    const storagePath = buildGroupPhotoStoragePath(req.file, type, storageContext);

    const publicUrl = await uploadBufferToR2(req.file.buffer, req.file.originalname || 'upload.file', req.file.mimetype || 'application/octet-stream', storagePath);

    const updateField = type === 'banner' ? 'banner_url' : 'avatar_url';

    const { data, error } = await sb
      .from('chat_groups')
      .update({ [updateField]: publicUrl })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    broadcastToChannel(`thread:${thread.id}`, 'thread_updated', { id: thread.id, groupId: req.params.id, [updateField]: publicUrl });

    // Broadcast to all members' sidebars
    const { data: members } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', thread.id);
    if (members) {
      Promise.all(members.map(m => 
        broadcastToChannel(`user:${m.user_id}`, 'thread_updated', { 
          id: thread.id, 
          threadId: thread.id, 
          action: 'group_updated',
          groupId: req.params.id,
          [updateField]: publicUrl 
        })
      )).catch(err => console.error('Group photo update broadcast error:', err));
    }

    logGroupAudit(req, { groupId: req.params.id, action: type === 'banner' ? 'group_banner_changed' : 'group_photo_changed', targetType: 'group', targetId: req.params.id, targetName: data?.name, oldValue: { [updateField]: group?.[updateField] || null }, newValue: { [updateField]: publicUrl } });

    res.json({ group: data });
  } catch (err) {
    console.error('Group photo error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// PUT /groups/:id/permissions — Update permissions
// ──────────────────────────────────────────────
router.put('/:id/permissions', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { group, membership } = await getGroupMembership(userId, req.params.id);
    if (!group || !membership) return res.status(403).json({ error: 'Not authorized' });

    if (membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change group permissions' });
    }

    const { 
      send_message_policy, 
      edit_info_policy,
      add_member_policy,
      create_poll_policy,
      send_attachments_policy,
      require_message_approval,
      require_join_approval,
      group_type,
      is_private,
      is_official,
      auto_add_roles,
      admin_roles
    } = req.body;
    
    const updates = {};
    
    if (['all', 'admin_only'].includes(send_message_policy)) updates.send_message_policy = send_message_policy;
    if (['all', 'admin_only'].includes(edit_info_policy)) updates.edit_info_policy = edit_info_policy;
    if (['all', 'admin_only'].includes(add_member_policy)) updates.add_member_policy = add_member_policy;
    if (['all', 'admin_only'].includes(create_poll_policy)) updates.create_poll_policy = create_poll_policy;
    if (['all', 'admin_only'].includes(send_attachments_policy)) updates.send_attachments_policy = send_attachments_policy;
    
    if (typeof require_message_approval === 'boolean') updates.require_message_approval = require_message_approval;
    if (typeof require_join_approval === 'boolean') updates.require_join_approval = require_join_approval;
    if (typeof is_private === 'boolean') updates.is_private = is_private;
    if (typeof is_official === 'boolean') updates.is_official = is_official;
    
    if (Array.isArray(auto_add_roles)) updates.auto_add_roles = auto_add_roles;
    if (Array.isArray(admin_roles)) updates.admin_roles = admin_roles;
    
    const validGroupTypes = ['general', 'class', 'department', 'subject', 'team_staff', 'official_announcement'];
    if (validGroupTypes.includes(group_type)) updates.group_type = group_type;

    // Fallback for legacy send_messages
    if (req.body.send_messages && ['all', 'admin_only'].includes(req.body.send_messages)) {
      updates.send_message_policy = req.body.send_messages;
    }
    // Fallback for legacy edit_info
    if (req.body.edit_info && ['all', 'admin_only'].includes(req.body.edit_info)) {
       updates.edit_info_policy = req.body.edit_info;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Invalid or no permission values provided' });
    }

    const { data, error } = await sb
      .from('chat_groups')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    // Sync `allow_replies` on the thread if `send_message_policy` was updated
    if (updates.send_message_policy) {
      const allowReplies = updates.send_message_policy === 'all';
      await sb.from('chat_threads')
        .update({ allow_replies: allowReplies })
        .eq('group_id', req.params.id);
        
      broadcastToChannel(`thread:${membership.thread_id}`, 'thread_updated', { 
        id: membership.thread_id, 
        groupId: req.params.id, 
        allow_replies: allowReplies 
      });
    }

    {
      const oldValue = {}, newValue = {};
      for (const k of Object.keys(updates)) {
        if (JSON.stringify(group[k] ?? null) !== JSON.stringify(updates[k] ?? null)) { oldValue[k] = group[k] ?? null; newValue[k] = updates[k]; }
      }
      if (Object.keys(newValue).length) {
        logGroupAudit(req, { groupId: req.params.id, action: 'permissions_updated', targetType: 'group', targetId: req.params.id, targetName: group.name, oldValue, newValue });
      }
    }

    broadcastToChannel(`thread:${membership.thread_id}`, 'thread_updated', { id: membership.thread_id, groupId: req.params.id, permissions_updated: true });

    res.json({ group: data });
  } catch (err) {
    console.error('Permission update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// PUT /groups/:id/admins/:userId — Promote/demote
// ──────────────────────────────────────────────
router.put('/:id/admins/:userId', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const targetId = req.params.userId;
    const { group, thread, membership } = await getGroupMembership(myId, req.params.id);
    if (!group || !membership) return res.status(403).json({ error: 'Not authorized' });
    if (membership.role !== 'admin') return res.status(403).json({ error: 'Only admins can manage roles' });

    const { role } = req.body; // 'admin' or 'member'
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const { error } = await sb
      .from('chat_thread_members')
      .update({ role })
      .eq('thread_id', thread.id)
      .eq('user_id', targetId);
    if (error) throw error;

    broadcastToChannel(`thread:${thread.id}`, 'thread_updated', { id: thread.id, groupId: req.params.id });

    notifyChatEvent({
      actorId: myId, recipientId: targetId, threadId: thread.id,
      title: role === 'admin' ? `You're now an admin of ${group.name || 'a group'}` : `You're no longer an admin of ${group.name || 'a group'}`,
      message: `Changed by ${req.user.name || 'an admin'}`,
    });

    {
      const target = await User.findById(targetId).select('name').lean().catch(() => null);
      logGroupAudit(req, { groupId: req.params.id, action: role === 'admin' ? 'member_promoted' : 'member_demoted', targetType: 'user', targetId, targetName: target?.name, newValue: { role } });
    }

    res.json({ ok: true, userId: targetId, newRole: role });
  } catch (err) {
    console.error('Admin toggle error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /groups/:id/members — Add member
// ──────────────────────────────────────────────
router.post('/:id/members', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const orgId = req.user.organization_id?.toString();
    const { group, thread, membership } = await getGroupMembership(myId, req.params.id);
    if (!group || !membership) return res.status(403).json({ error: 'Not authorized' });
    
    // Check add_member_policy
    const policy = group.add_member_policy || 'admin_only';
    const isFaculty = ['faculty', 'teacher', 'hod', 'principal', 'vice_principal'].includes(req.user.role);
    const isAdmin = membership.role === 'admin';

    if (policy === 'org_admin_only' && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can add members to this group' });
    }
    if (policy === 'admin_only' && !isAdmin) {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }
    if (policy === 'admin_faculty' && !isAdmin && !isFaculty) {
       return res.status(403).json({ error: 'Only admins and faculty can add members' });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Verify user is in same org (unless acting as super admin)
    const targetUser = await User.findById(userId).select('organization_id name').lean();
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    
    const isSuperAdmin = req.user.role === 'super_admin' || req.realUser?.role === 'super_admin';
    // If not super admin, check if target user is in same org
    // Alternatively, if it's a specific org group, super admin can add anyone to it or we can check against group.org_id
    if (!isSuperAdmin && targetUser.organization_id?.toString() !== orgId) {
      return res.status(403).json({ error: 'User is not in your organization' });
    }

    const { error } = await sb
      .from('chat_thread_members')
      .insert([{ thread_id: thread.id, user_id: userId, role: 'member' }]);

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'User is already a member' });
      throw error;
    }

    // Update thread
    await sb.from('chat_threads').update({ 
      updated_at: new Date().toISOString(),
      last_message: `${targetUser.name} joined the group`,
      last_message_at: new Date().toISOString()
    }).eq('id', thread.id);

    logGroupAudit(req, { groupId: req.params.id, action: 'member_added', targetType: 'user', targetId: userId, targetName: targetUser.name, newValue: { user_id: userId, name: targetUser.name, added_by: req.user.name || null } });

    // Insert system message for the chat feed
    const { data: sysMsg } = await sb.from('chat_messages').insert([{
      thread_id: thread.id,
      sender_id: myId,
      sender_name: 'System',
      message: JSON.stringify({ type: 'system', text: `${targetUser.name} joined the group` })
    }]).select().single();

    notifyChatEvent({
      actorId: myId, recipientId: userId, threadId: thread.id,
      title: `${req.user.name || 'Someone'} added you to ${group.name || 'a group'}`,
    });

    // Broadcast to the added user so they see the group
    broadcastToChannel(`user:${userId}`, 'thread_updated', { id: thread.id, threadId: thread.id, action: 'new_group', groupId: group.id });
    // Broadcast to the group so others update their member list
    broadcastToChannel(`thread:${thread.id}`, 'thread_updated', { id: thread.id, groupId: group.id, action: 'member_added' });
    
    if (sysMsg) {
      broadcastToChannel(`thread:${thread.id}`, 'new_message', { ...sysMsg, attachments: [], reactions: {} });
    }

    res.status(201).json({ ok: true, userId });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// DELETE /groups/:id/members/:userId — Remove member
// ──────────────────────────────────────────────
router.delete('/:id/members/:userId', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const targetId = req.params.userId;
    const { group, thread, membership } = await getGroupMembership(myId, req.params.id);
    if (!group || !membership) return res.status(403).json({ error: 'Not authorized' });
    if (membership.role !== 'admin') return res.status(403).json({ error: 'Only admins can remove members' });
    if (targetId === group.created_by) return res.status(400).json({ error: 'Cannot remove the group creator' });

    const { error } = await sb
      .from('chat_thread_members')
      .delete()
      .eq('thread_id', thread.id)
      .eq('user_id', targetId);
    if (error) throw error;

    await sb.from('chat_threads').update({ 
      updated_at: new Date().toISOString(),
      last_message: `A member was removed from the group`,
      last_message_at: new Date().toISOString()
    }).eq('id', thread.id);

    // Insert system message for the chat feed
    const { data: sysMsg } = await sb.from('chat_messages').insert([{
      thread_id: thread.id,
      sender_id: myId,
      sender_name: 'System',
      message: JSON.stringify({ type: 'system', text: `A member was removed from the group` })
    }]).select().single();

    broadcastToChannel(`user:${targetId}`, 'thread_deleted', { threadId: thread.id, action: 'removed_from_group' });
    notifyChatEvent({
      actorId: myId, recipientId: targetId,
      title: `You were removed from ${group.name || 'a group'}`,
      message: `Removed by ${req.user.name || 'an admin'}`,
    });
    broadcastToChannel(`thread:${thread.id}`, 'thread_updated', { id: thread.id, groupId: group.id, action: 'member_removed' });

    if (sysMsg) {
      broadcastToChannel(`thread:${thread.id}`, 'new_message', { ...sysMsg, attachments: [], reactions: {} });
    }

    {
      const target = await User.findById(targetId).select('name').lean().catch(() => null);
      logGroupAudit(req, { groupId: req.params.id, action: 'member_removed', targetType: 'user', targetId, targetName: target?.name });
    }

    res.json({ ok: true, removedUserId: targetId });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /groups/:id/exit — Leave group
// ──────────────────────────────────────────────
router.post('/:id/exit', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { group, thread, membership } = await getGroupMembership(myId, req.params.id);
    if (!group || !membership) return res.status(403).json({ error: 'Not a member' });

    // If creator leaves, delete the whole group
    if (myId === group.created_by) {
      return res.status(400).json({ error: 'Group creator cannot exit. Delete the group instead.' });
    }

    const { error } = await sb
      .from('chat_thread_members')
      .delete()
      .eq('thread_id', thread.id)
      .eq('user_id', myId);
    if (error) throw error;

    await sb.from('chat_threads').update({ 
      updated_at: new Date().toISOString(),
      last_message: `${req.user.name} left the group`,
      last_message_at: new Date().toISOString()
    }).eq('id', thread.id);

    // Insert system message for the chat feed
    const { data: sysMsg } = await sb.from('chat_messages').insert([{
      thread_id: thread.id,
      sender_id: myId,
      sender_name: 'System',
      message: JSON.stringify({ type: 'system', text: `${req.user.name} left the group` })
    }]).select().single();

    broadcastToChannel(`user:${myId}`, 'thread_deleted', { threadId: thread.id, action: 'left_group' });
    broadcastToChannel(`thread:${thread.id}`, 'thread_updated', { id: thread.id, groupId: group.id, action: 'member_removed' });

    if (sysMsg) {
      broadcastToChannel(`thread:${thread.id}`, 'new_message', { ...sysMsg, attachments: [], reactions: {} });
    }

    logGroupAudit(req, { groupId: req.params.id, action: 'member_left', targetType: 'user', targetId: myId, targetName: req.user.name });

    res.json({ ok: true, leftGroup: req.params.id });
  } catch (err) {
    console.error('Exit group error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// DELETE /groups/:id — Delete group (creator/admin only)
// ──────────────────────────────────────────────
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { group, thread, membership } = await getGroupMembership(myId, req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete the group' });
    }

    // Fetch members BEFORE deleting so we can notify them
    let members = [];
    if (thread) {
      const { data } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', thread.id);
      if (data) members = data;
    }

    // CASCADE will handle: thread → members, messages → attachments, polls → votes
    await logGroupAudit(req, { groupId: req.params.id, action: 'group_deleted', targetType: 'group', targetId: req.params.id, targetName: group.name, groupName: group.name, oldValue: { name: group.name } });
    forgetGroup(req.params.id);
    let { error } = await sb.from('chat_groups').delete().eq('id', req.params.id);
    if (error?.code === '23503') {
      // An old foreign key from chat_group_audit_logs blocks the delete (until migration 007 removes it):
      // detach this group's logs (they keep group_name) and try again
      await sb.from('chat_group_audit_logs').update({ group_id: null }).eq('group_id', req.params.id);
      ({ error } = await sb.from('chat_groups').delete().eq('id', req.params.id));
    }
    if (error) throw error;

    if (thread) {
      broadcastToChannel(`thread:${thread.id}`, 'thread_deleted', { threadId: thread.id });
      
      // Notify all members' sidebars
      Promise.all(members.map(m => 
        broadcastToChannel(`user:${m.user_id}`, 'thread_deleted', { threadId: thread.id, action: 'group_deleted' })
      )).catch(() => {});
      
      // Notify org to refresh explore groups tab
      if (!group.is_private && group.org_id) {
        broadcastToChannel(`org:${group.org_id}`, 'explore_groups_update', { groupId: group.id }).catch(() => {});
      }
    }

    res.json({ ok: true, deletedGroup: req.params.id });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /groups/:id/polls — Create poll
// ──────────────────────────────────────────────
router.post('/:id/polls', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { group, thread, membership } = await getGroupMembership(myId, req.params.id);
    if (!group || !membership) return res.status(403).json({ error: 'Not a member' });

    const { question, options, allowMultiple, isAnonymous, closesAt } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'Poll question is required' });
    if (!options || !Array.isArray(options) || options.length < 2 || options.length > 10) {
      return res.status(400).json({ error: 'Poll must have 2-10 options' });
    }

    // Format options with IDs
    const formattedOptions = options.map((text, i) => ({
      id: String.fromCharCode(97 + i), // a, b, c, ...
      text: typeof text === 'string' ? text.trim() : text.text?.trim() || '',
    }));

    // Create a system message for the poll
    const now = new Date().toISOString();
    const { data: insertedMsg, error: insertErr } = await sb.from('chat_messages').insert({
      thread_id: thread.id,
      sender_id: myId,
      sender_name: req.user.name || 'User',
      user_avatar: req.user.profilePicture || null,
      message: `📊 Poll: ${question.trim()}`,
      created_at: now
    }).select('id').single();
    if (insertErr) throw insertErr;
    const msgId = insertedMsg.id;

    // Update thread metadata
    sb.from('chat_threads')
      .update({ last_message: `📊 Poll: ${question.trim()}`, last_message_at: now })
      .eq('id', thread.id)
      .then(() => {})
      .catch(() => {});

    // Create poll record
    const { data: poll, error: pollErr } = await sb
      .from('chat_polls')
      .insert([{
        thread_id: thread.id,
        message_id: msgId,
        question: question.trim(),
        options: formattedOptions,
        allow_multiple: allowMultiple || false,
        is_anonymous: isAnonymous || false,
        created_by: myId,
        closes_at: closesAt || null,
      }])
      .select()
      .single();
    if (pollErr) throw pollErr;

    // Broadcast
    await broadcastToChannel(`thread:${thread.id}`, 'new_poll', {
      poll: {
        ...poll,
        voteCounts: {},
        totalVoters: 0,
        myVotes: [],
      },
      messageId: msgId,
    });

    res.status(201).json({ poll });
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /groups/:id/polls/:pollId/vote — Vote
// ──────────────────────────────────────────────
router.post('/:id/polls/:pollId/vote', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { pollId } = req.params;
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ error: 'optionId is required' });

    const { group, thread, membership } = await getGroupMembership(myId, req.params.id);
    if (!group || !membership) return res.status(403).json({ error: 'Not a member' });

    // Get poll details
    const { data: poll } = await sb.from('chat_polls').select('*').eq('id', pollId).single();
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    // Check if poll is closed
    if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
      return res.status(400).json({ error: 'This poll is closed' });
    }

    // Validate option exists
    const validOptionIds = poll.options.map(o => o.id);
    if (!validOptionIds.includes(optionId)) {
      return res.status(400).json({ error: 'Invalid option' });
    }

    // If single-choice: delete previous votes first
    if (!poll.allow_multiple) {
      await sb.from('chat_poll_votes').delete().eq('poll_id', pollId).eq('user_id', myId);
    }

    // Insert vote
    const { error } = await sb
      .from('chat_poll_votes')
      .insert([{ poll_id: pollId, user_id: myId, option_id: optionId }]);

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Already voted for this option' });
      throw error;
    }

    // Get updated vote counts
    const { data: allVotes } = await sb.from('chat_poll_votes').select('option_id, user_id').eq('poll_id', pollId);
    const voteCounts = {};
    (allVotes || []).forEach(v => {
      voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
    });

    // Broadcast vote update
    await broadcastToChannel(`thread:${thread.id}`, 'poll_vote', {
      pollId,
      voteCounts,
      totalVoters: new Set((allVotes || []).map(v => v.user_id)).size,
    });

    res.json({ ok: true, voteCounts });
  } catch (err) {
    console.error('Poll vote error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /groups/:id/polls/:pollId/voters — Get voters for a poll
// ──────────────────────────────────────────────
router.get('/:id/polls/:pollId/voters', isAuthenticated, async (req, res) => {
  try {
    const pollId = req.params.pollId;
    const { data: votes } = await sb.from('chat_poll_votes').select('option_id, user_id').eq('poll_id', pollId);
    res.json({ votes: votes || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /groups/:id/polls — List polls in group
// ──────────────────────────────────────────────
router.get('/:id/polls', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { group, thread, membership } = await getGroupMembership(myId, req.params.id);
    if (!group || !membership) return res.status(403).json({ error: 'Not a member' });

    const { data: polls, error } = await sb
      .from('chat_polls')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Get vote counts for each poll
    const result = await Promise.all((polls || []).map(async (poll) => {
      const { data: votes } = await sb.from('chat_poll_votes').select('option_id, user_id').eq('poll_id', poll.id);
      const voteCounts = {};
      (votes || []).forEach(v => { voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1; });
      const myVotes = (votes || []).filter(v => v.user_id === myId).map(v => v.option_id);

      return {
        ...poll,
        voteCounts,
        totalVoters: new Set((votes || []).map(v => v.user_id)).size,
        myVotes,
      };
    }));

    res.json({ polls: result });
  } catch (err) {
    console.error('List polls error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /groups/audit — Get organization chat audit logs
// ──────────────────────────────────────────────
router.get('/audit', isAuthenticated, async (req, res) => {
  try {
    const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(req.user.role);
    if (!isOrgAdmin) return res.status(403).json({ error: 'Only org admins can view audit logs' });

    // Join with chat_groups to verify org access, or just fetch all since it's admin
    const { data: logs, error } = await sb
      .from('chat_group_audit_logs')
      .select('*, group:chat_groups(name, org_id)')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (error) throw error;
    
    // Filter by org
    const filteredLogs = req.user.role === 'super_admin' 
      ? logs 
      : logs?.filter(log => log.group?.org_id === req.user.organization_id?.toString()) || [];

    res.json({ logs: filteredLogs });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /groups/:id/join-request — Student requests to join
// ──────────────────────────────────────────────
router.post('/:id/join-request', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const groupId = req.params.id;
    
    // Validate group exists and requires approval
    const { data: group, error: groupErr } = await sb.from('chat_groups').select('*').eq('id', groupId).single();
    if (groupErr || !group) return res.status(404).json({ error: 'Group not found' });
    
    // Strict org isolation: users can only join groups in their own org
    const isSuperAdmin = req.user.role === 'super_admin';
    const myOrgId = req.user.organization_id?.toString();
    if (group.org_id && group.org_id !== myOrgId && !isSuperAdmin) {
       return res.status(403).json({ error: 'You cannot join a group from another organization' });
    }

    if (group.is_private) {
       return res.status(403).json({ error: 'Cannot request to join a private group' });
    }

    if (!group.require_join_approval) {
       return res.status(400).json({ error: 'Group does not require join approval' });
    }
    
    // Check if already a member
    const { data: thread } = await sb.from('chat_threads').select('id').eq('group_id', groupId).single();
    if (thread) {
       const { data: mem } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', thread.id).eq('user_id', userId).maybeSingle();
       if (mem) return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Check if request already exists
    const { data: existing } = await sb.from('chat_group_join_requests')
       .select('status')
       .eq('group_id', groupId)
       .eq('user_id', userId)
       .maybeSingle();
       
    if (existing && existing.status === 'pending') {
       return res.status(400).json({ error: 'You already have a pending join request for this group' });
    }

    // Create request
    const { data: request, error: reqErr } = await sb.from('chat_group_join_requests').insert({
       group_id: groupId,
       user_id: userId,
       user_name: req.user.name || '',
       user_avatar: req.user.profilePicture || '',
       status: 'pending'
    }).select().single();

    if (reqErr) throw reqErr;
    
    // Send Notification to admin(s)
    if (thread) {
       const { data: admins } = await sb.from('chat_thread_members')
         .select('user_id')
         .eq('thread_id', thread.id)
         .in('role', ['admin', 'creator']);
         
       if (admins && admins.length > 0) {
          const { dispatchNotification } = await import('../services/notification.service.js');
          for (const admin of admins) {
             if (admin.user_id === userId) continue;
             await dispatchNotification({
                recipientId: admin.user_id,
                type: 'group_join',
                title: 'New Join Request',
                message: `${req.user.name || 'A user'} wants to join "${group.name}".`,
                link: `/chat`, // Usually clicking notification takes them to chat where they can review
             }).catch(console.error); // Catch error so it doesn't block request
          }
       }
    }
    
    logGroupAudit(req, { groupId, action: 'join_requested', targetType: 'user', targetId: userId, targetName: req.user.name });

    res.status(201).json({ request });
  } catch (err) {
    console.error('Join request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /groups/:id/join-requests — Get pending join requests
// ──────────────────────────────────────────────
router.get('/:id/join-requests', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const groupId = req.params.id;
    
    const { group, membership } = await getGroupMembership(myId, groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const isAdmin = membership?.role === 'admin';
    
    // Normal users can only see their own requests
    let query = sb.from('chat_group_join_requests').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    
    if (!isAdmin) {
       query = query.eq('user_id', myId);
    }
    
    const { data: requests, error } = await query;
    if (error) throw error;
    
    res.json({ requests: requests || [] });
  } catch (err) {
    console.error('Get join requests error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// PATCH /groups/:id/join-requests/:requestId — Approve or Reject
// ──────────────────────────────────────────────
router.patch('/:id/join-requests/:requestId', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const groupId = req.params.id;
    const { requestId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
       return res.status(400).json({ error: 'Invalid status' });
    }
    
    const { group, thread, membership } = await getGroupMembership(myId, groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    const isAdmin = membership?.role === 'admin';
    
    if (!isAdmin) return res.status(403).json({ error: 'Only admins can process join requests' });
    
    // Fetch request
    const { data: request } = await sb.from('chat_group_join_requests').select('*').eq('id', requestId).eq('group_id', groupId).single();
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is already processed' });
    
    // Update request
    const { error: updateErr } = await sb.from('chat_group_join_requests').update({
       status,
       processed_at: new Date().toISOString(),
       processed_by: myId
    }).eq('id', requestId);
    if (updateErr) throw updateErr;
    
    // If approved, add to group
    if (status === 'approved' && thread) {
       await sb.from('chat_thread_members').insert({
          thread_id: thread.id,
          user_id: request.user_id,
          role: 'member'
       });
    }

    {
      const requester = await User.findById(request.user_id).select('name').lean().catch(() => null);
      logGroupAudit(req, { groupId, action: status === 'approved' ? 'join_request_approved' : 'join_request_rejected', targetType: 'user', targetId: request.user_id, targetName: requester?.name });
    }

    // Send Notification to user
    const { dispatchNotification } = await import('../services/notification.service.js');
    const title = `Group Join Request ${status === 'approved' ? 'Approved' : 'Rejected'}`;
    const message = `Your request to join "${group.name}" has been ${status}.`;
    
    await dispatchNotification({
       recipientId: request.user_id,
       type: 'group_join',
       title,
       message,
       link: '/chat',
       relatedId: groupId,
       sendPush: true
    });
    
    res.json({ ok: true, status });
  } catch (err) {
    console.error('Process join request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /groups/:id/join — User joins a public group directly
// ──────────────────────────────────────────────
router.post('/:id/join', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const groupId = req.params.id;
    
    // Validate group exists and does not require approval
    const { data: group, error: groupErr } = await sb.from('chat_groups').select('*').eq('id', groupId).single();
    if (groupErr || !group) return res.status(404).json({ error: 'Group not found' });
    
    if (group.is_private) {
       return res.status(403).json({ error: 'Cannot join private groups directly' });
    }
    
    const isSuperAdmin = req.user.role === 'super_admin';
    const myOrgId = req.user.organization_id?.toString();
    if (group.org_id && group.org_id !== myOrgId && !isSuperAdmin) {
       return res.status(403).json({ error: 'Cannot join a group from another organization' });
    }

    if (group.require_join_approval) {
       return res.status(400).json({ error: 'Group requires join approval' });
    }
    
    const { data: thread } = await sb.from('chat_threads').select('id').eq('group_id', groupId).single();
    if (!thread) return res.status(404).json({ error: 'Group thread not found' });

    // Check if already a member
    const { data: mem } = await sb.from('chat_thread_members').select('user_id').eq('thread_id', thread.id).eq('user_id', userId).maybeSingle();
    if (mem) return res.status(400).json({ error: 'You are already a member of this group' });

    // Insert user
    await sb.from('chat_thread_members').insert({
       thread_id: thread.id,
       user_id: userId,
       role: 'member'
    });
    
    logGroupAudit(req, { groupId, action: 'member_joined', targetType: 'user', targetId: userId, targetName: req.user.name });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
