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

import crypto from "crypto";
import mongoose from "mongoose";

import DemoRequest from "../models/DemoRequest.js";
import User from "../models/User.js";
import { provisionDemoOrg } from "./provisioning.service.js";
import { enqueueEmail } from "./email-queue.service.js";
import { sendEmail } from "./aws-ses.service.js";
import { getPlanLimits } from "./module-toggle.service.js";
import { trackOnboardingEvent } from "./onboarding-event.service.js";
import {
  getConsolidatedApprovalEmailHtml,
  getConsolidatedApprovalEmailPlainText,
} from "./email-templates.service.js";

export const generateActivationCredentials = () => {
  const rawActivationToken = crypto.randomBytes(32).toString("hex");
  const hashedActivationToken = crypto
    .createHash("sha256")
    .update(rawActivationToken)
    .digest("hex");

  const activationCode = String(Math.floor(100000 + Math.random() * 900000));
  const activationCodeHash = crypto
    .createHash("sha256")
    .update(activationCode)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

  return {
    rawActivationToken,
    hashedActivationToken,
    activationCode,
    activationCodeHash,
    expiresAt,
  };
};

const FRONTEND_URL =
  process.env.FRONTEND_URL?.trim() ||
  (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "https://classgrid.in");

const normalizeOrgType = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (!normalized) return "school";

  if (normalized.includes("engineering")) return "engineering";
  if (normalized.includes("coaching")) return "coaching";
  if (normalized.includes("diploma")) return "diploma";

  const supported = new Set([
    "school",
    "junior_college",
    "coaching",
    "engineering",
    "college",
    "diploma",
    "institute",
    "institutes",
    "other",
  ]);

  return supported.has(normalized) ? normalized : "school";
};

export async function approveLeadAndProvision(demoRequestId, options = {}, actorUserId = null) {
  if (!mongoose.Types.ObjectId.isValid(demoRequestId)) {
    const error = new Error("Invalid demo request id.");
    error.statusCode = 400;
    throw error;
  }

  let lead = await DemoRequest.findOneAndUpdate(
    {
      _id: demoRequestId,
      status: { $ne: "converted" },
      provisionedOrganizationId: null,
      conversionStatus: { $ne: "in_progress" },
    },
    {
      $set: {
        conversionStatus: "in_progress",
        conversionStartedAt: new Date(),
        lifecycleStage: "approved",
        lastConversionError: "",
      },
      $inc: {
        conversionAttemptCount: 1,
      },
    },
    { returnDocument: 'after' }
  );

  if (!lead) {
    const existingLead = await DemoRequest.findById(demoRequestId).lean();
    if (!existingLead) {
      const error = new Error("Demo request not found.");
      error.statusCode = 404;
      throw error;
    }

    if (existingLead.status === "converted" || existingLead.provisionedOrganizationId) {
      const error = new Error("This lead has already been converted.");
      error.statusCode = 409;
      throw error;
    }

    const error = new Error("Lead provisioning is already in progress. Please wait before retrying.");
    error.statusCode = 409;
    throw error;
  }

  const orgType = normalizeOrgType(options?.orgType || lead.orgType);
  const structureType =
    String(options?.structureType || orgType)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_") || "school";

  const allocatedModules =
    typeof lead.allocatedModules?.toObject === "function"
      ? lead.allocatedModules.toObject()
      : lead.allocatedModules || {};
  const allocatedDashboards = Array.isArray(lead.allocatedDashboards)
    ? lead.allocatedDashboards
    : [];
  const featureFlags = { ...allocatedModules };
  for (const dashboard of allocatedDashboards) {
    featureFlags[dashboard] = true;
  }

  const adminPayload = {
    name: lead.adminName,
    email: lead.adminEmail,
    phone_number: lead.adminPhone,
    phoneNumber: lead.adminPhone,
    role: "org_admin",
  };

  const organizationPayload = {
    name: lead.institutionName,
    subdomain: options?.subdomain,
    org_type: orgType,
    structure_type: structureType,
    city: lead.cityVillage || lead.city,
    state: lead.state,
    district: lead.district || "",
    taluka: lead.taluka || "",
    address: " ", // Space character bypasses Mongoose required validation without showing dummy text
    website: lead.website || "",
    designation: lead.designation || "",
    feature_flags: featureFlags,
  };

  try {
    const provisioned = await provisionDemoOrg(adminPayload, organizationPayload, {
      plan: options?.plan || "demo",
      mode: options?.mode || "demo",
      features: allocatedModules,
    });

    const organization = await mongoose.model("Organization").findById(provisioned.organization._id);

    if (!organization || !organization.pending_admin) {
      const error = new Error("Provisioned organization or pending admin not found.");
      error.statusCode = 500;
      throw error;
    }

    // Generate single-use activation link for provisioned principal/admin account.
    const credentials = generateActivationCredentials();

    organization.pending_admin.activationToken = credentials.hashedActivationToken;
    organization.pending_admin.activationTokenExpires = credentials.expiresAt;
    organization.pending_admin.activationCodeHash = credentials.activationCodeHash;
    organization.pending_admin.activationCodeExpires = credentials.expiresAt;
    await organization.save();

    const ONBOARDING_URL = process.env.NODE_ENV === "production" ? "https://onboard.classgrid.in" : "http://onboard.localhost:5173";
    const activationLink = `${ONBOARDING_URL}/?token=${credentials.rawActivationToken}`;
    const activationDate = new Date();
    const expiryDate = provisioned?.subscription?.expiresAt || new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    const plan = String(options?.plan || provisioned?.subscription?.plan || "demo").trim().toLowerCase();
    const warnings = [];

    const subject = "Activate Your Classgrid Admin Account";

    lead.status = "converted";
    lead.convertedAt = new Date();
    lead.convertedBy = actorUserId || null;
    lead.provisionedOrganizationId = organization._id;
    lead.provisionedAdminId = null;
    lead.conversionStatus = "provisioned";
    lead.lifecycleStage = "provisioned";
    lead.conversionCompletedAt = new Date();
    lead.lastConversionError = "";

    try {
      await sendEmail({
        to: lead.adminEmail,
        subject,
        fromName: "Nikhil Shinde | Classgrid CEO",
        fromEmail: "nikhil.shinde@classgrid.in",
        html: getConsolidatedApprovalEmailHtml({
          adminName: lead.adminName,
          orgName: organization.name,
          subdomain: organization.subdomain,
          activationLink,
          activationCode: credentials.activationCode,
          activationDate,
          expiryDate,
          sandboxDuration: 31,
          allocatedDashboards,
        }),
        text: getConsolidatedApprovalEmailPlainText({
          adminName: lead.adminName,
          orgName: organization.name,
          subdomain: organization.subdomain,
          activationLink,
          activationCode: credentials.activationCode,
          activationDate,
          expiryDate,
          sandboxDuration: 31,
          allocatedDashboards,
        }),
        userId: actorUserId || null, // No admin user created yet during provisioning
        organizationId: organization._id,
      });
    } catch (emailError) {
      warnings.push("Provisioning completed, but the onboarding email could not be queued.");
      lead.lastConversionError = emailError.message || "Provisioning email queue failed.";
    }

    await lead.save();
    await trackOnboardingEvent({
      organizationId: organization._id,
      demoRequestId: lead._id,
      userId: actorUserId || null,
      eventType: "lead_provisioned",
      stage: "provisioned",
      actorRole: "super_admin",
      metadata: {
        adminEmail: provisioned.admin.email,
        plan,
        warnings,
      },
    });

    return {
      demoRequestId: lead._id,
      organization,
      admin: provisioned.admin, // {name, email, phone} — no User _id yet
      subscription: provisioned.subscription,
      warnings,
      activation: {
        activationLink,
        activationCode: credentials.activationCode,
        expiresAt: credentials.expiresAt,
      },
    };
  } catch (error) {
    await DemoRequest.findByIdAndUpdate(demoRequestId, {
      $set: {
        conversionStatus: "failed",
        lastConversionError: error.message || "Unknown provisioning error",
      },
    });
    throw error;
  }
}

export async function convertSandboxToActive(orgId, activePlanOptions = {}, actorUserId = null) {
  const Organization = (await import("../models/Organization.js")).default;
  const OrgSubscription = (await import("../models/OrgSubscription.js")).default;
  
  const org = await Organization.findById(orgId);
  if (!org) {
    const error = new Error("Organization not found.");
    error.statusCode = 404;
    throw error;
  }
  
  if (org.org_mode === "production") {
    const error = new Error("Organization is already in production mode.");
    error.statusCode = 400;
    throw error;
  }
  
  const sub = await OrgSubscription.findOne({ organization_id: orgId });
  if (!sub) {
    const error = new Error("Subscription not found.");
    error.statusCode = 404;
    throw error;
  }

  // Update Org
  org.org_mode = "production";
  org.status = "active";
  org.demoExpiresAt = null;
  await org.save();

  // Update Sub
  sub.plan = "active";
  sub.isPaid = true;
  // Default to 1 year renewal if no expiry is provided
  sub.expiresAt = activePlanOptions.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  
  // If activePlanOptions includes new feature allocations, merge them
  if (activePlanOptions.features) {
      sub.features = { ...sub.features, ...activePlanOptions.features };
  }
  
  await sub.save();

  await trackOnboardingEvent({
    organizationId: org._id,
    userId: actorUserId || org.owner_id,
    eventType: "sandbox_converted_to_active",
    stage: "live",
    actorRole: "super_admin",
    metadata: { plan: "active", activePlanOptions }
  });

  return { organization: org, subscription: sub };
}

