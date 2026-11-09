// The Calls pages (owner's design, 2026-11-09): the user's calls with Classgrid AI (and the tasks started by their
// WhatsApp messages or emails), and one call's full record. Read-only: nothing here changes a call.
import mongoose from "mongoose";
import Call from "../models/Call.js";

const userIdOf = (req) => req.user?._id || req.user?.id;
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The list (newest first). ?q= looks in the name, the summary and what was said.
export async function listCalls(req, res) {
    try {
        const userId = userIdOf(req);
        const q = String(req.query.q || "").trim().slice(0, 120);
        const where = { user_id: userId };
        if (q) {
            const rx = new RegExp(escapeRegex(q), "i");
            where.$or = [{ name: rx }, { summary: rx }, { project_name: rx }, { "transcript.text": rx }, { "tasks.text": rx }];
        }
        const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
        const calls = await Call.find(where)
            .sort({ started_at: -1 })
            .limit(limit)
            .select("origin name summary status started_at ended_at duration_ms phone project_id project_name project_made wake_at error work.counts work.models work.started_at work.ended_at tasks")
            .lean();
        res.json({
            success: true,
            calls: calls.map((c) => ({
                _id: c._id, origin: c.origin, name: c.name, summary: c.summary, status: c.status,
                started_at: c.started_at, ended_at: c.ended_at, duration_ms: c.duration_ms, phone: c.phone,
                project_id: c.project_id, project_name: c.project_name, project_made: c.project_made,
                wake_at: c.wake_at, error: c.error, tasks: (c.tasks || []).length,
                counts: c.work?.counts || {}, models: c.work?.models || [],
                work_started_at: c.work?.started_at || null, work_ended_at: c.work?.ended_at || null,
            })),
        });
    } catch (e) {
        console.error("[calls] list failed:", e.message);
        res.status(500).json({ success: false, error: "The calls could not be loaded." });
    }
}

// One call, with everything recorded for it
export async function getCall(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(404).json({ success: false, error: "This call was not found." });
        const call = await Call.findOne({ _id: id, user_id: userIdOf(req) }).lean();
        if (!call) return res.status(404).json({ success: false, error: "This call was not found." });
        res.json({ success: true, call });
    } catch (e) {
        console.error("[calls] get failed:", e.message);
        res.status(500).json({ success: false, error: "The call could not be loaded." });
    }
}
