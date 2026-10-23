/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
// WhatsApp voice calls to the business number, answered by Classgrid AI.
//
// A user calls the Classgrid WhatsApp number. Meta sends the call to the ai.classgrid.in server (same machine), which
// passes it here. If the caller's number is the verified WhatsApp of exactly one Classgrid account, the call is
// answered as that person: their voice goes to Cloudflare Whisper (speech to text), Claude talks with them, and the
// reply is spoken back with Cloudflare Aura (text to speech). A call lasts at most 15 minutes (never cut mid-sentence).
// The AI saves the caller's tasks during the call; when the call ends, the Classgrid Agent does them in the
// background as that user, in a new chat in their account, and the result is sent to them on WhatsApp.
//
// Media is WebRTC (Meta's Calling API): we answer Meta's SDP offer from our own peer connection (@roamhq/wrtc),
// audio is 48 kHz Opus. UDP 10000-60000 is open on the server for it.
// Off switch: WHATSAPP_CALLS_DISABLED=true leaves every call unanswered (as before this feature).

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import redis from "../config/redis.js";
import { normalizeWhatsappNumber } from "./ai-feature-limits.js";
import { isSharedTestWhatsapp } from "../utils/chat-onboarding.js";
import { hasEnoughTokens, deductTokens } from "./ai-credits.service.js";
import { chargeableTokens } from "./ai-token-pricing.js";

const GRAPH = "https://graph.facebook.com/v22.0";
const CALL_MODEL = "claude-haiku-5-5"; // fastest Claude, so the voice replies come quickly
const MAX_CALL_MS = 15 * 60 * 1000;
const WRAP_UP_MS = MAX_CALL_MS - 15 * 1000; // 15 s before the end the AI is told the time is almost up
const OVERTIME_MS = 30 * 1000; // at the limit, a sentence or answer in progress may finish (up to 30 s more)
// Owner's rule (2026-10-23): one phone number gets at most 50 answered calls in any 24 hours (so at most 50
// background jobs: all tasks of one call run as one job)
const MAX_CALLS_PER_DAY = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const CALLS_KEY = (number) => `wa:calls:${number}`;

// How many calls this number had in the last 24 h, and when the oldest of them stops counting
async function callsToday(number) {
    const key = CALLS_KEY(number);
    const now = Date.now();
    await redis.zremrangebyscore(key, 0, now - DAY_MS);
    const count = await redis.zcard(key);
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
    return { count, nextAt: oldest?.[1] ? Number(oldest[1]) + DAY_MS : now };
}
const SAMPLE_RATE = 48000;
const FRAME = SAMPLE_RATE / 100; // 10 ms of audio
const CHAT_URL = "https://chat.classgrid.in";

const calls = new Map(); // call id -> live call

let wrtcPromise = null;
function loadWrtc() {
    // Loaded only when a call comes, so the server always starts even if this native module is missing
    wrtcPromise ||= import("@roamhq/wrtc").then((m) => m.default || m);
    return wrtcPromise;
}

// ─── Meta Graph API ───────────────────────────────────────────

async function graph(path, body) {
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const res = await fetch(`${GRAPH}/${phoneId}/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Meta ${path} ${res.status}: ${JSON.stringify(data.error || data).slice(0, 300)}`);
    return data;
}

const callAction = (callId, action, sdp) =>
    graph("calls", { call_id: callId, action, ...(sdp ? { session: { sdp_type: "answer", sdp } } : {}) });

function sendWhatsappText(to, text) {
    return graph("messages", { recipient_type: "individual", to, type: "text", text: { preview_url: true, body: text.slice(0, 4000) } })
        .catch((e) => console.error("[WA call] WhatsApp message failed:", e.message));
}

// ─── Who is calling ───────────────────────────────────────────

// The owner's own number is on many accounts (shared test number), so calls from it always use the owner's account
const OWNER_EMAIL = "nikhilsubsun123@gmail.com";
const OWNER_NUMBER = "918623947038";
// Every user whose verified WhatsApp is the calling number is answered; WHATSAPP_CALLS_FOR_ALL=false limits it to the owner
const callsForAll = () => process.env.WHATSAPP_CALLS_FOR_ALL !== "false";

// The Classgrid account whose verified WhatsApp is this number. Other shared test numbers (on several accounts on
// purpose) and numbers on more than one account are not answered: the AI must know exactly whose account it works in.
async function findCaller(from) {
    const number = normalizeWhatsappNumber(from);
    if (number === OWNER_NUMBER) return User.findOne({ email: OWNER_EMAIL }).select("-password -verificationToken");
    if (!callsForAll() || !number || isSharedTestWhatsapp(number)) return null;
    const last10 = number.slice(-10);
    const candidates = await User.find({ "metadata.whatsappPhone": { $regex: `${last10}$` } })
        .select("-password -verificationToken").limit(5);
    const matches = candidates.filter((u) => normalizeWhatsappNumber(u.metadata?.whatsappPhone) === number);
    return matches.length === 1 ? matches[0] : null;
}

// ─── Audio helpers ────────────────────────────────────────────

function wav16k(chunks) {
    // 48 kHz mono chunks -> 16 kHz mono WAV (Whisper)
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const pcm48 = new Int16Array(total);
    let o = 0;
    for (const c of chunks) { pcm48.set(c, o); o += c.length; }
    const n = Math.floor(total / 3);
    const pcm16 = new Int16Array(n);
    for (let i = 0; i < n; i++) pcm16[i] = (pcm48[i * 3] + pcm48[i * 3 + 1] + pcm48[i * 3 + 2]) / 3;
    const b = Buffer.alloc(44 + n * 2);
    b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
    b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24);
    b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
    Buffer.from(pcm16.buffer).copy(b, 44);
    return b;
}

function mono(samples, channels) {
    if (channels === 1) return samples;
    const out = new Int16Array(samples.length / channels);
    for (let i = 0; i < out.length; i++) {
        let s = 0;
        for (let c = 0; c < channels; c++) s += samples[i * channels + c];
        out[i] = s / channels;
    }
    return out;
}

function rms(samples) {
    let s = 0;
    for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i];
    return Math.sqrt(s / (samples.length || 1));
}

const cfUrl = (model) => `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
const cfHeaders = (type) => ({ Authorization: `Bearer ${process.env.CLOUDFLARE_WORKERS_AI_TOKEN}`, "Content-Type": type });

async function speechToText(chunks) {
    const res = await fetch(cfUrl("@cf/openai/whisper-large-v3-turbo"), { method: "POST", headers: cfHeaders("audio/wav"), body: wav16k(chunks) });
    const json = await res.json().catch(() => ({}));
    return String(json?.result?.text || "").trim();
}

async function textToSpeech(text) {
    // Raw 16-bit 48 kHz mono, the call's own format
    const res = await fetch(cfUrl("@cf/deepgram/aura-2-en"), {
        method: "POST",
        headers: cfHeaders("application/json"),
        body: JSON.stringify({ text, encoding: "linear16", sample_rate: SAMPLE_RATE, container: "none" }),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2));
}

// ─── Claude (the talking part) ────────────────────────────────

const START_TASK_TOOL = {
    name: "start_task",
    description: "Save a task for the Classgrid Agent. When the call ends, the Agent does all saved tasks, in order, in the caller's Classgrid account (it has their chats, projects, GitHub, Vercel, Google and other connected apps) and sends them the result on WhatsApp. The call goes on after this.",
    input_schema: {
        type: "object",
        properties: {
            task: { type: "string", description: "The complete task with every detail the caller gave, written for the Agent." },
            project_name: { type: "string", description: "Optional: the name of one of the caller's Project Mode projects this task belongs to. The Agent's chat is then saved inside that project." },
        },
        required: ["task"],
    },
};

const ASK_CLASSGRID_TOOL = {
    name: "ask_classgrid",
    description: "Ask the Classgrid Agent right now, during the call, and get its answer back to tell the caller. It has everything in the caller's account: classrooms, chats, schedules, files, connected apps (Gmail, Google Calendar, Google Drive, Notion and more), web search and all other Classgrid tools. Use it for anything to look up or do while the caller is on the line. With project_name it first opens that Project Mode project (as the editor does) so the Agent can read and change its files. It can take from a few seconds to a minute (longer when a project has to be opened).",
    input_schema: {
        type: "object",
        properties: {
            request: { type: "string", description: "What to look up or do, with every detail the caller gave." },
            project_name: { type: "string", description: "Optional: the name of one of the caller's Project Mode projects to open and work in." },
        },
        required: ["request"],
    },
};

const END_CALL_TOOL = {
    name: "end_call",
    description: "Hang up the phone call (after what you say now is spoken).",
    input_schema: { type: "object", properties: {} },
};

// Project Mode tools, for every caller (their own projects)
const PROJECT_TOOLS = [
    {
        name: "make_project",
        description: "Create a new Project Mode project in the caller's account with this name.",
        input_schema: { type: "object", properties: { name: { type: "string", description: "The project name." } }, required: ["name"] },
    },
    {
        name: "list_projects",
        description: "List the caller's Project Mode projects (name and linked GitHub repo).",
        input_schema: { type: "object", properties: {} },
    },
];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Names said on a call come through speech to text, so spaces, capitals and dashes are ignored ("ghost bot" = "GhostBot")
const looseName = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function findProject(user, name) {
    const { default: IdeProject } = await import("../models/IdeProject.js");
    const exact = await IdeProject.findOne({ owner: user._id, name: new RegExp(`^${escapeRegex(String(name || "").trim())}$`, "i") });
    if (exact || !looseName(name)) return exact;
    const all = await IdeProject.find({ owner: user._id }).select("name").limit(100);
    return all.find((p) => looseName(p.name) === looseName(name)) || null;
}

// For "not found" answers: the caller's real project names, so the AI can pick the right one or ask
async function projectNames(user) {
    const { default: IdeProject } = await import("../models/IdeProject.js");
    const list = await IdeProject.find({ owner: user._id }).select("name").sort({ updatedAt: -1 }).limit(20).lean().catch(() => []);
    return list.length ? `The caller's projects are: ${list.map((p) => p.name).join(", ")}.` : "The caller has no projects.";
}

async function runProjectTool(call, tool) {
    const { default: IdeProject } = await import("../models/IdeProject.js");
    if (tool.name === "list_projects") {
        const list = await IdeProject.find({ owner: call.user._id }).select("name repo").sort({ updatedAt: -1 }).limit(20).lean();
        return list.length ? list.map((p) => `${p.name}${p.repo ? ` (GitHub: ${p.repo})` : " (no GitHub repo yet)"}`).join("\n") : "No projects yet.";
    }
    if (tool.name === "make_project") {
        const name = String(tool.input?.name || "").trim().slice(0, 80);
        if (!name) return "No name was given.";
        if (await findProject(call.user, name)) return `A project called "${name}" already exists.`;
        await IdeProject.create({ owner: call.user._id, name });
        return `Project "${name}" was created.`;
    }
    return "Unknown tool.";
}

function systemPrompt(user) {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
    return [
        "You are Classgrid AI on a WhatsApp voice call with a Classgrid user.",
        `Caller: ${user.name || "unknown name"} (${user.email}). Time: ${now} (India).`,
        "What you say is read out by an English text-to-speech voice, so write plain spoken English: short sentences, no markdown, no lists, no emojis, no links.",
        "The call can last at most 15 minutes.",
        "After the call the Classgrid Agent does the work in the caller's account and sends them the result on WhatsApp.",
        "The caller can also send extra details or files (photos, PDFs, documents) in this WhatsApp chat; the Agent reads their latest WhatsApp messages before it sends the final result.",
    ].join("\n");
}

async function claudeTurn(call) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
            model: CALL_MODEL,
            max_tokens: 400,
            system: systemPrompt(call.user),
            tools: [ASK_CLASSGRID_TOOL, START_TASK_TOOL, END_CALL_TOOL, ...PROJECT_TOOLS],
            messages: call.messages,
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(data.error || data).slice(0, 300)}`);
    const u = data.usage || {};
    const usage = {
        prompt_tokens: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0),
        completion_tokens: u.output_tokens || 0,
        cache_read_input_tokens: u.cache_read_input_tokens || 0,
        cache_creation_input_tokens: u.cache_creation_input_tokens || 0,
    };
    deductTokens(call.user._id, call.user.organization_id || null, chargeableTokens(usage, CALL_MODEL), call.tokenSource)
        .catch((e) => console.error("[WA call] token charge failed:", e.message));
    call.messages.push({ role: "assistant", content: data.content || [] });
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
    const tools = (data.content || []).filter((b) => b.type === "tool_use");
    return { text, tools };
}

// ─── Call life ────────────────────────────────────────────────

async function speak(call, text) {
    if (!text || call.ended) return;
    try {
        const pcm = await textToSpeech(text);
        call.outQueue.push(pcm);
    } catch (e) {
        console.error("[WA call] TTS failed:", e.message);
    }
}

// Waits until everything queued has been played (or the call ended)
function speakingDone(call) {
    return new Promise((resolve) => {
        const check = () => (call.ended || (call.outQueue.length === 0 && !call.outCurrent) ? resolve() : setTimeout(check, 50));
        check();
    });
}

async function handleUtterance(call, chunks) {
    call.busy = true;
    try {
        const said = await speechToText(chunks);
        if (!said || call.ended) return;
        call.transcript.push(`Caller: ${said}`);
        call.messages.push({ role: "user", content: said });
        await reply(call);
    } catch (e) {
        console.error("[WA call] turn failed:", e.message);
        await speak(call, "Sorry, I had a problem there. Could you say that again?");
    } finally {
        call.busy = false;
        if (call.pending.length) setImmediate(() => nextTurn(call));
    }
}

async function reply(call) {
    // A few rounds, so the AI can use a project tool and then talk about the result
    for (let round = 0; round < 4 && !call.ended; round++) {
        const { text, tools } = await claudeTurn(call);
        if (text) call.transcript.push(`AI: ${text}`);
        const hangUp = tools.find((t) => t.name === "end_call");
        await speak(call, text);
        if (!tools.length) return;
        // Every tool the AI asked for gets its answer in one message
        const results = [];
        for (const t of tools) {
            let content;
            if (t.name === "start_task") {
                const task = String(t.input?.task || "").trim();
                const project = t.input?.project_name ? await findProject(call.user, t.input.project_name).catch(() => null) : null;
                if (task) call.tasks.push({ task, project });
                call.transcript.push(`AI saved a task: ${task}`);
                content = project || !t.input?.project_name
                    ? `Task saved (${call.tasks.length} so far). It starts when the call ends.`
                    : `Task saved (${call.tasks.length} so far), but there is no project called "${t.input.project_name}". ${await projectNames(call.user)}`;
            } else if (t.name === "end_call") {
                content = "Hanging up.";
            } else if (t.name === "ask_classgrid") {
                call.transcript.push(`AI asked Classgrid: ${t.input?.request || ""}`);
                content = await askClassgridLive(call, String(t.input?.request || ""), t.input?.project_name);
            } else if (PROJECT_TOOLS.some((p) => p.name === t.name)) {
                call.transcript.push(`AI used ${t.name} ${JSON.stringify(t.input || {})}`);
                content = await runProjectTool(call, t).catch((e) => `Failed: ${e.message}`);
            } else {
                content = "This tool is not available.";
            }
            results.push({ type: "tool_result", tool_use_id: t.id, content });
        }
        call.messages.push({ role: "user", content: results });
        if (hangUp) {
            await speakingDone(call);
            endCall(call.id, "AI hung up");
            return;
        }
    }
}

function wrapUp(call) {
    if (call.ended) return;
    const run = async () => {
        while (call.busy && !call.ended) await new Promise((r) => setTimeout(r, 100));
        if (call.ended) return;
        // Added only between turns, so it never lands between a tool request and its answer
        call.messages.push({ role: "user", content: "[The call ends in about 15 seconds.]" });
        call.busy = true;
        try { await reply(call); } catch (e) { console.error("[WA call] wrap-up failed:", e.message); } finally { call.busy = false; }
    };
    run();
}

// The time limit: if the caller is talking or the AI is answering right now, let it finish first
function timeUp(call) {
    const limit = call.startedAt + MAX_CALL_MS + OVERTIME_MS;
    const check = () => {
        if (call.ended) return;
        const talking = call.speech.active || call.busy || call.outCurrent || call.outQueue.length > 0;
        if (talking && Date.now() < limit) call.hardStop = setTimeout(check, 500);
        else endCall(call.id, "15 minute limit");
    };
    check();
}

export function endCall(callId, why = "ended") {
    const call = calls.get(callId);
    if (!call || call.ended) return;
    call.ended = true;
    calls.delete(callId);
    clearInterval(call.ticker);
    clearTimeout(call.wrapTimer);
    clearTimeout(call.hardStop);
    try { call.sink?.stop(); } catch { /* already stopped */ }
    try { call.pc?.close(); } catch { /* already closed */ }
    if (why !== "remote") callAction(callId, "terminate").catch(() => { /* call already over */ });
    console.log(`[WA call] ${callId} ended (${why}) after ${Math.round((Date.now() - call.startedAt) / 1000)}s`);
    afterCall(call).catch((e) => console.error("[WA call] after-call work failed:", e.message));
}

async function afterCall(call) {
    // Only saved tasks run after the call (questions were already answered live with ask_classgrid)
    if (!call.tasks.length) return;
    let task = call.tasks.length === 1
        ? call.tasks[0].task
        : `Do these tasks in this order:\n${call.tasks.map((t, i) => `${i + 1}. ${t.task}`).join("\n")}`;
    const project = call.tasks.find((t) => t.project)?.project || null;
    // Owner's rule: before the final email or WhatsApp, the Agent checks the user's latest WhatsApp messages
    task += "\n\n(The user may send follow-ups or files in the Classgrid WhatsApp chat while you work. Before you send the final result by email or WhatsApp, read their latest WhatsApp messages with read_whatsapp_messages and use anything new they added.)";
    // Your answer is sent to this same user on WhatsApp: talk to them directly ("you"), not about them
    const question = `[From a WhatsApp call. The person reading your answer is the user who called: your final answer is sent to them on WhatsApp, so talk to them directly ("you"), not about them.]\n${task}`;
    await runCallJob({
        id: call.id, userId: String(call.user._id), from: call.from, question,
        projectId: project ? String(project._id) : null, projectName: project?.name || null,
        sessionId: null, startedAt: Date.now(),
    });
}

// ─── Call tasks survive server restarts ───────────────────────
// Every task from a call is saved in Redis while it runs. A deploy or crash restarts the server and stops the run;
// the main server then finds the unfinished task and continues it in the same chat. A running task refreshes its
// lock every minute, so only tasks whose server is gone are picked up (and only once).
const JOB_KEY = (id) => `wa:job:${id}`;
const JOB_LOCK = (id) => `wa:job-lock:${id}`;
const JOBS = "wa:jobs";
const JOB_TTL_S = 2 * 24 * 60 * 60;

async function runCallJob(job, { resumed = false } = {}) {
    const save = () => redis.set(JOB_KEY(job.id), JSON.stringify(job), "EX", JOB_TTL_S).catch(() => {});
    await save();
    await redis.sadd(JOBS, job.id).catch(() => {});
    await redis.set(JOB_LOCK(job.id), "1", "EX", 120).catch(() => {});
    const heartbeat = setInterval(() => redis.set(JOB_LOCK(job.id), "1", "EX", 120).catch(() => {}), 60 * 1000);
    let stopKeepOpen = () => {};
    try {
        const user = await User.findById(job.userId).select("-password -verificationToken");
        if (!user) return;
        let question = job.question;
        if (job.projectId) {
            // Open the project like the Project Mode page does, so the Agent works inside its files
            const opened = await openProject(user, job.projectId);
            if (opened.ok) stopKeepOpen = keepProjectOpen(user._id);
            else question += `\n\n(The project "${job.projectName}" could not be opened in the editor: ${opened.error}. Work without its files and tell the user.)`;
        }
        if (resumed) {
            question = `[The Classgrid server restarted while you were working on this task, so you stopped partway. Look at what is already done in this chat and finish the rest. Don't repeat finished steps (for example, don't send the same email or WhatsApp message again).]\n${question}`;
        }
        const where = job.projectName ? ` in your project "${job.projectName}"` : "";
        const result = await runAgentTask(user, question, job.projectId, (sessionId) => {
            if (job.sessionId) return;
            job.sessionId = sessionId;
            save();
            sendWhatsappText(job.from, `Got it. Classgrid AI is working on it now${where}. I'll send you the result here when it's done.\n\nFollow along: ${CHAT_URL}/agent/${sessionId}`);
        }, job.sessionId);
        const link = result.sessionId || job.sessionId ? `\n\nFull result: ${CHAT_URL}/agent/${result.sessionId || job.sessionId}` : "";
        if (!result.answer) {
            await sendWhatsappText(job.from, `Classgrid AI could not finish this task${result.error ? `: ${result.error}` : "."}${link}`);
        } else {
            const short = result.answer.length > 1500 ? `${result.answer.slice(0, 1500).trimEnd()}…` : result.answer;
            await sendWhatsappText(job.from, `${short}${link}`);
        }
        await redis.del(JOB_KEY(job.id)).catch(() => {});
        await redis.srem(JOBS, job.id).catch(() => {});
    } finally {
        clearInterval(heartbeat);
        stopKeepOpen();
        await redis.del(JOB_LOCK(job.id)).catch(() => {});
    }
}

// Main server only: every 2 minutes, continue call tasks whose server stopped (no live lock)
export function startCallJobResumer() {
    const check = async () => {
        try {
            for (const id of await redis.smembers(JOBS)) {
                const raw = await redis.get(JOB_KEY(id));
                if (!raw) { await redis.srem(JOBS, id); continue; }
                // Take the task only if no running server holds it
                const took = await redis.set(JOB_LOCK(id), "1", "EX", 120, "NX");
                if (!took) continue;
                const job = JSON.parse(raw);
                console.log(`[WA call] Continuing task ${id} after a restart (chat ${job.sessionId || "not made yet"})`);
                runCallJob(job, { resumed: true }).catch((e) => console.error(`[WA call] task ${id} failed:`, e.message));
            }
        } catch (e) {
            console.error("[WA call] task check failed:", e.message);
        }
    };
    setTimeout(check, 30 * 1000);
    setInterval(check, 2 * 60 * 1000);
}

// A live question during the call: the full Agent answers (all tools and plugins of the account). All live questions
// of one call go into one chat. If it takes over 60 s the call goes on, and the answer is sent on WhatsApp when ready.
async function askClassgridLive(call, request, projectName) {
    if (!request.trim()) return "No request was given.";
    let question = `[Live question during a WhatsApp voice call with the user. Your answer is read out on the call, so keep it short and spoken; no tables or links.]\n${request}`;
    const work = (async () => {
        // A project: open it first (keeps work that is not pushed yet) so the Agent reads its files. Each project
        // gets its own live chat, because a chat stays with the project it started in.
        let project = null, stopKeepOpen = () => {};
        if (projectName) {
            project = await findProject(call.user, projectName).catch(() => null);
            if (!project) return { answer: "", error: `there is no project called "${projectName}". ${await projectNames(call.user)}` };
            const opened = await openProject(call.user, project._id);
            if (opened.ok) stopKeepOpen = keepProjectOpen(call.user._id);
            else question += `\n\n(The project "${project.name}" could not be opened: ${opened.error}. Tell the user.)`;
        }
        const key = project ? String(project._id) : "none";
        try {
            return await runAgentTask(call.user, question, project?._id, (id) => { call.liveSessions[key] ||= id; }, call.liveSessions[key] || null);
        } finally {
            stopKeepOpen();
        }
    })();
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 90 * 1000));
    const result = await Promise.race([work, timeout]);
    if (!result) {
        work.then((r) => sendWhatsappText(call.from, `${r.answer || `Classgrid AI could not finish this${r.error ? `: ${r.error}` : "."}`}${r.sessionId ? `\n\n${CHAT_URL}/agent/${r.sessionId}` : ""}`))
            .catch(() => {});
        return "Still working on it. The answer will be sent to the caller on WhatsApp when it is ready.";
    }
    if (!result.answer) return `Classgrid could not answer${result.error ? `: ${result.error}` : "."}`;
    return result.answer.slice(0, 4000);
}

// A short login token for this user, for calling our own routes as them (same checks as their own login)
function userToken(user) {
    return jwt.sign(
        { id: user._id, role: user.role, organizationId: user.organization_id || null, rememberMe: false },
        process.env.JWT_SECRET || "dev_secret",
        { expiresIn: "2h" }
    );
}

// Opens a Project Mode project through the normal route (downloads its code or keeps what is there, starts the
// editor box). resume: never throws away work that is not pushed yet.
async function openProject(user, projectId) {
    try {
        const port = process.env.PORT || 3000;
        const res = await fetch(`http://127.0.0.1:${port}/api/ide/projects/${projectId}/open`, {
            method: "POST",
            headers: { Authorization: `Bearer ${userToken(user)}`, "Content-Type": "application/json" },
            body: JSON.stringify({ resume: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) return { ok: true };
        return { ok: false, error: data.error === "github_not_connected" ? "GitHub is not connected (AI Hub)" : data.error || `status ${res.status}` };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// The sandbox removes a project's code 5 minutes after its editor closes. While the Agent works on it from a call
// (no editor open), the box is marked as in use every minute (same key the editor uses, ide:seen:<user>).
function keepProjectOpen(userId) {
    const mark = () => redis.set(`ide:seen:${userId}`, String(Date.now()), "EX", 24 * 60 * 60).catch(() => {});
    mark();
    const timer = setInterval(mark, 60 * 1000);
    return () => clearInterval(timer);
}

// Runs the Classgrid Agent as this user through the normal chat route (same login checks, AI credits and saved
// chat as when they use chat.classgrid.in). The route makes the new chat and tells its id (session_info).
// Returns { sessionId, answer, error }.
async function runAgentTask(user, question, projectId, onSession, sessionId = null) {
    const port = process.env.PORT || 3000;
    const res = await fetch(`http://127.0.0.1:${port}/api/ai/ask`, {
        method: "POST",
        headers: { Authorization: `Bearer ${userToken(user)}`, "Content-Type": "application/json" },
        // projectId: the chat is saved inside that Project Mode project
        body: JSON.stringify({ question, ...(sessionId ? { sessionId } : {}), ...(projectId ? { projectId: String(projectId) } : {}) }),
    });
    if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        return { sessionId: null, answer: "", error: err.message || err.error || `the request failed (${res.status})` };
    }
    let buffer = "", answer = "", streamed = "", error = "";
    const decoder = new TextDecoder();
    for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let i;
        while ((i = buffer.indexOf("\n\n")) !== -1) {
            const event = buffer.slice(0, i);
            buffer = buffer.slice(i + 2);
            const line = event.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "session_info" && data.sessionId && !sessionId) {
                    sessionId = data.sessionId;
                    onSession?.(sessionId);
                }
                if (data.type === "token" && data.token) streamed += data.token;
                if (data.type === "answer" && data.answer) answer = data.answer;
                if (data.type === "error") error = data.message || data.error || "unknown error";
            } catch { /* not JSON */ }
        }
    }
    return { sessionId, answer: String(answer || streamed).trim(), error };
}

// The server's public IPv4, read from AWS (EC2 instance metadata, IMDSv2). Put in the answer as a candidate, so
// WhatsApp always gets an address it can reach, even when the STUN lookup is slow. Kept once found.
let publicIp = null;
async function serverPublicIp() {
    if (publicIp) return publicIp;
    try {
        const token = await fetch("http://169.254.169.254/latest/api/token", {
            method: "PUT", headers: { "X-aws-ec2-metadata-token-ttl-seconds": "21600" }, signal: AbortSignal.timeout(1000),
        }).then((r) => (r.ok ? r.text() : ""));
        const ip = await fetch("http://169.254.169.254/latest/meta-data/public-ipv4", {
            headers: token ? { "X-aws-ec2-metadata-token": token } : {}, signal: AbortSignal.timeout(1000),
        }).then((r) => (r.ok ? r.text() : ""));
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip.trim())) publicIp = ip.trim();
    } catch { /* not on EC2 (local): STUN gives the public address */ }
    return publicIp;
}

function filterAnswerSdp(sdp, publicIpv4) {
    // Only UDP candidates that Meta can reach (no TCP, no loopback)
    const lines = sdp.split("\r\n").filter((line) => {
        if (!line.startsWith("a=candidate:")) return true;
        return / udp /i.test(line) && !/ (127\.0\.0\.1|::1) /.test(line);
    });
    if (!publicIpv4) return lines.join("\r\n");
    // For each private IPv4 host candidate, the same port on the public IP (EC2 maps it 1:1), unless STUN already added it
    const out = [];
    for (const line of lines) {
        out.push(line);
        const m = line.match(/^a=candidate:(\S+) 1 udp (\d+) (10\.\S+|172\.(1[6-9]|2\d|3[01])\.\S+|192\.168\.\S+) (\d+) typ host/i);
        if (m && !lines.some((l) => l.includes(` ${publicIpv4} ${m[5]} `))) {
            out.push(`a=candidate:${m[1]}9 1 udp ${Number(m[2]) - 1} ${publicIpv4} ${m[5]} typ host generation 0`);
        }
    }
    return out.join("\r\n");
}

// The kinds of candidates in an SDP, for the log ("host 172.31.32.242:10000, srflx 13.x.x.x:10000")
const candidateSummary = (sdp) => sdp.split("\r\n").filter((l) => l.startsWith("a=candidate:"))
    .map((l) => { const p = l.split(" "); return `${p[7] || "?"} ${p[2]} ${p[4]}:${p[5]}`; }).join(", ") || "none";

export async function answerCall({ id, from, sdp, user, tokenSource }) {
    const { RTCPeerConnection, nonstandard } = await loadWrtc();
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }], portRange: { min: 10000, max: 60000 } });
    const source = new nonstandard.RTCAudioSource();
    const call = {
        id, from, user, pc, source, tokenSource,
        startedAt: Date.now(), ended: false, busy: false, tasks: [],
        messages: [], transcript: [],
        outQueue: [], outCurrent: null, outPos: 0, speechEndedAt: 0,
        speech: { active: false, chunks: [], loud: 0, quiet: 0, ms: 0 }, pending: [], liveSessions: {},
    };
    calls.set(id, call);

    pc.ontrack = (e) => {
        if (e.track.kind !== "audio" || call.sink) return;
        call.sink = new nonstandard.RTCAudioSink(e.track);
        call.sink.ondata = (d) => listen(call, mono(d.samples, d.channelCount || 1));
    };
    // Connection steps with times, written to the log when the connection fails (to see why)
    const steps = [];
    const step = (what) => steps.push(`${((Date.now() - call.startedAt) / 1000).toFixed(1)}s ${what}`);
    pc.oniceconnectionstatechange = () => step(`ice ${pc.iceConnectionState}`);
    pc.onconnectionstatechange = () => {
        step(`connection ${pc.connectionState}`);
        if (pc.connectionState === "failed") {
            console.error(`[WA call] ${id} connection failed. Steps: ${steps.join(" | ")}. Our candidates: ${call.ourCandidates}. WhatsApp candidates: ${call.theirCandidates}`);
        }
        if (["failed", "closed"].includes(pc.connectionState)) endCall(id, `connection ${pc.connectionState}`);
    };

    await pc.setRemoteDescription({ type: "offer", sdp });
    pc.addTrack(source.createTrack());
    await pc.setLocalDescription(await pc.createAnswer());
    await new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        pc.onicegatheringstatechange = () => pc.iceGatheringState === "complete" && resolve();
        setTimeout(resolve, 3000);
    });
    const answer = filterAnswerSdp(pc.localDescription.sdp, await serverPublicIp());
    call.ourCandidates = candidateSummary(answer);
    call.theirCandidates = candidateSummary(sdp);
    step(`answer ready (gathering ${pc.iceGatheringState})`);

    await callAction(id, "pre_accept", answer);
    await callAction(id, "accept", answer);
    console.log(`[WA call] ${id} answered for ${user.email}`);

    // Audio out: one 10 ms frame each tick (silence when the AI is not talking, so WhatsApp keeps the call open)
    let sent = 0;
    const t0 = Date.now();
    call.ticker = setInterval(() => {
        const due = Math.floor((Date.now() - t0) / 10);
        while (sent < due && !call.ended) {
            const frame = new Int16Array(FRAME);
            let filled = 0;
            while (filled < FRAME) {
                if (!call.outCurrent) {
                    call.outCurrent = call.outQueue.shift() || null;
                    call.outPos = 0;
                    if (!call.outCurrent) break;
                }
                const take = Math.min(FRAME - filled, call.outCurrent.length - call.outPos);
                frame.set(call.outCurrent.subarray(call.outPos, call.outPos + take), filled);
                filled += take;
                call.outPos += take;
                if (call.outPos >= call.outCurrent.length) { call.outCurrent = null; call.speechEndedAt = Date.now(); }
            }
            try { source.onData({ samples: frame, sampleRate: SAMPLE_RATE, bitsPerSample: 16, channelCount: 1, numberOfFrames: FRAME }); } catch { /* closing */ }
            sent++;
        }
    }, 10);

    call.wrapTimer = setTimeout(() => wrapUp(call), WRAP_UP_MS);
    call.hardStop = setTimeout(() => timeUp(call), MAX_CALL_MS);

    // Greeting
    const first = String(user.name || "").split(" ")[0];
    const hello = `Hi${first ? ` ${first}` : ""}, this is Classgrid AI. What can I do for you?`;
    call.transcript.push(`AI: ${hello}`);
    call.messages.push({ role: "user", content: "[Call connected.]" }, { role: "assistant", content: hello });
    speak(call, hello);
}

// Simple voice detection: a turn starts when the caller gets loud and ends after 0.8 s of quiet.
// While the AI is talking (and a moment after) the caller's audio is ignored, so the AI never hears itself.
function listen(call, samples) {
    if (call.ended) return;
    const s = call.speech;
    const aiTalking = !!call.outCurrent || call.outQueue.length > 0;
    // Right after the AI stops, a short tail of its own voice can still come back: skip it
    if (!aiTalking && !s.active && Date.now() - call.speechEndedAt < 300) { s.loud = 0; s.chunks = []; return; }
    const ms = (samples.length / SAMPLE_RATE) * 1000;
    // While the AI talks, only a clearly louder voice for a moment counts (not an echo of the AI)
    const loud = rms(samples) > (aiTalking ? 1500 : 700);
    if (!s.active) {
        // Loud time adds up, quiet gaps (between words) take it down slowly, so a voice is noticed quickly
        s.loud = loud ? s.loud + ms : Math.max(0, s.loud - ms / 2);
        s.chunks.push(samples);
        if (s.chunks.length > 100) s.chunks.shift(); // keep 1 s of audio from just before the speech is noticed
        if (s.loud >= (aiTalking ? 250 : 60)) {
            s.active = true; s.ms = 0; s.quiet = 0;
            if (aiTalking) { call.outQueue = []; call.outCurrent = null; call.speechEndedAt = Date.now(); } // caller talks over the AI: it stops
        }
        return;
    }
    s.chunks.push(samples);
    s.ms += ms;
    s.quiet = loud ? 0 : s.quiet + ms;
    if (s.quiet >= 800 || s.ms >= 15000) {
        const chunks = s.chunks;
        s.active = false; s.chunks = []; s.loud = 0; s.quiet = 0; s.ms = 0;
        if (chunks.length > 40) { call.pending.push(chunks); nextTurn(call); }
    }
}

// One turn at a time; what the caller says meanwhile waits and is answered next
async function nextTurn(call) {
    if (call.busy) return;
    while (call.pending.length && !call.ended && !call.busy) await handleUtterance(call, call.pending.shift());
}

// ─── Webhook entry (from the ai.classgrid.in server) ──────────

export async function handleCallsWebhook(value) {
    for (const c of value?.calls || []) {
        try {
            if (c.event === "terminate") { endCall(c.id, "remote"); continue; }
            if (c.event !== "connect" || c.direction !== "USER_INITIATED" || !c.session?.sdp || calls.has(c.id)) continue;
            if (process.env.WHATSAPP_CALLS_DISABLED === "true") continue;
            const from = c.from || value.contacts?.[0]?.wa_id;
            const user = await findCaller(from);
            if (!user) {
                if (!callsForAll()) continue; // owner-only mode: other calls stay unanswered
                console.log(`[WA call] ${c.id} from an unlinked number, not answered`);
                await callAction(c.id, "reject").catch(() => {});
                await sendWhatsappText(from, "This WhatsApp number is not linked to a Classgrid account. Sign in on https://chat.classgrid.in and verify this number, then call again.");
                continue;
            }
            // Same credit check as the chat; if the check itself fails the call is not answered
            const enough = await hasEnoughTokens(user._id, user.organization_id || null, 1).catch(() => null);
            if (!enough?.allowed) {
                await callAction(c.id, "reject").catch(() => {});
                await sendWhatsappText(from, /insufficient/i.test(enough?.reason || "")
                    ? `You're out of Classgrid AI credits right now. Top up on ${CHAT_URL} to use calls.`
                    : "Classgrid AI can't take calls for your account right now. Please try again later.");
                continue;
            }
            // 50 calls per number in 24 hours (if the count can't be read, the call is answered)
            const number = normalizeWhatsappNumber(from);
            const today = await callsToday(number).catch(() => null);
            if (today && today.count >= MAX_CALLS_PER_DAY) {
                await callAction(c.id, "reject").catch(() => {});
                const next = new Date(today.nextAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
                await sendWhatsappText(from, `You've used all ${MAX_CALLS_PER_DAY} Classgrid AI calls for the last 24 hours. You can call again after ${next} (India time).`);
                continue;
            }
            await answerCall({ id: c.id, from, sdp: c.session.sdp, user, tokenSource: enough.source || "personal" });
            redis.zadd(CALLS_KEY(number), Date.now(), c.id).then(() => redis.expire(CALLS_KEY(number), 2 * 24 * 60 * 60)).catch(() => {});
        } catch (e) {
            console.error(`[WA call] ${c.id} failed:`, e.message);
            if (calls.has(c.id)) endCall(c.id, "error");
            else callAction(c.id, "terminate").catch(() => {});
        }
    }
}
