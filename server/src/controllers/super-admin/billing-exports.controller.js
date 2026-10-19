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

import BillingExportJob from "../../models/BillingExportJob.js";
import { getPrivateDownloadUrl } from "../../config/r2Client.js";

function serializeJob(job) {
    return {
        _id: job._id,
        exportType: job.exportType,
        format: job.format,
        status: job.status,
        fileName: job.fileName,
        contentType: job.contentType,
        sizeBytes: job.sizeBytes,
        expiresAt: job.expiresAt,
        completedAt: job.completedAt,
        errorDetails: job.status === "FAILED" ? job.errorDetails : null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
    };
}

export const getExportJob = async (req, res) => {
    try {
        const job = await BillingExportJob.findById(req.params.jobId);
        if (!job) return res.status(404).json({ success: false, message: "Export job not found" });
        if (job.expiresAt <= new Date() && job.status !== "EXPIRED") {
            job.status = "EXPIRED";
            await job.save();
        }
        res.json({ success: true, data: serializeJob(job) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getExportDownload = async (req, res) => {
    try {
        const job = await BillingExportJob.findById(req.params.jobId).select("+storageKey");
        if (!job) return res.status(404).json({ success: false, message: "Export job not found" });
        if (job.expiresAt <= new Date() || job.status === "EXPIRED") {
            return res.status(410).json({ success: false, message: "Export job has expired" });
        }
        if (job.status !== "COMPLETED" || !job.storageKey) {
            return res.status(409).json({ success: false, message: `Export is ${job.status.toLowerCase()}` });
        }
        const expiresInSeconds = 300;
        const url = await getPrivateDownloadUrl(job.storageKey, expiresInSeconds);
        res.json({
            success: true,
            data: { url, fileName: job.fileName, expiresInSeconds },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
