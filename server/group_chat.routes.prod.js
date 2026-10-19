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
import { primarySupabaseClient, studentNotesClient } from '../config/supabaseClient.js';
import { broadcastToChannel } from '../services/realtimeBroadcast.js';
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";


const router = express.Router();
const sb = primarySupabaseClient;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB for group photos
});

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

    const { name, description, memberIds } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required' });
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'At least one member is required' });
    }

    // Validate all members are in the same org
    const allIds = [...new Set([userId, ...memberIds])];
    const users = await User.find({ _id: { $in: allIds } }).select('organization_id name').lean();
    
    let threadOrgId = orgId || null;
    
    if (isSuperAdmin) {
      const firstMemberOrg = users.find(u => u._id.toString() !== userId && u.organization_id)?.organization_id?.toString();
      threadOrgId = firstMemberOrg || null;
    } else {
      const invalidUsers = users.filter(u => u.organization_id?.toString() !== orgId);
      if (invalidUsers.length > 0) {
        return res.status(400).json({ error: 'All members must be from the same organization' });
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

    // Add members (creator as admin, rest as members)
    const memberRecords = allIds.map(id => ({
      thread_id: thread.id,
      user_id: id,
      role: id === userId ? 'admin' : 'member',
    }));

    const { error: memErr } = await sb.from('chat_thread_members').insert(memberRecords);
    if (memErr) throw memErr;

    // Broadcast to all members so their sidebar updates in real-time
    Promise.all(allIds.map(memberId => 
      broadcastToChannel(`user:${memberId}`, 'thread_updated', {
        threadId: thread.id,
        action: 'new_group',
        groupId: group.id
      })
    )).catch(err => console.error('Group broadcast error:', err));

    res.status(201).json({ group, thread });
  } catch (err) {
    console.error('Group create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /groups/:id — Group info + members
// ──────────────────────────────────────────────
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { group, thread, membership } = await getGroupMembership(userId, req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

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

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `chat/groups/${req.params.id}/${type}_${Date.now()}_${safeName}`;

    const publicUrl = await uploadBufferToR2(req.file.buffer, req.file.originalname || 'upload.file', req.file.mimetype || 'application/octet-stream', storagePath);

    const updateField = type === 'banner' ? 'banner_url' : 'avatar_url';

    const { data, error } = await sb
      .from('chat_groups')
      .update({ [updateField]: publicUrl })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

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
      reply_policy,
      require_message_approval,
      require_join_approval,
      group_type,
      is_official,
      auto_add_roles,
      admin_roles
    } = req.body;
    
    const updates = {};
    
    if (['all', 'admin_only', 'admin_faculty'].includes(send_message_policy)) updates.send_message_policy = send_message_policy;
    if (['all', 'admin_only', 'admin_faculty'].includes(reply_policy)) updates.reply_policy = reply_policy;
    if (['admin_only', 'org_admin_only'].includes(edit_info_policy)) updates.edit_info_policy = edit_info_policy;
    if (['admin_only', 'admin_faculty', 'org_admin_only'].includes(add_member_policy)) updates.add_member_policy = add_member_policy;
    if (['all', 'admin_only', 'admin_faculty'].includes(create_poll_policy)) updates.create_poll_policy = create_poll_policy;
    if (['all', 'admin_only', 'admin_faculty'].includes(send_attachments_policy)) updates.send_attachments_policy = send_attachments_policy;
    
    if (typeof require_message_approval === 'boolean') updates.require_message_approval = require_message_approval;
    if (typeof require_join_approval === 'boolean') updates.require_join_approval = require_join_approval;
    if (typeof is_official === 'boolean') updates.is_official = is_official;
    
    if (Array.isArray(auto_add_roles)) updates.auto_add_roles = auto_add_roles;
    if (Array.isArray(admin_roles)) updates.admin_roles = admin_roles;
    
    const validGroupTypes = ['general', 'announcement', 'class', 'department', 'subject', 'exam', 'fees', 'admission', 'faculty', 'parent', 'transport', 'hostel', 'library', 'event'];
    if (validGroupTypes.includes(group_type)) updates.group_type = group_type;

    // Fallback for legacy send_messages
    if (req.body.send_messages && ['all', 'admin_only', 'admin_faculty'].includes(req.body.send_messages)) {
      updates.send_message_policy = req.body.send_messages;
    }
    // Fallback for legacy edit_info
    if (req.body.edit_info && ['admin_only', 'org_admin_only'].includes(req.body.edit_info)) {
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

    // TODO: Write to chat_group_audit_logs once model is ready
    try {
      await sb.from('chat_group_audit_logs').insert({
        group_id: req.params.id,
        actor_id: userId,
        actor_name: req.user.name || 'Admin',
        action: 'permissions_updated',
        new_value: updates
      });
    } catch (auditErr) {
      console.error('Failed to write audit log:', auditErr);
    }

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
    const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(req.user.role);
    const isFaculty = ['faculty', 'teacher', 'hod', 'principal', 'vice_principal'].includes(req.user.role);
    const isAdmin = membership.role === 'admin' || isOrgAdmin;

    if (policy === 'org_admin_only' && !isOrgAdmin) {
      return res.status(403).json({ error: 'Only organization admins can add members' });
    }
    if (policy === 'admin_only' && !isAdmin) {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }
    if (policy === 'admin_faculty' && !isAdmin && !isFaculty) {
       return res.status(403).json({ error: 'Only admins and faculty can add members' });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Verify user is in same org
    const targetUser = await User.findById(userId).select('organization_id name').lean();
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    const isSuperAdmin = req.user.role === 'super_admin';
    if (targetUser.organization_id?.toString() !== orgId && !isSuperAdmin) {
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
    await sb.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', thread.id);

    try {
      await sb.from('chat_group_audit_logs').insert({
        group_id: req.params.id,
        actor_id: myId,
        actor_name: req.user.name || 'Admin',
        action: 'member_added',
        new_value: { user_id: userId, name: targetUser.name }
      });
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
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

    await sb.from('chat_threads').update({ updated_at: new Date().toISOString() }).eq('id', thread.id);

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

    // CASCADE will handle: thread → members, messages → attachments, polls → votes
    const { error } = await sb.from('chat_groups').delete().eq('id', req.params.id);
    if (error) throw error;

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
    
    const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(req.user.role);
    const isAdmin = membership?.role === 'admin' || isOrgAdmin;
    
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
    
    const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(req.user.role);
    const isAdmin = membership?.role === 'admin' || isOrgAdmin;
    
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
       // Optional: Add audit log
       await sb.from('chat_group_audit_logs').insert({
          group_id: groupId,
          action: 'member_joined',
          actor_id: myId,
          target_user_id: request.user_id,
          details: 'Join request approved'
       });
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

export default router;
