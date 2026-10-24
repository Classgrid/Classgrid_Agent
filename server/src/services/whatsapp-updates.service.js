// Owner's design (2026-10-24): while the big model (DeepSeek) works on a task (a call task or a woken long task), the
// small model (GLM-4.7-Flash) reads the user's new WhatsApp messages, replies to them, and passes them to the big model
// as an update. The big model is never stopped: the update reaches it at the front of the result of its next tool
// step (see the tool wrapper in ai-chat.controller.js). Updates it never got (its run ended first) are dropped when
// the task wakes again, because the same messages then come to it as new WhatsApp messages.

import redis from "../config/redis.js";
import AiUsageLog from "../models/AiUsageLog.js";
import { normalizeWhatsappNumber } from "./ai-feature-limits.js";
import { hasEnoughTokens, deductTokens } from "./ai-credits.service.js";
import { chargeableTokens } from "./ai-token-pricing.js";

const SMALL_MODEL = "@cf/zai-org/glm-4.7-flash";
const UPDATES_KEY = (sessionId) => `task:updates:${sessionId}`;
const running = new Map(); // number -> { user, sessionId, goal, send, pending: [] }
const waiting = new Map(); // number -> { timer, items: [] } (a few seconds, so text + file sent together go together)

// ─── Which task is running for a number ────────────────────────

// Returns this task's entry (give it back to taskEnded, so a newer task of the same number is never removed)
export function taskStarted(number, { user, goal, send }) {
    const entry = { user, goal: String(goal || ""), send, sessionId: null, pending: [] };
    running.set(normalizeWhatsappNumber(number), entry);
    return entry;
}

export async function taskSessionReady(number, sessionId) {
    const task = running.get(normalizeWhatsappNumber(number));
    if (!task || !sessionId || task.sessionId) return;
    task.sessionId = sessionId;
    // Updates that came before the chat existed
    for (const u of task.pending.splice(0)) await pushUpdate(sessionId, u);
}

export function taskEnded(number, entry) {
    const n = normalizeWhatsappNumber(number);
    if (!entry || running.get(n) === entry) running.delete(n);
}

export const isTaskRunning = (number) => running.has(normalizeWhatsappNumber(number));

// ─── Updates for the big model ─────────────────────────────────

async function pushUpdate(sessionId, update) {
    await redis.rpush(UPDATES_KEY(sessionId), JSON.stringify(update)).catch(() => {});
    await redis.expire(UPDATES_KEY(sessionId), 2 * 24 * 60 * 60).catch(() => {});
}

// All updates waiting for this chat (taken, so each one is given once): [{ text, ids, phone }]
export async function takeUpdates(sessionId) {
    if (!sessionId) return [];
    try {
        const [[, items]] = await redis.multi().lrange(UPDATES_KEY(sessionId), 0, -1).del(UPDATES_KEY(sessionId)).exec();
        return (items || []).map((r) => { try { return JSON.parse(r); } catch { return { text: String(r), ids: [] }; } });
    } catch {
        return [];
    }
}

// ─── The small model (charged to the user) ─────────────────────

async function smallModel(user, system, text) {
    const tokens = await hasEnoughTokens(user._id, user.organization_id || null, 1500).catch(() => ({ allowed: false }));
    if (!tokens.allowed) return "";
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_WORKERS_AI_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: SMALL_MODEL, temperature: 0, max_tokens: 1500, messages: [{ role: "system", content: system }, { role: "user", content: text }] }),
        signal: AbortSignal.timeout(45000),
    });
    const data = await res.json().catch(() => ({}));
    const usage = data.usage || {};
    if (usage.prompt_tokens || usage.total_tokens) {
        deductTokens(user._id, user.organization_id || null, chargeableTokens(usage, SMALL_MODEL), tokens.source).catch(() => {});
        AiUsageLog.create({
            organization_id: user.organization_id || null, userId: user._id, provider: "cloudflare", model: SMALL_MODEL, feature: "other",
            promptTokens: usage.prompt_tokens || 0, completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0), success: true,
        }).catch(() => {});
    }
    return String(data.choices?.[0]?.message?.content || "");
}

// ─── New WhatsApp messages ─────────────────────────────────────

function lineOf(m) {
    const media = ["image", "document", "audio", "video", "sticker"].includes(m.type) ? m[m.type] : null;
    const text = m.text?.body || media?.caption || m.button?.text || m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || "";
    const file = media ? `[sent a ${m.type}${media.filename ? ` "${media.filename}"` : ""}; open it with read_whatsapp_messages]` : "";
    return [text, file].filter(Boolean).join(" ");
}

// Called for a number whose task is running right now: the small AI replies and passes the messages on
export function onIncomingMessages(value) {
    for (const m of value?.messages || []) {
        if (m.type === "reaction") continue;
        const number = normalizeWhatsappNumber(m.from);
        if (!running.has(number)) continue;
        const line = lineOf(m);
        if (!line) continue;
        const w = waiting.get(number) || { items: [] };
        w.items.push({ line, id: m.id });
        clearTimeout(w.timer);
        w.timer = setTimeout(() => {
            waiting.delete(number);
            handle(number, w.items).catch((e) => console.error("[WA updates] failed:", e.message));
        }, 4000);
        waiting.set(number, w);
    }
}

async function handle(number, items) {
    const task = running.get(number);
    if (!task) return;
    const lines = items.map((i) => i.line);
    const out = await smallModel(task.user,
        'You are Classgrid AI on WhatsApp. A bigger AI is working on the user\'s task in the background right now. Read the user\'s new WhatsApp messages and reply with only one JSON object:\n' +
        '{"reply":"...","update":"..."}\n' +
        'reply: one short, friendly line to the user in their language, saying you got it and passed it on. Never say the work is done and never make up results.\n' +
        'update: what is new for the bigger AI (an instruction, a change, an answer to its question, or a file they sent), in one or two plain sentences.',
        `The task the bigger AI is working on:\n${task.goal.slice(0, 3000)}\n\nThe user's new WhatsApp messages:\n${lines.join("\n")}`,
    ).catch((e) => { console.error("[WA updates] small model failed:", e.message); return ""; });
    let reply = "", update = "";
    try {
        const json = JSON.parse(out.match(/\{[\s\S]*?\}/)?.[0] || "{}");
        reply = String(json.reply || "").trim().slice(0, 500);
        update = String(json.update || "").trim().slice(0, 2000);
    } catch { /* not JSON */ }
    // The user's own words always reach the big AI (an "ok" can be the approval it waits for), even when the small
    // model fails or writes no update
    const words = lines.join(" | ").slice(0, 1500);
    const text = update ? `${update} (the user's own words: ${words})` : `The user's own words: ${words}`;
    task.send(reply || "Got it, I've passed this on.");
    const entry = { text, ids: items.map((i) => i.id).filter(Boolean), phone: number };
    if (task.sessionId) await pushUpdate(task.sessionId, entry);
    else task.pending.push(entry);
    console.log(`[WA updates] ${number}: update passed to the big AI`);
}
