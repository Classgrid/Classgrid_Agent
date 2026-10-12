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

import { getChatSb, studentNotesClient } from "../config/supabaseClient.js";
import { sendPushToMultiple } from "../services/firebase.service.js";
import ScheduledNotification from "../models/ScheduledNotification.js";
import FeatureFlag from "../models/FeatureFlag.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import DemoRequest from "../models/DemoRequest.js";
import mongoose from "mongoose";
import { approveLeadAndProvision as approveLeadAndProvisionService } from "../services/lead-conversion.service.js";
import { trackOnboardingEvent } from "../services/onboarding-event.service.js";
import { sendDemoMeetingScheduledNotification } from "../services/notification-email.service.js";
import { getAppRolesForTarget, normalizeScheduledTarget } from "../utils/notification-targeting.js";

const sb = getChatSb();
const TEACHING_ROLES = ["teacher", "faculty", "hod", "principal", "vice_principal"];
const ADMIN_ROLES = [
    "org_admin",
    "super_admin",
    "library_manager",
    "hod",
    "principal",
    "vice_principal",
    "exam_controller",
    "fee_manager",
    "admission_head",
    "tpo_officer",
    "coordinator",
];

async function getLegacyNotesStorageUsage(orgId) {
    let totalStorageBytes = 0;
    let fileCount = 0;
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: files, error: storageError } = await studentNotesClient.storage
            .from("notes-files")
            .list(`student-notes/${orgId}`, { limit, offset });

        if (storageError) {
            console.error("[SuperAdmin] notes storage usage error:", storageError.message);
            break;
        }

        if (!files || files.length === 0) {
            hasMore = false;
            continue;
        }

        files.forEach((file) => {
            const size = Number(file?.metadata?.size || 0);
            if (size > 0) {
                totalStorageBytes += size;
                fileCount += 1;
            }
        });

        if (files.length < limit) {
            hasMore = false;
        } else {
            offset += limit;
        }
    }

    const storageUsedGB = Number((totalStorageBytes / (1024 * 1024 * 1024)).toFixed(4));
    return { totalStorageBytes, fileCount, storageUsedGB };
}

// ══════════════════════════════════════════════════════════════
//  1. GLOBAL BROADCAST — Push to ALL users across ALL orgs
//  POST /api/super-admin/broadcast-global
// ══════════════════════════════════════════════════════════════
export const broadcastGlobal = async (req, res) => {
    try {
        const { title, body, message, deepLink = "", type = "announcement", target = "global" } = req.body;
        const notificationBody = body || message;
        const normalizedTarget = normalizeScheduledTarget(target);

        if (!title || !notificationBody) {
            return res.status(400).json({ success: false, message: "title and body are required" });
        }

        let query = sb.from("device_tokens").select("fcm_token");

        const appRoles = getAppRolesForTarget(normalizedTarget);
        if (normalizedTarget === "active_orgs") {
            const activeOrgs = await Organization.find({ status: "active" }).select("_id").lean();
            const orgIds = activeOrgs.map((org) => org._id.toString());
            if (orgIds.length === 0) {
                return res.json({ success: true, message: "No active organizations found", sent: 0 });
            }
            query = query.in("org_id", orgIds);
        } else if (appRoles.length > 0) {
            query = appRoles.length === 1
                ? query.eq("app_role", appRoles[0])
                : query.in("app_role", appRoles);
        }
        // "global" = no filter, sends to everyone


        const { data: tokens, error } = await query;
        if (error) throw error;

        if (!tokens || tokens.length === 0) {
            return res.json({ success: true, message: "No devices registered", sent: 0 });
        }

        const fcmTokens = tokens.map(t => t.fcm_token);

        // Send in batches of 500 (FCM limit)
        let totalSent = 0;
        let totalFailed = 0;
        const batchSize = 500;

        for (let i = 0; i < fcmTokens.length; i += batchSize) {
            const batch = fcmTokens.slice(i, i + batchSize);
            const result = await sendPushToMultiple(batch, title, notificationBody, { deepLink, type });
            totalSent += result.success;
            totalFailed += result.failure;

            // Clean invalid tokens
            if (result.invalidTokens.length > 0) {
                await sb.from("device_tokens").delete().in("fcm_token", result.invalidTokens);
            }
        }

        res.json({
            success: true,
            message: `Global broadcast sent to ${normalizedTarget}`,
            totalDevices: fcmTokens.length,
            sent: totalSent,
            failed: totalFailed
        });
    } catch (err) {
        console.error("[SuperAdmin] Global broadcast error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ══════════════════════════════════════════════════════════════
//  2. EMAIL ALL ORG ADMINS — System-wide email blast
//  POST /api/super-admin/email-org-admins
// ══════════════════════════════════════════════════════════════
export const emailOrgAdmins = async (req, res) => {
    try {
        const { subject, htmlBody, textBody } = req.body;

        if (!subject || (!htmlBody && !textBody)) {
            return res.status(400).json({ success: false, message: "subject and body (html or text) are required" });
        }

        // Fetch all org_admin users
        const orgAdmins = await User.find({ role: "org_admin", status: "active" })
            .select("email name organization_id")
            .lean();

        if (orgAdmins.length === 0) {
            return res.json({ success: true, message: "No active org admins found", queued: 0 });
        }

        // Queue emails using the email-queue service
        const { queueEmailBatch } = await import("../services/email-queue.service.js");

        const emailJobs = orgAdmins.map(admin => ({
            to: admin.email,
            subject,
            html: htmlBody || `<p>${textBody}</p>`,
            text: textBody || "",
            type: "super_admin_broadcast"
        }));

        await queueEmailBatch(emailJobs);

        res.json({
            success: true,
            message: `Emails queued for ${orgAdmins.length} org admins`,
            queued: orgAdmins.length
        });
    } catch (err) {
        console.error("[SuperAdmin] Email org admins error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ══════════════════════════════════════════════════════════════
//  3. SCHEDULED NOTIFICATIONS — Festival Auto-Scheduler CRUD
// ══════════════════════════════════════════════════════════════

// CREATE a scheduled notification
export const createScheduledNotification = async (req, res) => {
    try {
        const {
            title,
            body,
            message,
            target,
            audience,
            targetOrgId,
            scheduledAt,
            scheduledFor,
            isRecurring,
            category,
            deepLink,
            sendEmail
        } = req.body;
        const notificationBody = body || message;
        const notificationTarget = normalizeScheduledTarget(target || audience || "global");
        const scheduledDate = new Date(scheduledAt || scheduledFor);

        if (!title || !notificationBody || Number.isNaN(scheduledDate.getTime())) {
            return res.status(400).json({ success: false, message: "title, body/message, and scheduledAt/scheduledFor are required" });
        }

        if (notificationTarget === "specific_org" && !targetOrgId) {
            return res.status(400).json({ success: false, message: "targetOrgId is required for specific_org notifications" });
        }

        const notification = await ScheduledNotification.create({
            title,
            body: notificationBody,
            target: notificationTarget,
            targetOrgId: notificationTarget === "specific_org" ? targetOrgId : null,
            scheduledAt: scheduledDate,
            isRecurring: Boolean(isRecurring),
            category: category || "announcement",
            deepLink: deepLink || "",
            sendEmail: Boolean(sendEmail),
            createdBy: req.user._id
        });

        res.json({ success: true, message: "Notification scheduled", notification });
    } catch (err) {
        console.error("[SuperAdmin] Schedule notification error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// LIST all scheduled notifications
export const listScheduledNotifications = async (req, res) => {
    try {
        const { status, category } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;

        const notifications = await ScheduledNotification.find(filter)
            .sort({ scheduledAt: 1 })
            .populate("createdBy", "name email")
            .lean();

        const normalized = notifications.map((notification) => ({
            ...notification,
            message: notification.body,
            audience: notification.target,
            scheduledFor: notification.scheduledAt,
        }));

        res.json({ success: true, notifications: normalized });
    } catch (err) {
        console.error("[SuperAdmin] List scheduled error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// CANCEL a scheduled notification
export const cancelScheduledNotification = async (req, res) => {
    try {
        const notification = await ScheduledNotification.findByIdAndUpdate(
            req.params.id,
            { status: "cancelled" },
            { returnDocument: 'after' }
        );
        if (!notification) return res.status(404).json({ success: false, message: "Not found" });

        res.json({ success: true, message: "Notification cancelled", notification });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ══════════════════════════════════════════════════════════════
//  4. FEATURE FLAGS — Kill Switch CRUD
// ══════════════════════════════════════════════════════════════

// LIST all feature flags
export const listFeatureFlags = async (req, res) => {
    try {
        const flags = await FeatureFlag.find().sort({ key: 1 }).lean();
        res.json({ success: true, flags });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// CREATE or UPDATE a feature flag
export const upsertFeatureFlag = async (req, res) => {
    try {
        const { key, name, description, isEnabled, disabledForOrgs, enabledForOrgs, allowedOrgTypes, isPremium } = req.body;

        if (!key || !name) {
            return res.status(400).json({ success: false, message: "key and name are required" });
        }

        const flag = await FeatureFlag.findOneAndUpdate(
            { key },
            {
                key,
                name,
                description: description || "",
                isEnabled: isEnabled !== undefined ? isEnabled : true,
                disabledForOrgs: disabledForOrgs || [],
                enabledForOrgs: enabledForOrgs || [],
                allowedOrgTypes: allowedOrgTypes || [],
                isPremium: isPremium || false,
                lastModifiedBy: req.user._id
            },
            { upsert: true, returnDocument: 'after' }
        );

        const io = req.app.get("io");
        if (io) {
            io.emit("platform_feature_flags_updated");
        }

        res.json({ success: true, message: `Feature flag "${key}" updated`, flag });
    } catch (err) {
        console.error("[SuperAdmin] Feature flag error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// TOGGLE a feature flag ON/OFF instantly
export const toggleFeatureFlag = async (req, res) => {
    try {
        const flag = await FeatureFlag.findOne({ key: req.params.key });
        if (!flag) return res.status(404).json({ success: false, message: "Feature flag not found" });

        flag.isEnabled = !flag.isEnabled;
        flag.lastModifiedBy = req.user._id;
        await flag.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("platform_feature_flags_updated");
        }

        res.json({
            success: true,
            message: `"${flag.name}" is now ${flag.isEnabled ? "ON ✅" : "OFF ❌"}`,
            flag
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ══════════════════════════════════════════════════════════════
//  5. HEALTH CHECK — Is everything alive?
// ══════════════════════════════════════════════════════════════
export const healthCheck = async (req, res) => {
    const os = await import("os");
    const checkDiskSpace = (await import("check-disk-space")).default;
    
    // Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePct = (usedMem / totalMem) * 100;

    // Disk
    let disk = { total: 0, free: 0, used: 0, usagePct: 0 };
    try {
        const diskPath = os.platform() === 'win32' ? 'C:' : '/';
        const diskSpace = await checkDiskSpace(diskPath);
        disk.total = diskSpace.size;
        disk.free = diskSpace.free;
        disk.used = disk.total - disk.free;
        disk.usagePct = (disk.used / disk.total) * 100;
    } catch (e) {
        console.error("Disk check failed:", e);
    }

    const warnings = [];
    if (memUsagePct > 95) warnings.push("CRITICAL: RAM Usage > 95%");
    else if (memUsagePct > 85) warnings.push("WARNING: RAM Usage > 85%");
    
    if (disk.usagePct > 95) warnings.push("CRITICAL: Disk Space > 95%");
    else if (disk.usagePct > 85) warnings.push("WARNING: Disk Space > 85%");

    // Server Identity
    const networkInterfaces = os.networkInterfaces();
    const privateIp = Object.values(networkInterfaces)
        .flat()
        .find(iface => iface && !iface.internal && iface.family === 'IPv4')?.address || 'N/A';
    const cpuInfo = os.cpus()[0] || {};

    // Fetch AWS EC2 Instance Metadata (IMDSv2)
    let awsMeta = {};
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout

        // Step 1: Get IMDSv2 token
        const tokenRes = await fetch("http://169.254.169.254/latest/api/token", {
            method: "PUT",
            headers: { "X-aws-ec2-metadata-token-ttl-seconds": "21600" },
            signal: controller.signal
        });
        const token = await tokenRes.text();
        clearTimeout(timeout);

        // Step 2: Fetch metadata fields in parallel
        const metaHeaders = { "X-aws-ec2-metadata-token": token };
        const fetchMeta = async (path) => {
            try {
                const r = await fetch(`http://169.254.169.254/latest/meta-data/${path}`, {
                    headers: metaHeaders,
                    signal: AbortSignal.timeout(2000)
                });
                return r.ok ? await r.text() : null;
            } catch { return null; }
        };

        const [instanceType, publicIp, instanceId, az, amiId] = await Promise.all([
            fetchMeta("instance-type"),
            fetchMeta("public-ipv4"),
            fetchMeta("instance-id"),
            fetchMeta("placement/availability-zone"),
            fetchMeta("ami-id"),
        ]);

        awsMeta = {
            provider: "AWS",
            instanceType: instanceType || "Unknown",
            publicIp: publicIp || "N/A",
            instanceId: instanceId || "N/A",
            availabilityZone: az || "N/A",
            region: az ? az.slice(0, -1) : "N/A", // e.g. ap-south-1a → ap-south-1
            amiId: amiId || "N/A",
        };
    } catch {
        // Not running on AWS or metadata service unavailable
        awsMeta = { provider: "Non-AWS / Local" };
    }

    const health = {
        timestamp: new Date().toISOString(),
        uptime: os.uptime(),
        memoryUsage: process.memoryUsage(),
        server: {
            hostname: os.hostname(),
            privateIp,
            platform: os.platform(),
            osType: os.type(),
            osRelease: os.release(),
            arch: os.arch(),
            nodeVersion: process.version,
            cpuModel: cpuInfo.model || 'Unknown',
            cpuSpeed: cpuInfo.speed || 0, // MHz
            cpuCores: os.cpus().length,
            env: process.env.NODE_ENV || 'development',
            ...awsMeta, // Merge AWS metadata into server object
        },
        osMetrics: {
            ram: { total: totalMem, free: freeMem, used: usedMem, usagePct: memUsagePct },
            disk,
            cpuCount: os.cpus().length,
            loadAvg: os.loadavg()
        },
        warnings,
        services: {}
    };

    // Check MongoDB
    try {
        const startMongo = performance.now();
        // A simple query to ensure the db responds, not just the connection state
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            const ms = Math.round(performance.now() - startMongo);
            health.services.mongodb = { status: "UP", ping: `${ms}ms` };
        } else {
            health.services.mongodb = { status: "DOWN", error: "Not connected" };
        }
    } catch (err) {
        health.services.mongodb = { status: "DOWN", error: err.message || "Connection check failed" };
    }

    // Check Supabase
    try {
        const startSupa = performance.now();
        const { error } = await sb.from("device_tokens").select("id").limit(1);
        const ms = Math.round(performance.now() - startSupa);
        health.services.supabase = error
            ? { status: "DOWN", error: error.message }
            : { status: "UP", ping: `${ms}ms` };
    } catch (err) {
        health.services.supabase = { status: "DOWN", error: err.message };
    }

    // Check Redis
    try {
        if (process.env.REDIS_URL) {
            const startRedis = performance.now();
            const IORedis = (await import("ioredis")).default;
            const redis = new IORedis(process.env.REDIS_URL, {
                maxRetriesPerRequest: 1,
                connectTimeout: 5000
            });
            redis.on('error', () => {}); // Prevent unhandled event crash
            await redis.ping();
            const ms = Math.round(performance.now() - startRedis);
            health.services.redis = { status: "UP", ping: `${ms}ms` };
            redis.disconnect();
        } else {
            health.services.redis = { status: "NOT_CONFIGURED" };
        }
    } catch (err) {
        health.services.redis = { status: "DOWN", error: err.message };
    }
    
    // Check R2
    try {
        if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
            const startR2 = performance.now();
            const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
            const s3Client = new S3Client({
                region: "auto",
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID,
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
                },
                maxAttempts: 2
            });
            const bucketName = process.env.R2_BUCKET_NAME || 'classgrid-storage';
            await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 }));
            const ms = Math.round(performance.now() - startR2);
            health.services.r2 = { status: "UP", ping: `${ms}ms` };
        } else {
            health.services.r2 = { status: "NOT_CONFIGURED" };
        }
    } catch (err) {
        health.services.r2 = { status: "DOWN", error: err.message };
    }

    // Check Agora (just verify env vars exist)
    health.services.agora = {
        status: process.env.AGORA_APP_ID ? "CONFIGURED" : "NOT_CONFIGURED",
        appId: process.env.AGORA_APP_ID ? `${process.env.AGORA_APP_ID.slice(0, 8)}...` : "MISSING"
    };

    // Overall status
    const allUp = Object.values(health.services).every(s => s.status === "UP" || s.status === "CONFIGURED" || s.status === "NOT_CONFIGURED");
    health.overall = (allUp && warnings.length === 0) ? "HEALTHY" : "DEGRADED";

    res.json({ success: true, health });
};

// ══════════════════════════════════════════════════════════════
//  6. IMPERSONATION — Login As any user (God Mode)
// ══════════════════════════════════════════════════════════════
export const impersonateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const superAdminId = req.user._id;

        const targetUser = await User.findById(userId)
            .select("name email role organization_id status profilePicture org_type")
            .lean();

        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Log the impersonation for audit trail
        const ImpersonationLog = (await import("../models/ImpersonationLog.js")).default;
        await ImpersonationLog.create({
            superAdmin: superAdminId,
            targetUser: userId,
            reason: req.body.reason || "Support investigation",
            ipAddress: req.ip
        });

        // Generate a temporary JWT for the target user
        const jwt = (await import("jsonwebtoken")).default;
        const token = jwt.sign(
            {
                id: targetUser._id,
                role: targetUser.role,
                organizationId: targetUser.organization_id,
                impersonatedBy: superAdminId, // Mark this token as impersonated!
                org_type: targetUser.org_type
            },
            process.env.JWT_SECRET || "dev_secret",
            { expiresIn: "1h" } // Only valid for 1 hour
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 3600000, // 1 hour
        });

        res.json({
            success: true,
            message: `Impersonating ${targetUser.name} (${targetUser.email})`,
            token,
            user: targetUser,
            expiresIn: "1 hour"
        });
    } catch (err) {
        console.error("[SuperAdmin] Impersonate error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ══════════════════════════════════════════════════════════════
//  7. ERROR LOG VIEWER — See last N server errors from browser
// ══════════════════════════════════════════════════════════════

export const captureError = async (error, context = "") => {
    try {
        const SystemLog = (await import("../models/SystemLog.js")).default;
        await SystemLog.create({
            level: "error",
            message: error.message || String(error),
            stack: error.stack || "",
            context: context,
            metadata: {
                timestamp: new Date()
            }
        });
    } catch (err) {
        console.error("Failed to write to SystemLog:", err);
    }
};

export const getErrorLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const levelFilter = req.query.level; // optional: ?level=error
        const search = req.query.search;
        const category = req.query.category; // optional: API, Socket, Cron, Email Queue
        const traceId = req.query.traceId;

        // Query the raw Winston 'systemlogs' collection directly
        const db = mongoose.connection.db;
        const collection = db.collection("systemlogs");

        const query = {};
        
        if (levelFilter && levelFilter !== "all" && levelFilter !== "All") {
            query.level = levelFilter.toLowerCase();
        }
        
        if (traceId) {
            query.$or = [
                { "meta.metadata.traceId": traceId },
                { "metadata.traceId": traceId }
            ];
        }

        if (category && category !== "all" && category !== "All") {
            const cat = category.toLowerCase();
            if (cat === "errors" || cat === "error") {
                query.level = "error";
            } else if (cat === "warnings" || cat === "warn") {
                query.level = "warn";
            } else if (cat === "api") {
                query.$or = [{ "meta.url": { $exists: true } }, { "meta.metadata.url": { $exists: true } }, { "metadata.url": { $exists: true } }];
            } else if (cat === "cron") {
                query.$or = [{ "context": { $regex: /cron/i } }, { "meta.context": { $regex: /cron/i } }];
            } else if (cat === "socket") {
                query.$or = [{ "context": { $regex: /socket/i } }, { "meta.context": { $regex: /socket/i } }];
            } else if (cat === "email queue") {
                query.$or = [{ "context": { $regex: /email/i } }, { "meta.context": { $regex: /email/i } }];
            } else if (cat === "ai agent") {
                query.$or = [
                    { "context": { $regex: /llm/i } }, 
                    { "meta.context": { $regex: /llm/i } }, 
                    { "message": { $regex: /\[llm/i } }, 
                    { "meta.message": { $regex: /\[llm/i } }
                ];
            }
        }

        if (search) {
            query.$or = [
                { message: { $regex: search, $options: "i" } },
                { "meta.message": { $regex: search, $options: "i" } },
                { "meta.metadata.url": { $regex: search, $options: "i" } },
                { "meta.metadata.traceId": { $regex: search, $options: "i" } },
                { "metadata.traceId": { $regex: search, $options: "i" } }
            ];
        }

        const [logs, totalErrors] = await Promise.all([
            collection.find(query).sort({ timestamp: -1 }).limit(limit).toArray(),
            collection.countDocuments({ level: "error" }),
        ]);

        // Also get email stats if model exists
        let emailStats = { queued: 0, sent: 0, failed: 0 };
        try {
            const EmailJob = (await import("../models/EmailJob.js")).default;
            const [queued, sent, failed] = await Promise.all([
                EmailJob.countDocuments({ status: "pending" }),
                EmailJob.countDocuments({ status: "sent" }),
                EmailJob.countDocuments({ status: "failed" }),
            ]);
            emailStats = { queued, sent, failed };
        } catch { /* EmailJob model may not exist */ }

        // Winston stores: { timestamp, level, message, meta: { metadata: { method, url, status, ... } } }
        // OR format.metadata() stores: { timestamp, level, message, metadata: { metadata: { ... } } }
        const mappedLogs = logs.map(e => ({
            _id: e._id,
            id: e._id,
            timestamp: e.timestamp || e.createdAt,
            level: e.level || "info",
            message: e.message || e.meta?.message || "",
            stack: e.meta?.stack || e.stack || "",
            context: e.meta?.context || e.context || "",
            metadata: {
                ...(e.meta?.metadata || e.meta || {}),
                ...(e.metadata?.metadata || (Object.keys(e.metadata || {}).length > 0 ? e.metadata : {}))
            }
        }));

        res.json({
            success: true,
            total: totalErrors,
            showing: mappedLogs.length,
            errors: mappedLogs,
            logs: mappedLogs,
            emailStats
        });
    } catch (err) {
        console.error("[SuperAdmin] getErrorLogs error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ══════════════════════════════════════════════════════════════
//  7b. ORG DETAIL VIEW — with Usage Metrics
// ══════════════════════════════════════════════════════════════
export const getOrganizationDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const Organization = (await import("../models/Organization.js")).default;
        const User = (await import("../models/User.js")).default;
        const Classroom = (await import("../models/Classroom.js")).default;
        const EmailJob = (await import("../models/EmailJob.js")).default;
        const OrganizationUsage = (await import("../models/OrganizationUsage.js")).default;
        const OrgSubscription = (await import("../models/OrgSubscription.js")).default;

        const org = await Organization.findById(id).lean();
        if (!org) {
            return res.status(404).json({ success: false, message: "Organization not found" });
        }

        const orgUsers = await User.find({ organization_id: id }).select("_id role status").lean();
        const userIds = orgUsers.map((user) => user._id);
        const activeOrgUsers = orgUsers.filter((user) => user.status === "active");
        const countActiveRole = (roles) => activeOrgUsers.filter((user) => roles.includes(user.role)).length;
        const emailFilter = userIds.length > 0
            ? {
                status: "sent",
                $or: [
                    { organizationId: id },
                    { userId: { $in: userIds } }
                ]
            }
            : { organizationId: id, status: "sent" };

        const totalStudents = countActiveRole(["student"]);
        const totalAdmins = countActiveRole(ADMIN_ROLES);
        const totalTeachers = countActiveRole(TEACHING_ROLES);
        const activeUsers = activeOrgUsers.length;

        const [totalClasses, emailsSent, subscription, storageUsage] = await Promise.all([
            Classroom.countDocuments({ organization_id: id }),
            EmailJob.countDocuments(emailFilter),
            OrgSubscription.findOne({ organization_id: id }).lean(),
            getLegacyNotesStorageUsage(id)
        ]);

        const owner = org.owner_id 
            ? await User.findById(org.owner_id).select("name email phone phoneNumber").lean() 
            : null;

        const usage = await OrganizationUsage.findOneAndUpdate(
            { orgId: id },
            {
                $set: {
                    totalStudents,
                    totalAdmins,
                    totalTeachers,
                    storageUsedGB: storageUsage.storageUsedGB,
                    emailsSent,
                    activeUsers,
                    lastUpdated: new Date()
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        const adminsListRaw = await User.find({ organization_id: id, role: { $in: ADMIN_ROLES } })
            .select("name email role department phoneNumber status")
            .lean();

        const adminsList = adminsListRaw.map(admin => ({
            ...admin,
            designation: (admin.role === "org_admin" || admin._id.toString() === org.owner_id?.toString()) 
                ? org.designation 
                : undefined
        }));

        res.json({
            success: true,
            data: {
                ...org,
                owner,
                adminsList,
                usage: {
                    ...usage.toObject(),
                    totalClasses,
                    storageBytes: storageUsage.totalStorageBytes,
                    storageFileCount: storageUsage.fileCount,
                    storageCoverage: "partial",
                },
                subscription: subscription || { plan: "demo" }
            }
        });
    } catch (err) {
        console.error("[SuperAdmin] Org detail error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ══════════════════════════════════════════════════════════════
//  8. ORG SUBSCRIPTION MANAGEMENT — Demo to Active Paid
// ══════════════════════════════════════════════════════════════
export const updateOrgSubscription = async (req, res) => {
    try {
        const { orgId } = req.params;
        const {
            plan, expiresAt, features,
            // ── Billing rates (set by Super Admin per org) ──
            basePricePerMonth, pricePerGB, pricePerEmail, pricePerSms
        } = req.body;

        const OrgSubscription = (await import("../models/OrgSubscription.js")).default;
        const normalizedPlan = String(plan || "active").trim().toLowerCase();
        if (!["demo", "active"].includes(normalizedPlan)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan. Allowed values are "demo" and "active".',
            });
        }
        const existingSubscription = await OrgSubscription.findOne({ organization_id: orgId }).lean();

        const nextFeatures =
            features && typeof features === "object" && !Array.isArray(features)
                ? features
                : (existingSubscription?.features || undefined);

        const nextMetadata = {
            ...(existingSubscription?.metadata || {}),
        };

        // Build billing rates update — only overwrite fields that were actually sent
        const existingBilling = existingSubscription?.billing || {};
        const nextBilling = {
            basePricePerMonth: basePricePerMonth !== undefined ? Number(basePricePerMonth) : (existingBilling.basePricePerMonth ?? 0),
            pricePerGB:        pricePerGB        !== undefined ? Number(pricePerGB)        : (existingBilling.pricePerGB        ?? 0),
            pricePerEmail:     pricePerEmail     !== undefined ? Number(pricePerEmail)     : (existingBilling.pricePerEmail     ?? 0),
            pricePerSms:       pricePerSms       !== undefined ? Number(pricePerSms)       : (existingBilling.pricePerSms       ?? 0),
        };

        const subscription = await OrgSubscription.findOneAndUpdate(
            { organization_id: orgId },
            {
                organization_id: orgId,
                plan: normalizedPlan,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                ...(nextFeatures ? { features: nextFeatures } : {}),
                metadata: nextMetadata,
                billing: nextBilling,
            },
            { upsert: true, returnDocument: 'after' }
        );

        const io = req.app.get("io");
        if (io) {
            io.emit("superadmin:org_updated", { orgId });
        }

        res.json({
            success: true,
            message: `Org ${orgId} subscription updated to "${normalizedPlan}"`,
            subscription
        });
    } catch (err) {
        console.error("[SuperAdmin] Subscription error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getOrgSubscription = async (req, res) => {
    try {
        const OrgSubscription = (await import("../models/OrgSubscription.js")).default;
        const subscription = await OrgSubscription.findOne({ organization_id: req.params.orgId }).lean();

        res.json({ success: true, subscription: subscription || { plan: "demo" } });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =================================================
// 9. LEAD APPROVAL + PROVISIONING
//    POST /api/super-admin/leads/:id/approve
// =================================================
export const approveLeadAndProvision = async (req, res) => {
    try {
        const { id } = req.params;
        const options = req.body || {};

        const result = await approveLeadAndProvisionService(id, options, req.user?._id || null);

        return res.status(201).json({
            success: true,
            demoRequestId: result.demoRequestId,
            warnings: result.warnings || [],
            activation: result.activation || null,
            organization: result.organization,
            admin: {
                _id: result.admin?._id,
                name: result.admin?.name,
                email: result.admin?.email,
                role: result.admin?.role,
                organization_id: result.admin?.organization_id,
            },
        });
    } catch (err) {
        const status = err.statusCode || 500;
        console.error("[SuperAdmin] approveLeadAndProvision error:", err.message);
        return res.status(status).json({
            success: false,
            message: err.message || "Lead conversion failed",
        });
    }
};

// =================================================
// 10. LIST DEMO LEADS
//     GET /api/super-admin/leads
// =================================================
export const getDemoLeads = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const leads = await DemoRequest.find(filter)
            .populate("assignedTo", "name email profilePicture avatarUrl picture photoUrl")
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            total: leads.length,
            leads,
        });
    } catch (err) {
        console.error("[SuperAdmin] getDemoLeads error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const assignLead = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await DemoRequest.findById(id);
        if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

        lead.assignedTo = req.user._id;
        lead.assignedAt = new Date();
        if (lead.status === "new" || lead.status === "pending") {
            lead.status = "contacted";
        }
        await lead.save();

        try {
            const { sendDemoLeadAssignedNotification } = await import("../services/notification-email.service.js");
            await sendDemoLeadAssignedNotification({
                demoRequest: lead,
                assignee: req.user,
                assigner: req.user,
                notifySuperAdmin: true
            });
        } catch (e) {
            console.error("Failed to send assignment notification:", e.message);
        }

        res.json({ success: true, message: "Lead assigned to you" });
    } catch (err) {
        console.error("[SuperAdmin] assignLead error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const createDemoLead = async (req, res) => {
    try {
        const { institutionName, adminName, adminEmail, adminPhone, city, orgType } = req.body;
        
        if (!institutionName || !adminName || !adminEmail) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const DemoRequest = (await import("../models/DemoRequest.js")).default;
        
        const lead = await DemoRequest.create({
            institutionName,
            adminName,
            adminEmail,
            adminPhone: adminPhone || "",
            city: city || "",
            state: "N/A",
            orgType: orgType || "school",
            status: "new",
            lifecycleStage: "lead_created",
            meetingStatus: "pending",
            conversionStatus: "not_started"
        });

        res.status(201).json({ success: true, message: "Demo lead created", lead });
    } catch (err) {
        console.error("[SuperAdmin] createDemoLead error:", err.message);
        res.status(500).json({ success: false, message: "Failed to create lead" });
    }
};

// ══════════════════════════════════════════════════════════════════════════
// 19. PLATFORM BILLING VIA RAZORPAY
// ══════════════════════════════════════════════════════════════════════════

export const createPlatformRazorpayOrder = async (req, res) => {
    try {
        const { orgId } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount." });
        }

        const razorpayService = (await import("../services/razorpay.service.js")).default;
        
        const receipt = `platform_${orgId.substring(0, 8)}_${Date.now()}`;
        const order = await razorpayService.createPlatformOrder(amount, receipt);

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error("[SuperAdmin] createPlatformRazorpayOrder error:", err);
        res.status(500).json({ success: false, message: "Failed to create payment order" });
    }
};

export const verifyPlatformRazorpayPayment = async (req, res) => {
    try {
        const { orgId } = req.params;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const razorpayService = (await import("../services/razorpay.service.js")).default;
        
        const isValid = razorpayService.verifyPlatformSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        
        if (!isValid) {
            return res.status(400).json({ success: false, message: "Payment verification failed — invalid signature." });
        }

        const OrgSubscription = (await import("../models/OrgSubscription.js")).default;
        
        // Mark subscription as active and paid, extend expiry by 30 days
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);

        const subscription = await OrgSubscription.findOneAndUpdate(
            { organization_id: orgId },
            {
                plan: "active",
                status: "active",
                isPaid: true,
                expiresAt: newExpiry,
                razorpay_subscription_id: razorpay_order_id, // we use order id here to track the last transaction
            },
            { returnDocument: 'after' }
        );

        res.json({
            success: true,
            message: "Payment successful! Subscription activated.",
            subscription
        });
    } catch (err) {
        console.error("[SuperAdmin] verifyPlatformRazorpayPayment error:", err);
        res.status(500).json({ success: false, message: "Payment verification failed" });
    }
};

const normalizeMeetingProvider = (value = "") => {
    const cleaned = String(value || "").trim().toLowerCase();
    if (!cleaned) return "other";
    if (cleaned.includes("google")) return "google";
    if (cleaned.includes("zoom")) return "zoom";
    return "other";
};

// =================================================
// 11. SCHEDULE DEMO MEETING FROM SUPER ADMIN
//     POST /api/super-admin/leads/:id/schedule-meeting
// =================================================
export const scheduleLeadMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid lead id" });
        }

        const scheduledAtRaw = req.body?.scheduledAt;
        const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
        if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
            return res.status(400).json({ success: false, message: "Valid scheduledAt is required" });
        }

        const meetingUrl = String(req.body?.meetingUrl || "").trim();
        if (!meetingUrl) {
            return res.status(400).json({ success: false, message: "meetingUrl is required" });
        }

        const timezone = String(req.body?.timezone || "Asia/Kolkata").trim() || "Asia/Kolkata";
        const provider = normalizeMeetingProvider(req.body?.provider);
        const meetingId = String(req.body?.meetingId || "").trim();
        const notes = String(req.body?.notes || "").trim();

        const lead = await DemoRequest.findById(id).populate("assignedTo", "name email profilePicture");
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        const isReschedule = true;
        // Super Admin updating a meeting is ALWAYS considered a reschedule
        // because leads always originate from the marketing site with a requested meeting.
        lead.meetingStatus = "rescheduled";
        lead.assignedTo = null;
        lead.assignedAt = null;
        // If they just clicked 'save' on the same date, don't change meetingStatus and definitely do NOT unassign them!
        
        lead.meetingProvider = provider;
        lead.meetingScheduledAt = scheduledAt;
        lead.meetingTimezone = timezone;
        lead.meetingUrl = meetingUrl;
        lead.meetingId = meetingId;
        lead.meetingNotes = notes;
        lead.meetingScheduledByUserId = req.user?._id || null;
        lead.meetingScheduledBySource = "super_admin";

        if (lead.status === "new") {
            lead.status = "contacted";
        }
        lead.lifecycleStage = "meeting_scheduled";

        await lead.save();
        await trackOnboardingEvent({
            demoRequestId: lead._id,
            userId: req.user?._id || null,
            eventType: "meeting_scheduled",
            stage: "meeting_scheduled",
            actorRole: "super_admin",
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
            scheduledBy: "super_admin",
            isReschedule,
            repName: lead.assignedTo?.name || "Classgrid Team",
            repEmail: lead.assignedTo?.email || "",
            repAvatar: lead.assignedTo?.profilePicture || "",
        });

        return res.json({
            success: true,
            message: "Meeting scheduled and emails queued",
            lead,
        });
    } catch (err) {
        console.error("[SuperAdmin] scheduleLeadMeeting error:", err.message);
        return res.status(500).json({ success: false, message: "Failed to schedule meeting" });
    }
};

export const deleteDemoLead = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await DemoRequest.findByIdAndDelete(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        return res.json({ success: true, message: "Demo lead deleted successfully" });
    } catch (err) {
        console.error("[SuperAdmin] deleteDemoLead error:", err.message);
        return res.status(500).json({ success: false, message: "Failed to delete demo lead" });
    }
};

export const requestVettingApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await DemoRequest.findById(id).populate("assignedTo", "name email");
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        
        // Notify Nikhil
        const { sendVettingApprovalRequestNotification } = await import("../services/notification-email.service.js");
        await sendVettingApprovalRequestNotification({
            demoRequest: lead,
            requester: req.user
        });
        
        return res.json({ success: true, message: "Approval request sent" });
    } catch (err) {
        console.error("[SuperAdmin] requestVettingApproval error:", err.message);
        return res.status(500).json({ success: false, message: "Failed to send approval request" });
    }
};

// ══════════════════════════════════════════════════════════════
//  14. SERVER MAINTENANCE — Clean Logs
// ══════════════════════════════════════════════════════════════
export const cleanLogs = async (req, res) => {
    try {
        const { exec } = await import("child_process");
        const util = await import("util");
        const execPromise = util.promisify(exec);

        const command = "pm2 flush && sudo journalctl --vacuum-size=100M && npm cache clean --force && sudo apt-get clean";
        
        const { stdout, stderr } = await execPromise(command);
        
        // Log the action
        const SystemLog = (await import("../models/SystemLog.js")).default;
        await SystemLog.create({
            level: "warn",
            message: "Server logs cleaned by Super Admin",
            context: "Maintenance",
            metadata: {
                timestamp: new Date(),
                superAdminId: req.user._id,
                output: stdout.substring(0, 500)
            }
        });

        res.json({
            success: true,
            message: "Logs cleaned successfully",
            output: stdout,
            errors: stderr
        });
    } catch (err) {
        console.error("[SuperAdmin] cleanLogs error:", err.message);
        res.status(500).json({ 
            success: false, 
            message: "Failed to clean logs",
            error: err.message
        });
    }
};

// ══════════════════════════════════════════════════════════════
//  15. REGENERATE LEAD ACTIVATION
// ══════════════════════════════════════════════════════════════
export const regenerateLeadActivation = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await DemoRequest.findById(id);
        if (!lead || !lead.provisionedOrganizationId) {
            return res.status(404).json({ success: false, message: "Lead not found or not yet provisioned" });
        }

        const Organization = (await import("../models/Organization.js")).default;
        const org = await Organization.findById(lead.provisionedOrganizationId);
        if (!org || !org.pending_admin) {
            return res.status(404).json({ success: false, message: "Provisioned organization or pending admin not found" });
        }

        const { generateActivationCredentials } = await import("../services/lead-conversion.service.js");
        const credentials = generateActivationCredentials();

        org.pending_admin.activationToken = credentials.hashedActivationToken;
        org.pending_admin.activationTokenExpires = credentials.expiresAt;
        org.pending_admin.activationCodeHash = credentials.activationCodeHash;
        org.pending_admin.activationCodeExpires = credentials.expiresAt;
        await org.save();

        const ONBOARDING_URL = process.env.NODE_ENV === "production" ? "https://onboard.classgrid.in" : "http://onboard.localhost:5173";
        const activationLink = `${ONBOARDING_URL}/?token=${credentials.rawActivationToken}`;

        // Send activation email to admin
        try {
            const { sendEmail } = await import("../services/aws-ses.service.js");
            const { getConsolidatedApprovalEmailHtml, getConsolidatedApprovalEmailPlainText } = await import("../services/email-templates.service.js");

            const activationDate = new Date();
            const expiryDate = org.demoExpiresAt || new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
            const allocatedDashboards = lead.allocatedDashboards || [];

            await sendEmail({
                to: org.pending_admin.email,
                subject: "Activate Your Classgrid Admin Account",
                fromName: "Nikhil Shinde | Classgrid CEO",
                fromEmail: "nikhil.shinde@classgrid.in",
                html: getConsolidatedApprovalEmailHtml({
                    adminName: org.pending_admin.name || lead.adminName,
                    orgName: org.name,
                    subdomain: org.subdomain,
                    activationLink,
                    activationCode: credentials.activationCode,
                    activationDate,
                    expiryDate,
                    sandboxDuration: 31,
                    allocatedDashboards,
                }),
                text: getConsolidatedApprovalEmailPlainText({
                    adminName: org.pending_admin.name || lead.adminName,
                    orgName: org.name,
                    subdomain: org.subdomain,
                    activationLink,
                    activationCode: credentials.activationCode,
                    activationDate,
                    expiryDate,
                    sandboxDuration: 31,
                    allocatedDashboards,
                }),
                organizationId: org._id,
            });
        } catch (emailErr) {
            console.error("[SuperAdmin] regenerateLeadActivation email error:", emailErr.message);
            // Don't fail the whole request if email fails — still return the link
        }

        res.json({
            success: true,
            activation: {
                activationLink,
                activationCode: credentials.activationCode,
                expiresAt: credentials.expiresAt
            }
        });
    } catch (err) {
        console.error("[SuperAdmin] regenerateLeadActivation error:", err.message);
        res.status(500).json({ success: false, message: "Failed to regenerate activation" });
    }
};

// =================================================
// UPDATE ORGANIZATION STATUS
// =================================================

// =================================================
// DELETE ORGANIZATION (HARD DELETE)
// =================================================
export const deleteOrganization = async (req, res) => {
    try {
        const { id } = req.params;

        const Organization = (await import("../models/Organization.js")).default;
        const OrgSubscription = (await import("../models/OrgSubscription.js")).default;
        const User = (await import("../models/User.js")).default;
        const UserProfile = (await import("../models/UserProfile.js")).default;
        const DemoRequest = (await import("../models/DemoRequest.js")).default;

        const org = await Organization.findById(id);
        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        // 1. Delete all users belonging to this organization
        // To be safe, we will just delete users whose organization_id matches. 
        // In a real production system, we'd probably anonymize, but for sandbox deletion, hard delete is fine.
        await User.deleteMany({ organization_id: id });
        await UserProfile.deleteMany({ organization_id: id });

        // 2. Delete the subscription
        await OrgSubscription.deleteOne({ organization_id: id });

        // 3. Delete any associated DemoRequest so the user can reuse their email/phone for a new demo
        await DemoRequest.deleteMany({ provisionedOrganizationId: id });

        // 4. Delete the organization
        await Organization.findByIdAndDelete(id);

        res.json({ success: true, message: 'Organization deleted successfully' });
    } catch (err) {
        console.error('[SuperAdmin] deleteOrganization error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateOrganizationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['active', 'suspended', 'blocked', 'sandbox', 'setup_in_progress'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status provided.' });
        }

        // We do not need to import Organization if it's already at the top, but just in case:
        const Organization = (await import("../models/Organization.js")).default;
        
        const org = await Organization.findByIdAndUpdate(
            id,
            { status },
            { returnDocument: 'after' }
        );

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("superadmin:org_updated", { orgId: id });
        }

        res.json({ success: true, message: 'Organization status updated successfully', organization: org });
    } catch (err) {
        console.error('[SuperAdmin] updateOrganizationStatus error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// =================================================
// UPDATE ORGANIZATION ONBOARDING
// =================================================
export const updateOrganizationOnboarding = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const Organization = (await import('../models/Organization.js')).default;
        const org = await Organization.findById(id);

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        const validKeys = [
            'tenant_created', 'branding_configured', 'academic_hierarchy_set',
            'staff_imported', 'students_imported', 'fee_structure_configured',
            'admission_form_configured', 'first_login_completed'
        ];

        let updated = false;
        for (const key of validKeys) {
            if (updates[key] !== undefined) {
                org.onboarding_progress[key] = updates[key];
                updated = true;
            }
        }

        if (updated) {
            org.onboarding_progress.last_synced_at = new Date();
            await org.save();
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("superadmin:org_updated", { orgId: id });
        }

        res.json({ success: true, message: 'Onboarding progress updated', data: org.onboarding_progress });
    } catch (err) {
        console.error('[SuperAdmin] updateOrganizationOnboarding error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getOrgHierarchyAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const Organization = (await import("../models/Organization.js")).default;
        const AcademicHierarchy = (await import("../models/AcademicHierarchy.js")).default;
        const Classroom = (await import("../models/Classroom.js")).default;
        const OrgSubject = (await import("../models/OrgSubject.js")).default;

        const org = await Organization.findById(id).lean();
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        const nodes = await AcademicHierarchy.find({ organization_id: id }).sort({ sort_order: 1, name: 1 }).lean();
        const classrooms = await Classroom.find({ organization_id: id }).lean();
        const subjects = await OrgSubject.find({ organization_id: id }).lean();

        return res.json({
            success: true,
            data: {
                nodes,
                classrooms,
                subjects
            }
        });
    } catch (err) {
        console.error("[getOrgHierarchyAudit] Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch hierarchy audit" });
    }
};

export const getOrgFacultyAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const Organization = (await import("../models/Organization.js")).default;
        const User = (await import("../models/User.js")).default;

        const org = await Organization.findById(id).lean();
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        const faculty = await User.find({ 
            organization_id: id, 
            role: { $in: ["teacher", "org_admin", "staff", "accountant", "receptionist", "librarian"] } 
        }).select("name email role status lastLoginAt createdAt").sort({ createdAt: -1 }).lean();

        return res.json({
            success: true,
            data: { faculty }
        });
    } catch (err) {
        console.error("[getOrgFacultyAudit] Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch faculty audit" });
    }
};
export const getOrgStudentsAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const Organization = (await import("../models/Organization.js")).default;
        const User = (await import("../models/User.js")).default;

        const org = await Organization.findById(id).lean();
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        const students = await User.find({ 
            organization_id: id, 
            role: "student"
        }).select("name email role status lastLoginAt createdAt profile.student.prn profile.student.batch profile.student.branch").sort({ createdAt: -1 }).limit(1000).lean();

        return res.json({
            success: true,
            data: { students }
        });
    } catch (err) {
        console.error("[getOrgStudentsAudit] Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch students audit" });
    }
};
export const getOrgFeesAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const Organization = (await import("../models/Organization.js")).default;
        const FeeStructure = (await import("../models/FeeStructure.js")).default;

        const org = await Organization.findById(id).lean();
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        const fees = await FeeStructure.find({ organization_id: id })
            .populate("hierarchy_id", "name code")
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            data: { fees }
        });
    } catch (err) {
        console.error("[getOrgFeesAudit] Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch fees audit" });
    }
};
export const getOrgAdmissionsAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const Organization = (await import("../models/Organization.js")).default;
        const AdmissionConfig = (await import("../models/AdmissionConfig.js")).default;
        const AdmissionApplication = (await import("../models/AdmissionApplication.js")).default;

        const org = await Organization.findById(id).lean();
        if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

        const configs = await AdmissionConfig.find({ organization_id: id })
            .populate("academic_year_id", "name")
            .populate("hierarchy_nodes", "name")
            .lean();

        const applicationsCount = await AdmissionApplication.countDocuments({ organization_id: id });

        return res.json({
            success: true,
            data: { configs, applicationsCount }
        });
    } catch (err) {
        console.error("[getOrgAdmissionsAudit] Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch admissions audit" });
    }
};
