// The record of a call (owner's design, 2026-11-09): everything said on a WhatsApp call with Classgrid AI and
// everything the AI did for it afterwards, written as it happens into the Call collection (models/Call.js). The
// same record is made for a task started by a WhatsApp message or an email, so every link the user gets on
// WhatsApp opens the read-only "Calls" page in the app, never a chat.
//
// Every write tells the user's open app at once over the socket ("calls:updated"), so a new call, a new line of
// the transcript and every step of the work show up live (owner, 2026-11-09).
//
// Writers: whatsapp-call.service.js (the call, its job) and agent-task.service.js (every run of a task).
// Readers: controllers/calls.controller.js (the Calls pages).
import Call from "../models/Call.js";
import AgentTask from "../models/AgentTask.js";
import redis from "../config/redis.js";
import { normalizeWhatsappNumber } from "./ai-feature-limits.js";
import { getIO } from "./socket.service.js";

const CHAT_URL = "https://chat.classgrid.in";
export const callUrl = (id) => `${CHAT_URL}/calls/${id}`;

const MAX_TEXT = 2000;      // a tool's result or a message, as kept
const MAX_ARGS = 2000;      // a tool's input (JSON), as kept
const MAX_THOUGHT = 30000;  // one run's thinking
const MAX_STEPS = 400;      // per record
const cut = (text, max = MAX_TEXT) => { const s = String(text ?? ""); return s.length > max ? `${s.slice(0, max)}… (${s.length - max} more characters)` : s; };
const cutArgs = (args) => {
    if (args == null) return null;
    try {
        const json = JSON.stringify(args);
        return json.length <= MAX_ARGS ? args : { _truncated: cut(json, MAX_ARGS) };
    } catch { return null; }
};
const warn = (what) => (e) => console.error(`[call record] ${what} failed:`, e.message);

// ─── Live updates to the app ───────────────────────────────────
// The user's open app hears "calls:updated" { id, kind } after every write to one of their records. Which user a
// record belongs to is looked up once per record and remembered.
const owners = new Map(); // "call:<call id>" | "task:<task id>" -> { id, user }
function remember(doc, callId = null) {
    const hit = { id: String(doc._id), user: String(doc.user_id) };
    if (callId || doc.call_id) owners.set(`call:${callId || doc.call_id}`, hit);
    if (doc.agent_task_id) owners.set(`task:${String(doc.agent_task_id)}`, hit);
    if (owners.size > 2000) owners.delete(owners.keys().next().value);
    return hit;
}
async function notify(where, kind) {
    try {
        const key = where.call_id ? `call:${where.call_id}` : `task:${String(where.agent_task_id)}`;
        let hit = owners.get(key);
        if (!hit) {
            const doc = await Call.findOne(where).select("_id user_id call_id agent_task_id").lean();
            if (!doc) return;
            hit = remember(doc, where.call_id || null);
        }
        getIO().to(hit.user).emit("calls:updated", { id: hit.id, kind });
    } catch { /* the socket server isn't up (tests, scripts): the pages still refresh by themselves */ }
}
// Runs an update, then tells the app
const write = (where, update, kind) => Call.updateOne(where, update).then(() => notify(where, kind)).catch(warn(kind));

// A plain name for the work from its first words, used until the AI names the chat
export function nameFrom(text, fallback = "Call") {
    const words = String(text || "").replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, 9).join(" ");
    const name = words.length > 64 ? `${words.slice(0, 64).trimEnd()}…` : words;
    return name || fallback;
}

// ─── The call itself ───────────────────────────────────────────

// A call was answered: its record exists from the first second (status live)
export async function callStarted({ callId, user, phone, startedAt, model }) {
    try {
        const doc = await Call.create({
            user_id: user._id, organization_id: user.organization_id || null, phone: normalizeWhatsappNumber(phone) || phone || null,
            origin: "call", call_id: callId, started_at: new Date(startedAt || Date.now()), call_model: model || "", status: "live",
            name: `Call on ${new Date(startedAt || Date.now()).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}`,
        });
        remember(doc);
        await notify({ call_id: callId }, "started");
        return String(doc._id);
    } catch (e) {
        warn("callStarted")(e);
        return null;
    }
}

// One line of the call: what the caller said, what the AI said, or what the AI did (a task saved, a question asked)
export function callLine(callId, { at = 0, who = "ai", kind = "speech", text = "", tool = "", args = null }) {
    if (!callId) return Promise.resolve();
    return write({ call_id: callId }, { $push: { transcript: { at, who, kind, text: cut(text, 6000), tool, args: cutArgs(args) } } }, "line");
}

export function callEnded(callId, { why = "", startedAt, tasks = [] }) {
    if (!callId) return Promise.resolve();
    const endedAt = new Date();
    return write({ call_id: callId }, {
        $set: {
            ended_at: endedAt, duration_ms: Math.max(0, endedAt.getTime() - (startedAt || endedAt.getTime())), ended_by: why,
            tasks: tasks.map((t) => ({ text: cut(t.task, 4000), project_name: t.project?.name || "", coding: !!t.coding })),
            ...(tasks.length ? { status: "queued", name: nameFrom(tasks[0]?.task, "Call") } : { status: "answered" }),
        },
    }, "ended");
}

// A call with no task: the recap the caller got on WhatsApp is the record's summary
export function callRecap(callId, text) {
    if (!callId || !text) return Promise.resolve();
    return write({ call_id: callId }, { $set: { summary: cut(text, 3000), status: "answered" }, $push: { sent: { kind: "whatsapp", by: "classgrid", text: cut(text) } } }, "recap");
}

// Work the AI did live during the call (ask_classgrid)
export function callLiveWork(callId, entry) {
    if (!callId) return Promise.resolve();
    return write({ call_id: callId }, {
        $push: { live_works: { key: entry.key || "none", session_id: entry.sessionId || "", request: cut(entry.request, 2000), started_at: entry.startedAt || new Date(), ended_at: new Date(), answer: cut(entry.answer), error: cut(entry.error, 500), late: !!entry.late } },
    }, "live_work");
}

// The project the work runs in (made: it was made for this call)
export function callProject(callId, { projectId, projectName, made = false }) {
    if (!callId) return Promise.resolve();
    return write({ call_id: callId }, { $set: { project_id: projectId ? String(projectId) : null, project_name: projectName || null, project_made: made } }, "project");
}

// ─── A task not from a call (a WhatsApp message or an email started it) ───

export async function taskRecordStarted({ task, user, origin, items = [] }) {
    try {
        const first = items.find((m) => m.text)?.text || "";
        const doc = await Call.create({
            user_id: user._id, organization_id: user.organization_id || null, phone: task.phone || null, origin,
            started_at: new Date(items[0]?.at || Date.now()), status: "queued", agent_task_id: task._id,
            project_id: task.project_id || null, project_name: task.project_name || null, project_made: !!task.project_id,
            name: nameFrom(first.replace(/^Subject:\s*/i, "").split("\n")[0], origin === "email" ? "Email" : "WhatsApp message"),
            transcript: items.map((m) => ({ at: 0, who: "caller", kind: origin === "email" ? "email" : "message", text: cut(m.text, 8000), args: m.fileUrl ? { file: m.fileUrl, name: m.media?.filename || "" } : null })),
        });
        remember(doc);
        await notify({ agent_task_id: task._id }, "started");
        return String(doc._id);
    } catch (e) {
        warn("taskRecordStarted")(e);
        return null;
    }
}

// The job after a call made its task: the record now belongs to that task
export function attachTask(callId, { taskId, sessionId = null, projectId = null, projectName = null }) {
    if (!callId || !taskId) return Promise.resolve();
    const hit = owners.get(`call:${callId}`);
    if (hit) owners.set(`task:${String(taskId)}`, hit);
    return write({ call_id: callId }, {
        $set: { agent_task_id: taskId, ...(sessionId ? { session_id: sessionId } : {}), ...(projectId ? { project_id: String(projectId), project_name: projectName || null } : {}) },
    }, "task");
}

export function setSession(taskId, sessionId) {
    if (!taskId || !sessionId) return Promise.resolve();
    return write({ agent_task_id: taskId }, { $set: { session_id: sessionId } }, "session");
}

// The link the user gets on WhatsApp: the task's record (null when the task has none, e.g. a chat-only task)
export async function linkForTask(taskId) {
    if (!taskId) return null;
    const doc = await Call.findOne({ agent_task_id: taskId }).select("_id").lean().catch(() => null);
    return doc ? callUrl(doc._id) : null;
}
export async function linkForCall(callId) {
    if (!callId) return null;
    const doc = await Call.findOne({ call_id: callId }).select("_id").lean().catch(() => null);
    return doc ? callUrl(doc._id) : null;
}

// A WhatsApp message or email sent to the user for this work by the server (the AI's own sends come from its steps)
export function noteSent(taskId, text, { kind = "whatsapp", to = "" } = {}) {
    if (!taskId || !text) return Promise.resolve();
    return write({ agent_task_id: taskId }, { $push: { sent: { kind, by: "classgrid", to, text: cut(text) } }, $inc: { [`work.counts.${kind === "email" ? "emails_sent" : "whatsapp_sent"}`]: 1 } }, "sent");
}
export function noteSentForCall(callId, text) {
    if (!callId || !text) return Promise.resolve();
    return write({ call_id: callId }, { $push: { sent: { kind: "whatsapp", by: "classgrid", text: cut(text) } }, $inc: { "work.counts.whatsapp_sent": 1 } }, "sent");
}

// ─── Runs of the work ──────────────────────────────────────────

const SEND_TOOLS = /^(send_whatsapp_message|send_email|gmail_send|send_gmail|outlook_send|send_outlook)/i;
const EMAIL_READ_TOOLS = /^(read_agent_email|gmail_|read_gmail|search_gmail|outlook_read|read_outlook|list_emails|read_email)/i;
const EMAIL_SEND_TOOLS = /^(send_email|gmail_send|send_gmail|outlook_send|send_outlook)/i;
const failed = (result) => /^(Error|ERROR|FAILED)\b/.test(String(result || "").trimStart());

// Records one run of a task's work: tool starts and results (with their times), the thinking, the model, the
// answer. Every event of the answer stream goes to onData; the end of the run to end().
export function runRecorder(taskId, { reason = "", attempt = 1 } = {}) {
    const startedAt = new Date();
    let runNo = 1;
    const pending = new Map(); // tool name -> [start times], for tools that started and have no result yet
    let thought = "";
    let stepsThisRun = 0;
    const where = { agent_task_id: taskId };
    const ready = (async () => {
        if (!taskId) return;
        // The first run sets when the work began (kept through later runs)
        await Call.updateOne({ ...where, "work.started_at": null }, { $set: { "work.started_at": startedAt } }).catch(() => {});
        const doc = await Call.findOneAndUpdate(where, {
            $set: { status: "working", "work.ended_at": null, wake_at: null, error: "" },
            $inc: { "work.attempts": 1 },
            $push: { "work.runs": { started_at: startedAt, reason, no: 0 } },
        }, { returnDocument: "after", projection: { "work.runs": 1 } }).catch(warn("runStarted"));
        if (!doc) return;
        runNo = doc.work?.runs?.length || 1;
        await Call.updateOne({ _id: doc._id }, { $set: { [`work.runs.${runNo - 1}.no`]: runNo } }).catch(() => {});
        await notify(where, "run");
    })();

    const push = (step) => {
        stepsThisRun++;
        const bad = step.status === "error";
        const inc = { "work.counts.steps": 1, ...(bad ? { "work.counts.failed": 1 } : {}) };
        if (!bad && step.tool === "send_whatsapp_message") inc["work.counts.whatsapp_sent"] = 1;
        if (!bad && EMAIL_SEND_TOOLS.test(step.tool)) inc["work.counts.emails_sent"] = 1;
        if (!bad && EMAIL_READ_TOOLS.test(step.tool)) inc["work.counts.emails_read"] = 1;
        const update = { $push: { "work.steps": { $each: [step], $slice: -MAX_STEPS } }, $inc: inc };
        if (!bad && step.tool === "send_whatsapp_message") {
            update.$push.sent = { at: step.ended_at, kind: "whatsapp", by: "agent", to: String(step.args?.toPhoneNumber || ""), text: cut(step.args?.messageText), ok: true };
        } else if (!bad && SEND_TOOLS.test(step.tool)) {
            update.$push.sent = { at: step.ended_at, kind: "email", by: "agent", to: String(step.args?.to || step.args?.recipient || ""), text: cut(step.args?.subject || step.args?.body || ""), ok: true };
        }
        return ready.then(() => write(where, update, "step"));
    };

    return {
        // Every event of the answer stream (runAgentTask's onData)
        onData(data) {
            if (!taskId || !data) return;
            if (data.type === "tool_start") {
                const name = data.tool || data.name || "tool";
                const list = pending.get(name) || [];
                list.push({ at: new Date(), args: data.args || data.input || {} });
                pending.set(name, list);
            } else if (data.type === "tool_result") {
                const name = data.tool || data.name || "tool";
                const started = (pending.get(name) || []).shift() || { at: new Date(), args: {} };
                const result = String(data.result ?? "");
                push({ run: runNo, at: started.at, ended_at: new Date(), tool: name, title: String(started.args?.title || ""), args: cutArgs(started.args), result: cut(result), status: failed(result) ? "error" : "ok" });
            } else if (data.type === "thought" && data.thought) {
                if (thought.length < MAX_THOUGHT) thought += String(data.thought);
            }
        },
        // The run is over: result is what runAgentTask returned ({ answer, error, quota, aborted })
        async end(result = {}) {
            if (!taskId) return;
            await ready;
            const endedAt = new Date();
            // Tools that started and never answered (the run stopped or failed mid-step)
            const stopped = [];
            for (const [name, list] of pending) for (const s of list) stopped.push(push({ run: runNo, at: s.at, ended_at: endedAt, tool: name, title: String(s.args?.title || ""), args: cutArgs(s.args), result: result.error ? `Stopped: ${cut(result.error, 300)}` : "Stopped before it finished.", status: "stopped" }));
            pending.clear();
            await Promise.all(stopped);
            const doc = await Call.findOne(where).select("session_id").lean().catch(() => null);
            const model = doc?.session_id ? await redis.get(`ai:lastmodel:${doc.session_id}`).catch(() => null) : null;
            const outcome = result.aborted ? "stopped" : result.quota ? "quota" : result.error ? "error" : /💤 Waiting for/.test(result.answer || "") ? "sleep" : "answer";
            const i = runNo - 1;
            await write(where, {
                $set: {
                    [`work.runs.${i}.ended_at`]: endedAt, [`work.runs.${i}.outcome`]: outcome, [`work.runs.${i}.error`]: cut(result.error || "", 1000),
                    [`work.runs.${i}.model`]: model || "", [`work.runs.${i}.thought`]: cut(thought, MAX_THOUGHT), [`work.runs.${i}.answer`]: cut(result.answer || "", 8000),
                    [`work.runs.${i}.steps`]: stepsThisRun, "work.ended_at": endedAt,
                    ...(result.answer ? { summary: cut(result.answer, 1200) } : {}),
                },
                ...(model ? { $addToSet: { "work.models": model } } : {}),
            }, "run_ended");
            await nameFromChat(taskId, doc?.session_id);
        },
    };
}

// The AI names the chat it works in ("2-3 word title"): the record takes that name
async function nameFromChat(taskId, sessionId) {
    if (!sessionId) return;
    try {
        const { getSessionById } = await import("./ai-chat.service.js");
        const session = await getSessionById(sessionId);
        const title = String(session?.title || "").trim();
        if (title && !/^new chat$/i.test(title)) await write({ agent_task_id: taskId }, { $set: { name: cut(title, 120) } }, "name");
    } catch (e) { warn("nameFromChat")(e); }
}

// The record's status follows the task's (one place, after every decision about the task)
export async function syncStatus(taskId, { error = "" } = {}) {
    if (!taskId) return;
    const task = await AgentTask.findById(taskId).select("status wake_at wake_on_reply note ended_by_ai_at no_progress").lean().catch(() => null);
    if (!task) return;
    const retrying = /^Your last run failed/.test(task.note || "");
    const status = task.status === "working" ? "working"
        : task.status === "waiting_tokens" ? "paused"
        : task.status === "done" ? "done"
        : task.status === "ended" ? "stopped"
        : retrying ? (task.wake_at ? "retrying" : "failed")
        : task.wake_at ? "sleeping"
        : "waiting";
    const lastError = error || (retrying ? (task.note.match(/\((.*)\)/)?.[1] || "") : "");
    await write({ agent_task_id: taskId }, { $set: { status, wake_at: task.wake_at || null, error: cut(lastError, 1000) } }, "status");
}

export async function markFailed(taskId, error) {
    if (!taskId) return;
    await write({ agent_task_id: taskId }, { $set: { status: "failed", error: cut(error, 1000), "work.ended_at": new Date() } }, "status");
}
export async function markFailedForCall(callId, error) {
    if (!callId) return;
    await write({ call_id: callId }, { $set: { status: "failed", error: cut(error, 1000), "work.ended_at": new Date() } }, "status");
}
