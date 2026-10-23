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

import User from "../models/User.js";
import AdmissionApplication from "../models/AdmissionApplication.js";
import Organization from "../models/Organization.js";
import connectDB from "../../config/db.js";

/**
 * PUT /api/student-profile/compliance
 * Allows logged-in student to self-update their compliance IDs (ABC ID, Anti-ragging).
 */
export const updateStudentCompliance = async (req, res) => {
    try {
        await connectDB();
        const userId = req.user._id;
        const { abc_id, anti_ragging_undertaking_no } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Only allow updating if it's currently null/empty (self-serve initial fill)
        // If they already have it, they should contact admin to change it.
        let updated = false;

        if (abc_id && !user.abc_id) {
            user.abc_id = abc_id;
            updated = true;
        }

        if (anti_ragging_undertaking_no && !user.anti_ragging_undertaking_no) {
            user.anti_ragging_undertaking_no = anti_ragging_undertaking_no;
            updated = true;
        }

        if (updated) {
            // Check if profile is now complete (assuming these were the blockers)
            if (user.abc_id && user.anti_ragging_undertaking_no) {
                user.profile_completed = true;
            }
            await user.save();
        }

        res.json({
            success: true,
            message: updated ? "Compliance information updated successfully." : "No changes made or fields already filled.",
            user: {
                abc_id: user.abc_id,
                anti_ragging_undertaking_no: user.anti_ragging_undertaking_no,
                profile_completed: user.profile_completed
            }
        });
    } catch (err) {
        console.error("updateStudentCompliance error:", err);
        res.status(500).json({ error: "Server error updating compliance info." });
    }
};

/**
 * POST /api/admission/admin/bulk-update-compliance
 * Allows Admin to upload an array of { key, abc_id, anti_ragging_no, email } to bulk update users.
 * Matches by PRN or GR Number based on Org structure type.
 */
export const bulkUpdateCompliance = async (req, res) => {
    try {
        await connectDB();
        const orgId = req.user.organization_id;
        const { updates } = req.body; // Array of objects

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: "Invalid updates payload. Expected an array." });
        }

        const org = await Organization.findById(orgId).select("structure_type").lean();
        if (!org) return res.status(404).json({ error: "Organization not found" });

        const isCollege = [
            "engineering", "engineering_with_div", "engineering_no_div",
            "junior_college", "junior_college_with_div", "junior_college_no_div",
            "diploma", "diploma_with_div", "diploma_no_div"
        ].includes(org.structure_type);
        const matchField = isCollege ? "prn" : "prn"; // Schools can match by gr_number in future; for now both use PRN/email.

        let successCount = 0;
        let diffList = []; // Track failures for reporting to admin

        // We process in parallel with Promise.all for speed, using bulkOps in MongoDB
        const bulkOps = [];

        for (const record of updates) {
            const { prn, abc_id, anti_ragging_no, email } = record;
            
            if (!prn && !email) {
                diffList.push({ record, error: "Missing both PRN and Email for matching." });
                continue;
            }

            const query = { organization_id: orgId };
            if (prn) query.prn = prn;
            else query.email = email;

            const updateFields = {};
            if (abc_id) updateFields.abc_id = abc_id;
            if (anti_ragging_no) updateFields.anti_ragging_undertaking_no = anti_ragging_no;

            if (Object.keys(updateFields).length > 0) {
                bulkOps.push({
                    updateOne: {
                        filter: query,
                        update: { $set: updateFields }
                    }
                });
            }
        }

        if (bulkOps.length > 0) {
            const result = await User.bulkWrite(bulkOps, { ordered: false });
            successCount = result.modifiedCount;
            
            // Also attempt to update AdmissionApplication if applicable just to keep them in sync
            const appBulkOps = bulkOps.map(op => {
                let appQuery = { organization_id: orgId };
                if (op.updateOne.filter.prn) appQuery.prn = op.updateOne.filter.prn;
                else appQuery.email = op.updateOne.filter.email;

                let appUpdateFields = {};
                if (op.updateOne.update.$set.abc_id) appUpdateFields["form_data.abc_id"] = op.updateOne.update.$set.abc_id;
                if (op.updateOne.update.$set.anti_ragging_undertaking_no) appUpdateFields["form_data.anti_ragging_undertaking_no"] = op.updateOne.update.$set.anti_ragging_undertaking_no;

                return {
                    updateOne: {
                        filter: appQuery,
                        update: { $set: appUpdateFields }
                    }
                };
            });

            if (appBulkOps.length > 0) {
                 await AdmissionApplication.bulkWrite(appBulkOps, { ordered: false }).catch(e => console.error("Error syncing to AdmissionApplication:", e.message));
            }
        }

        res.json({
            success: true,
            message: `Successfully updated ${successCount} student records.`,
            failed_updates: diffList
        });

    } catch (err) {
        console.error("bulkUpdateCompliance error:", err);
        res.status(500).json({ error: "Server error processing bulk update." });
    }
};
