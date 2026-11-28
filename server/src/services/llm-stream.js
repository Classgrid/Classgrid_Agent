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
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// Streaming chat loop for OpenAI-compatible providers (Cloudflare Workers AI).
// Mirrors the tool-loop behaviour of @classgrid/ai's tryProvider, but streams
// reasoning and answer text as they are generated instead of waiting for the full reply.
//
// Unlike the SDK, the internal_thought_process tool is not offered: the model's native reasoning
// already streams live, and a thought-tool call costs a whole extra model round before the answer.
// A call to it is still handled if the model makes one anyway.
import { cfSwapProvider } from "./cf-retired-models.js";
import { cfAiFetch, isCfNeuronCapError } from "./cf-neuron-cap.service.js";
import { stopAnswerText } from "../utils/stop-answer.js";

/** The text without U+FFFD, the replacement character a provider sends for a character it could not decode */
const withoutBroken = (piece) => (typeof piece === "string" && piece.includes("\uFFFD") ? piece.replace(/\uFFFD/g, "") : piece);

// Cloudflare refuses a whole request with too many pictures in it ("too many images in request"), and a long task
// with screenshots (computer tool, browser) keeps adding them: only the newest ones stay, older ones become a note
const MAX_CF_IMAGES_PER_REQUEST = 24; // Cloudflare allows 32; some room is left for the pictures of the next step
export function keepNewestImages(conversation, max = MAX_CF_IMAGES_PER_REQUEST) {
    let seen = 0;
    for (let i = conversation.length - 1; i >= 0; i--) {
        const m = conversation[i];
        if (!Array.isArray(m?.content)) continue;
        let changed = false;
        const parts = [];
        for (let j = m.content.length - 1; j >= 0; j--) {
            const part = m.content[j];
            if (part?.type === "image_url" && ++seen > max) {
                parts.unshift({ type: "text", text: "(an older picture was taken out to save room; take a new one if you need it)" });
                changed = true;
            } else parts.unshift(part);
        }
        if (changed) conversation[i] = { ...m, content: parts };
    }
}

// The model refused the request itself (too many pictures, too much text): the conversation is made smaller and the
// round is tried again, instead of the answer stopping. Old pictures go, and old tool results are shortened.
export function shrinkConversation(conversation) {
    keepNewestImages(conversation, 4);
    const toolAt = conversation.map((m, i) => (m?.role === "tool" ? i : -1)).filter((i) => i >= 0);
    for (const i of toolAt.slice(0, -6)) {
        const text = String(conversation[i].content ?? "");
        if (text.length > 1500) conversation[i] = { ...conversation[i], content: `${text.slice(0, 1500)}\n...(shortened to save room)` };
    }
}

export class StreamChatError extends Error {
    constructor(message, { status, rateLimited = false } = {}) {
        super(message);
        this.name = "StreamChatError";
        this.status = status;
        this.rateLimited = rateLimited;
    }
}

// Routes inline <think>...</think> spans in the content stream to the thought channel.
// Tags can be split across chunks, so a possible partial tag is held back until resolved.
function createThinkSplitter(emitText, emitThought) {
    const OPEN = "<think>";
    const CLOSE = "</think>";
    let inThink = false;
    let pending = "";
    // Some models (DeepSeek, GLM) sometimes write their planning straight into the answer and close it with a lone
    // "</think>" (the opening tag was in their prompt template), e.g. "The user sent a screenshot... I should ask
    // briefly.</think>That looks like..." (seen 2026-11-15 on a picture sent without words). The start of an answer
    // that reads like such planning is held back until a lone "</think>" shows it was thinking (it then goes to the
    // thinking stream), or until it is clearly a real answer (no "</think>" within HOLD_MAX characters, or the
    // answer ends), so planning never shows as the answer and real answers are not held for long.
    const HOLD_MAX = 1200;
    const DECIDE_AT = 24;
    const LOOKS_LIKE_PLANNING = /^(?:the user\b|user (?:sent|is|has|asked|wants|said|just)\b|okay,? (?:so|the user)\b|ok,? (?:so|the user)\b|alright,? (?:so|the user)\b|so the user\b|we need to\b|i should\b|i need to (?:answer|reply|respond|ask)\b)/i;
    let decided = false;
    let holding = false;

    const partialTagLength = (str, tag) => {
        for (let len = Math.min(tag.length - 1, str.length); len > 0; len--) {
            if (tag.startsWith(str.slice(-len))) return len;
        }
        return 0;
    };

    const push = (piece) => {
        pending += piece;
        if (!decided) {
            const head = pending.trimStart();
            if (head.length < DECIDE_AT && !head.includes(CLOSE) && !head.startsWith(OPEN)) return;
            decided = true;
            holding = !head.startsWith(OPEN) && LOOKS_LIKE_PLANNING.test(head);
        }
        if (holding) {
            const close = pending.indexOf(CLOSE);
            if (close >= 0) {
                // It was planning: it goes to the thinking stream, the rest is the answer
                if (close > 0) emitThought(pending.slice(0, close));
                pending = pending.slice(close + CLOSE.length).replace(/^\s+/, "");
                holding = false;
            } else if (pending.length > HOLD_MAX || pending.includes(OPEN)) {
                holding = false; // a real answer after all
            } else {
                return;
            }
        }
        for (;;) {
            const tag = inThink ? CLOSE : OPEN;
            const emit = inThink ? emitThought : emitText;
            const idx = pending.indexOf(tag);
            if (idx >= 0) {
                if (idx > 0) emit(pending.slice(0, idx));
                pending = pending.slice(idx + tag.length);
                inThink = !inThink;
                continue;
            }
            // A lone "</think>" in the answer is never shown
            if (!inThink && pending.includes(CLOSE)) {
                pending = pending.split(CLOSE).join("");
                continue;
            }
            const hold = Math.max(partialTagLength(pending, tag), inThink ? 0 : partialTagLength(pending, CLOSE));
            const ready = pending.slice(0, pending.length - hold);
            if (ready) emit(ready);
            pending = pending.slice(pending.length - hold);
            return;
        }
    };

    const flush = () => {
        holding = false;
        decided = true;
        if (pending) (inThink ? emitThought : emitText)(pending.split(CLOSE).join(""));
        pending = "";
    };

    return { push, flush };
}

// Sent when an answer was cut off by the length limit, so the model picks up exactly where it stopped
export const THINKING_CUT_PROMPT = "You ran out of room while thinking and wrote no answer yet. Stop planning now and write the final answer directly, without drafting it again in your thinking. Finish everything that was asked.";
// A round that ended with neither text nor a tool call (some models stop after thinking): ask for the reply itself
export const EMPTY_ANSWER_PROMPT = "You stopped without writing anything to the user. Write your reply to the user now, directly (not in your thinking): what you found or did, and what is still left. If you still need a tool to finish what was asked, call it.";
// Added to what was written so far when the user's tokens run out during an answer
export const BUDGET_STOP_NOTE = "_(Stopped here: your plan's limit ran out while I was working. When it comes back, ask me to continue.)_";
export const budgetStopAnswer = (text) => `${String(text || "").trim()}\n\n${BUDGET_STOP_NOTE}`.trim();
export const CONTINUE_PROMPT ="Your previous reply was cut off by the length limit. Continue EXACTLY where it stopped, even mid-word, mid-sentence or mid-code, without repeating anything and without any preamble, apology or comment. If you were inside a code block, keep writing inside it (do not open a new ```). Finish everything that was asked.";

// The terminal rule, sent with every message where the AI can use a terminal (cloud and desktop app; owner's rule,
// 2026-11-04): a missing or failed tool is never a reason to stop and think, the terminal does the job
// A model going round in circles with nearly the same call (the same script with other numbers, 92 times in one
// answer, 2026-11-09): the calls of one answer are counted by their shape (numbers taken out). At REPEAT_NOTE_AT the
// result carries a note to get everything in one go; at REPEAT_BLOCK_AT that shape runs no more in this answer.
export const REPEAT_NOTE_AT = 10;
export const REPEAT_BLOCK_AT = 40;
// Tools that read a file by line numbers page through it on purpose (start_line / end_line): they are never blocked,
// only told to read more at once (a 1,707-line file read 40 lines at a time was blocked at the 40th page, and the model
// then asked for the same page 100 more times, 2026-11-10)
const PAGING_TOOLS = new Set(["view_project_file", "read_local_file"]);
// A tool result that was refused (not run): the same call again and again, or one the model already made
export const REFUSED_RESULT = /^(Error: you have made this same kind of call|ERROR: You have ALREADY called)/;
// After this many rounds in a row in which every call was refused, the model is asked to answer with no tools, instead
// of looping until the user stops it (DeepSeek Flash: 100 refused calls, 10 minutes, 2026-11-10)
export const MAX_REFUSED_ROUNDS = 3;
export function makeRepeatGuard() {
    const counts = new Map();
    return {
        // Call before running: null = go ahead, else the text to return instead of running
        before(toolName, input) {
            const shape = `${toolName}:${JSON.stringify(input ?? {}).replace(/\d+/g, "#").slice(0, 2000)}`;
            const n = (counts.get(shape) || 0) + 1;
            counts.set(shape, n);
            if (n >= REPEAT_BLOCK_AT && !PAGING_TOOLS.has(toolName)) return `Error: you have made this same kind of call (${toolName}, only the numbers differ) ${n} times in this answer. It is not run any more in this answer. Tell the user what you have so far and what stopped you.`;
            return null;
        },
        // Call after running: the note to append to the result, or ""
        after(toolName, input) {
            const shape = `${toolName}:${JSON.stringify(input ?? {}).replace(/\d+/g, "#").slice(0, 2000)}`;
            const n = counts.get(shape) || 0;
            if (PAGING_TOOLS.has(toolName) && n >= REPEAT_NOTE_AT && n % REPEAT_NOTE_AT === 0) return `\n\n[Note: this is the ${n}th page of this file you read in this answer. Read the rest in one call: leave end_line out (up to 2,000 lines come back) or give a wide start_line-end_line range.]`;
            return n === REPEAT_NOTE_AT ? `\n\n[Note: this is the ${n}th time you run this same kind of call with other numbers. Get everything you need in one call (return the whole table or list at once; results up to 40,000 characters come through) instead of small slices. After ${REPEAT_BLOCK_AT} such calls it stops running.]` : "";
        },
    };
}

export const TERMINAL_RULE = "--- USE THE TERMINAL (every message) ---\nYou don't need a special tool for anything the terminal can do. When a tool is missing, not loaded or fails, don't stop to think it over and don't call it again the same way: do the same job right away with the terminal (execute_terminal_command): git add / commit / push to push code, gh repo create (or git remote add origin and git push -u) for a new GitHub repo, and normal shell commands for files, installs, builds and checks.";
// A tool result that says the tool is missing or failed
export const toolFailed = (text) => /^\s*(error\b|tool error|failed\b|not run\b|not created\b|this folder project only works)/i.test(String(text ?? ""))
    || /\b(is not loaded|unknown tool|can't run on this computer|isn't open on the user's computer|is an older version that can't)\b/i.test(String(text ?? "").slice(0, 400));

// The request option that switches a model's thinking off (tested on Cloudflare, 2026-11-04: DeepSeek V4 Pro 15.7 s ->
// 2.1 s, V4.1 Flash 2.7 -> 1.1 s, Kimi K2.6 6.1 -> 3.1 s, GLM 5.3 3.3 -> 1.1 s). Other models: nothing is changed.
export function noThinkingFor(model) {
    const m = String(model || "");
    if (/deepseek|kimi|moonshot/i.test(m)) return { chat_template_kwargs: { thinking: false } };
    // GLM 5.3 (measured 2026-11-14): reasoning_effort low alone still thinks for ~13 s before the first word, and
    // thinking:false alone makes it write its thinking as the answer; both together answer in half a second
    if (/glm/i.test(m)) return { reasoning_effort: "low", chat_template_kwargs: { thinking: false } };
    return {};
}

async function streamOneRound({ provider, messages, tools, temperature, maxTokens, timeoutMs, signal, onToken, onThought, inputTooBig, quick = false }) {
    // A Workers AI model Cloudflare has removed goes to its replacement (cf-retired-models.js)
    provider = cfSwapProvider(provider);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    const onOuterAbort = () => controller.abort(signal.reason);
    signal?.addEventListener("abort", onOuterAbort, { once: true });

    try {
        // (a Cloudflare address: the daily Neuron cap is checked first and the round's usage is counted after,
        // cf-neuron-cap.service.js; any other address goes straight through)
        const response = await cfAiFetch(provider.url, {
            method: "POST",
            signal: controller.signal,
            // (provider.headers: e.g. Cloudflare's x-session-affinity, so a chat's requests reach the machine that keeps
            // its prompt cache)
            headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json", ...(provider.headers || {}) },
            body: JSON.stringify({
                model: provider.model,
                messages,
                temperature,
                max_tokens: maxTokens,
                tools: tools.length > 0 ? tools : undefined,
                stream: true,
                stream_options: { include_usage: true },
                // A quick round: the model's thinking is switched off (each model has its own switch, noThinkingFor)
                ...(quick ? noThinkingFor(provider.model) : {})
            })
        });

        if (!response.ok || !response.body) {
            const body = await response.text().catch(() => "");
            throw new StreamChatError(`HTTP ${response.status}: ${body.slice(0, 300)}`, {
                status: response.status,
                rateLimited: response.status === 429
            });
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        let reasoning = "";
        let usage = null;
        let writtenTokens = 0; // what the chunks between the first and the last say they hold (see below)
        let finishReason = null;
        const toolCalls = [];
        const emitReasoning = (piece) => {
            reasoning += piece;
            onThought?.(piece);
        };
        const splitter = createThinkSplitter(
            (piece) => { text += piece; onToken?.(piece); },
            emitReasoning
        );
        // The first usage Cloudflare sends already has this round's real input count: if that alone uses up the
        // user's tokens (inputTooBig), the round is cut right there, before anything is written
        let inputChecked = false;
        let budgetCut = false;

        for (;;) {
            if (budgetCut) {
                reader.cancel().catch(() => {});
                break;
            }
            let piece;
            try {
                piece = await reader.read();
            } catch (e) {
                // Stopped or broken mid-round (the user pressed Stop): the real usage Cloudflare sent so far goes with
                // the error, so what was used is charged: the input count from the first chunk, and what was written
                // from the chunks after it (each says how many tokens it holds)
                if (e && typeof e === "object" && (usage || writtenTokens > 0)) {
                    const written = Math.max(usage?.completion_tokens || 0, writtenTokens);
                    e.partialUsage = { ...(usage || {}), prompt_tokens: usage?.prompt_tokens || 0, completion_tokens: written, total_tokens: (usage?.prompt_tokens || 0) + written };
                }
                throw e;
            }
            const { done, value } = piece;
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data || data === "[DONE]") continue;

                let chunk;
                try { chunk = JSON.parse(data); } catch { continue; }

                // Cloudflare attaches usage to every chunk (read live 2026-11-17 on DeepSeek V4.1 Flash, V4 Pro and
                // GLM 5.3): the first chunk has the round's real input count and nothing written yet, each chunk in
                // between only how many tokens it holds itself (no input count), and the last one the whole round. So
                // the largest total is the round's final count, and the chunks in between add up to what was written
                // so far (used when the round is stopped before its last chunk).
                if (chunk.usage && (!usage || (chunk.usage.total_tokens || 0) >= (usage.total_tokens || 0))) {
                    usage = chunk.usage;
                }
                if (chunk.usage && !(chunk.usage.prompt_tokens > 0)) writtenTokens += Number(chunk.usage.completion_tokens) || 0;
                if (!inputChecked && usage?.prompt_tokens > 0) {
                    inputChecked = true;
                    if (inputTooBig?.({ prompt_tokens: usage.prompt_tokens, completion_tokens: 0, total_tokens: usage.prompt_tokens })) {
                        budgetCut = true;
                        break;
                    }
                }

                if (chunk.choices?.[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
                const delta = chunk.choices?.[0]?.delta;
                if (!delta) continue;

                // A character the provider could not put together (an emoji sent in pieces) arrives as U+FFFD, the
                // "?" in a black diamond: it is never part of a real answer, so it is dropped before it is shown or
                // saved (owner, 2026-11-15: three of them at the top of an answer)
                const reasoningPiece = withoutBroken(delta.reasoning_content ?? delta.reasoning);
                if (reasoningPiece) emitReasoning(reasoningPiece);
                const contentPiece = withoutBroken(delta.content);
                if (contentPiece) splitter.push(contentPiece);
                for (const tc of delta.tool_calls || []) {
                    const index = tc.index ?? toolCalls.length;
                    const call = (toolCalls[index] ??= { id: "", type: "function", function: { name: "", arguments: "" } });
                    if (tc.id) call.id = tc.id;
                    if (tc.function?.name) call.function.name += tc.function.name;
                    if (tc.function?.arguments) call.function.arguments += tc.function.arguments;
                }
            }
        }
        splitter.flush();

        if (budgetCut) {
            // Only the input was used; nothing written in this round counts as an answer or a tool call
            return { text: text.trim(), rawText: text, finishReason: "budget", reasoning, usage: { prompt_tokens: usage.prompt_tokens, completion_tokens: 0, total_tokens: usage.prompt_tokens }, toolCalls: [], budgetCut: true };
        }
        return { text: text.trim(), rawText: text, finishReason, reasoning, usage, toolCalls: toolCalls.filter(Boolean) };
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onOuterAbort);
    }
}

/**
 * Runs the tool-calling loop with streaming.
 * Throws StreamChatError on HTTP failures; `error.toolsRun` tells the caller whether
 * any real tool already executed (in which case retrying elsewhere could repeat side effects).
 */
export async function streamChat({
    provider,
    messages,
    tools = [],
    toolHandlers = {},
    temperature = 0.35,
    maxTokens = 600,
    maxToolDepth = 100,
    timeoutMs = 300000,
    // Auto-continue: when the answer hits maxTokens it is continued in the same reply, up to this many times,
    // while outputBudget (the user's remaining tokens; undefined = no limit) still has room
    maxContinuations = 0,
    // At the tool-round limit, ask for an answer from what was found instead of the fixed "couldn't find" text
    answerAtDepthLimit = false,
    outputBudget,
    // Live token check, real numbers only: onRoundUsage(usage) gets each round's real usage when the provider
    // reports it; tokensLeft() is the user's real tokens left, maxOutputTokens() how much a round may write with
    // them, inputTooBig(usage) checks a round's real input (sent before anything is written)
    onRoundUsage,
    tokensLeft,
    maxOutputTokens,
    inputTooBig,
    // beforeRound(): awaited before every round, in front of the token check (the caller reads the person's real
    // balance again there when the meter is low: answer-meter.js refillMeter)
    beforeRound = null,
    // userNotes(): what the person said while this round's tools ran (utils/user-notes.js), as one text or null. It
    // goes to the model as a user message right after the tools' results, and the loop goes on.
    userNotes = null,
    signal,
    onToken,
    onThought,
    onStatus,
    // Tool names never sent to this model (e.g. analyze_image for a model that sees images itself)
    excludeTools,
    // Other models a failed round moves to (same API), so the answer keeps going when one model is down
    fallbackProviders = [],
    // When Cloudflare's daily Neuron cap refuses a round (cf-neuron-cap.service.js) and no model outside Cloudflare is
    // in the list, a Claude model finishes the answer from where it stands, in the same reply: capStandIn() resolves
    // with { model, onRoundUsage?, tokensLeft?, maxOutputTokens?, inputTooBig? } (the live token check counted at that
    // model's rate; the caller's own hooks are used for the ones left out), or with null when Claude can't be used
    // (services/cap-fallback.service.js claudeFor). It may also bring what a Claude answer of the caller gets:
    // `system` (the system prompt in its Claude form, with `systemCacheBoundary`) and `tools` with `loadedToolNames`
    // and `groupNeedingLoad` (the Claude tool list: only the loaded tools in context, the rest through tool search);
    // without them the stand-in works with this loop's own system prompt and tool list.
    // The result then carries `standIn: { model, before: { model,
    // usage } }`: `usage` is the Claude model's, `before.usage` what the Cloudflare model used until then, and an
    // error from the stand-in carries the same `standIn`. Without capStandIn a refused round ends the answer as before.
    capStandIn = null,
    // The model sees images (like Claude): images from tool results are shown to it, not just their links
    seesImages = false,
    // The desktop app driving the loop (local-loop.service.js): after a round with tool calls it decides which run,
    // in what order; `toolDriver(calls, { run, text })` resolves with Map(callId -> { content, isError })
    toolDriver = null,
    // Going on with an answer after a server restart (turn-state.service.js): the conversation and usage saved after
    // its last round replace a fresh start; onConversation(conversation, usage) is called after every round with tools
    resumeProvider = null, // "cf" for a conversation saved by this loop; another loop's is ignored
    resumeConversation = null,
    resumeUsage = null,
    // onConversation(conversation, usage, extra): `extra.standIn` is set once a Claude stand-in is finishing the
    // answer (the conversation is then in Claude's shape); given back as resumeStandIn, the stand-in goes on with it
    onConversation = null,
    resumeStandIn = null,
    // How much the model thinks: "all" (every round, Deep), "first" (plans on the first round, then each round after a
    // tool result goes straight to the next step: those rounds were 8-23 s of thinking each, Normal), "none" (Fast).
    // Not given: this loop thinks every round ("all"), and a Claude stand-in works at its model's own default.
    thinking: thinkingAsked
}) {
    const thinking = thinkingAsked === undefined ? "all" : thinkingAsked;
    // `tools` is re-read every round: load_tools can add tools to the same array mid-answer.
    const currentTools = () => tools.filter(t => t?.function?.name !== "internal_thought_process" && !excludeTools?.has(t?.function?.name));
    const resumed = resumeProvider === "cf" && Array.isArray(resumeConversation) && resumeConversation.length > 0;
    const conversation = resumed ? [...resumeConversation] : [...messages];
    const repeatGuard = makeRepeatGuard(); // the same kind of call again and again, with other numbers
    const toolImages = seesImages ? (await import("./llm-stream-anthropic.js")).makeToolImageCollector(signal, conversation) : null;
    // cached_tokens: the input tokens the provider read from its prompt cache (billed lower), over all rounds
    const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cached_tokens: 0 };
    if (resumed && resumeUsage) for (const k of Object.keys(usage)) usage[k] += Number(resumeUsage[k]) || 0; // the rounds before the restart
    let depth = 0;
    let toolsRun = 0;
    let lastToolFailed = false; // a tool in the last round was missing or failed: the next round doesn't think
    let hadReasoning = false;
    let continuedText = ""; // earlier parts of an answer that was cut off and continued
    let continuations = 0;
    let lastIntro = ""; // start of the previous tool round's text, to catch a model stuck repeating itself
    let refusedRounds = 0; // rounds in a row in which every tool call was refused (see MAX_REFUSED_ROUNDS)
    let lastRoundText = "";
    const budgetStop = (why) => {
        console.log(`[AI-STREAM] stopped: the user's tokens ran out (${why}, toolsRun=${toolsRun})`);
        return { answer: budgetStopAnswer(continuedText + lastRoundText), usage, toolsRun, stoppedForBudget: true };
    };
    // What the next round may write: the user's real tokens left at this model's output price (no limit = maxTokens)
    const roundMaxTokens = () => {
        const cap = maxOutputTokens?.();
        return cap === undefined || cap === null ? maxTokens : Math.min(maxTokens, Math.floor(cap));
    };
    // The Claude stand-in (capStandIn) finishes this answer from where it stands: the conversation so far goes to
    // Claude's own loop in its shape, with the same tools, handlers, limits and callbacks, and what it writes joins
    // what was already written. `saved`: a stand-in's conversation from before a server restart (resumeStandIn).
    const finishWithClaude = async (stand, saved = null) => {
        const before = saved?.before?.model ? saved.before : { model: provider.model, usage: { ...usage } };
        const standIn = { model: stand.model, before };
        try {
            const { streamClaudeChat, toClaudeConversation } = await import("./llm-stream-anthropic.js");
            const ownTools = Array.isArray(stand.tools) ? stand.tools : null; // (the stand-in's own tool list)
            const toolNames = new Set((ownTools || currentTools()).map((t) => t?.function?.name).filter(Boolean));
            // (with its own list, the tools this answer already used are in its context from the start)
            const usedNames = conversation.flatMap((m) => (Array.isArray(m?.tool_calls) ? m.tool_calls : []).map((tc) => tc?.function?.name)).filter((n) => toolNames.has(n));
            const ownSystem = typeof stand.system === "string" && stand.system.trim() ? stand.system : null;
            console.warn(`[AI-STREAM] ${provider.model}: ${saved ? "going on after a restart" : "the Cloudflare daily cap refused the round"} (toolsRun=${toolsRun}); ${stand.model} finishes the answer`);
            const r = await streamClaudeChat({
                model: stand.model,
                // (the system messages in front are the system prompt; the conversation itself is resumeConversation)
                messages: ownSystem ? [{ role: "system", content: ownSystem }] : conversation,
                ...(ownSystem && stand.systemCacheBoundary ? { systemCacheBoundary: stand.systemCacheBoundary } : {}),
                ...(ownTools
                    ? { tools: ownTools, loadedToolNames: new Set([...(stand.loadedToolNames || []), ...usedNames]), groupNeedingLoad: stand.groupNeedingLoad }
                    : { toolsNow: currentTools }),
                toolHandlers,
                maxTokens,
                maxToolDepth: maxToolDepth > 0 ? Math.max(1, maxToolDepth - depth) : 0,
                timeoutMs,
                maxContinuations: Math.max(0, maxContinuations - continuations),
                answerAtDepthLimit,
                outputBudget: outputBudget === undefined ? undefined : Math.max(0, outputBudget - usage.completion_tokens),
                onRoundUsage: stand.onRoundUsage || onRoundUsage,
                tokensLeft: stand.tokensLeft || tokensLeft,
                maxOutputTokens: stand.maxOutputTokens || maxOutputTokens,
                inputTooBig: stand.inputTooBig || inputTooBig,
                beforeRound: stand.beforeRound || beforeRound,
                userNotes,
                // (Deep thinks harder, Fast less; Normal is the model's own default. Only what the caller asked for:
                // a title, a summary, a file read or a helper gives no thinking level, and "all" is only this loop's
                // own default; it used to make every such stand-in work at effort high, slower and dearer than the
                // same job started on Claude)
                ...(thinkingAsked === "all" ? { effort: "high" } : thinkingAsked === "none" ? { effort: "low" } : {}),
                signal,
                onToken,
                onThought,
                onStatus,
                toolDriver,
                resumeProvider: "claude",
                resumeConversation: saved?.conversation || toClaudeConversation(conversation, { toolNames }),
                resumeUsage: saved?.usage || null,
                onConversation: onConversation ? (c, u) => onConversation(c, u, { standIn }) : null,
            });
            return { ...r, answer: (continuedText + (r.answer || "")).trim() || null, toolsRun: toolsRun + (r.toolsRun || 0), servedModel: r.servedModel || stand.model, standIn };
        } catch (e) {
            const wrapped = e instanceof StreamChatError ? e : new StreamChatError(e?.message || String(e));
            wrapped.toolsRun = toolsRun + (e?.toolsRun || 0);
            wrapped.usage = e?.usage; // (the stand-in's own usage; the Cloudflare model's is in standIn.before)
            wrapped.servedModel = e?.servedModel || stand.model;
            wrapped.standIn = standIn;
            throw wrapped;
        }
    };
    const askStandIn = async () => {
        if (!capStandIn || signal?.aborted) return null;
        try { const stand = await capStandIn(); return stand?.model ? stand : null; } catch { return null; }
    };
    // An answer a stand-in was finishing when the server restarted goes on with a stand-in
    if (resumeStandIn?.model && resumeProvider === "claude" && Array.isArray(resumeConversation) && resumeConversation.length > 0) {
        const stand = await askStandIn();
        if (stand) return finishWithClaude(stand, { conversation: resumeConversation, usage: resumeUsage, before: resumeStandIn.before });
    }

    try {
        for (;;) {
            if (signal?.aborted) throw new StreamChatError("Request aborted");
            if (beforeRound) { try { await beforeRound(); } catch { /* the round goes on with what the meter holds */ } }
            const left = tokensLeft?.();
            if (left !== undefined && left !== null && left <= 0) return budgetStop("nothing left");
            const roundMax = roundMaxTokens();
            if (roundMax < 1) return budgetStop("nothing left to write with");

            // Keep reasoning from separate rounds visually separate in the thought stream.
            const separateThought = (piece) => {
                if (hadReasoning) { onThought?.("\n\n"); hadReasoning = false; }
                onThought?.(piece);
            };

            const roundTools = currentTools();
            const sentToolNames = new Set(roundTools.map(t => t.function.name));
            // The answer must not stop (owner's rule): a failed round (timeout, busy server, any error) is tried again,
            // up to 6 times, and after 2 failures on the same model it moves to the next fallback model. Text this round
            // already showed is kept and the model is asked to continue from there, so nothing is shown twice.
            let round;
            const roundProviders = [provider, ...fallbackProviders.filter((p) => p?.model && p.model !== provider.model)];
            let shrunk = false;
            for (let tryNo = 0, at = 0; ; tryNo++) {
                let shownText = "";
                if (String(roundProviders[at]?.model || "").startsWith("@cf/")) keepNewestImages(conversation);
                try {
                    round = await streamOneRound({
                        provider: roundProviders[at], messages: conversation, tools: roundTools, temperature, maxTokens: roundMax, timeoutMs, signal,
                        onToken: (piece) => { shownText += piece; onToken?.(piece); },
                        onThought: separateThought,
                        inputTooBig,
                        // (after a failed tool, never: the rule says to go straight to the terminal)
                        quick: thinking === "none" || lastToolFailed || (thinking === "first" && conversation[conversation.length - 1]?.role === "tool")
                    });
                    break;
                } catch (e) {
                    // The Cloudflare daily Neuron cap is reached (Global AI Config): no retry on that model; the next
                    // model that is not on Cloudflare takes over at once, and with none the answer stops
                    if (isCfNeuronCapError(e)) {
                        const next = roundProviders.findIndex((p, i) => i > at && !String(p?.model || "").startsWith("@cf/"));
                        if (signal?.aborted || next === -1) throw e;
                        console.warn(`[AI-STREAM] ${roundProviders[at].model}: ${e.message}; moving to ${roundProviders[next].model}`);
                        at = next;
                        continue;
                    }
                    // "Too many requests per minute" (many helpers on one model): wait it out longer instead of giving up
                    const busy = e?.rateLimited || /HTTP 429|rate limit/i.test(String(e?.message || ""));
                    const maxTries = busy ? 9 : 5;
                    // The request itself was too big for the model: shrink it once and try again (the answer keeps going)
                    if (!signal?.aborted && !shrunk && /HTTP (400|413)|too many images|too long|context length|maximum context|too large/i.test(String(e?.message || ""))) {
                        shrinkConversation(conversation);
                        shrunk = true;
                        console.warn(`[AI-STREAM] ${roundProviders[at].model} refused the request (${String(e?.message || e).slice(0, 160)}); made the conversation smaller, trying again`);
                        onStatus?.("Making room, trying again…");
                        continue;
                    }
                    if (signal?.aborted || tryNo >= maxTries) throw e;
                    console.warn(`[AI-STREAM] ${roundProviders[at].model} round failed (${String(e?.message || e).slice(0, 160)}); trying again (${tryNo + 1}/${maxTries})`);
                    if (shownText.trim()) {
                        continuedText += shownText;
                        conversation.push({ role: "assistant", content: shownText });
                        conversation.push({ role: "user", content: CONTINUE_PROMPT });
                    }
                    // A Cloudflare model that failed twice (an error, a timeout, too busy): Claude Haiku finishes the answer
                    // from where it stands, in the same reply, instead of the next backup in the list (Mistral) (owner,
                    // 2026-11-28: "whenever Cloudflare fails send it to Haiku", Auto and every other job). Only where the
                    // caller gave a stand-in (capStandIn: titles, summaries, memory notes, helpers, the main answer).
                    if (capStandIn && tryNo >= 1 && String(roundProviders[at]?.model || "").startsWith("@cf/")) {
                        e.cfFailed = true;
                        throw e;
                    }
                    if (tryNo % 2 === 1 && at < roundProviders.length - 1) at++;
                    onStatus?.("The model is busy, trying again…");
                    await new Promise((r) => setTimeout(r, busy ? Math.min(10000 * (tryNo + 1), 30000) : Math.min(3000 * (tryNo + 1), 10000)));
                }
            }
            if (round.reasoning) hadReasoning = true;

            if (round.usage) {
                usage.prompt_tokens += round.usage.prompt_tokens || 0;
                usage.completion_tokens += round.usage.completion_tokens || 0;
                usage.total_tokens += round.usage.total_tokens || 0;
                usage.cached_tokens += round.usage.prompt_tokens_details?.cached_tokens || round.usage.cached_tokens || 0;
                onRoundUsage?.(round.usage, { cut: !!round.budgetCut });
            }
            if (round.budgetCut) return budgetStop("this round's input alone used up the tokens left");
            lastRoundText = round.rawText || "";

            if (round.toolCalls.length === 0) {
                const roomLeft = outputBudget === undefined || outputBudget - usage.completion_tokens >= 2048;
                if (round.finishReason === "length" && round.rawText.trim() && continuations < maxContinuations && roomLeft) {
                    continuations++;
                    continuedText += round.rawText;
                    conversation.push({ role: "assistant", content: round.rawText });
                    conversation.push({ role: "user", content: CONTINUE_PROMPT });
                    console.log(`[AI-STREAM] answer hit the length limit, continuing (${continuations}/${maxContinuations})`);
                    continue;
                }
                // Cut off while still thinking, before any answer: ask for the answer itself
                if (round.finishReason === "length" && !round.rawText.trim() && round.reasoning && continuations < maxContinuations && roomLeft) {
                    continuations++;
                    console.log(`[AI-STREAM] cut off while thinking, asking for the answer (${continuations}/${maxContinuations})`);
                    conversation.push({ role: "assistant", content: "(I ran out of room while planning.)" });
                    conversation.push({ role: "user", content: THINKING_CUT_PROMPT });
                    continue;
                }
                // Stopped with no text at all (not cut off): ask once more for the reply, so the user never gets silence
                if (!(continuedText + round.rawText).trim() && continuations < maxContinuations && roomLeft) {
                    continuations++;
                    console.log(`[AI-STREAM] stopped with no answer (finish=${round.finishReason}, toolsRun=${toolsRun}), asking for it (${continuations}/${maxContinuations})`);
                    conversation.push({ role: "assistant", content: "(No reply written yet.)" });
                    conversation.push({ role: "user", content: EMPTY_ANSWER_PROMPT });
                    continue;
                }
                // Cut at its length limit, or still without a word, and the user has nothing left to go on with: the
                // answer ends as a stop for the limit (its note and the limit card), not as a silently cut answer or
                // no answer at all
                if (!roomLeft && (round.finishReason === "length" || !(continuedText + round.rawText).trim())) {
                    const leftNow = tokensLeft?.();
                    if (leftNow !== undefined && leftNow !== null && leftNow <= 0) return budgetStop("cut short with nothing left to continue");
                }
                return { answer: (continuedText + round.rawText).trim() || null, usage, toolsRun };
            }

            if (depth >= maxToolDepth) {
                if (answerAtDepthLimit) {
                    conversation.push({ role: "assistant", content: round.text || "", tool_calls: round.toolCalls });
                    for (const call of round.toolCalls) conversation.push({ role: "tool", tool_call_id: call.id, content: "Not run: no more tool calls are possible." });
                    conversation.push({ role: "user", content: "No more tool calls are possible. Answer now from what you found so far, and say what you could not check." });
                    const leftNow = tokensLeft?.();
                    if (leftNow !== undefined && leftNow !== null && leftNow <= 0) return budgetStop("nothing left");
                    const lastMax = roundMaxTokens();
                    if (lastMax < 1) return budgetStop("nothing left to write with");
                    const last = await streamOneRound({ provider, messages: conversation, tools: [], temperature, maxTokens: lastMax, timeoutMs, signal, onToken: undefined, onThought: undefined, inputTooBig });
                    if (last.usage) {
                        usage.prompt_tokens += last.usage.prompt_tokens || 0;
                        usage.completion_tokens += last.usage.completion_tokens || 0;
                        usage.total_tokens += last.usage.total_tokens || 0;
                        onRoundUsage?.(last.usage, { cut: !!last.budgetCut });
                    }
                    if (last.budgetCut) return budgetStop("this round's input alone used up the tokens left");
                    return { answer: (continuedText + (last.rawText || "")).trim() || null, usage, toolsRun };
                }
                return { answer: "I searched but couldn't find a clear answer. Could you try rephrasing?", usage, toolsRun };
            }

            // The same text again before another tool call means the model is going round in circles (seen with
            // several models just before a questions card): stop here and keep what it wrote, instead of
            // repeating the same paragraph up to maxToolDepth times.
            const intro = (round.text || "").slice(0, 120);
            if (intro.length >= 40 && intro === lastIntro) {
                console.log(`[AI-STREAM] same text repeated before a tool call (${round.toolCalls.map((c) => c.function.name).join(", ")}), stopping the loop`);
                return { answer: (continuedText + round.rawText).trim() || null, usage, toolsRun };
            }
            lastIntro = intro;

            // Duplicate checks look only at earlier rounds plus calls already handled in this round.
            // Including the current assistant message would make every parallel call after the first match itself.
            const earlierCalls = conversation.flatMap((m) => m.tool_calls || []);
            const callsThisRound = [];
            let toolFailedThisRound = false;
            const wasCalled = (name, args) =>
                [...earlierCalls, ...callsThisRound].some((tc) => tc.function.name === name && (args === undefined || tc.function.arguments === args));

            conversation.push({ role: "assistant", content: round.text || "", tool_calls: round.toolCalls });

            let countsTowardDepth = false;
            let stopAnswer = null;
            const roundImages = []; // images from this round's tool results, shown to a model that sees images
            // First pass: calls with bad arguments and the thought tool are answered at once; the rest are real calls
            const realCalls = []; // { call, args }
            const earlyResults = new Map(); // call id -> result text for the two early cases
            for (const call of round.toolCalls) {
                const toolName = call.function.name;
                let args;
                try {
                    args = JSON.parse(call.function.arguments || "{}");
                } catch {
                    earlyResults.set(call.id, "Error: Invalid JSON arguments.");
                    countsTowardDepth = true;
                    continue;
                }
                if (toolName === "internal_thought_process") {
                    const alreadyThought = wasCalled("internal_thought_process");
                    callsThisRound.push(call);
                    let toolResult;
                    if (alreadyThought) {
                        toolResult = "ERROR: You have ALREADY used the internal_thought_process tool. Provide your final answer now.";
                        countsTowardDepth = true;
                    } else {
                        const thought = args.thought || args.details || "";
                        if (thought) separateThought(thought);
                        hadReasoning = true;
                        onStatus?.("analyzing");
                        toolResult = "Thought logged. Provide your final answer now.";
                    }
                    earlyResults.set(call.id, toolResult);
                    continue;
                }
                realCalls.push({ call, args });
            }
            // One real call: the checks, then the handler. With a toolDriver (the desktop app driving the loop,
            // local-loop.service.js) the app says which calls run and in what order; otherwise they run here in turn.
            const runCall = async ({ call, args }) => {
                // A stopped answer starts no more steps: the rest of this round never reaches the user's PC (owner's
                // Remote PC work, 2026-11-18; the step already running is stopped by the app)
                if (signal?.aborted) throw new StreamChatError("Request aborted");
                const toolName = call.function.name;
                let toolResult;
                countsTowardDepth = true;
                const alreadyCalled = wasCalled(toolName, call.function.arguments);
                callsThisRound.push(call);
                const handler = toolHandlers[toolName];

                if (alreadyCalled) {
                    toolResult = `ERROR: You have ALREADY called ${toolName} with these exact arguments. Use the data you already have.`;
                } else if (!sentToolNames.has(toolName)) {
                    // Only tools that were actually sent to the model may run.
                    toolResult = `Error: The tool ${toolName} is not loaded. Call load_tools with its group first.`;
                } else if (!handler) {
                    toolResult = `Error: Unknown tool ${toolName}.`;
                } else if ((toolResult = repeatGuard.before(toolName, args))) {
                    // the same kind of call again and again (see makeRepeatGuard): not run any more
                } else {
                    // load_tools only changes which tools are visible: no status pill, and not counted as an action.
                    const isLoader = toolName === "load_tools";
                    if (!isLoader) { onStatus?.(toolName.replace(/_/g, " ")); toolsRun++; }
                    try {
                        // analyze_image on a Classgrid image: a model that sees images looks at it itself
                        const nativeImage = toolImages && toolName === "analyze_image" ? await toolImages.nativeImage(args?.url) : null;
                        if (nativeImage) {
                            roundImages.push(nativeImage);
                            toolResult = `The image is shown to you below; look at it yourself to answer: ${String(args?.question || "describe it").slice(0, 500)}`;
                        } else {
                            // (sleep_until is told what the AI wrote in this answer before the call: with nothing
                            // written and no message it does not sleep, it asks for the AI's own words)
                            toolResult = await handler(args, toolName === "sleep_until" ? { said: String(round.text || "").trim() } : undefined);
                        }
                    } catch (e) {
                        toolResult = `Tool error: ${e instanceof Error ? e.message : String(e)}`;
                    }
                    if (!isLoader) onStatus?.("analyzing");
                    const repeatNote = repeatGuard.after(toolName, args);
                    if (repeatNote) toolResult = toolResult && typeof toolResult === "object" && "text" in toolResult ? { ...toolResult, text: String(toolResult.text ?? "") + repeatNote } : String(toolResult ?? "") + repeatNote;
                }
                return toolResult;
            };
            const driven = toolDriver && realCalls.length
                ? await toolDriver(realCalls.map(({ call, args }) => ({ id: call.id, name: call.function.name, input: args })), {
                    run: async (id) => {
                        const rc = realCalls.find((x) => x.call.id === id);
                        const r = await runCall(rc);
                        return { content: r, isError: toolFailed(r && typeof r === "object" && "text" in r ? r.text : r) };
                    },
                    text: round.text,
                })
                : null;

            // Second pass, in the model's own order: every call gets its tool message
            let refusedThisRound = 0;
            for (const call of round.toolCalls) {
                const toolName = call.function.name;
                if (earlyResults.has(call.id)) {
                    conversation.push({ role: "tool", tool_call_id: call.id, content: earlyResults.get(call.id) });
                    continue;
                }
                const rc = realCalls.find((x) => x.call.id === call.id);
                if (!rc) continue;
                countsTowardDepth = true;
                const toolResult = driven ? (driven.get(call.id)?.content ?? "Not run.") : await runCall(rc);

                // A handler may return { text, ... } (load_tools does); the model gets the text.
                const resultText = toolResult && typeof toolResult === "object" && "text" in toolResult ? toolResult.text : toolResult;
                if (REFUSED_RESULT.test(String(resultText ?? ""))) refusedThisRound++;
                if (toolResult && typeof toolResult === "object" && typeof toolResult.stopAnswer === "string") {
                    // sleep_until: what the AI wrote before it (often its question to the user) is kept, not lost
                    const said = toolName === "sleep_until" ? String(round.text || "").trim() : "";
                    stopAnswer = stopAnswerText(said, toolResult);
                }
                if (toolImages && !String(resultText ?? "").startsWith("FAILED")) roundImages.push(...await toolImages.fromResult(toolName, toolResult && typeof toolResult === "object" ? toolResult : null, resultText));
                // A tool that is missing or failed: the next step doesn't stop to think it over (it goes straight to the
                // terminal, TERMINAL_RULE in every message's instructions; owner's rule, 2026-11-04)
                if (toolFailed(resultText)) toolFailedThisRound = true;
                // load_tools carries the full rules of the loaded groups, so it isn't cut like normal tool output.
                conversation.push({ role: "tool", tool_call_id: call.id, content: String(resultText ?? "").slice(0, toolName === "run_project_helpers" || toolName === "check_helpers" || toolName === "read_whatsapp_messages" || toolName === "wait_for_whatsapp_reply" ? 200000 : ["execute_terminal_command", "computer_terminal", "check_background_command", "start_background_command", "send_background_input", "run_code"].includes(toolName) ? 60000 : toolName === "load_tools" || ["browser_run_js", "browser_read", "browser_logs", "browser_open"].includes(toolName) ? 40000 : toolName === "view_project_file" || toolName === "search_project" || toolName === "read_page" ? 100000 : toolName === "open_url" || toolName === "read_local_file" ? 20000 : 6000) });
            }

            // Tool messages hold only text, so the images follow as one message the model looks at
            if (roundImages.length) conversation.push({ role: "user", content: [{ type: "text", text: "The images from the tool results above. Look at them yourself:" }, ...roundImages] });
            // What the person said meanwhile (never when a tool just ended the answer: it stays with the app, which
            // sends it as the next message)
            if (userNotes && !stopAnswer) {
                let said = null;
                try { said = userNotes(); } catch { said = null; }
                if (said) {
                    // (pictures sent with it: shown to a model that sees pictures; another opens them with analyze_image)
                    const saidText = typeof said === "string" ? said : String(said.text || "");
                    const saidPics = typeof said === "object" && seesImages ? (said.images || []) : [];
                    conversation.push({ role: "user", content: saidPics.length ? [{ type: "text", text: saidText }, ...saidPics.map((p) => ({ type: "image_url", image_url: { url: p.dataUrl } }))] : saidText });
                }
            }
            if (onConversation) { try { await onConversation(conversation, usage); } catch { /* the answer goes on without the saved copy */ } }
            if (stopAnswer) return { answer: stopAnswer, usage, toolsRun };
            if (countsTowardDepth) depth++;
            lastToolFailed = toolFailedThisRound;
            // A model that keeps asking for calls that are refused (the same call again and again, or one it already
            // made) is asked to answer from what it has, with no tools, after MAX_REFUSED_ROUNDS such rounds in a row
            refusedRounds = round.toolCalls.length > 0 && refusedThisRound === round.toolCalls.length ? refusedRounds + 1 : 0;
            if (refusedRounds >= MAX_REFUSED_ROUNDS) {
                console.log(`[AI-STREAM] ${refusedRounds} rounds of refused tool calls in a row (${round.toolCalls.map((c) => c.function.name).join(", ")}), asking for the answer`);
                conversation.push({ role: "user", content: "No more tool calls are possible. Answer now from what you found so far, and say what you could not check." });
                const leftNow = tokensLeft?.();
                if (leftNow !== undefined && leftNow !== null && leftNow <= 0) return budgetStop("nothing left");
                const lastMax = roundMaxTokens();
                if (lastMax < 1) return budgetStop("nothing left to write with");
                const last = await streamOneRound({ provider, messages: conversation, tools: [], temperature, maxTokens: lastMax, timeoutMs, signal, onToken: undefined, onThought: undefined, inputTooBig });
                if (last.usage) {
                    usage.prompt_tokens += last.usage.prompt_tokens || 0;
                    usage.completion_tokens += last.usage.completion_tokens || 0;
                    usage.total_tokens += last.usage.total_tokens || 0;
                    onRoundUsage?.(last.usage, { cut: !!last.budgetCut });
                }
                if (last.budgetCut) return budgetStop("this round's input alone used up the tokens left");
                return { answer: (continuedText + (last.rawText || "")).trim() || null, usage, toolsRun };
            }
        }
    } catch (err) {
        // Cloudflare's daily cap refused a round and no model outside Cloudflare could take it: the Claude stand-in
        // finishes the answer (its own failure goes up as it is, with `standIn` on it)
        // (also when a Cloudflare model failed twice for any other reason: e.cfFailed, set in the round loop above)
        if (isCfNeuronCapError(err) || err?.cfFailed) {
            const stand = await askStandIn();
            if (stand) {
                if (err?.cfFailed) console.warn(`[AI-STREAM] Cloudflare failed (${String(err?.message || err).slice(0, 160)}); ${stand.model} finishes the answer`);
                return finishWithClaude(stand);
            }
        }
        const wrapped = err instanceof StreamChatError ? err : new StreamChatError(err?.message || String(err));
        // (the cap's refusal stays recognisable to the caller, isCfNeuronCapError: it is not an error to try again)
        if (isCfNeuronCapError(err)) wrapped.code = "cf_neuron_cap";
        wrapped.toolsRun = toolsRun;
        // (the finished rounds, plus what the round in progress had really used when it stopped)
        const part = err?.partialUsage;
        wrapped.usage = part?.total_tokens > 0 ? {
            ...usage,
            prompt_tokens: usage.prompt_tokens + (part.prompt_tokens || 0),
            completion_tokens: usage.completion_tokens + (part.completion_tokens || 0),
            total_tokens: usage.total_tokens + (part.total_tokens || 0),
            cached_tokens: usage.cached_tokens + (part.prompt_tokens_details?.cached_tokens || part.cached_tokens || 0),
        } : usage;
        throw wrapped;
    }
}
