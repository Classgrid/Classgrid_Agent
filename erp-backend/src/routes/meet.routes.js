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
import { requireClassroomMember } from "../middleware/classroom.middleware.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import { getChatSb } from "../config/supabaseClient.js";

const router = express.Router();

// ─────────────────────────────────────────────
// GET MEETINGS FOR A CLASSROOM (Student & Teacher)
// ─────────────────────────────────────────────
router.get("/classroom/:classroomId", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const supabase = getChatSb();
        const { data: meetingsData, error } = await supabase
            .from('meetings')
            .select('*')
            .eq('classroom_id', req.params.classroomId)
            .gte('start_time', oneHourAgo)
            .order('start_time', { ascending: true });

        if (error) throw error;

        const meetings = meetingsData.map(m => ({
            _id: m.id,
            classroom: m.classroom_id,
            teacher: m.teacher_id,
            provider: m.provider,
            topic: m.topic,
            join_url: m.join_url,
            start_time: m.start_time,
            duration: m.duration,
            calendar_event_id: m.calendar_event_id
        }));

        res.json({ meetings });
    } catch (err) {
        console.error("Fetch meetings error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET ALL MY MEETINGS ACROSS ALL CLASSROOMS
// ─────────────────────────────────────────────
router.get("/global/me", isAuthenticated, async (req, res) => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let query;

        if (req.user.role === "student") {
            // Find all classes student is in using MongoDB
            const memberships = await ClassroomMembership.find({ student: req.user._id, status: "approved" }).lean();
            const classroomIds = memberships.map(m => m.classroom.toString());

            if (classroomIds.length === 0) {
                return res.json({ meetings: [] });
            }

            // Fetch meetings from Supabase
            const supabase = getChatSb();
            const { data: meetingsData, error } = await supabase
                .from('meetings')
                .select('*')
                .in('classroom_id', classroomIds)
                .gte('start_time', oneHourAgo)
                .order('start_time', { ascending: true });

            if (error) throw error;
            query = meetingsData;

        } else {
            // Teacher: meetings they created
            const supabase = getChatSb();
            const { data: meetingsData, error } = await supabase
                .from('meetings')
                .select('*')
                .eq('teacher_id', req.user._id.toString())
                .gte('start_time', oneHourAgo)
                .order('start_time', { ascending: true });

            if (error) throw error;
            query = meetingsData;
        }

        // Manually Populate Classroom and Teacher Data from MongoDB
        // (Since cross-database joins aren't possible, we fetch the IDs and Hydrate them)
        const classIdsToFetch = [...new Set(query.map(m => m.classroom_id))];
        const teacherIdsToFetch = [...new Set(query.map(m => m.teacher_id))];

        const [classrooms, teachers] = await Promise.all([
            Classroom.find({ _id: { $in: classIdsToFetch } }).select("name subject subjectSlug").lean(),
            User.find({ _id: { $in: teacherIdsToFetch } }).select("name profilePicture email").lean()
        ]);

        const classMap = {};
        classrooms.forEach(c => classMap[c._id.toString()] = c);

        const teacherMap = {};
        teachers.forEach(t => teacherMap[t._id.toString()] = t);

        const meetings = query.map(m => ({
            _id: m.id,
            classroom: classMap[m.classroom_id] || { _id: m.classroom_id, name: 'Unknown' },
            teacher: teacherMap[m.teacher_id] || { _id: m.teacher_id, name: 'Unknown' },
            provider: m.provider,
            topic: m.topic,
            join_url: m.join_url,
            start_time: m.start_time,
            duration: m.duration,
            calendar_event_id: m.calendar_event_id
        }));

        res.json({ meetings });
    } catch (err) {
        console.error("Global meetings error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// ─────────────────────────────────────────────
// GET SINGLE MEETING BY ID (Faculty + Students)
// ─────────────────────────────────────────────
router.get("/:id", isAuthenticated, async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: meeting, error } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !meeting) return res.status(404).json({ message: "Meeting not found" });

        // Hydrate classroom + teacher info safely
        let classroom = null;
        let teacher = null;
        try {
            [classroom, teacher] = await Promise.all([
                Classroom.findById(meeting.classroom_id).select("name subject subjectSlug").lean(),
                User.findById(meeting.teacher_id).select("name email profilePicture").lean()
            ]);
        } catch (dbErr) {
            console.warn("Hydration error (invalid ObjectId?):", dbErr.message);
        }

        res.json({
            meeting: {
                _id: meeting.id,
                classroom: classroom || { _id: meeting.classroom_id, name: 'Unknown' },
                teacher: teacher || { _id: meeting.teacher_id, name: 'Unknown' },
                provider: meeting.provider,
                topic: meeting.topic,
                description: meeting.description,
                join_url: meeting.join_url,
                start_time: meeting.start_time,
                duration: meeting.duration,
                calendar_event_id: meeting.calendar_event_id,
            }
        });
    } catch (err) {
        console.error("Get meeting error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// UPDATE MEETING (Faculty only — owner only)
// ─────────────────────────────────────────────
router.put("/:id", isAuthenticated, async (req, res) => {
    try {
        const { topic, description, start_time, duration } = req.body;

        const supabase = getChatSb();
        // Fetch existing meeting
        const { data: existing, error: fetchErr } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ message: "Meeting not found" });

        // Only the creator can update
        if (existing.teacher_id !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to update this meeting" });
        }

        const updates = {};
        if (topic)       updates.topic = topic;
        if (description !== undefined) updates.description = description;
        if (start_time)  updates.start_time = start_time;
        if (duration)    updates.duration = Number(duration);

        const { data: updated, error: updateErr } = await supabase
            .from('meetings')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        res.json({ message: "Meeting updated", meeting: { _id: updated.id, ...updated } });
    } catch (err) {
        console.error("Update meeting error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
