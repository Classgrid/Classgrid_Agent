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
import DemoRequest from "../models/DemoRequest.js";
import Organization from "../models/Organization.js";
import OrgWebsiteContent from "../models/OrgWebsiteContent.js";
import {
  sendDemoLeadNotification,
  sendDemoMeetingScheduledNotification,
} from "../services/notification-email.service.js";
import { trackOnboardingEvent } from "../services/onboarding-event.service.js";
import { sendPushToRole } from "../services/push.service.js";
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import { resolveWeeklyLimit } from "../services/ai-credits.service.js";
import { resolveFeatureLimit, resolveResetPeriod } from "../services/ai-feature-limits.js";
import { FABLE_UNLOCK_INR } from "../services/model-access.service.js";
import { TOPUP_MIN_INR, TOPUP_MAX_INR } from "../controllers/ai-credits-topup.controller.js";
import { CHAT_PUBLIC_ORG_ID } from "../utils/chat-onboarding.js";

const router = express.Router();
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeEmail = (value) => normalizeText(value).toLowerCase();
const normalizePhone = (value) => normalizeText(value).replace(/[^\d+]/g, "");
const normalizeSlug = (value) => normalizeText(value).toLowerCase().replace(/[^a-z0-9-]/g, "");
const normalizeMeetingProvider = (value = "") => {
  const cleaned = String(value || "").trim().toLowerCase();
  if (!cleaned) return "other";
  if (cleaned.includes("google")) return "google";
  if (cleaned.includes("zoom")) return "zoom";
  return "other";
};

async function verifyTurnstileToken(token, req) {
  const secret = process.env.TURNSTILE_SECRET || process.env.TURNSTILE_SECRET_KEY || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secret) {
    return { verified: true, skipped: true };
  }

  if (!token || typeof token !== "string") {
    return { verified: false, skipped: false };
  }

  try {
    const formData = new URLSearchParams();
    formData.set("secret", secret);
    formData.set("response", token);

    const forwardedFor = req.headers["x-forwarded-for"];
    const remoteIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0].trim()
      : req.ip;

    if (remoteIp) {
      formData.set("remoteip", remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!response.ok) {
      return { verified: false, skipped: false };
    }

    const result = await response.json();
    return {
      verified: Boolean(result?.success),
      skipped: false,
      errors: Array.isArray(result?.["error-codes"]) ? result["error-codes"] : [],
    };
  } catch (error) {
    console.error("[Turnstile] Verification error:", error.message);
    return { verified: false, skipped: false };
  }
}

function getFirstGalleryImage(site) {
  return site?.gallery?.images?.find((item) => item?.image)?.image || "";
}

function platformAuthBranding() {
  return {
    success: true,
    branding: {
      authType: "platform",
      name: "ClassGrid",
      shortName: "ClassGrid",
      tagline: "Smart campus operations for modern institutions.",
      logoUrl: "/logos/logo.png",
      campusImageUrl: "",
      leftVariant: "default",
      subdomain: "",
    },
  };
}

/**
 * GET /api/public/auth-branding
 * Public-safe branding for login screens. Uses tenant subdomain first, then ?slug=.
 */
router.get("/auth-branding", async (req, res) => {
  try {
    const requestedType = normalizeText(req.query?.type) || "institution";
    const slug = normalizeSlug(req.tenantSlug || req.query?.slug);
    const domainParam = req.query?.domain;

    const query = [];
    if (slug) query.push({ subdomain: slug });
    if (req.tenantHost) {
      query.push({ "custom_domain.domain": req.tenantHost });
      query.push({ "erp_domain.domain": req.tenantHost });
    }
    if (domainParam) {
      query.push({ "custom_domain.domain": domainParam });
      query.push({ "erp_domain.domain": domainParam });
    }

    if (query.length === 0) {
      if (requestedType === "institution") {
        return res.status(404).json({ success: false, message: "Institution not found." });
      }
      return res.json(platformAuthBranding());
    }

    const org = await Organization.findOne({ $or: query })
      .select("name subdomain logo_url favicon_url campus_photo_url social_links branding status custom_domain erp_domain site_title")
      .lean();

    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found." });
    }

    if (org.status !== "active" && org.status !== "sandbox") {
      return res.status(403).json({
        success: false,
        message: "This institution portal is currently unavailable.",
      });
    }

    // 🔒 Custom Domain Disabled Guard
    // If the request came in via a custom domain (ERP or marketing),
    // and that domain has is_enabled = false, refuse to serve branding.
    // This enforces the "Enable Custom Domain" toggle in the admin settings.
    const incomingDomain = domainParam || req.tenantHost;
    if (incomingDomain) {
      const matchedErp = org.erp_domain?.domain === incomingDomain;
      const matchedMkt = org.custom_domain?.domain === incomingDomain;

      if (matchedErp && org.erp_domain?.is_enabled === false) {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(410).json({
          success: false,
          message: "This ERP domain has been disabled by the administrator.",
          disabled: true,
          fallbackUrl: `https://${org.subdomain}.classgrid.in/login`,
        });
      }

      if (matchedMkt && org.custom_domain?.is_enabled === false) {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(410).json({
          success: false,
          message: "This domain has been disabled by the administrator.",
          disabled: true,
          fallbackUrl: `https://${org.subdomain}.classgrid.in`,
        });
      }
    }

    const site = await OrgWebsiteContent.findOne({
      $or: [{ org_slug: slug }, { organization_id: org._id }],
    })
      .select("institution hero storyImage gallery")
      .lean();

    const campusImageUrl =
      org.campus_photo_url ||
      site?.institution?.heroImage ||
      site?.hero?.fallbackImage ||
      site?.storyImage ||
      getFirstGalleryImage(site);

    const logoUrl = org.logo_url || site?.institution?.logoUrl || "";
    const tagline =
      org.branding?.tagline ||
      site?.institution?.tagline ||
      site?.hero?.subHeadline ||
      "Smart Campus. Better Learning.";

    // For login branding, use erp_domain (the domain students/faculty use).
    // Fall back to custom_domain for backwards compatibility.
    const erpDomain = org.erp_domain;
    const mktDomain = org.custom_domain;
    // The "active" ERP domain is used for login redirects and branding
    const activeErpDomain = (erpDomain?.status === "verified" || erpDomain?.status === "active") ? erpDomain?.domain : null;
    // The "active" marketing domain (for reference only)
    const activeMktDomain = (mktDomain?.status === "verified" || mktDomain?.status === "active") ? mktDomain?.domain : null;

    return res.json({
      success: true,
      branding: {
        authType: requestedType === "platform" ? "platform" : "institution",
        name: org.name,
        shortName: site?.institution?.shortName || org.name,
        tagline,
        logoUrl,
        faviconUrl: org.favicon_url || "",
        campusImageUrl,
        leftVariant: campusImageUrl ? "image" : "default",
        subdomain: org.subdomain,
        // customDomain = ERP domain (used for login redirect when classgrid URL is disabled)
        customDomain: activeErpDomain || activeMktDomain,
        allowClassgridUrl: erpDomain?.allow_classgrid_url !== false,
        isCustomDomainEnabled: erpDomain?.is_enabled !== false,
        // Also expose the marketing domain separately
        marketingDomain: activeMktDomain,
        siteTitle: org.site_title || "Classgrid ERP",
        socialLinks: org.social_links || {},
      },
    });
  } catch (error) {
    console.error("[Public] auth-branding error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load login branding.",
    });
  }
});

/**
 * POST /api/public/request-demo - Receive demo leads from marketing site
 */
router.post("/request-demo", async (req, res) => {
  try {
    // The Classgrid AI form sends name/workEmail/company/phone; the old ERP names are still read as a fallback.
    const body = req.body || {};
    const payload = {
      institutionName: normalizeText(body.company) || normalizeText(body.institutionName),
      orgType: normalizeText(body.orgType),
      adminName: normalizeText(body.name) || normalizeText(body.adminName),
      adminEmail: normalizeEmail(body.workEmail) || normalizeEmail(body.adminEmail),
      adminPhone: normalizePhone(body.phone) || normalizePhone(body.adminPhone),
      state: normalizeText(body.state),
      city: normalizeText(body.city),
      role: normalizeText(body.role),
      teamSize: normalizeText(body.teamSize),
      useCase: normalizeText(body.useCase),
      website: normalizeText(body.website),
      message: normalizeText(body.message),
      turnstileToken: normalizeText(body.turnstileToken),
    };

    // ERP-only fields (orgType, state, city) are no longer required.
    if (
      !payload.institutionName ||
      !payload.adminName ||
      !payload.adminEmail ||
      !payload.adminPhone
    ) {
      return res.status(400).json({ message: "Missing required fields for demo request." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.adminEmail)) {
      return res.status(400).json({ message: "Please enter a valid admin email address." });
    }

    if (!/^\+?\d{10,15}$/.test(payload.adminPhone)) {
      return res.status(400).json({ message: "Please enter a valid admin phone number." });
    }

    const turnstileResult = await verifyTurnstileToken(payload.turnstileToken, req);
    if (!turnstileResult.verified) {
      return res.status(400).json({
        message: "Security verification failed. Please retry the form submission.",
      });
    }

    const demoRequest = await DemoRequest.create({
      institutionName: payload.institutionName,
      orgType: payload.orgType,
      adminName: payload.adminName,
      adminEmail: payload.adminEmail,
      adminPhone: payload.adminPhone,
      state: payload.state,
      city: payload.city,
      role: payload.role,
      teamSize: payload.teamSize,
      useCase: payload.useCase,
      website: payload.website,
      message: payload.message,
      status: "new",
      lifecycleStage: "lead_created",
    });

    await trackOnboardingEvent({
      demoRequestId: demoRequest._id,
      eventType: "lead_created",
      stage: "lead_created",
      actorRole: "public",
      metadata: {
        institutionName: demoRequest.institutionName,
        orgType: demoRequest.orgType,
      },
    });

    await sendDemoLeadNotification({
      demoRequest,
      bookingUrl: process.env.DEMO_BOOKING_URL || process.env.NEXT_PUBLIC_DEMO_BOOKING_URL || "",
    });

    // Send Web Push to Super Admins
    await sendPushToRole("super_admin", {
      title: "New Demo Request",
      body: `${demoRequest.institutionName} requested a demo!`,
      url: `/superadmin/leads`
    }).catch(err => console.error("Web Push Error:", err));

    return res.status(201).json({
      success: true,
      id: demoRequest._id.toString(),
      requestId: demoRequest._id.toString(),
      message: "Demo request received successfully.",
    });
  } catch (error) {
    console.error("[Public] Demo request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit demo request. Please try again.",
    });
  }
});

/**
 * POST /api/public/request-demo/:id/meeting-booked
 * Used by marketing success flow when the institution confirms a booked slot.
 * Optional security: set DEMO_SCHEDULER_WEBHOOK_SECRET and send it as x-demo-scheduler-secret.
 */
router.post("/request-demo/:id/meeting-booked", async (req, res) => {
  try {
    const leadId = normalizeText(req.params?.id);
    if (!/^[a-f\d]{24}$/i.test(leadId)) {
      return res.status(400).json({ success: false, message: "Invalid demo request id." });
    }

    const expectedSecret = normalizeText(process.env.DEMO_SCHEDULER_WEBHOOK_SECRET);
    if (expectedSecret) {
      const schedulerHeader = req.headers["x-demo-scheduler-secret"];
      const receivedSecret = Array.isArray(schedulerHeader)
        ? normalizeText(schedulerHeader[0])
        : normalizeText(schedulerHeader);
      if (!receivedSecret || receivedSecret !== expectedSecret) {
        return res.status(401).json({ success: false, message: "Unauthorized scheduler callback." });
      }
    }

    const scheduledAtRaw = normalizeText(req.body?.scheduledAt);
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ success: false, message: "Valid scheduledAt is required." });
    }

    const provider = normalizeMeetingProvider(req.body?.provider);
    const timezone = normalizeText(req.body?.timezone) || "Asia/Kolkata";
    const meetingUrl = normalizeText(req.body?.meetingUrl);
    const meetingId = normalizeText(req.body?.meetingId);
    const notes = normalizeText(req.body?.notes);

    const lead = await DemoRequest.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Demo lead not found." });
    }

    lead.meetingStatus = "scheduled";
    lead.meetingProvider = provider;
    lead.meetingScheduledAt = scheduledAt;
    lead.meetingTimezone = timezone;
    lead.meetingUrl = meetingUrl;
    lead.meetingId = meetingId;
    lead.meetingNotes = notes;
    lead.meetingScheduledByUserId = null;
    lead.meetingScheduledBySource = "self_schedule";

    if (lead.status === "new") {
      lead.status = "contacted";
    }
    lead.lifecycleStage = "meeting_scheduled";

    await lead.save();
    await trackOnboardingEvent({
      demoRequestId: lead._id,
      eventType: "meeting_scheduled",
      stage: "meeting_scheduled",
      actorRole: "public",
      metadata: {
        provider,
        timezone,
      },
    });

    await sendDemoMeetingScheduledNotification({
      demoRequest: lead,
      meetingDetails: {
        provider,
        scheduledAt,
        timezone,
        meetingUrl,
        notes,
      },
      scheduledBy: "self_schedule",
    });

    return res.status(200).json({
      success: true,
      message: "Meeting details received and email notifications queued.",
      requestId: lead._id.toString(),
    });
  } catch (error) {
    console.error("[Public] meeting-booked error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save meeting details.",
    });
  }
});

/**
 * GET /api/public/ai-pricing
 * Live reset times and top-up values for the pricing page on classgrid.in, resolved the same way the app
 * resolves them for a chat.classgrid.in account. Only super admin settings, no user data.
 */
const AI_PRICING_CACHE_MS = 60 * 1000;
let aiPricingCache = null;

const positiveNumber = (value) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);

router.get("/ai-pricing", async (req, res) => {
  try {
    if (!aiPricingCache || aiPricingCache.expiresAt <= Date.now()) {
      const [globalConfig, chatOrg] = await Promise.all([
        GlobalAiConfig.findOne({ key: "singleton" }).lean(),
        Organization.findById(CHAT_PUBLIC_ORG_ID).select("ai_config").lean(),
      ]);
      const config = globalConfig || {};
      const org = chatOrg || null;
      const tokens = resolveResetPeriod("tokens", org, config, CHAT_PUBLIC_ORG_ID);
      const image = resolveResetPeriod("image", org, config, CHAT_PUBLIC_ORG_ID);
      const whatsapp = resolveResetPeriod("whatsapp", org, config, CHAT_PUBLIC_ORG_ID);

      aiPricingCache = {
        expiresAt: Date.now() + AI_PRICING_CACHE_MS,
        // Free limit amounts (tokens, images, WhatsApp, image token cost) stay private: only how often they reset
        data: {
          freeRefill: { value: tokens.value, unit: tokens.unit },
          imageRefill: { value: image.value, unit: image.unit },
          whatsappRefill: { value: whatsapp.value, unit: whatsapp.unit },
          creditsPerInr: positiveNumber(config.credits_per_inr),
          topupMinInr: TOPUP_MIN_INR,
          topupMaxInr: TOPUP_MAX_INR,
          creditValidityDays: 30,
          premiumUnlockInr: FABLE_UNLOCK_INR,
          updatedAt: new Date(config.updatedAt || Date.now()).toISOString(),
        },
      };
    }

    res.set("Cache-Control", "public, max-age=60");
    return res.json(aiPricingCache.data);
  } catch (error) {
    console.error("[Public] ai-pricing error:", error);
    return res.status(500).json({ success: false, message: "Failed to load AI pricing." });
  }
});

export default router;



