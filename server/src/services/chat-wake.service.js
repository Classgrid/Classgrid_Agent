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
    if ((await redis.llen(PENDING(sessionId)).catch(() => 0)) > 0) setTimeout(() => runWake(userId, sessionId).catch(() => {}), 1500);
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
        const question = `[SYSTEM: background work you started in this chat has finished while you were not answering. This message is from Classgrid, not the user.]\n\n${notes.join("\n\n---\n\n")}\n\nTell the user the result now, the way you would say it in the middle of a conversation: one to three plain sentences on what finished, whether it worked and what it means (a key line of its output or the error, if it matters). Write it naturally, as you write your other replies: no heading, no "✅ Done" banner, no emoji, no bold, no list, no closing offer like "Want to try anything else?". If the user's task needs a next step, do it; otherwise don't start new long work.`;
        const { runAgentTask } = await import("./whatsapp-call.service.js");
        await runAgentTask(user, question, null, null, sessionId, null, {
            ...(meta.clientApp ? { clientApp: meta.clientApp } : {}),
            ...(meta.appMode ? { appMode: meta.appMode } : {}),
            ...(meta.permissionMode ? { permissionMode: meta.permissionMode } : {}),
            wakeUp: true,
        });
    } finally {
        await redis.del(LOCK(sessionId)).catch(() => {});
        tell(userId, { sessionId, phase: "end" });
        // More finished while this turn ran: wake again
        if ((await redis.llen(PENDING(sessionId)).catch(() => 0)) > 0) setTimeout(() => runWake(userId, sessionId).catch(() => {}), 2000);
    }
}

/** A background command on the user's computer finished (from their desktop app) */
export async function onLocalJobDone(userId, d) {
    if (!d?.chat || d.stopped) return;
    const output = String(d.output || "").trim();
    await wakeChat(userId, String(d.chat), `The command \`${String(d.command || "").slice(0, 500)}\` (job ${d.jobId}) finished on the user's computer after ${Math.round((Number(d.seconds) || 0))} seconds with exit code ${d.exitCode}${d.exitCode === 0 ? " (it worked)" : " (it failed)"}.${output ? `\nThe end of its output:\n${output.slice(-4000)}` : "\nIt printed nothing."}`);
}
