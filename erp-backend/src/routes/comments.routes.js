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
import { getChatSb } from '../config/supabaseClient.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { broadcastToChannel } from '../services/realtimeBroadcast.js';

const router = express.Router();

// Centralized Supabase Client
const getSupabase = () => getChatSb();

// GET comments for a specific content (announcement or note)
router.get('/:contentId', isAuthenticated, async (req, res) => {
  const { contentId } = req.params;
  try {
    const { data, error } = await getSupabase()
      .from('content_comments')
      .select('*')
      .eq('content_id', contentId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ comments: data });
  } catch (err) {
    console.error('Fetch comments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST a new comment
router.post('/:contentId', isAuthenticated, async (req, res) => {
  const { contentId } = req.params;
  const { comment } = req.body;
  const user = req.user;
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }
  const newComment = {
    content_id: contentId,
    classroom_id: user.organization_id || null, // optional linking
    user_id: user._id.toString(),
    user_name: user.name,
    user_role: user.role,
    comment: comment.trim(),
    created_at: new Date().toISOString()
  };
  try {
    const { data, error } = await getSupabase()
      .from('content_comments')
      .insert([newComment])
      .select()
      .single();
    if (error) throw error;
    // Broadcast to realtime channel for this content
    await broadcastToChannel(`comments:${contentId}`, 'new_comment', data);
    res.status(201).json({ comment: data });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a comment (teacher only)
router.delete('/:commentId', isAuthenticated, async (req, res) => {
  const { commentId } = req.params;
  const user = req.user;
  if (user.role !== 'Teacher' && user.role !== 'Admin') {
    return res.status(403).json({ error: 'Only teachers or admins can delete comments' });
  }
  try {
    const { data, error } = await getSupabase()
      .from('content_comments')
      .delete()
      .eq('id', commentId)
      .single();
    if (error) throw error;
    await broadcastToChannel(`comments:${data.content_id}`, 'delete_comment', { id: commentId });
    res.json({ deleted: data });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
