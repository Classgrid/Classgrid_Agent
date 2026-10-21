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

import FacultyBiometricLog from "../models/FacultyBiometricLog.js";
import User from "../models/User.js";
import crypto from "crypto";
import { z } from "zod";

const attendancePayloadSchema = z.object({
    biometricId: z.string({ required_error: "biometricId is required" }),
    timestamp: z.string().datetime({ message: "timestamp must be a valid ISO-8601 Date" }),
    type: z.enum(["IN", "OUT", "UNKNOWN"]).default("UNKNOWN"),
    deviceId: z.string().optional(),
});

export const markBiometricAttendance = async (req, res) => {
    try {
        const orgId = req.organization._id;

        // Extract and validate payload
        const validation = attendancePayloadSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Format error",
                errors: validation.error.errors,
            });
        }

        const { biometricId, timestamp, type, deviceId } = validation.data;

        // Try mapping the biometricId to a User in this org
        // We match by `biometricId` first, then fallback to `prn` or `email` if configured that way.
        const faculty = await User.findOne({
            organization_id: orgId,
            $or: [
                { biometricId: biometricId },
                { prn: biometricId },
                { email: biometricId }
            ],
            role: { $in: ["faculty", "teacher", "org_admin", "super_admin"] },
            status: "active"
        });

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: "Faculty not found or not active",
            });
        }

        // Create a time-rounded deduplication hash: round to the nearest minute.
        // E.g., a person stands at a turnstile and it scans them 3 times in 20 seconds.
        const d = new Date(timestamp);
        const minuteKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}-${d.getUTCMinutes()}`;
        
        const deduplicationContent = `${faculty._id.toString()}_${minuteKey}`;
        const deduplicationHash = crypto.createHash('sha256').update(deduplicationContent).digest('hex');

        // Check if log already exists within this minute
        const existingLog = await FacultyBiometricLog.findOne({ deduplication_hash: deduplicationHash });
        if (existingLog) {
            return res.status(200).json({
                success: true,
                message: "Duplicate log ignored",
                data: { logId: existingLog._id }
            });
        }

        const newLog = await FacultyBiometricLog.create({
            organization: orgId,
            faculty: faculty._id,
            timestamp: d,
            log_type: type,
            device_id: deviceId || "Generic Webhook",
            deduplication_hash: deduplicationHash,
        });

        res.status(201).json({
            success: true,
            data: {
                logId: newLog._id,
                facultyName: faculty.name,
                timestamp: newLog.timestamp,
                type: newLog.log_type,
            }
        });

    } catch (error) {
        if (error.code === 11000) { // MongoDB duplicate key
            return res.status(200).json({ success: true, message: "Duplicate log ignored" });
        }
        console.error("External Attendance Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
