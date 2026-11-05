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

/** Remember how a chat was last used (website or desktop app, which mode), so a woken turn runs the same way */
export async function rememberChatMeta(sessionId, meta) {
    if (!sessionId) return;
    await redis.set(META(sessionId), JSON.stringify(meta), "EX", 7 * DAY).catch(() => {});
}

const tell = (userId, data) => { try { getIO().to(String(userId)).emit("chat:woke", data); } catch { /* no socket server */ } };
// The events of a woken answer the open chat shows live
const LIVE_EVENTS = new Set(["token", "thought", "tool_start", "tool_result", "status"]);

/**
 * Background work of a chat finished. note: what finished and its result (plain text for the AI).
 * The chat is woken now, or when its current answer ends.
 */
export async function wakeChat(userId, sessionId, note) {
    if (!userId || !sessionId || !note) return;
    await redis.multi().rpush(PENDING(sessionId), String(note).slice(0, 12000)).expire(PENDING(sessionId), DAY).exec().catch(() => {});
    if (!(await answering(userId, sessionId))) runWake(userId, sessionId).catch((e) => console.warn("[chat wake]", e.message));
}

/** The chat's answer has ended: anything that finished meanwhile wakes it now */
export async function wakeIfPending(userId, sessionId) {
    if (!userId || !sessionId) return;
    if ((await redis.llen(PENDING(sessionId)).catch(() => 0)) > 0) runWake(userId, sessionId).catch(() => {});
}

// The chat is answering the user right now (also in the first seconds of an answer, before it's marked working):
// the results wait and the chat is woken when that answer ends
async function answering(userId, sessionId) {
    const working = await redis.hexists(WORKING(String(userId)), String(sessionId)).catch(() => 0);
    const running = await redis.exists(`chat:run:${userId}:${sessionId}`).catch(() => 0);
    return !!(working || running);
}

async function runWake(userId, sessionId) {
    // One woken turn at a time per chat
    const got = await redis.set(LOCK(sessionId), "1", "EX", 15 * 60, "NX").catch(() => null);
    if (!got) return;
    try {
        const notes = [];
        if (await answering(userId, sessionId)) return; // woken again when that answer ends
        for (let n; (n = await redis.lpop(PENDING(sessionId)).catch(() => null)); ) notes.push(n);
        if (!notes.length) return;
        const user = await User.findById(userId).select("-password -verificationToken");
        if (!user) return;
        let meta = {};
        try { meta = JSON.parse((await redis.get(META(sessionId))) || "{}"); } catch { /* none */ }
        tell(userId, { sessionId, phase: "start" });
        const question = `[SYSTEM: background work you started in this chat has finished while you were not answering. This message is from Classgrid, not the user.]\n\n${notes.join("\n\n---\n\n")}\n\nTell the user the result now, the way you would mention it in the middle of a conversation: what finished, whether it worked and what it means. If the user's task needs a next step, do it; otherwise don't start new long work.`;
        const { runAgentTask } = await import("./whatsapp-call.service.js");
        await runAgentTask(user, question, null, null, sessionId, null, {
            ...(meta.clientApp ? { clientApp: meta.clientApp } : {}),
            ...(meta.appMode ? { appMode: meta.appMode } : {}),
            ...(meta.permissionMode ? { permissionMode: meta.permissionMode } : {}),
            wakeUp: true,
        }, null, (data) => {
            // The answer streams into the open chat as it is written (its thinking, steps and words), like any other
            // answer, instead of the whole message appearing at once when it ends
            if (!LIVE_EVENTS.has(data?.type)) return;
            const event = data.type === "tool_result" ? { ...data, result: String(data.result ?? "").slice(0, 4000) } : data;
            // (its own socket event: an app from before this treats every "chat:woke" as the end and would reload each time)
            try { getIO().to(String(userId)).emit("chat:woke-live", { sessionId, event }); } catch { /* no socket server */ }
        });
    } finally {
        await redis.del(LOCK(sessionId)).catch(() => {});
        tell(userId, { sessionId, phase: "end" });
        // More finished while this turn ran: wake again
        if ((await redis.llen(PENDING(sessionId)).catch(() => 0)) > 0) runWake(userId, sessionId).catch(() => {});
    }
}

/** A background command on the user's computer finished (from their desktop app) */
export async function onLocalJobDone(userId, d) {
    if (!d?.chat || d.stopped) return;
    // Only that it ended: the AI looks at the result itself (check_background_command), like a person checking a job
    // that finished, and then tells the user what it found
    await wakeChat(userId, String(d.chat), `The background command \`${String(d.command || "").slice(0, 500)}\` (job_id ${d.jobId}) on the user's computer has just ended. Check its result yourself first with check_background_command (job_id "${d.jobId}"), then tell the user what you found.`);
}
