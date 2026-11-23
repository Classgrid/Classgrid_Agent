// Waking a chat when its background work finishes after its answer has ended (like Claude Code and Antigravity):
// helpers that were still working, or a long command on the user's computer. The server runs a new AI turn in that
// chat with the results (a hidden "[SYSTEM: ...]" message), saved like any answer, and tells the user's open app to
// show it. If the chat is answering right then, the results wait and the chat is woken when that answer ends.
import redis from "../config/redis.js";
import User from "../models/User.js";
import { getIO } from "./socket.service.js";

const PENDING = (sessionId) => `chatwake:pending:${sessionId}`;
const LOCK = (sessionId) => `chatwake:lock:${sessionId}`;
const META = (sessionId) => `chatwake:meta:${sessionId}`;
const WORKING = (userId) => `ai:working:${userId}`;
const DAY = 24 * 60 * 60;
// The longest note a chat is woken with. Anything longer is cut, so a caller with more to say must keep the rest
// where the woken AI can read it (a helper's report: utils/helper-reports.js). It was 12,000, which cut helpers'
// reports (one can be 40,000 characters) and a workflow's results (run_workflow sends up to 30,000). Owner,
// 2026-11-17: "make it more than 70 thousand".
export const WAKE_NOTE_MAX = 80000;

/** Remember how a chat was last used (website or desktop app, which mode), so a woken turn runs the same way */
export async function rememberChatMeta(sessionId, meta) {
    if (!sessionId) return;
    await redis.set(META(sessionId), JSON.stringify(meta), "EX", 7 * DAY).catch(() => {});
}

/**
 * The model and effort the person last picked in this chat, for a turn Classgrid starts by itself in it: a sleeping
 * task woken at its time (agent-task.service.js wakeTask). Empty when the chat has none saved.
 * (owner, 2026-11-22: a test started on Claude Sonnet 5.5 slept three times, and every wake-up ran on DeepSeek V4.1
 * Flash, the default, because the wake-up didn't send the chat's model; a finished background job's wake-up did.)
 */
export async function chatModelChoice(sessionId) {
    if (!sessionId) return {};
    let meta = {};
    try { meta = JSON.parse((await redis.get(META(sessionId))) || "{}"); } catch { /* none */ }
    return { ...(meta.selectedModel ? { selectedModel: meta.selectedModel } : {}), ...(meta.effort ? { effort: meta.effort } : {}) };
}

const tell = (userId, data) => { try { getIO().to(String(userId)).emit("chat:woke", data); } catch { /* no socket server */ } };
// The events of a woken answer the open chat shows live
const LIVE_EVENTS = new Set(["token", "thought", "tool_start", "tool_result", "status"]);

/**
 * What the person's open app is told while a chat is being woken by something other than runWake below: the same
 * three things runWake sends (the chat woke, the answer's thinking, steps and words as they are written, the answer
 * ended), so the answer appears in the open chat by itself. Used by a background task's wake-up (agent-task.service.js
 * wakeTask: a chat whose AI used sleep_until). Until 2026-11-21 that wake-up ran the answer and saved it in the chat
 * but told the app nothing, so the person saw no answer until they sent a message themselves (owner: "he never wakes
 * up now, he needs my own message to wake up"; the server's log showed him woken and answering on time).
 */
export function wokenChatEvents(userId, sessionId) {
    let open = false;
    return {
        start(note) { open = true; tell(userId, { sessionId, phase: "start", note }); },
        event(data) {
            if (!open || !LIVE_EVENTS.has(data?.type)) return;
            const event = data.type === "tool_result" ? { ...data, result: String(data.result ?? "").slice(0, 4000) } : data;
            try { getIO().to(String(userId)).emit("chat:woke-live", { sessionId, event }); } catch { /* no socket server */ }
        },
        end() { if (open) { open = false; tell(userId, { sessionId, phase: "end" }); } },
    };
}

/**
 * Background work of a chat finished. note: what finished and its result (plain text for the AI).
 * The chat is woken now, or when its current answer ends.
 */
export async function wakeChat(userId, sessionId, note) {
    if (!userId || !sessionId || !note) return;
    await redis.multi().rpush(PENDING(sessionId), String(note).slice(0, WAKE_NOTE_MAX)).expire(PENDING(sessionId), DAY).exec().catch(() => {});
    if (!(await chatAnswering(userId, sessionId))) runWake(userId, sessionId).catch((e) => console.warn("[chat wake]", e.message));
}

/** The chat's answer has ended: anything that finished meanwhile wakes it now. (Its end is marked in two steps, the
 * "working" flag and the running-answer key; this goes on the moment both are gone, checking every 100 ms for up to
 * 10 s, so a result that came in during the answer is never left waiting) */
export async function wakeIfPending(userId, sessionId) {
    if (!userId || !sessionId) return;
    for (let i = 0; i < 100; i++) {
        if (!((await redis.llen(PENDING(sessionId)).catch(() => 0)) > 0)) return;
        if (!(await chatAnswering(userId, sessionId))) return runWake(userId, sessionId).catch((e) => console.warn("[chat wake]", e.message));
        await new Promise((r) => setTimeout(r, 100));
    }
}

// The chat is answering the user right now (also in the first seconds of an answer, before it's marked working):
// the results wait and the chat is woken when that answer ends
export async function chatAnswering(userId, sessionId) {
    const working = await redis.hexists(WORKING(String(userId)), String(sessionId)).catch(() => 0);
    const running = await redis.exists(`chat:run:${userId}:${sessionId}`).catch(() => 0);
    return !!(working || running);
}

const HELPER_NOTE = /^Helper (\d+) \([\s\S]*?\) says:\n/;
/** The whole message that wakes a chat with these notes (what finished, or what its working helpers wrote) */
export function wakeQuestion(notes) {
    const writers = new Set(notes.map((n) => n.match(HELPER_NOTE)?.[1]).filter(Boolean));
    const body = notes.join("\n\n---\n\n");
    // (only notes from helpers that are still working: nothing has finished, and the main AI answers the helpers)
    if (writers.size && notes.every((n) => HELPER_NOTE.test(n))) {
        const each = writers.size > 1
            ? ` (${writers.size} helpers wrote, each in its own part above: Helper ${[...writers].join(", Helper ")}). Answer every one of them that asks something or needs a decision, each with its own message_helper call, before you end this answer`
            : ". If it asks something or needs a decision, answer it now with message_helper";
        return `[SYSTEM: background work you started in this chat sent you a message while you were not answering. This message is from Classgrid, not the user.]\n\n${body}\n\nA helper of this chat wrote this to you${each}: a helper that is waiting has your message at once. Tell the user about it only if it matters to them, in a sentence or two. Do not do the helper's work yourself and do not start new long work.`;
    }
    const alsoNotes = writers.size ? ` A part above where a helper "says" something is a message from a helper that is still working (Helper ${[...writers].join(", Helper ")}): answer it with message_helper before you end this answer.` : "";
    return `[SYSTEM: background work you started in this chat has finished while you were not answering. This message is from Classgrid, not the user.]\n\n${body}\n\nTell the user the result now, the way you would mention it in the middle of a conversation: what finished, whether it worked and what it means. If the user's task needs a next step, do it; otherwise don't start new long work.${alsoNotes}`;
}

async function runWake(userId, sessionId) {
    // One woken turn at a time per chat
    if (await chatAnswering(userId, sessionId)) return; // woken when that answer ends (wakeIfPending)
    const got = await redis.set(LOCK(sessionId), "1", "EX", 15 * 60, "NX").catch(() => null);
    if (!got) return; // another wake-up of this chat is running: it takes what is pending when it ends
    let ran = false;
    let remote = null; // a Remote PC chat: the woken answer is followed on the phone too
    try {
        const notes = [];
        for (let n; (n = await redis.lpop(PENDING(sessionId)).catch(() => null)); ) notes.push(n);
        if (!notes.length) return;
        const user = await User.findById(userId).select("-password -verificationToken");
        if (!user) return;
        let meta = {};
        try { meta = JSON.parse((await redis.get(META(sessionId))) || "{}"); } catch { /* none */ }
        ran = true;
        // Several helpers can write in the same moment and come in one message. The closing words said "a helper
        // wrote this" and the main AI answered the first one only: owner's test, 2026-11-23, a helper's question that
        // came together with another helper's finding was never answered, and the helper waited its 5 minutes.
        const question = wakeQuestion(notes);
        // (note: the open chat shows a helper's report from it as "Message from Helper 1: ...", the rest stays hidden)
        tell(userId, { sessionId, phase: "start", note: question });
        // Remote PC (owner, 2026-11-18: the phone shows everything the computer's chat shows, live): the answer the
        // finished work wakes reaches the phone like any other answer in that chat (its question is Classgrid's own, so
        // the phone shows none)
        try {
            const pc = await import("./remote-pc.service.js");
            if (await pc.remoteChatOn(String(userId), sessionId)) {
                remote = pc;
                await pc.remoteTurnStarted(String(userId), sessionId, { question: "", from: "computer" });
            }
        } catch { /* not followed on the phone */ }
        const { runAgentTask } = await import("./whatsapp-call.service.js");
        await runAgentTask(user, question, null, null, sessionId, null, {
            ...(meta.clientApp ? { clientApp: meta.clientApp } : {}),
            ...(meta.appMode ? { appMode: meta.appMode } : {}),
            ...(meta.permissionMode ? { permissionMode: meta.permissionMode } : {}),
            // the model (and effort) the user picked in this chat: the woken turn thinks and writes like the rest of the
            // chat (it used to run on the default "auto" model, which answered without thinking)
            ...(meta.selectedModel ? { selectedModel: meta.selectedModel } : {}),
            ...(meta.effort ? { effort: meta.effort } : {}),
            wakeUp: true,
        }, null, (data) => {
            if (remote) { try { remote.mirrorRemoteEvent(String(userId), sessionId, data); } catch { /* the phone's own problem */ } }
            // The answer streams into the open chat as it is written (its thinking, steps and words), like any other
            // answer, instead of the whole message appearing at once when it ends
            if (!LIVE_EVENTS.has(data?.type)) return;
            const event = data.type === "tool_result" ? { ...data, result: String(data.result ?? "").slice(0, 4000) } : data;
            // (its own socket event: an app from before this treats every "chat:woke" as the end and would reload each time)
            try { getIO().to(String(userId)).emit("chat:woke-live", { sessionId, event }); } catch { /* no socket server */ }
        });
    } finally {
        await redis.del(LOCK(sessionId)).catch(() => {});
        if (ran) tell(userId, { sessionId, phase: "end" });
        if (remote) await remote.remoteTurnEnded(String(userId), sessionId).catch(() => {});
        // More finished while this turn ran (or while the lock was held): wake again
        wakeIfPending(userId, sessionId).catch(() => {});
    }
}

/** A background command on the user's computer finished (from their desktop app) */
export async function onLocalJobDone(userId, d) {
    if (!d?.chat || d.stopped) return;
    // Only that it ended: the AI looks at the result itself (check_background_command), like a person checking a job
    // that finished, and then tells the user what it found
    await wakeChat(userId, String(d.chat), `The background command \`${String(d.command || "").slice(0, 500)}\` (job_id ${d.jobId}) on the user's computer has just ended. Check its result yourself first with check_background_command (job_id "${d.jobId}"), then tell the user what you found.`);
}
