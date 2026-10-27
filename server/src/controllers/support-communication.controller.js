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

import SupportConversation from "../models/SupportConversation.js";
import Organization from "../models/Organization.js";
import { addSupportMessage, createSupportConversation, markSupportConversationRead, serializeConversation, sanitizeDepartment, sanitizePriority } from "../services/support-communication.service.js";

export const listOrgSupportConversations = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) return res.status(400).json({ message: "No organization bound." });

    const conversations = await SupportConversation.find({ organization_id: orgId })
      .sort({ lastMessageAt: -1 })
      .select("subject department status priority unreadForOrgAdmin unreadForSuperAdmin lastMessageAt createdAt updatedAt")
      .lean();

    res.json({ conversations });
  } catch (err) {
    console.error("[Org Helpdesk List] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const createOrgSupportConversation = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    if (!orgId) return res.status(400).json({ message: "No organization bound." });

    const { subject, department, priority, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ message: "Subject and message are required." });
    }

    const conversation = await createSupportConversation({
      organizationId: orgId,
      createdBy: req.user._id,
      subject,
      department,
      priority,
      body,
    });

    res.status(201).json({ conversation: serializeConversation(conversation) });
  } catch (err) {
    console.error("[Org Helpdesk Create] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrgSupportConversation = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const conversation = await SupportConversation.findOne({
      _id: req.params.threadId,
      organization_id: orgId,
    })
      .populate("messages.sender", "name email role")
      .populate("createdBy", "name email role")
      .lean();

    if (!conversation) return res.status(404).json({ message: "Conversation not found." });
    res.json({ conversation });
  } catch (err) {
    console.error("[Org Helpdesk Get] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const sendOrgSupportMessage = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const { body } = req.body;
    if (!body) return res.status(400).json({ message: "Message body is required." });

    const existing = await SupportConversation.findOne({ _id: req.params.threadId, organization_id: orgId }).select("_id").lean();
    if (!existing) return res.status(404).json({ message: "Conversation not found." });

    const conversation = await addSupportMessage({
      conversationId: req.params.threadId,
      senderId: req.user._id,
      senderRole: "org_admin",
      body,
    });

    res.status(201).json({ conversation: serializeConversation(conversation) });
  } catch (err) {
    console.error("[Org Helpdesk Reply] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const markOrgSupportConversationRead = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const existing = await SupportConversation.findOne({ _id: req.params.threadId, organization_id: orgId }).select("_id").lean();
    if (!existing) return res.status(404).json({ message: "Conversation not found." });

    const conversation = await markSupportConversationRead({ conversationId: req.params.threadId, actorRole: "org_admin" });
    res.json({ conversation: serializeConversation(conversation) });
  } catch (err) {
    console.error("[Org Helpdesk Read] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const listSuperAdminSupportConversations = async (req, res) => {
  try {
    const { department, status, orgId } = req.query;
    const filter = {};
    if (department) filter.department = sanitizeDepartment(department);
    if (status) filter.status = status;
    if (orgId) filter.organization_id = orgId;

    const conversations = await SupportConversation.find(filter)
      .populate("createdBy", "name email role organization_id")
      .sort({ lastMessageAt: -1 })
      .lean();

    res.json({ conversations });
  } catch (err) {
    console.error("[SuperAdmin Helpdesk List] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getSuperAdminSupportConversation = async (req, res) => {
  try {
    const conversation = await SupportConversation.findById(req.params.threadId)
      .populate("messages.sender", "name email role organization_id")
      .populate("createdBy", "name email role organization_id")
      .lean();

    if (!conversation) return res.status(404).json({ message: "Conversation not found." });

    const organization = await Organization.findById(conversation.organization_id)
      .select("name ownerName ownerEmail")
      .lean();

    res.json({ conversation, organization });
  } catch (err) {
    console.error("[SuperAdmin Helpdesk Get] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const sendSuperAdminSupportMessage = async (req, res) => {
  try {
    const { body, department } = req.body;
    if (!body) return res.status(400).json({ message: "Message body is required." });

    const conversation = await addSupportMessage({
      conversationId: req.params.threadId,
      senderId: req.user._id,
      senderRole: "super_admin",
      department,
      body,
    });

    if (!conversation) return res.status(404).json({ message: "Conversation not found." });
    res.status(201).json({ conversation: serializeConversation(conversation) });
  } catch (err) {
    console.error("[SuperAdmin Helpdesk Reply] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateSuperAdminSupportConversation = async (req, res) => {
  try {
    const updates = {};
    const { department, priority, status } = req.body;
    if (department) updates.department = sanitizeDepartment(department);
    if (priority) updates.priority = sanitizePriority(priority);
    if (status) updates.status = status;

    const conversation = await SupportConversation.findByIdAndUpdate(
      req.params.threadId,
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!conversation) return res.status(404).json({ message: "Conversation not found." });
    res.json({ conversation: serializeConversation(conversation) });
  } catch (err) {
    console.error("[SuperAdmin Helpdesk Update] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const markSuperAdminSupportConversationRead = async (req, res) => {
  try {
    const conversation = await markSupportConversationRead({ conversationId: req.params.threadId, actorRole: "super_admin" });
    if (!conversation) return res.status(404).json({ message: "Conversation not found." });
    res.json({ conversation: serializeConversation(conversation) });
  } catch (err) {
    console.error("[SuperAdmin Helpdesk Read] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteSuperAdminSupportConversation = async (req, res) => {
  try {
    // Try SupportConversation first (Classgrid Talk / Inquiries)
    let deleted = await SupportConversation.findByIdAndDelete(req.params.threadId);
    
    // If not found, try SupportTicket (In-app Support Tickets)
    if (!deleted) {
      const SupportTicket = (await import("../models/SupportTicket.js")).default;
      deleted = await SupportTicket.findByIdAndDelete(req.params.threadId);
    }
    
    if (!deleted) return res.status(404).json({ message: "Ticket not found." });
    res.json({ success: true, message: "Ticket deleted successfully." });
  } catch (err) {
    console.error("[SuperAdmin Helpdesk Delete] Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
