/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
// The phone app's fast voice mode (owner, 2026-11-15: voice mode on the phone must answer as fast as the WhatsApp
// voice call). POST /api/ai/voice/turn: the phone sends what its recogniser heard and gets ONE stream back with the
// answer's text as it is written and the voice of every sentence as soon as that sentence is ready.
//
// It is fast for the same reasons the call is (whatsapp-call.service.js), and uses the call's own functions:
// - a fast model is asked directly and streamed, with its thinking off and a short spoken prompt (owner, 2026-11-15:
//   voice mode answers with GLM 5.3, and with DeepSeek Flash when GLM fails; Claude is not used here, so voice mode
//   never touches a plan's Claude limit). Both go through the call's fallbackVoiceAnswer. The full Agent
//   (memory, every tool, the long rulebook) is not in the way of the first word: the model reaches it through
//   ask_classgrid only when it needs the user's account or the web.
// - voice mode is only a talk (owner, 2026-11-15: "voice mode is just voice; when they close it, it closes"): nothing
//   goes on in the background. Closing voice mode or leaving the app stops the model, the voice and any ask_classgrid
//   still running, and there is no start_task here (after-call tasks are the WhatsApp call's own feature).
// - every sentence is made into voice the moment it is written, several at the same time, and sent in order
//   (voice-turn.service.js), as raw PCM the phone plays at once (VOICE_AUDIO there says why).
//
// The turn is a normal voice turn of a chat in every other way: it is saved in the user's chat (so it is in the
// chat list and on the chat screen afterwards, titled the same way), the same usage check stops it when the credits
// are used up, the plan's number of new chats holds, every model answer is charged to the user's credits, and a
// turn that was read aloud counts as one voice reply of the day (ai-speak.controller.js), exactly like the
// speaker button.
//
// What the phone sends: { text, sessionId?, voice?, language?, speak? }
//   text       what the phone's recogniser heard (required)
//   sessionId  the chat to go on in; left out, a new chat is started
//   voice      the picked voice's key (GET /api/ai/voices); unknown or left out: Classgrid's voice
//   language   the recogniser's language (BCP-47, like "hi-IN"), so the AI knows what the user speaks
//   speak      false for a turn with no voice (the app's voice is switched off): text only, no voice reply counted
//
// Refused before the answer starts (plain JSON, { error, message, code }): 400 nothing_said, 401 not_signed_in,
// 403 not_your_chat, 404 chat_not_found, 409 chat_ended, 429 ai_quota_exceeded / ai_blocked / chats_cap_reached,
// 503 usage_check_failed.
//
// The stream (text/event-stream, each event one `data: {json}` line, `data: [DONE]` last):
//   { type: "session", sessionId, isNew }
//   { type: "notice", code, message }            the answer comes as text only: the day's voice replies are used
//                                                 up (voice_cap_reached, voice_not_included) or the voice is not
//                                                 set up (voice_unavailable). Not sent with speak: false.
//   { type: "text", delta }
//   { type: "audio", index, text, format: "pcm_24000", sampleRate: 24000, data }   data: base64 of 16-bit
//                                                 little-endian mono PCM; "" with failed: true when that sentence's
//                                                 voice could not be made
//   { type: "tool", name, status }               name: ask_classgrid; status: start | done | error
//   { type: "done", text, sessionId, messageId, usage, stopped? }
//   { type: "error", message, code }             the turn failed part-way (voice_turn_failed, chat_not_started)
// The phone closing the stream (the user talks over the answer, or leaves) stops the model at once; sentences not
// sent yet are dropped, and what was written so far is saved as a stopped answer.
import User from "../models/User.js";
import AiUsageLog from "../models/AiUsageLog.js";
import redis from "../config/redis.js";
import { createSession, saveMessage, getSessionById, chatsStartedSince, memoryText } from "../services/ai-chat.service.js";
import { getHistory, appendToHistory } from "../services/ai-chat-history.service.js";
import { canAccessSession, gridLabelMap } from "../services/ai-chat-grid.service.js";
import { hasEnoughTokens, deductTokens } from "../services/ai-credits.service.js";
import { chargeableTokens } from "../services/ai-token-pricing.js";
import { planOf } from "../services/plan-limits.service.js";
import { textToSpeech, elevenLabsEnabled, TTS_MODEL } from "../services/elevenlabs.service.js";
import { voiceIdFor } from "../services/voice-choices.js";
import { isWebsite } from "../utils/client-app.js";
import { spokenText, voiceReplyGate, countVoiceReply } from "./ai-speak.controller.js";
import { generateSessionTitle, touchChat, TITLE_REFRESH_EVERY } from "./ai-chat.controller.js";
import { fallbackVoiceAnswer, runAgentTask, ASK_CLASSGRID_TOOL, FALLBACK_MODEL } from "../services/whatsapp-call.service.js";

// Voice mode's models, in the order they are asked: GLM 5.3 (first words in about half a second with its thinking
// off), then DeepSeek Flash when GLM fails (the same DeepSeek Flash the chat uses: ai-chat.controller.js CF_FLASH_MODEL)
const VOICE_MODEL = FALLBACK_MODEL; // "@cf/zai-org/glm-5.3"
const VOICE_BACKUP_MODEL = "@cf/deepseek-ai/deepseek-v4.1-flash-1017";
import { runVoiceTurn, toVoiceMessages, VOICE_AUDIO } from "../services/voice-turn.service.js";

const MAX_HEARD_CHARS = 4000; // one spoken turn (the recogniser gives a sentence or two)
// The usage check before the answer: what the user said plus the short prompt, the tools and a spoken reply
const MIN_TURN_TOKENS = 1500;
const HISTORY_DEPTH = 30; // every message after the chat's summary (it is rewritten every 8 messages)
const HISTORY_MAX_CHARS = 60000;
const LIVE_WAIT_MS = 90 * 1000; // how long the talk waits for ask_classgrid (as on the call)
const PING_MS = 10 * 1000;
// The same notes the chat saves on an answer that did not finish (ai-chat.controller.js keepUnfinishedAnswer); the
// chat history tells the AI about them on the next turn (ai-chat-history.service.js)
const STOPPED_NOTE = "_(Stopped.)_";
const FAILED_NOTE = "_(This answer stopped because of an error. Say \"continue\" and it picks up from here.)_";

// The Agent's work for a voice turn runs as the phone app's own request does (src/api/chatStream.ts in the app):
// Agent mode by the phone's rules, in the phone's chat list
const PHONE_BODY = { phone: true, appMode: "agent", clientApp: "web", subdomain: "chat.classgrid.in", selectedModel: "auto" };

// The call's ask_classgrid, said for the phone: the same name and the same work (the full Agent, as this user),
// answered while the user waits. There is no call to end and no start_task: voice mode starts nothing that goes on
// after it is closed. Projects are left to the Agent: on the phone it can read them and nothing more (its own
// rule), so the voice model does not pick one.
const VOICE_TOOLS = [
    {
        name: ASK_CLASSGRID_TOOL.name,
        description: "Ask the Classgrid Agent right now and get its answer back to tell the user. It has everything in the user's account: chats, schedules, files, connected apps (Gmail, Google Calendar, Google Drive, Notion and more), web search, pictures, documents and all other Classgrid tools. Use it for anything to look up or do while the user waits. It can take from a few seconds to a minute. What it does is saved in this chat.",
        input_schema: { type: "object", properties: { request: ASK_CLASSGRID_TOOL.input_schema.properties.request }, required: ["request"] },
    },
];

/** The language's name for the prompt ("Hindi" for hi-IN); "" for anything that is not a language code */
function languageName(code) {
    const tag = String(code || "").trim();
    if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/.test(tag)) return "";
    try { return new Intl.DisplayNames(["en"], { type: "language" }).of(tag.split("-")[0]) || ""; } catch { return ""; }
}

// The call's short spoken prompt (whatsapp-call.service.js systemPrompt), for the phone's voice mode
function voiceSystemPrompt(user, { language = "", memory = "", voiceOn = true } = {}) {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
    const spoken = languageName(language);
    return [
        "You are Classgrid AI, talking with a Classgrid user in voice mode of the Classgrid phone app.",
        `User: ${user.name || "unknown name"} (${user.email}). Time: ${now} (India).`,
        voiceOn
            ? "What you say is read out by a text-to-speech voice, sentence by sentence, while you are still writing. Answer like a person on a call: short, natural spoken sentences (usually one to three), no markdown, no lists, no code, no emojis, no links. Ask at most one question at a time."
            : "The user is speaking to you and reads your answer on the screen (the voice is switched off). Answer like a person on a call: short, natural sentences (usually one to three), no markdown, no lists, no code, no emojis, no links. Ask at most one question at a time.",
        `${spoken ? `The phone is listening for ${spoken}. ` : ""}Reply in the language the user spoke last; a mix with English is fine. Write Hindi and Marathi in Devanagari script, as plain spoken words.`,
        "What you get is what the phone's speech recogniser heard, so a word can be wrong: go by what the user most likely meant, and ask when it is unclear.",
        "Answer from what you know whenever you can: that is the fastest. For anything in the user's account or on the web (their chats, files, schedules, email and other connected apps, a search, a picture) use ask_classgrid. Before you call a tool, say one short sentence first (like \"Let me check that.\"), so the user is not left in silence.",
        "If something needs a long or visual answer (code, a table, a document), say so in a sentence and offer to put it in the chat.",
        "This talk is saved as a chat in the user's Classgrid app, where they can read it afterwards.",
        memory ? `Earlier in this chat (a summary of its older messages):\n${memory}` : "",
    ].filter(Boolean).join("\n");
}

const refusal = (res, status, message, code, extra = {}) => res.status(status).json({ error: message, message, code, ...extra });

// Plans on: the plan's number of new chats per window and per week (a chat itself has no message limit). The same
// rule, counted the same way, as a typed message that starts a chat (ai-chat.controller.js streamAskAi).
async function newChatRefusal(user, email) {
    const plan = await planOf(user).catch(() => null);
    if (!plan) return null;
    const perWindow = Number(plan.chats_per_window), perWeek = Number(plan.chats_per_week);
    const windowMs = Math.max(1000, (Number(plan.window_reset_value) || 5) * ({ second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 }[plan.window_reset_unit] || 3600000));
    const [inWindow, inWeek] = await Promise.all([
        perWindow >= 0 ? chatsStartedSince(email, Date.now() - windowMs) : Promise.resolve(0),
        perWeek >= 0 ? chatsStartedSince(email, Date.now() - 7 * 86400000) : Promise.resolve(0),
    ]);
    const hit = (perWindow >= 0 && inWindow >= perWindow) ? { n: perWindow, when: `${plan.window_reset_value} ${plan.window_reset_unit}${plan.window_reset_value === 1 ? "" : "s"}` } : (perWeek >= 0 && inWeek >= perWeek) ? { n: perWeek, when: "week" } : null;
    return hit ? { message: `You've started all ${hit.n} new chats your ${plan.name} plan allows per ${hit.when}. Keep going in one of your chats (a chat has no limit), or upgrade your plan.`, plan: plan.key } : null;
}

// The chat's earlier messages for the model, newest kept: never more than HISTORY_MAX_CHARS in all
function trimHistory(history) {
    const size = (m) => (typeof m?.content === "string" ? m.content.length : 0);
    const kept = [...history];
    let total = kept.reduce((n, m) => n + Math.min(size(m), 4000), 0);
    while (total > HISTORY_MAX_CHARS && kept.length > 2) total -= Math.min(size(kept.shift()), 4000);
    return kept;
}

// POST /api/ai/voice/turn
export const voiceTurn = async (req, res) => {
    const startedAt = Date.now();
    const body = req.body || {};
    const user = req.user;
    // Identity comes only from the auth middleware (the route requires a login), never from the body
    if (!user?._id) return refusal(res, 401, "Please sign in to use Classgrid AI.", "not_signed_in");
    const userId = String(user._id);
    const orgId = user.organization_id || null;
    const userEmail = user.email || "";
    const heard = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, MAX_HEARD_CHARS);
    if (!heard) return refusal(res, 400, "I didn't catch that. Say it again.", "nothing_said");
    let sessionId = body.sessionId ? String(body.sessionId).trim() : "";
    const isNew = !sessionId;
    const wantsVoice = body.speak !== false;

    // ── Before the answer: the same checks as a typed message, all at the same time (each is a database read) ──
    let check, session, gate, chatsRefusal, history, grid;
    try {
        [check, session, gate, chatsRefusal, history, grid] = await Promise.all([
            // Fails closed: if the usage check itself errors, the turn is not run
            hasEnoughTokens(userId, orgId, Math.ceil(heard.length / 4) + MIN_TURN_TOKENS),
            isNew ? null : getSessionById(sessionId).catch(() => null),
            // The day's voice replies (a count that cannot be read leaves this turn without voice, never without an answer)
            wantsVoice && elevenLabsEnabled()
                ? voiceReplyGate(user).catch((e) => { console.error("[voice turn] voice reply check failed:", e.message); return { allowed: false, body: { error: "The voice is not available right now, so this answer is text only.", code: "voice_unavailable" } }; })
                : null,
            isNew ? newChatRefusal(user, userEmail) : null,
            // (read while the chat's owner is checked, used only after that check passed)
            isNew ? [] : getHistory(sessionId, HISTORY_DEPTH).catch(() => []),
            isNew ? null : gridLabelMap(sessionId).catch(() => null),
        ]);
    } catch (err) {
        console.error("[voice turn] usage check error:", err);
        return refusal(res, 503, "We couldn't check your AI usage balance right now, so this was not sent. Please try again in a minute.", "usage_check_failed");
    }
    if (!check.allowed) {
        const row = await User.findById(userId).select("ai_tokens").lean().catch(() => null);
        const resetDate = row?.ai_tokens?.week_reset_date ? new Date(row.ai_tokens.week_reset_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const out = check.reason === "Insufficient tokens.";
        return refusal(res, 429, out ? "You've used all your AI credits for now. Top up AI credits to keep talking, or wait until they refill." : String(check.reason || "Classgrid AI is not available for your account right now."), out ? "ai_quota_exceeded" : "ai_blocked", { resetDate: resetDate.toISOString() });
    }
    const tokenSource = check.source;
    if (!isNew) {
        if (!session) return refusal(res, 404, "This chat was not found.", "chat_not_found");
        if (!userEmail || !(await canAccessSession(session, userEmail))) {
            console.error(`[SECURITY] Unauthorized chat access attempt! User ${userEmail} tried to talk in session ${sessionId} owned by ${session.user_email}`);
            return refusal(res, 403, "You do not have permission to use this chat.", "not_your_chat");
        }
        // Ended chats are read-only: no model call, no tokens burned
        if (session.ended) return refusal(res, 409, "This chat has ended. Start a new one to keep talking.", "chat_ended", { sessionId: session.id, reason: session.end_reason || null, canReopen: session.end_reason === "user_requested" });
    }
    if (chatsRefusal) return refusal(res, 429, chatsRefusal.message, "chats_cap_reached", { plan: chatsRefusal.plan });

    // The voice: on when the app wants it, ElevenLabs is set up and the user still has a voice reply today
    const voiceOn = wantsVoice && !!gate?.allowed;
    const notice = !wantsVoice || voiceOn ? null
        : gate?.body ? { type: "notice", code: gate.body.code, message: gate.body.error, ...(gate.body.plan ? { plan: gate.body.plan } : {}), ...(gate.body.extraCredits !== undefined ? { extraCredits: gate.body.extraCredits } : {}) }
            : { type: "notice", code: "voice_unavailable", message: "Voice is not set up right now, so this answer is text only." };
    // Share Grid: the AI sees each user message as "Name: text", and the message is saved with who sent it
    const sender = grid ? { email: userEmail.toLowerCase(), name: grid.labels?.[userEmail.toLowerCase()] || userEmail } : null;
    const said = sender ? `${sender.name}: ${heard}` : heard;

    // ── The stream ──
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // tells NGINX to pass every event on at once instead of buffering
    });
    // 2 KB of padding makes NGINX and the load balancer pass the headers on and start the stream at once
    res.write(":" + Array(2048).join(" ") + "\n\n");
    res.flushHeaders?.();
    res.socket?.setNoDelay?.(true); // an event is one small write: it must not wait for the next one

    // The phone closed the stream (the user talked over the answer, or left): the model stops at once and nothing
    // more is voiced or sent
    const abort = new AbortController();
    let closed = false, finished = false;
    res.on("close", () => { if (finished) return; closed = true; abort.abort(); });
    const marks = {}; // when the first text and the first voice went out, for the log
    const write = (event) => {
        if (closed || res.writableEnded) return;
        if ((event.type === "text" || event.type === "audio") && !marks[event.type]) marks[event.type] = Date.now() - startedAt;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    // The answer's events wait until the chat's id has gone out (a new chat is made while the model is already
    // being asked, so the first word is not kept waiting for the database)
    let held = [];
    const send = (event) => { if (held) held.push(event); else write(event); };
    // (a tool can take a minute: the connection is kept open through that silence)
    const ping = setInterval(() => { if (!closed && !res.writableEnded) res.write(": ping\n\n"); }, PING_MS);

    // The chat: made now when this is its first message, then the user's words are saved in it
    let userSaved = Promise.resolve();
    const setup = (async () => {
        if (isNew) {
            const row = await createSession(userEmail, heard.length > 50 ? heard.substring(0, 47) + "..." : heard, false);
            if (!row?.id) throw new Error("the chat was not made");
            sessionId = String(row.id);
            // A real title in the background (after 5 s, so it does not compete with the answer), as for a typed chat
            setTimeout(() => generateSessionTitle(sessionId, heard, user._id).catch(console.error), 5000);
            // Where this chat started (first message wins): the phone's chats are filed with the website's
            if (isWebsite(req)) User.updateOne({ _id: user._id, desktop_chat_ids: { $ne: sessionId }, web_chat_ids: { $ne: sessionId } }, { $addToSet: { web_chat_ids: sessionId } }).catch(() => {});
        }
        write({ type: "session", sessionId, isNew });
        if (notice) write(notice);
        const waiting = held;
        held = null;
        for (const event of waiting) write(event);
        touchChat(userEmail, sessionId);
        // The user's message: to Supabase (source of truth) + Redis (the AI's history) together
        userSaved = Promise.all([
            saveMessage(sessionId, "user", heard, [], sender?.email || null)
                .then(() => { if (sender) req.app.get("io")?.to(`aigrid:${sessionId}`).emit("aigrid:update", { sessionId, kind: "messages", by: sender.email }); })
                .catch((err) => console.error("[voice turn] Failed to save user message:", err)),
            appendToHistory(sessionId, "user", said).catch((err) => console.error("[voice turn] Failed to append user msg to Redis:", err)),
        ]);
        // Share Grid: the others in the chat get it marked unread, and a push when they don't have it open (as for
        // a typed message: ai-chat.controller.js)
        if (sender) import("../services/user-push.service.js").then((m) => m.pushSharedChat({ sessionId, fromEmail: sender.email, fromName: sender.name, text: heard })).catch(() => {});
        // Every TITLE_REFRESH_EVERY user messages the chat is titled again from its recent messages, unless the
        // user renamed it themselves
        const titleCountKey = `ai:title-count:${sessionId}`;
        const recentUserText = [...history.filter((m) => m.role === "user" && typeof m.content === "string").slice(-(TITLE_REFRESH_EVERY - 1)), { content: heard }].map((m) => m.content.slice(0, 300)).join("\n");
        redis.incr(titleCountKey).then(async (count) => {
            if (count === 1) redis.expire(titleCountKey, 60 * 60 * 24 * 90).catch(() => {});
            if (count < TITLE_REFRESH_EVERY || count % TITLE_REFRESH_EVERY !== 0) return;
            if (await redis.get(`ai:title-custom:${sessionId}`).catch(() => null)) return;
            setTimeout(() => generateSessionTitle(sessionId, recentUserText, user._id).catch(console.error), 5000);
        }).catch(() => {});
    })();
    // The chat could not be made: the model is stopped at once (the error is sent below)
    setup.catch(() => { closed = true; abort.abort(); });

    // ── The model: GLM 5.3, and DeepSeek Flash when GLM is out ──
    const system = voiceSystemPrompt(user, { language: body.language, memory: session?.long_term_memory ? memoryText(session.long_term_memory).slice(0, 6000) : "", voiceOn });
    const messages = toVoiceMessages(trimHistory(history), said);
    let firstOut = false; // GLM failed once in this turn: the rest of it is answered by DeepSeek Flash
    const askModel = async ({ messages: conversation, noTools, onSentence, onText }) => {
        let wrote = false;
        const ask = { system, tools: VOICE_TOOLS, messages: conversation, noTools, onSentence, onText: (piece) => { wrote = true; onText(piece); }, signal: abort.signal };
        if (!firstOut) {
            try {
                return await fallbackVoiceAnswer({ ...ask, model: VOICE_MODEL });
            } catch (e) {
                // (an answer that had already started is not written a second time by the other model)
                if (closed || wrote) throw e;
                firstOut = true;
                console.warn(`[voice turn] ${VOICE_MODEL} failed (${String(e.message).slice(0, 160)}); answering with ${VOICE_BACKUP_MODEL}`);
            }
        }
        return fallbackVoiceAnswer({ ...ask, model: VOICE_BACKUP_MODEL });
    };

    // Every model answer is charged to the user's credits the moment its real usage is known (as each answer of a
    // call is: chargeCall), and written to the usage log like a chat answer
    const used = { input: 0, output: 0, credits: 0, model: "" };
    const onRound = (model, usage) => {
        const credits = chargeableTokens(usage, model);
        used.input += usage?.prompt_tokens || 0;
        used.output += usage?.completion_tokens || 0;
        used.credits += credits;
        used.model = model;
        if (credits > 0) {
            deductTokens(userId, orgId, credits, tokenSource).then(async (r) => {
                if (!r?.success) return;
                const { getIO } = await import("../services/socket.service.js");
                const io = getIO();
                io?.to("superadmin:ai_usage").emit("ai_usage_updated");
                io?.to(userId).emit("ai_token_update", { remaining: r.remaining, type: r.type, used: credits });
            }).catch((e) => console.error("[voice turn] token charge failed:", e.message));
        }
        AiUsageLog.create({
            organization_id: orgId || null, userId, provider: String(model).startsWith("claude-") ? "anthropic" : "cloudflare", model, feature: "chat_ai",
            promptTokens: usage?.prompt_tokens || 0, completionTokens: usage?.completion_tokens || 0, totalTokens: (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0), success: true,
            metadata: { poolTokens: credits, voiceTurn: true, ...(usage?.cache_read_input_tokens !== undefined ? { cacheReadTokens: usage.cache_read_input_tokens, cacheWriteTokens: usage.cache_creation_input_tokens } : {}) },
        }).catch((err) => console.error("AiUsageLog Error:", err));
    };

    // ── The voice: the user's picked voice; if ElevenLabs refuses that voice, Classgrid's own voice reads on ──
    const classgridVoice = voiceIdFor("classgrid");
    let voiceId = voiceIdFor(String(body.voice || ""));
    const voiceStartedAt = Date.now();
    let voiceError = "";
    const speak = async (sentence) => {
        const words = spokenText(sentence);
        if (!words) return null;
        const make = (id) => textToSpeech(words, { voiceId: id, outputFormat: VOICE_AUDIO.format, timeoutMs: 20000 });
        let pcm;
        try {
            try {
                pcm = await make(voiceId);
            } catch (voiceErr) {
                if (voiceId === classgridVoice) throw voiceErr;
                console.error(`[voice turn] voice ${body.voice} failed, using Classgrid's voice:`, voiceErr.message);
                voiceId = classgridVoice; // (the sentences after this one too)
                pcm = await make(classgridVoice);
            }
        } catch (e) {
            voiceError = String(e.message).slice(0, 500);
            throw e;
        }
        // (16-bit samples: a whole number of them)
        return pcm.length % 2 ? pcm.subarray(0, pcm.length - 1) : pcm;
    };

    // ── The tools: the full Agent, as this user, through the normal chat route (its own checks, credits and saved
    // chat), as on the call ──
    const runTool = async (tool, { cutOff }) => {
        // A tool request cut off by the answer length limit has a broken input: ask the AI to try again
        if (cutOff) return { content: "Your request was cut off before it was complete. Try again, shorter.", is_error: true };
        await setup; // the chat exists, and what the user said is in it
        await userSaved;
        if (tool.name === "ask_classgrid") {
            const request = String(tool.input?.request || "").trim();
            if (!request) return { content: "No request was given.", is_error: true };
            // Asked in this same chat, so the Agent knows what was said and its work is kept here. The note is a
            // "[SYSTEM: ...]" message: for the AI only, the app does not show it as something the user wrote.
            const question = `[SYSTEM: Live question from this chat's voice mode in the Classgrid phone app. The user is waiting and your answer is read out to them, so keep it short and spoken; no tables or links.]\n${request}`;
            // The Agent's work never outlives the talk: it stops when the turn stops (the user talked over it, closed
            // voice mode or left the app), and when it takes longer than the talk can wait. Nothing goes on in the
            // background from voice mode.
            const stop = new AbortController();
            const stopWithTurn = () => stop.abort();
            if (abort.signal.aborted) stop.abort(); else abort.signal.addEventListener("abort", stopWithTurn, { once: true });
            const work = runAgentTask(user, question, null, null, sessionId, null, { ...PHONE_BODY, voice: true }, stop.signal).catch((e) => ({ answer: "", error: e.message }));
            let waitTimer = null;
            const result = await Promise.race([work, new Promise((resolve) => { waitTimer = setTimeout(() => resolve(null), LIVE_WAIT_MS); })]);
            clearTimeout(waitTimer);
            abort.signal.removeEventListener("abort", stopWithTurn);
            if (!result) {
                stop.abort();
                return { content: "It took too long, so it was stopped and nothing more is being done. Tell the user this one is a longer job: they can ask for it by typing in the chat.", is_error: true };
            }
            if (result.aborted) return { content: "Stopped.", is_error: true };
            if (result.quota) return { content: "Classgrid could not do it: the user's AI credits are used up. They can top up AI credits, or wait until they refill.", is_error: true };
            if (!result.answer) return { content: `Classgrid could not answer${result.error ? `: ${result.error}` : "."}`, is_error: true };
            return { content: result.answer.slice(0, 4000) };
        }
        return { content: "This tool is not available.", is_error: true };
    };

    // ── When the turn is over (finished, stopped or failed): the answer is saved in the chat like any answer, and
    // a turn that was read aloud counts as one voice reply of the day ──
    const finish = async (turn, failed = false) => {
        await setup.catch(() => {});
        if (!sessionId) return {};
        await userSaved.catch(() => {});
        const note = failed ? FAILED_NOTE : turn.aborted ? STOPPED_NOTE : "";
        let messageId = null;
        if (turn.text || turn.steps.length) {
            const content = note ? `${turn.text}${turn.text ? "\n\n" : ""}${note}` : turn.text;
            // (with the tools it used, the chat screen shows them as steps, as for any answer)
            const steps = turn.steps.map((s, i) => ({ id: `${Date.now()}-${i}`, type: "tool", tool: s.tool, title: s.tool === "ask_classgrid" ? "Asked the Classgrid Agent" : s.tool, details: String(s.args?.request || s.args?.task || ""), args: s.args, status: s.error ? "error" : "success", result: s.result }));
            const saved = steps.length || note ? JSON.stringify({ classgrid_ai_message: true, content, thought: "", steps, worked_ms: Date.now() - startedAt }) : content;
            const [row] = await Promise.all([
                saveMessage(sessionId, "assistant", saved, []).catch((err) => { console.error("[voice turn] Failed to save assistant message:", err); return null; }),
                appendToHistory(sessionId, "assistant", saved).catch((err) => console.error("[voice turn] Failed to append assistant reply to Redis:", err)),
            ]);
            messageId = row?.id ?? null;
            if (sender) {
                req.app.get("io")?.to(`aigrid:${sessionId}`).emit("aigrid:update", { sessionId, kind: "messages", by: sender.email });
                // Share Grid: the answer is marked unread for the others, with a push when they don't have the chat open
                if (turn.text) import("../services/user-push.service.js").then((m) => m.pushSharedChat({ sessionId, fromEmail: sender.email, text: turn.text, answer: true })).catch(() => {});
            }
        }
        touchChat(userEmail, sessionId);
        const spoke = turn.spoken.sentences > 0;
        if (spoke) countVoiceReply(user, gate);
        if (spoke || turn.spoken.failed) {
            AiUsageLog.create({
                organization_id: orgId || null, userId: user._id, provider: "elevenlabs", model: TTS_MODEL, feature: "chat_ai", success: spoke, ...(spoke ? {} : { error: voiceError || "no sentence could be voiced" }), latencyMs: Date.now() - voiceStartedAt,
                metadata: { characters: turn.spoken.characters, sentences: turn.spoken.sentences, failed: turn.spoken.failed, cut: turn.spoken.cut, voiceTurn: true, messageId: String(messageId || "") },
            }).catch(() => {});
        }
        console.log(`[voice turn] ${used.model || "no model"} for ${userEmail || userId}: first text +${marks.text ?? "-"} ms, first voice +${marks.audio ?? "-"} ms, ${turn.spoken.sentences} sentence(s), ${turn.steps.length} tool(s), ${used.credits} credits, ${Date.now() - startedAt} ms${turn.aborted ? " (stopped)" : failed ? " (failed)" : ""}`);
        return {
            sessionId, messageId,
            usage: { model: used.model, inputTokens: used.input, outputTokens: used.output, credits: used.credits, rounds: turn.rounds.length, spokenSentences: turn.spoken.sentences, spokenCharacters: turn.spoken.characters, voiceReply: spoke, ms: Date.now() - startedAt },
            ...(turn.aborted ? { stopped: true } : {}),
        };
    };

    try {
        await Promise.all([
            runVoiceTurn({ messages, askModel, runTool, speak: voiceOn ? speak : null, send, isClosed: () => closed, onRound, beforeDone: (turn) => finish(turn), maxSpeakChars: gate?.maxChars || 4000 }),
            setup,
        ]);
    } catch (err) {
        // (the model can fail before a new chat's row is back from the database: whether the chat was made is known
        // only once that has settled, never from the id being empty at this moment)
        const chatFailed = !(await setup.then(() => true, () => false));
        console.error(`[voice turn] ${chatFailed ? "the chat could not be started" : "failed"}:`, err);
        // What was said before the failure stays in the chat, marked as unfinished
        await finish(err?.turn || { text: "", steps: [], rounds: [], spoken: { sentences: 0, characters: 0, failed: 0, cut: false }, aborted: false }, true).catch((e) => console.error("[voice turn] could not save the unfinished answer:", e.message));
        if (!res.writableEnded && !res.destroyed) {
            const event = chatFailed
                ? { type: "error", message: "The chat could not be started. Please try again.", code: "chat_not_started" }
                : { type: "error", message: "Classgrid AI could not answer just now. Say it again in a moment.", code: "voice_turn_failed" };
            try { res.write(`data: ${JSON.stringify(event)}\n\n`); } catch { /* the phone has gone */ }
        }
    } finally {
        finished = true;
        clearInterval(ping);
        if (!res.writableEnded) {
            try { res.write("data: [DONE]\n\n"); } catch { /* the phone has gone */ }
            res.end();
        }
    }
};
