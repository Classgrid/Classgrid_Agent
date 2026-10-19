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

import Note from "../models/Note.js";
import NoteVersion from "../models/NoteVersion.js";

// Utility for formatting error responses
function buildErrorResponse(req, message) {
    const traceId = typeof req?.traceId === "string" ? req.traceId.trim() : "";
    const requestId = /^[A-Za-z0-9._:-]{1,128}$/.test(traceId) ? traceId : "";
    return {
        success: false,
        message,
        ...(requestId ? { requestId } : {}),
    };
}

export const getNotes = async (req, res) => {
    try {
        const { date, tag, search, category, visibility, status } = req.query;
        let query = { createdBy: req.user._id };

        // Filter by specific date
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            query.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        }

        if (tag) query.tags = tag;
        if (category) query.category = category;
        if (visibility) query.visibility = visibility;
        if (status) query.status = status;

        // Text search
        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.title = { $regex: `^${escapedSearch}`, $options: "i" };
        }

        const notes = await Note.find(query)
            .sort({ isPinned: -1, createdAt: -1 })
            .lean();

        res.json({
            success: true,
            notes
        });
    } catch (error) {
        console.error("Error fetching notes:", error);
        res.status(500).json(buildErrorResponse(req, "Failed to fetch notes."));
    }
};

export const createNote = async (req, res) => {
    try {
        const { title, content, tags, isPinned, category, icon, status, visibility } = req.body;

        if (!title || !content) {
            return res.status(400).json(buildErrorResponse(req, "Title and content are required."));
        }

        // Strip HTML tags for text search indexing
        const textContent = content.replace(/<[^>]*>?/gm, '');

        const newNote = await Note.create({
            title,
            content,
            textContent,
            tags: Array.isArray(tags) ? tags : [],
            isPinned: !!isPinned,
            category: category || "General",
            icon: icon || "📄",
            status: status || "Published",
            visibility: visibility || "Private",
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            note: newNote
        });
    } catch (error) {
        console.error("Error creating note:", error);
        res.status(500).json(buildErrorResponse(req, "Failed to create note."));
    }
};

export const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, tags, isPinned, category, icon, status, visibility } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) {
            updateData.content = content;
            updateData.textContent = content.replace(/<[^>]*>?/gm, '');
        }
        if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
        if (isPinned !== undefined) updateData.isPinned = !!isPinned;
        if (category !== undefined) updateData.category = category;
        if (icon !== undefined) updateData.icon = icon;
        if (status !== undefined) updateData.status = status;
        if (visibility !== undefined) updateData.visibility = visibility;

        const originalNote = await Note.findOne({ _id: id, createdBy: req.user._id });
        if (!originalNote) {
            return res.status(404).json(buildErrorResponse(req, "Note not found."));
        }

        // Save version before updating
        await NoteVersion.create({
            noteId: originalNote._id,
            title: originalNote.title,
            content: originalNote.content,
            textContent: originalNote.textContent,
            tags: originalNote.tags,
            category: originalNote.category,
            icon: originalNote.icon,
            status: originalNote.status,
            visibility: originalNote.visibility,
            updatedBy: req.user._id
        });

        const updatedNote = await Note.findOneAndUpdate(
            { _id: id, createdBy: req.user._id },
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        );

        res.json({
            success: true,
            note: updatedNote
        });
    } catch (error) {
        console.error("Error updating note:", error);
        res.status(500).json(buildErrorResponse(req, "Failed to update note."));
    }
};

export const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedNote = await Note.findOneAndDelete({
            _id: id,
            createdBy: req.user._id
        });

        if (!deletedNote) {
            return res.status(404).json(buildErrorResponse(req, "Note not found."));
        }

        res.json({
            success: true,
            message: "Note deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).json(buildErrorResponse(req, "Failed to delete note."));
    }
};

export const togglePin = async (req, res) => {
    try {
        const { id } = req.params;

        const note = await Note.findOne({ _id: id, createdBy: req.user._id });
        if (!note) {
            return res.status(404).json(buildErrorResponse(req, "Note not found."));
        }

        note.isPinned = !note.isPinned;
        await note.save();

        res.json({
            success: true,
            note
        });
    } catch (error) {
        console.error("Error toggling pin status:", error);
        res.status(500).json(buildErrorResponse(req, "Failed to toggle pin status."));
    }
};

export const getNoteVersions = async (req, res) => {
    try {
        const { id } = req.params;

        // Make sure user owns the note
        const note = await Note.findOne({ _id: id, createdBy: req.user._id });
        if (!note) {
            return res.status(404).json(buildErrorResponse(req, "Note not found."));
        }

        const versions = await NoteVersion.find({ noteId: id, updatedBy: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            versions
        });
    } catch (error) {
        console.error("Error fetching note versions:", error);
        res.status(500).json(buildErrorResponse(req, "Failed to fetch note versions."));
    }
};

export const getNoteStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const totalNotes = await Note.countDocuments({ createdBy: userId });
        const pinnedNotes = await Note.countDocuments({ createdBy: userId, isPinned: true });
        const privateNotes = await Note.countDocuments({ createdBy: userId, visibility: "Private" });
        const publicNotes = await Note.countDocuments({ createdBy: userId, visibility: { $in: ["Public", "Shared"] } });

        res.json({
            success: true,
            stats: {
                total: totalNotes,
                pinned: pinnedNotes,
                private: privateNotes,
                shared: publicNotes
            }
        });
    } catch (error) {
        console.error("Error fetching note stats:", error);
        res.status(500).json(buildErrorResponse(req, "Failed to fetch stats."));
    }
};
