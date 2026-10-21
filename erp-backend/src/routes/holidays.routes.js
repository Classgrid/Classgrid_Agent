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

import express from "express";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";
import { isHoliday } from "../utils/holidayUtils.js";

const router = express.Router();

// ─────────────────────────────────────────────
// HELPER: Sync Google Calendar Festivals for a given year
// ─────────────────────────────────────────────
async function syncFestivalsForYear(orgId, targetYear) {
    const { data: existing } = await supabase
        .from("holidays")
        .select("id")
        .eq("org_id", orgId)
        .eq("year", targetYear)
        .limit(1);

    if (existing && existing.length > 0) {
        return { message: `Festivals for ${targetYear} already synced.`, synced: 0, alreadySynced: true };
    }

    const icsUrl = "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics";
    const response = await fetch(icsUrl);
    if (!response.ok) throw new Error("Failed to fetch festivals from Google Calendar");

    const icsText = await response.text();
    const events = [];
    const veventBlocks = icsText.split("BEGIN:VEVENT");

    for (let i = 1; i < veventBlocks.length; i++) {
        const block = veventBlocks[i].split("END:VEVENT")[0];
        const summaryMatch = block.match(/SUMMARY:(.+)/);
        const title = summaryMatch ? summaryMatch[1].trim() : null;

        const dateMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{4})(\d{2})(\d{2})/);
        const startDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;

        const endMatch = block.match(/DTEND(?:;VALUE=DATE)?:(\d{4})(\d{2})(\d{2})/);
        let endDate = null;
        if (endMatch) {
            const d = new Date(`${endMatch[1]}-${endMatch[2]}-${endMatch[3]}`);
            d.setDate(d.getDate() - 1);
            const endStr = d.toISOString().split("T")[0];
            endDate = endStr !== startDate ? endStr : null;
        }

        if (title && startDate) {
            const eventYear = parseInt(startDate.split("-")[0]);
            if (eventYear === targetYear) {
                events.push({ title, startDate, endDate, year: eventYear });
            }
        }
    }

    if (events.length === 0) return { message: `No festivals found for ${targetYear}`, synced: 0 };

    const records = events.map(e => ({
        org_id: orgId,
        title: e.title,
        date: e.startDate,
        year: e.year,
        end_date: e.endDate,
        source: "google",
        last_synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from("holidays")
        .upsert(records, { onConflict: "org_id,title,date", ignoreDuplicates: false });

    if (error) throw error;
    
    return { message: `Synced ${records.length} festivals for ${targetYear}`, synced: records.length };
}

// ─────────────────────────────────────────────
// GET / — All holidays for the org
// Supports ?month=YYYY-MM and ?search=text
// ─────────────────────────────────────────────
router.get("/", isAuthenticated, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        if (!orgId) return res.status(400).json({ message: "Organization required" });

        const { month, search, year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        let query = supabase
            .from("holidays")
            .select("*")
            .eq("org_id", orgId)
            .eq("year", targetYear)
            .order("date", { ascending: true });

        if (month) {
            // month format: YYYY-MM
            const start = `${month}-01`;
            const endDate = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0);
            const end = endDate.toISOString().split("T")[0];
            query = query.gte("date", start).lte("date", end);
        }

        if (search) {
            query = query.ilike("title", `%${search}%`);
        }

        let { data, error } = await query;
        if (error) throw error;

        // Auto-sync if exactly 0 holidays exist for this entire year (prevents repeated failed requests if filtering by month but year is empty)
        if (!data || data.length === 0) {
            const { count } = await supabase.from("holidays").select("*", { count: 'exact', head: true }).eq("org_id", orgId).eq("year", targetYear);
            if (count === 0) {
                try {
                    await syncFestivalsForYear(orgId, targetYear);
                    const retry = await query;
                    data = retry.data || [];
                } catch (e) {
                    console.error("[Holidays] Auto-sync failed:", e);
                }
            }
        }

        res.json({ holidays: data || [] });
    } catch (err) {
        console.error("[Holidays] GET / error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET /upcoming — Next 5 days of holidays
// ─────────────────────────────────────────────
router.get("/upcoming", isAuthenticated, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        if (!orgId) return res.status(400).json({ message: "Organization required" });

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + 5);
        const futureStr = futureDate.toISOString().split("T")[0];

        const { data, error } = await supabase
            .from("holidays")
            .select("*")
            .eq("org_id", orgId)
            .eq("is_holiday", true)
            .gte("date", todayStr)
            .lte("date", futureStr)
            .order("date", { ascending: true });

        if (error) throw error;

        // Add countdown info
        const holidays = (data || []).map(h => {
            const hDate = new Date(h.date + "T00:00:00");
            const diffMs = hDate - new Date(todayStr + "T00:00:00");
            const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
            return {
                ...h,
                daysLeft,
                countdownText: daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `in ${daysLeft} days`
            };
        });

        res.json({ holidays });
    } catch (err) {
        console.error("[Holidays] GET /upcoming error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET /today — Is today a holiday?
// ─────────────────────────────────────────────
router.get("/today", isAuthenticated, async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        if (!orgId) return res.status(400).json({ message: "Organization required" });

        const todayStr = new Date().toISOString().split("T")[0];
        const result = await isHoliday(todayStr, orgId);

        res.json(result);
    } catch (err) {
        console.error("[Holidays] GET /today error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// PATCH /:id — Toggle is_holiday (Admin only)
// ─────────────────────────────────────────────
router.patch("/:id", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { is_holiday: newVal } = req.body;
        if (typeof newVal !== "boolean") {
            return res.status(400).json({ message: "is_holiday must be boolean" });
        }

        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        const { data, error } = await supabase
            .from("holidays")
            .update({ is_holiday: newVal })
            .eq("id", req.params.id)
            .eq("org_id", orgId)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") return res.status(404).json({ message: "Holiday not found" });
            throw error;
        }

        res.json({ message: `Holiday ${newVal ? "marked" : "unmarked"}`, holiday: data });
    } catch (err) {
        console.error("[Holidays] PATCH /:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// POST /manual — Add a custom holiday (Admin only)
// ─────────────────────────────────────────────
router.post("/manual", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { title, date, end_date } = req.body;
        if (!title || !date) return res.status(400).json({ message: "Title and date are required" });

        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        const record = {
            org_id: orgId,
            title,
            date,
            year: parseInt(date.split("-")[0]),
            end_date: end_date || null,
            is_holiday: true,
            source: "manual",
        };

        const { data, error } = await supabase
            .from("holidays")
            .upsert(record, { onConflict: "org_id,title,date" })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: "Holiday added", holiday: data });
    } catch (err) {
        console.error("[Holidays] POST /manual error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// POST /sync — Fetch Indian festivals from Google Calendar (Admin only)
// Uses the public iCal (.ics) feed — NO API key needed
// Rate-limited: once per day per org
// ─────────────────────────────────────────────
router.post("/sync", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        if (!orgId) return res.status(400).json({ message: "Organization required" });
        
        const targetYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
        const result = await syncFestivalsForYear(orgId, targetYear);
        res.json(result);
    } catch (err) {
        console.error("[Holidays] POST /sync error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
