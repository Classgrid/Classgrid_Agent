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

const usersContent = `import User from "../../models/User.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import { primarySupabaseClient as supabase } from "../../config/supabaseClient.js";
import mongoose from "mongoose";

// PHASE 8: Super Admin AI Usage - Users Controller

export const listUsersInOrg = async (req, res) => {
    try {
        const { orgId } = req.params;
        let query = {};
        
        if (orgId === "classgrid") {
            query = { $or: [{ role: 'super_admin' }, { organization_id: null }, { organization_id: { $exists: false } }] };
        } else {
            if (!mongoose.Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({ success: false, error: "Invalid organization ID" });
            }
            query = { organization_id: orgId };
        }

        const users = await User.find(query)
            .select("name email role ai_tokens organization_id")
            .lean();

        // Group users by role
        const roles = {};
        users.forEach(user => {
            const role = user.role || "unknown";
            if (!roles[role]) {
                roles[role] = {
                    roleName: role,
                    userCount: 0,
                    totalUsage: 0,
                    users: []
                };
            }
            roles[role].userCount += 1;
            roles[role].totalUsage += (user.ai_tokens?.total_ai_tokens_used || 0);
            roles[role].users.push({
                id: user._id,
                name: user.name,
                email: user.email,
                totalUsage: user.ai_tokens?.total_ai_tokens_used || 0,
                isBlocked: user.ai_tokens?.is_ai_blocked || false
            });
        });

        res.status(200).json({ success: true, data: Object.values(roles) });

    } catch (error) {
        console.error("List Users in Org Error:", error);
        res.status(500).json({ success: false, error: "Failed to list users" });
    }
};

export const getUserAiDetail = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        const user = await User.findById(userId)
            .select("name email role ai_tokens organization_id")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const topupHistory = await AiCreditTransaction.find({ userId: userId })
            .sort({ createdAt: -1 })
            .lean();

        let totalChats = 0;
        if (user.email) {
            const { count, error: countError } = await supabase
                .from('ai_chat_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_email', user.email);
            
            if (!countError) totalChats = count || 0;
        }

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isBlocked: user.ai_tokens?.is_ai_blocked || false,
                totalUsage: user.ai_tokens?.total_ai_tokens_used || 0,
                balance: user.ai_tokens?.ai_credits_balance || 0,
                totalChats,
                topupHistory: topupHistory.map(t => ({
                    id: t._id,
                    amount_inr: t.amount_inr,
                    credits_added: t.credits_added,
                    status: t.status,
                    date: t.createdAt
                }))
            }
        });
    } catch (error) {
        console.error("Get User AI Detail Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch user details" });
    }
};
`;

fs.writeFileSync('c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/super-admin/ai-usage-users.controller.js', usersContent);
console.log('Created users controller');
