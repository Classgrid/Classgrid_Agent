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

import DropdownMaster from "../models/DropdownMaster.js";
import OrgDropdownOverride from "../models/OrgDropdownOverride.js";

export const getDropdowns = async (req, res) => {
  try {
    const { type, organization_type, role_category, department_id } = req.query;
    const orgId = req.user.organization; // from requireAuth

    if (!type) {
      return res.status(400).json({ error: "Dropdown type is required." });
    }

    // 1. Fetch Master Options matching the criteria
    let query = { type, is_active: true };

    if (organization_type) {
      query.$or = [
        { organization_types: { $size: 0 } }, // Applies to all if empty
        { organization_types: organization_type }
      ];
    }
    
    if (role_category) {
      query.$or = query.$or || [];
      query.$or.push(
        { role_categories: { $size: 0 } },
        { role_categories: role_category }
      );
    }

    if (department_id) {
      query.department_ids = department_id;
    }

    const masterOptions = await DropdownMaster.find(query).sort({ display_order: 1 });

    // 2. Fetch Organization Overrides
    const overrides = await OrgDropdownOverride.find({ organization: orgId, type });

    // 3. Merge Master and Overrides
    const overrideMap = new Map();
    const customAdditions = [];

    for (const ov of overrides) {
      if (ov.is_custom_addition) {
        if (ov.is_enabled) customAdditions.push(ov);
      } else {
        overrideMap.set(ov.masterOption.toString(), ov);
      }
    }

    const finalOptions = [];

    for (const master of masterOptions) {
      const ov = overrideMap.get(master._id.toString());
      if (ov) {
        if (!ov.is_enabled) continue; // Skip disabled
        finalOptions.push({
          id: master._id,
          name: ov.custom_name || master.name, // Use overridden name if exists
          is_custom: false
        });
      } else {
        finalOptions.push({
          id: master._id,
          name: master.name,
          is_custom: false
        });
      }
    }

    // Append custom additions
    for (const add of customAdditions) {
      // Basic check for custom additions to match current filters
      if (organization_type && add.organization_types.length > 0 && !add.organization_types.includes(organization_type)) continue;
      if (role_category && add.role_categories.length > 0 && !add.role_categories.includes(role_category)) continue;
      
      finalOptions.push({
        id: add._id,
        name: add.custom_name,
        is_custom: true
      });
    }

    res.json({ options: finalOptions });

  } catch (error) {
    console.error("Error fetching dropdowns:", error);
    res.status(500).json({ error: "Failed to fetch dropdown options" });
  }
};
