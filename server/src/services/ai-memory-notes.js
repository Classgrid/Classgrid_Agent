// The AI's online memory notes (owner, 2026-11-18): exam dates, deadlines, functions and lasting facts a person
// mentions in a chat are kept in MongoDB (models/AiMemoryNote.js), so every later chat knows them, on the website, the
// phone and the desktop app.
//   - notesFromChat: after an answer is saved, once a chat has 10 new messages, a small model reads only those new
//     messages and the person's saved notes, and saves, updates or deletes notes. It runs in the background, never
//     before the answer ends, and nobody is charged for it.
//   - the note tools (tool group memory_notes): the AI saves, searches and deletes a note itself in a chat.
//   - savedNotesBlock: the notes are added to the prompt of every chat.
// A note is deleted by MongoDB 4 months after its last update (or a week after its date when that is later).
// Incognito chats and shared chats are never read (the caller skips them).
import AiMemoryNote, { MEMORY_NOTE_TYPES } from "../models/AiMemoryNote.js";

export const NOTES_EVERY = 10;          // new messages in a chat before the reader runs again
export const NOTE_KEEP_DAYS = 120;      // 4 months
export const MAX_NOTES_PER_USER = 200;
const MAX_NOTES_IN_PROMPT = 50;
const MAX_CONTENT = 600;
const READ_AT_MOST = 40;                // messages read in one run
const MESSAGE_CHARS = 1500;
const DAY = 24 * 3600 * 1000;
const NOTES_MODEL = "@cf/deepseek-ai/deepseek-v4.1-flash-1017";

// Never kept in a note
const SECRET = /\b(pass(word|code)?|otp|cvv|pin|api[\s_-]?key|secret|token|card\s*(no|number)|account\s*(no|number)|aadhaa?r|pan\s*(no|number))\b\s*(is|[:=])/i;

/** A short kebab-case name ("DSA Exam!" -> "dsa-exam"). */
export function noteName(raw) {
    return String(raw ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** A real date from "2026-11-25" (or an ISO date-time); null for anything else. */
export function noteDate(raw) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw ?? "").trim());
    if (!m) return null;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? d : null;
}

/** When MongoDB deletes the note: 4 months from now, or a week after its date when that is later (at most 2 years). */
export function noteExpiry(date, now = Date.now()) {
    const base = now + NOTE_KEEP_DAYS * DAY;
    const afterDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() + 7 * DAY : 0;
    return new Date(Math.min(Math.max(base, afterDate), now + 730 * DAY));
}

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const noteLine = (n) => `- [${n.type || "fact"}] ${n.name}${n.date ? ` (${day(n.date)})` : ""}: ${String(n.content || "").replace(/\s+/g, " ").trim()}`;

/** The person's notes, newest first. */
export async function savedNotesOf(userId) {
    if (!userId) return [];
    return AiMemoryNote.find({ userId }).sort({ updatedAt: -1 }).limit(MAX_NOTES_PER_USER).lean();
}

/** Save a note, or update the note with the same name. Returns { note, created } or { error }. */
export async function saveNote({ userId, name, content, type, date, sessionId = null, source = "ai" }, now = Date.now()) {
    const cleanName = noteName(name);
    const text = String(content ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CONTENT);
    if (!userId) return { error: "sign in first." };
    if (!cleanName) return { error: "the note needs a name." };
    if (!text) return { error: "the note needs content." };
    if (SECRET.test(text)) return { error: "passwords, codes, keys, card and account numbers are never kept in notes." };
    const have = await AiMemoryNote.findOne({ userId, name: cleanName }).lean();
    if (!have && (await AiMemoryNote.countDocuments({ userId })) >= MAX_NOTES_PER_USER) {
        return { error: `there are already ${MAX_NOTES_PER_USER} notes; delete one first.` };
    }
    const when = date === undefined && have ? have.date : noteDate(date);
    const set = {
        content: text,
        type: MEMORY_NOTE_TYPES.includes(type) ? type : (have?.type || "fact"),
        date: when || null,
        source,
        expiresAt: noteExpiry(when, now),
    };
    if (sessionId) set.session_id = String(sessionId);
    const note = await AiMemoryNote.findOneAndUpdate(
        { userId, name: cleanName }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return { note, created: !have };
}

export async function deleteNote({ userId, name }) {
    if (!userId) return false;
    const result = await AiMemoryNote.deleteOne({ userId, name: noteName(name) });
    return (result?.deletedCount || 0) > 0;
}

/** Notes that hold every word of the query (in the name, type, date or content); all the notes for an empty query. */
export async function searchNotes({ userId, query }) {
    const words = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const notes = await savedNotesOf(userId);
    if (!words.length) return notes;
    return notes.filter((n) => {
        const hay = `${n.name} ${n.type} ${day(n.date)} ${n.content}`.toLowerCase();
        return words.every((w) => hay.includes(w));
    });
}

/** The notes as a block of the chat's prompt ("" when there are none). Dated notes still ahead come first. */
export function savedNotesBlock(notes, now = Date.now()) {
    const list = (Array.isArray(notes) ? notes : []).filter((n) => n?.name && n?.content);
    if (!list.length) return "";
    const ahead = (n) => (n.date && new Date(n.date).getTime() >= now - DAY ? new Date(n.date).getTime() : Infinity);
    const sorted = [...list].sort((a, b) => ahead(a) - ahead(b) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)).slice(0, MAX_NOTES_IN_PROMPT);
    return `\n<saved_notes>\nYour notes about this user, kept online from their earlier chats and known in every chat on every device (each note is deleted by itself 4 months after its last update). Treat them as things you remember: use them without being asked, and compare their dates with today's date (a date that has passed is over). They are what was true when written; the user's newest message wins. To add or correct a note use save_user_note (the same name updates it), to remove one delete_user_note, to look one up search_user_notes; load the memory_notes tools first when they are not loaded.\n${sorted.map(noteLine).join("\n")}\n</saved_notes>\n`;
}

// ── The AI's own tools (tool group memory_notes in ai-tool-groups.js) ──
export const SAVED_NOTE_TOOLS = [
    {
        type: "function",
        function: {
            name: "save_user_note",
            description: "Save (or update) one note in your online memory about the user, kept in their Classgrid account so every future chat on every device knows it. Use it by yourself, without being asked, when the user tells an exam (subject, date, syllabus), a deadline, a function or event with its date, or a lasting fact about their studies, work or projects. One note per thing; saving with the same name updates that note. Write dates as real dates. Never save passwords, codes, keys, card or account numbers. The note is deleted by itself 4 months after its last update. Saving is quiet: do not announce it.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "A short name in kebab-case, like dsa-exam or sister-wedding." },
                    content: { type: "string", description: "The fact itself in one or two short sentences, with real dates (2026-11-25, not \"next Wednesday\")." },
                    type: { type: "string", enum: MEMORY_NOTE_TYPES, description: "What kind of note." },
                    date: { type: "string", description: "The day the note is about as YYYY-MM-DD (the exam day, the deadline, the function), when it has one." },
                },
                required: ["name", "content"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "search_user_notes",
            description: "Search your online memory notes about the user for words (in their names, dates and text). An empty query lists every note. Use it before you say you don't know something the user may have told you in another chat.",
            parameters: { type: "object", properties: { query: { type: "string", description: "The word or words to look for, like exam, wedding, dsa. Empty = all notes." } } },
        },
    },
    {
        type: "function",
        function: {
            name: "delete_user_note",
            description: "Delete one of your online memory notes about the user, when it turned out wrong, is over, or the user asks you to forget it.",
            parameters: { type: "object", properties: { name: { type: "string", description: "The note's name, as shown in your notes." } }, required: ["name"] },
        },
    },
];

/** The handlers for the AI chat (user = the chat's signed-in user; onChange is called after a note changed). */
export function buildSavedNoteHandlers({ user, sessionId = null, onChange = () => {} }) {
    const guard = (run) => async (args) => {
        if (!user?._id) return "Error: sign in first.";
        try { return await run(args && typeof args === "object" ? args : {}); } catch (e) { return `Error: ${e.message}`; }
    };
    return {
        save_user_note: guard(async (args) => {
            const out = await saveNote({ userId: user._id, name: args.name, content: args.content, type: args.type, date: args.date, sessionId, source: "ai" });
            if (out.error) return `Error: ${out.error}`;
            onChange();
            return `${out.created ? "Saved" : "Updated"} the note "${out.note.name}". It is kept until ${day(out.note.expiresAt)}. Do not announce this save in your reply.`;
        }),
        search_user_notes: guard(async (args) => {
            const found = await searchNotes({ userId: user._id, query: args.query });
            if (!found.length) return args.query ? `No note holds "${args.query}".` : "There are no notes yet.";
            return `${found.length} note(s):\n${found.map(noteLine).join("\n")}`;
        }),
        delete_user_note: guard(async (args) => {
            const gone = await deleteNote({ userId: user._id, name: args.name });
            if (gone) onChange();
            return gone ? `Deleted the note "${noteName(args.name)}".` : `Error: there is no note named "${noteName(args.name)}".`;
        }),
    };
}

// ── The background reader ──
export const NOTES_READER_INSTRUCTIONS = `You keep a person's memory notes for their AI assistant. You are given TODAY's date, the notes already SAVED, and the NEW MESSAGES of one chat. Decide what is worth remembering in the person's other chats over the coming months.

Save: exams and tests (subject, date, syllabus, marks), deadlines and submissions, functions and events with their dates (weddings, festivals, interviews, trips, meetings), their course, college, class and subjects, their job and projects, and strong lasting preferences.
Never save: one-off questions, code or debugging details, what the assistant did, guesses, anything about other people's private lives, and never passwords, codes, keys, card, bank or ID numbers.

Rules:
- Take facts only from what the USER wrote. The assistant's messages are only there to understand them.
- Turn relative dates ("tomorrow", "next Monday", "on the 25th") into real dates with TODAY, written YYYY-MM-DD.
- If a SAVED note already covers the same thing, reuse its exact name and write the full updated content, not only the change. Do not save a note again when nothing in it changed.
- Delete a SAVED note only when the messages say it is wrong, cancelled or finished.
- name: short kebab-case, like dsa-exam. content: one or two short sentences, at most 300 characters. At most 6 notes.
- type is one of: ${MEMORY_NOTE_TYPES.join(", ")}.

Output only JSON, nothing before or after:
{"save":[{"name":"dsa-exam","type":"exam","date":"2026-11-25","content":"DSA (Data Structures) semester exam on 2026-11-25; syllabus: stacks, queues, trees."}],"delete":["old-note-name"]}
When nothing is worth saving, output {"save":[],"delete":[]}.`;

/** The reader's answer as { save: [...], delete: [...] } (empty for anything that is not the JSON asked for). */
export function parseReaderAnswer(answer) {
    const text = String(answer ?? "");
    const from = text.indexOf("{"), to = text.lastIndexOf("}");
    if (from < 0 || to <= from) return { save: [], delete: [] };
    try {
        const out = JSON.parse(text.slice(from, to + 1));
        const save = (Array.isArray(out?.save) ? out.save : [])
            .filter((n) => n && typeof n === "object" && noteName(n.name) && String(n.content ?? "").trim())
            .slice(0, 6)
            .map((n) => ({ name: noteName(n.name), type: n.type, date: n.date, content: String(n.content) }));
        const del = (Array.isArray(out?.delete) ? out.delete : []).map(noteName).filter(Boolean).slice(0, 6);
        return { save, delete: del };
    } catch { return { save: [], delete: [] }; }
}

// A saved answer can be JSON ({ classgrid_ai_message, content, steps }): only its text is read
function messageText(content) {
    const text = String(content ?? "");
    if (text.trim().startsWith("{")) {
        try { const inner = JSON.parse(text); if (inner?.classgrid_ai_message) return String(inner.content || ""); } catch { /* not JSON */ }
    }
    return text;
}

/** What the reader is given. */
export function readerInput({ notes, messages, now = Date.now() }) {
    const saved = notes.length ? notes.map(noteLine).join("\n") : "(none)";
    const lines = messages.map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${messageText(m.content).slice(0, MESSAGE_CHARS)}`);
    return `TODAY: ${new Date(now + 5.5 * 3600 * 1000).toISOString().slice(0, 10)} (India)\n\nSAVED:\n${saved}\n\nNEW MESSAGES:\n${lines.join("\n\n")}`;
}

async function askReader(input) {
    const { streamChat } = await import("./llm-stream.js");
    const result = await streamChat({
        provider: {
            name: "cloudflare",
            url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${NOTES_MODEL}`,
            apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN || "",
            model: NOTES_MODEL,
            timeoutMs: 60000,
        },
        messages: [{ role: "system", content: NOTES_READER_INSTRUCTIONS }, { role: "user", content: input }],
        tools: [],
        maxTokens: 3000, // (Flash reasons first; room for the JSON after the reasoning)
        maxToolDepth: 0,
        timeoutMs: 60000,
        // (the Cloudflare cap had no room: a small Claude model reads instead, or nothing when Claude is switched off)
        capStandIn: async () => {
            const m = await import("./cap-fallback.service.js");
            const model = m.claudeFor("small", await m.claudeSwitches());
            return model ? { model } : null;
        },
    });
    if (result.standIn && result.usage?.total_tokens > 0) {
        import("../models/AiUsageLog.js").then(({ default: AiUsageLog }) => AiUsageLog.create({
            organization_id: null, userId: null, provider: "anthropic", model: result.servedModel || result.standIn.model, feature: "other",
            promptTokens: result.usage.prompt_tokens || 0, completionTokens: result.usage.completion_tokens || 0,
            totalTokens: result.usage.total_tokens, success: true, metadata: { purpose: "memory_notes" },
        })).catch((e) => console.error("[Memory notes] usage log failed:", e.message));
    }
    return String(result.answer || "").trim();
}

/**
 * Background: once the chat has NOTES_EVERY new messages since the last run, read only those messages and keep the
 * person's notes up to date. Returns true when a note changed. Never throws.
 * (ask is the model call; tests pass their own.)
 */
export async function notesFromChat({ sessionId, userId, ask = askReader, now = Date.now() }) {
    if (!sessionId || !userId) return false;
    const lockKey = `ai:memnotes:lock:${sessionId}`;
    try {
        const redis = (await import("../config/redis.js")).default;
        const { primarySupabaseClient } = await import("../config/supabaseClient.js");
        const coveredKey = `ai:memnotes:covered:${sessionId}`;
        const { count, error } = await primarySupabaseClient
            .from("ai_chat_messages").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
        if (error || !count) return false;
        const covered = Math.min(Number(await redis.get(coveredKey)) || 0, count);
        if (count - covered < NOTES_EVERY) return false;
        // One run at a time per chat. A run that fails leaves the lock to run out, so it is tried again 10 minutes
        // later at the earliest, not after every answer.
        if (!(await redis.set(lockKey, "1", "EX", 600, "NX"))) return false;

        const from = Math.max(covered, count - READ_AT_MOST);
        const { data: messages, error: readError } = await primarySupabaseClient
            .from("ai_chat_messages").select("role, content, created_at")
            .eq("session_id", sessionId).order("created_at", { ascending: true }).range(from, count - 1);
        if (readError || !messages?.length) return false;

        let changed = false;
        // (a chat where the person wrote nothing new has nothing to remember: no model call)
        if (messages.some((m) => m.role === "user" && String(m.content || "").trim())) {
            const notes = await savedNotesOf(userId);
            const plan = parseReaderAnswer(await ask(readerInput({ notes, messages, now })));
            const known = new Set(notes.map((n) => n.name));
            for (const name of plan.delete) {
                if (known.has(name) && !plan.save.some((n) => n.name === name) && await deleteNote({ userId, name })) changed = true;
            }
            for (const n of plan.save) {
                const out = await saveNote({ userId, ...n, sessionId, source: "auto" }, now);
                if (!out.error) changed = true;
            }
        }
        await redis.set(coveredKey, String(count), "EX", 60 * 24 * 3600);
        await redis.del(lockKey);
        return changed;
    } catch (e) {
        console.error("[Memory notes] reader failed:", e.message);
        return false;
    }
}
