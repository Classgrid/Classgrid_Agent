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

    const partialTagLength = (str, tag) => {
        for (let len = Math.min(tag.length - 1, str.length); len > 0; len--) {
            if (tag.startsWith(str.slice(-len))) return len;
        }
        return 0;
    };

    const push = (piece) => {
        pending += piece;
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
            const hold = partialTagLength(pending, tag);
            const ready = pending.slice(0, pending.length - hold);
            if (ready) emit(ready);
            pending = pending.slice(pending.length - hold);
            return;
        }
    };

    const flush = () => {
        if (pending) (inThink ? emitThought : emitText)(pending);
        pending = "";
    };

    return { push, flush };
}

// Sent when an answer was cut off by the length limit, so the model picks up exactly where it stopped
export const THINKING_CUT_PROMPT = "You ran out of room while thinking and wrote no answer yet. Stop planning now and write the final answer directly, without drafting it again in your thinking. Finish everything that was asked.";
// Added to what was written so far when the user's tokens run out during an answer
export const BUDGET_STOP_NOTE = "_(Stopped here: your AI tokens ran out while I was working. Top up AI credits or wait for your token reset, then ask me to continue.)_";
export const budgetStopAnswer = (text) => `${String(text || "").trim()}\n\n${BUDGET_STOP_NOTE}`.trim();
export const CONTINUE_PROMPT ="Your previous reply was cut off by the length limit. Continue EXACTLY where it stopped, even mid-word, mid-sentence or mid-code, without repeating anything and without any preamble, apology or comment. If you were inside a code block, keep writing inside it (do not open a new ```). Finish everything that was asked.";

async function streamOneRound({ provider, messages, tools, temperature, maxTokens, timeoutMs, signal, onToken, onThought, inputTooBig }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    const onOuterAbort = () => controller.abort(signal.reason);
    signal?.addEventListener("abort", onOuterAbort, { once: true });

    try {
        const response = await fetch(provider.url, {
            method: "POST",
            signal: controller.signal,
            headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: provider.model,
                messages,
                temperature,
                max_tokens: maxTokens,
                tools: tools.length > 0 ? tools : undefined,
                stream: true,
                stream_options: { include_usage: true }
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
            const { done, value } = await reader.read();
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

                // Cloudflare attaches usage to every chunk; the largest total is the round's final count.
                if (chunk.usage && (!usage || (chunk.usage.total_tokens || 0) >= (usage.total_tokens || 0))) {
                    usage = chunk.usage;
                }
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

                const reasoningPiece = delta.reasoning_content ?? delta.reasoning;
                if (reasoningPiece) emitReasoning(reasoningPiece);
                if (delta.content) splitter.push(delta.content);
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
    signal,
    onToken,
    onThought,
    onStatus,
    // Tool names never sent to this model (e.g. analyze_image for a model that sees images itself)
    excludeTools
}) {
    // `tools` is re-read every round: load_tools can add tools to the same array mid-answer.
    const currentTools = () => tools.filter(t => t?.function?.name !== "internal_thought_process" && !excludeTools?.has(t?.function?.name));
    const conversation = [...messages];
    const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let depth = 0;
    let toolsRun = 0;
    let hadReasoning = false;
    let continuedText = ""; // earlier parts of an answer that was cut off and continued
    let continuations = 0;
    let lastIntro = ""; // start of the previous tool round's text, to catch a model stuck repeating itself
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

    try {
        for (;;) {
            if (signal?.aborted) throw new StreamChatError("Request aborted");
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
            const round = await streamOneRound({
                provider, messages: conversation, tools: roundTools, temperature, maxTokens: roundMax, timeoutMs, signal,
                onToken, onThought: separateThought, inputTooBig
            });
            if (round.reasoning) hadReasoning = true;

            if (round.usage) {
                usage.prompt_tokens += round.usage.prompt_tokens || 0;
                usage.completion_tokens += round.usage.completion_tokens || 0;
                usage.total_tokens += round.usage.total_tokens || 0;
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
            const wasCalled = (name, args) =>
                [...earlierCalls, ...callsThisRound].some((tc) => tc.function.name === name && (args === undefined || tc.function.arguments === args));

            conversation.push({ role: "assistant", content: round.text || "", tool_calls: round.toolCalls });

            let countsTowardDepth = false;
            let stopAnswer = null;
            for (const call of round.toolCalls) {
                const toolName = call.function.name;
                let toolResult;

                let args;
                try {
                    args = JSON.parse(call.function.arguments || "{}");
                } catch {
                    conversation.push({ role: "tool", tool_call_id: call.id, content: "Error: Invalid JSON arguments." });
                    countsTowardDepth = true;
                    continue;
                }

                if (toolName === "internal_thought_process") {
                    const alreadyThought = wasCalled("internal_thought_process");
                    callsThisRound.push(call);
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
                    conversation.push({ role: "tool", tool_call_id: call.id, content: toolResult });
                    continue;
                }

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
                } else {
                    // load_tools only changes which tools are visible: no status pill, and not counted as an action.
                    const isLoader = toolName === "load_tools";
                    if (!isLoader) { onStatus?.(toolName.replace(/_/g, " ")); toolsRun++; }
                    try {
                        toolResult = await handler(args);
                    } catch (e) {
                        toolResult = `Tool error: ${e instanceof Error ? e.message : String(e)}`;
                    }
                    if (!isLoader) onStatus?.("analyzing");
                }

                // A handler may return { text, ... } (load_tools does); the model gets the text.
                const resultText = toolResult && typeof toolResult === "object" && "text" in toolResult ? toolResult.text : toolResult;
                if (toolResult && typeof toolResult === "object" && typeof toolResult.stopAnswer === "string") {
                    // sleep_until: what the AI wrote before it (often its question to the user) is kept, not lost
                    const said = toolName === "sleep_until" ? String(round.text || "").trim() : "";
                    stopAnswer = said && !toolResult.stopAnswer.includes(said) ? `${said}\n\n${toolResult.stopAnswer}` : toolResult.stopAnswer;
                }
                // load_tools carries the full rules of the loaded groups, so it isn't cut like normal tool output.
                conversation.push({ role: "tool", tool_call_id: call.id, content: String(resultText ?? "").slice(0, toolName === "run_project_helpers" || toolName === "read_whatsapp_messages" || toolName === "wait_for_whatsapp_reply" ? 200000 : toolName === "load_tools" ? 40000 : toolName === "open_url" || toolName === "view_project_file" || toolName === "search_project" ? 20000 : 6000) });
            }

            if (stopAnswer) return { answer: stopAnswer, usage, toolsRun };
            if (countsTowardDepth) depth++;
        }
    } catch (err) {
        const wrapped = err instanceof StreamChatError ? err : new StreamChatError(err?.message || String(err));
        wrapped.toolsRun = toolsRun;
        wrapped.usage = usage;
        throw wrapped;
    }
}
