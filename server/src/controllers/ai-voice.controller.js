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
// - the model is asked directly and streamed, with its thinking off and a short spoken prompt. The user picks the
//   model in voice mode (owner: "let people choose the text model, from the dropdown"): a Claude model
//   answers through the call's claudeVoiceAnswer (thinking off) and counts on the plan's Claude credits (Fable also
//   on Fable's share), any other model through fallbackVoiceAnswer; nothing picked (Auto) is GLM 5.3. One model answers a turn: there is no backup model (owner, 2026-11-15).
//   The full Agent
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
// What the phone sends: { text | audio, sampleRate?, sessionId?, voice?, language?, speak?, model? }
//   text       what was said, as text (the phone's own recogniser heard it)
//   audio      OR what was said, as sound: base64 of 16-bit little-endian mono PCM at `sampleRate` (16000), one
//              spoken turn recorded by the phone. The server turns it into text (the same speech to text as voice
//              notes: ElevenLabs Scribe, Cloudflare Whisper behind it), counted on the plan's voice input minutes,
//              so the talk does not depend on the phone's speech recogniser (owner, 2026-11-15: it disconnects on
//              some phones; the WhatsApp call listens on the server too). The words come back in a `heard` event.
//   sessionId  the chat to go on in; left out, a new chat is started
//   voice      the picked voice's key (GET /api/ai/voices); unknown or left out: Classgrid's voice
//   language   the recogniser's language (BCP-47, like "hi-IN"), so the AI knows what the user speaks
//   speak      false for a turn with no voice (the app's voice is switched off): text only, no voice reply counted
//   model      the model picked in voice mode's dropdown (the chat picker's ids). The answer AND ask_classgrid's
//              Agent work use that model only. Left out, "auto", unknown or turned off by the super admin: GLM 5.3,
//              alone (no backup model), and the Agent on Auto
//
// Refused before the answer starts (plain JSON, { error, message, code }): 400 nothing_said, 401 not_signed_in,
// 429 voice_input_cap_reached (the day's voice input minutes are used), 413 audio_too_long,
// 402 model_locked / claude_cap_reached (the picked model is not in the plan, or its weekly Claude or Fable credits
// are used up), 403 not_your_chat, 404 chat_not_found, 409 chat_ended, 429 ai_quota_exceeded / ai_blocked / chats_cap_reached,
// 503 usage_check_failed.
//
// The stream (text/event-stream, each event one `data: {json}` line, `data: [DONE]` last):
//   { type: "session", sessionId, isNew }
//   { type: "heard", text }                     what the server heard in the sent audio (only for an audio turn)
//   { type: "notice", code, message }            the answer comes as text only: the day's voice replies are used
//                                                 up (voice_cap_reached, voice_not_included) or the voice is not
//                                                 set up (voice_unavailable). Not sent with speak: false.
//   { type: "text", delta }
//   { type: "audio", index, text, format: "pcm_24000", sampleRate: 24000, data }   data: base64 of 16-bit
//                                                 little-endian mono PCM; "" with failed: true when that sentence's
//                                                 voice could not be made
//   { type: "tool", name, status }               name: ask_classgrid; status: start | done | error
//   { type: "done", text, sessionId, messageId, usage, stopped? }
//   { type: "error", message, code }             the turn failed part-way (voice_turn_failed, chat_not_started, or
//                                                 model_failed with `model`: the picked model could not answer; no
//                                                 other model is used in its place)
// The phone closing the stream (the user talks over the answer, or leaves) stops the model at once; sentences not
// sent yet are dropped, and what was written so far is saved as a stopped answer.
import User from "../models/User.js";
import AiUsageLog from "../models/AiUsageLog.js";
import redis from "../config/redis.js";
import { createSession, saveMessage, getSessionById, chatsStartedSince, memoryText } from "../services/ai-chat.service.js";
import { getHistory, appendToHistory } from "../services/ai-chat-history.service.js";
import { canAccessSession, gridLabelMap } from "../services/ai-chat-grid.service.js";
import { hasEnoughTokens, deductTokens, chargeClaudeOnPlan, creditsAvailable } from "../services/ai-credits.service.js";
import { chargeableTokens } from "../services/ai-token-pricing.js";
import { planOf } from "../services/plan-limits.service.js";
import { textToSpeech, elevenLabsEnabled, TTS_MODEL } from "../services/elevenlabs.service.js";
import { voiceIdFor } from "../services/voice-choices.js";
import { isWebsite } from "../utils/client-app.js";
import { spokenText, voiceReplyGate, countVoiceReply, chargeSpeech } from "./ai-speak.controller.js";
import { generateSessionTitle, touchChat, TITLE_REFRESH_EVERY, CF_PICKER_MODELS, MODEL_DISPLAY_NAMES } from "./ai-chat.controller.js";
import { fallbackVoiceAnswer, claudeVoiceAnswer, runAgentTask, ASK_CLASSGRID_TOOL, FALLBACK_MODEL } from "../services/whatsapp-call.service.js";
import { CLAUDE_CHAT_MODELS } from "../services/llm-stream-anthropic.js";
import { disabledModels, fableAccess, isFableModel } from "../services/model-access.service.js";
import { voiceModelRefusal } from "../services/voice-model.service.js";
import { weekCounters } from "../services/ai-credits.service.js";
import { voiceInputAllowed, countVoiceInput, chargeListening, pcmToWav, voiceGapSeconds, setVoiceClock } from "../services/voice-input-limit.service.js";
import { transcribeAudioDetailed } from "../services/ai/voice.service.js";
import { spokenWords } from "../services/voice-heard.js";
import SystemLog from "../models/SystemLog.js";

// What "Auto" means in voice mode: GLM 5.3 (first words in about half a second with its thinking off). It answers
// alone, like a picked model: voice mode has no backup model (owner, 2026-11-15)
const VOICE_MODEL = FALLBACK_MODEL; // "@cf/zai-org/glm-5.3"
import { runVoiceTurn, toVoiceMessages, VOICE_AUDIO } from "../services/voice-turn.service.js";

const MAX_HEARD_CHARS = 4000; // one spoken turn (the recogniser gives a sentence or two)
// One spoken turn sent as sound: at most a minute, at least a fifth of a second (shorter is a click, not a word)
const MAX_AUDIO_SECONDS = 60;
const MIN_AUDIO_SECONDS = 0.2;
// How long ElevenLabs may take to hear a turn before Cloudflare's Whisper is tried (it answers in under a second)
const STT_WAIT_MS = 12000;
// What speech-to-text writes for sound with no words in it
const NO_WORDS = /^[\s.,!?…\-]*$|^\(?\[?(silence|music|noise|background noise|blank[_ ]audio|inaudible|no speech)\]?\)?\.?$/i;
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

// The user's limit is used up: when it comes back (only a real time, never a guess) and how to get more. Free moves
// to Pro or Max (Free cannot buy top-ups); every other plan, plans off and Classgrid staff can top up AI credits (the
// same rule as ai-credits-topup.controller.js topupBlockedByPlan)
async function limitUsedText(user, backAt) {
    const plan = await planOf(user).catch(() => null);
    const at = backAt ? new Date(backAt) : null;
    const when = at && !Number.isNaN(at.getTime()) && at.getTime() > Date.now()
        ? at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
        : "";
    const free = plan?.key === "free";
    const used = plan ? `You've used your ${plan.name || "plan"} plan's limit for now.` : "You've used your AI limit for now.";
    if (when) return `${used} It comes back on ${when}, or ${free ? "move to Pro or Max for more" : "top up AI credits"}.`;
    return `${used} ${free ? "Move to Pro or Max for more." : "Top up AI credits to keep going."}`;
}

// The models voice mode can answer with: the chat picker's (ai-chat.controller.js), Claude included
export const isVoiceModel = (id) => typeof id === "string" && (CLAUDE_CHAT_MODELS.has(id) || CF_PICKER_MODELS.has(id));


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
    const cleanHeard = (t) => String(t || "").replace(/\s+/g, " ").trim().slice(0, MAX_HEARD_CHARS);
    let heard = cleanHeard(body.text);
    // The turn as sound (no text): its length is known now, its words once the speech to text has answered (it runs
    // at the same time as the checks below, so listening on the server costs the answer no extra wait)
    let pcm = null, audioSeconds = 0, inputGate = null, heardText = null, heardMs = null, heardBy = null;
    // A turn that was not answered leaves a line in the system log (how long its sound was, what was decided), so a
    // talk that "stopped answering" can be read afterwards: the usage log only has the turns that were answered
    const noteNotAnswered = (code) => {
        SystemLog.create({
            userId: user._id, level: "info", context: "voice_turn", message: `voice turn not answered: ${code}`,
            metadata: { code, audioSeconds: Math.round(audioSeconds * 10) / 10, heardMs, heardBy },
        }).catch(() => {});
    };
    if (!heard && typeof body.audio === "string" && body.audio) {
        const rate = Number(body.sampleRate) === 24000 ? 24000 : Number(body.sampleRate) === 48000 ? 48000 : 16000;
        pcm = Buffer.from(body.audio, "base64");
        audioSeconds = pcm.length / 2 / rate;
        if (audioSeconds > MAX_AUDIO_SECONDS + 1) { noteNotAnswered("audio_too_long"); return refusal(res, 413, "That was too long for one turn. Say it in shorter parts.", "audio_too_long"); }
        if (audioSeconds < MIN_AUDIO_SECONDS) { noteNotAnswered("nothing_said"); return refusal(res, 400, "I didn't catch that. Say it again.", "nothing_said"); }
        try {
            inputGate = await voiceInputAllowed(user);
        } catch (e) {
            console.error("[voice turn] voice input check failed:", e.message);
            inputGate = { allowed: true }; // (a count that cannot be read never blocks)
        }
        if (!inputGate.allowed) return refusal(res, 429, inputGate.error, "voice_input_cap_reached");
        const sttStartedAt = Date.now();
        // Only spoken words count (services/voice-heard.js): noise and silence come back as nothing said, never as a
        // sound tag or an invented "Thank you." that the AI would answer. ElevenLabs gets STT_WAIT_MS before Whisper
        // is tried, so a slow speech service does not leave the phone waiting a minute
        heardText = transcribeAudioDetailed(pcmToWav(pcm, rate), "audio/wav", { speechOnly: true, timeoutMs: STT_WAIT_MS })
            .then((r) => { heardMs = Date.now() - sttStartedAt; heardBy = r?.by || null; return cleanHeard(spokenWords(r?.text, r?.by)); })
            .catch((e) => { heardMs = Date.now() - sttStartedAt; console.error("[voice turn] speech to text failed:", e.message); return null; });
    } else if (!heard) {
        return refusal(res, 400, "I didn't catch that. Say it again.", "nothing_said");
    }
    // The quiet time the phone listened before this turn: from the end of the last turn's reading until the user
    // began to speak (their words are counted on their own, when heard), at most VOICE_GAP_MAX_S. Counted on the
    // day's voice minutes when the turn is over
    const gapSeconds = voiceGapSeconds(userId, startedAt - audioSeconds * 1000);
    let sessionId = body.sessionId ? String(body.sessionId).trim() : "";
    const isNew = !sessionId;
    const wantsVoice = body.speak !== false;
    const askedModel = typeof body.model === "string" ? body.model.trim() : "";

    // ── Before the answer: the same checks as a typed message, all at the same time (each is a database read) ──
    let check, session, gate, chatsRefusal, history, grid, offModels, plan;
    try {
        [check, session, gate, chatsRefusal, history, grid, offModels, plan] = await Promise.all([
            // Fails closed: if the usage check itself errors, the turn is not run
            // A turn starts whenever anything is left: no guess of its size refuses it (owner, 2026-11-16: limits
            // stopped at 93 to 97 percent). The turn is charged its real usage, up to the limit.
            hasEnoughTokens(userId, orgId, 1),
            isNew ? null : getSessionById(sessionId).catch(() => null),
            // The day's voice replies (a count that cannot be read leaves this turn without voice, never without an answer)
            wantsVoice && elevenLabsEnabled()
                ? voiceReplyGate(user).catch((e) => { console.error("[voice turn] voice reply check failed:", e.message); return { allowed: false, body: { error: "The voice is not available right now, so this answer is text only.", code: "voice_unavailable" } }; })
                : null,
            isNew ? newChatRefusal(user, userEmail) : null,
            // (read while the chat's owner is checked, used only after that check passed)
            isNew ? [] : getHistory(sessionId, HISTORY_DEPTH).catch(() => []),
            isNew ? null : gridLabelMap(sessionId).catch(() => null),
            isVoiceModel(askedModel) ? disabledModels().catch(() => []) : [],
            isVoiceModel(askedModel) ? planOf(user).catch(() => null) : null,
        ]);
        // The words of a turn sent as sound (asked for above, while these checks ran)
        if (pcm) {
            const text = await heardText;
            if (text === null) { noteNotAnswered("speech_to_text_failed"); return refusal(res, 503, "I couldn't hear that just now. Say it again.", "speech_to_text_failed"); }
            // The seconds that were listened to count on the day's voice input minutes, words or not
            countVoiceInput(user, inputGate, audioSeconds);
            chargeListening(user, inputGate, audioSeconds); // (the sound that went to speech-to-text, as credits)
            if (!text || NO_WORDS.test(text)) { noteNotAnswered("nothing_said"); return refusal(res, 400, "I didn't catch that. Say it again.", "nothing_said"); }
            heard = text;
        }
    } catch (err) {
        console.error("[voice turn] usage check error:", err);
        return refusal(res, 503, "We couldn't check your AI usage balance right now, so this was not sent. Please try again in a minute.", "usage_check_failed");
    }
    // The picked model (the voice dropdown): one the chat picker has and the super admin has not turned off, else
    // Auto's GLM 5.3 (alone, no backup). A Claude model on a plan with Claude counts on the plan's Claude credits
    // (and Fable's share) and on the session window and the week, as in a typed chat (owner, 2026-11-21: the session
    // limit and the weekly limit are for every model; the Claude limit is only a cap inside them).
    const picked = isVoiceModel(askedModel) && !(offModels || []).includes(askedModel) ? askedModel : "";
    // Cloudflare's free Neurons of the day are used up (the cap switch is on): Claude Haiku answers in place of a
    // Cloudflare model (services/cap-fallback.service.js). The system's choice, so it is counted on the person's
    // normal limits, never on the plan's weekly Claude credits.
    let claudeByCap = false;
    // The plan's weekly Claude credits (or Fable's share) are used up and the person has credits: they pay for this
    // turn, as in a typed chat (owner, 2026-11-17: "Claude and Fable take from credits when their limit is over";
    // until 2026-11-21 a voice turn was refused here even with credits)
    let claudeCredits = null;
    // (with the session window or the week used up, `check` allows the turn only on the person's credits: then they
    // pay for it and nothing is counted on the plan)
    const claudePooled = (model) => !claudeByCap && !claudeCredits && !!plan && CLAUDE_CHAT_MODELS.has(model) && Number(plan.claude_credits_per_week) !== 0 && check?.source === "weekly_free";
    if (picked) {
        const claudeLimited = !!plan && CLAUDE_CHAT_MODELS.has(picked) && Number(plan.claude_credits_per_week) > 0;
        const counters = claudeLimited ? await weekCounters(userId, user.ai_tokens).catch(() => null) : null;
        const refusedModel = voiceModelRefusal({
            model: picked,
            isClaude: CLAUDE_CHAT_MODELS.has(picked),
            modelName: MODEL_DISPLAY_NAMES[picked] || picked,
            plan,
            fableUnlocked: isFableModel(picked) && !plan ? (await fableAccess(user)).unlocked : false,
            counters,
            refillText: counters?.weekEnd ? counters.weekEnd.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "",
        });
        if (refusedModel?.code === "claude_cap_reached") {
            const credits = await creditsAvailable(userId).catch(() => null);
            if (credits?.source && credits.total > 0) claudeCredits = credits;
        }
        if (refusedModel && !claudeCredits) return refusal(res, refusedModel.status, refusedModel.message, refusedModel.code, { plan: refusedModel.plan });
    }
    // (the session window and the week stop every model, a Claude model too)
    if (!check.allowed) {
        const row = await User.findById(userId).select("ai_tokens").lean().catch(() => null);
        // When the limit comes back: the check says which limit ran out (the session window, or the week), as in the chat
        const backAt = check.resetAt || row?.ai_tokens?.week_reset_date || null;
        const resetDate = backAt ? new Date(backAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const out = check.reason === "Insufficient tokens.";
        return refusal(res, 429, out ? await limitUsedText(user, backAt) : String(check.reason || "Classgrid AI is not available for your account right now."), out ? "ai_quota_exceeded" : "ai_blocked", { resetDate: resetDate.toISOString() });
    }
    const tokenSource = claudeCredits ? claudeCredits.source : check.source;
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
        // (a turn sent as sound: the phone shows what was heard as the user's line)
        if (pcm) write({ type: "heard", text: heard });
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

    // ── The model: ONE model answers the whole turn, the one the user picked in voice mode's dropdown (owner,
    // 2026-11-15: "I said pick the model, not fallback. The user decides, as per their plan"). There is no backup
    // model and no switch: if it fails, the turn ends with model_failed and the user says it again or picks another.
    // Nothing sent, "auto" or a model turned off: Auto's voice model (GLM 5.3), alone too. ──
    const system = voiceSystemPrompt(user, { language: body.language, memory: session?.long_term_memory ? memoryText(session.long_term_memory).slice(0, 6000) : "", voiceOn });
    const messages = toVoiceMessages(trimHistory(history), said);
    let answerModel = picked || VOICE_MODEL;
    // (the stand-in is never a Claude model the super admin switched off: the Claude feature flag and the Model
    // manager, read here whatever was picked; offModels above is read only when a model was picked by name, so on Auto
    // Claude Haiku answered even with Haiku turned off)
    const capSwitches = CLAUDE_CHAT_MODELS.has(answerModel) ? null
        : await import("../services/cap-fallback.service.js").then((m) => m.claudeSwitches()).catch(() => ({ claudeOff: false, disabled: offModels || [] }));
    if (!CLAUDE_CHAT_MODELS.has(answerModel)) {
        const stand = await import("../services/cap-fallback.service.js").then((m) => m.claudeWhenCapped("simple", capSwitches)).catch(() => null);
        if (stand) { answerModel = stand; claudeByCap = true; }
    }
    let modelFailed = false; // the model could not answer (the turn ends with model_failed)
    const askModel = async ({ messages: conversation, noTools, onSentence, onText }) => {
        const ask = { system, tools: VOICE_TOOLS, messages: conversation, noTools, onSentence, onText, signal: abort.signal };
        try {
            try {
                return CLAUDE_CHAT_MODELS.has(answerModel)
                    ? await claudeVoiceAnswer({ ...ask, model: answerModel })
                    : await fallbackVoiceAnswer({ ...ask, model: answerModel });
            } catch (e) {
                // The day's free Neurons are not used up, but Cloudflare's cap had no room for this request (or was
                // reached in the middle of the turn): Claude Haiku answers it and the rest of the turn, the same
                // system's choice as the stand-in picked above (not a backup for a model that failed)
                const stand = e?.code === "cf_neuron_cap" && !CLAUDE_CHAT_MODELS.has(answerModel)
                    ? await import("../services/cap-fallback.service.js").then((m) => m.claudeFor("simple", capSwitches || {})).catch(() => null)
                    : null;
                if (!stand) throw e;
                answerModel = stand;
                claudeByCap = true;
                return await claudeVoiceAnswer({ ...ask, model: answerModel });
            }
        } catch (e) {
            if (!closed) modelFailed = true;
            throw e;
        }
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
        if (credits > 0 && claudePooled(model)) {
            // A Claude answer on a plan with Claude: the plan's weekly Claude credits (and Fable's share), the session
            // window and the week, together, as in a chat
            chargeClaudeOnPlan(userId, orgId, credits, { fable: isFableModel(model), label: { model, what: "Chat" } })
                .catch((e) => console.error("[voice turn] Claude week count failed:", e.message));
        } else if (credits > 0) {
            deductTokens(userId, orgId, credits, tokenSource, { label: { model, what: "Chat" } }).then(async (r) => {
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
    // How long the AI spoke in this turn: it counts on the day's voice minutes with the time the user spoke (owner,
    // 2026-11-15: "I talked 30 minutes and it still shows the full 300 minutes"), so the minutes are the talk
    let spokenSeconds = 0;
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
        const whole = pcm.length % 2 ? pcm.subarray(0, pcm.length - 1) : pcm;
        spokenSeconds += whole.length / 2 / VOICE_AUDIO.sampleRate;
        return whole;
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
            // (the Agent's lookups and actions run on the model the user picked, or Auto when none was picked)
            const work = runAgentTask(user, question, null, null, sessionId, null, { ...PHONE_BODY, selectedModel: picked || "auto", voice: true }, stop.signal).catch((e) => ({ answer: "", error: e.message }));
            let waitTimer = null;
            const result = await Promise.race([work, new Promise((resolve) => { waitTimer = setTimeout(() => resolve(null), LIVE_WAIT_MS); })]);
            clearTimeout(waitTimer);
            abort.signal.removeEventListener("abort", stopWithTurn);
            if (!result) {
                stop.abort();
                return { content: "It took too long, so it was stopped and nothing more is being done. Tell the user this one is a longer job: they can ask for it by typing in the chat.", is_error: true };
            }
            if (result.aborted) return { content: "Stopped.", is_error: true };
            if (result.quota) return { content: `Classgrid could not do it: the user's limit is used up. Tell them: "${await limitUsedText(user, result.quota.resetDate)}"`, is_error: true };
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
        if (spoke) chargeSpeech(user, gate, turn.spoken.characters); // (the characters that were voiced, as credits)
        // The whole turn counts on the day's voice minutes (the user's own words were counted when heard): the quiet
        // time before it, and from the moment it arrived until its reading ends on the phone (the reading starts with
        // the first voice and lasts as long as the sound sent, which can outlast the stream)
        const now = Date.now();
        const readingEnds = marks.audio !== undefined ? Math.max(now, startedAt + marks.audio + spokenSeconds * 1000) : now;
        const turnSeconds = (await gapSeconds) + (readingEnds - startedAt) / 1000;
        setVoiceClock(userId, readingEnds);
        if (turnSeconds > 0) countVoiceInput(user, inputGate, turnSeconds);
        if (spoke || turn.spoken.failed) {
            AiUsageLog.create({
                organization_id: orgId || null, userId: user._id, provider: "elevenlabs", model: TTS_MODEL, feature: "chat_ai", success: spoke, ...(spoke ? {} : { error: voiceError || "no sentence could be voiced" }), latencyMs: Date.now() - voiceStartedAt,
                metadata: { characters: turn.spoken.characters, sentences: turn.spoken.sentences, failed: turn.spoken.failed, cut: turn.spoken.cut, voiceTurn: true, messageId: String(messageId || "") },
            }).catch(() => {});
        }
        console.log(`[voice turn] ${used.model || "no model"} for ${userEmail || userId}: ${pcm ? `heard ${audioSeconds.toFixed(1)} s of sound in ${heardMs ?? "-"} ms, ` : ""}first text +${marks.text ?? "-"} ms, first voice +${marks.audio ?? "-"} ms, ${turn.spoken.sentences} sentence(s), ${turn.steps.length} tool(s), ${used.credits} credits, ${Date.now() - startedAt} ms${turn.aborted ? " (stopped)" : failed ? " (failed)" : ""}`);
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
                : modelFailed
                    ? { type: "error", message: `${picked ? (MODEL_DISPLAY_NAMES[picked] || picked) : "Auto"} could not answer just now. Say it again, or pick another model.`, code: "model_failed", model: picked || "auto" }
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
