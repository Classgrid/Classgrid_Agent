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

import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";

/**
 * Check if a given date falls on a marked holiday for the organization.
 * Supports both single-day and multi-day holidays (using end_date).
 *
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {string} orgId - Organization ID
 * @returns {Promise<{isHoliday: boolean, holiday: object|null}>}
 */
export async function isHoliday(date, orgId) {
    if (!date || !orgId) return { isHoliday: false, holiday: null };

    const dateStr = typeof date === "string" ? date.split("T")[0] : new Date(date).toISOString().split("T")[0];

    try {
        // 1. Check legacy/dedicated Holidays Module (Single-day)
        const { data: singleDay, error: e1 } = await supabase
            .from("holidays")
            .select("id, title, date, end_date")
            .eq("org_id", orgId)
            .eq("date", dateStr)
            .eq("is_holiday", true)
            .limit(1);

        if (!e1 && singleDay && singleDay.length > 0) {
            return { isHoliday: true, holiday: singleDay[0] };
        }

        // 2. Check legacy/dedicated Holidays Module (Multi-day)
        const { data: multiDay, error: e2 } = await supabase
            .from("holidays")
            .select("id, title, date, end_date")
            .eq("org_id", orgId)
            .eq("is_holiday", true)
            .not("end_date", "is", null)
            .lte("date", dateStr)
            .gte("end_date", dateStr)
            .limit(1);

        if (!e2 && multiDay && multiDay.length > 0) {
            return { isHoliday: true, holiday: multiDay[0] };
        }

        // 3. Check holidays in the unified V3 Event Engine (org_events)
        const { data: holidays, error } = await supabase
            .from("org_events")
            .select("id, title, start_date, end_date")
            .eq("org_id", orgId)
            .eq("type", "holiday")
            .lte("start_date", `${dateStr}T23:59:59.999Z`);

        if (!error && holidays && holidays.length > 0) {
            // Find if any event holiday covers this date
            const targetTime = new Date(dateStr).getTime();
            
            const matchedHoliday = holidays.find(h => {
                const hStart = new Date(h.start_date).getTime();
                if (!h.end_date) {
                    return new Date(h.start_date).toISOString().split("T")[0] === dateStr;
                }
                const hEnd = new Date(h.end_date).getTime();
                return targetTime >= new Date(h.start_date.split('T')[0]).getTime() && 
                       targetTime <= new Date(h.end_date.split('T')[0]).getTime();
            });

            if (matchedHoliday) {
                return { isHoliday: true, holiday: matchedHoliday };
            }
        }

        return { isHoliday: false, holiday: null };
    } catch (err) {
        console.error("[holidayUtils] isHoliday check failed:", err.message);
        return { isHoliday: false, holiday: null };
    }
}
