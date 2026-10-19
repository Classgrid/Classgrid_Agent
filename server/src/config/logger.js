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

import winston from "winston";
import "winston-daily-rotate-file";
import "winston-mongodb";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import { asyncContext } from "../utils/async-context.js";

// Ensure env variables are loaded if used directly
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { combine, timestamp, printf, colorize, json, metadata } = winston.format;

// Custom log format for readable console
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
});

// Format that injects contextual data from AsyncLocalStorage
const safeStr = (val) => {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && typeof val.toString === 'function') return val.toString();
    return String(val);
};

const injectContextFormat = winston.format((info) => {
    const context = asyncContext.getStore();
    if (context) {
        // Only inject if not explicitly provided in the log
        if (info.userId === undefined) info.userId = safeStr(context.userId);
        else info.userId = safeStr(info.userId);
        if (info.orgId === undefined) info.orgId = safeStr(context.orgId);
        else info.orgId = safeStr(info.orgId);
        if (info.traceId === undefined) info.traceId = context.traceId;
        if (info.ip === undefined) info.ip = context.ip;
    } else {
        // Even without context, sanitize whatever was passed explicitly
        if (info.userId !== undefined) info.userId = safeStr(info.userId);
        if (info.orgId !== undefined) info.orgId = safeStr(info.orgId);
    }
    return info;
});

// Create rotating file transport for API access logs
const fileTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, "../../../logs", "api-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    format: combine(injectContextFormat(), timestamp(), json())
});

const transports = [
    fileTransport,
    new winston.transports.Console({
        format: combine(injectContextFormat(), colorize(), timestamp(), consoleFormat)
    })
];

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

// Add MongoDB transport if URI is available
if (mongoUri) {
    const mongoTransport = new winston.transports.MongoDB({
        // Store ALL logs (info, warn, error) — no level filter
        db: mongoUri,
        collection: "systemlogs",
        format: combine(injectContextFormat(), timestamp(), metadata()),
        expireAfterSeconds: 432000, // 5 days
        capped: true,
        cappedSize: 10485760, // 10MB
        cappedMax: 10000 // Max 10,000 logs
    });

    // 🚨 Prevent winston-mongodb from crashing the Node.js process if connection resets (ECONNRESET)
    mongoTransport.on('error', (err) => {
        console.error('[winston-mongodb] Transport error:', err);
    });

    transports.push(mongoTransport);
}

// Configure main logger
export const accessLogger = winston.createLogger({
    level: "info",
    transports: transports
});

// Express middleware for logging specific route traffic
export const winstonMiddleware = (req, res, next) => {
    // Skip logging high-frequency polling routes to prevent log spam
    if (
        req.originalUrl.includes("/api/super-admin/error-logs") ||
        req.originalUrl.includes("/api/super-admin/health") ||
        req.originalUrl.includes("/api/super-admin/feature-flags")
    ) {
        return next();
    }

    const start = Date.now();
    // Inject traceId into request
    req.traceId = req.traceId || crypto.randomUUID();
    
    // Log once request finishes
    res.on("finish", () => {
        const duration = Date.now() - start;
        
        // Safely capture and redact request body
        let safeBody = undefined;
        if (req.body && Object.keys(req.body).length > 0) {
            safeBody = { ...req.body };
            const sensitiveKeys = ["password", "token", "secret", "key", "authorization", "credit_card"];
            
            const redact = (obj) => {
                for (const key in obj) {
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        redact(obj[key]);
                    } else if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                        obj[key] = "[REDACTED]";
                    }
                }
            };
            redact(safeBody);
        }

        const isCronOrWebhook = req.originalUrl.includes("/api/cron") || req.originalUrl.includes("/api/webhooks");
        const logData = {
            traceId: req.traceId,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            ip: req.ip,
            durationMs: duration,
            orgId: isCronOrWebhook ? "system" : (req.effectiveOrganizationId?.toString() || (req.user ? (req.user.organization_id?.toString() || "none") : "none")),
            userId: isCronOrWebhook ? "system_service" : (req.user ? ((req.user.id || req.user._id)?.toString() || "unauthenticated") : "unauthenticated"),
            ...(safeBody && { body: safeBody })
        };

        if (res.statusCode >= 400) {
            accessLogger.error(`API Request Failed: ${req.method} ${req.originalUrl}`, logData);
        } else {
            accessLogger.info("API Request Dispatched", logData);
        }
    });

    const runContext = {
        traceId: req.traceId,
        ip: req.ip,
        get orgId() { 
            if (req.originalUrl.includes("/api/cron") || req.originalUrl.includes("/api/webhooks")) return "system";
            return req.effectiveOrganizationId?.toString() || (req.user ? (req.user.organization_id?.toString() || "none") : "none"); 
        },
        get userId() { 
            if (req.originalUrl.includes("/api/cron") || req.originalUrl.includes("/api/webhooks")) return "system_service";
            return req.user ? ((req.user.id || req.user._id)?.toString() || "unauthenticated") : "unauthenticated"; 
        }
    };

    // Run the rest of the request within this context
    asyncContext.run(runContext, () => {
        next();
    });
};

export default accessLogger;
