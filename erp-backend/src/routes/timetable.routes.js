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
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import User from "../models/User.js";

const router = express.Router();
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ══════════════════════════════════════════════════════════════════════════
// HELPER: Get today's day name
// ══════════════════════════════════════════════════════════════════════════
function getTodayName() {
    return DAYS[new Date().getDay() - 1] || null; // Sunday = null (no classes)
}

// ══════════════════════════════════════════════════════════════════════════
// HELPER: Check for time overlap conflicts
// Returns the conflicting slot if overlap found, null otherwise
// ══════════════════════════════════════════════════════════════════════════
async function checkSlotConflict(divisionId, day, startTime, endTime, excludeId = null) {
    // Fetch all existing slots for this division + day
    let query = supabase
        .from("timetable_slots")
        .select("*")
        .eq("division_id", divisionId)
        .eq("day", day);

    if (excludeId) query = query.neq("id", excludeId);

    const { data: existing } = await query;
    if (!existing || existing.length === 0) return null;

    // Check overlap: new slot overlaps if its start < existing end AND its end > existing start
    const conflict = existing.find(slot => {
        return startTime < slot.end_time && endTime > slot.start_time;
    });

    return conflict || null;
}

async function checkExtraConflict(divisionId, date, startTime, endTime) {
    // Check against regular timetable slots for the day
    const dayName = DAYS[new Date(date).getDay() - 1];
    if (dayName) {
        const regularConflict = await checkSlotConflict(divisionId, dayName, startTime, endTime);
        if (regularConflict) return { ...regularConflict, source: 'regular' };
    }

    // Check against other extra lectures on the same date
    const { data: extras } = await supabase
        .from("extra_lectures")
        .select("*")
        .eq("division_id", divisionId)
        .eq("date", date);

    const conflict = (extras || []).find(ex => {
        return startTime < ex.end_time && endTime > ex.start_time;
    });

    return conflict ? { ...conflict, source: 'extra' } : null;
}

// ══════════════════════════════════════════════════════════════════════════
// 1. GET /division/:divisionId — Full weekly schedule for a division
// ══════════════════════════════════════════════════════════════════════════
router.get("/division/:divisionId", isAuthenticated, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("timetable_slots")
            .select("*")
            .eq("division_id", req.params.divisionId)
            .order("start_time", { ascending: true });

        if (error) throw error;

        // Group by day
        const grouped = {};
        DAYS.forEach(d => { grouped[d] = []; });
        (data || []).forEach(slot => {
            if (grouped[slot.day]) grouped[slot.day].push(slot);
        });

        res.json({ slots: data || [], grouped });
    } catch (err) {
        console.error("[Timetable] GET /division/:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 2. GET /division/:divisionId/today — Today's merged schedule
//    Merges regular slots + extra lectures for today
// ══════════════════════════════════════════════════════════════════════════
router.get("/division/:divisionId/today", isAuthenticated, async (req, res) => {
    try {
        const todayName = getTodayName();
        const todayDate = new Date().toISOString().split("T")[0];

        // Fetch regular slots for today's day
        const regularPromise = todayName
            ? supabase
                .from("timetable_slots")
                .select("*")
                .eq("division_id", req.params.divisionId)
                .eq("day", todayName)
                .order("start_time", { ascending: true })
            : Promise.resolve({ data: [] });

        // Fetch extra lectures for today's date
        const extraPromise = supabase
            .from("extra_lectures")
            .select("*")
            .eq("division_id", req.params.divisionId)
            .eq("date", todayDate)
            .order("start_time", { ascending: true });

        const [regularResult, extraResult] = await Promise.all([regularPromise, extraPromise]);

        const regular = (regularResult.data || []).map(s => ({ ...s, is_extra: false }));
        const extras = (extraResult.data || []).map(s => ({ ...s, is_extra: true }));

        // Merge and sort by start_time
        const merged = [...regular, ...extras].sort((a, b) =>
            a.start_time.localeCompare(b.start_time)
        );

        res.json({ schedule: merged, day: todayName, date: todayDate });
    } catch (err) {
        console.error("[Timetable] GET /today error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 3. GET /me/today — Auto-detect user's division → today's schedule
//    For students and faculty
// ══════════════════════════════════════════════════════════════════════════
router.get("/me/today", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const todayName = getTodayName();
        const todayDate = new Date().toISOString().split("T")[0];

        let divisionId = null;

        if (req.user.role === "student") {
            // Get student's division from their profile
            const student = await User.findById(userId).select("division_id");
            divisionId = student?.division_id;
        }

        // For faculty: get all divisions they're assigned to
        let teacherSchedule = [];
        if (["teacher", "faculty"].includes(req.user.role)) {
            // Get all slots where this teacher is assigned
            if (todayName) {
                const { data } = await supabase
                    .from("timetable_slots")
                    .select("*")
                    .eq("teacher_id", userId)
                    .eq("day", todayName)
                    .order("start_time", { ascending: true });
                teacherSchedule = (data || []).map(s => ({ ...s, is_extra: false }));
            }

            // Also get extra lectures assigned to this teacher today
            const { data: extras } = await supabase
                .from("extra_lectures")
                .select("*")
                .eq("teacher_id", userId)
                .eq("date", todayDate)
                .order("start_time", { ascending: true });

            teacherSchedule = [
                ...teacherSchedule,
                ...(extras || []).map(s => ({ ...s, is_extra: true }))
            ].sort((a, b) => a.start_time.localeCompare(b.start_time));

            return res.json({ schedule: teacherSchedule, day: todayName, date: todayDate });
        }

        if (!divisionId) {
            return res.json({ schedule: [], day: todayName, date: todayDate, message: "No division assigned" });
        }

        // Student: fetch regular + extra for their division
        const regularPromise = todayName
            ? supabase
                .from("timetable_slots")
                .select("*")
                .eq("division_id", divisionId)
                .eq("day", todayName)
                .order("start_time", { ascending: true })
            : Promise.resolve({ data: [] });

        const extraPromise = supabase
            .from("extra_lectures")
            .select("*")
            .eq("division_id", divisionId)
            .eq("date", todayDate)
            .order("start_time", { ascending: true });

        const [r, e] = await Promise.all([regularPromise, extraPromise]);

        const merged = [
            ...(r.data || []).map(s => ({ ...s, is_extra: false })),
            ...(e.data || []).map(s => ({ ...s, is_extra: true }))
        ].sort((a, b) => a.start_time.localeCompare(b.start_time));

        res.json({ schedule: merged, day: todayName, date: todayDate });
    } catch (err) {
        console.error("[Timetable] GET /me/today error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 4. POST /division/:divisionId — Add a single slot
// ══════════════════════════════════════════════════════════════════════════
router.post("/division/:divisionId", isAuthenticated, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.status(403).json({ message: "Students cannot manage timetable" });
        }

        const { day, start_time, end_time, subject, teacher_name, teacher_id, room, type, force } = req.body;
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        // 🔥 Conflict Detection
        if (!force) {
            const conflict = await checkSlotConflict(req.params.divisionId, day, start_time, end_time);
            if (conflict) {
                return res.status(409).json({
                    message: `Time conflict: overlaps with "${conflict.subject}" (${conflict.start_time}–${conflict.end_time})`,
                    conflict,
                    needs_force: true
                });
            }
        }

        const { data, error } = await supabase
            .from("timetable_slots")
            .insert({
                org_id: orgId,
                division_id: req.params.divisionId,
                day,
                start_time,
                end_time,
                subject,
                teacher_name: teacher_name || req.user.name,
                teacher_id: teacher_id || req.user._id.toString(),
                room: room || null,
                type: type || "lecture"
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return res.status(409).json({ message: "A slot already exists at this time for this day" });
            }
            throw error;
        }

        res.status(201).json({ slot: data });
    } catch (err) {
        console.error("[Timetable] POST /division/:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 5. POST /division/:divisionId/bulk — Bulk save an entire day's slots
//    Replaces ALL slots for the given day + division
// ══════════════════════════════════════════════════════════════════════════
router.post("/division/:divisionId/bulk", isAuthenticated, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.status(403).json({ message: "Students cannot manage timetable" });
        }

        const { day, slots } = req.body;
        if (!day || !DAYS.includes(day)) {
            return res.status(400).json({ message: "Invalid day" });
        }

        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        const divisionId = req.params.divisionId;

        // 1. Delete existing slots for this division + day
        await supabase
            .from("timetable_slots")
            .delete()
            .eq("division_id", divisionId)
            .eq("day", day);

        // 2. Insert new slots
        if (slots && slots.length > 0) {
            const rows = slots.map(s => ({
                org_id: orgId,
                division_id: divisionId,
                day,
                start_time: s.start_time,
                end_time: s.end_time,
                subject: s.subject,
                teacher_name: s.teacher_name || "",
                teacher_id: s.teacher_id || null,
                room: s.room || null,
                type: s.type || "lecture"
            }));

            const { data, error } = await supabase
                .from("timetable_slots")
                .insert(rows)
                .select();

            if (error) throw error;
            return res.json({ message: `${day} timetable saved`, slots: data });
        }

        res.json({ message: `${day} timetable cleared`, slots: [] });
    } catch (err) {
        console.error("[Timetable] POST /bulk error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 6. PUT /:slotId — Update a single slot
// ══════════════════════════════════════════════════════════════════════════
router.put("/:slotId", isAuthenticated, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.status(403).json({ message: "Students cannot manage timetable" });
        }

        const { subject, teacher_name, teacher_id, room, type, start_time, end_time } = req.body;
        const updates = {};
        if (subject !== undefined) updates.subject = subject;
        if (teacher_name !== undefined) updates.teacher_name = teacher_name;
        if (teacher_id !== undefined) updates.teacher_id = teacher_id;
        if (room !== undefined) updates.room = room;
        if (type !== undefined) updates.type = type;
        if (start_time !== undefined) updates.start_time = start_time;
        if (end_time !== undefined) updates.end_time = end_time;

        const { data, error } = await supabase
            .from("timetable_slots")
            .update(updates)
            .eq("id", req.params.slotId)
            .select()
            .single();

        if (error) throw error;
        res.json({ slot: data });
    } catch (err) {
        console.error("[Timetable] PUT /:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 7. DELETE /:slotId — Delete a single slot
// ══════════════════════════════════════════════════════════════════════════
router.delete("/:slotId", isAuthenticated, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.status(403).json({ message: "Students cannot manage timetable" });
        }

        const { error } = await supabase
            .from("timetable_slots")
            .delete()
            .eq("id", req.params.slotId);

        if (error) throw error;
        res.json({ message: "Slot deleted" });
    } catch (err) {
        console.error("[Timetable] DELETE /:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 8. POST /extra — Add an extra lecture (any assigned faculty)
// ══════════════════════════════════════════════════════════════════════════
router.post("/extra", isAuthenticated, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.status(403).json({ message: "Students cannot add extra lectures" });
        }

        const { division_id, date, start_time, end_time, subject, teacher_name, teacher_id, room, force } = req.body;
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        // 🔥 Conflict Detection (checks both regular slots AND other extras)
        if (!force) {
            const conflict = await checkExtraConflict(division_id, date, start_time, end_time);
            if (conflict) {
                return res.status(409).json({
                    message: `Time conflict: overlaps with "${conflict.subject}" (${conflict.start_time}–${conflict.end_time}) [${conflict.source}]`,
                    conflict,
                    needs_force: true
                });
            }
        }

        const { data, error } = await supabase
            .from("extra_lectures")
            .insert({
                org_id: orgId,
                division_id,
                date,
                start_time,
                end_time,
                subject,
                teacher_name: teacher_name || req.user.name,
                teacher_id: teacher_id || req.user._id.toString(),
                room: room || null,
                added_by: req.user._id.toString()
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: "Extra lecture added", lecture: data });
    } catch (err) {
        console.error("[Timetable] POST /extra error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 9. GET /extra/division/:divisionId — Upcoming extra lectures
// ══════════════════════════════════════════════════════════════════════════
router.get("/extra/division/:divisionId", isAuthenticated, async (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0];

        const { data, error } = await supabase
            .from("extra_lectures")
            .select("*")
            .eq("division_id", req.params.divisionId)
            .gte("date", today)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true });

        if (error) throw error;
        res.json({ extras: data || [] });
    } catch (err) {
        console.error("[Timetable] GET /extra error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 10. DELETE /extra/:id — Delete an extra lecture
// ══════════════════════════════════════════════════════════════════════════
router.delete("/extra/:id", isAuthenticated, async (req, res) => {
    try {
        if (req.user.role === "student") {
            return res.status(403).json({ message: "Not allowed" });
        }

        const { error } = await supabase
            .from("extra_lectures")
            .delete()
            .eq("id", req.params.id);

        if (error) throw error;
        res.json({ message: "Extra lecture deleted" });
    } catch (err) {
        console.error("[Timetable] DELETE /extra/:id error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
