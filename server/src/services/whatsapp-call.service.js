import { getJwtSecret } from "../utils/jwt-secret.js";
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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
import { normalizeWhatsappNumber, resolveFeatureLimit, resolveResetPeriod } from "./ai-feature-limits.js";
import { planOf, isUnlimited } from "./plan-limits.service.js";
import Organization from "../models/Organization.js";
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import { isSharedTestWhatsapp } from "../utils/chat-onboarding.js";
import { callTimeWords, workTimeNote, askRefusedForUsage, isBudgetStop } from "../utils/plan-words.js";
import { hasEnoughTokens, deductTokens, planWording, chargeClaudeOnPlan } from "./ai-credits.service.js";
import { callRefusedLimitText, callMinutesUsedUpText, callCountLimitText } from "./email-templates.service.js";
import {
    callCountCaps, fullCallLimit, callsLineText, callTimesSince, callTaskCaps, callTaskRefusal, callTaskRefusedToolText,
    callTaskLimitsLine, runningCallTasks, workLeftMs, workClock, WEEK_MS, MONTH_MS,
} from "./call-limits.service.js";
import { chargeableTokens } from "./ai-token-pricing.js";
import { toWhatsappText, splitWhatsappText } from "./ai-feature-limits.js";
import { BUSY_KEY, markLastIn } from "./whatsapp-inbox.service.js";
import { BUDGET_STOP_NOTE, noThinkingFor } from "./llm-stream.js";
import * as record from "./call-record.service.js";
import { cfAiFetch } from "./cf-neuron-cap.service.js";
import * as eleven from "./elevenlabs.service.js";
import { readOpenAiStream, readClaudeStream, toOpenAiTool, toOpenAiMessages, fromOpenAiAnswer } from "./voice-stream.js";

// (kept under their old names here for anything that reads a model's stream through this file)
export { readOpenAiStream, readClaudeStream };

const GRAPH = "https://graph.facebook.com/v22.0";
export const CALL_MODEL = "claude-haiku-5-5"; // fastest Claude, so the voice replies come quickly
// When Claude cannot answer (its monthly spend limit is reached, an outage, a bad key), the same call goes on with
// GLM 5.3 on Cloudflare: the same conversation, the same tools (owner, 2026-11-14)
export const FALLBACK_MODEL = "@cf/zai-org/glm-5.3";
const MAX_CALL_MS = 15 * 60 * 1000;
const WRAP_UP_MS = MAX_CALL_MS - 15 * 1000; // 15 s before the end the AI is told the time is almost up
const OVERTIME_MS = 30 * 1000; // at the limit, a sentence or answer in progress may finish (up to 30 s more)
// Owner's rule (2026-10-23): one phone number gets at most 50 answered calls in any 24 hours (so at most 50
// background jobs: all tasks of one call run as one job)
const MAX_CALLS_PER_DAY = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const CALLS_KEY = (number) => `wa:calls:${number}`;

// Free call minutes (Global AI Config, "Voice Calls"; owner, 2026-11-14): the seconds a user still has in the current
// period, the period's end, and the limit. The period is started or restarted here when it has run out.
async function freeCallSeconds(user) {
    const orgId = user.organization_id || null;
    const [org, globalConfig] = await Promise.all([
        orgId ? Organization.findById(orgId).select("ai_config").lean().catch(() => null) : null,
        GlobalAiConfig.findOne({ key: "singleton" }).lean().catch(() => null),
    ]);
    const plan = await planOf(user).catch(() => null);
    const rawLimit = resolveFeatureLimit("calls", org, globalConfig, orgId, plan);
    const limitMinutes = rawLimit === Infinity ? 1e9 : Math.max(0, Number(rawLimit) || 0);
    const period = resolveResetPeriod("calls", org, globalConfig, orgId, plan);
    const now = Date.now();
    let used = Number(user.ai_call_seconds_used) || 0;
    let resetAt = user.ai_call_reset_date ? new Date(user.ai_call_reset_date) : null;
    if (!resetAt || resetAt.getTime() <= now) {
        used = 0;
        resetAt = new Date(now + period.ms);
        await User.updateOne({ _id: user._id }, { $set: { ai_call_seconds_used: 0, ai_call_reset_date: resetAt } }).catch(() => {});
    }
    return { left: Math.max(0, limitMinutes * 60 - used), limitMinutes, resetAt };
}

// When calls can start again once the plan's limit and the call minutes are used up: the earlier of the limit coming
// back (hasEnoughTokens' resetAt) and the call minutes coming back (a plan with no call minutes: only the limit)
export function callsBackAt(enough, free, nowMs = Date.now()) {
    const times = [enough?.resetAt, free?.limitMinutes > 0 ? free?.resetAt : null]
        .filter(Boolean).map((t) => new Date(t).getTime()).filter((t) => t > nowMs);
    return times.length ? new Date(Math.min(...times)) : null;
}

// Tokens for one model answer of the call, the same in and past the plan's call minutes. The session limit and the
// weekly limit are for every model, the one that answers a call too (owner, 2026-11-21: "if the session limit is full,
// how can the model write an answer on a call? Officially it must be counted"; then "fix it"). Until that day a call
// inside the plan's call minutes cut no credits and was not checked against the limits at all: the minutes covered the
// model as well as the voice. Now the minutes cover the voice of the call, and the model is counted like anywhere else.
// A call is answered by a Claude model (CALL_MODEL), so on a plan that includes Claude its cost is charged the plan's way:
// counted on the weekly Claude credits as well as the session window and the week (chargeClaudeOnPlan; owner,
// 2026-11-21: "in calls we use Claude but the Claude limit is not taken off"). Until that day a call counted on the
// session and the week only. With the plan's limits used up the person's credits pay (call.tokenSource), as before.
function chargeCall(call, usage, model) {
    const cost = chargeableTokens(usage, model);
    const orgId = call.user.organization_id || null;
    const label = { model, what: "WhatsApp call" };
    (async () => {
        const plan = call.tokenSource === "weekly_free" && /^claude-/.test(String(model)) ? await planOf(call.user).catch(() => null) : null;
        if (plan && Number(plan.claude_credits_per_week) !== 0) await chargeClaudeOnPlan(call.user._id, orgId, cost, { fable: /^claude-fable-/.test(String(model)), label });
        else await deductTokens(call.user._id, orgId, cost, call.tokenSource, { label });
    })().catch((e) => console.error("[WA call] token charge failed:", e.message));
}

// The calls this number had in the last 24 h: how many, and when each was answered (ms, oldest first)
async function callsToday(number) {
    const key = CALLS_KEY(number);
    const now = Date.now();
    await redis.zremrangebyscore(key, 0, now - DAY_MS);
    const flat = await redis.zrange(key, 0, -1, "WITHSCORES");
    const times = [];
    for (let i = 1; i < (flat || []).length; i += 2) times.push(Number(flat[i]));
    return { count: times.length, times };
}
const SAMPLE_RATE = 48000;
const FRAME = SAMPLE_RATE / 100; // 10 ms of audio
const CHAT_URL = "https://chat.classgrid.in";

const calls = new Map(); // call id -> live call
const jobNumbers = new Map(); // number -> call tasks running for it on this server

// One line of the call: kept in memory (for the recap) and written to the call's record (the Calls page in the app).
// who: caller | ai · kind: speech (said out loud) | task (a task saved) | asked (ask_classgrid) | tool (a project tool)
function line(call, who, kind, text, extra = {}) {
    const prefix = who === "caller" ? "Caller" : kind === "task" ? "AI saved a task" : kind === "asked" ? "AI asked Classgrid" : kind === "tool" ? `AI used ${extra.tool}` : "AI";
    call.transcript.push(`${prefix}: ${text}`);
    record.callLine(call.id, { at: Date.now() - call.startedAt, who: who === "caller" ? "caller" : kind === "speech" ? "ai" : "classgrid", kind, text, tool: extra.tool || "", args: extra.args || null });
}

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

// Voice to text: ElevenLabs Scribe (the grant, 2026-11-14); Cloudflare's Whisper when ElevenLabs is not set up or fails
async function speechToText(chunks) {
    if (eleven.elevenLabsEnabled()) {
        try {
            const { text } = await eleven.speechToText(wav16k(chunks), { mimeType: "audio/wav", timeoutMs: 15000 });
            return text;
        } catch (e) {
            console.error("[WA call] ElevenLabs speech to text failed, using Cloudflare:", e.message);
        }
    }
    return cfSpeechToText(chunks);
}
async function cfSpeechToText(chunks) {
    const res = await cfAiFetch(cfUrl("@cf/openai/whisper-large-v3-turbo"), {
        method: "POST", headers: cfHeaders("audio/wav"), body: wav16k(chunks), signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`speech to text ${res.status}`);
    const json = await res.json().catch(() => ({}));
    return String(json?.result?.text || "").trim();
}

// Text to voice: Classgrid's ElevenLabs voice (the grant, 2026-11-14); Cloudflare's Aura when ElevenLabs is not set up
// or fails. Raw 16-bit 48 kHz mono, the call's own format.
async function textToSpeech(text) {
    if (eleven.elevenLabsEnabled()) {
        try {
            const buf = await eleven.textToSpeech(text, { outputFormat: `pcm_${SAMPLE_RATE}`, timeoutMs: 20000 });
            if (buf.length >= 2) return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2));
        } catch (e) {
            console.error("[WA call] ElevenLabs text to speech failed, using Cloudflare:", e.message);
        }
    }
    return cfTextToSpeech(text);
}
async function cfTextToSpeech(text, retried = false) {
    let res;
    try {
        res = await cfAiFetch(cfUrl("@cf/deepgram/aura-2-en"), {
            method: "POST",
            headers: cfHeaders("application/json"),
            body: JSON.stringify({ text, encoding: "linear16", sample_rate: SAMPLE_RATE, container: "none" }),
            signal: AbortSignal.timeout(20000),
        });
    } catch (e) {
        if (!retried) return cfTextToSpeech(text, true);
        throw e;
    }
    if (!res.ok) {
        if (!retried) return cfTextToSpeech(text, true);
        throw new Error(`TTS ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2));
}

// ─── Claude (the talking part) ────────────────────────────────

export const START_TASK_TOOL = {
    name: "start_task",
    description: "Save a task for the Classgrid Agent. When the call ends, the Agent does all saved tasks, in order, in the caller's Classgrid account (it has their chats, projects, GitHub, Vercel, Google and other connected apps) and sends them the result on WhatsApp. The call goes on after this.",
    input_schema: {
        type: "object",
        properties: {
            task: { type: "string", description: "The complete task with every detail the caller gave, written for the Agent." },
            project_name: { type: "string", description: "Optional: the name of one of the caller's projects this task belongs to. The Agent's chat is then saved inside that project." },
            coding_work: { type: "boolean", description: "true when this task is coding or website work, so it runs in Project Mode; false for everything else (documents, slides, emails, research and other normal work), so it runs in a normal Agent chat." },
        },
        required: ["task", "coding_work"],
    },
};

export const ASK_CLASSGRID_TOOL = {
    name: "ask_classgrid",
    description: "Ask the Classgrid Agent right now, during the call, and get its answer back to tell the caller. It has everything in the caller's account: classrooms, chats, schedules, files, connected apps (Gmail, Google Calendar, Google Drive, Notion and more), web search and all other Classgrid tools. Use it for anything to look up or do while the caller is on the line. With project_name it first opens that project (as the editor does) so the Agent can read and change its files. It can take from a few seconds to a minute (longer when a project has to be opened).",
    input_schema: {
        type: "object",
        properties: {
            request: { type: "string", description: "What to look up or do, with every detail the caller gave." },
            project_name: { type: "string", description: "Optional: the name of one of the caller's projects to open and work in." },
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
        description: "Create a new project in the caller's account with this name.",
        input_schema: { type: "object", properties: { name: { type: "string", description: "The project name." } }, required: ["name"] },
    },
    {
        name: "list_projects",
        description: "List the caller's projects (name and linked GitHub repo).",
        input_schema: { type: "object", properties: {} },
    },
];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Names said on a call come through speech to text, so spaces, capitals and dashes are ignored ("ghost bot" = "GhostBot")
const looseName = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// The WhatsApp agent works online, so a folder project (a folder on the user's computer, desktop app only) is left out;
// withLocal: true only to keep new project names unique
const ONLINE_PROJECT = { location: { $ne: "local" } };
async function findProject(user, name, { withLocal = false } = {}) {
    const { default: IdeProject } = await import("../models/IdeProject.js");
    const where = { owner: user._id, ...(withLocal ? {} : ONLINE_PROJECT) };
    const exact = await IdeProject.findOne({ ...where, name: new RegExp(`^${escapeRegex(String(name || "").trim())}$`, "i") });
    if (exact || !looseName(name)) return exact;
    const all = await IdeProject.find(where).select("name").limit(100);
    return all.find((p) => looseName(p.name) === looseName(name)) || null;
}

// For "not found" answers: the caller's real project names, so the AI can pick the right one or ask
async function projectNames(user) {
    const { default: IdeProject } = await import("../models/IdeProject.js");
    const list = await IdeProject.find({ owner: user._id, ...ONLINE_PROJECT }).select("name").sort({ updatedAt: -1 }).limit(20).lean().catch(() => []);
    return list.length ? `The caller's projects are: ${list.map((p) => p.name).join(", ")}.` : "The caller has no projects.";
}

async function runProjectTool(call, tool) {
    const { default: IdeProject } = await import("../models/IdeProject.js");
    if (tool.name === "list_projects") {
        const list = await IdeProject.find({ owner: call.user._id, ...ONLINE_PROJECT }).select("name repo").sort({ updatedAt: -1 }).limit(20).lean();
        return list.length ? list.map((p) => `${p.name}${p.repo ? ` (GitHub: ${p.repo})` : " (no GitHub repo yet)"}`).join("\n") : "No projects yet.";
    }
    if (tool.name === "make_project") {
        const name = String(tool.input?.name || "").trim().slice(0, 80);
        if (!name) return "No name was given.";
        if (await findProject(call.user, name, { withLocal: true })) return `A project called "${name}" already exists.`;
        // (2026-11-21, owner: "fix all") A project made on a call is a cloud project, so it counts toward the plan's
        // number of projects (projects_max) like one made in the app; before, a call could make any number. With no
        // room on the plan nothing is made and the AI is told why in one sentence, so it tells the caller.
        const { makeCloudProject, cloudProjectLimitForAi } = await import("./plan-limits.service.js");
        const made = await makeCloudProject(call.user, { name });
        if (!made.ok) return cloudProjectLimitForAi(made);
        return `Project "${name}" was created.`;
    }
    return "Unknown tool.";
}

function systemPrompt(user, call = null) {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
    return [
        "You are Classgrid AI on a WhatsApp voice call with a Classgrid user.",
        `Caller: ${user.name || "unknown name"} (${user.email}). Time: ${now} (India).`,
        "What you say is read out by a text-to-speech voice. Speak the caller's language: English, Hindi or Marathi (ElevenLabs voices, 2026-11-14). Reply in the language they spoke last; a Hindi-English or Marathi-English mix is fine. Write Hindi and Marathi in Devanagari script, as plain spoken words: short sentences, no markdown, no lists, no emojis, no links.",
        // (the real time of this call, from the caller's plan: it said 15 minutes on every plan, and a Free call ends at 5)
        call ? callTimeWords(callTime(call)).line : "The call can last at most 15 minutes.",
        "After the call the Classgrid Agent does the work in the caller's account and sends them the result on WhatsApp.",
        "The work's chat is saved in Studio Mode in the caller's Classgrid app (not in Agent mode or Project Mode): when they ask where to see it, tell them to open Studio Mode.",
        "The caller can also send extra details or files (photos, PDFs, documents) in this WhatsApp chat; the Agent reads their latest WhatsApp messages before it sends the final result.",
        "You have your own email address: agent@classgrid.in. When the caller wants to email you (for example keys, files or details), tell them to send it to agent@classgrid.in; the Agent reads every email there.",
        // The caller's plan limits for tasks from calls (owner, 2026-11-17), so the AI keeps each task to what fits
        ...(call?.taskLimitsLine ? [call.taskLimitsLine] : []),
    ].join("\n");
}

// ─── The fallback model (GLM 5.3 on Cloudflare, OpenAI-style messages and tools) ────────────────────────────
// The conversation is kept in Claude's shape (text, tool_use and tool_result blocks) whichever model answered, so
// a call can move between the two at any turn. (The two shapes, the sentence cutting and the stream readers are in
// voice-stream.js: the phone app's voice mode uses them too.)

// The tools of a call, in the order the models get them
const CALL_TOOLS = [ASK_CLASSGRID_TOOL, START_TASK_TOOL, END_CALL_TOOL, ...PROJECT_TOOLS];

// A model request stops after `ms`, and also when `signal` fires (the listener stopped the answer)
function stopAfter(ms, signal = null) {
    const timeout = AbortSignal.timeout(ms);
    if (!signal) return timeout;
    if (typeof AbortSignal.any === "function") return AbortSignal.any([signal, timeout]);
    const both = new AbortController();
    const stop = (s) => () => both.abort(s.reason);
    for (const s of [signal, timeout]) { if (s.aborted) both.abort(s.reason); else s.addEventListener("abort", stop(s), { once: true }); }
    return both.signal;
}

// One spoken answer from the fallback model, streamed, for any conversation in Claude's shape (the call's, and the
// phone app's voice mode: ai-voice.controller.js). Returns { model, content, text, tools, cutOff, usage, aborted }.
// `onSentence` gets each complete sentence as it arrives, `onText` every piece of text. `signal` stops the answer:
// what had arrived by then is returned with `aborted: true` and its tokens estimated (the model reports them only
// at the end). `model` is the Workers AI model to ask (the call's fallback model unless the caller names another:
// the phone's voice mode asks GLM 5.3 first and DeepSeek Flash when GLM fails).
export async function fallbackVoiceAnswer({ system, tools, messages, noTools = false, onSentence = null, onText = null, signal = null, model = FALLBACK_MODEL }) {
    const sent = toOpenAiMessages(system, messages);
    const res = await cfAiFetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`, {
        method: "POST",
        headers: cfHeaders("application/json"),
        body: JSON.stringify({
            model,
            max_tokens: 1024,
            stream: true,
            stream_options: { include_usage: true },
            // (a call needs the first words at once: the model's thinking is off, it answered in half a second in the test)
            ...noThinkingFor(model),
            messages: sent,
            tools: tools.map(toOpenAiTool),
            tool_choice: noTools ? "none" : "auto",
        }),
        signal: stopAfter(45000, signal),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${model} ${res.status}: ${JSON.stringify(err.errors || err.error || err).slice(0, 300)}`);
    }
    let read, aborted = false;
    try {
        read = await readOpenAiStream(res, onSentence, onText);
    } catch (e) {
        if (!signal?.aborted || !e?.partial) throw e;
        read = e.partial;
        aborted = true;
    }
    const { choice, usage: u } = read;
    const content = fromOpenAiAnswer(choice.message);
    const text = content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
    const usage = { prompt_tokens: u.prompt_tokens || 0, completion_tokens: u.completion_tokens || 0 };
    if (aborted) {
        usage.prompt_tokens ||= Math.ceil(JSON.stringify(sent).length / 4);
        usage.completion_tokens = Math.max(usage.completion_tokens, Math.ceil(text.length / 4));
    }
    return { model, content, text, tools: content.filter((b) => b.type === "tool_use"), cutOff: choice.finish_reason === "length", usage, aborted };
}

async function fallbackTurn(call, { noTools = false, onSentence = null } = {}) {
    const answer = await fallbackVoiceAnswer({ system: systemPrompt(call.user, call), tools: CALL_TOOLS, messages: call.messages, noTools, onSentence });
    chargeCall(call, answer.usage, FALLBACK_MODEL);
    if (answer.content.length) call.messages.push({ role: "assistant", content: answer.content });
    return { text: answer.text, tools: answer.tools, cutOff: answer.cutOff };
}

async function claudeTurn(call, { noTools = false, onSentence = null } = {}) {
    try {
        return await claudeOnlyTurn(call, { noTools, onSentence });
    } catch (e) {
        // Claude is out (its monthly limit, an outage): the call goes on with GLM 5.3, same conversation and tools
        console.warn(`[WA call] Claude failed (${e.message.slice(0, 160)}); answering with ${FALLBACK_MODEL}`);
        return fallbackTurn(call, { noTools, onSentence });
    }
}

// The answer comes as a stream (owner, 2026-11-14: the 2-3 s wait before the AI spoke felt like it would not answer):
// `onSentence` gets each sentence the moment it is complete, so the first one is being made into voice while
// Claude is still writing the rest. The whole answer is still returned, in Claude's content-block shape.
// One spoken answer from Claude (the fast call model, no thinking), for any conversation in Claude's shape (the
// call's, and the phone app's voice mode: ai-voice.controller.js). Returns { model, content, text, tools, cutOff,
// usage, aborted }. `onText` gets every piece of text as it is written. `signal` stops the answer: what had
// arrived by then is returned with `aborted: true` (its text only, no tool request), with the tokens used so far.
export async function claudeVoiceAnswer({ system, tools, messages, noTools = false, onSentence = null, onText = null, signal = null, model = CALL_MODEL }) {
    const ask = () => fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
            model,
            max_tokens: 1024,
            stream: true,
            system,
            tools,
            ...(noTools ? { tool_choice: { type: "none" } } : {}),
            messages,
        }),
        signal: stopAfter(45000, signal),
    });
    let res = await ask();
    if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500));
        res = await ask();
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Claude ${res.status}: ${JSON.stringify(err.error || err).slice(0, 300)}`);
    }
    let data, aborted = false;
    try {
        data = await readClaudeStream(res, onSentence, onText);
    } catch (e) {
        if (!signal?.aborted || !e?.partial) throw e;
        data = e.partial;
        aborted = true;
    }
    const u = data.usage || {};
    const content = data.content || [];
    const text = content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
    const usage = {
        prompt_tokens: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0),
        completion_tokens: u.output_tokens || 0,
        cache_read_input_tokens: u.cache_read_input_tokens || 0,
        cache_creation_input_tokens: u.cache_creation_input_tokens || 0,
    };
    // (a stopped answer never got its final count: what it wrote is counted by its length)
    if (aborted) usage.completion_tokens = Math.max(usage.completion_tokens, Math.ceil(text.length / 4));
    return { model, content, text, tools: content.filter((b) => b.type === "tool_use"), cutOff: data.stop_reason === "max_tokens", usage, aborted };
}

async function claudeOnlyTurn(call, { noTools = false, onSentence = null } = {}) {
    // ask_classgrid is back (owner's choice, 2026-10-24 evening): the AI can work during the call, so it opens
    // or makes the project right away and the tasks are saved with it
    const answer = await claudeVoiceAnswer({ system: systemPrompt(call.user, call), tools: CALL_TOOLS, messages: call.messages, noTools, onSentence });
    chargeCall(call, answer.usage, CALL_MODEL);
    // An empty answer is not kept (the API refuses a conversation with an empty message in it)
    if (answer.content.length) call.messages.push({ role: "assistant", content: answer.content });
    return { text: answer.text, tools: answer.tools, cutOff: answer.cutOff };
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

// One part of speech: its voice is requested at once (parts are made in parallel) and queued to play in the order
// the parts were said. `gen` is the reply this part belongs to: when the caller talks over the AI, speakGen moves
// on and the parts still being made are dropped.
function sayPart(call, part, gen) {
    if (!part || call.ended) return Promise.resolve();
    const audio = textToSpeech(part).catch((e) => { console.error("[WA call] TTS failed:", e.message); return null; });
    // The AI counts as talking from the moment a part is requested, also in the short gaps between parts (else its
    // own voice coming back from the phone in a gap would be taken as the caller speaking)
    call.speakingParts = (call.speakingParts || 0) + 1;
    const prev = call.sayChain || Promise.resolve();
    call.sayChain = prev.then(async () => {
        try {
            const pcm = await audio;
            if (call.ended || (call.speakGen || 0) !== gen) return;
            if (pcm) call.outQueue.push(pcm);
        } finally {
            call.speakingParts--;
        }
    });
    return call.sayChain;
}

// Spoken part by part: every part is made into voice at the same time and played in order as soon as it is
// ready, so the first words come quickly and a long reply never hits the voice service's time limit
async function speak(call, text) {
    if (!text || call.ended) return;
    const gen = call.speakGen || 0;
    for (const part of speechParts(text)) sayPart(call, part, gen);
    await call.sayChain;
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
        line(call, "caller", "speech", said);
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

async function runTool(call, t, cutOff, { canHangUp = true } = {}) {
    // A tool request cut off by the answer length limit has a broken input: ask the AI to try again
    if (cutOff) return { content: "Your request was cut off before it was complete. Try again, shorter.", is_error: true };
    // Owner, 2026-11-09: calls were cut the moment a task was saved or a tool answered, because the AI asked to hang
    // up in the same turn, before it had told the caller anything. Hanging up is only done in a turn of its own,
    // after the AI has spoken (its goodbye).
    if (t.name === "end_call" && !canHangUp) {
        return { content: "Not hung up: the caller has not heard your answer yet. Tell them the result (or that the task is saved), and when they say goodbye call end_call on its own, with your goodbye in the same reply.", is_error: true };
    }
    if (t.name === "start_task") {
        const task = String(t.input?.task || "").trim();
        const project = t.input?.project_name ? await findProject(call.user, t.input.project_name).catch(() => null) : null;
        if (!task) return { content: "Nothing was saved: the task text was empty. Call start_task again with the full task.", is_error: true };
        // The plan's task limits (owner, 2026-11-17): tasks one call may start, and tasks from calls running at once
        // for this person (the running ones from the call records, and this person's other live calls that already
        // saved a task). A task past a limit is not started (call tasks have no queue); the AI tells the caller.
        const refusal = await callTaskRefusal(call.taskCaps, {
            savedThisCall: call.tasks.length,
            running: async () => {
                const others = [...calls.values()].filter((c) => c !== call && !c.ended && c.tasks.length && String(c.user._id) === String(call.user._id)).length;
                return others + (await runningCallTasks(call.user._id).catch(() => 0));
            },
        });
        if (refusal) {
            const { plan, paidNames } = await planWording(call.user).catch(() => ({ plan: null, paidNames: [] }));
            const why = callTaskRefusedToolText(refusal, { plan, paidNames });
            line(call, "ai", "tool", `Task not started (plan limit): ${task}`, { tool: "start_task", args: { refused: refusal.why } });
            return { content: why, is_error: true };
        }
        call.tasks.push({ task, project, coding: t.input?.coding_work === true });
        line(call, "ai", "task", task, { tool: "start_task", args: { project_name: t.input?.project_name || "", coding_work: t.input?.coding_work === true } });
        return {
            content: project || !t.input?.project_name
                ? `Task saved (${call.tasks.length} so far). It starts when the call ends.`
                : `Task saved (${call.tasks.length} so far), but there is no project called "${t.input.project_name}". ${await projectNames(call.user)}`,
        };
    }
    if (t.name === "end_call") return { content: "Hanging up." };
    if (t.name === "ask_classgrid") {
        line(call, "ai", "asked", String(t.input?.request || ""), { tool: "ask_classgrid", args: { project_name: t.input?.project_name || "" } });
        return { content: await askClassgridLive(call, String(t.input?.request || ""), t.input?.project_name) };
    }
    if (PROJECT_TOOLS.some((p) => p.name === t.name)) {
        const out = await runProjectTool(call, t);
        line(call, "ai", "tool", out, { tool: t.name, args: t.input || {} });
        return { content: out };
    }
    return { content: "This tool is not available.", is_error: true };
}

async function reply(call) {
    // A few rounds, so the AI can use a tool and then talk about the result
    for (let round = 0; round < 4 && !call.ended; round++) {
        const gen = call.speakGen || 0;
        let spoken = false;
        const { text, tools, cutOff } = await claudeTurn(call, { onSentence: (sentence) => { spoken = true; sayPart(call, sentence, gen); } });
        if (text) line(call, "ai", "speech", text);
        if (spoken) await call.sayChain; else await speak(call, text);
        if (!tools.length || call.ended) return;
        // Every tool the AI asked for gets its answer in one message, even when a tool fails
        // (a request without its answer would make every later turn of the call fail)
        // The AI may hang up only when end_call is its only tool in this turn and it said something (its goodbye)
        const canHangUp = tools.length === 1 && !!text;
        const results = [];
        for (const t of tools) {
            let out;
            try { out = await runTool(call, t, cutOff, { canHangUp }); } catch (e) { out = { content: `Failed: ${e.message}`, is_error: true }; }
            results.push({ type: "tool_result", tool_use_id: t.id, content: String(out.content || "Done."), ...(out.is_error ? { is_error: true } : {}) });
        }
        call.messages.push({ role: "user", content: results });
        if (canHangUp && tools.some((t) => t.name === "end_call") && !cutOff) {
            await speakingDone(call);
            endCall(call.id, "AI hung up");
            return;
        }
    }
    // Still using tools after 4 rounds: one last answer without tools, so the results are said
    if (!call.ended) {
        const gen = call.speakGen || 0;
        let spoken = false;
        const { text } = await claudeTurn(call, { noTools: true, onSentence: (sentence) => { spoken = true; sayPart(call, sentence, gen); } });
        if (text) line(call, "ai", "speech", text);
        if (spoken) await call.sayChain; else await speak(call, text);
    }
}

// How long this call may last and what ends it: the plan's call minutes of the period, or its longest call
const callTime = (call) => {
    const maxMs = call.maxMs || MAX_CALL_MS;
    return { maxMs, planName: call.planName || "", minutesRunOut: !!call.freeUntil && maxMs <= Math.max(10000, call.freeUntil - call.startedAt) + 1000 };
};

function wrapUp(call) {
    if (call.ended) return;
    const run = async () => {
        while (call.busy && !call.ended) await new Promise((r) => setTimeout(r, 100));
        if (call.ended) return;
        // Added only between turns, so it never lands between a tool request and its answer
        // (with the reason, so the AI can tell the caller why the call is ending)
        call.messages.push({ role: "user", content: callTimeWords(callTime(call)).ends });
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
    const maxMs = call.maxMs || MAX_CALL_MS;
    const limit = call.startedAt + maxMs + OVERTIME_MS;
    const check = () => {
        if (call.ended) return;
        const talking = call.speech.active || call.busy || aiIsTalking(call);
        if (talking && Date.now() < limit) call.hardStop = setTimeout(check, 500);
        // (ended because the period's call minutes ran out, not because of the longest call: the caller is told so)
        else endCall(call.id, call.freeUntil && maxMs <= Math.max(10000, call.freeUntil - call.startedAt) + 1000 ? "free minutes used" : "time limit");
    };
    check();
}

export function endCall(callId, why = "ended") {
    const call = calls.get(callId);
    if (!call || call.ended) return;
    call.ended = true;
    call.endedAt = Date.now();
    calls.delete(callId);
    clearInterval(call.ticker);
    clearTimeout(call.wrapTimer);
    clearTimeout(call.hardStop);
    try { call.sink?.stop(); } catch { /* already stopped */ }
    try { call.pc?.close(); } catch { /* already closed */ }
    if (why !== "remote") callAction(callId, "terminate").catch(() => { /* call already over */ });
    console.log(`[WA call] ${callId} ended (${why}) after ${Math.round((Date.now() - call.startedAt) / 1000)}s`);
    record.callEnded(callId, { why, startedAt: call.startedAt, tasks: call.tasks });
    // The call's time counts against the caller's free minutes
    User.updateOne({ _id: call.user._id }, { $inc: { ai_call_seconds_used: Math.ceil((call.endedAt - call.startedAt) / 1000) } })
        .catch((e) => console.error("[WA call] could not count the call's minutes:", e.message));
    afterCall(call, why).catch((e) => console.error("[WA call] after-call work failed:", e.message));
}

// A 2-3 line recap of a call with no saved task, written by the call model from the conversation
const RECAP_PROMPT = "Write a short WhatsApp recap (2-3 lines, no title, plain text, WhatsApp *bold* allowed) of this Classgrid AI phone call for the caller, talking to them as \"you\", in the language the caller spoke on the call (English, Hindi or Marathi). Include any answers they were given.";
async function callSummary(call) {
    const lines = call.transcript.filter((l) => l.startsWith("Caller:") || l.startsWith("AI:")).join("\n").slice(-6000);
    if (!lines) return "";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
            model: CALL_MODEL,
            max_tokens: 300,
            system: RECAP_PROMPT,
            messages: [{ role: "user", content: lines }],
        }),
        signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        // Claude is out (its monthly limit, an outage): GLM 5.3 on Cloudflare writes the recap
        console.warn(`[WA call] Claude ${res.status} for the recap; writing it with ${FALLBACK_MODEL}`);
        const alt = await cfAiFetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`, {
            method: "POST",
            headers: cfHeaders("application/json"),
            body: JSON.stringify({ model: FALLBACK_MODEL, max_tokens: 300, ...noThinkingFor(FALLBACK_MODEL), messages: [{ role: "system", content: RECAP_PROMPT }, { role: "user", content: lines }] }),
            signal: AbortSignal.timeout(20000),
        });
        const altData = await alt.json().catch(() => ({}));
        if (!alt.ok) return "";
        const au = altData.usage || {};
        chargeCall(call, { prompt_tokens: au.prompt_tokens || 0, completion_tokens: au.completion_tokens || 0 }, FALLBACK_MODEL);
        return String(altData.choices?.[0]?.message?.content || "").trim();
    }
    const u = data.usage || {};
    chargeCall(call, { prompt_tokens: u.input_tokens || 0, completion_tokens: u.output_tokens || 0 }, CALL_MODEL);
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
}

async function afterCall(call, why) {
    if (why === "error" || /^connection/.test(why)) {
        const text = `Sorry, the call dropped${call.tasks.length ? ", but your request is saved and Classgrid AI is working on it" : ""}. You can call again anytime.`;
        record.noteSentForCall(call.id, text);
        await sendWhatsappText(call.from, text);
    }
    if (why === "free minutes used") {
        // Free: call again when the minutes or the limit come back, or upgrade; other plans: or top up
        const { plan, paidNames } = await planWording(call.user).catch(() => ({ plan: null, paidNames: [] }));
        const text = callMinutesUsedUpText({ plan, paidNames, backAt: call.limitBackAt, taskSaved: call.tasks.length > 0 });
        record.noteSentForCall(call.id, text);
        await sendWhatsappText(call.from, text);
    }
    if (!call.tasks.length) {
        // No task: a short recap of the call (questions were already answered live)
        if (call.transcript.some((l) => l.startsWith("Caller:"))) {
            const recap = await callSummary(call).catch(() => "");
            if (recap) {
                record.callRecap(call.id, recap);
                await sendWhatsappText(call.from, `📞 *Your call with Classgrid AI*\n${recap}`);
            }
        }
        return;
    }
    // Owner's rule (2026-10-24): one call = one background job. All its tasks run together in one chat, inside the
    // project if any of them names one (a call once split into two jobs: double "Got it", and the user's replies
    // went to the job without the project)
    // Owner's rule (2026-10-26): only coding or website work runs in Project Mode; everything else (a PPTX, an email,
    // research) runs in a normal Agent chat with no project. Coding work with no project named on the call: one is
    // made now, named after the task, so the work starts inside it
    let project = call.tasks.find((t) => t.project)?.project || null;
    if (!project && call.tasks.some((t) => t.coding)) {
        const { default: IdeProject } = await import("../models/IdeProject.js");
        const words = String(call.tasks[0]?.task || "Call task").replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 4);
        const base = (words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ") || "Call Task").slice(0, 60);
        let name = base;
        for (let i = 2; await findProject(call.user, name, { withLocal: true }).catch(() => null); i++) name = `${base} ${i}`;
        // (inside the plan's number of projects, like one made with make_project on the call: it was made with no count)
        const { makeCloudProject, cloudProjectLimitForAi } = await import("./plan-limits.service.js");
        const made = await makeCloudProject(call.user, { name }).catch((e) => { console.error("[WA call] project could not be made:", e.message); return null; });
        project = made?.ok ? made.project : null;
        // (no room: the work runs in a normal chat, and the Agent tells the person why there is no project)
        if (made && !made.ok) call.tasks[0].task = `${call.tasks[0].task}\n\n[${cloudProjectLimitForAi(made)} Do the work in this chat without a project.]`;
        if (project) console.log(`[WA call] ${call.id}: no project named, made "${name}" (Project Mode only)`);
        if (project) record.callProject(call.id, { projectId: project._id, projectName: project.name, made: true });
    } else if (project) {
        record.callProject(call.id, { projectId: project._id, projectName: project.name, made: false });
    }
    const groups = new Map([[project ? String(project._id) : "none", { project, tasks: call.tasks.map((t) => t.task) }]]);
    // Work the AI started live during the call for the same project finishes first; the task then carries on in
    // that same chat instead of doing it all again (it once built one project twice)
    const announced = call.liveWorks.length > 0;
    if (announced) {
        // The user hears from us now, not only when the live work is done (the task doesn't say it again)
        const text = `Got it. Classgrid AI is working on it now. I'll send you the result here when it's done.${call.callsLine ? `\n${call.callsLine}` : ""}`;
        record.noteSentForCall(call.id, text);
        await sendWhatsappText(call.from, text);
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
            callStartedAt: call.startedAt, callId: call.id,
            // The minutes of work the caller's plan gives a task from a call (null = no limit)
            workCapMs: call.taskCaps?.maxMinutes ? call.taskCaps.maxMinutes * 60000 : null,
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
            // The link opens the call's record in the app (read-only), never a chat
            const link = (await record.linkForCall(job.callId)) || (job.sessionId ? `${CHAT_URL}/agent/${job.sessionId}` : "");
            const text = `Sorry, Classgrid AI could not finish your task after ${MAX_TRIES} tries.${link ? `\n\nWhat it did so far: ${link}` : ""}`;
            await record.markFailedForCall(job.callId, `Could not finish after ${MAX_TRIES} tries.`);
            record.noteSentForCall(job.callId, text);
            await sendWhatsappText(job.from, text);
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
                projectId: job.projectId, projectName: job.projectName, workCapMs: job.workCapMs || null,
            });
            await save();
            // The call's record now belongs to this task (every run of the task is written to it)
            record.attachTask(job.callId, { taskId: job.taskId, sessionId: job.sessionId, projectId: job.projectId, projectName: job.projectName });
        }
        // The minutes of work the caller's plan gives this task (owner, 2026-11-17): used up already (a run after a
        // restart), the task is ended; else the run stops when they run out
        const work = await AgentTask.findById(job.taskId).select("work_cap_ms work_ms").lean().catch(() => null);
        if (work && workLeftMs(work) <= 0) {
            await tasks.endForWorkCap({ _id: job.taskId }, user);
            await forget();
            return;
        }
        // Every minute: the task is marked as running, and if it was deleted meanwhile the run is stopped
        const stop = new AbortController();
        const taskBeat = setInterval(async () => {
            if (await taskGone()) { stop.abort(); return; }
            AgentTask.updateOne({ _id: job.taskId, status: "working" }, { $set: { heartbeat_at: new Date() } }).catch(() => {});
        }, 60 * 1000);
        // Every tool, its timing, the thinking and the model of this run go into the call's record
        const rec = record.runRecorder(job.taskId, { reason: resumed ? "restart" : "call", attempt: job.attempts });
        // The run's minutes start here, right before the run (its finally stops the clock)
        const clock = workClock({ _id: job.taskId, ...(work || {}) }, stop, tasks.addWorkTime);
        // (the AI doing the task is told the minutes of work the caller's plan gives it: the run was cut mid-work without a word)
        const result = await runAgentTask(user, question + workTimeNote(workLeftMs(work), work?.work_cap_ms), job.projectId, (sessionId) => {
            tasks.setTaskSession(job.taskId, sessionId);
            if (job.sessionId) return;
            job.sessionId = sessionId;
            save();
            if (!job.announced) {
                const text = `Got it. Classgrid AI is working on it now${where}. I'll send you the result here when it's done.${job.callsLine ? `\n${job.callsLine}` : ""}`;
                record.noteSent(job.taskId, text);
                sendWhatsappText(job.from, text);
            }
        }, job.sessionId, (stepText, info) => {
            // Each finished tool step is kept, so a resume after a restart knows what not to redo
            job.steps = [...(job.steps || []), stepText].slice(-40);
            if (!stepText.startsWith("sleep_until")) stepsThisRun++;
            if (info?.name === "send_whatsapp_message") sends.push(info);
            tasks.logTaskStep(job.taskId, info);
            save();
        }, { taskOrigin: "whatsapp" }, stop.signal, rec.onData).finally(() => { clearInterval(taskBeat); return clock.done(); });
        await clock.done();
        await rec.end(result);
        // Its minutes of work ran out during this run: the task is ended and the user told
        if (clock.hit() && !(await taskGone())) {
            await tasks.endForWorkCap({ _id: job.taskId }, user, result.answer || "");
            await forget();
            return;
        }
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
    // A plan with no tasks from calls (any task limit 0): live work is answered only while the call lasts
    const caps = call.taskCaps || {};
    const duringCallOnly = caps.perCall === 0 || caps.atOnce === 0 || caps.maxMinutes === 0;
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
        // The minutes of work the caller's plan gives a task from a call apply to live work too (owner, 2026-11-17).
        // A plan with no tasks from calls (any task limit 0): live work is answered only while the call lasts; at
        // hang-up it stops, since work going on after the call is what such a plan leaves out.
        const maxMinutes = caps.maxMinutes || 0;
        const stop = maxMinutes || duringCallOnly ? new AbortController() : null;
        const clock = workClock({ work_cap_ms: maxMinutes * 60000, work_ms: 0 }, stop);
        let hungUp = false;
        const hangUpWatch = duringCallOnly ? setInterval(() => { if (call.ended) { hungUp = true; stop.abort(); } }, 2000) : null;
        try {
            // whatsappSince: the live work reads only the WhatsApp messages sent since this call started (no old ones).
            // liveCall: its chat is filed as the call's work (Studio only, under the call), never as a normal chat.
            const out = await runAgentTask(call.user, question, project?._id, (id) => { call.liveSessions[key] ||= id; }, call.liveSessions[key] || null, null, { whatsappSince: call.startedAt, liveCall: true }, stop?.signal || null);
            const sessionId = out.sessionId || call.liveSessions[key] || null;
            if (clock.hit()) return { ...out, sessionId, answer: "", error: `it used the ${maxMinutes} minute${maxMinutes === 1 ? "" : "s"} of work a task from a call gets on your plan`, key };
            if (hungUp) return { ...out, sessionId, answer: "", error: "the call ended, and work after a call is not part of your plan", key };
            return { ...out, key };
        } finally {
            if (hangUpWatch) clearInterval(hangUpWatch);
            await clock.done();
            stopKeepOpen();
        }
    })();
    call.livePending[pendingKey] = true;
    const liveStartedAt = new Date();
    const safeWork = work.catch((e) => ({ answer: "", error: e.message })).finally(() => { call.livePending[pendingKey] = false; });
    // After the call, a saved task for the same project waits for this work and carries on in its chat
    call.liveWorks.push(safeWork);
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 90 * 1000));
    const result = await Promise.race([safeWork, timeout]);
    if (!result) {
        safeWork.then(async (r) => {
            record.callLiveWork(call.id, { key: r.key, sessionId: r.sessionId, request, startedAt: liveStartedAt, answer: r.answer, error: r.error, late: true });
            // A saved task for the same project carries on in this chat and sends the result (no second message)
            if (call.ended && call.tasks.some((t) => (t.project ? String(t.project._id) : "none") === r.key)) return;
            // The link opens the call's record in the app (read-only), never a chat
            const link = (await record.linkForCall(call.id)) || (r.sessionId ? `${CHAT_URL}/agent/${r.sessionId}` : "");
            const text = `${r.answer || `Classgrid AI could not finish this${r.error ? `: ${r.error}` : "."}`}${link ? `\n\n${link}` : ""}`;
            record.noteSentForCall(call.id, text);
            sendWhatsappText(call.from, text);
        });
        if (duringCallOnly) return "Still working on it. The caller's plan does not include work after the call: if it is ready while the call is on, the answer is sent to the caller on WhatsApp; if the call ends first, the work stops. Tell the caller that plainly.";
        return "Still working on it. The answer will be sent to the caller on WhatsApp when it is ready.";
    }
    record.callLiveWork(call.id, { key: result.key, sessionId: result.sessionId, request, startedAt: liveStartedAt, answer: result.answer, error: result.error, late: false });
    // (the caller's usage is used up: said plainly; it was "Classgrid could not answer: Insufficient tokens.")
    if (!result.answer && result.quota) return askRefusedForUsage(result.quota.resetDate);
    if (!result.answer) return `Classgrid could not answer${result.error ? `: ${result.error}` : "."}`;
    return result.answer.slice(0, 4000);
}

// A short login token for this user, for calling our own routes as them (same checks as their own login). internal:
// the server's own token, never one of the person's devices (Settings > Devices; 2026-11-17 each voice-mode task made
// a new "phone" row)
function userToken(user) {
    return jwt.sign(
        { id: user._id, role: user.role, organizationId: user.organization_id || null, rememberMe: false, internal: true },
        getJwtSecret(),
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
// onData: every event of the answer as it streams (a woken chat shows it live: chat-wake.service.js)
export async function runAgentTask(user, question, projectId, onSession, sessionId = null, onStep = null, extraBody = {}, signal = null, onData = null) {
    try {
        return await runAgentTaskOnce(user, question, projectId, onSession, sessionId, onStep, extraBody, signal, onData);
    } catch (e) {
        if (signal?.aborted) return { sessionId, answer: "", error: "the task was deleted", aborted: true };
        throw e;
    }
}

async function runAgentTaskOnce(user, question, projectId, onSession, sessionId, onStep, extraBody, signal, onData) {
    const port = process.env.PORT || 3000;
    const res = await fetch(`http://127.0.0.1:${port}/api/ai/ask`, {
        ...(signal ? { signal } : {}),
        method: "POST",
        // (phone: true in extraBody: the work is for the Classgrid phone app, so the request says so the way the app
        // itself does, and the chat is filed and answered by the phone's rules: utils/client-app.js)
        headers: { Authorization: `Bearer ${userToken(user)}`, "Content-Type": "application/json", ...(extraBody?.phone === true ? { "X-Platform-App": "android" } : {}) },
        // projectId: the chat is saved inside that Project Mode project
        // allTools: every tool and plugin is loaded from the start (owner's rule)
        body: JSON.stringify({ question, allTools: true, ...(sessionId ? { sessionId } : {}), ...(projectId ? { projectId: String(projectId) } : {}), ...extraBody }),
    });
    if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        const quota = err.error === "ai_quota_exceeded" || err.code === "fable_needs_paid_credits" ? { resetDate: err.resetDate || null } : null;
        // (status and code: the request was refused before anything was saved in the chat, and why: the usage limit,
        // the week's Claude credits, a model that is not in the plan, the new-chat limit)
        return { sessionId, answer: "", error: err.message || err.error || `the request failed (${res.status})`, quota, status: res.status, code: String(err.code || err.error || "") };
    }
    let quota = null;
    let buffer = "", answer = "", streamed = "", error = "", code = "";
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
                try { onData?.(data); } catch { /* only for showing it live */ }
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
                    if (data.code) code = String(data.code); // (a refusal by the plan, e.g. chats_cap_reached)
                    if (String(data.error || "").startsWith("ai_quota_exceeded")) quota = { resetDate: String(data.error).split("|")[1] || null };
                }
            } catch { /* not JSON */ }
        }
    }
    const finalAnswer = String(answer || (error ? "" : streamed)).trim();
    // Tokens ran out partway through: the answer ends with the budget note
    // (isBudgetStop: the note names the limit that ran out now, so it is known by its shape, not by one fixed sentence)
    if (!quota && (finalAnswer.endsWith(BUDGET_STOP_NOTE) || isBudgetStop(finalAnswer))) quota = { resetDate: null };
    return { sessionId, answer: finalAnswer, error, quota, ...(code ? { code } : {}) };
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

// taskCaps: the plan's limits for tasks from this call (call-limits.service.js callTaskCaps); taskLimitsLine: the same,
// told to the AI in its instructions
export async function answerCall({ id, from, sdp, user, tokenSource, callsLine = "", maxMs = MAX_CALL_MS, freeUntil = 0, paidOk = true, limitBackAt = null, taskCaps = null, taskLimitsLine = "", planName = "" }) {
    const { RTCPeerConnection, nonstandard } = await loadWrtc();
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }], portRange: { min: 10000, max: 60000 } });
    const source = new nonstandard.RTCAudioSource();
    const call = {
        id, from, user, pc, source, tokenSource, callsLine, maxMs, freeUntil, paidOk, limitBackAt, taskCaps: taskCaps || callTaskCaps(null), taskLimitsLine, planName,
        startedAt: Date.now(), ended: false, busy: false, tasks: [],
        messages: [], transcript: [],
        outQueue: [], outCurrent: null, outPos: 0, speechEndedAt: 0,
        speech: { active: false, chunks: [], loud: 0, quiet: 0, ms: 0, loudMs: 0 }, pending: [], liveSessions: {}, livePending: {}, liveWorks: [],
    };
    calls.set(id, call);
    // The call's record exists from its first second (the Calls page in the app shows it as live)
    record.callStarted({ callId: id, user, phone: from, startedAt: call.startedAt, model: CALL_MODEL });

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

    call.wrapTimer = setTimeout(() => wrapUp(call), Math.max(5000, call.maxMs - (MAX_CALL_MS - WRAP_UP_MS)));
    call.hardStop = setTimeout(() => timeUp(call), call.maxMs);

    // Greeting
    const first = String(user.name || "").split(" ")[0];
    const hello = `Hi${first ? ` ${first}` : ""}, this is Classgrid AI. What can I do for you?`;
    line(call, "ai", "speech", hello);
    call.messages.push({ role: "user", content: "[Call connected.]" }, { role: "assistant", content: hello });
    speak(call, hello);
    return true;
}

// Simple voice detection: a turn starts when the caller gets loud and ends after 0.6 s of quiet.
// While the AI is talking (and a moment after) the caller's audio is ignored, so the AI never hears itself.
function listen(call, samples) {
    if (call.ended) return;
    const s = call.speech;
    const aiTalking = aiIsTalking(call);
    // Right after the AI stops, a short tail of its own voice can still come back: skip it
    if (!aiTalking && !s.active && Date.now() - call.speechEndedAt < 300) { s.loud = 0; s.chunks = []; return; }
    const ms = (samples.length / SAMPLE_RATE) * 1000;
    // While the AI talks, only a clearly louder voice for a moment counts (not an echo of the AI). Owner, 2026-11-14:
    // talking over the AI was too hard to do (1500 / 250 ms), so a little less loudness, a little less time.
    const loud = rms(samples) > (aiTalking ? 1150 : 700);
    if (!s.active) {
        // Loud time adds up, quiet gaps (between words) take it down slowly, so a voice is noticed quickly
        s.loud = loud ? s.loud + ms : Math.max(0, s.loud - ms / 2);
        s.chunks.push(samples);
        if (s.chunks.length > 100) s.chunks.shift(); // keep 1 s of audio from just before the speech is noticed
        if (s.loud >= (aiTalking ? 160 : 60)) {
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
    if (s.quiet >= 600 || s.ms >= 15000) {
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
                await sendWhatsappText(from, "This WhatsApp number is not linked to a Classgrid account. Sign in to Classgrid (the phone app, the desktop app or https://chat.classgrid.in), verify this number in Settings, then call again.");
                continue;
            }
            // The same credit check as the chat, for every call: the model that answers a call is counted on the
            // session and the week like any model (see chargeCall), so with those used up and no credits a call is
            // not taken, call minutes left or not. (Until 2026-11-21 a call inside the plan's call minutes was taken
            // and answered with the session at 100 percent.) The call minutes still say how long the calls of the
            // month may be in all.
            const free = await freeCallSeconds(user).catch(() => null);
            const enough = await hasEnoughTokens(user._id, user.organization_id || null, 1).catch(() => null);
            if (!enough?.allowed || !free) {
                await callAction(c.id, "reject").catch(() => {});
                const { plan, paidNames } = await planWording(user).catch(() => ({ plan: null, paidNames: [] }));
                await sendWhatsappText(from, enough && /insufficient/i.test(enough.reason || "")
                    ? callRefusedLimitText({ plan, paidNames, backAt: callsBackAt(enough, null) })
                    : "Classgrid AI can't take calls for your account right now. Please try again later.");
                continue;
            }
            // The plan's call minutes are a real limit (owner, 2026-11-21: "you are not cutting the minutes talked from
            // the total minutes, so all the WhatsApp limits are fake"). The minutes were counted, but they stopped
            // nobody: a caller with credit left in the session could call on after the period's minutes were used up
            // (they only decided when credits began to be cut). Now no call is taken once the period's minutes are
            // used up, and a call ends when they run out (maxMs below). (The minutes that could not be read: no call,
            // above.)
            if (free.left <= 0) {
                await callAction(c.id, "reject").catch(() => {});
                const { plan, paidNames } = await planWording(user).catch(() => ({ plan: null, paidNames: [] }));
                await sendWhatsappText(from, callMinutesUsedUpText({ plan, paidNames, backAt: free.resetAt }));
                continue;
            }
            // Calls per day, week and month (owner, 2026-11-17: each can be set, a call is taken only when every set
            // limit has room). The day: answered calls of this number in 24 hours, the plan's number (plans on), never
            // above the 50 the owner set. The week and month: this person's answered calls in the last 7 and 30 days,
            // from the call records. And the plan's longest call, never above 15 minutes. (If a count can't be read,
            // that limit lets the call through.)
            const callPlan = await planOf(user).catch(() => null);
            const countCaps = callCountCaps(callPlan, MAX_CALLS_PER_DAY);
            const planMaxMs = callPlan && !isUnlimited(callPlan.call_max_minutes) ? Math.min(MAX_CALL_MS, Math.max(60000, (Number(callPlan.call_max_minutes) || 0) * 60000)) : MAX_CALL_MS;
            const number = normalizeWhatsappNumber(from);
            const today = await callsToday(number).catch(() => null);
            const longer = countCaps.month !== null ? MONTH_MS : countCaps.week !== null ? WEEK_MS : 0;
            const recent = longer ? await callTimesSince(user._id, Date.now() - longer).catch(() => []) : [];
            const callTimes = { day: today?.times || [], week: recent, month: recent };
            const full = fullCallLimit(countCaps, callTimes);
            if (full) {
                await callAction(c.id, "reject").catch(() => {});
                const { plan, paidNames } = await planWording(user).catch(() => ({ plan: null, paidNames: [] }));
                await sendWhatsappText(from, callCountLimitText({ plan, paidNames, which: full.which, cap: full.cap, backAt: full.backAt }));
                continue;
            }
            // The plan's limits for tasks from this call: how many it may start, how many may run at once, and the
            // minutes of work each may use (call-limits.service.js)
            const taskCaps = callTaskCaps(callPlan);
            // A call ends at the plan's longest call or when the period's call minutes run out, whichever is first
            const maxMs = Math.min(planMaxMs, Math.max(10000, free.left * 1000));
            const freeUntil = free.left > 0 ? Date.now() + free.left * 1000 : 0;
            markBusy(number, maxMs / 1000 + 120);
            const callsLine = callsLineText(countCaps, callTimes);
            const answered = await answerCall({ id: c.id, from, sdp: c.session.sdp, user, tokenSource: enough?.source || "personal", callsLine, maxMs, freeUntil, paidOk: !!enough?.allowed, limitBackAt: free.resetAt, taskCaps, taskLimitsLine: callTaskLimitsLine(taskCaps, callPlan), planName: callPlan?.name || "" });
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
