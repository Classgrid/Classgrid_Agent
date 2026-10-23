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

/**
 * CRITICAL RULE: DO NOT ADD <h1> OR ANY LARGE HEADINGS TO EMAIL TEMPLATES.
 * The Classgrid design system requires all emails to rely solely on the Classgrid Logo at the top.
 * Adding huge static or dynamic headings (e.g. <h1>Re: Subject</h1> or <h1>Welcome</h1>) is COMPLETELY BANNED.
 * This applies to all human developers and AI agents.
 */
import { enqueueEmail } from "./email-queue.service.js";

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getMarketingSiteUrl() {
    return (
        process.env.MARKETING_SITE_URL?.trim() ||
        (process.env.NODE_ENV === "production"
            ? "https://classgrid.in"
            : "https://classgrid.in")
    ).replace(/\/$/, "");
}

function formatReplyBody(message) {
    return escapeHtml(message).replace(/\r?\n/g, "<br>");
}

function stripHtml(html = "") {
    return String(html).replace(/<[^>]*>?/gm, '').trim();
}

function formatTicketLabel(value = "", fallback = "Not provided") {
    const normalized = String(value || "").trim();
    if (!normalized) return fallback;
    return normalized
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, char => char.toUpperCase());
}

function formatTicketDate(value, fallback = "Not provided") {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function getTicketAssigneeName(ticket = {}, fallback = "Unassigned") {
    const assigned = ticket.assignedTo;
    if (ticket.assignedToName) return ticket.assignedToName;
    if (ticket.assigneeName) return ticket.assigneeName;
    if (assigned && typeof assigned === "object") {
        return assigned.name || assigned.email || assigned._id || assigned.id || fallback;
    }
    return assigned ? String(assigned) : fallback;
}

function buildTicketReplyEmailHtml({ ticket, replyMessage, conversationUrl, adminName, adminAvatar, adminEmail }) {
    const currentYear = new Date().getFullYear();
    const subject = ticket.subject || "Support ticket";
    const ticketIdShort = String(ticket._id).slice(0, 8);
    const specialistName = adminName || "The Classgrid Support Team";
    const specialistEmail = adminEmail?.trim() || "";
    const categoryLabel = formatTicketLabel(ticket.category || "general");
    const priorityLabel = formatTicketLabel(ticket.priority || "medium");
    const statusLabel = formatTicketLabel(ticket.status || "open");
    const assignedToLabel = adminName || getTicketAssigneeName(ticket);
    const userName = ticket.submitterName || "User";
    const openedDate = formatTicketDate(ticket.createdAt || Date.now());
    const repliedDate = formatTicketDate(new Date());

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Reply on Your Support Ticket – #${escapeHtml(ticketIdShort)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body, html {
      margin: 0; padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f5f5;width:100%;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;margin:0 auto;max-width:600px;width:100%;">
<tr>
<td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;">
<img src="https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
<p style="color:#6b7280;margin-top:8px;font-size:13px;">Ticket #${escapeHtml(ticketIdShort)}</p>
</td>
</tr>
<tr>
<td style="padding:30px;color:#374151;font-size:14px;line-height:1.7;">
<p style="color:#374151;font-size:15px;margin:0 0 15px;">Dear ${escapeHtml(userName)},</p>
<p style="color:#374151;margin:0 0 30px;">You have received a new reply from the Classgrid Support Team regarding your open ticket. Please review the message below and let us know if you need further assistance.</p>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Ticket Summary</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:10px;border:1px solid #eaeaea;margin:0 0 25px;">
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;width:30%;color:#6b7280;font-size:13px;font-weight:500;">Ticket ID</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;font-weight:600;">#${escapeHtml(ticketIdShort)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Subject</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(subject)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Status</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#34d399;font-size:14px;font-weight:600;">${escapeHtml(statusLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Assigned to</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(assignedToLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Priority</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(priorityLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Category</td>
<td style="padding:14px 18px;color:#111111;font-size:14px;">${escapeHtml(categoryLabel)}</td>
</tr>
</table>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Support Team Reply</h3>
<div style="padding:20px;background:#ffffff;border-radius:10px;border:1px solid #eaeaea;margin:0 0 30px;text-align:left;">
  <div style="color:#374151;font-size:15px;line-height:1.6;margin:0;">${replyMessage}</div>
</div>



<h3 style="color:#111111;font-size:16px;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">View & Reply to Your Ticket</h3>

<div style="text-align:center;margin:0 0 30px;">
<a href="${escapeHtml(conversationUrl)}" style="background:#34d399;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;">👉 Reply to Conversation</a>
</div>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Quick Tips for a Faster Resolution</h3>
<ul style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 30px;list-style-type:none;padding:0;">
<li style="margin-bottom:10px;">✅ <strong>Be specific</strong> – include error messages, steps to reproduce, and your device/browser info.</li>
<li style="margin-bottom:10px;">✅ <strong>Attach screenshots</strong> – they help us visualize the issue clearly.</li>
</ul>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Ticket Activity History</h3>
${(ticket.events || []).map(ev => {
    const evDate = formatTicketDate(ev.createdAt);
    const evLabel = ev.label || ev.type || "Activity";
      let evActor = "";
      if (ev.actorName && !evLabel.includes(ev.actorName)) {
          evActor = " by " + escapeHtml(ev.actorName);
      }
      return '<p style="color:#6b7280;font-size:13px;line-height:1.7;margin:0 0 5px;"><strong>' + escapeHtml(evDate) + '</strong> – ' + escapeHtml(evLabel) + evActor + '</p>';
}).join("\n")}
<p style="color:#6b7280;font-size:13px;line-height:1.7;margin:0 0 30px;"><strong>Current Status:</strong> ${escapeHtml(statusLabel)}</p>

<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">We value your feedback! If you're satisfied with our response so far, please consider rating your support experience once the ticket is resolved.</p>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Thank you for choosing Classgrid. We're here to help!</p>
<div style="margin-top:10px;">
  <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 10px;">Warm regards,</p>
  <div style="display:inline-block;text-align:left;">
    ${adminAvatar ? `<img src="${adminAvatar}" alt="${escapeHtml(specialistName)}" style="width:40px;height:40px;border-radius:50%;vertical-align:middle;margin-right:8px;border:2px solid #34d399;object-fit:cover;">` : ''}
    <strong style="color:#374151;font-size:14px;vertical-align:middle;">${escapeHtml(specialistName)}</strong>
    ${adminAvatar ? `<span style="display:inline-block;vertical-align:middle;margin-left:4px;width:18px;height:18px;" title="Verified Support Staff"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="12" fill="#1DA1F2"/><path d="M9.5 16.5l-4-4 1.41-1.41L9.5 13.67l7.59-7.59L18.5 7.5l-9 9z" fill="#ffffff"/></svg></span>` : ''}
    ${specialistEmail ? `<br><a href="mailto:${escapeHtml(specialistEmail)}" style="color:#34d399;font-size:13px;text-decoration:none;">${escapeHtml(specialistEmail)}</a>` : ''}
  </div>
</div>

</td>
</tr>
<tr>
<td style="padding:20px;text-align:center;border-top:1px solid #eaeaea;background:#f9f9f9;">
<p style="margin:0 0 10px;">
  <a href="https://classgrid.in" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Website</a> | 
  <a href="https://classgrid.in/privacy" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Privacy Policy</a> | 
  <a href="https://classgrid.in/terms" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Terms of Service</a>
</p>
<p style="color:#9ca3af;font-size:11px;line-height:1.5;margin:0;">&copy; ${currentYear} Classgrid. All rights reserved.<br>You received this email because you opened a support ticket on Classgrid. If you did not expect this reply or wish to unsubscribe from ticket notifications, please contact us immediately.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function buildTicketReplyPlainText({ ticket, replyMessage, conversationUrl, adminName, adminEmail }) {
    const ticketIdShort = String(ticket._id).slice(0, 8);
    const userName = ticket.submitterName || "User";
    const categoryLabel = formatTicketLabel(ticket.category || "general");
    const priorityLabel = formatTicketLabel(ticket.priority || "medium");
    const statusLabel = formatTicketLabel(ticket.status || "open");
    const assignedToLabel = adminName || getTicketAssigneeName(ticket);
    return [
        `New Reply on Your Support Ticket – #${ticketIdShort}`,
        "",
        `Dear ${userName},`,
        "",
        "You have received a new reply from the Classgrid Support Team regarding your open ticket. Please review the message below and let us know if you need further assistance.",
        "",
        "TICKET SUMMARY",
        `Ticket ID: #${ticketIdShort}`,
        `Subject: ${ticket.subject || "Support ticket"}`,
        `Status: ${statusLabel}`,
        `Assigned to: ${assignedToLabel}`,
        `Priority: ${priorityLabel}`,
        `Category: ${categoryLabel}`,
        "",
        "SUPPORT TEAM REPLY",
        stripHtml(replyMessage),
        "",

        "VIEW & REPLY TO YOUR TICKET",
        `👉 ${conversationUrl}`,
        "",
        "QUICK TIPS FOR A FASTER RESOLUTION",
        "- Be specific – include error messages and context.",
        "- Attach screenshots.",
        "",
        "Warm regards,",
        "The Classgrid Team",
        "",
        "© " + new Date().getFullYear() + " Classgrid. All rights reserved."
    ].join("\n");
}

export async function notifyTicketCreatorOfAdminReply({ ticket, replyMessage, adminName, adminAvatar, adminEmail }) {
    const to = ticket?.submitterEmail?.trim();
    if (!to) return { queued: false, reason: "missing_submitter_email" };

    const siteUrl = getMarketingSiteUrl();
    const conversationUrl = `${siteUrl}/support/requests/${ticket._id}`;
    const subject = `New reply: ${ticket.subject || "Support ticket"} | Classgrid`;

    const job = await enqueueEmail({
        to,
        subject,
        html: buildTicketReplyEmailHtml({ ticket, replyMessage, conversationUrl, adminName, adminAvatar, adminEmail }),
        text: buildTicketReplyPlainText({ ticket, replyMessage, conversationUrl, adminName, adminEmail }),
        type: "support_ticket_reply",
        channel: "support",
        userId: (ticket.submittedBy && ticket.submittedBy !== "unauthenticated") ? ticket.submittedBy : null,
        organizationId: (ticket.organization_id && ticket.organization_id !== "platform" && ticket.organization_id !== "superadmin") ? ticket.organization_id : null,
    });

    return { queued: Boolean(job), jobId: job?._id, conversationUrl };
}

function buildTicketCreationEmailHtml({ ticket, trackingUrl }) {
    const currentYear = new Date().getFullYear();
    const subject = ticket.subject || "Support ticket";
    const ticketIdShort = String(ticket._id).slice(0, 8);
    const categoryLabel = formatTicketLabel(ticket.category || "general");
    const priorityLabel = formatTicketLabel(ticket.priority || "medium");
    const statusLabel = formatTicketLabel(ticket.status || "open");
    const userName = ticket.submitterName || "User";
    const userMessage = ticket.message || "No description provided.";
    const isAiEscalated = ticket.message?.includes("Auto-escalated from AI Email Support");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Ticket Confirmation – #${escapeHtml(ticketIdShort)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body, html {
      margin: 0; padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f5f5;width:100%;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;margin:0 auto;max-width:600px;width:100%;">
<tr>
<td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;">
<img src="https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
<p style="color:#6b7280;margin-top:8px;font-size:13px;">Ticket #${escapeHtml(ticketIdShort)}</p>
</td>
</tr>
<tr>
<td style="padding:30px;color:#374151;font-size:14px;line-height:1.7;">
<p style="color:#374151;font-size:15px;margin:0 0 15px;">Dear ${escapeHtml(userName)},</p>
${isAiEscalated 
  ? `<p style="color:#374151;margin:0 0 15px;">Your issue regarding <strong>"${escapeHtml(subject)}"</strong> has been automatically escalated into a formal Support Ticket by the Classgrid AI Support Agent.</p>
<p style="color:#374151;margin:0 0 30px;">Our senior support team will review the details collected by the AI and respond with the next step as soon as possible.</p>`
  : `<p style="color:#374151;margin:0 0 15px;">Thank you for contacting Classgrid Support. We have received your request regarding <strong>"${escapeHtml(subject)}"</strong>, and it has been registered in your support thread.</p>
<p style="color:#374151;margin:0 0 30px;">Our team will review the details you shared and respond with the next step as soon as possible.</p>`}

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Ticket Details</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:10px;border:1px solid #eaeaea;margin:0 0 25px;">
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;width:30%;color:#6b7280;font-size:13px;font-weight:500;">Ticket ID</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;font-weight:600;">#${escapeHtml(ticketIdShort)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Subject</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(subject)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Category</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(categoryLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Priority</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(priorityLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Status</td>
<td style="padding:14px 18px;color:#34d399;font-size:14px;font-weight:600;">${escapeHtml(statusLabel)}</td>
</tr>
</table>

<div style="padding:20px;background:#ffffff;border-radius:10px;border:1px solid #eaeaea;margin:0 0 30px;text-align:left;">
  <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 10px;font-weight:600;">Your Original Message</p>
  <div style="color:#374151;font-size:14px;line-height:1.6;margin:0;">${userMessage}</div>
</div>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">What Happens Next?</h3>
<ul style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 30px;padding-left:20px;">
<li style="margin-bottom:10px;"><strong>Initial Review:</strong> Our support engineer will analyze your issue and may reach out for additional details.</li>
<li style="margin-bottom:10px;"><strong>Investigation & Resolution:</strong> We will work on identifying the root cause and implementing a fix.</li>
<li style="margin-bottom:10px;"><strong>Solution Delivery:</strong> You will be notified via email once the issue is resolved, or sooner if we need more information.</li>
</ul>

<h3 style="color:#111111;font-size:16px;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Track Your Ticket</h3>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;text-align:center;">To view the full history, add comments, or upload additional files, please use the secure link below. (This link is unique to your request and should not be shared.)</p>
<div style="text-align:center;margin:0 0 30px;">
<a href="${escapeHtml(trackingUrl)}" style="background:#34d399;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;">👉 Track Your Ticket</a>
</div>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Additional Resources</h3>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 15px;">While you wait, you may find these self-help resources useful:</p>
<ul style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 30px;list-style-type:none;padding:0;">
<li style="margin-bottom:10px;">📘 <a href="https://classgrid.in/help-center" style="color:#34d399;text-decoration:none;">Classgrid Help Center</a> – Browse FAQs and how-to guides</li>
</ul>



<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">We appreciate your patience and trust in Classgrid. Our goal is to make your experience seamless and enjoyable.</p>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Warm regards,<br><strong>The Classgrid Team</strong></p>

</td>
</tr>
<tr>
<td style="padding:20px;text-align:center;border-top:1px solid #eaeaea;background:#f9f9f9;">
<p style="margin:0 0 10px;">
  <a href="https://classgrid.in" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Website</a> | 
  <a href="https://classgrid.in/privacy" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Privacy Policy</a> | 
  <a href="https://classgrid.in/terms" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Terms of Service</a>
</p>
<p style="color:#9ca3af;font-size:11px;line-height:1.5;margin:0;">&copy; ${currentYear} Classgrid. All rights reserved.<br>You received this email because you submitted a support request on Classgrid. If you did not initiate this request, please contact us immediately.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function buildTicketCreationPlainText({ ticket, trackingUrl }) {
    const ticketIdShort = String(ticket._id).slice(0, 8);
    const userName = ticket.submitterName || "User";
    const userMessage = ticket.message || "No description provided.";
    const isAiEscalated = ticket.message?.includes("Auto-escalated from AI Email Support");
    const categoryLabel = formatTicketLabel(ticket.category || "general");
    const priorityLabel = formatTicketLabel(ticket.priority || "medium");
    const statusLabel = formatTicketLabel(ticket.status || "open");
    
    return [
        `Support Ticket Confirmation – #${ticketIdShort}`,
        "",
        `Dear ${userName},`,
        "",
        isAiEscalated ? `Your issue regarding "${ticket.subject || "Support ticket"}" has been automatically escalated into a formal Support Ticket by the Classgrid AI Support Agent.` : `Thank you for contacting Classgrid Support. We have received your request regarding "${ticket.subject || "Support ticket"}", and it has been registered in your support thread.`,
        "",
        isAiEscalated ? "Our senior support team will review the details collected by the AI and respond with the next step as soon as possible." : "Our team will review the details you shared and respond with the next step as soon as possible.",
        "",
        "TICKET DETAILS",
        `Ticket ID: #${ticketIdShort}`,
        `Subject: ${ticket.subject || "Support ticket"}`,
        `Category: ${categoryLabel}`,
        `Priority: ${priorityLabel}`,
        `Status: ${statusLabel}`,
        "",
        "YOUR ORIGINAL MESSAGE",
        stripHtml(userMessage),
        "",
        "WHAT HAPPENS NEXT?",
        "- Initial Review: Our support engineer will analyze your issue and may reach out for additional details.",
        "- Investigation & Resolution: We will work on identifying the root cause and implementing a fix.",
        "- Solution Delivery: You will be notified via email once the issue is resolved, or sooner if we need more information.",
        "",
        "TRACK YOUR TICKET",
        "To view the full history, add comments, or upload additional files, please use the secure link below:",
        `👉 ${trackingUrl}`,
        "",
        "ADDITIONAL RESOURCES",
        "While you wait, you may find these self-help resources useful:",
        "- Classgrid Help Center: https://classgrid.in/help-center",
        "",

        "Warm regards,",
        "The Classgrid Team",
        "",
        "© " + new Date().getFullYear() + " Classgrid. All rights reserved."
    ].join("\n");
}

export async function notifyUserOfTicketCreation({ ticket }) {
    const to = ticket?.submitterEmail?.trim();
    if (!to) return { queued: false, reason: "missing_submitter_email" };

    const siteUrl = getMarketingSiteUrl();
    const trackingUrl = `${siteUrl}/support/requests/${ticket._id}`;
    const subject = `Ticket received: ${ticket.subject || "Support ticket"} | Classgrid`;

    const job = await enqueueEmail({
        to,
        subject,
        html: buildTicketCreationEmailHtml({ ticket, trackingUrl }),
        text: buildTicketCreationPlainText({ ticket, trackingUrl }),
        type: "support_ticket_new",
        channel: "support",
        userId: (ticket.submittedBy && ticket.submittedBy !== "unauthenticated") ? ticket.submittedBy : null,
        organizationId: (ticket.organization_id && ticket.organization_id !== "platform" && ticket.organization_id !== "superadmin") ? ticket.organization_id : null,
    });

    return { queued: Boolean(job), jobId: job?._id, trackingUrl };
}

export function buildTalkRequestCreationEmailHtml({ ticket, trackingUrl }) {
    const currentYear = new Date().getFullYear();
    const subject = ticket.subject || "Classgrid Talk Request";
    const ticketIdShort = String(ticket._id).slice(0, 8);
    const userName = ticket.submitterName || "User";
    const institutionLabel = ticket.institution || "Not provided";
    const categoryLabel = formatTicketLabel(ticket.category || "general");
    const priorityLabel = formatTicketLabel(ticket.priority || "medium");
    const statusLabel = formatTicketLabel(ticket.status || "open");
    const assignedToLabel = getTicketAssigneeName(ticket);
    const createdDate = formatTicketDate(ticket.createdAt || Date.now());

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Classgrid Talk Request – #${escapeHtml(ticketIdShort)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body, html {
      margin: 0; padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f5f5;width:100%;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;margin:0 auto;max-width:600px;width:100%;">
<tr>
<td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;">
<img src="https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
<p style="color:#6b7280;margin-top:8px;font-size:13px;">Request #CG-TALK-${escapeHtml(ticketIdShort)}</p>
</td>
</tr>
<tr>
<td style="padding:30px;color:#374151;font-size:14px;line-height:1.7;">
<p style="color:#374151;font-size:15px;margin:0 0 15px;">Dear ${escapeHtml(userName)},</p>
<p style="color:#374151;margin:0 0 15px;">Thank you for contacting Classgrid.</p>
<p style="color:#374151;margin:0 0 30px;">We have received your inquiry and saved the details below for our team to review.</p>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Request Summary</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:10px;border:1px solid #eaeaea;margin:0 0 30px;">
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;width:30%;color:#6b7280;font-size:13px;font-weight:500;">Request ID</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;font-weight:600;">#CG-TALK-${escapeHtml(ticketIdShort)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Institution</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(institutionLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Subject</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(subject)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Category</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(categoryLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Priority</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(priorityLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Status</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#34d399;font-size:14px;font-weight:600;">${escapeHtml(statusLabel)}</td>
</tr>

<tr>
<td style="padding:14px 18px;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Created</td>
<td style="padding:14px 18px;color:#111111;font-size:14px;">${escapeHtml(createdDate)}</td>
</tr>
</table>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">What Happens Next?</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
<tr>
<td style="padding:10px 0;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;font-weight:600;width:40%;">1. Review</td>
<td style="padding:10px 0;border-bottom:1px solid #eaeaea;color:#374151;font-size:14px;">Our team will review the details saved on this request.</td>
</tr>
<tr>
<td style="padding:10px 0;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;font-weight:600;">2. Assignment</td>
<td style="padding:10px 0;border-bottom:1px solid #eaeaea;color:#374151;font-size:14px;">A suitable Classgrid specialist will be assigned based on your needs.</td>
</tr>
<tr>
<td style="padding:10px 0;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;font-weight:600;">3. Resolution</td>
<td style="padding:10px 0;border-bottom:1px solid #eaeaea;color:#374151;font-size:14px;">We will work with you to provide the necessary support or information.</td>
</tr>
</table>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">While You Wait</h3>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 15px;">Explore how Classgrid empowers institutions like yours:</p>
<ul style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 30px;list-style-type:none;padding:0;">
<li style="margin-bottom:10px;">🎥 <a href="https://classgrid.in/#demo" style="color:#34d399;text-decoration:none;">Product Demo</a> – Watch Classgrid in action</li>
</ul>

<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">We look forward to assisting you.</p>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Warm regards,<br><strong>The Classgrid Team</strong></p>

</td>
</tr>
<tr>
<td style="padding:20px;text-align:center;border-top:1px solid #eaeaea;background:#f9f9f9;">
<p style="margin:0 0 10px;">
  <a href="https://classgrid.in" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Website</a> | 
  <a href="https://classgrid.in/privacy" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Privacy Policy</a>
</p>
<p style="color:#9ca3af;font-size:11px;line-height:1.5;margin:0;">&copy; ${currentYear} Classgrid. All rights reserved.<br>You received this email because you submitted a request through Classgrid Talk. If you did not initiate this, please contact us immediately.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function buildTalkRequestCreationPlainText({ ticket, trackingUrl }) {
    const ticketIdShort = String(ticket._id).slice(0, 8);
    const userName = ticket.submitterName || "Prospect";
    const subject = ticket.subject || "Classgrid Talk Request";
    const institutionLabel = ticket.institution || "Not provided";
    const categoryLabel = formatTicketLabel(ticket.category || "general");
    const priorityLabel = formatTicketLabel(ticket.priority || "medium");
    const statusLabel = formatTicketLabel(ticket.status || "open");
    const assignedToLabel = getTicketAssigneeName(ticket);
    const createdDate = formatTicketDate(ticket.createdAt || Date.now());
    
    return [
        "Your Classgrid Talk Request Has Been Received",
        "",
        `Dear ${userName},`,
        "",
        "Thank you for contacting Classgrid.",
        "We have received your inquiry and saved the details below for our team to review.",
        "",
        "REQUEST SUMMARY",
        `Request ID: #CG-TALK-${ticketIdShort}`,
        `Institution: ${institutionLabel}`,
        `Subject: ${subject}`,
        `Category: ${categoryLabel}`,
        `Priority: ${priorityLabel}`,
        `Status: ${statusLabel}`,

        `Created: ${createdDate}`,
        "",
        "WHAT HAPPENS NEXT?",
        "1. Review: Our team will review the details saved on this request.",
        "2. Assignment: A suitable Classgrid specialist will be assigned based on your needs.",
        "3. Resolution: We will work with you to provide the necessary support or information.",
        "",
        "WHILE YOU WAIT",
        "Explore how Classgrid empowers institutions like yours:",
        "- Product Demo: https://classgrid.in/#demo",
        "",
        "We look forward to assisting you.",
        "",
        "Warm regards,",
        "The Classgrid Team",
        "",
        "© " + new Date().getFullYear() + " Classgrid. All rights reserved."
    ].join("\n");
}

export function buildTalkRequestReplyEmailHtml({ ticket, replyMessage, conversationUrl, adminName, adminAvatar, adminEmail }) {
    const currentYear = new Date().getFullYear();
    const ticketIdShort = String(ticket._id).slice(0, 8);
    const userName = ticket.submitterName || "Prospect";
    const specialistName = adminName || ticket.assignedToName || "Your Classgrid Talk Specialist";
    const specialistEmail = adminEmail?.trim() || "";
    const institutionLabel = ticket.institution || "Not provided";
    const subject = ticket.subject || "Classgrid Talk Request";
    const categoryLabel = formatTicketLabel(ticket.category || "general");
    const priorityLabel = formatTicketLabel(ticket.priority || "medium");
    const statusLabel = formatTicketLabel(ticket.status || "open");

    const isEmailInquiry = ticket.institution === "Email Inquiry";
    
    const introHtml = isEmailInquiry
        ? `
<tr>
<td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;">
<img src="https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
<p style="color:#6b7280;margin-top:8px;font-size:13px;">Request #CG-TALK-${escapeHtml(ticketIdShort)}</p>
</td>
</tr>
<tr>
<td style="padding:30px;color:#374151;font-size:14px;line-height:1.7;">
<p style="color:#374151;font-size:15px;margin:0 0 15px;">Hi ${escapeHtml(userName)},</p>
<p style="color:#374151;margin:0 0 30px;">Thank you for emailing Classgrid Support. Because your question requires personalized attention, our AI agent has escalated your email into a dedicated <strong>Classgrid Talk</strong> inquiry.<br><br><i>(Classgrid Talk is our specialized portal for pre-sales questions, product inquiries, and direct discussions with our team).</i><br><br>Our specialist <strong>${escapeHtml(specialistName)}</strong> has reviewed your email and personally replied to you below:</p>
`
        : `
<tr>
<td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;">
<img src="https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png" alt="Classgrid" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
<p style="color:#6b7280;margin-top:8px;font-size:13px;">Request #CG-TALK-${escapeHtml(ticketIdShort)}</p>
</td>
</tr>
<tr>
<td style="padding:30px;color:#374151;font-size:14px;line-height:1.7;">
<p style="color:#374151;font-size:15px;margin:0 0 15px;">Dear ${escapeHtml(userName)},</p>
<p style="color:#374151;margin:0 0 30px;">Your Classgrid Talk specialist has responded to your conversation. Please review the message below and continue the discussion at your convenience.</p>
`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isEmailInquiry ? `Re: ${escapeHtml(subject)}` : `New Reply on Your Request – #CG-TALK-${escapeHtml(ticketIdShort)}`}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body, html {
      margin: 0; padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f5f5;width:100%;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;margin:0 auto;max-width:600px;width:100%;">
${introHtml}

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Conversation Summary</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:10px;border:1px solid #eaeaea;margin:0 0 25px;">
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;width:30%;color:#6b7280;font-size:13px;font-weight:500;">Request ID</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;font-weight:600;">#CG-TALK-${escapeHtml(ticketIdShort)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Institution</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(institutionLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Subject</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(subject)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Category</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(categoryLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Priority</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#111111;font-size:14px;">${escapeHtml(priorityLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Status</td>
<td style="padding:14px 18px;border-bottom:1px solid #eaeaea;color:#34d399;font-size:14px;font-weight:600;">${escapeHtml(statusLabel)}</td>
</tr>
<tr>
<td style="padding:14px 18px;border-right:1px solid #eaeaea;color:#6b7280;font-size:13px;font-weight:500;">Specialist</td>
<td style="padding:14px 18px;color:#111111;font-size:14px;">${escapeHtml(specialistName)}</td>
</tr>
</table>

<h3 style="color:#111111;font-size:16px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Specialist's Message</h3>
<div style="padding:20px;background:#ffffff;border-radius:10px;border:1px solid #eaeaea;margin:0 0 30px;text-align:left;">
  <div style="color:#374151;font-size:15px;line-height:1.6;margin:0;">${replyMessage}</div>
</div>



<div style="text-align:center;margin:0 0 40px;">
<a href="${escapeHtml(conversationUrl)}" style="background:#34d399;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;display:inline-block;">👉 Reply to Conversation</a>

</div>

<div style="padding:20px;background:#f9f9f9;border-radius:10px;border:1px solid #eaeaea;margin:0 0 30px;text-align:center;">
  <h3 style="color:#111111;font-size:15px;margin:0 0 15px;">Your Dedicated Specialist</h3>
  ${adminAvatar ? `<img src="${adminAvatar}" alt="${escapeHtml(specialistName)}" style="width:60px;height:60px;border-radius:50%;margin-bottom:10px;border:2px solid #34d399;object-fit:cover;">` : ''}
  <p style="color:#374151;font-size:16px;margin:0 0 5px;">
    <strong>${escapeHtml(specialistName)}</strong>
    ${adminAvatar ? `<span style="display:inline-block;vertical-align:middle;margin-left:4px;width:18px;height:18px;" title="Verified Staff"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="12" fill="#1DA1F2"/><path d="M9.5 16.5l-4-4 1.41-1.41L9.5 13.67l7.59-7.59L18.5 7.5l-9 9z" fill="#ffffff"/></svg></span>` : ''}
  </p>
  ${specialistEmail ? `<p style="color:#374151;font-size:14px;margin:0 0 5px;"><a href="mailto:${escapeHtml(specialistEmail)}" style="color:#34d399;text-decoration:none;">${escapeHtml(specialistEmail)}</a></p>` : ''}
</div>

<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">We look forward to assisting you.</p>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Warm regards,<br><strong>The Classgrid Team</strong></p>

</td>
</tr>
<tr>
<td style="padding:20px;text-align:center;border-top:1px solid #eaeaea;background:#f9f9f9;">
<p style="margin:0 0 10px;">
  <a href="https://classgrid.in" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Website</a> | 
  <a href="https://classgrid.in/privacy" style="color:#6b7280;font-size:12px;text-decoration:none;margin:0 8px;">Privacy Policy</a>
</p>
<p style="color:#9ca3af;font-size:11px;line-height:1.5;margin:0;">&copy; ${currentYear} Classgrid. All rights reserved.<br>You received this email because you're in conversation with Classgrid Talk.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function buildTalkRequestReplyPlainText({ ticket, replyMessage, conversationUrl, adminName, adminEmail }) {
    const ticketIdShort = String(ticket._id).slice(0, 8);
    const userName = ticket.submitterName || "User";
    const specialistName = adminName || ticket.assignedToName || "Your Classgrid Talk Specialist";
    const specialistEmail = adminEmail?.trim() || "";
    const institutionLabel = ticket.institution || "Not provided";
    const subject = ticket.subject || "Classgrid Talk Request";
    const categoryLabel = formatTicketLabel(ticket.category || "general");
    const priorityLabel = formatTicketLabel(ticket.priority || "medium");
    const statusLabel = formatTicketLabel(ticket.status || "open");
    const isEmailInquiry = ticket.institution === "Email Inquiry";

    const introText = isEmailInquiry
        ? [
            `Re: ${subject}`,
            "",
            `Hi ${userName},`,
            "",
            "Thank you for emailing Classgrid Support. Because your question requires personalized attention, our AI agent has escalated your email into a dedicated Classgrid Talk inquiry.",
            "(Classgrid Talk is our specialized portal for pre-sales questions, product inquiries, and direct discussions with our team).",
            "",
            `Our specialist ${specialistName} has reviewed your email and personally replied to you below:`
        ]
        : [
            `New Reply on Your Request – #CG-TALK-${ticketIdShort}`,
            "",
            `Dear ${userName},`,
            "",
            "Your Classgrid Talk specialist has responded to your conversation. Please review the message below and continue the discussion at your convenience."
        ];

    return [
        ...introText,
        "",
        "CONVERSATION SUMMARY",
        `Request ID: #CG-TALK-${ticketIdShort}`,
        `Institution: ${institutionLabel}`,
        `Subject: ${subject}`,
        `Category: ${categoryLabel}`,
        `Priority: ${priorityLabel}`,
        `Status: ${statusLabel}`,
        `Specialist: ${specialistName}`,
        "",
        "SPECIALIST'S MESSAGE",
        stripHtml(replyMessage),
        "",
        "VIEW & REPLY TO YOUR TICKET",
        `👉 ${conversationUrl}`,
        "",
        "YOUR DEDICATED SPECIALIST",
        specialistName,
        specialistEmail ? `Email: ${specialistEmail}` : "",
        "",
        "We look forward to assisting you.",
        "",
        "Warm regards,",
        "The Classgrid Team",
        "",
        "© " + new Date().getFullYear() + " Classgrid. All rights reserved."
    ].join("\n");
}

export async function notifyUserOfTalkRequestCreation({ ticket }) {
    const to = ticket?.submitterEmail?.trim();
    if (!to) return { queued: false, reason: "missing_submitter_email" };

    const siteUrl = getMarketingSiteUrl();
    const trackingUrl = `${siteUrl}/support/requests/${ticket._id}`;
    const subject = `Classgrid Talk request received: ${ticket.subject || "Classgrid Talk Request"} | Classgrid`;

    const job = await enqueueEmail({
        to,
        subject,
        html: buildTalkRequestCreationEmailHtml({ ticket, trackingUrl }),
        text: buildTalkRequestCreationPlainText({ ticket, trackingUrl }),
        type: "talk_request_new",
        userId: (ticket.submittedBy && ticket.submittedBy !== "unauthenticated") ? ticket.submittedBy : null,
        organizationId: (ticket.organization_id && ticket.organization_id !== "platform" && ticket.organization_id !== "superadmin") ? ticket.organization_id : null,
    });

    return { queued: Boolean(job), jobId: job?._id, trackingUrl };
}

export async function notifyTalkCreatorOfAdminReply({ ticket, replyMessage, adminName, adminAvatar, adminEmail }) {
    const to = ticket?.submitterEmail?.trim();
    if (!to) return { queued: false, reason: "missing_submitter_email" };

    const siteUrl = getMarketingSiteUrl();
    const conversationUrl = `${siteUrl}/support/requests/${ticket._id}`;
    const ticketIdShort = String(ticket._id).slice(0, 8);
    const subject = `New Reply on Your Request – #CG-TALK-${ticketIdShort}`;

    const job = await enqueueEmail({
        to,
        subject,
        html: buildTalkRequestReplyEmailHtml({ ticket, replyMessage, conversationUrl, adminName, adminAvatar, adminEmail }),
        text: buildTalkRequestReplyPlainText({ ticket, replyMessage, conversationUrl, adminName, adminEmail }),
        type: "talk_request_reply",
        userId: (ticket.submittedBy && ticket.submittedBy !== "unauthenticated") ? ticket.submittedBy : null,
        organizationId: (ticket.organization_id && ticket.organization_id !== "platform" && ticket.organization_id !== "superadmin") ? ticket.organization_id : null,
    });

    return { queued: Boolean(job), jobId: job?._id, conversationUrl };
}



