// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import Organization from "../../models/Organization.js";
import User from "../../models/User.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import GlobalAiConfig from "../../models/GlobalAiConfig.js";
import { primarySupabaseClient as supabase } from "../../config/supabaseClient.js";
import mongoose from "mongoose";
import { resolveFeatureLimit } from "../../services/ai-feature-limits.js";

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
        const users = await User.find({ 
            $or: [
                { email: { $in: activeEmails } },
                { organization_id: "6ac4b95e0f8a97f45e98b0ff" }
            ]
        })
            .select("name email role ai_tokens organization_id profilePicture platformLogo")
            .populate("organization_id", "name ai_config logo_url ownerEmail ownerName")
            .lean();

        // 3. Group by Organization (and handle Super Admins properly)
        const orgMap = {};

        users.forEach(u => {
            let orgId, orgName, isBlocked = false, logo = null, adminEmail = "", adminName = "";

            if (!u.organization_id) {
                orgId = "classgrid";
                orgName = "Classgrid (Platform Team)";
                logo = u.platformLogo || u.profilePicture || null;
                adminEmail = u.email || "";
                adminName = u.name || "";
            } else {
                orgId = u.organization_id._id.toString();
                orgName = u.organization_id.name;
                isBlocked = u.organization_id.ai_config?.is_ai_blocked || false;
                logo = u.organization_id.logo_url || null;
                adminEmail = u.organization_id.ownerEmail || ""; 
                adminName = u.organization_id.ownerName || "";
            }

            if (!orgMap[orgId]) {
                orgMap[orgId] = {
                    id: orgId,
                    name: orgName,
                    totalUsage: 0,
                    isBlocked: isBlocked,
                    logo: logo,
                    adminEmail: adminEmail,
                    adminName: adminName
                };
            } else {
                if (!orgMap[orgId].adminEmail && adminEmail) {
                    orgMap[orgId].adminEmail = adminEmail;
                }
                if (!orgMap[orgId].adminName && adminName) {
                    orgMap[orgId].adminName = adminName;
                }
                if (!orgMap[orgId].logo && logo) {
                    orgMap[orgId].logo = logo;
                }
            }

            // Sum up their total token usage to show on the folder
            orgMap[orgId].totalUsage += (u.ai_tokens?.total_ai_tokens_used || 0);
        });
        // 4. For any real organization missing adminEmail or logo, fetch them directly
        const orgIdsToFetch = Object.keys(orgMap).filter(id => id !== "classgrid");
        
        // Fetch direct organization data in case populate missed it
        const realOrgs = await Organization.find({ _id: { $in: orgIdsToFetch } }).select("logo_url ownerEmail ownerName").lean();
        realOrgs.forEach(org => {
            const id = org._id.toString();
            if (orgMap[id]) {
                if (!orgMap[id].logo && org.logo_url) orgMap[id].logo = org.logo_url;
                if (!orgMap[id].adminEmail && org.ownerEmail) orgMap[id].adminEmail = org.ownerEmail;
                if (!orgMap[id].adminName && org.ownerName) orgMap[id].adminName = org.ownerName;
            }
        });
        
        // Fetch user with org_admin role if ownerEmail is still missing
        const orgAdmins = await User.find({ organization_id: { $in: orgIdsToFetch }, role: "org_admin" })
            .select("email name organization_id profilePicture")
            .lean();
            
        orgAdmins.forEach(admin => {
            const id = admin.organization_id.toString();
            if (orgMap[id]) {
                if (!orgMap[id].adminEmail) orgMap[id].adminEmail = admin.email;
                if (!orgMap[id].adminName) orgMap[id].adminName = admin.name;
            }
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
        
        const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" });

        let orgName = "Classgrid (Platform Team)";
        let isBlocked = false;
        let poolLimit = globalConfig?.global_pro_pool_limit;
        let userWeeklyLimit = globalConfig?.global_user_weekly_limit;
        let userQuery = {};

        let imageLimit;
        let whatsappLimit;
        let poolUsed = 0;
        let userWeeklyUsed = 0;

        let customLimitsEnabled = false;

        if (orgId === "classgrid") {
            if (globalConfig?.classgrid_custom_limits_enabled) {
                customLimitsEnabled = true;
                poolLimit = globalConfig.classgrid_pro_pool_limit || globalConfig.global_pro_pool_limit;
                userWeeklyLimit = globalConfig.classgrid_user_weekly_limit || globalConfig.global_user_weekly_limit;
            }
            // The limits the chat actually enforces (same rule as ai-feature-limits.js)
            imageLimit = resolveFeatureLimit("image", null, globalConfig, null);
            whatsappLimit = resolveFeatureLimit("whatsapp", null, globalConfig, null);
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
            if (org.ai_config?.custom_limits_enabled) {
                customLimitsEnabled = true;
                poolLimit = org.ai_config.pro_pool_limit || globalConfig?.global_pro_pool_limit;
                userWeeklyLimit = org.ai_config.free_weekly_limit_per_user || globalConfig?.global_user_weekly_limit;
            }
            imageLimit = resolveFeatureLimit("image", org, globalConfig, orgId);
            whatsappLimit = resolveFeatureLimit("whatsapp", org, globalConfig, orgId);
            poolUsed = org.ai_config?.pro_used_this_period || 0;
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
            userWeeklyUsed += (u.ai_tokens?.used_this_week || 0);
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
                customLimitsEnabled: typeof customLimitsEnabled !== 'undefined' ? customLimitsEnabled : false,
                poolLimit,
                userWeeklyLimit,
                imageLimit,
                whatsappLimit,
                totalUsage,
                poolUsed,
                userWeeklyUsed,
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
