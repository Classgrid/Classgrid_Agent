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

import { Queue, Worker } from "bullmq";
import AttendanceRecord from "../models/AttendanceRecord.js";
import AttendanceSession from "../models/AttendanceSession.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import redisClient from "../config/redis.js";

const isDev = process.env.NODE_ENV !== "production";

// In dev without Redis, export a dummy queue that does nothing
export const attendanceQueue = isDev
    ? { add: async () => console.log("[Dev] Attendance queue skipped (no Redis)"), on: () => {} }
    : new Queue("AttendanceBatching", { connection: redisClient });

if (attendanceQueue.on) {
    attendanceQueue.on('error', (err) => console.warn('[AttendanceWorker] Queue error:', err.message));
}

if (!isDev) {
    // A worker to ingest bulk attendance submissions and process them
    // Helps mitigate DB lock spikes during 60s attendance window
    const worker = new Worker("AttendanceBatching", async (job) => {
        const { 
            session_id, classroom_id, student_id, student_name, role, org_id, 
            studentLat, studentLng, distanceMeters, pasteDetected,
            deviceFingerprint, ipAddress, suspicionReasons, isSuspicious, status,
            expectedDevice
        } = job.data;

        try {
            // Step 1: Create the attendance log natively
            await AttendanceRecord.create({
                session: session_id,
                classroom: classroom_id,
                student: student_id,
                status,
                studentLat,
                studentLng,
                distanceMeters,
                pasteDetected,
                deviceFingerprint,
                ipAddress,
                suspicionReasons,
                markedAt: new Date()
            });

            // Step 2: Increment the counter atomically
            await AttendanceSession.findByIdAndUpdate(session_id, { $inc: { presentCount: 1 } });

            // Step 3: Emit audit log if flagged
            if (isSuspicious) {
                await AdminAuditLog.create({
                    action: "attendance_suspicious",
                    actorId: student_id,
                    actorName: student_name,
                    actorRole: role,
                    targetType: "AttendanceSession",
                    targetId: session_id,
                    organization_id: org_id,
                    metadata: {
                        studentId: student_id,
                        classroomId: classroom_id,
                        sessionId: session_id,
                        suspicionReasons,
                        distanceMeters,
                        pasteDetected,
                        deviceFingerprint,
                        expectedDevice,
                        ipAddress
                    },
                });
            }
        } catch (err) {
            // Ignore duplicate key errors silently since it means they already marked it
            if (err.code !== 11000) {
                console.error(`[AttendanceWorker] Failed to process mark for student ${student_id}:`, err.message);
                throw err;
            }
        }
    }, { connection: redisClient });

    worker.on("failed", (job, err) => {
        console.error(`Job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
        console.warn(`[AttendanceWorker] Worker error: ${err.message}`);
    });
} else {
    console.log("👷 Attendance Worker skipped (no Redis in dev)");
}

export default attendanceQueue;
