// The streaming parts of a spoken answer, shared by the WhatsApp voice call (whatsapp-call.service.js) and the phone
// app's voice mode (ai-voice.controller.js): cutting the model's words into sentences as they arrive, reading
// Claude's and the fallback model's (OpenAI-style, Cloudflare) streams back into one answer, and moving a
// conversation between the two shapes. Nothing here talks to a database or a service, so it loads anywhere
// (tests/voice-turn.test.mjs).
import crypto from "crypto";

// ─── The fallback model's shape (OpenAI-style messages and tools) ────────────────────────────
// The conversation is kept in Claude's shape (text, tool_use and tool_result blocks) whichever model answered, so
// a call can move between the two at any turn.

export const toOpenAiTool = (t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } });

export function toOpenAiMessages(system, messages) {
    const out = [{ role: "system", content: system }];
    for (const m of messages) {
        if (typeof m.content === "string") { out.push({ role: m.role, content: m.content }); continue; }
        const blocks = Array.isArray(m.content) ? m.content : [];
        if (m.role === "assistant") {
            const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
            const calls = blocks.filter((b) => b.type === "tool_use").map((b) => ({ id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input || {}) } }));
            out.push({ role: "assistant", content: text || (calls.length ? null : ""), ...(calls.length ? { tool_calls: calls } : {}) });
            continue;
        }
        const results = blocks.filter((b) => b.type === "tool_result");
        for (const r of results) out.push({ role: "tool", tool_call_id: r.tool_use_id, content: typeof r.content === "string" ? r.content : JSON.stringify(r.content) });
        const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
        if (text || !results.length) out.push({ role: "user", content: text });
    }
    return out;
}

// GLM's answer in Claude's shape: a text block and a tool_use block per function call.
// The call's id is made one Claude's API takes (letters, digits, "_" and "-", at most 64, different from the other
// calls of the answer), the way llm-stream-anthropic.js toClaudeConversation does: a turn can move to Claude in the
// middle (Cloudflare's daily cap refuses a round, ai-voice.controller.js), and an id with any other character made
// Anthropic refuse the whole conversation (HTTP 400). The tool's result is filed under the same id
// (voice-turn.service.js), so the call and its result still match on either model.
export function fromOpenAiAnswer(message) {
    const content = [];
    const text = String(message?.content || "").trim();
    if (text) content.push({ type: "text", text });
    const used = new Set();
    for (const c of message?.tool_calls || []) {
        let input = {};
        try { input = JSON.parse(c.function?.arguments || "{}"); } catch { input = {}; }
        let id = String(c.id || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
        while (!id || used.has(id)) id = `call_${crypto.randomBytes(8).toString("hex")}`;
        used.add(id);
        content.push({ type: "tool_use", id, name: c.function?.name, input });
    }
    return content;
}

// ─── Sentences ────────────────────────────────────────────────

// Sentences from a stream of text pieces: `push(piece)` hands each complete sentence to `onSentence` (also in
// Hindi and Marathi, ending with "।"); `flush()` hands over whatever is left.
export function sentenceTaker(onSentence) {
    let unsaid = "";
    const say = (text) => { if (onSentence && text.trim()) onSentence(text.trim()); };
    return {
        push(piece) {
            unsaid += piece || "";
            for (;;) {
                const m = unsaid.match(/^([\s\S]*?[.!?।]["')\]]*)(\s+)(?=\S)/);
                if (!m) return;
                say(m[1]);
                unsaid = unsaid.slice(m[0].length);
            }
        },
        flush() { say(unsaid); unsaid = ""; },
    };
}

// ─── The models' streams ──────────────────────────────────────

// Reads a server-sent-events body, calling `onData` with each parsed `data:` JSON
async function readSse(res, onData) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let at;
        while ((at = buf.indexOf("\n\n")) !== -1) {
            const chunk = buf.slice(0, at);
            buf = buf.slice(at + 2);
            for (const l of chunk.split("\n")) {
                if (!l.startsWith("data:")) continue;
                const raw = l.slice(5).trim();
                if (!raw || raw === "[DONE]") continue;
                try { onData(JSON.parse(raw)); } catch { /* a keep-alive or a partial line */ }
            }
        }
    }
}

// A stream that broke off (the listener stopped the answer, the connection dropped): the error is passed on with
// what had arrived by then as `error.partial`, so the caller can still count the tokens that were used
function withPartial(error, partial) {
    try { error.partial = partial(); } catch { /* an error that takes no new field: passed on as it is */ }
    return error;
}

// An OpenAI-style stream (Cloudflare), put back together: { choice: { message: { content, tool_calls }, finish_reason },
// usage }. Text goes to `onSentence` one complete sentence at a time as it arrives, and to `onText` piece by piece.
export async function readOpenAiStream(res, onSentence, onText = null) {
    const taker = sentenceTaker(onSentence);
    const message = { content: "", tool_calls: [] };
    let finishReason = null;
    let usage = {};
    try {
        await readSse(res, (d) => {
            if (d.usage) usage = d.usage;
            const c = d.choices?.[0];
            if (!c) return;
            if (c.finish_reason) finishReason = c.finish_reason;
            const delta = c.delta || {};
            if (delta.content) { message.content += delta.content; if (onText) onText(delta.content); taker.push(delta.content); }
            for (const t of delta.tool_calls || []) {
                const i = Number.isInteger(t.index) ? t.index : message.tool_calls.length;
                const cur = message.tool_calls[i] || (message.tool_calls[i] = { id: "", type: "function", function: { name: "", arguments: "" } });
                if (t.id) cur.id = t.id;
                if (t.function?.name) cur.function.name += t.function.name;
                if (t.function?.arguments) cur.function.arguments += t.function.arguments;
            }
        });
    } catch (e) {
        // (the tool requests so far are left out: their input is not complete)
        throw withPartial(e, () => ({ choice: { message: { content: message.content }, finish_reason: finishReason }, usage }));
    }
    taker.flush();
    message.tool_calls = message.tool_calls.filter(Boolean);
    if (!message.tool_calls.length) delete message.tool_calls;
    return { choice: { message, finish_reason: finishReason }, usage };
}

// Claude's stream, put back together: { content: [text and tool_use blocks], stop_reason, usage }. Text is handed
// to `onSentence` one complete sentence at a time as it arrives, and to `onText` piece by piece.
export async function readClaudeStream(res, onSentence, onText = null) {
    const taker = sentenceTaker(onSentence);
    const blocks = [];
    const partialJson = new Map(); // block index -> the tool input's JSON so far
    const usage = {};
    let stopReason = null;
    try {
        await readSse(res, (ev) => {
            if (ev.type === "message_start") Object.assign(usage, ev.message?.usage || {});
            else if (ev.type === "content_block_start") {
                const cb = ev.content_block || {};
                blocks[ev.index] = cb.type === "tool_use" ? { type: "tool_use", id: cb.id, name: cb.name, input: {} } : { type: "text", text: cb.text || "" };
                if (cb.type === "tool_use") partialJson.set(ev.index, "");
            }
            else if (ev.type === "content_block_delta") {
                const b = blocks[ev.index];
                if (!b) return;
                if (ev.delta?.type === "text_delta") { b.text += ev.delta.text || ""; if (onText && ev.delta.text) onText(ev.delta.text); taker.push(ev.delta.text); }
                else if (ev.delta?.type === "input_json_delta") partialJson.set(ev.index, (partialJson.get(ev.index) || "") + (ev.delta.partial_json || ""));
            }
            else if (ev.type === "content_block_stop") {
                const b = blocks[ev.index];
                if (b?.type === "tool_use") { try { b.input = JSON.parse(partialJson.get(ev.index) || "{}"); } catch { b.input = {}; } }
                if (b?.type === "text") taker.flush();
            }
            else if (ev.type === "message_delta") { if (ev.delta?.stop_reason) stopReason = ev.delta.stop_reason; Object.assign(usage, ev.usage || {}); }
        });
    } catch (e) {
        // (the tool requests so far are left out: their input is not complete)
        throw withPartial(e, () => ({ content: blocks.filter(Boolean).filter((b) => b.type === "text" && b.text), stop_reason: stopReason, usage }));
    }
    taker.flush();
    return { content: blocks.filter(Boolean).filter((b) => b.type !== "text" || b.text), stop_reason: stopReason, usage };
}
