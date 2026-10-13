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
export const CONTINUE_PROMPT = "Your previous reply was cut off by the length limit. Continue EXACTLY where it stopped, even mid-word, mid-sentence or mid-code, without repeating anything and without any preamble, apology or comment. If you were inside a code block, keep writing inside it (do not open a new ```). Finish everything that was asked.";

async function streamOneRound({ provider, messages, tools, temperature, maxTokens, timeoutMs, signal, onToken, onThought }) {
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

        for (;;) {
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
    outputBudget,
    signal,
    onToken,
    onThought,
    onStatus
}) {
    // `tools` is re-read every round: load_tools can add tools to the same array mid-answer.
    const currentTools = () => tools.filter(t => t?.function?.name !== "internal_thought_process");
    const conversation = [...messages];
    const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let depth = 0;
    let toolsRun = 0;
    let hadReasoning = false;
    let continuedText = ""; // earlier parts of an answer that was cut off and continued
    let continuations = 0;

    try {
        for (;;) {
            if (signal?.aborted) throw new StreamChatError("Request aborted");

            // Keep reasoning from separate rounds visually separate in the thought stream.
            const separateThought = (piece) => {
                if (hadReasoning) { onThought?.("\n\n"); hadReasoning = false; }
                onThought?.(piece);
            };

            const roundTools = currentTools();
            const sentToolNames = new Set(roundTools.map(t => t.function.name));
            const round = await streamOneRound({
                provider, messages: conversation, tools: roundTools, temperature, maxTokens, timeoutMs, signal,
                onToken, onThought: separateThought
            });
            if (round.reasoning) hadReasoning = true;

            if (round.usage) {
                usage.prompt_tokens += round.usage.prompt_tokens || 0;
                usage.completion_tokens += round.usage.completion_tokens || 0;
                usage.total_tokens += round.usage.total_tokens || 0;
            }

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
                return { answer: "I searched but couldn't find a clear answer. Could you try rephrasing?", usage, toolsRun };
            }

            // Duplicate checks look only at earlier rounds plus calls already handled in this round.
            // Including the current assistant message would make every parallel call after the first match itself.
            const earlierCalls = conversation.flatMap((m) => m.tool_calls || []);
            const callsThisRound = [];
            const wasCalled = (name, args) =>
                [...earlierCalls, ...callsThisRound].some((tc) => tc.function.name === name && (args === undefined || tc.function.arguments === args));

            conversation.push({ role: "assistant", content: round.text || "", tool_calls: round.toolCalls });

            let countsTowardDepth = false;
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
                // load_tools carries the full rules of the loaded groups, so it isn't cut like normal tool output.
                conversation.push({ role: "tool", tool_call_id: call.id, content: String(resultText ?? "").slice(0, toolName === "load_tools" ? 40000 : 6000) });
            }

            if (countsTowardDepth) depth++;
        }
    } catch (err) {
        const wrapped = err instanceof StreamChatError ? err : new StreamChatError(err?.message || String(err));
        wrapped.toolsRun = toolsRun;
        wrapped.usage = usage;
        throw wrapped;
    }
}
