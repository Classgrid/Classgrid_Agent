// One turn of the phone app's fast voice mode (POST /api/ai/voice/turn, ai-voice.controller.js): the user said
// something, the fast call model answers, and every sentence is made into voice the moment it is written, the same
// way the WhatsApp voice call does it (whatsapp-call.service.js: reply, sayPart and the sayChain).
//
// This file is the turn itself and nothing else: the model, the voice, the tools and where the events go are all
// handed in, so it talks to no database and no service (tests/voice-turn.test.mjs runs it with them stubbed).
//
// The events it sends, in this order:
//   { type: "text", delta }                                        every piece of text as the model writes it
//   { type: "audio", index, text, format, sampleRate, data }       one per sentence, as soon as its voice is ready;
//                                                                   sentences are voiced at the same time and sent
//                                                                   strictly in the order they were written
//   { type: "tool", name, status: "start" | "done" | "error" }     when the model uses a tool
//   { type: "done", text, usage, ... }                              the turn is over
// (the controller sends { type: "session" } before them and { type: "error" } when the turn fails)

// The audio the phone gets: raw 16-bit little-endian mono PCM at 24 kHz (ElevenLabs pcm_24000), base64 in the event.
// Why this and not mp3 or 16 kHz (owner's order: the first word must come as fast as on the WhatsApp call):
// - Android's AudioTrack plays raw PCM the moment the bytes arrive: nothing to decode and no player to prepare for
//   each sentence. An mp3 chunk needs a decoder set up per sentence and has silence at its start and end, which is
//   heard as a gap between sentences.
// - 24 kHz is the rate the fast voice model makes its speech at, so it comes with no resampling and sounds like the
//   voice the user picked. 16 kHz would be a third smaller but sounds like a phone line.
// - On the wire it is 48 KB a second of speech (64 KB as base64): a three-second sentence is about 190 KB, which a
//   phone's connection carries in well under the time the sentence takes to say.
export const VOICE_AUDIO = { format: "pcm_24000", sampleRate: 24000 };

/**
 * The chat's earlier messages, as the conversation the call model takes: only user and assistant turns, taking
 * turns, starting with the user, none empty. Notes the chat keeps for the AI (role "system") go in with the user's
 * side, and two messages of the same side in a row become one. `heard` (what the user just said) is added last.
 */
export function toVoiceMessages(history, heard, { maxChars = 4000 } = {}) {
    const out = [];
    const add = (role, text) => {
        const content = String(text || "").trim().slice(0, maxChars);
        if (!content) return;
        const last = out[out.length - 1];
        if (last && last.role === role) last.content += `\n\n${content}`;
        else if (out.length || role === "user") out.push({ role, content });
    };
    for (const m of Array.isArray(history) ? history : []) {
        if (!m || typeof m.content !== "string") continue;
        add(m.role === "assistant" ? "assistant" : "user", m.content);
    }
    add("user", heard);
    return out;
}

/**
 * Sentences into voice, in order. `say(sentence)` asks for the sentence's voice at once (so several are made at the
 * same time) and queues its { type: "audio" } event behind the ones before it; `done()` resolves when every queued
 * event has gone out. A sentence whose voice fails is still sent, with no sound (data "" and failed: true), so the
 * numbers have no gap and the phone can show its words. Once the listener is gone (`isClosed`), nothing more is
 * asked for or sent. `maxChars`: no more than this many characters are read in one turn (the super admin's
 * voice_reply_max_chars); what comes after is text only.
 */
export function createSpeaker({ speak, send, isClosed = () => false, maxChars = Infinity }) {
    let chain = Promise.resolve();
    let next = 0;
    const state = { sentences: 0, characters: 0, failed: 0, cut: false };
    return {
        state,
        say(sentence) {
            const text = String(sentence || "").trim();
            if (!speak || !text || isClosed()) return;
            if (state.characters + text.length > maxChars) { state.cut = true; return; }
            state.characters += text.length;
            const index = next++;
            const audio = Promise.resolve().then(() => speak(text)).catch((e) => { console.error("[voice turn] a sentence could not be voiced:", e?.message || e); return null; });
            chain = chain.then(async () => {
                const pcm = await audio;
                if (isClosed()) return;
                const ok = !!pcm && pcm.length > 0;
                if (ok) state.sentences++; else state.failed++;
                send({ type: "audio", index, text, ...VOICE_AUDIO, data: ok ? Buffer.from(pcm).toString("base64") : "", ...(ok ? {} : { failed: true }) });
            });
        },
        done: () => chain,
    };
}

/**
 * Runs the turn. `messages` is the conversation in Claude's shape, ending with what the user said; the model's
 * answers and the tools' results are added to it.
 *
 * - askModel({ messages, noTools, onSentence, onText }) -> { model, content, text, tools, cutOff, usage, aborted }
 *   (claudeVoiceAnswer / fallbackVoiceAnswer of the call service)
 * - runTool(tool, { cutOff }) -> { content, is_error?, event? } (`event`: extra fields for the tool's "done" event)
 * - speak(sentence) -> the sentence's PCM bytes (Buffer), or null; leave `speak` out for a turn with no voice
 * - send(event): one event to the phone
 * - isClosed(): the phone has gone (it hung up, or the user talked over the answer)
 * - onRound(model, usage): each model answer's real usage, the moment it is known (it is charged there)
 * - beforeDone(result) -> extra fields for the "done" event (the saved message's id and so on)
 *
 * Returns { text, rounds: [{ model, usage }], steps: [{ tool, args, result, error }], spoken, aborted }.
 * A turn the phone left is `aborted`: it stops the model, asks for no more voice, sends nothing more.
 */
export async function runVoiceTurn({ messages, askModel, runTool, speak = null, send, isClosed = () => false, onRound = null, beforeDone = null, maxRounds = 4, maxSpeakChars = Infinity }) {
    const speaker = createSpeaker({ speak, send, isClosed, maxChars: maxSpeakChars });
    const rounds = [];
    const steps = [];
    let aborted = false;
    let written = ""; // every piece of text sent so far: the answer as the phone shows it
    const result = () => ({ text: written.trim(), rounds, steps, spoken: speaker.state, aborted });

    try {
        // A few rounds, so the AI can use a tool and then talk about the result; still using tools after them: one
        // last answer without tools, so the results are said (as on the call)
        for (let round = 0; round <= maxRounds; round++) {
            if (isClosed()) { aborted = true; break; }
            let said = false;
            let roundText = "";
            let answer;
            try {
                answer = await askModel({
                    messages,
                    noTools: round === maxRounds,
                    onSentence: (sentence) => { said = true; speaker.say(sentence); },
                    onText: (piece) => {
                        if (!piece || isClosed()) return;
                        // (a space between what was said before a tool and what is said after it)
                        const delta = !roundText && written && !/\s$/.test(written) ? ` ${piece}` : piece;
                        roundText += piece;
                        written += delta;
                        send({ type: "text", delta });
                    },
                });
            } catch (e) {
                // The phone left while the model was still being asked: not a failure of the turn
                if (isClosed()) { aborted = true; break; }
                throw e;
            }
            rounds.push({ model: answer.model, usage: answer.usage });
            if (onRound) { try { onRound(answer.model, answer.usage); } catch (e) { console.error("[voice turn] usage was not counted:", e?.message || e); } }
            if (answer.aborted || isClosed()) { aborted = true; break; }
            // (a model whose answer did not come as a stream of sentences: its whole text is voiced)
            if (!said && answer.text) {
                if (!roundText) { const delta = written && !/\s$/.test(written) ? ` ${answer.text}` : answer.text; written += delta; send({ type: "text", delta }); }
                speaker.say(answer.text);
            }
            // An empty answer is not kept (the API refuses a conversation with an empty message in it)
            if (answer.content?.length) messages.push({ role: "assistant", content: answer.content });
            if (!answer.tools?.length) break;
            // Every tool the AI asked for gets its answer in one message, even when a tool fails (a request without
            // its answer would make the next round fail). The voice of what it said first ("Let me check") is made
            // and sent while the tools run.
            const results = [];
            for (const t of answer.tools) {
                if (!isClosed()) send({ type: "tool", name: t.name, status: "start" });
                let out;
                try { out = await runTool(t, { cutOff: !!answer.cutOff }); } catch (e) { out = { content: `Failed: ${e?.message || e}`, is_error: true }; }
                const content = String(out?.content || "Done.");
                steps.push({ tool: t.name, args: t.input || {}, result: content, error: !!out?.is_error });
                results.push({ type: "tool_result", tool_use_id: t.id, content, ...(out?.is_error ? { is_error: true } : {}) });
                if (!isClosed()) send({ type: "tool", name: t.name, status: out?.is_error ? "error" : "done", ...(out?.event || {}) });
            }
            messages.push({ role: "user", content: results });
        }
    } catch (e) {
        // What was already said still goes out and is told to the caller, with the error
        await speaker.done().catch(() => {});
        e.turn = result();
        throw e;
    }

    await speaker.done();
    if (isClosed()) aborted = true;
    const turn = result();
    const extra = beforeDone ? await beforeDone(turn) : null;
    if (!isClosed()) send({ type: "done", text: turn.text, ...(extra || {}) });
    return turn;
}
