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
import User from "../models/User.js";
import { dispatchNotification } from "./notification.service.js";
import { io } from "./socket.service.js";

const DEPARTMENTS = new Set(["general", "onboarding", "admissions", "fees", "technical", "billing"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

const sanitizeDepartment = (value) => {
  const normalized = String(value || "general").trim().toLowerCase();
  return DEPARTMENTS.has(normalized) ? normalized : "general";
};

const sanitizePriority = (value) => {
  const normalized = String(value || "normal").trim().toLowerCase();
  return PRIORITIES.has(normalized) ? normalized : "normal";
};

const serializeConversation = (conversation) => {
  if (!conversation) return null;
  return {
    _id: conversation._id,
    organization_id: conversation.organization_id,
    subject: conversation.subject,
    department: conversation.department,
    status: conversation.status,
    priority: conversation.priority,
    unreadForOrgAdmin: conversation.unreadForOrgAdmin,
    unreadForSuperAdmin: conversation.unreadForSuperAdmin,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    createdBy: conversation.createdBy,
    participants: conversation.participants,
    messages: conversation.messages || [],
  };
};

const emitSupportUpdate = (conversation, eventName) => {
  if (!io || !conversation?._id) return;
  const payload = serializeConversation(conversation);
  io.to(`support:${conversation._id}`).emit(eventName, payload);
  io.to(`org_support:${conversation.organization_id}`).emit("support_thread_updated", payload);
  io.to("superadmin:support").emit("support_thread_updated", payload);
};

export async function createSupportConversation({ organizationId, createdBy, subject, department, priority, body }) {
  const conversation = await SupportConversation.create({
    organization_id: organizationId,
    createdBy,
    subject: String(subject || "").trim(),
    department: sanitizeDepartment(department),
    priority: sanitizePriority(priority),
    participants: [createdBy],
    unreadForOrgAdmin: 0,
    unreadForSuperAdmin: 1,
    lastMessageAt: new Date(),
    messages: [{
      sender: createdBy,
      senderRole: "org_admin",
      department: sanitizeDepartment(department),
      body: String(body || "").trim(),
    }],
  });

  const org = await Organization.findById(organizationId).select("name").lean();
  const superAdmins = await User.find({ role: "super_admin", status: "active" }).select("_id").lean();

  for (const admin of superAdmins) {
    await dispatchNotification({
      recipientId: admin._id,
      type: "support_update",
      title: `New ${conversation.department} helpdesk thread`,
      message: `${org?.name || "An organization"} opened: ${conversation.subject}`,
      link: `/super-admin/helpdesk/${conversation._id}`,
      relatedId: conversation._id.toString(),
      sendPush: true,
      sendEmail: true,
    });
  }

  emitSupportUpdate(conversation, "support_thread_created");
  return conversation;
}

export async function addSupportMessage({ conversationId, senderId, senderRole, body, department = null }) {
  const conversation = await SupportConversation.findById(conversationId);
  if (!conversation) return null;

  conversation.messages.push({
    sender: senderId,
    senderRole,
    department: department ? sanitizeDepartment(department) : null,
    body: String(body || "").trim(),
  });

  if (!conversation.participants.some((id) => id.toString() === String(senderId))) {
    conversation.participants.push(senderId);
  }

  conversation.lastMessageAt = new Date();
  if (senderRole === "org_admin") {
    conversation.unreadForSuperAdmin += 1;
  } else {
    conversation.unreadForOrgAdmin += 1;
    if (conversation.status === "open") conversation.status = "in_progress";
  }

  await conversation.save();

  const org = await Organization.findById(conversation.organization_id).select("name ownerEmail ownerName").lean();
  const orgAdmin = await User.findOne({ organization_id: conversation.organization_id, role: "org_admin", status: "active" })
    .select("_id email name")
    .lean();

  if (senderRole === "org_admin") {
    const superAdmins = await User.find({ role: "super_admin", status: "active" }).select("_id").lean();
    for (const admin of superAdmins) {
      await dispatchNotification({
        recipientId: admin._id,
        type: "support_update",
        title: `New reply in ${conversation.department} thread`,
        message: `${org?.name || "An organization"} replied: ${conversation.subject}`,
        link: `/super-admin/helpdesk/${conversation._id}`,
        relatedId: conversation._id.toString(),
        sendPush: true,
        sendEmail: true,
      });
    }
  } else if (orgAdmin?._id) {
    await dispatchNotification({
      recipientId: orgAdmin._id,
      type: "support_update",
      title: `Classgrid replied from ${conversation.department}`,
      message: `Update on: ${conversation.subject}`,
      link: `/org/helpdesk/${conversation._id}`,
      relatedId: conversation._id.toString(),
      sendPush: true,
      sendEmail: true,
    });
  }

  emitSupportUpdate(conversation, "support_message_created");
  return conversation;
}

export async function markSupportConversationRead({ conversationId, actorRole }) {
  const update = actorRole === "org_admin"
    ? { unreadForOrgAdmin: 0 }
    : { unreadForSuperAdmin: 0 };

  const conversation = await SupportConversation.findByIdAndUpdate(
    conversationId,
    { $set: update },
    { returnDocument: 'after' }
  );

  if (conversation) emitSupportUpdate(conversation, "support_thread_read");
  return conversation;
}

export { serializeConversation, sanitizeDepartment, sanitizePriority };
