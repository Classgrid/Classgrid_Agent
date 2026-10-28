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
import mongoose from "mongoose";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import connectDB from "../../config/db.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import { getChatSb } from "../config/supabaseClient.js";
import { generateR2UploadUrl } from "../services/r2.service.js";
import { getAwsS3PresignedUploadUrl } from "../config/awsS3Client.js";
import redis from "../config/redis.js";
import { normalizeWhatsappNumber } from "../services/ai-feature-limits.js";

import { getProfileSchema } from "../utils/profile-schemas.js";
import { isSharedTestWhatsapp } from "../utils/chat-onboarding.js";
import { normalizeDomain, newVerificationToken, dnsInstructions, hasVerificationRecord } from "../services/user-domain.service.js";

const router = express.Router();

// =======================
// GET PROFILE SCHEMA
// =======================
router.get("/profile-schema", isAuthenticated, async (req, res) => {
  try {
    const role = req.user.role;
    const schema = getProfileSchema(role);
    res.json({ schema });
  } catch (error) {
    console.error("SCHEMA ERROR:", error.message);
    res.status(500).json({ message: "Server error getting schema" });
  }
});

// =======================
// GET AI CONTEXT
// =======================
router.get("/ai-context", isAuthenticated, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organization_id).select("name type").lean();
    res.json({
      success: true,
      userContext: {
        name: req.user.name,
        role: req.user.role,
        email: req.user.email,
        organizationName: org ? org.name : null,
        organizationType: org ? org.type : null,
      }
    });
  } catch (error) {
    console.error("AI CONTEXT ERROR:", error.message);
    res.status(500).json({ message: "Server error getting ai context" });
  }
});

const normalizePushNotifications = (pushNotifications) => {
  const p = pushNotifications || {};
  return {
    global: p.global ?? true,
    sidebarPanelEnabled: p.sidebarPanelEnabled ?? true,
  };
};

// =======================
// GET USER PROFILE
// =======================
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const cacheKey = `user:profile:v2:${req.user._id}`;
    let cached = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (e) {
      console.warn("Redis get failed for user profile, falling back to DB:", e.message);
    }
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const user = await User.findById(req.user._id)
      .populate("organization_id")
      .select("-password -verificationToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch from forum collection
    let realForumUsername = null;
    try {
      const db = mongoose.connection.db;
      if (db && user.email) {
        const forumRecord = await db.collection("forumusers").findOne({ email: user.email });
        if (forumRecord && forumRecord.username) {
          realForumUsername = forumRecord.username;
        }
      }
    } catch (e) {
      console.warn("Error fetching forum username:", e.message);
    }

    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        sidebar_name: user.sidebar_name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber || "",
        profilePicture: user.profilePicture || "",
        platformLogo: user.platformLogo || "",
        profileBanner: user.profileBanner || "",
        photoURL: user.profilePicture || "", // Alias for compatibility
        qualification: user.qualification || "",
        department: user.department || "",
        bio: user.bio || "",
        address: user.address || "",
        hobby: user.hobby || "",
        subjectsAssigned: user.subjectsAssigned || "",
        prn: user.prn || null,
        abc_id: user.abc_id || null,
        fatherName: user.fatherName || "",
        motherName: user.motherName || "",
        eligibilityNo: user.eligibilityNo || "",
        pattern: user.pattern || "",
        authProvider: user.authProvider,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        dob: user.dob || null,
        gender: user.gender || null,
        alternateEmail: user.alternateEmail || "",
        signature: user.signature || "",
        organization_id: user.organization_id ? {
          id: user.organization_id._id,
          name: user.organization_id.name,
          subdomain: user.organization_id.subdomain || "",
          logo_url: user.organization_id.logo_url,
          rollNumberLabel: user.organization_id.academic_config?.identifierLabel || user.organization_id.rollNumberLabel || "PRN",
          address: user.organization_id.address || "",
          website: user.organization_id.website || "",
          contactNumber: user.organization_id.contactNumber || "",
          affiliation: user.organization_id.affiliation || "",
          registration_number: user.organization_id.registration_number || "",
          org_type: user.organization_id.org_type || "",
          structure_type: user.organization_id.structure_type || "",
          state: user.organization_id.state || "",
          district: user.organization_id.district || "",
          city: user.organization_id.city || "",
          taluka: user.organization_id.taluka || "",
          academic_config: user.organization_id.academic_config || {},
        } : null,
        branch: user.branch || null,
        batch: user.batch || null,
        profile_completed: user.profile_completed,
        pushNotifications: normalizePushNotifications(user.pushNotifications),
        metadata: user.metadata || {},
        forumUsername: realForumUsername
      },
    };

    try {
      await redis.set(cacheKey, JSON.stringify(responseData), "EX", 1800);
    } catch (e) {
      console.warn("Redis set failed for user profile:", e.message);
    }
    res.json(responseData);
  } catch (error) {
    console.error("PROFILE ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// WHATSAPP NUMBER CHANGE (profile)
// =======================
// The number is stored twice: metadata.whatsappPhone (sign-up; "one number per account" and the chat lock)
// and metadata.whatsapp_number (profile; read by the AI). A verified change updates both, as "+<digits>".
const WA_CODE_TTL_SECONDS = 600;
const WA_RESEND_WAIT_MS = 60 * 1000;
const WA_MAX_WRONG_CODES = 5;

function whatsappVariants(digits) {
  return [`+${digits}`, digits, digits.slice(-10)];
}

// Another account already uses this number (in either field, any stored format)?
async function whatsappNumberTaken(digits, myId) {
  if (isSharedTestWhatsapp(digits)) return false; // the owner's test number may sit on several accounts
  const variants = whatsappVariants(digits);
  const other = await User.findOne({
    _id: { $ne: myId },
    $or: [{ "metadata.whatsappPhone": { $in: variants } }, { "metadata.whatsapp_number": { $in: variants } }],
  }).select("_id").lean();
  return !!other;
}

// =======================
// SEND WHATSAPP OTP
// =======================
router.post("/send-whatsapp-otp", isAuthenticated, async (req, res) => {
  try {
    const digits = normalizeWhatsappNumber(req.body.phoneNumber);
    if (digits.length < 11 || digits.length > 15) {
      return res.status(400).json({ message: "Please enter a valid WhatsApp number with country code." });
    }

    const meta = req.user.metadata || {};
    const current = [meta.whatsappPhone, meta.whatsapp_number].map(normalizeWhatsappNumber);
    if (current.includes(digits)) {
      return res.status(400).json({ message: "This is already your WhatsApp number." });
    }
    if (await whatsappNumberTaken(digits, req.user._id)) {
      return res.status(409).json({ message: "This WhatsApp number is already linked to another account." });
    }

    const key = `whatsapp_otp:${req.user._id}`;
    const pending = JSON.parse((await redis.get(key)) || "null");
    if (pending?.sentAt && Date.now() - pending.sentAt < WA_RESEND_WAIT_MS) {
      const retryAfter = Math.ceil((WA_RESEND_WAIT_MS - (Date.now() - pending.sentAt)) / 1000);
      return res.status(429).json({ message: `Please wait ${retryAfter} seconds before requesting a new code.`, retryAfter });
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Send OTP using Meta WhatsApp API
    if (!process.env.WHATSAPP_PHONE_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
      return res.status(500).json({ message: "WhatsApp credentials missing on server." });
    }
    const waRes = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: digits,
        type: "text",
        text: {
          preview_url: false,
          body: `*${otp}* is your Classgrid verification code. For your security, do not share this code.`
        }
      })
    });
    const data = await waRes.json();
    if (data.error) {
      console.error("Meta API Error:", data.error);
      return res.status(400).json({ message: "Failed to send WhatsApp message. Send 'Hi' to our WhatsApp number first, then check the number (with country code)." });
    }

    // Saved after a successful send (expires in 10 minutes)
    await redis.set(key, JSON.stringify({ otp, phoneNumber: `+${digits}`, sentAt: Date.now(), wrong: 0 }), "EX", WA_CODE_TTL_SECONDS);

    res.json({ message: "OTP sent successfully via WhatsApp" });
  } catch (error) {
    console.error("SEND WHATSAPP OTP ERROR:", error.message);
    res.status(500).json({ message: "Server error sending OTP" });
  }
});

// =======================
// VERIFY WHATSAPP OTP
// =======================
router.post("/verify-whatsapp-otp", isAuthenticated, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    const key = `whatsapp_otp:${req.user._id}`;
    const storedData = await redis.get(key);
    if (!storedData) return res.status(400).json({ message: "OTP expired or not requested" });

    const pending = JSON.parse(storedData);
    if (pending.otp !== String(otp).trim()) {
      const wrong = (pending.wrong || 0) + 1;
      if (wrong >= WA_MAX_WRONG_CODES) {
        await redis.del(key);
        return res.status(400).json({ message: "Too many wrong codes. Please request a new code." });
      }
      const ttl = await redis.ttl(key);
      await redis.set(key, JSON.stringify({ ...pending, wrong }), "EX", ttl > 0 ? ttl : 1);
      return res.status(400).json({ message: `Invalid OTP. ${WA_MAX_WRONG_CODES - wrong} tries left.` });
    }

    const phoneNumber = pending.phoneNumber;
    // Checked again here: someone else may have taken the number while the code was pending
    if (await whatsappNumberTaken(normalizeWhatsappNumber(phoneNumber), req.user._id)) {
      await redis.del(key);
      return res.status(409).json({ message: "This WhatsApp number is already linked to another account." });
    }

    // Valid OTP: save the number in both fields
    await User.findByIdAndUpdate(req.user._id, {
      $set: { "metadata.whatsapp_number": phoneNumber, "metadata.whatsappPhone": phoneNumber }
    });

    await redis.del(key);
    await redis.del(`user:profile:${req.user._id}`);
    await redis.del(`user:profile:v2:${req.user._id}`);

    res.json({ message: "WhatsApp number verified successfully", phoneNumber });
  } catch (error) {
    console.error("VERIFY WHATSAPP OTP ERROR:", error.message);
    res.status(500).json({ message: "Server error verifying OTP" });
  }
});

// =======================
// UPDATE USER PROFILE
// =======================
router.put("/update", isAuthenticated, attachInstitutionProfile({ required: false }), async (req, res) => {
  try {
    const { name, sidebar_name, phoneNumber, profilePicture, platformLogo, profileBanner, qualification, department, bio, prn, abc_id, branch, batch, address, hobby, subjectsAssigned, dob, gender, fatherName, motherName, eligibilityNo, pattern, alternateEmail, signature, admission_type, category, metadata } = req.body;

    // Safety check: Don't allow empty name
    if (name !== undefined && (name === null || name.trim() === "")) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (sidebar_name !== undefined) updateData.sidebar_name = sidebar_name.trim();
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) {
      // Lightweight server-side photo validation (no native modules)
      if (profilePicture && profilePicture.startsWith('data:image/')) {
        // Extract base64 and check rough size
        const base64Data = profilePicture.split(',')[1] || '';
        const sizeBytes = Math.ceil(base64Data.length * 3 / 4);
        if (sizeBytes > 600 * 1024) {
          return res.status(400).json({ message: 'Profile photo must be under 600KB' });
        }
        if (sizeBytes < 500) {
          return res.status(400).json({ message: 'Profile photo is too small or corrupted' });
        }
      }
      updateData.profilePicture = profilePicture;
    }
    
    // Add platformLogo (Super Admin only branding)
    if (platformLogo !== undefined) updateData.platformLogo = platformLogo;

    if (profileBanner !== undefined) updateData.profileBanner = profileBanner;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (bio !== undefined) updateData.bio = (bio || '').substring(0, 300);
    if (address !== undefined) updateData.address = (address || '').substring(0, 200);
    if (hobby !== undefined) updateData.hobby = (hobby || '').substring(0, 200);
    if (subjectsAssigned !== undefined) updateData.subjectsAssigned = (subjectsAssigned || '').substring(0, 500);

    // New Profile Fields
    if (dob !== undefined) updateData.dob = dob;
    if (gender !== undefined) updateData.gender = gender;
    if (fatherName !== undefined) updateData.fatherName = (fatherName || '').trim();
    if (motherName !== undefined) updateData.motherName = (motherName || '').trim();
    if (eligibilityNo !== undefined) updateData.eligibilityNo = (eligibilityNo || '').trim();
    if (pattern !== undefined) updateData.pattern = (pattern || '').trim();
    if (alternateEmail !== undefined) updateData.alternateEmail = (alternateEmail || '').trim().toLowerCase();
    if (signature !== undefined) updateData.signature = signature;
    if (admission_type !== undefined) updateData.admission_type = admission_type;
    if (category !== undefined) updateData.category = category;



    // Push Notifications Toggle
    if (req.body.pushNotifications !== undefined && typeof req.body.pushNotifications.global === 'boolean') {
      updateData["pushNotifications.global"] = req.body.pushNotifications.global;
    }

    if (req.body.metadata !== undefined) {
      // SECURITY: Strictly prevent changing organization type via profile updates
      if (req.body.metadata["organization.type"] !== undefined) {
        delete req.body.metadata["organization.type"];
      }
      // The WhatsApp number only changes through a verified code (/send-whatsapp-otp + /verify-whatsapp-otp)
      delete req.body.metadata["whatsapp_number"];
      delete req.body.metadata["whatsappPhone"];
      // SAFE MERGE: Prevent wiping out backend-only metadata (like integrations, whatsapp credentials)
      for (const key of Object.keys(req.body.metadata)) {
        updateData[`metadata.${key}`] = req.body.metadata[key];
      }
    }

    // Fetch the current user to enforce field locking
    const currentUser = await User.findById(req.user._id).select("prn abc_id branch batch department organization_id profile_completed").lean();

    // ── 🎓 Org Academic Config — server-side validation ──────────────
    let orgAcademicConfig = null;
    if (currentUser?.organization_id) {
        const orgDoc = await (await import("../models/Organization.js")).default
            .findById(currentUser.organization_id)
            .select("academic_config")
            .lean();
        orgAcademicConfig = orgDoc?.academic_config || null;
    }
    const profileOrgType = req.institutionProfile?.admissionProfile?.baseOrgType || null;
    const identifierLabel = req.institutionProfile?.terminology?.identifier || orgAcademicConfig?.identifierLabel || "PRN";
    const usesPrimaryIdentifier = ["engineering", "diploma"].includes(profileOrgType);

    // 🎓 Academic Field Locking Logic
    // Apply .trim() BEFORE any truthy checks
    const trimmedDept = department !== undefined && department !== null ? String(department).trim() : undefined;
    const trimmedBranch = branch !== undefined && branch !== null ? String(branch).trim() : undefined;
    const trimmedBatch = batch !== undefined && batch !== null ? String(batch).trim() : undefined;
    const trimmedPrn = prn !== undefined && prn !== null ? String(prn).trim() : undefined;
    const trimmedAbcId = abc_id !== undefined && abc_id !== null ? String(abc_id).trim() : undefined;

    if (trimmedDept !== undefined) {
      if (trimmedDept === "") {
        // Empty is okay — just don't save a blank value, skip this field
        // (only reject if user already has a dept and tries to blank it out)
      } else {
        if (currentUser.department && currentUser.department.trim() !== "") {
          if (trimmedDept !== currentUser.department.trim()) return res.status(400).json({ message: "Department is locked and cannot be changed." });
        } else {
          updateData.department = trimmedDept;
        }
      }
    }

    if (trimmedBranch !== undefined) {
      if (trimmedBranch === "") {
        // Empty is okay — skip, don't overwrite
      } else {
      
      let finalBranch = trimmedBranch;
      // ── Validate branch against org config (Case Insensitive) ──
      if (orgAcademicConfig?.branches?.length > 0) {
        const matched = orgAcademicConfig.branches.find(b => b.toLowerCase() === trimmedBranch.toLowerCase());
        if (!matched) {
          return res.status(400).json({ message: `Invalid branch. Allowed: ${orgAcademicConfig.branches.join(', ')}` });
        }
        finalBranch = matched; // Normalize to exact org config case
      }
      
      if (currentUser.branch && currentUser.branch.trim() !== "") {
        if (finalBranch.toLowerCase() !== currentUser.branch.trim().toLowerCase()) {
          return res.status(400).json({ message: "Branch is locked and cannot be changed." });
        }
      } else {
        updateData.branch = finalBranch;
      }
      }
    }

    if (trimmedBatch !== undefined) {
      if (trimmedBatch === "") {
        // Empty is okay — skip, don't overwrite
      } else {
      
      let finalBatch = trimmedBatch;
      // ── Validate batch against org config (Case Insensitive) ──
      if (orgAcademicConfig?.batches?.length > 0) {
        const matched = orgAcademicConfig.batches.find(b => b.toLowerCase() === trimmedBatch.toLowerCase());
        if (!matched) {
          return res.status(400).json({ message: `Invalid batch. Allowed: ${orgAcademicConfig.batches.join(', ')}` });
        }
        finalBatch = matched; // Normalize to exact org config case
      }
      
      if (currentUser.batch && currentUser.batch.trim() !== "") {
        if (finalBatch.toLowerCase() !== currentUser.batch.trim().toLowerCase()) {
          return res.status(400).json({ message: "Batch is locked and cannot be changed." });
        }
      } else {
        updateData.batch = finalBatch;
      }
      }
    }

    // PRN logic
    if (trimmedPrn !== undefined) {
      if (trimmedPrn === "") {
        // Only enforce PRN non-empty strictness for students where PRN is required
        const prnRequired = req.user.role === 'student' && usesPrimaryIdentifier && orgAcademicConfig?.prnRequired !== false;
        
        if (currentUser.prn && orgAcademicConfig?.prnLocked) {
          return res.status(400).json({ message: `${identifierLabel} has already been set and is locked by your organization.` });
        }
        
        if (prnRequired) {
          return res.status(400).json({ message: `${identifierLabel} cannot be empty or whitespace only.` });
        } else {
          // If allowed to be empty, we unset it from the DB
          updateData.$unset = updateData.$unset || {};
          updateData.$unset.prn = 1;
        }
      } else {
        if (!/^[a-zA-Z0-9]{1,15}$/.test(trimmedPrn)) {
        console.warn(`[ProfileUpdate] User ${req.user._id} submitted invalid PRN format: ${trimmedPrn}`);
        return res.status(400).json({ message: `${identifierLabel} must be alphanumeric and up to 15 characters.` });
      }

      // ── PRN Lock: strictly respect org academic_config.prnLocked ──
      if (currentUser && currentUser.prn) {
        if (orgAcademicConfig?.prnLocked) {
          return res.status(400).json({ message: `${identifierLabel} has already been set and is locked by your organization.` });
        }
      }
      
      // Check uniqueness within the same organization
      if (currentUser?.organization_id) {
        const existing = await User.findOne({
          organization_id: currentUser.organization_id,
          prn: trimmedPrn,
        }).lean();
        if (existing) {
          return res.status(409).json({ message: `This ${identifierLabel} is already registered in your organization. Please contact your faculty or organization admin.` });
        }
      }
      }
      updateData.prn = trimmedPrn;
    }

    if (trimmedAbcId !== undefined) {
      if (!usesPrimaryIdentifier) {
        return res.status(400).json({ message: "ABC ID is only supported for higher-education profiles." });
      }

      if (trimmedAbcId === "") {
        updateData.$unset = updateData.$unset || {};
        updateData.$unset.abc_id = 1;
      } else {
        if (!/^[0-9]{12}$/.test(trimmedAbcId)) {
          return res.status(400).json({ message: "ABC ID must be a 12-digit number." });
        }

        if (currentUser.abc_id && currentUser.abc_id.trim() !== "" && currentUser.abc_id !== trimmedAbcId) {
          return res.status(400).json({ message: "ABC ID is already set and cannot be changed from profile update." });
        }

        updateData.abc_id = trimmedAbcId;
      }
    }

    // Determine if profile should be marked as completed
    const nextPrn = updateData.prn !== undefined ? updateData.prn : currentUser.prn;
    const nextBranch = updateData.branch !== undefined ? updateData.branch : currentUser.branch;
    const nextBatch = updateData.batch !== undefined ? updateData.batch : currentUser.batch;
    const nextDept = updateData.department !== undefined ? updateData.department : currentUser.department;
    
    // Always recalculate securely. Don't trust the existing boolean flag blindly.
    if (req.user.role === 'student') {
        const isCompleted = !!(
            nextPrn && nextPrn.trim() !== "" &&
            nextBranch && nextBranch.trim() !== "" &&
            nextBatch && nextBatch.trim() !== "" &&
            nextDept && nextDept.trim() !== ""
        );
        updateData.profile_completed = isCompleted;

        // 🛡️ THE AUTO-MATCH ENGINE (Backend Confirmation)
        // If the student is on the waitlist, we check if the Org Admin pre-uploaded their data via Excel
        if (isCompleted && currentUser.verification_status === 'pending' && nextPrn) {
            // Find a pre-seeded shell account by the Admin in the same org matching this PRN
            const preSeededUser = await User.findOne({
                organization_id: currentUser.organization_id,
                prn: nextPrn,
                // Ensure it's not their own record
                _id: { $ne: currentUser._id }
            }).lean();

            if (preSeededUser) {
                // If the PRN exists, check if Name & Academics Match Exactly
                const nameMatches = preSeededUser.name.trim().toLowerCase() === (updateData.name || currentUser.name).trim().toLowerCase();
                const branchMatches = (preSeededUser.branch || "").trim().toLowerCase() === nextBranch.trim().toLowerCase();

                if (nameMatches && branchMatches) {
                    // EXACT MATCH: Bypass the waitlist! Instant Onboarding.
                    updateData.verification_status = 'verified';
                    
                    // Cleanup: Delete the admin's shell account so there are no duplicates
                    await User.findByIdAndDelete(preSeededUser._id);
                    console.log(`[Auto-Match Success]: Student ${nextPrn} instantly verified and merged.`);
                }
            }
        }
    } else {
        updateData.profile_completed = true; // Non-students instantly complete
    }

    // Use findByIdAndUpdate
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { returnDocument: "after", runValidators: true } // Return updated doc, validate
    ).select("-password -verificationToken");

    if (user.password) {
      user.password = undefined; // Do not send password back
    }

    try {
      await redis.del(`user:profile:${req.user._id}`);
      await redis.del(`user:profile:v2:${req.user._id}`);
      
      const { getIO } = await import("../services/socket.service.js");
      const io = getIO();
      if (io) {
        io.to(`user:${req.user._id}`).emit("user_profile_updated");
      }
    } catch (e) {
      console.warn("Redis del or socket emit failed for user profile:", e.message);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sidebar_name: user.sidebar_name || "",
        phoneNumber: user.phoneNumber || "",
        profilePicture: user.profilePicture || "",
        platformLogo: user.platformLogo || "",
        qualification: user.qualification || "",
        department: user.department || "",
        bio: user.bio || "",
        prn: user.prn || null,
        branch: user.branch || null,
        batch: user.batch || null,
        dob: user.dob || null,
        fatherName: user.fatherName || "",
        motherName: user.motherName || "",
        eligibilityNo: user.eligibilityNo || "",
        pattern: user.pattern || "",
        gender: user.gender || null,
        alternateEmail: user.alternateEmail || "",
        signature: user.signature || "",
        profile_completed: user.profile_completed,
        authProvider: user.authProvider,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        pushNotifications: normalizePushNotifications(user.pushNotifications),
        metadata: user.metadata || {}
      }
    });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error.message, error);
    res.status(500).json({ message: "Server error updating profile: " + error.message, error: error.toString() });
  }
});

// =======================
// GET R2 UPLOAD URL
// =======================
router.post("/upload-url", isAuthenticated, async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ message: "Filename and file type are required" });
    }

    // Ensure the filename is unique to prevent overwriting
    const uniqueFileName = `${req.user._id}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const { uploadUrl, publicUrl } = await generateR2UploadUrl(uniqueFileName, fileType);

    res.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error("GET UPLOAD URL ERROR:", error);
    res.status(500).json({ message: "Failed to generate upload URL" });
  }
});

// =======================
// GET AWS S3 UPLOAD URL (For Branding CDN)
// =======================
router.post("/upload-aws-url", isAuthenticated, async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ message: "Filename and file type are required" });
    }

    // Ensure the filename is unique to prevent overwriting (saved under org branding structure)
    let orgFolderName = req.user.organization_id ? req.user.organization_id.toString() : req.user._id.toString();
    
    if (req.user.organization_id) {
      const Organization = (await import("../models/Organization.js")).default;
      const org = await Organization.findById(req.user.organization_id).select("subdomain shortName name");
      if (org) {
        const rawName = org.subdomain || org.shortName || org.name || orgFolderName;
        // Clean the name to only allow alphanumeric and hyphens, and make lowercase
        orgFolderName = rawName.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
      }
    }

    // Include timestamp in the key so each upload produces a unique CloudFront URL,
    // which avoids CDN caching stale images (e.g., old favicon served after re-upload).
    const baseName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[^.]+$/, "");
    const ext = fileName.match(/\.[^.]+$/)?.[0] || ".png";
    const uniqueFileName = `${orgFolderName}/branding/${baseName}-${Date.now()}${ext}`;

    const { uploadUrl, publicUrl } = await getAwsS3PresignedUploadUrl(fileName, fileType, 3600, uniqueFileName);

    res.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error("GET AWS S3 UPLOAD URL ERROR:", error);
    res.status(500).json({ message: "Failed to generate AWS upload URL" });
  }
});

// =======================
// VERIFY YOUR DOMAIN (one per user, verify only — nothing is hosted)
// =======================
const domainState = (vd) => {
  if (!vd?.domain) return { domain: null, verified: false };
  return {
    domain: vd.domain,
    verified: !!vd.verified,
    verifiedAt: vd.verifiedAt || null,
    dns: vd.verified ? null : dnsInstructions(vd.domain, vd.token),
    // The record that proved it, shown with a green tick on the verified card
    record: vd.verified && vd.token ? dnsInstructions(vd.domain, vd.token) : null,
  };
};

router.get("/domain", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("verifiedDomain").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(domainState(user.verifiedDomain));
  } catch (error) {
    console.error("GET DOMAIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Start verifying a domain: gives the TXT record to add. Replaces a domain that is not verified yet.
router.post("/domain", isAuthenticated, async (req, res) => {
  try {
    const domain = normalizeDomain(req.body?.domain);
    if (!domain) return res.status(400).json({ message: "Enter a valid domain, like example.com" });
    const user = await User.findById(req.user._id).select("verifiedDomain");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.verifiedDomain?.verified) {
      return res.status(409).json({ message: `You already verified ${user.verifiedDomain.domain}. Remove it first to verify a different domain.` });
    }
    const takenBy = await User.findOne({ _id: { $ne: user._id }, "verifiedDomain.domain": domain, "verifiedDomain.verified": true }).select("_id").lean();
    if (takenBy) return res.status(409).json({ message: "This domain is already verified by another account." });
    user.verifiedDomain = { domain, token: newVerificationToken(), verified: false, verifiedAt: null };
    await user.save();
    res.json(domainState(user.verifiedDomain));
  } catch (error) {
    console.error("ADD DOMAIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Check the TXT record now
router.post("/domain/verify", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("verifiedDomain");
    if (!user) return res.status(404).json({ message: "User not found" });
    const vd = user.verifiedDomain;
    if (!vd?.domain || !vd.token) return res.status(400).json({ message: "Add a domain first." });
    if (vd.verified) return res.json(domainState(vd));
    const takenBy = await User.findOne({ _id: { $ne: user._id }, "verifiedDomain.domain": vd.domain, "verifiedDomain.verified": true }).select("_id").lean();
    if (takenBy) return res.status(409).json({ message: "This domain is already verified by another account." });
    let found = false;
    try {
      found = await hasVerificationRecord(vd.domain, vd.token);
    } catch (err) {
      console.error("DOMAIN DNS LOOKUP ERROR:", err.code || err.message);
      return res.status(502).json({ message: "Could not check DNS right now. Please try again in a minute." });
    }
    if (!found) {
      return res.status(422).json({ message: "We couldn't find the TXT record yet. DNS changes can take a few minutes (sometimes up to an hour) to show up.", ...domainState(vd) });
    }
    user.verifiedDomain.verified = true;
    user.verifiedDomain.verifiedAt = new Date();
    await user.save();
    res.json(domainState(user.verifiedDomain));
  } catch (error) {
    console.error("VERIFY DOMAIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/domain", isAuthenticated, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { verifiedDomain: { domain: null, token: null, verified: false, verifiedAt: null } } });
    res.json({ domain: null, verified: false });
  } catch (error) {
    console.error("REMOVE DOMAIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// GET EMAIL PREFERENCES
// =======================
router.get("/email-preferences", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("emailNotifications privacySettings").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Return with safe defaults for users who predate this feature
    const defaults = {
      digestMode: "instant",
      global: true,
      announcements: true,
      notes: true,
      quizzes: true,
      joinApproval: true,
      emailOnPost: true,
    };

    res.json({
      emailNotifications: { ...defaults, ...(user.emailNotifications || {}) },
      privacySettings: { hideEmail: false, hideHobbies: false, hideBio: false, ...(user.privacySettings || {}) },
    });
  } catch (error) {
    console.error("GET EMAIL PREFS ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// UPDATE EMAIL PREFERENCES
// =======================
router.put("/email-preferences", isAuthenticated, async (req, res) => {
  try {
    const booleanKeys = ["global", "announcements", "notes", "quizzes", "joinApproval", "emailOnPost"];
    const allowedDigestModes = ["instant", "daily", "weekly"];
    const updates = {};

    // Accept known boolean keys
    for (const key of booleanKeys) {
      if (typeof req.body[key] === "boolean") {
        updates[`emailNotifications.${key}`] = req.body[key];
      }
    }

    // Accept digestMode enum (strict validation — never trust frontend)
    if (typeof req.body.digestMode === "string" && allowedDigestModes.includes(req.body.digestMode)) {
      updates["emailNotifications.digestMode"] = req.body.digestMode;
    }

    if (req.body.privacySettings) {
      if (typeof req.body.privacySettings.hideEmail === "boolean") {
        updates["privacySettings.hideEmail"] = req.body.privacySettings.hideEmail;
      }
      if (typeof req.body.privacySettings.hideHobbies === "boolean") {
        updates["privacySettings.hideHobbies"] = req.body.privacySettings.hideHobbies;
      }
      if (typeof req.body.privacySettings.hideBio === "boolean") {
        updates["privacySettings.hideBio"] = req.body.privacySettings.hideBio;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid preferences provided" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: "after" }
    ).select("emailNotifications privacySettings");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "Preferences updated",
      emailNotifications: user.emailNotifications,
      privacySettings: user.privacySettings,
    });
  } catch (error) {
    console.error("UPDATE EMAIL PREFS ERROR:", error.message);
    res.status(500).json({ message: "Server error updating preferences" });
  }
});

// =======================
// SAVE FCM TOKEN
// =======================
router.post("/fcm-token", isAuthenticated, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    // Store unique device tokens so users can receive pushes on multiple devices
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { fcmTokens: token }
    });

    res.json({ message: "FCM token registered successfully" });
  } catch (error) {
    console.error("FCM TOKEN REGISTRATION ERROR:", error.message);
    res.status(500).json({ message: "Server error registering token" });
  }
});

// =======================
// CREATE CUSTOM DIVISION (BYPASS RLS)
// =======================
router.post("/divisions", isAuthenticated, async (req, res) => {
  try {
    const { standard, year, semester, section, name, org_type,
            course, branch, class_teacher_id, assistant_teacher_id, subjects,
            sem_start_date, sem_end_date, sem2_start_date, sem2_end_date,
            academic_year_start, academic_year_end } = req.body;

    const resolvedOrgType = (org_type || 'COLLEGE').toUpperCase();
    
    // Use the authenticated user's org — no mismatch possible
    const org_id = req.user.organization_id?.toString();
    if (!org_id) return res.status(400).json({ message: "User does not belong to any organization." });

    // ── VALIDATION: Academic dates are COMPULSORY ──
    if (!academic_year_start || !academic_year_end) {
      return res.status(400).json({ message: "Academic year start and end dates are mandatory." });
    }
    if (!sem_start_date || !sem_end_date) {
      return res.status(400).json({ message: "Semester start and end dates are mandatory." });
    }
    if (resolvedOrgType === 'SCHOOL' && (!sem2_start_date || !sem2_end_date)) {
      return res.status(400).json({ message: "Semester 2 start and end dates are mandatory for schools." });
    }
    if (!class_teacher_id) {
      return res.status(400).json({ message: "Class teacher must be assigned." });
    }
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ message: "At least one subject is required." });
    }

    // ── 1:1 Faculty enforcement — check if teacher already assigned to another division ──
    const { data: existingTeacher } = await getChatSb()
      .from('divisions')
      .select('id, name')
      .eq('org_id', org_id)
      .eq('class_teacher_id', class_teacher_id)
      .maybeSingle();

    if (existingTeacher) {
      return res.status(409).json({ message: `This faculty is already class teacher of "${existingTeacher.name}". One faculty can only be class teacher of one division.` });
    }

    // Build division name
    let cleanSection = section ? section.trim().toUpperCase() : null;
    let finalName = name ? name.trim().toUpperCase() : '';

    if (resolvedOrgType === 'SCHOOL') {
      if (!standard || !cleanSection) return res.status(400).json({ message: "Standard and Section are required for schools." });
      finalName = `${standard} ${cleanSection}`;
    } else {
      if (!year || !semester || !cleanSection) return res.status(400).json({ message: "Year, Semester, and Section are required for colleges." });
      finalName = `${year} ${branch || ''} Sem ${semester} ${cleanSection}`.trim();
    }

    const payload = {
      org_id,
      type: resolvedOrgType.toLowerCase(),
      name: finalName,
      division_name: cleanSection,
      standard: standard || null,
      year: year || null,
      semester: semester ? parseInt(semester) : null,
      course: course || null,
      branch: branch || null,
      class_teacher_id,
      assistant_teacher_id: assistant_teacher_id || null,
      subjects: subjects || [],
      sem_start_date,
      sem_end_date,
      sem2_start_date: sem2_start_date || null,
      sem2_end_date: sem2_end_date || null,
      academic_year_start,
      academic_year_end,
    };

    const { data: newDiv, error } = await getChatSb()
      .from("divisions")
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[Create Division SB Error]:", error);
      if (error.code === '23505') return res.status(409).json({ message: "This exact division already exists." });
      return res.status(500).json({ message: `Database error: ${error.message || JSON.stringify(error)}` });
    }

    res.json(newDiv);
  } catch (error) {
    console.error("CREATE DIVISION ERROR:", error.message);
    res.status(500).json({ message: "Server error creating division." });
  }
});

// ======================================================
// GET /api/user/my-teaching-roles
// Returns teacher's complete role map (class teacher, subject teacher, assistant)
// ======================================================
router.get("/my-teaching-roles", isAuthenticated, async (req, res) => {
  try {
    if (!['faculty', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: "Only faculty can access this." });
    }

    const userId = req.user._id.toString();
    const orgId = req.user.organization_id?.toString();
    if (!orgId) return res.status(400).json({ message: "No organization assigned." });

    const sb = getChatSb();

    // 1. Class Teacher — divisions where this user is class_teacher_id
    const { data: classTeacherDivs } = await sb
      .from('divisions')
      .select('*')
      .eq('org_id', orgId)
      .eq('class_teacher_id', userId);

    // 2. Assistant Teacher — divisions where this user is assistant_teacher_id
    const { data: assistantDivs } = await sb
      .from('divisions')
      .select('*')
      .eq('org_id', orgId)
      .eq('assistant_teacher_id', userId);

    // 3. Subject Teacher — classrooms created by this teacher (MongoDB)
    const Classroom = (await import('../models/Classroom.js')).default;
    const subjectClassrooms = await Classroom.find({
      teacher: req.user._id,
      organization_id: req.user.organization_id,
    }).select('name subject_name division division_id year branch semester standard course_type subject_id coverImage classCode students').lean();

    // Enrich subject classrooms with student count
    const enriched = subjectClassrooms.map(c => ({
      ...c,
      student_count: c.students?.length || 0,
    }));

    res.json({
      classTeacher: classTeacherDivs || [],
      assistantTeacher: assistantDivs || [],
      subjectTeacher: enriched,
    });
  } catch (err) {
    console.error("[My Teaching Roles Error]:", err);
    res.status(500).json({ message: "Failed to load teaching roles." });
  }
});

// AI Context
router.get("/ai-context", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("name email role organization tenant_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      organization: user.organization || null,
      tenant_id: user.tenant_id || null
    });
  } catch (error) {
    console.error("AI Context error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
