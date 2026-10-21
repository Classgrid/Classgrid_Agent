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

import FeeStructure from "../../models/FeeStructure.js";

// ══════════════════════════════════════════════════════════════════════════════
// FEE STRUCTURE SERVICE — Pure CRUD business logic for master fee templates.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Creates or updates a Master Fee Structure for a specific batch.
 * Uses an upsert based on hierarchy_id and title to prevent accidental duplicates.
 * 
 * @param {Object} data  - Contains hierarchy_id, title, base_amount, tax_percentage, due_date, line_items.
 * @param {string} orgId - Tenant isolation.
 * @returns {Promise<Object>} The saved FeeStructure document.
 */
export async function createFeeStructure(data, orgId) {
    if (!orgId) throw new Error("orgId is required.");
    const { hierarchy_id, title, base_amount, tax_percentage, due_date, line_items } = data;

    if (!hierarchy_id || !title || base_amount === undefined || !due_date) {
        throw new Error("hierarchy_id, title, base_amount, and due_date are required.");
    }

    if (base_amount < 0) {
        throw new Error("base_amount cannot be negative.");
    }

    try {
        // Upsert to strictly prevent duplicate identical fee structures
        const structure = await FeeStructure.findOneAndUpdate(
            {
                organization_id: orgId,
                hierarchy_id: hierarchy_id,
                title: title.trim()
            },
            {
                base_amount,
                tax_percentage: tax_percentage || 0,
                due_date: new Date(due_date),
                line_items: line_items || []
            },
            {
                returnDocument: 'after',
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true
            }
        );

        return structure.toObject();
    } catch (error) {
        if (error.code === 11000) {
            throw new Error("A fee structure with this exact title already exists for this batch.");
        }
        throw new Error(`Failed to create fee structure: ${error.message}`);
    }
}

/**
 * Fetches all fee structures for an organization, optionally filtered by hierarchy_id.
 * 
 * @param {string} orgId   - Tenant isolation.
 * @param {Object} filters - Optional filters (e.g., { hierarchy_id }).
 * @returns {Promise<Array>} List of fee structures.
 */
export async function getFeeStructures(orgId, filters = {}) {
    if (!orgId) throw new Error("orgId is required.");

    try {
        const query = { organization_id: orgId };
        
        if (filters.hierarchy_id) {
            query.hierarchy_id = filters.hierarchy_id;
        }

        return await FeeStructure.find(query)
            .populate("hierarchy_id", "name grade section type") // Populate DNA node details for UI
            .sort({ createdAt: -1 })
            .lean();
    } catch (error) {
        throw new Error(`Failed to fetch fee structures: ${error.message}`);
    }
}

/**
 * Modifies an existing fee structure securely.
 * 
 * @param {string} structureId - The FeeStructure._id.
 * @param {Object} data        - Fields to update.
 * @param {string} orgId       - Tenant isolation.
 * @returns {Promise<Object>}  The updated FeeStructure.
 */
export async function updateFeeStructure(structureId, data, orgId) {
    if (!structureId || !orgId) throw new Error("structureId and orgId are required.");

    try {
        // Find and update, ensuring it belongs to this specific orgId
        const updatedStructure = await FeeStructure.findOneAndUpdate(
            { _id: structureId, organization_id: orgId },
            { $set: data },
            { returnDocument: 'after', runValidators: true }
        );

        if (!updatedStructure) {
            throw new Error("Fee structure not found or unauthorized.");
        }

        return updatedStructure.toObject();
    } catch (error) {
        throw new Error(`Failed to update fee structure: ${error.message}`);
    }
}

/**
 * Deletes a master fee structure.
 * 
 * @param {string} structureId - The FeeStructure._id.
 * @param {string} orgId       - Tenant isolation.
 * @returns {Promise<Object>}  The deleted document.
 */
export async function deleteFeeStructure(structureId, orgId) {
    if (!structureId || !orgId) throw new Error("structureId and orgId are required.");

    try {
        const deleted = await FeeStructure.findOneAndDelete({
            _id: structureId,
            organization_id: orgId
        });

        if (!deleted) {
            throw new Error("Fee structure not found or unauthorized.");
        }

        return deleted.toObject();
    } catch (error) {
        throw new Error(`Failed to delete fee structure: ${error.message}`);
    }
}
