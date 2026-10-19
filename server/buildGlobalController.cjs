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

const globalContent = `import Organization from "../../models/Organization.js";
import User from "../../models/User.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import { primarySupabaseClient as supabase } from "../../config/supabaseClient.js";

// PHASE 6: Super Admin Global AI Usage Controller

export const getGlobalStats = async (req, res) => {
    try {
        const { month, year } = req.query;

        const currentDate = new Date();
        let targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        let targetYear = year ? parseInt(year) : currentDate.getFullYear();
        
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

        // Fetch total tokens (credits) used globally from MongoDB Users
        const userStats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    total_tokens_used: { $sum: "$ai_tokens.total_ai_tokens_used" }
                }
            }
        ]);
        const totalCreditsSpent = userStats[0]?.total_tokens_used || 0;

        // Fetch total top-ups
        const topups = await AiCreditTransaction.aggregate([
            {
                $match: {
                    status: "success",
                    type: "topup",
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    total_amount_inr: { $sum: "$amount_inr" },
                    total_credits_added: { $sum: "$credits_added" }
                }
            }
        ]);
        const totalRevenue = topups[0]?.total_amount_inr || 0;
        const creditsPurchasedThisMonth = topups[0]?.total_credits_added || 0;

        // Fetch Supabase for total AI chats globally
        const { count: totalChats, error: chatError } = await supabase
            .from('ai_chat_sessions')
            .select('*', { count: 'exact', head: true });

        const models = [
            { name: "@cf/deepseek-ai/deepseek-v4-pro-0813", type: "Text (Primary)", usage: "Primary Chat" },
            { name: "@cf/black-forest-labs/flux-1-schnell", type: "Image Gen", usage: "Image Generation" },
            { name: "@cf/meta/llama-3.2-11b-vision-instruct", type: "Image Understanding", usage: "Vision/Analysis" },
            { name: "@cf/openai/whisper-large-v3-turbo", type: "STT", usage: "Speech to Text" },
            { name: "@cf/deepgram/aura-2-en", type: "TTS", usage: "Text to Speech" },
            { name: "@cf/runwayml/stable-diffusion-v1-5-img2img", type: "Img2Img", usage: "Image Editing" }
        ];

        // Real Usage Trend: Fetch all chat sessions for the month and group by day
        const { data: monthChats } = await supabase
            .from('ai_chat_sessions')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        const trendMap = {};
        if (monthChats) {
            monthChats.forEach(chat => {
                const dateStr = chat.created_at.split('T')[0];
                trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;
            });
        }

        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        const realTrend = Array.from({ length: daysInMonth }, (_, i) => {
            const d = \`\${targetYear}-\${String(targetMonth).padStart(2, '0')}-\${String(i + 1).padStart(2, '0')}\`;
            return {
                date: d,
                credits: trendMap[d] || 0
            };
        });

        res.status(200).json({
            success: true,
            data: {
                totalCreditsSpent,
                totalRevenue,
                creditsPurchasedThisMonth,
                totalChats: totalChats || 0,
                usageTrend: realTrend,
                models,
                notes: "Trend shows number of AI chat sessions per day. 1 Credit = 1 Token exactly."
            }
        });
    } catch (error) {
        console.error("Global AI stats error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch global AI stats" });
    }
};

export const getModelBreakdown = async (req, res) => {
    res.status(200).json({ success: true, data: [] });
};
`;

fs.writeFileSync('c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/super-admin/ai-usage-global.controller.js', globalContent);
console.log('Created global controller');
