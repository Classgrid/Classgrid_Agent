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

/**
 * CET Rank Prediction Engine
 * ─────────────────────────────────────────────────────
 * Uses a student's mock exam percentile to predict their
 * likely CET rank based on historical cutoff data.
 *
 * Approach:
 *   1. Collect all submitted online_exam_attempts for the student.
 *   2. Calculate their average percentile across all mock attempts.
 *   3. Map percentile → predicted rank using historical CET bracket data.
 *   4. Map rank → predicted college tier.
 *
 * Historical Reference Data (MHT-CET 2024 Approximations):
 *   99+ percentile → Rank 1-1000     → Tier 1 (COEP, VJTI, WCE)
 *   95-99          → Rank 1,000-8,000 → Tier 2 (PICT, DYPCOE, MITCOE)
 *   85-95          → Rank 8,000-30,000 → Tier 3 (JSPM, RSCOE, MMCOE)
 *   70-85          → Rank 30,000-80,000 → Tier 4
 *   Below 70       → Rank 80,000+     → Management Quota / Direct Admission
 */

import { getChatSb } from "../../config/supabaseClient.js";

// ── Historical CET Bracket Data ──────────────────────────────
// This can be made configurable per organization in future versions
const CET_BRACKETS = [
    {
        minPercentile: 99,
        maxPercentile: 100,
        rankRange: "1 – 1,000",
        predictedTier: "Tier 1",
        colleges: "COEP Pune, VJTI Mumbai, WCE Sangli, ICT Mumbai",
        verdict: "🏆 Outstanding! You are in the top bracket. Target elite engineering colleges."
    },
    {
        minPercentile: 95,
        maxPercentile: 98.99,
        rankRange: "1,000 – 8,000",
        predictedTier: "Tier 2",
        colleges: "PICT Pune, MIT Pune, DYPCOE Pune, CCOEW, SGGS Nanded",
        verdict: "🎯 Excellent! Strong chance at top-tier private and reputed government colleges."
    },
    {
        minPercentile: 85,
        maxPercentile: 94.99,
        rankRange: "8,000 – 30,000",
        predictedTier: "Tier 3",
        colleges: "JSPM Pune, RSCOE Pune, MMCOE Pune, GHRCEM Pune",
        verdict: "📈 Good performance. Focus on improving weak areas to jump to Tier 2."
    },
    {
        minPercentile: 70,
        maxPercentile: 84.99,
        rankRange: "30,000 – 80,000",
        predictedTier: "Tier 4",
        colleges: "Various private engineering colleges with CAP rounds",
        verdict: "⚠️ Average zone. You need significant improvement in weak subjects to secure better placements."
    },
    {
        minPercentile: 50,
        maxPercentile: 69.99,
        rankRange: "80,000 – 1,50,000",
        predictedTier: "Tier 5",
        colleges: "Open category seats at private colleges, Management quota options",
        verdict: "🔴 Below average. Intensive mock practice and topic revision strongly recommended."
    },
    {
        minPercentile: 0,
        maxPercentile: 49.99,
        rankRange: "1,50,000+",
        predictedTier: "Management / Direct",
        colleges: "Management quota or direct admission pathways",
        verdict: "🚨 Critical. Consider management quota or focused re-attempt preparation."
    }
];

/**
 * Predict a student's CET rank and college tier
 * based on their mock exam performance.
 *
 * @param {string} userId - The student's user ID
 * @returns {Object} Prediction result with percentile, rank range, tier, and improvement tips
 */
export async function predictCETRank(userId) {
    const supabase = getChatSb();

    // 1. Fetch all submitted exam attempts
    const { data: attempts } = await supabase
        .from('online_exam_attempts')
        .select('exam_id, score, total_marks, is_submitted')
        .eq('user_id', userId)
        .eq('is_submitted', true);

    if (!attempts || attempts.length === 0) {
        return {
            status: "no_data",
            message: "No mock exams attempted yet. Complete at least one full mock test to generate a prediction.",
            prediction: null
        };
    }

    // 2. For each attempt, compute the student's percentile relative to peers
    const percentiles = [];

    for (const attempt of attempts) {
        const { data: allAttempts } = await supabase
            .from('online_exam_attempts')
            .select('score')
            .eq('exam_id', attempt.exam_id)
            .eq('is_submitted', true);

        if (!allAttempts || allAttempts.length < 2) continue; // Need at least 2 students for percentile

        const totalCandidates = allAttempts.length;
        const countBelow = allAttempts.filter(a => a.score < attempt.score).length;
        const percentile = (countBelow / totalCandidates) * 100;
        percentiles.push({
            examId: attempt.exam_id,
            score: attempt.score,
            totalMarks: attempt.total_marks,
            percentile: parseFloat(percentile.toFixed(4)),
            totalCandidates
        });
    }

    if (percentiles.length === 0) {
        return {
            status: "insufficient_peers",
            message: "Not enough peer data for percentile calculation. At least 2 students must attempt the same exam.",
            prediction: null
        };
    }

    // 3. Calculate average percentile across all mocks
    const avgPercentile = parseFloat(
        (percentiles.reduce((sum, p) => sum + p.percentile, 0) / percentiles.length).toFixed(4)
    );

    // 4. Find the matching CET bracket
    const bracket = CET_BRACKETS.find(b => avgPercentile >= b.minPercentile && avgPercentile <= b.maxPercentile)
        || CET_BRACKETS[CET_BRACKETS.length - 1];

    // 5. Compute trend (improving / declining / stable)
    let trend = "stable";
    if (percentiles.length >= 3) {
        const recent3 = percentiles.slice(-3);
        const firstHalf = recent3.slice(0, Math.ceil(recent3.length / 2));
        const secondHalf = recent3.slice(Math.ceil(recent3.length / 2));
        const avgFirst = firstHalf.reduce((s, p) => s + p.percentile, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, p) => s + p.percentile, 0) / secondHalf.length;
        if (avgSecond - avgFirst > 3) trend = "improving";
        else if (avgFirst - avgSecond > 3) trend = "declining";
    }

    return {
        status: "success",
        prediction: {
            averagePercentile: avgPercentile,
            predictedRankRange: bracket.rankRange,
            predictedTier: bracket.predictedTier,
            targetColleges: bracket.colleges,
            verdict: bracket.verdict,
            trend,
            trendEmoji: trend === "improving" ? "📈" : trend === "declining" ? "📉" : "➡️",
            mocksAnalyzed: percentiles.length,
            examBreakdown: percentiles
        }
    };
}
