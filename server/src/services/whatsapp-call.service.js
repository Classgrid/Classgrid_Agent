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

import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import redis from "../config/redis.js";
import { normalizeWhatsappNumber } from "./ai-feature-limits.js";
import { isSharedTestWhatsapp } from "../utils/chat-onboarding.js";
import { hasEnoughTokens, deductTokens } from "./ai-credits.service.js";
import { chargeableTokens } from "./ai-token-pricing.js";
import { toWhatsappText, splitWhatsappText } from "./ai-feature-limits.js";
import { BUSY_KEY, markLastIn } from "./whatsapp-inbox.service.js";
import { BUDGET_STOP_NOTE } from "./llm-stream.js";

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
const jobNumbers = new Map(); // number -> call tasks running for it on this server

// A live call, or a call task running, for this number (then a new WhatsApp message is taken in after it)
export function numberInUse(number) {
    const n = normalizeWhatsappNumber(number);
    if ((jobNumbers.get(n) || 0) > 0) return "task";
    for (const c of calls.values()) if (normalizeWhatsappNumber(c.from) === n && !c.ended) return "call";
    return null;
}

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

// Owner's rule: a PDF always goes on WhatsApp as a real PDF file, never as a link. Our own PDF links
// (cdn.classgrid.in) are taken out of the text and sent as documents.
const CDN_PDF = /https:\/\/cdn\.classgrid\.in\/[^\s)\]>"'`]+?\.pdf\b/gi;
export function splitPdfLinks(text) {
    const pdfs = [...new Set(String(text || "").match(CDN_PDF) || [])];
    if (!pdfs.length) return { text: String(text || ""), pdfs };
    const rest = String(text).replace(CDN_PDF, "")
        .split("\n").filter((l) => !/^[\s📄📎🔗:*_\-–•·()[\]]*$/u.test(l) || !l.trim()).join("\n")
        .replace(/\n{3,}/g, "\n\n").trim();
    return { text: rest, pdfs };
}
const pdfName = (url) => decodeURIComponent(url.split("?")[0].split("/").pop() || "file.pdf").slice(0, 240);

export async function sendWhatsappText(to, text) {
    const { text: rest, pdfs } = splitPdfLinks(text);
    const body = toWhatsappText(rest);
    // One PDF and a short text: the text is the PDF's caption
    const caption = pdfs.length === 1 && body && body.length <= 1024 ? body : "";
    if (!caption) {
        for (const part of splitWhatsappText(body)) {
            await graph("messages", { recipient_type: "individual", to, type: "text", text: { preview_url: true, body: part } })
                .catch((e) => console.error("[WA call] WhatsApp message failed:", e.message));
        }
    }
    for (const url of pdfs) {
        await graph("messages", { recipient_type: "individual", to, type: "document", document: { link: url, filename: pdfName(url), ...(caption ? { caption } : {}) } })
            .catch(async (e) => {
                console.error("[WA call] WhatsApp PDF failed:", e.message);
                // The file couldn't go: at least the link
                await graph("messages", { recipient_type: "individual", to, type: "text", text: { preview_url: true, body: `${caption ? `${caption}\n\n` : ""}${url}` } }).catch(() => {});
            });
    }
}

// Blue ticks on a message the user sent, and "typing…" for a while
export const markWhatsappRead = (messageId) =>
    graph("messages", { status: "read", message_id: messageId, typing_indicator: { type: "text" } })
        .catch((e) => console.error("[WA call] mark read failed:", e.message));

// While a call or a call task uses this number's chat, the old WhatsApp help bot stays quiet
const markBusy = (number, seconds = 300) => redis.set(BUSY_KEY(number), "1", "EX", seconds).catch(() => {});

// ─── Who is calling ───────────────────────────────────────────

// The owner's own number is on many accounts (shared test number), so calls from it always use the owner's account
const OWNER_EMAIL = "nikhilsubsun123@gmail.com";
const OWNER_NUMBER = "918623947038";
// Every user whose verified WhatsApp is the calling number is answered; WHATSAPP_CALLS_FOR_ALL=false limits it to the owner
const callsForAll = () => process.env.WHATSAPP_CALLS_FOR_ALL !== "false";

// The Classgrid account whose verified WhatsApp is this number. Other shared test numbers (on several accounts on
// purpose) and numbers on more than one account are not answered: the AI must know exactly whose account it works in.
export async function findCaller(from) {
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
    const res = await fetch(cfUrl("@cf/openai/whisper-large-v3-turbo"), {
        method: "POST", headers: cfHeaders("audio/wav"), body: wav16k(chunks), signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`speech to text ${res.status}`);
    const json = await res.json().catch(() => ({}));
    return String(json?.result?.text || "").trim();
}

async function textToSpeech(text, retried = false) {
    // Raw 16-bit 48 kHz mono, the call's own format
    let res;
    try {
        res = await fetch(cfUrl("@cf/deepgram/aura-2-en"), {
            method: "POST",
            headers: cfHeaders("application/json"),
            body: JSON.stringify({ text, encoding: "linear16", sample_rate: SAMPLE_RATE, container: "none" }),
            signal: AbortSignal.timeout(20000),
        });
    } catch (e) {
        if (!retried) return textToSpeech(text, true);
        throw e;
    }
    if (!res.ok) {
        if (!retried) return textToSpeech(text, true);
        throw new Error(`TTS ${res.status}`);
    }
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
        "You have your own email address: agent@classgrid.in. When the caller wants to email you (for example keys, files or details), tell them to send it to agent@classgrid.in; the Agent reads every email there.",
    ].join("\n");
}

async function claudeTurn(call, { noTools = false } = {}) {
    const ask = () => fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
            model: CALL_MODEL,
            max_tokens: 1024,
            system: systemPrompt(call.user),
            // ask_classgrid is back (owner's choice, 2026-10-24 evening): the AI can work during the call, so it opens
            // or makes the project right away and the tasks are saved with it
            tools: [ASK_CLASSGRID_TOOL, START_TASK_TOOL, END_CALL_TOOL, ...PROJECT_TOOLS],
            ...(noTools ? { tool_choice: { type: "none" } } : {}),
            messages: call.messages,
        }),
        signal: AbortSignal.timeout(30000),
    });
    let res = await ask();
    if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500));
        res = await ask();
    }
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
    // An empty answer is not kept (the API refuses a conversation with an empty message in it)
    if (data.content?.length) call.messages.push({ role: "assistant", content: data.content });
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
    const tools = (data.content || []).filter((b) => b.type === "tool_use");
    return { text, tools, cutOff: data.stop_reason === "max_tokens" };
}

// ─── Call life ────────────────────────────────────────────────

// A reply in parts of one or a few sentences (the voice service takes longer the longer the text is)
function speechParts(text) {
    const sentences = String(text).replace(/\s+/g, " ").match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [String(text)];
    const parts = [];
    for (const s of sentences) {
        const t = s.trim();
        if (!t) continue;
        // The first sentence goes alone (it plays sooner); short sentences after it are joined
        if (parts.length > 1 && parts[parts.length - 1].length + t.length < 160) parts[parts.length - 1] += ` ${t}`;
        else parts.push(t);
    }
    return parts;
}

// Spoken part by part: every part is made into voice at the same time and played in order as soon as it is
// ready, so the first words come quickly and a long reply never hits the voice service's time limit
async function speak(call, text) {
    if (!text || call.ended) return;
    const gen = call.speakGen || 0;
    const audio = speechParts(text).map((part) =>
        textToSpeech(part).catch((e) => { console.error("[WA call] TTS failed:", e.message); return null; }));
    // The AI counts as talking for the whole reply, also in the short gaps between its parts (else its own
    // voice coming back from the phone in a gap would be taken as the caller speaking)
    call.speakingParts = (call.speakingParts || 0) + 1;
    try {
        for (const next of audio) {
            const pcm = await next;
            // The caller talked over the AI: the rest of this reply is dropped
            if (call.ended || (call.speakGen || 0) !== gen) return;
            if (pcm) call.outQueue.push(pcm);
        }
    } finally {
        call.speakingParts--;
    }
}

const aiIsTalking = (call) => !!call.outCurrent || call.outQueue.length > 0 || (call.speakingParts || 0) > 0;

// Waits until everything queued has been played (or the call ended)
function speakingDone(call) {
    return new Promise((resolve) => {
        const check = () => (call.ended || !aiIsTalking(call) ? resolve() : setTimeout(check, 50));
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

async function runTool(call, t, cutOff) {
    // A tool request cut off by the answer length limit has a broken input: ask the AI to try again
    if (cutOff) return { content: "Your request was cut off before it was complete. Try again, shorter.", is_error: true };
    if (t.name === "start_task") {
        const task = String(t.input?.task || "").trim();
        const project = t.input?.project_name ? await findProject(call.user, t.input.project_name).catch(() => null) : null;
        if (!task) return { content: "Nothing was saved: the task text was empty. Call start_task again with the full task.", is_error: true };
        call.tasks.push({ task, project });
        call.transcript.push(`AI saved a task: ${task}`);
        return {
            content: project || !t.input?.project_name
                ? `Task saved (${call.tasks.length} so far). It starts when the call ends.`
                : `Task saved (${call.tasks.length} so far), but there is no project called "${t.input.project_name}". ${await projectNames(call.user)}`,
        };
    }
    if (t.name === "end_call") return { content: "Hanging up." };
    if (t.name === "ask_classgrid") {
        call.transcript.push(`AI asked Classgrid: ${t.input?.request || ""}`);
        return { content: await askClassgridLive(call, String(t.input?.request || ""), t.input?.project_name) };
    }
    if (PROJECT_TOOLS.some((p) => p.name === t.name)) {
        call.transcript.push(`AI used ${t.name} ${JSON.stringify(t.input || {})}`);
        return { content: await runProjectTool(call, t) };
    }
    return { content: "This tool is not available.", is_error: true };
}

async function reply(call) {
    // A few rounds, so the AI can use a tool and then talk about the result
    for (let round = 0; round < 4 && !call.ended; round++) {
        const { text, tools, cutOff } = await claudeTurn(call);
        if (text) call.transcript.push(`AI: ${text}`);
        await speak(call, text);
        if (!tools.length || call.ended) return;
        // Every tool the AI asked for gets its answer in one message, even when a tool fails
        // (a request without its answer would make every later turn of the call fail)
        const results = [];
        for (const t of tools) {
            let out;
            try { out = await runTool(call, t, cutOff); } catch (e) { out = { content: `Failed: ${e.message}`, is_error: true }; }
            results.push({ type: "tool_result", tool_use_id: t.id, content: String(out.content || "Done."), ...(out.is_error ? { is_error: true } : {}) });
        }
        call.messages.push({ role: "user", content: results });
        if (tools.some((t) => t.name === "end_call") && !cutOff) {
            await speakingDone(call);
            endCall(call.id, "AI hung up");
            return;
        }
    }
    // Still using tools after 4 rounds: one last answer without tools, so the results are said
    if (!call.ended) {
        const { text } = await claudeTurn(call, { noTools: true });
        if (text) call.transcript.push(`AI: ${text}`);
        await speak(call, text);
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
        try { await reply(call); } catch (e) { console.error("[WA call] wrap-up failed:", e.message); } finally {
            call.busy = false;
            if (call.pending.length) nextTurn(call); // what the caller said meanwhile is answered
        }
    };
    run();
}

// The time limit: if the caller is talking or the AI is answering right now, let it finish first
function timeUp(call) {
    const limit = call.startedAt + MAX_CALL_MS + OVERTIME_MS;
    const check = () => {
        if (call.ended) return;
        const talking = call.speech.active || call.busy || aiIsTalking(call);
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
    afterCall(call, why).catch((e) => console.error("[WA call] after-call work failed:", e.message));
}

// A 2-3 line recap of a call with no saved task, written by the call model from the conversation
async function callSummary(call) {
    const lines = call.transcript.filter((l) => l.startsWith("Caller:") || l.startsWith("AI:")).join("\n").slice(-6000);
    if (!lines) return "";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
            model: CALL_MODEL,
            max_tokens: 300,
            system: "Write a short WhatsApp recap (2-3 lines, no title, plain text, WhatsApp *bold* allowed) of this Classgrid AI phone call for the caller, talking to them as \"you\". Include any answers they were given.",
            messages: [{ role: "user", content: lines }],
        }),
        signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    const u = data.usage || {};
    deductTokens(call.user._id, call.user.organization_id || null, chargeableTokens({ prompt_tokens: u.input_tokens || 0, completion_tokens: u.output_tokens || 0 }, CALL_MODEL), call.tokenSource).catch(() => {});
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
}

async function afterCall(call, why) {
    if (why === "error" || /^connection/.test(why)) {
        await sendWhatsappText(call.from, `Sorry, the call dropped${call.tasks.length ? ", but your request is saved and Classgrid AI is working on it" : ""}. You can call again anytime.`);
    }
    if (!call.tasks.length) {
        // No task: a short recap of the call (questions were already answered live)
        if (call.transcript.some((l) => l.startsWith("Caller:"))) {
            const recap = await callSummary(call).catch(() => "");
            if (recap) await sendWhatsappText(call.from, `📞 *Your call with Classgrid AI*\n${recap}`);
        }
        return;
    }
    // Owner's rule (2026-10-24): one call = one background job. All its tasks run together in one chat, inside the
    // project if any of them names one (a call once split into two jobs: double "Got it", and the user's replies
    // went to the job without the project)
    // Owner's rule (2026-10-24): call work always runs in Project Mode, never in Agent mode. No project named on the
    // call: one is made now, named after the task, so the work starts inside it
    let project = call.tasks.find((t) => t.project)?.project || null;
    if (!project) {
        const { default: IdeProject } = await import("../models/IdeProject.js");
        const words = String(call.tasks[0]?.task || "Call task").replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 4);
        const base = (words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ") || "Call Task").slice(0, 60);
        let name = base;
        for (let i = 2; await findProject(call.user, name).catch(() => null); i++) name = `${base} ${i}`;
        project = await IdeProject.create({ owner: call.user._id, name }).catch((e) => { console.error("[WA call] project could not be made:", e.message); return null; });
        if (project) console.log(`[WA call] ${call.id}: no project named, made "${name}" (Project Mode only)`);
    }
    const groups = new Map([[project ? String(project._id) : "none", { project, tasks: call.tasks.map((t) => t.task) }]]);
    // Work the AI started live during the call for the same project finishes first; the task then carries on in
    // that same chat instead of doing it all again (it once built one project twice)
    const announced = call.liveWorks.length > 0;
    if (announced) {
        // The user hears from us now, not only when the live work is done (the task doesn't say it again)
        await sendWhatsappText(call.from, `Got it. Classgrid AI is working on it now. I'll send you the result here when it's done.${call.callsLine ? `\n${call.callsLine}` : ""}`);
        await Promise.all(call.liveWorks);
    }
    let n = 0;
    for (const [key, { project, tasks }] of groups.entries()) {
        // The work after the call carries on in the chat the live work used during the call, so it sees all of it
        const liveSession = call.liveSessions[key] || (!project ? Object.values(call.liveSessions)[0] : null) || null;
        let task = tasks.length === 1 ? tasks[0] : `Do these tasks in this order:\n${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
        if (liveSession) task = `[During the call you already started on this in this chat. Look at what is already done here and do only what is left. Don't build or send anything again that is already done.]\n${task}`;
        // Owner's rule: before the final email or WhatsApp, the Agent checks the user's latest WhatsApp messages
        task += "\n\n(The user may send follow-ups or files in the Classgrid WhatsApp chat while you work. Before you send the final result by email or WhatsApp, read their latest WhatsApp messages with read_whatsapp_messages and use anything new they added.)";
        // The answer is sent to this same user on WhatsApp: talk to them directly ("you"), not about them
        const question = `[From a WhatsApp call. The person reading your answer is the user who called: your final answer is sent to them on WhatsApp, so talk to them directly ("you"), not about them. Owner's rule for WhatsApp: keep it short, say only what you did (no full feature list), and never repeat what you already sent.]\n${task}`;
        runCallJob({
            id: groups.size > 1 ? `${call.id}:${n++}` : call.id, userId: String(call.user._id), from: call.from, question,
            projectId: project ? String(project._id) : null, projectName: project?.name || null,
            sessionId: liveSession, startedAt: Date.now(), attempts: 0, steps: [], callsLine: call.callsLine || "", announced,
            callStartedAt: call.startedAt,
        }).catch((e) => console.error(`[WA call] task for ${call.id} failed:`, e.message));
    }
}

// ─── Call tasks survive server restarts ───────────────────────
// Every task from a call is saved in Redis while it runs. A deploy or crash restarts the server and stops the run;
// the main server then finds the unfinished task and continues it in the same chat. A running task refreshes its
// lock every minute, so only tasks whose server is gone are picked up (and only once).
const JOB_KEY = (id) => `wa:job:${id}`;
const JOB_LOCK = (id) => `wa:job-lock:${id}`;
const JOBS = "wa:jobs";
const JOB_TTL_S = 2 * 24 * 60 * 60;
const LOCK_TTL_S = 300;
const MAX_TRIES = 3;
// Renew or free the lock only while it is still ours (another server may have taken it after a long stall)
const RENEW_IF_MINE = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end";
const DEL_IF_MINE = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

async function runCallJob(job, { resumed = false, lockToken = null } = {}) {
    const token = lockToken || crypto.randomUUID();
    if (!lockToken) {
        const took = await redis.set(JOB_LOCK(job.id), token, "EX", LOCK_TTL_S, "NX").catch(() => "OK");
        if (!took) return; // another server is already running it
    }
    const save = () => redis.set(JOB_KEY(job.id), JSON.stringify(job), "EX", JOB_TTL_S).catch(() => {});
    const forget = async () => { await redis.del(JOB_KEY(job.id)).catch(() => {}); await redis.srem(JOBS, job.id).catch(() => {}); };
    job.attempts = (job.attempts || 0) + 1;
    await save();
    await redis.sadd(JOBS, job.id).catch(() => {});
    markBusy(job.from);
    const number = normalizeWhatsappNumber(job.from);
    jobNumbers.set(number, (jobNumbers.get(number) || 0) + 1);
    const heartbeat = setInterval(() => {
        redis.eval(RENEW_IF_MINE, 1, JOB_LOCK(job.id), token, LOCK_TTL_S).catch(() => {});
        markBusy(job.from);
    }, 60 * 1000);
    let stopKeepOpen = () => {};
    const { default: AgentTask } = await import("../models/AgentTask.js");
    // The task was deleted from MongoDB: its job stops for good (no restart, no messages, nothing made again)
    const taskGone = async () => !!job.taskId && !(await AgentTask.exists({ _id: job.taskId }).catch(() => true));
    try {
        if (await taskGone()) {
            console.log(`[WA call] task ${job.id} was deleted, its job stops`);
            await forget();
            return;
        }
        if (job.attempts > MAX_TRIES) {
            await sendWhatsappText(job.from, `Sorry, Classgrid AI could not finish your task after ${MAX_TRIES} tries.${job.sessionId ? `\n\nWhat it did so far: ${CHAT_URL}/agent/${job.sessionId}` : ""}`);
            await forget();
            return;
        }
        const user = await User.findById(job.userId).select("-password -verificationToken");
        if (!user) { await forget(); return; }
        let question = job.question;
        if (job.projectId) {
            // Open the project like the Project Mode page does, so the Agent works inside its files
            const opened = await openProject(user, job.projectId);
            if (opened.ok) stopKeepOpen = keepProjectOpen(user._id);
            else question += `\n\n(The project "${job.projectName}" could not be opened in the editor: ${opened.error}. Work without its files and tell the user.)`;
        }
        if (resumed) {
            const done = (job.steps || []).length ? `\nSteps already done before the restart (don't repeat them, for example don't send the same email or WhatsApp message again):\n${job.steps.map((x) => `- ${x}`).join("\n")}` : "";
            question = `[The Classgrid server restarted while you were working on this task, so you stopped partway. Look at what is already done in this chat and finish the rest. Don't repeat finished steps.${done}]\n${question}`;
        }
        const where = job.projectName ? ` in your project "${job.projectName}"` : "";
        const runStartedAt = new Date();
        let stepsThisRun = 0;
        const sends = []; // WhatsApp messages the Agent sent itself during this run
        const tasks = await import("./agent-task.service.js");
        // The task and its record (owner's design) exist from the start, so the user's WhatsApp messages during the
        // work are saved for it (the same task again after a restart)
        if (!job.taskId) {
            job.taskId = await tasks.startCallTask({
                user, phone: job.from, question: job.question, sessionId: job.sessionId, callStartedAt: job.callStartedAt,
                projectId: job.projectId, projectName: job.projectName,
            });
            await save();
        }
        // Every minute: the task is marked as running, and if it was deleted meanwhile the run is stopped
        const stop = new AbortController();
        const taskBeat = setInterval(async () => {
            if (await taskGone()) { stop.abort(); return; }
            AgentTask.updateOne({ _id: job.taskId, status: "working" }, { $set: { heartbeat_at: new Date() } }).catch(() => {});
        }, 60 * 1000);
        const result = await runAgentTask(user, question, job.projectId, (sessionId) => {
            tasks.setTaskSession(job.taskId, sessionId);
            if (job.sessionId) return;
            job.sessionId = sessionId;
            save();
            if (!job.announced) sendWhatsappText(job.from, `Got it. Classgrid AI is working on it now${where}. I'll send you the result here when it's done.${job.callsLine ? `\n${job.callsLine}` : ""}`);
        }, job.sessionId, (stepText, info) => {
            // Each finished tool step is kept, so a resume after a restart knows what not to redo
            job.steps = [...(job.steps || []), stepText].slice(-40);
            if (!stepText.startsWith("sleep_until")) stepsThisRun++;
            if (info?.name === "send_whatsapp_message") sends.push(info);
            tasks.logTaskStep(job.taskId, info);
            save();
        }, { taskOrigin: "whatsapp" }, stop.signal).finally(() => clearInterval(taskBeat));
        if (result.aborted || await taskGone()) {
            console.log(`[WA call] task ${job.id} was deleted during its run, its job stops`);
            await forget();
            return;
        }
        // What happens next (send the answer, wait for the user, keep working, retry later) is decided in one
        // place, the same for every long task
        await tasks.afterRun({
            user, phone: job.from, sessionId: result.sessionId || job.sessionId, projectId: job.projectId,
            projectName: job.projectName, goal: job.question, origin: "whatsapp", result, steps: stepsThisRun, runStartedAt, sends,
            taskId: job.taskId,
        });
        await forget();
    } finally {
        clearInterval(heartbeat);
        jobNumbers.set(number, Math.max(0, (jobNumbers.get(number) || 1) - 1));
        stopKeepOpen();
        await redis.eval(DEL_IF_MINE, 1, JOB_LOCK(job.id), token).catch(() => {});
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
                const token = crypto.randomUUID();
                const took = await redis.set(JOB_LOCK(id), token, "EX", LOCK_TTL_S, "NX");
                if (!took) continue;
                const job = JSON.parse(raw);
                console.log(`[WA call] Continuing task ${id} after a restart (try ${(job.attempts || 0) + 1}, chat ${job.sessionId || "not made yet"})`);
                runCallJob(job, { resumed: true, lockToken: token }).catch((e) => console.error(`[WA call] task ${id} failed:`, e.message));
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
    const pendingKey = projectName ? `p:${looseName(projectName)}` : "none";
    if (call.livePending[pendingKey]) return "The earlier request is still being worked on; its answer will be sent to the caller on WhatsApp when it is ready.";
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
            // whatsappSince: the live work reads only the WhatsApp messages sent since this call started (no old ones)
            return { ...(await runAgentTask(call.user, question, project?._id, (id) => { call.liveSessions[key] ||= id; }, call.liveSessions[key] || null, null, { whatsappSince: call.startedAt })), key };
        } finally {
            stopKeepOpen();
        }
    })();
    call.livePending[pendingKey] = true;
    const safeWork = work.catch((e) => ({ answer: "", error: e.message })).finally(() => { call.livePending[pendingKey] = false; });
    // After the call, a saved task for the same project waits for this work and carries on in its chat
    call.liveWorks.push(safeWork);
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 90 * 1000));
    const result = await Promise.race([safeWork, timeout]);
    if (!result) {
        safeWork.then((r) => {
            // A saved task for the same project carries on in this chat and sends the result (no second message)
            if (call.ended && call.tasks.some((t) => (t.project ? String(t.project._id) : "none") === r.key)) return;
            sendWhatsappText(call.from, `${r.answer || `Classgrid AI could not finish this${r.error ? `: ${r.error}` : "."}`}${r.sessionId ? `\n\n${CHAT_URL}/agent/${r.sessionId}` : ""}`);
        });
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
        { expiresIn: "12h" }
    );
}

// Opens a Project Mode project through the normal route (downloads its code or keeps what is there, starts the
// editor box). resume: never throws away work that is not pushed yet.
export async function openProject(user, projectId) {
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
export function keepProjectOpen(userId) {
    const mark = () => redis.set(`ide:seen:${userId}`, String(Date.now()), "EX", 24 * 60 * 60).catch(() => {});
    mark();
    const timer = setInterval(mark, 60 * 1000);
    return () => clearInterval(timer);
}

// Runs the Classgrid Agent as this user through the normal chat route (same login checks, AI credits and saved
// chat as when they use chat.classgrid.in). The route makes the new chat and tells its id (session_info).
// Returns { sessionId, answer, error }.
// quota: set when the user's AI tokens ran out ({ resetDate }), so the task can wait for them to come back.
// signal: stops the run (its task was deleted); a stopped run returns { aborted: true }
export async function runAgentTask(user, question, projectId, onSession, sessionId = null, onStep = null, extraBody = {}, signal = null) {
    try {
        return await runAgentTaskOnce(user, question, projectId, onSession, sessionId, onStep, extraBody, signal);
    } catch (e) {
        if (signal?.aborted) return { sessionId, answer: "", error: "the task was deleted", aborted: true };
        throw e;
    }
}

async function runAgentTaskOnce(user, question, projectId, onSession, sessionId, onStep, extraBody, signal) {
    const port = process.env.PORT || 3000;
    const res = await fetch(`http://127.0.0.1:${port}/api/ai/ask`, {
        ...(signal ? { signal } : {}),
        method: "POST",
        headers: { Authorization: `Bearer ${userToken(user)}`, "Content-Type": "application/json" },
        // projectId: the chat is saved inside that Project Mode project
        // allTools: every tool and plugin is loaded from the start (owner's rule)
        body: JSON.stringify({ question, allTools: true, ...(sessionId ? { sessionId } : {}), ...(projectId ? { projectId: String(projectId) } : {}), ...extraBody }),
    });
    if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        const quota = err.error === "ai_quota_exceeded" || err.code === "fable_needs_paid_credits" ? { resetDate: err.resetDate || null } : null;
        return { sessionId, answer: "", error: err.message || err.error || `the request failed (${res.status})`, quota };
    }
    let quota = null;
    let buffer = "", answer = "", streamed = "", error = "";
    const toolArgs = {}; // tool name -> its input, for the finished-steps list
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
                if (data.type === "tool_start") toolArgs[data.tool || data.name] = data.args || data.input || {};
                if (data.type === "tool_result" && onStep) {
                    const name = data.tool || data.name || "tool";
                    onStep(`${name} ${JSON.stringify(toolArgs[name] || {}).slice(0, 160)}`, { name, args: toolArgs[name] || {}, result: String(data.result ?? "") });
                }
                if (data.type === "token" && data.token) streamed += data.token;
                if (data.type === "answer" && data.answer) answer = data.answer;
                if (data.type === "error") {
                    error = data.message || data.error || "unknown error";
                    if (String(data.error || "").startsWith("ai_quota_exceeded")) quota = { resetDate: String(data.error).split("|")[1] || null };
                }
            } catch { /* not JSON */ }
        }
    }
    const finalAnswer = String(answer || (error ? "" : streamed)).trim();
    // Tokens ran out partway through: the answer ends with the budget note
    if (!quota && finalAnswer.endsWith(BUDGET_STOP_NOTE)) quota = { resetDate: null };
    return { sessionId, answer: finalAnswer, error, quota };
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

export async function answerCall({ id, from, sdp, user, tokenSource, callsLine = "" }) {
    const { RTCPeerConnection, nonstandard } = await loadWrtc();
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }], portRange: { min: 10000, max: 60000 } });
    const source = new nonstandard.RTCAudioSource();
    const call = {
        id, from, user, pc, source, tokenSource, callsLine,
        startedAt: Date.now(), ended: false, busy: false, tasks: [],
        messages: [], transcript: [],
        outQueue: [], outCurrent: null, outPos: 0, speechEndedAt: 0,
        speech: { active: false, chunks: [], loud: 0, quiet: 0, ms: 0, loudMs: 0 }, pending: [], liveSessions: {}, livePending: {}, liveWorks: [],
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

    // WhatsApp may have ended the call while we were getting ready (the caller hung up)
    if (endedEarly(id) || call.ended) { endCall(id, "remote"); return false; }
    await callAction(id, "pre_accept", answer);
    await callAction(id, "accept", answer);
    if (endedEarly(id) || call.ended) { endCall(id, "remote"); return false; }
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
    return true;
}

// Simple voice detection: a turn starts when the caller gets loud and ends after 0.8 s of quiet.
// While the AI is talking (and a moment after) the caller's audio is ignored, so the AI never hears itself.
function listen(call, samples) {
    if (call.ended) return;
    const s = call.speech;
    const aiTalking = aiIsTalking(call);
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
            s.active = true; s.ms = 0; s.quiet = 0; s.loudMs = s.loud;
            // Caller talks over the AI: it stops (also the parts of its reply still being made)
            if (aiTalking) { call.outQueue = []; call.outCurrent = null; call.speechEndedAt = Date.now(); call.speakGen = (call.speakGen || 0) + 1; }
        }
        return;
    }
    s.chunks.push(samples);
    s.ms += ms;
    s.quiet = loud ? 0 : s.quiet + ms;
    if (loud) s.loudMs += ms;
    if (s.quiet >= 800 || s.ms >= 15000) {
        const chunks = s.chunks;
        const realSpeech = s.loudMs >= 150; // a short burst of noise is not sent (Whisper "hears" words in noise)
        s.active = false; s.chunks = []; s.loud = 0; s.quiet = 0; s.ms = 0; s.loudMs = 0;
        if (realSpeech) { call.pending.push(chunks); nextTurn(call); }
    }
}

// One turn at a time; what the caller says meanwhile waits and is answered next
async function nextTurn(call) {
    if (call.busy) return;
    while (call.pending.length && !call.ended && !call.busy) await handleUtterance(call, call.pending.shift());
}

// ─── Webhook entry (from the ai.classgrid.in server) ──────────

// Calls being set up (a repeated "connect" is ignored) and calls WhatsApp already ended (an early "terminate")
const startingCalls = new Set();
const endedCalls = new Map(); // call id -> when it ended
const endedEarly = (id) => endedCalls.has(id);

export async function handleCallsWebhook(value) {
    for (const [id, at] of endedCalls) if (Date.now() - at > 10 * 60 * 1000) endedCalls.delete(id);
    for (const c of value?.calls || []) {
        if (c.event === "terminate") { endedCalls.set(c.id, Date.now()); endCall(c.id, "remote"); continue; }
        if (c.event !== "connect" || c.direction !== "USER_INITIATED" || !c.session?.sdp) continue;
        if (calls.has(c.id) || startingCalls.has(c.id) || endedCalls.has(c.id)) continue;
        startingCalls.add(c.id);
        try {
            if (process.env.WHATSAPP_CALLS_DISABLED === "true") continue;
            const from = c.from || value.contacts?.[0]?.wa_id;
            // A call opens WhatsApp's 24-hour window for messages to this number
            markLastIn(normalizeWhatsappNumber(from));
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
            markBusy(number, MAX_CALL_MS / 1000 + 120);
            const callsLine = `(Call ${(today?.count || 0) + 1} of ${MAX_CALLS_PER_DAY} you can make in 24 hours.)`;
            const answered = await answerCall({ id: c.id, from, sdp: c.session.sdp, user, tokenSource: enough.source || "personal", callsLine });
            if (answered) redis.zadd(CALLS_KEY(number), Date.now(), c.id).then(() => redis.expire(CALLS_KEY(number), 2 * 24 * 60 * 60)).catch(() => {});
        } catch (e) {
            console.error(`[WA call] ${c.id} failed:`, e.message);
            if (calls.has(c.id)) endCall(c.id, "error");
            else callAction(c.id, "terminate").catch(() => {});
        } finally {
            startingCalls.delete(c.id);
        }
    }
}
