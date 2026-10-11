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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

import nodeCron from "node-cron";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import mongoose from "mongoose";
import fetch from "node-fetch";
import WebSocket from "ws";

if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

// Sanity Config
const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || "a4wk6kp5";
const SANITY_DATASET = process.env.SANITY_DATASET || "production";
const SANITY_API_VERSION = "2023-01-01";
const SANITY_TOKEN = process.env.SANITY_API_WRITE_TOKEN || "";

// Supabase Config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bumxgscngzjadyozdpce.supabase.co";
// Using Anon key since that's what was in the backend .env, or use service role if available. 
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Transporters
const brevoTransporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

const resendTransporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 587,
  secure: false,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY,
  },
});

const awsSesTransporter = nodemailer.createTransport({
  host: process.env.AWS_SES_SMTP_HOST || "email-smtp.eu-north-1.amazonaws.com",
  port: Number(process.env.AWS_SES_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.AWS_SES_SMTP_USER,
    pass: process.env.AWS_SES_SMTP_PASS,
  },
});

let useResendFallback = false;
let isEmailWorkerRunning = false;

// ─── Utility Functions ───────────────────────────────────────────────────────
function getLocalizedString(value, fallback = "") {
  if (typeof value === "string") return value || fallback;
  if (value && typeof value === "object") {
    if (typeof value.en === "string" && value.en) return value.en;
    if (typeof value.hi === "string" && value.hi) return value.hi;
    if (typeof value.mr === "string" && value.mr) return value.mr;
  }
  return fallback;
}

function truncateText(value, maxLength = 120) {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function resolveImageUrl(image, width) {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (image.asset && image.asset._ref) {
    const ref = image.asset._ref;
    const parts = ref.split('-');
    if (parts.length >= 3) {
      const id = parts[1];
      const dimensions = parts[2];
      const format = parts[3];
      return `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}-${dimensions}.${format}?w=${width}&auto=format`;
    }
  }
  return null;
}

function escapeHtml(value) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatUpdateType(value) {
  switch (value) {
    case "feature": return "New Feature";
    case "improvement": return "Improvement";
    case "bugfix": return "Bug Fix";
    default: return "Update";
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

function generateUnsubscribeHash(email) {
  const secret = process.env.SANITY_WEBHOOK_SECRET || "classgrid_fallback";
  return crypto.createHmac("sha256", secret).update(email).digest("hex").slice(0, 32);
}

// ─── Sanity Fetch ────────────────────────────────────────────────────────────
async function fetchSanity(query, params = {}) {
  let url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
  for (const [key, value] of Object.entries(params)) {
    url += `&${encodeURIComponent(`$${key}`)}=${encodeURIComponent(JSON.stringify(value))}`;
  }
  
  const headers = {};
  if (SANITY_TOKEN) {
    headers["Authorization"] = `Bearer ${SANITY_TOKEN}`;
  }
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Sanity fetch failed: ${res.statusText}`);
  }
  const json = await res.json();
  return json.result;
}

// ─── HTML Builder (copied directly from Vercel logic) ────────────────────────
// [Omitted to save space, but functionally identical to the Next.js version]
function buildNotificationEmailHtml(post, unsubscribeUrl, recentBlogs, recentChangelogs) {
  // We'll use a simplified template for the worker to avoid code bloat, 
  // or I can paste the full one. I will paste the full one.
  const currentYear = new Date().getFullYear();
  const siteUrl = "https://classgrid.in";
  const isChangelog = post._type === "changelogEntry";
  const isLegalPage = post._type === "legalPage";
  
  let itemUrl = `${siteUrl}/blog/${post.slug}`;
  if (isChangelog) itemUrl = `${siteUrl}/changelog/${post.slug}`;
  if (isLegalPage) itemUrl = `${siteUrl}/${post.slug}`; 
  
  const coverImageHtml = post.coverImage
    ? `<img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.resolvedTitle)}" width="600" style="width:100%;max-width:600px;border-radius:8px;display:block;margin:0 auto 20px;" />`
    : "";
  const metaLine = isChangelog
    ? [formatUpdateType(post.updateType), post.versionLabel ? `Version ${post.versionLabel}` : "", formatDate(post.releaseDate)]
        .filter(Boolean).join(" | ")
    : (() => {
        const names = (post.authorNames && post.authorNames.length > 0)
          ? post.authorNames.join(' & ')
          : (post.author || 'Classgrid Team');
        return [`By ${names}`, formatDate(post.publishedAt)].filter(Boolean).join(' | ');
      })();
      
  let summary = post.resolvedSummary;
  let bodyOutro = "We just published a new article on the Classgrid Blog with insights, ideas, and practical perspectives for building and managing modern educational institutions.";
  let ctaLabel = "Read the Full Article";
  let eyebrow = "";
  
  if (isChangelog) {
    summary = post.resolvedSummary || "";
    bodyOutro = "See what's changed, what's improved, and what you need to know about the latest Classgrid release.";
    ctaLabel = "View Product Update";
    eyebrow = "";
  } else if (isLegalPage) {
    bodyOutro = "";
    const effectiveDateStr = post._updatedAt ? formatDate(post._updatedAt) : "immediately";
    const changeSummary = post.resolvedSummary || "Important updates to our legal terms and policies.";

    switch (post.slug) {
      case "privacy":
        eyebrow = "Notice of changes to our Privacy Policy";
        summary = `We are writing to notify you that Classgrid Technologies has updated its Privacy Policy. The revised policy explains how personal information is collected, used, disclosed, retained, and protected in connection with the Services.<br><br><b>Changes included in this update:</b><br>${changeSummary}<br><br>The updated Privacy Policy will take effect on ${effectiveDateStr}.`;
        ctaLabel = "Review the updated Privacy Policy";
        break;
      case "terms":
        eyebrow = "Updates to the Terms of Service";
        summary = `We are notifying you that Classgrid Technologies has updated its Terms of Service governing access to and use of the Services.<br><br><b>Changes included in this update:</b><br>${changeSummary}<br><br>The revised Terms of Service will take effect on ${effectiveDateStr}.`;
        ctaLabel = "Review the updated Terms of Service";
        break;
      case "security":
        eyebrow = "Information Security Policy update";
        summary = `Classgrid Technologies has updated its Information Security Policy describing the technical, organizational, and administrative measures used to protect information and maintain the security of the Services.<br><br><b>Changes included in this update:</b><br>${changeSummary}<br><br>The revised policy is effective ${effectiveDateStr}.`;
        ctaLabel = "Review the updated Security Policy";
        break;
      case "cookies":
        eyebrow = "Changes to our Cookies Policy";
        summary = `We have updated our Cookies Policy to explain how Classgrid Technologies and approved service providers use cookies and similar technologies on the Services.<br><br><b>Changes included in this update:</b><br>${changeSummary}<br><br>The revised Cookies Policy takes effect on ${effectiveDateStr}.`;
        ctaLabel = "Review the updated Cookies Policy";
        break;
      case "disclaimer":
        eyebrow = "Notice of changes to our Disclaimer";
        summary = `Classgrid Technologies has updated its Disclaimer concerning the information, materials, content, and services made available through the platform.<br><br><b>Changes included in this update:</b><br>${changeSummary}<br><br>The revised Disclaimer is effective ${effectiveDateStr}.`;
        ctaLabel = "Review the updated Disclaimer";
        break;
      default:
        eyebrow = "Important Legal Update";
        summary = `We have updated our legal policies.<br><br><b>Changes included in this update:</b><br>${changeSummary}<br><br>Click below to review the changes.`;
        ctaLabel = "Review Policy";
    }
  }

  const headerTitle = isLegalPage ? "Classgrid Legal Notice" : "New from Classgrid";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(headerTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f5f5f5;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;margin:0 auto;">
<tr>
<td style="padding:30px;border-bottom:1px solid #eaeaea;text-align:center;">
<img src="https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png" alt="Classgrid" height="42" style="display:block;margin:0 auto 16px;" />
<h1 style="color:#111111;margin:0;font-size:22px;">${escapeHtml(headerTitle)}</h1>
${eyebrow ? `<p style="color:#6b7280;margin-top:8px;font-size:13px;">${escapeHtml(eyebrow)}</p>` : ""}
</td>
</tr>
<tr>
<td style="padding:30px;color:#374151;font-size:14px;line-height:1.7;">
${coverImageHtml}
<h2 style="color:#111111;font-size:20px;margin:0 0 8px;">${escapeHtml(post.resolvedTitle)}</h2>
${metaLine && !isLegalPage ? `<p style="color:#6b7280;font-size:12px;margin:0 0 20px;">${escapeHtml(metaLine)}</p>` : ""}
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 ${bodyOutro ? '16px' : '25px'};">${isLegalPage ? summary : escapeHtml(summary)}</p>
${bodyOutro ? `<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 25px;">${escapeHtml(bodyOutro)}</p>` : ""}
<div style="text-align:center;margin:30px 0;">
<a href="${escapeHtml(itemUrl)}" style="background:#34d399;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">${escapeHtml(ctaLabel)}</a>
</div>
</td>
</tr>
<tr>
<td style="padding:30px;border-top:1px solid #eaeaea;">
<p style="color:#374151;font-size:14px;margin:0 0 8px;">Build smarter academic workflows</p>
<a href="${siteUrl}" style="color:#6b7280;text-decoration:underline;font-size:13px;margin-bottom:24px;display:inline-block;">classgrid.in &rarr;</a>

<div style="margin-bottom:24px;">
  <a href="https://www.instagram.com/classgridedu/" target="_blank" style="display:inline-block;border:1px solid #eaeaea;border-radius:6px;padding:8px;margin-right:8px;text-decoration:none;">
    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" alt="Instagram" width="16" height="16" style="display:block;opacity:0.8;">
  </a>
  <a href="https://www.facebook.com/profile.php?id=61588646851017" target="_blank" style="display:inline-block;border:1px solid #eaeaea;border-radius:6px;padding:8px;margin-right:8px;text-decoration:none;">
    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" alt="Facebook" width="16" height="16" style="display:block;opacity:0.8;">
  </a>
  <a href="https://www.youtube.com/@classgrid-y7f" target="_blank" style="display:inline-block;border:1px solid #eaeaea;border-radius:6px;padding:8px;margin-right:8px;text-decoration:none;">
    <img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YouTube" width="16" height="16" style="display:block;opacity:0.8;">
  </a>
</div>

<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="color:#9ca3af;font-size:12px;text-align:left;">
      &copy; ${currentYear} Classgrid. All rights reserved.
    </td>
    <td style="color:#9ca3af;font-size:12px;text-align:right;">
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af;text-decoration:none;">Unsubscribe</a>
    </td>
  </tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

// ─── Processor ───────────────────────────────────────────────────────────────
async function processQueueItem(item) {
  const siteUrl = "https://classgrid.in";
  const senderName = "Classgrid";
  const brevoSenderEmail = "noreply@classgrid.in";
  const resendSenderEmail = "notification@updates.classgrid.in";
  const supportEmail = "support@classgrid.in";

  // Fetch from Sanity
  let publishedDocument = null;
  if (item.document_type === "post") {
    publishedDocument = await fetchSanity(
      `*[_type == "post" && _id == $documentId][0]{
        _id, _type, title, "slug": slug.current, excerpt, publishedAt, coverImage, author, "authorNames": authors[].name
      }`, { documentId: item.document_id }
    );
  } else if (item.document_type === "changelogEntry") {
    publishedDocument = await fetchSanity(
      `*[_type == "changelogEntry" && _id == $documentId][0]{
        _id, _type, title, "slug": slug.current, summary, releaseDate, updateType, versionLabel, image
      }`, { documentId: item.document_id }
    );
  } else {
    publishedDocument = await fetchSanity(
      `*[_type == "legalPage" && _id == $documentId][0]{
        _id, _type, title, "slug": slug.current, summary, _updatedAt
      }`, { documentId: item.document_id }
    );
  }

  if (!publishedDocument?.slug) throw new Error(`Document not found: ${item.document_id}`);

  let resolvedPost = { ...publishedDocument };
  if (item.document_type === "post") {
    resolvedPost.resolvedTitle = getLocalizedString(publishedDocument.title, "Blog Post");
    resolvedPost.resolvedSummary = truncateText(getLocalizedString(publishedDocument.excerpt, "New from Classgrid."), 220);
    resolvedPost.coverImage = resolveImageUrl(publishedDocument.coverImage, 600);
  } else if (item.document_type === "changelogEntry") {
    resolvedPost.resolvedTitle = getLocalizedString(publishedDocument.title, "Product Update");
    resolvedPost.resolvedSummary = truncateText(getLocalizedString(publishedDocument.summary, "New from Classgrid."), 220);
    resolvedPost.coverImage = resolveImageUrl(publishedDocument.image, 600);
  } else {
    resolvedPost.resolvedTitle = getLocalizedString(publishedDocument.title, "Legal Update");
    resolvedPost.resolvedSummary = getLocalizedString(publishedDocument.summary, "Important updates to our legal terms and policies.");
  }

  // Fetch Audiences
  let targetEmails = [];
  let filterColumn = "receives_blog";
  if (item.document_type === "changelogEntry") filterColumn = "receives_changelog";
  else if (item.document_type === "legalPage") filterColumn = "receives_legal";

  // Fetch subscribers who have this specific preference enabled
  const { data: subscribers } = await supabaseAdmin
    .from("blog_subscribers")
    .select("email, receives_blog, receives_changelog, receives_legal, short_code");
    
  let subscriberMap = new Map();
  if (subscribers) {
      subscribers.forEach(s => subscriberMap.set(s.email.toLowerCase(), s));
      // Manually filter in memory to strictly obey the specific toggle
      const activeForThisType = subscribers.filter(sub => {
          if (filterColumn === "receives_blog" && sub.receives_blog === false) return false;
          if (filterColumn === "receives_changelog" && sub.receives_changelog === false) return false;
          if (filterColumn === "receives_legal" && sub.receives_legal === false) return false;
          return true;
      });
      targetEmails.push(...activeForThisType);
  }

  if (item.document_type === "legalPage" && mongoose.connection.db) {
    const users = await mongoose.connection.db.collection("users").find({}, { projection: { email: 1 } }).toArray();
    const forumUsers = await mongoose.connection.db.collection("forumusers").find({}, { projection: { email: 1 } }).toArray();
    targetEmails.push(...users.map(u => ({ email: u.email })));
    targetEmails.push(...forumUsers.map(u => ({ email: u.email })));
  }

  targetEmails.push({ email: "support@classgrid.in" });

  // Deduplicate by email
  let uniqueEmails = Array.from(new Map(targetEmails.filter(u => u.email).map(u => [u.email.toLowerCase(), u])).values());

  // 🛡️ Remove specifically opted-out users — fetch the strict blocklist
  const { data: unsubscribed } = await supabaseAdmin
    .from("blog_subscribers")
    .select("email")
    .eq(filterColumn, false); 

  if (unsubscribed && unsubscribed.length > 0) {
    const blocklist = new Set(unsubscribed.map(u => u.email.toLowerCase()));
    const beforeCount = uniqueEmails.length;
    uniqueEmails = uniqueEmails.filter(u => !blocklist.has(u.email.toLowerCase()));
    const removed = beforeCount - uniqueEmails.length;
    if (removed > 0) console.log(`[EmailBlast] 🛡️ Filtered out ${removed} specifically opted-out email(s) for ${filterColumn}.`);
  }

  if (uniqueEmails.length === 0) return { sent: 0, failed: 0, done: true };

  const alreadySent = item.sent_count || 0;
  // EC2 has NO TIMEOUT! We can process batches of 150 emails at a time.
  const BATCH_SIZE = item.document_type === "legalPage" ? 150 : 250;
  const startIndex = alreadySent;
  const batch = uniqueEmails.slice(startIndex, startIndex + BATCH_SIZE);

  if (batch.length === 0) return { sent: 0, failed: 0, done: true };

  // ── Ensure short_codes exist for this batch ──
  const missingShortCodes = [];
  const generatedShortCodes = new Map(); // email -> short_code

  for (const sub of batch) {
    const lowerEmail = sub.email.toLowerCase();
    const existing = subscriberMap.get(lowerEmail);
    if (!existing?.short_code) {
      const newCode = crypto.randomBytes(6).toString("base64url").slice(0, 8); // 8 chars
      generatedShortCodes.set(lowerEmail, newCode);
      
      if (existing) {
        missingShortCodes.push({ ...existing, short_code: newCode });
      } else {
        missingShortCodes.push({
          email: sub.email,
          name: "Subscriber",
          receives_blog: true,
          receives_changelog: true,
          receives_legal: true,
          unsubscribe_token: crypto.randomBytes(16).toString("hex"), // legacy token
          short_code: newCode
        });
      }
    }
  }

  if (missingShortCodes.length > 0) {
    console.log(`[EmailBlast] Bulk upserting short_codes for ${missingShortCodes.length} subscribers...`);
    const { error: upsertError } = await supabaseAdmin
      .from("blog_subscribers")
      .upsert(missingShortCodes, { onConflict: "email" });
    if (upsertError) {
      console.error("[EmailBlast] Failed to bulk upsert short_codes:", upsertError);
    }
  }

  let subject = item.document_type === "changelogEntry" 
    ? `Classgrid Update: ${resolvedPost.resolvedTitle}` 
    : `New from the Classgrid Blog: ${resolvedPost.resolvedTitle}`;
  
  if (item.document_type === "legalPage") {
    const dateStr = resolvedPost._updatedAt ? formatDate(resolvedPost._updatedAt) : "immediately";
    switch (item.slug) {
      case "privacy": subject = `Important update to our Privacy Policy — effective ${dateStr}`; break;
      case "terms": subject = `Notice of updates to our Terms of Service — effective ${dateStr}`; break;
      case "security": subject = "Update to our Information Security Policy"; break;
      case "cookies": subject = `Update to our Cookies Policy — effective ${dateStr}`; break;
      case "disclaimer": subject = "Update to our Disclaimer"; break;
      default: subject = "Important Legal Update";
    }
  }

  let sentCount = 0;
  let failCount = 0;
  let rateLimitHit = false;

    for (let i = 0; i < batch.length; i++) {
    const sub = batch[i];
    try {
      let unsubscribeType = "blog";
      if (item.document_type === "changelogEntry") unsubscribeType = "changelog";
      if (item.document_type === "legalPage") unsubscribeType = "legal";
      
      const lowerEmail = sub.email.toLowerCase();
      const existingShortCode = subscriberMap.get(lowerEmail)?.short_code;
      const token = existingShortCode || generatedShortCodes.get(lowerEmail) || crypto.randomBytes(6).toString("base64url").slice(0, 8);
      
      const unsubscribeUrl = `${siteUrl}/api/preferences/unsubscribe?type=${unsubscribeType}&c=${token}`;

      const mailOptions = {
        replyTo: supportEmail,
        to: sub.email,
        subject,
        text: `${resolvedPost.resolvedTitle}\n${resolvedPost.resolvedSummary}\n\nRead: ${siteUrl}/${item.document_type === "changelogEntry" ? "changelog" : "blog"}/${resolvedPost.slug}`,
        html: buildNotificationEmailHtml(resolvedPost, unsubscribeUrl, [], []),
      };

      if (item.document_type === "legalPage") {
        await awsSesTransporter.sendMail({ ...mailOptions, from: '"Classgrid Legal" <legal@classgrid.in>' });
        sentCount++;
      } else {
        if (!useResendFallback) {
          try {
            await brevoTransporter.sendMail({ ...mailOptions, from: `"${senderName}" <${brevoSenderEmail}>` });
            sentCount++;
          } catch (brevoErr) {
            useResendFallback = true;
          }
        }
        if (useResendFallback) {
          try {
            await resendTransporter.sendMail({ ...mailOptions, from: `"${senderName}" <${resendSenderEmail}>` });
            sentCount++;
          } catch (resendErr) {
            const msg = resendErr.message?.toLowerCase() || "";
            if (msg.includes("429") || msg.includes("limit") || msg.includes("too many") || msg.includes("exceeded")) {
              console.log(`[EmailBlast] ⚡ Global rate limit hit. Pausing processing for 24 hours.`);
              rateLimitHit = true;
              break;
            }
            throw resendErr;
          }
        }
      }
    } catch (err) {
      console.error(`Failed to send to ${sub.email}:`, err.message);
      failCount++;
    }

    if (rateLimitHit) break;

    // Save progress periodically (e.g. every 10 emails) to reduce DB calls, 
    // since we don't have 10-second Vercel timeouts anymore.
    if ((i + 1) % 10 === 0 || i === batch.length - 1) {
      await supabaseAdmin
        .from("email_notification_queue")
        .update({
          sent_count: startIndex + sentCount + failCount,
          processed_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }
    
    // Slight delay to respect SES 14/sec rate limits
    if (item.document_type === "legalPage") {
      await new Promise(res => setTimeout(res, 100)); // 10 per sec
    }
  }

  const totalProcessed = startIndex + sentCount + failCount;
  return { sent: sentCount, failed: failCount, done: totalProcessed >= uniqueEmails.length, totalProcessed, rateLimitHit };
}

// ─── Exported Cron Initializer ───────────────────────────────────────────────
export const initMarketingEmailWorker = () => {
  nodeCron.schedule("* * * * *", async () => {
    if (isEmailWorkerRunning) return;
    isEmailWorkerRunning = true;

    try {
      // 1. Reset stale
      await supabaseAdmin
        .from("email_notification_queue")
        .update({ status: "pending" })
        .eq("status", "processing")
        .lt("processed_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

      // 1.5. Wake up rate_limited items after 24 hours
      await supabaseAdmin
        .from("email_notification_queue")
        .update({ status: "pending" })
        .eq("status", "rate_limited")
        .lt("processed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // 2. Fetch pending
      const { data: queueItems } = await supabaseAdmin
        .from("email_notification_queue")
        .select("*")
        .or("status.eq.pending,status.eq.failed")
        .lt("retry_count", 3)
        .order("created_at", { ascending: true })
        .limit(2);

      if (!queueItems || queueItems.length === 0) return;

      for (const item of queueItems) {
        // The website reuses one queue row per document, so a re-sent page used to keep the old sent_count
        // (e.g. 90): the worker then "resumed" past the end of the list, sent nobody and logged "90 sent".
        // A request newer than the last processing is a fresh blast, so it starts from zero.
        const isNewRequest = item.processed_at && item.created_at && new Date(item.created_at) > new Date(item.processed_at);
        if (isNewRequest && (item.sent_count || item.failed_count)) {
          console.log(`[EmailBlast] 🔁 New send for "${item.title}": resetting old counts (${item.sent_count || 0} sent, ${item.failed_count || 0} failed).`);
          item.sent_count = 0;
          item.failed_count = 0;
        }

        await supabaseAdmin
          .from("email_notification_queue")
          .update({ status: "processing", processed_at: new Date().toISOString(), ...(isNewRequest ? { sent_count: 0, failed_count: 0 } : {}) })
          .eq("id", item.id);

        try {
          const alreadySent = item.sent_count || 0;
          const { sent, failed, done, totalProcessed, rateLimitHit } = await processQueueItem(item);

          if (rateLimitHit) {
            await supabaseAdmin.from("email_notification_queue").update({
              status: "rate_limited",
              sent_count: totalProcessed || (alreadySent + sent),
              failed_count: (item.failed_count || 0) + failed,
              processed_at: new Date().toISOString(),
            }).eq("id", item.id);
            console.log(`[EmailBlast] ⏸️ Rate limit reached for "${item.title}". Pausing for 24 hours. (${alreadySent + sent} sent so far)`);
          } else if (done) {
            await supabaseAdmin.from("email_notification_queue").update({
              status: "sent",
              sent_count: alreadySent + sent,
              failed_count: (item.failed_count || 0) + failed,
              processed_at: new Date().toISOString(),
            }).eq("id", item.id);
            console.log(`[EmailBlast] ✅ Completed ${item.document_type}: "${item.title}" (${alreadySent + sent} sent)`);
          } else {
            await supabaseAdmin.from("email_notification_queue").update({
              status: "pending",
              sent_count: totalProcessed || (alreadySent + sent),
              failed_count: (item.failed_count || 0) + failed,
              processed_at: new Date().toISOString(),
            }).eq("id", item.id);
            console.log(`[EmailBlast] ⏳ Partial ${item.document_type}: "${item.title}" (${alreadySent + sent} sent so far)`);
          }
        } catch (err) {
          const newRetryCount = (item.retry_count || 0) + 1;
          await supabaseAdmin.from("email_notification_queue").update({
            status: newRetryCount >= 3 ? "exhausted" : "failed",
            retry_count: newRetryCount,
            error_message: err.message,
            processed_at: new Date().toISOString(),
          }).eq("id", item.id);
          console.error(`[EmailBlast] ❌ Failed ${item.title}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error("[EmailBlast] Worker Error:", err.message);
    } finally {
      isEmailWorkerRunning = false;
    }
  });

  console.log("👷 Marketing Email Blast Worker Initialized");
};
