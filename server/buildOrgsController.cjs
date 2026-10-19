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
const fs = require('fs');

const orgsContent = `import Organization from "../../models/Organization.js";
import User from "../../models/User.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import { primarySupabaseClient as supabase } from "../../config/supabaseClient.js";
import mongoose from "mongoose";

// PHASE 7: Super Admin AI Usage - Organizations Controller
// Pulls real usage from Supabase and joins with MongoDB just like Agent Reviews!

export const listOrgsWithAiUsage = async (req, res) => {
    try {
        // 1. Get ALL unique emails that have chatted from Supabase
        const { data, error } = await supabase.from('ai_chat_sessions').select('user_email');
        
        let activeEmails = [];
        if (data && !error) {
            activeEmails = [...new Set(data.map(r => r.user_email).filter(e => e))];
        }

        // 2. Fetch those specific users from MongoDB and populate their Organization
        const users = await User.find({ email: { $in: activeEmails } })
            .select("name email role ai_tokens organization_id")
            .populate("organization_id", "name ai_config")
            .lean();

        // 3. Group by Organization (and handle Super Admins properly)
        const orgMap = {};

        users.forEach(u => {
            let orgId, orgName, isBlocked = false;

            if (u.role === 'super_admin' || !u.organization_id) {
                orgId = "classgrid";
                orgName = "Classgrid (Platform Team)";
            } else {
                orgId = u.organization_id._id.toString();
                orgName = u.organization_id.name;
                isBlocked = u.organization_id.ai_config?.is_ai_blocked || false;
            }

            if (!orgMap[orgId]) {
                orgMap[orgId] = {
                    id: orgId,
                    name: orgName,
                    totalUsage: 0,
                    isBlocked: isBlocked
                };
            }

            // Sum up their total token usage to show on the folder
            orgMap[orgId].totalUsage += (u.ai_tokens?.total_ai_tokens_used || 0);
        });

        res.status(200).json({ success: true, data: Object.values(orgMap) });

    } catch (error) {
        console.error("List Orgs AI Usage Error:", error);
        res.status(500).json({ success: false, error: "Failed to list organizations" });
    }
};

export const getOrgAiDetail = async (req, res) => {
    try {
        const { orgId } = req.params;
        
        let orgName = "Classgrid (Platform Team)";
        let isBlocked = false;
        let poolLimit = 0;
        let userQuery = {};

        if (orgId === "classgrid") {
            userQuery = { 
                $or: [{ role: 'super_admin' }, { organization_id: null }, { organization_id: { $exists: false } }] 
            };
        } else {
            if (!mongoose.Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({ success: false, error: "Invalid organization ID" });
            }
            const org = await Organization.findById(orgId).select("name ai_config status").lean();
            if (!org) {
                return res.status(404).json({ success: false, error: "Organization not found" });
            }
            orgName = org.name;
            isBlocked = org.ai_config?.is_ai_blocked || false;
            poolLimit = org.ai_config?.pro_pool_limit || 0;
            userQuery = { organization_id: orgId };
        }

        // 1. Get Top-ups for this specific org (if applicable)
        let totalRevenue = 0;
        let totalTopUpCredits = 0;
        
        if (orgId !== "classgrid") {
            const topups = await AiCreditTransaction.aggregate([
                { $match: { orgId: new mongoose.Types.ObjectId(orgId), status: "success", type: "topup" } },
                { $group: { _id: null, total_amount_inr: { $sum: "$amount_inr" }, total_credits_added: { $sum: "$credits_added" } } }
            ]);
            totalRevenue = topups[0]?.total_amount_inr || 0;
            totalTopUpCredits = topups[0]?.total_credits_added || 0;
        }

        // 2. Fetch all users in this org to calculate total chats from Supabase
        const users = await User.find(userQuery).select("_id email ai_tokens").lean();
        const userEmails = users.map(u => u.email).filter(e => e);
        
        let totalUsage = 0;
        users.forEach(u => {
            totalUsage += (u.ai_tokens?.total_ai_tokens_used || 0);
        });

        let totalChats = 0;
        if (userEmails.length > 0) {
            const { count, error } = await supabase
                .from('ai_chat_sessions')
                .select('*', { count: 'exact', head: true })
                .in('user_email', userEmails);
                
            if (!error) totalChats = count || 0;
        }

        res.status(200).json({
            success: true,
            data: {
                id: orgId,
                name: orgName,
                isBlocked,
                poolLimit,
                totalUsage,
                totalRevenue,
                totalTopUpCredits,
                totalChats
            }
        });

    } catch (error) {
        console.error("Get Org AI Detail Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch organization details" });
    }
};
`;

fs.writeFileSync('c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/super-admin/ai-usage-orgs.controller.js', orgsContent);
console.log('Created orgs controller');
