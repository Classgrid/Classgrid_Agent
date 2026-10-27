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

import express from "express";
import crypto from "crypto";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";
import { multipleUploads } from "../middleware/upload.middleware.js";
import storageService from "../services/storage.service.js";
import { notifyTicketCreatorOfAdminReply, notifyUserOfTicketCreation, notifyUserOfTalkRequestCreation, notifyTalkCreatorOfAdminReply } from "../services/support-ticket-email.service.js";
import { dispatchNotification, bulkDispatchNotification } from "../services/notification.service.js";
import { getIO } from "../services/socket.service.js";



const router = express.Router();

// ──────────────────────────────────────────────────────────────
//  Helper: Verify email belongs to a registered platform user
// ──────────────────────────────────────────────────────────────
async function verifyRegisteredUser(email) {
    const user = await User.findOne(
        { email: email.trim().toLowerCase(), status: "active" },
        "name email organization_id role"
    ).lean();
    return user; // null if not found
}

// ──────────────────────────────────────────────────────────────
//  Strict Session Enforcement for Public Tickets
// ──────────────────────────────────────────────────────────────
async function enforceStrictSession(req, res, next) {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && (req.cookies.token || req.cookies.jwt)) {
        token = req.cookies.token || req.cookies.jwt;
    }

    const proxySecret = req.headers["x-proxy-auth-secret"];
    const proxyEmail = req.headers["x-proxy-auth-email"];
    const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

    if (proxySecret && proxySecret === JWT_SECRET && proxyEmail) {
        req.loggedInUserEmail = proxyEmail.trim().toLowerCase();
        try {
            const user = await User.findOne({ email: req.loggedInUserEmail }).lean();
            if (user && user.role !== "super_admin") {
                req.user = user;
                req.effectiveOrganizationId = user.organization_id ? user.organization_id.toString() : null;
            }
        } catch (err) {}
    } else if (token && token !== "null" && token !== "undefined") {
        try {
            const jwt = await import("jsonwebtoken");
            const decoded = jwt.default.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.id).lean();
            if (user && user.role !== "super_admin") {
                req.loggedInUserEmail = user.email.toLowerCase();
                req.user = user;
                req.effectiveOrganizationId = user.organization_id ? user.organization_id.toString() : null;
            }
        } catch (err) {}
    }

    const email = req.query.email || req.body.email;
    
    // 1. If they are logged in, the email in the request MUST match their logged-in email.
    if (email && req.loggedInUserEmail && req.loggedInUserEmail !== email.trim().toLowerCase()) {
        return res.status(403).json({
            success: false,
            message: "Strict Session Enforced: You are logged in with a different account. Please log out or switch accounts to view this ticket.",
            code: "SESSION_MISMATCH"
        });
    }
    
    // 2. If they are NOT logged in, but the email belongs to a registered user,
    // we force them to log in to access existing tickets (prevents magic link sharing for registered users).
    // We only enforce this for READ and UPDATE endpoints, not for creating new tickets.
    if (email && !req.loggedInUserEmail && req.method !== "OPTIONS") {
        // Only block view/reply/rate/reopen for registered users. Creating tickets is allowed.
        const isCreating = req.method === "POST" && (req.path === "/public/tickets" || req.path === "/public/tickets/");
        if (!isCreating) {
            const registeredUser = await verifyRegisteredUser(email);
            if (registeredUser) {
                 return res.status(403).json({
                    success: false,
                    message: "Strict Session Enforced: This email is registered on Classgrid. You must log in to your account to access this ticket.",
                    code: "SESSION_REQUIRED"
                });
            }
        }
    }

    next();
}

function normalizeMessageRole(role) {
    const normalized = String(role || "").toLowerCase();
    return normalized === "admin" || normalized === "super_admin" || normalized.includes("admin")
        ? "admin"
        : "user";
}

function normalizeTicketMessage(message) {
    return {
        _id: message._id,
        author: message.author || message.authorName || "Classgrid User",
        role: normalizeMessageRole(message.role || message.authorRole),
        date: message.date || message.createdAt || new Date(),
        body: message.body || message.message || "",
        footer: message.footer || "",
        avatar: message.avatar || "",
        orgName: message.orgName || "",
        orgLogo: message.orgLogo || "",
        authorRole: message.authorRole || "",
        attachments: message.attachments || []
    };
}

function getTicketMessages(ticket) {
    if (Array.isArray(ticket.messages) && ticket.messages.length > 0) {
        return ticket.messages.map(normalizeTicketMessage);
    }

    const messages = [];
    if (ticket.message) {
        messages.push({
            author: ticket.submitterName || ticket.submittedBy?.name || "Classgrid User",
            role: "user",
            date: ticket.createdAt || new Date(),
            body: ticket.message,
            footer: ticket.submitterEmail ? `Email: ${ticket.submitterEmail}` : ""
        });
    }

    for (const reply of ticket.replies || []) {
        messages.push(normalizeTicketMessage(reply));
    }

    return messages;
}

function getLastComment(ticket) {
    const messages = getTicketMessages(ticket);
    const lastMessage = messages[messages.length - 1];
    return ticket.lastComment || lastMessage?.date || ticket.updatedAt || ticket.createdAt;
}

function formatTicketDate(value, fallback = "Not provided") {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function serializeTicket(ticket) {
    if (!ticket) return null;
    const messages = getTicketMessages(ticket);
    return {
        ...ticket,
        name: ticket.submitterName || ticket.submittedBy?.name || "",
        email: ticket.submitterEmail || ticket.submittedBy?.email || "",
        submitterRole: ticket.submitterRole || ticket.submittedBy?.role || "",
        messages,
        replies: (ticket.replies || []).map(normalizeTicketMessage),
        events: ticket.events || [],
        lastComment: getLastComment({ ...ticket, messages }),
        requester: {
            name: ticket.submitterName || ticket.submittedBy?.name || "Unknown",
            email: ticket.submitterEmail || ticket.submittedBy?.email || "",
            role: ticket.submitterRole || ticket.submittedBy?.role || "",
            profilePicture: ticket.requesterProfilePicture || ticket.submittedBy?.profilePicture || ""
        },
        assignedTo: ticket.assignedTo ? {
            _id: ticket.assignedTo._id,
            name: ticket.assignedTo.name,
            email: ticket.assignedTo.email,
            profilePicture: ticket.assignedTo.profilePicture || ""
        } : null
    };
}

function ensureInitialMessage(ticket) {
    if (!ticket.messages) ticket.messages = [];
    if (ticket.messages.length === 0 && ticket.message) {
        ticket.messages.push({
            author: ticket.submitterName || "Classgrid User",
            role: "user",
            body: ticket.message,
            date: ticket.createdAt || new Date(),
            footer: ticket.submitterEmail ? `Email: ${ticket.submitterEmail}` : ""
        });
    }
    if (!ticket.lastComment) ticket.lastComment = ticket.createdAt || new Date();
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║  PUBLIC ENDPOINTS — No authentication required               ║
// ║  For marketing site visitors (classgrid.in/support)          ║
// ║  Users identified by email only (like Brevo / Zendesk)       ║
// ╚═══════════════════════════════════════════════════════════════╝

// ──────────────────────────────────────────────────────────────
//  POST /api/support/public/tickets — Create ticket (no login)
// ──────────────────────────────────────────────────────────────
router.post("/public/tickets", enforceStrictSession, multipleUploads("files", 5), async (req, res) => {
    try {
        const { name, email, subject, message, category, priority, institution, role: submitterRoleInput, skipEmail, aiDraft } = req.body;

        if (!email?.trim() || !subject?.trim() || !message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email, subject, and description are required"
            });
        }

        if (subject.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: `Subject is too long (${subject.trim().length} characters). Maximum allowed is 200 characters.`
            });
        }

        // The Inquiry page (Classgrid Talk) sends the "institution" field, 
        // whereas the Technical Ticket page does not.
        const isGeneralInquiry = !!institution;

        // Try to find if this email belongs to a registered user
        const fullUser = await User.findOne({ email: email.trim().toLowerCase() })
            .select("name profilePicture role organization_id")
            .lean();

        let organization_id = null;
        if (!isGeneralInquiry) {
            if (!fullUser) {
                return res.status(403).json({
                    success: false,
                    message: "This email is not registered on Classgrid. Only registered users can raise support tickets."
                });
            }

            // Only users linked to a valid organization can raise tickets.
            if (!fullUser.organization_id) {
                return res.status(403).json({
                    success: false,
                    message: "Support tickets can only be raised by users who belong to a registered institution on Classgrid. Please contact your institution administrator.",
                    code: "NO_ORG"
                });
            }
            organization_id = fullUser.organization_id;
        } else {
            // For general inquiries, we optionally attach the org if they have one
            organization_id = fullUser?.organization_id || null;
        }

        // Fetch user profile picture and org info for display in support messages
        let userAvatar = "";
        let userOrgName = "";
        let userOrgLogo = "";
        let userRole = (submitterRoleInput || "").trim();
        let userName = (name || "").trim();
        
        if (fullUser) {
            userAvatar = fullUser.profilePicture || "";
            userRole = fullUser.role || userRole;
            if (fullUser.name) {
                userName = fullUser.name.trim();
            }
            if (fullUser.organization_id) {
                const { default: Organization } = await import("../models/Organization.js");
                const org = await Organization.findById(fullUser.organization_id)
                    .select("name logo_url")
                    .lean();
                if (org) {
                    userOrgName = org.name || "";
                    userOrgLogo = org.logo_url || "";
                }
            }
        }

        // Handle File Uploads to Supabase
        const uploadedAttachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const folderPath = `support_tickets/public/${email.trim().replace(/[^a-zA-Z0-9]/g, "_")}`;
                const uploadResult = await storageService.uploadDocument(
                    file.buffer,
                    file.originalname,
                    file.mimetype,
                    folderPath,
                    "support-attachments" // explicitly use the support bucket
                );
                uploadedAttachments.push({
                    id: uploadResult.id,
                    name: uploadResult.name,
                    url: uploadResult.storage_path,
                    mimeType: uploadResult.mimeType,
                    size: uploadResult.size,
                    uploadedAt: uploadResult.uploadedAt
                });
            }
        }

        const now = new Date();
        const submitterName = (userName || "Anonymous").replace(/\b\w/g, c => c.toUpperCase());
        const submitterEmail = email.trim().toLowerCase();
        const ticket = await SupportTicket.create({
            subject: subject.trim(),
            message: message.trim(),
            category: category || "general",
            attachments: uploadedAttachments,
            priority: priority || "medium",
            submitterEmail,
            submitterName,
            submitterRole: userRole || (submitterRoleInput || "").trim(),
            institution: institution?.trim() || "",
            organization_id,
            messages: [{
                author: submitterName,
                role: "user",
                body: message.trim(),
                date: now,
                footer: `Email: ${submitterEmail}`,
                avatar: userAvatar,
                orgName: userOrgName,
                orgLogo: userOrgLogo,
                authorRole: userRole,
                attachments: uploadedAttachments
            }],
            lastComment: now,
            events: [{
                type: 'ticketCreated',
                label: 'Ticket submitted',
                actorName: submitterName,
                actorRole: 'user',
                createdAt: now
            }],
            submittedBy: fullUser ? fullUser._id : null
        });

        if (aiDraft && aiDraft.trim()) {
            try {
                const { default: MessageDraft } = await import("../models/MessageDraft.js");
                await MessageDraft.create({
                    ticketId: ticket._id,
                    draftContent: aiDraft.trim(),
                    source: "ai_generated",
                    aiContext: "Email AI auto-generated draft"
                });
            } catch (draftErr) {
                console.error("[Support] Failed to save AI draft:", draftErr.message);
            }
        }

        // ── Send email notification for new ticket ──
        try {
            if (skipEmail !== "true" && skipEmail !== true) {
                if (isGeneralInquiry) {
                    await notifyUserOfTalkRequestCreation({ ticket });
                } else {
                    await notifyUserOfTicketCreation({ ticket });
                }
            }

            // Notify Super Admins
            const superAdmins = await User.find({ role: 'super_admin', status: 'active' }).select('_id').lean();
            if (superAdmins.length > 0) {
                const superAdminIds = superAdmins.map(admin => admin._id.toString());
                const typeLabel = isGeneralInquiry ? "Inquiry" : "Support Ticket";
                await bulkDispatchNotification({
                    recipientIds: superAdminIds,
                    type: 'system',
                    title: `New ${typeLabel}: ${ticket.subject}`,
                    message: `A new ${typeLabel.toLowerCase()} has been submitted by ${submitterName}.`,
                    link: `/superadmin/support/view/${ticket._id}`,
                    relatedId: ticket._id.toString(),
                    sendPush: true
                });
            }
        } catch (emailErr) {
            console.error("[Support] New ticket email notification failed:", emailErr.message);
        }

        try {
            getIO().emit("support_ticket_created");
        } catch (socketErr) {
            console.error("[Support] Socket emit failed:", socketErr.message);
        }

        res.status(201).json({
            success: true,
            message: "Ticket created successfully",
            ticket: {
                _id: ticket._id,
                subject: ticket.subject,
                status: ticket.status,
                createdAt: ticket.createdAt
            }
        });
    } catch (err) {
        console.error("[Support] Public create error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ──────────────────────────────────────────────────────────────
//  GET /api/support/public/tickets?email=xxx — Lookup by email
// ──────────────────────────────────────────────────────────────
router.get("/public/tickets", enforceStrictSession, async (req, res) => {
    try {
        const { email } = req.query;
        if (!email?.trim()) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // Check if they are a registered platform user
        const registeredUser = await verifyRegisteredUser(email);
        
        if (registeredUser && !registeredUser.organization_id) {
            // Block orgless accounts UNLESS they have public inquiries
            const hasTickets = await SupportTicket.exists({
                submitterEmail: email.trim().toLowerCase()
            });
            if (!hasTickets) {
                return res.status(403).json({
                    success: false,
                    message: "Only users belonging to a registered institution can access support tickets.",
                    code: "NO_ORG"
                });
            }
        }

        const tickets = await SupportTicket.find({
            submitterEmail: email.trim().toLowerCase()
        })
            .sort({ createdAt: -1 })
            .select("subject status priority category createdAt updatedAt replies messages lastComment")
            .lean();

        // Add reply count and last reply date for the table view
        const enriched = tickets.map(t => ({
            ...t,
            messages: getTicketMessages(t),
            replyCount: Math.max(getTicketMessages(t).length - 1, 0),
            lastComment: getLastComment(t)
        }));

        res.json({ 
            success: true, 
            tickets: enriched,
            isPlatformUser: !!registeredUser,
            hasOrganization: !!(registeredUser && registeredUser.organization_id)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ──────────────────────────────────────────────────────────────
//  GET /api/support/public/tickets/:id?email=xxx — View ticket
// ──────────────────────────────────────────────────────────────
router.get("/public/tickets/:id", enforceStrictSession, async (req, res) => {
    try {
        const { email } = req.query;
        if (!email?.trim()) {
            return res.status(400).json({ success: false, message: "Email is required for verification" });
        }

        const ticket = await SupportTicket.findById(req.params.id)
            .populate("assignedTo", "name email profilePicture")
            .lean();

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        if (ticket.submitterEmail?.toLowerCase() !== email.trim().toLowerCase()) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        res.json({ success: true, ticket: serializeTicket(ticket) });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ──────────────────────────────────────────────────────────────
//  POST /api/support/public/tickets/:id/reply — Reply (email verified)
// ──────────────────────────────────────────────────────────────
router.post("/public/tickets/:id/reply", enforceStrictSession, multipleUploads("files", 5), async (req, res) => {
    try {
        const { email, message, name } = req.body;
        if (!email?.trim() || !message?.trim()) {
            return res.status(400).json({ success: false, message: "Email and message are required" });
        }

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        if (ticket.status === "closed") {
            return res.status(400).json({ success: false, message: "This ticket is closed and cannot receive new replies." });
        }

        // Verify ownership via email
        if (ticket.submitterEmail?.toLowerCase() !== email.trim().toLowerCase()) {
            return res.status(403).json({ success: false, message: "Email does not match ticket owner" });
        }

        // Handle File Uploads
        const uploadedAttachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const folderPath = `support_tickets/public/${email.trim().replace(/[^a-zA-Z0-9]/g, "_")}`;
                const uploadResult = await storageService.uploadDocument(
                    file.buffer,
                    file.originalname,
                    file.mimetype,
                    folderPath,
                    "support-attachments" // explicitly use the support bucket
                );
                uploadedAttachments.push({
                    id: uploadResult.id,
                    name: uploadResult.name,
                    url: uploadResult.storage_path,
                    mimeType: uploadResult.mimeType,
                    size: uploadResult.size,
                    uploadedAt: uploadResult.uploadedAt
                });
            }
        }

        ensureInitialMessage(ticket);
        const now = new Date();

        // Dynamically fetch user role, profile picture, name, and org info
        const submitterUser = await User.findOne({ email: email.trim().toLowerCase() })
            .select("name role profilePicture organization_id")
            .lean();
            
        const authorName = (submitterUser?.name || name || ticket.submitterName || "Classgrid User").trim();
        const roleRaw = submitterUser ? submitterUser.role : "user";
        const formattedRole = roleRaw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // Fetch org info for display
        let replyOrgName = "";
        let replyOrgLogo = "";
        if (submitterUser?.organization_id) {
            const { default: Organization } = await import("../models/Organization.js");
            const org = await Organization.findById(submitterUser.organization_id)
                .select("name logo_url")
                .lean();
            if (org) {
                replyOrgName = org.name || "";
                replyOrgLogo = org.logo_url || "";
            }
        }

        ticket.replies.push({
            authorName,
            authorRole: roleRaw,
            message: message.trim(),
            attachments: uploadedAttachments,
            createdAt: now
        });

        ticket.messages.push({
            author: authorName,
            role: normalizeMessageRole(roleRaw),
            body: message.trim(),
            date: now,
            footer: `Email: ${email.trim().toLowerCase()}`,
            avatar: submitterUser?.profilePicture || "",
            orgName: replyOrgName,
            orgLogo: replyOrgLogo,
            authorRole: roleRaw,
            attachments: uploadedAttachments
        });

        ticket.events.push({
            type: 'userReply',
            label: `${formattedRole} replied`,
            actorName: authorName,
            actorRole: roleRaw,
            createdAt: now
        });

        ticket.lastComment = now;
        ticket.lastUserReplyAt = now;
        if (ticket.status === "resolved") {
            ticket.status = "reopened";
        }

        await ticket.save();

        try {
            // Notify Super Admins of public reply
            const superAdmins = await User.find({ role: 'super_admin', status: 'active' }).select('_id').lean();
            if (superAdmins.length > 0) {
                const superAdminIds = superAdmins.map(admin => admin._id.toString());
                await bulkDispatchNotification({
                    recipientIds: superAdminIds,
                    type: 'system',
                    title: `New Reply (Public): ${ticket.subject}`,
                    message: `${authorName} added a reply.`,
                    link: `/superadmin/support/view/${ticket._id}`,
                    relatedId: ticket._id.toString(),
                    sendPush: true
                });
            }
        } catch (notifErr) {
            console.error("[Support] Public reply admin notification failed:", notifErr.message);
        }

        const populatedTicket = await SupportTicket.findById(ticket._id)
            .populate("submittedBy", "name email role")
            .populate("assignedTo", "name email profilePicture")
            .lean();

        try {
            getIO().emit("support_ticket_updated", { ticketId: ticket._id });
        } catch (socketErr) {
            console.error("[Support] Socket emit failed:", socketErr.message);
        }

        res.json({ success: true, message: "Reply added", ticket: serializeTicket(populatedTicket) });
    } catch (err) {
        console.error("[Support] Public reply error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ──────────────────────────────────────────────────────────────
//  POST /api/support/public/tickets/:id/close — Close ticket (email verified)
// ──────────────────────────────────────────────────────────────
router.post("/public/tickets/:id/close", enforceStrictSession, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email?.trim()) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        if (ticket.status === "closed") {
            return res.status(400).json({ success: false, message: "This ticket is already closed." });
        }

        // Verify ownership via email
        if (ticket.submitterEmail?.toLowerCase() !== email.trim().toLowerCase()) {
            return res.status(403).json({ success: false, message: "Email does not match ticket owner" });
        }

        ticket.status = "closed";
        ticket.updatedAt = new Date();
        
        ticket.events.push({
            type: 'statusChanged',
            label: 'User closed ticket',
            actorName: ticket.submitterName || 'User',
            actorRole: 'user',
            createdAt: new Date()
        });

        await ticket.save();

        res.json({ success: true, message: "Ticket closed", ticket: serializeTicket(ticket.toObject()) });
    } catch (err) {
        console.error("[Support] Public close error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ╔═══════════════════════════════════════════════════════════════╗
// ║  AUTHENTICATED ENDPOINTS — Logged-in platform users          ║
// ╚═══════════════════════════════════════════════════════════════╝

// ══════════════════════════════════════════════════════════════
//  POST /api/support/tickets — Create a new support ticket
// ══════════════════════════════════════════════════════════════
router.post("/tickets", isAuthenticated, multipleUploads("files", 5), async (req, res) => {
    try {
        const { subject, message, category, priority } = req.body;
        if (!subject?.trim() || !message?.trim()) {
            return res.status(400).json({ success: false, message: "Subject and message are required" });
        }

        // Only users who belong to a valid organization may raise tickets.
        // Accounts without an org (e.g. ClassGrid Talk-only users) are blocked.
        const orgId = req.effectiveOrganizationId || req.user.organization_id;
        if (!orgId) {
            return res.status(403).json({
                success: false,
                message: "Support tickets can only be raised by users who belong to a registered institution on Classgrid. Please contact your institution administrator.",
                code: "NO_ORG"
            });
        }

        // Handle File Uploads to Supabase
        const uploadedAttachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const folderPath = `support_tickets/${req.user._id}`;
                const uploadResult = await storageService.uploadDocument(
                    file.buffer, 
                    file.originalname, 
                    file.mimetype, 
                    folderPath,
                    "support-attachments" // explicitly use the support bucket
                );
                uploadedAttachments.push({
                    id: uploadResult.id,
                    name: uploadResult.name,
                    url: uploadResult.storage_path,
                    mimeType: uploadResult.mimeType,
                    size: uploadResult.size,
                    uploadedAt: uploadResult.uploadedAt
                });
            }
        }

        const now = new Date();

        // Fetch org info for display in support messages
        let authOrgName = "";
        let authOrgLogo = "";
        if (req.user.role === "super_admin") {
            authOrgName = "Classgrid";
            authOrgLogo = req.user.platformLogo || "";
        } else if (orgId) {
            const { default: Organization } = await import("../models/Organization.js");
            const org = await Organization.findById(orgId).select("name logo_url").lean();
            if (org) {
                authOrgName = org.name || "";
                authOrgLogo = org.logo_url || "";
            }
        }

        const ticket = await SupportTicket.create({
            subject: subject.trim(),
            message: message.trim(),
            category: category || "general",
            attachments: uploadedAttachments,
            priority: priority || "medium",
            submittedBy: req.user._id,
            submitterEmail: req.user.email,
            submitterName: req.user.name,
            organization_id: orgId,
            messages: [{
                author: req.user.name || req.user.email || "Classgrid User",
                role: "user",
                body: message.trim(),
                date: now,
                footer: req.user.email ? `Email: ${req.user.email}` : "",
                avatar: req.user.profilePicture || "",
                orgName: authOrgName,
                orgLogo: authOrgLogo,
                authorRole: req.user.role || "",
                attachments: uploadedAttachments
            }],
            lastComment: now,
            events: [{
                type: 'ticketCreated',
                label: 'Ticket created',
                actorName: req.user.name || req.user.email,
                actorRole: req.user.role,
                createdAt: now
            }]
        });

        try {
            // Notify Super Admins
            const superAdmins = await User.find({ role: 'super_admin', status: 'active' }).select('_id').lean();
            if (superAdmins.length > 0) {
                const superAdminIds = superAdmins.map(admin => admin._id.toString());
                await bulkDispatchNotification({
                    recipientIds: superAdminIds,
                    type: 'system',
                    title: `New Support Ticket: ${ticket.subject}`,
                    message: `A new support ticket has been created by ${req.user.name}.`,
                    link: `/superadmin/support/view/${ticket._id}`,
                    relatedId: ticket._id.toString(),
                    sendPush: true
                });
            }
        } catch (notifErr) {
            console.error("[Support] Admin notification failed:", notifErr.message);
        }

        try {
            getIO().emit("support_ticket_created");
        } catch (socketErr) {
            console.error("[Support] Socket emit failed:", socketErr.message);
        }

        res.status(201).json({ success: true, message: "Ticket created", ticket: serializeTicket(ticket.toObject()) });
    } catch (err) {
        console.error("[Support] Create error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  GET /api/support/tickets — User's own tickets
// ══════════════════════════════════════════════════════════════
router.get("/tickets", isAuthenticated, async (req, res) => {
    try {
        const tickets = await SupportTicket.find({ submittedBy: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        const serializedTickets = tickets.map(serializeTicket);
        res.json({
            success: true,
            tickets: serializedTickets,
            total: serializedTickets.length,
            stats: {
                open: serializedTickets.filter((ticket) => ticket.status === "open").length,
                inProgress: serializedTickets.filter((ticket) => ticket.status === "in_progress").length,
                resolved: serializedTickets.filter((ticket) => ticket.status === "resolved").length
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  GET /api/support/tickets/:id — Get ticket detail with replies
// ══════════════════════════════════════════════════════════════
router.get("/tickets/:id", isAuthenticated, async (req, res) => {
    try {
        let ticket = await SupportTicket.findById(req.params.id)
            .populate("submittedBy", "name email role profilePicture")
            .populate("assignedTo", "name email profilePicture")
            .lean();

        // Fallback for public tickets where submittedBy is missing
        if (ticket && !ticket.submittedBy && ticket.submitterEmail) {
            const user = await User.findOne(
                { email: ticket.submitterEmail.toLowerCase() },
                "name email role organization_id"
            ).populate("organization_id", "name").lean();
            if (user) {
                ticket.submitterRole = user.role;
                ticket.requesterProfilePicture = user.profilePicture;
                if (!ticket.organization_id && user.organization_id) {
                    ticket.organization_id = user.organization_id;
                }
            }
        }

        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        // Only the submitter or super_admin can view
        const isSuper = req.user.role === "super_admin";
        const isOwner =
            ticket.submittedBy?._id?.toString() === req.user._id.toString() ||
            ticket.submitterEmail?.toLowerCase() === req.user.email?.toLowerCase();
        if (!isOwner && !isSuper) return res.status(403).json({ success: false, message: "Not authorized" });

        res.json({ success: true, ticket: serializeTicket(ticket) });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/support/tickets/:id/reply — Add a reply (user or admin)
// ══════════════════════════════════════════════════════════════
router.post("/tickets/:id/reply", isAuthenticated, multipleUploads("files", 5), async (req, res) => {
    try {
        const { message, adminName, sendEmail = true } = req.body;
        const shouldSendEmail = String(sendEmail) !== "false";
        if (!message?.trim()) return res.status(400).json({ success: false, message: "Message is required" });

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        if (ticket.status === "closed") {
            return res.status(400).json({ success: false, message: "This ticket is closed and cannot receive new replies." });
        }

        const isSuperAdmin = req.user.role === "super_admin";
        const isOwner =
            ticket.submittedBy?.toString() === req.user._id.toString() ||
            ticket.submitterEmail?.toLowerCase() === req.user.email?.toLowerCase();
        if (!isSuperAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // --- Ticket Lock: Prevent other admins from replying if assigned to someone else ---
        if (isSuperAdmin && !isOwner) {
            if (ticket.assignedTo && ticket.assignedTo.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: "This ticket is locked to another assigned admin." });
            }
        }

        // Handle File Uploads to Supabase
        const uploadedAttachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const folderPath = `support_tickets/${req.user._id}`;
                const uploadResult = await storageService.uploadDocument(
                    file.buffer, 
                    file.originalname, 
                    file.mimetype, 
                    folderPath,
                    "support-attachments" // explicitly use the support bucket
                );
                uploadedAttachments.push({
                    id: uploadResult.id,
                    name: uploadResult.name,
                    url: uploadResult.storage_path,
                    mimeType: uploadResult.mimeType,
                    size: uploadResult.size,
                    uploadedAt: uploadResult.uploadedAt
                });
            }
        }

        ensureInitialMessage(ticket);
        const now = new Date();
        const authorName = (isSuperAdmin ? (adminName || req.user.name) : req.user.name) || req.user.email || "Classgrid Support";
        const messageRole = isSuperAdmin ? "admin" : "user";

        ticket.replies.push({
            author: req.user._id,
            authorName,
            authorRole: req.user.role,
            message: message.trim(),
            attachments: uploadedAttachments,
            createdAt: now
        });

        // Fetch org info for admin/user reply display
        let replyerOrgName = "";
        let replyerOrgLogo = "";
        if (req.user.role === "super_admin") {
            replyerOrgName = "Classgrid";
            replyerOrgLogo = req.user.platformLogo || "";
        } else {
            const replyerOrgId = req.effectiveOrganizationId || req.user.organization_id || null;
            if (replyerOrgId) {
                const { default: Organization } = await import("../models/Organization.js");
                const org = await Organization.findById(replyerOrgId).select("name logo_url").lean();
                if (org) {
                    replyerOrgName = org.name || "";
                    replyerOrgLogo = org.logo_url || "";
                }
            }
        }

        ticket.messages.push({
            author: authorName,
            role: messageRole,
            body: message.trim(),
            date: now,
            avatar: req.user.profilePicture || req.user.profilePic || req.user.image || "",
            orgName: replyerOrgName,
            orgLogo: replyerOrgLogo,
            authorRole: req.user.role || "",
            attachments: uploadedAttachments
        });

        const formattedRole = (req.user.role || 'user').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        ticket.events.push({
            type: isSuperAdmin ? 'adminReply' : 'userReply',
            label: isSuperAdmin ? 'Admin replied' : `${formattedRole} replied`,
            actorName: authorName,
            actorRole: req.user.role,
            createdAt: now
        });

        ticket.lastComment = now;
        if (isSuperAdmin) {
            ticket.lastAdminReplyAt = now;
            // If admin sends resolve: true, mark as resolved; otherwise in_progress
            if (req.body.resolve === true || req.body.resolve === "true") {
                ticket.status = "resolved";
                ticket.resolvedAt = now;
                ticket.resolvedBy = req.user._id;
                ticket.events.push({
                    type: 'resolved',
                    label: 'Ticket resolved',
                    actorName: authorName,
                    actorRole: req.user.role,
                    createdAt: now
                });
            } else {
                // Only auto-upgrade to in_progress if it's currently open. 
                // Do not overwrite if admin hand-picked "waiting_on_user" or left it in progress.
                if (ticket.status === "open" || ticket.status === "reopened") {
                    ticket.status = "in_progress";
                }
            }
            if (!ticket.assignedTo) {
                ticket.assignedTo = req.user._id;
                ticket.events.push({
                    type: 'assigned',
                    label: 'Ticket auto-assigned to respondent',
                    to: req.user._id,
                    actorName: authorName,
                    actorRole: req.user.role,
                    createdAt: now
                });
            }
        } else {
            ticket.lastUserReplyAt = now;
            if (ticket.status === "resolved") {
                ticket.status = "reopened";
            }
        }

        await ticket.save();

        let emailNotification = { queued: false };
        if (isSuperAdmin && shouldSendEmail) {
            try {
                const adminAvatar = req.user.profilePicture || req.user.profilePic || req.user.image || "";
                const adminEmail = req.user.email?.trim() || "";
                if (ticket.institution) {
                    emailNotification = await notifyTalkCreatorOfAdminReply({
                        ticket,
                        replyMessage: message.trim(),
                        adminName: authorName,
                        adminAvatar,
                        adminEmail
                    });
                } else {
                    emailNotification = await notifyTicketCreatorOfAdminReply({
                        ticket,
                        replyMessage: message.trim(),
                        adminName: authorName,
                        adminAvatar,
                        adminEmail
                    });
                }
            } catch (emailErr) {
                console.error("[Support] Reply email notification failed:", emailErr.message);
            }

            try {
                if (ticket.submittedBy) {
                    await dispatchNotification({
                        recipientId: ticket.submittedBy.toString(),
                        type: 'system',
                        title: `Support Update: ${ticket.subject}`,
                        message: `An admin has replied to your ticket.`,
                        link: `/support/${ticket._id}`, // Adjust based on user's frontend view path
                        relatedId: ticket._id.toString(),
                        sendPush: true
                    });
                }
            } catch (userNotifErr) {
                console.error("[Support] Reply user notification failed:", userNotifErr.message);
            }
        } else {
            // User replied -> Notify super admins
            try {
                const superAdmins = await User.find({ role: 'super_admin', status: 'active' }).select('_id').lean();
                if (superAdmins.length > 0) {
                    const superAdminIds = superAdmins.map(admin => admin._id.toString());
                    await bulkDispatchNotification({
                        recipientIds: superAdminIds,
                        type: 'system',
                        title: `New Reply: ${ticket.subject}`,
                        message: `${req.user.name} added a reply.`,
                        link: `/superadmin/support/view/${ticket._id}`,
                        relatedId: ticket._id.toString(),
                        sendPush: true
                    });
                }
            } catch (notifErr) {
                console.error("[Support] Reply admin notification failed:", notifErr.message);
            }
        }

        const populatedTicket = await SupportTicket.findById(ticket._id)
            .populate("submittedBy", "name email role profilePicture")
            .populate("assignedTo", "name email profilePicture")
            .lean();
            
        try {
            getIO().emit("support_ticket_updated", { ticketId: ticket._id });
        } catch (socketErr) {
            console.error("[Support] Socket emit failed:", socketErr.message);
        }

        res.json({
            success: true,
            message: "Reply added",
            ticket: serializeTicket(populatedTicket),
            emailNotification
        });
    } catch (err) {
        console.error("[Support] Reply error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: GET /api/support/admin/tickets — All tickets
// ══════════════════════════════════════════════════════════════
router.get("/admin/tickets", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { status, priority, page = 1, limit = 30, type } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        // Apply type filtering for Classgrid Talk (inquiry) vs Support Tickets (support)
        if (type === 'inquiry') {
            filter.organization_id = null; // Inquiries don't have an associated organization
        } else if (type === 'support') {
            filter.organization_id = { $ne: null }; // Support tickets require an organization
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [tickets, total] = await Promise.all([
            SupportTicket.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("submittedBy", "name email role profilePicture")
                .populate("organization_id", "name slug org_type logo_url")
                .populate("assignedTo", "name email profilePicture")
                .lean(),
            SupportTicket.countDocuments(filter)
        ]);

        // Fallback for public tickets where submittedBy is missing
        for (let ticket of tickets) {
            if (!ticket.submittedBy && ticket.submitterEmail) {
                const user = await User.findOne(
                    { email: ticket.submitterEmail.toLowerCase() },
                    "name email role profilePicture organization_id"
                ).populate("organization_id", "name org_type").lean();
                
                if (user) {
                    ticket.submitterRole = user.role;
                    ticket.requesterProfilePicture = user.profilePicture;
                    if (!ticket.organization_id && user.organization_id) {
                        ticket.organization_id = user.organization_id;
                    }
                }
            }
        }

        // Stats with base filter
        const baseFilter = {};
        if (type === 'inquiry') baseFilter.organization_id = null;
        else if (type === 'support') baseFilter.organization_id = { $ne: null };

        const [openCount, inProgressCount, resolvedCount] = await Promise.all([
            SupportTicket.countDocuments({ ...baseFilter, status: "open" }),
            SupportTicket.countDocuments({ ...baseFilter, status: "in_progress" }),
            SupportTicket.countDocuments({ ...baseFilter, status: "resolved" })
        ]);

        res.json({
            success: true,
            tickets: tickets.map(serializeTicket),
            total,
            stats: { open: openCount, inProgress: inProgressCount, resolved: resolvedCount }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: PATCH /api/support/admin/tickets/:id — Update ticket fields
// ══════════════════════════════════════════════════════════════
router.patch("/admin/tickets/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { status, priority, category, assignedTo } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        if (ticket.status === "closed") {
            return res.status(400).json({ success: false, message: "Cannot modify a closed ticket. Please open a new ticket." });
        }

        const now = new Date();
        const actorName = req.user.name || req.user.email;

        if (status && status !== ticket.status) {
            ticket.events.push({
                type: status === 'resolved' ? 'resolved' : status === 'open' ? 'reopened' : 'statusChanged',
                label: `Status changed to ${status}`,
                from: ticket.status,
                to: status,
                actorName,
                actorRole: req.user.role,
                createdAt: now
            });
            ticket.status = status;
            if (status === "resolved") {
                ticket.resolvedAt = now;
                ticket.resolvedBy = req.user._id;
            }
        }

        if (priority && priority !== ticket.priority) {
            ticket.events.push({
                type: 'priorityChanged',
                label: `Priority changed to ${priority}`,
                from: ticket.priority,
                to: priority,
                actorName,
                actorRole: req.user.role,
                createdAt: now
            });
            ticket.priority = priority;
        }

        if (category && category !== ticket.category) {
            ticket.events.push({
                type: 'categoryChanged',
                label: `Category changed to ${category}`,
                from: ticket.category,
                to: category,
                actorName,
                actorRole: req.user.role,
                createdAt: now
            });
            ticket.category = category;
        }

        if (assignedTo && assignedTo !== ticket.assignedTo?.toString()) {
            const assignee = await User.findById(assignedTo, "name email").lean();
            ticket.events.push({
                type: 'assigned',
                label: `Assigned to ${assignee?.name || 'agent'}`,
                from: ticket.assignedTo,
                to: assignedTo,
                actorName,
                actorRole: req.user.role,
                createdAt: now
            });
            ticket.assignedTo = assignedTo;
        }

        await ticket.save();
        const updated = await SupportTicket.findById(ticket._id)
            .populate("submittedBy", "name email role")
            .populate("assignedTo", "name email profilePicture")
            .lean();

        try {
            getIO().emit("support_ticket_updated", { ticketId: ticket._id });
        } catch (socketErr) {
            console.error("[Support] Socket emit failed:", socketErr.message);
        }

        res.json({ success: true, message: "Ticket updated", ticket: serializeTicket(updated) });
    } catch (err) {
        console.error("[Support] Admin update error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: PATCH /api/support/admin/tickets/:id/reply/:replyId — Edit a reply
// ══════════════════════════════════════════════════════════════
router.patch("/admin/tickets/:id/reply/:replyId", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ success: false, message: "Message is required" });

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        // Find the reply in `messages` array
        const msg = ticket.messages.id(req.params.replyId);
        if (!msg) return res.status(404).json({ success: false, message: "Reply not found" });

        // Update the message body
        msg.body = message.trim();
        
        await ticket.save();

        const updated = await SupportTicket.findById(ticket._id)
            .populate("submittedBy", "name email role")
            .populate("assignedTo", "name email profilePicture")
            .lean();

        try {
            getIO().emit("support_ticket_updated", { ticketId: ticket._id });
        } catch (socketErr) {
            console.error("[Support] Socket emit failed:", socketErr.message);
        }

        res.json({ success: true, message: "Reply updated", ticket: serializeTicket(updated) });
    } catch (err) {
        console.error("[Support] Admin edit reply error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: POST /api/support/admin/tickets/:id/note — Internal note
// ══════════════════════════════════════════════════════════════
router.post("/admin/tickets/:id/note", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ success: false, message: "Note content is required" });

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        const now = new Date();
        const authorName = req.user.name || req.user.email;

        ticket.messages.push({
            author: authorName,
            role: "admin",
            body: message.trim(),
            date: now,
            footer: "internal_note",
            avatar: req.user.profilePicture || "",
            attachments: []
        });

        ticket.events.push({
            type: 'internalNote',
            label: 'Internal note added',
            actorName: authorName,
            actorRole: req.user.role,
            createdAt: now
        });

        await ticket.save();
        
        try {
            getIO().emit("support_ticket_updated", { ticketId: ticket._id });
        } catch (socketErr) {
            console.error("[Support] Socket emit failed:", socketErr.message);
        }
        
        res.json({ success: true, message: "Internal note added", ticket: serializeTicket(ticket.toObject()) });
    } catch (err) {
        console.error("[Support] Internal note error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  PUBLIC: POST /api/support/public/tickets/:id/reopen — Reopen ticket
// ══════════════════════════════════════════════════════════════
router.post("/public/tickets/:id/reopen", enforceStrictSession, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email?.trim()) return res.status(400).json({ success: false, message: "Email is required" });

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        if (ticket.submitterEmail?.toLowerCase() !== email.trim().toLowerCase()) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        if (ticket.status !== "resolved" && ticket.status !== "closed") {
            return res.status(400).json({ success: false, message: "Ticket is not resolved or closed" });
        }

        const now = new Date();
        ticket.events.push({
            type: 'reopened',
            label: 'Ticket reopened by user',
            from: ticket.status,
            to: 'open',
            actorName: ticket.submitterName || email,
            actorRole: 'user',
            createdAt: now
        });

        ticket.status = "open";
        ticket.resolvedAt = null;
        ticket.resolvedBy = null;
        await ticket.save();

        try {
            getIO().emit("support_ticket_updated", { ticketId: ticket._id });
        } catch (socketErr) {
            console.error("[Support] Socket emit failed:", socketErr.message);
        }

        res.json({ success: true, message: "Ticket reopened", ticket: serializeTicket(ticket.toObject()) });
    } catch (err) {
        console.error("[Support] Reopen error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  PUBLIC: POST /api/support/public/tickets/:id/rate — Satisfaction rating
// ══════════════════════════════════════════════════════════════
router.post("/public/tickets/:id/rate", enforceStrictSession, async (req, res) => {
    try {
        const { email, rating, comment } = req.body;
        if (!email?.trim()) return res.status(400).json({ success: false, message: "Email is required" });
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        if (ticket.submitterEmail?.toLowerCase() !== email.trim().toLowerCase()) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        ticket.satisfaction = {
            rating: Number(rating),
            comment: (comment || "").trim(),
            createdAt: new Date()
        };

        await ticket.save();
        
        try {
            getIO().emit("support_ticket_updated", { ticketId: ticket._id });
        } catch (socketErr) {
            console.error("[Support] Socket emit failed:", socketErr.message);
        }
        
        res.json({ success: true, message: "Thank you for your feedback", ticket: serializeTicket(ticket.toObject()) });
    } catch (err) {
        console.error("[Support] Rating error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  PUBLIC: GET /api/support/public/tickets/:id/related — Related tickets
// ══════════════════════════════════════════════════════════════
router.get("/public/tickets/:id/related", enforceStrictSession, async (req, res) => {
    try {
        const { email } = req.query;
        if (!email?.trim()) return res.status(400).json({ success: false, message: "Email is required" });

        const ticket = await SupportTicket.findById(req.params.id).lean();
        if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

        if (ticket.submitterEmail?.toLowerCase() !== email.trim().toLowerCase()) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const related = await SupportTicket.find({
            submitterEmail: ticket.submitterEmail,
            _id: { $ne: ticket._id }
        })
        .select("subject status createdAt lastComment")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

        res.json({ success: true, tickets: related });
    } catch (err) {
        console.error("[Support] Related tickets error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  PATCH /api/support/admin/tickets/:id/reply/:replyId — Edit a reply (admin only)
// ══════════════════════════════════════════════════════════════
router.patch("/admin/tickets/:id/reply/:replyId", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        // Find the reply in replies array
        const replyIndex = ticket.replies.findIndex(r => r._id.toString() === req.params.replyId);
        // Find the corresponding message in messages array
        const messageIndex = ticket.messages.findIndex(m => m._id.toString() === req.params.replyId);

        if (replyIndex !== -1) {
            ticket.replies[replyIndex].message = message.trim();
        }
        if (messageIndex !== -1) {
            ticket.messages[messageIndex].body = message.trim();
        }

        if (replyIndex === -1 && messageIndex === -1) {
            return res.status(404).json({ success: false, message: "Reply not found" });
        }

        // Add event
        ticket.events.push({
            type: 'adminEdit',
            label: 'Admin edited a reply',
            actorName: req.user.name || req.user.email,
            actorRole: 'super_admin',
            createdAt: new Date()
        });

        await ticket.save();

        res.json({ success: true, message: "Reply updated successfully", ticket: serializeTicket(ticket.toObject()) });
    } catch (err) {
        console.error("[Support] Edit reply error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: GET /api/support/admin/tickets/:id/draft — Get draft
// ══════════════════════════════════════════════════════════════
router.get("/admin/tickets/:id/draft", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { default: MessageDraft } = await import("../models/MessageDraft.js");
        const draft = await MessageDraft.findOne({
            ticketId: req.params.id
        }).lean();

        res.json({ success: true, draft });
    } catch (err) {
        console.error("[Support] Get draft error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: PUT /api/support/admin/tickets/:id/draft — Save draft
// ══════════════════════════════════════════════════════════════
router.put("/admin/tickets/:id/draft", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { draftContent, source, aiContext } = req.body;
        const { default: MessageDraft } = await import("../models/MessageDraft.js");
        
        if (!draftContent) {
            await MessageDraft.findOneAndDelete({
                ticketId: req.params.id
            });
            return res.json({ success: true, message: "Draft deleted" });
        }

        const draft = await MessageDraft.findOneAndUpdate(
            { ticketId: req.params.id },
            { 
                draftContent, 
                source: source || "manual", 
                aiContext: aiContext || "",
                adminId: req.user._id
            },
            { returnDocument: 'after', upsert: true }
        );

        res.json({ success: true, draft });
    } catch (err) {
        console.error("[Support] Save draft error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN: DELETE /api/support/admin/tickets/:id/draft — Delete draft
// ══════════════════════════════════════════════════════════════
router.delete("/admin/tickets/:id/draft", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { default: MessageDraft } = await import("../models/MessageDraft.js");
        await MessageDraft.findOneAndDelete({
            ticketId: req.params.id
        });
        res.json({ success: true, message: "Draft deleted" });
    } catch (err) {
        console.error("[Support] Delete draft error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

export default router;
