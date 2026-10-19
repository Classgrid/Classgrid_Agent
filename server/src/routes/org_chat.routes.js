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
import { isAuthenticated } from '../middleware/auth.middleware.js';
import User from '../models/User.js'; // MongoDB User model
import { broadcastToChannel } from '../services/realtimeBroadcast.js';
import { studentNotesClient, primarySupabaseClient } from '../config/supabaseClient.js';
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";
import mongoose from 'mongoose';
import { CHAT_PUBLIC_ORG_ID } from "../utils/chat-onboarding.js";


const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// ─────────────────────────────────────────────
// GET list of users in the same organization
// ─────────────────────────────────────────────
// ──────────────────────────────────────────────
// Blocking (Grid DMs, WhatsApp-style). Everything is pushed live over the socket ("user:block_updated")
// so both people's screens change instantly.
// GET /blocks → { blocked: [{ id, name, email, profilePicture }], blockedMe: [userId] }
// POST /blocks/:userId → block · DELETE /blocks/:userId → unblock
// ──────────────────────────────────────────────
router.get('/blocks', isAuthenticated, async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const me = await User.findById(myId).select('blocked_users').lean();
    const ids = (me?.blocked_users || []).filter(id => mongoose.Types.ObjectId.isValid(id));
    const [blocked, blockedMeDocs] = await Promise.all([
      ids.length ? User.find({ _id: { $in: ids } }).select('name email profilePicture').lean() : [],
      User.find({ blocked_users: myId }).select('_id').lean(),
    ]);
    res.json({
      blocked: blocked.map(u => ({ id: u._id.toString(), name: u.name || '', email: u.email || '', profilePicture: u.profilePicture || null })),
      blockedMe: blockedMeDocs.map(u => u._id.toString()),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function setBlock(req, res, block) {
  try {
    const myId = req.user._id.toString();
    const otherId = String(req.params.userId || '');
    if (!mongoose.Types.ObjectId.isValid(otherId) || otherId === myId) return res.status(400).json({ error: 'Invalid user' });
    const other = await User.findById(otherId).select('_id').lean();
    if (!other) return res.status(404).json({ error: 'User not found' });
    await User.updateOne({ _id: myId }, block ? { $addToSet: { blocked_users: otherId } } : { $pull: { blocked_users: otherId } });
    // Live: my own tabs refresh the blocked list; the other person's app hides/shows my presence at once
    broadcastToChannel(`user:${myId}`, 'block_updated', { userId: otherId, blocked: block, by: 'me' });
    broadcastToChannel(`user:${otherId}`, 'block_updated', { userId: myId, blocked: block, by: 'them' });
    res.json({ ok: true, userId: otherId, blocked: block });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
router.post('/blocks/:userId', isAuthenticated, (req, res) => setBlock(req, res, true));
router.delete('/blocks/:userId', isAuthenticated, (req, res) => setBlock(req, res, false));

router.get('/users', isAuthenticated, async (req, res) => {
  const user = req.user;
  try {
    // 🔐 SECURITY: Cross-tenant logic for Super Admins
    let query = {};
    const topAdminRoles = ['org_admin', 'principal', 'vice_principal', 'hod', 'exam_controller', 'fee_manager', 'admission_head', 'library_manager', 'transport_manager'];

    if (user.role === 'super_admin') {
      // RULE 1: Super admins see all other super_admins + all top admins from EVERY org,
      // plus every account of the public chat org (chat.classgrid.in sign-ups), so they can message them directly
      query = {
        $or: [
          { role: { $in: ['super_admin', ...topAdminRoles] } },
          { organization_id: CHAT_PUBLIC_ORG_ID },
        ]
      };
    } else if (topAdminRoles.includes(user.role)) {
      // RULE 2: Org Admins & Dept Heads see their org's users + Platform Support (super_admin)
      query = {
        $or: [
          { organization_id: user.organization_id },
          { role: 'super_admin' }
        ]
      };
    } else if (user.organization_id) {
      // RULE 3: Regular students & teachers see their own org + Platform Support (super_admin)
      query = {
        $or: [
          { organization_id: user.organization_id },
          { role: 'super_admin' }
        ]
      };
    } else {
      // Even users without an org should be able to see super admins
      query = { role: 'super_admin' };
    }

    const members = await User.find(query, 'name role email profilePicture profileBanner phoneNumber bio prn hobby _id organization_id metadata lastLoginAt privacySettings blocked_users')
      .populate('organization_id', 'name logo_url')
      .lean();
      
    // Fetch forum usernames
    const db = mongoose.connection.db;
    let forumMap = {};
    if (db && members.length > 0) {
      const emails = members.map(m => m.email).filter(Boolean);
      const forumUsers = await db.collection("forumusers").find({ email: { $in: emails } }).toArray();
      forumUsers.forEach(f => {
        if (f.email) forumMap[f.email] = f.username;
      });
    }

    const viewerId = req.user?._id?.toString();
    const formatted = members.map(m => {
      // Privacy (Settings → Privacy): a hidden email or hobbies is never sent to other people, only to the owner
      const isSelf = m._id.toString() === viewerId;
      const hideEmail = !isSelf && !!m.privacySettings?.hideEmail;
      const hideHobbies = !isSelf && !!m.privacySettings?.hideHobbies;
      // This person blocked me: show only their name (no photo, banner, bio, hobby or last seen), like WhatsApp
      const blockedMe = !isSelf && (m.blocked_users || []).includes(viewerId);
      let metadata = blockedMe ? {} : (m.metadata || {});
      if (hideHobbies && metadata && typeof metadata === 'object') {
        metadata = { ...metadata };
        delete metadata.hobby;
        delete metadata.hobbies;
      }
      return {
      _id: m._id.toString(),
      name: m.name,
      email: hideEmail || blockedMe ? null : (m.email || null),
      role: m.role,
      profilePicture: blockedMe ? null : (m.profilePicture || null),
      profileBanner: blockedMe ? null : (m.profileBanner || null),
      phoneNumber: blockedMe ? null : (m.phoneNumber || null),
      bio: blockedMe ? null : (m.bio || null),
      prn: m.prn || null,
      forumUsername: forumMap[m.email] || null,
      metadata,
      organization_name: m.organization_id?.name || null,
      organization_logo: m.organization_id?.logo_url || null,
      lastLoginAt: blockedMe ? null : (m.lastLoginAt || null),
      hobby: hideHobbies || blockedMe ? null : (m.hobby || m.metadata?.hobby || null),
      };
    });
    res.json({ users: formatted });
  } catch (err) {
    console.error('Org users fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET unread message counts per conversation
// ─────────────────────────────────────────────
router.get('/unread-counts', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?._id?.toString() || req.user?.id;
    if (!userId) return res.json({ counts: {} });
    
    // Fetch messages received by this user that have no read_at timestamp.
    // If the read_at column doesn't exist yet (migration not run), return {}.
    const { data, error } = await primarySupabaseClient
      .from('org_direct_messages')
      .select('sender_id, read_at')
      .eq('receiver_id', userId);

    if (error) {
      // Column might not exist yet — return empty counts without crashing
      console.warn('Unread counts query error (run SQL migration?):', error.message);
      return res.json({ counts: {} });
    }

    // Count rows where read_at is null (unread)
    const counts = {};
    (data || []).forEach(row => {
      if (!row.read_at) {
        counts[row.sender_id] = (counts[row.sender_id] || 0) + 1;
      }
    });

    res.json({ counts });
  } catch (err) {
    console.error('Unread counts error:', err);
    // Don't crash the UI — return empty counts
    res.status(500).json({ counts: {}, error: err.message || JSON.stringify(err) });
  }
});

// ─────────────────────────────────────────────
// POST mark messages as read from a sender
// ─────────────────────────────────────────────
router.post('/messages/:otherUserId/read', isAuthenticated, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user?._id?.toString() || req.user?.id;
    if (!userId || !otherUserId) return res.json({ ok: false, message: 'Missing IDs' });

    const { error } = await primarySupabaseClient
      .from('org_direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .is('read_at', null);

    if (error) {
      // read_at column may not exist yet (migration pending) — degrade gracefully
      console.warn('Mark read error (run SQL migration?):', error.message);
      // Still broadcast seen so ticks update in UI
    }

    // Broadcast seen event regardless of DB update success
    const channel = `dm:${[userId, otherUserId].sort().join(':')}`;
    await broadcastToChannel(channel, 'seen', { readerId: userId, senderId: otherUserId });

    res.json({ ok: true });
  } catch (err) {
    console.error('Mark read error:', err);
    // Don't 500 — just acknowledge
    res.status(500).json({ ok: false, message: err.message || JSON.stringify(err) });
  }
});

// ─────────────────────────────────────────────
// GET direct message history
// ─────────────────────────────────────────────
router.get('/messages/:otherUserId', isAuthenticated, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user?._id?.toString() || req.user?.id;
    const { before } = req.query;

    if (!userId || !otherUserId) return res.json({ messages: [] });

    // Fetch both directions separately then merge — avoids compound and() syntax issues
    // with some Supabase JS client versions
    let qA = primarySupabaseClient
      .from('org_direct_messages')
      .select('*')
      .eq('sender_id', userId)
      .eq('receiver_id', otherUserId)
      .order('created_at', { ascending: true })
      .limit(50);

    let qB = primarySupabaseClient
      .from('org_direct_messages')
      .select('*')
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (before) {
      qA = qA.lt('created_at', before);
      qB = qB.lt('created_at', before);
    }

    const [resA, resB] = await Promise.all([qA, qB]);
    if (resA.error) throw resA.error;
    if (resB.error) throw resB.error;

    // Merge and sort chronologically
    const merged = [...(resA.data || []), ...(resB.data || [])]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-50); // keep latest 50 after merge

    res.json({ messages: merged });
  } catch (err) {
    console.error('DM fetch error:', err);
    res.status(500).json({ error: err.message || JSON.stringify(err) });
  }
});

// ─────────────────────────────────────────────
// POST a new direct message (text + optional file)
// ─────────────────────────────────────────────
router.post('/messages/:otherUserId', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { message, replyTo } = req.body;
    const file = req.file;
    const sender = req.user;
    const senderId = sender?._id?.toString() || sender?.id;

    if (!message && !file) {
      return res.status(400).json({ error: 'Message content or file required' });
    }

    if (!senderId || !otherUserId) return res.status(400).json({ error: 'Missing user IDs' });

    // Build the message row — NO {{ATTACHMENT:...}} embedding ever
    const newMsg = {
      org_id: sender?.organization_id || null,
      sender_id: senderId,
      sender_name: sender?.name || 'User',
      receiver_id: otherUserId,
      message: message ? message.trim() : '',
      created_at: new Date().toISOString(),
      reply_to: replyTo ? (typeof replyTo === 'string' ? JSON.parse(replyTo) : replyTo) : null
    };

    // Handle file upload
    if (file) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `chat/org_dm/${senderId}/${Date.now()}_${safeName}`;

      const publicUrl = await uploadBufferToR2(file.buffer, file.buffer.originalname || 'upload.file', file.buffer.mimetype || 'application/octet-stream', storagePath);

      // Error handled by try-catch

      /* getPublicUrl replaced by R2 */

      newMsg.file_url = publicUrl;
      newMsg.file_name = file.originalname;
      newMsg.file_type = file.mimetype;
      newMsg.file_size = file.size;
    }

    const { data, error } = await primarySupabaseClient
      .from('org_direct_messages')
      .insert([newMsg])
      .select()
      .single();

    if (error) throw error;

    // Broadcast to realtime channel — payload includes all file fields
    const channel = `dm:${[senderId, otherUserId].sort().join(':')}`;
    await broadcastToChannel(channel, 'new_message', data);

    res.status(201).json({ message: data });
  } catch (err) {
    console.error('DM send error:', err);
    res.status(500).json({ error: err.message || JSON.stringify(err) });
  }
});

export default router;
