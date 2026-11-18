// The AI's memory notes about one person, kept online so every chat on every device knows them (owner, 2026-11-18:
// "from the last 3 days I am talking of my exam but still he doesn't remember anything"; the notes on the computer
// (desktop/aimemory.js) are only in the desktop app). One note per thing: an exam, a deadline, a function or event date,
// a lasting fact. Written by the background reader every 10 messages of a chat and by the AI's own note tools
// (services/ai-memory-notes.js). MongoDB deletes a note by itself when expiresAt passes (TTL): 4 months after its last
// update, or a week after its date when that is later.
import mongoose from "mongoose";

export const MEMORY_NOTE_TYPES = ["exam", "deadline", "event", "study", "work", "project", "preference", "fact"];

const aiMemoryNoteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Short kebab-case name, one per thing (saving with the same name updates the note)
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: MEMORY_NOTE_TYPES, default: "fact" },
    content: { type: String, required: true, maxlength: 1000 },
    // The day the note is about (the exam day, the deadline, the function), when it has one
    date: { type: Date, default: null },
    // auto: the background reader · ai: the AI's tool in a chat
    source: { type: String, enum: ["auto", "ai"], default: "auto" },
    session_id: { type: String, default: null },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

aiMemoryNoteSchema.index({ userId: 1, name: 1 }, { unique: true });
aiMemoryNoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AiMemoryNote || mongoose.model("AiMemoryNote", aiMemoryNoteSchema);
