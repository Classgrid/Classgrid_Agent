// Streaming chat loop for Claude models on the Anthropic API.
// Same contract as streamChat in llm-stream.js (the Cloudflare / OpenAI-style path, which this file
// does not touch): takes OpenAI-style messages and tools, streams thinking and answer text live,
// runs tool calls with the same duplicate-call guard, and returns { answer, usage, toolsRun }.
//
// Claude specifics:
// - Adaptive thinking with display "summarized" so the reasoning streams to the UI.
// - No temperature: Claude 5.x models reject non-default sampling parameters.
// - Prompt caching: tools and the fixed part of the system prompt are cached; the per-request
//   tail of the system prompt (time, memory, user context) comes after the cache breakpoint.
// - Within one answer the assistant turns are passed back unchanged (thinking blocks included);
//   history from earlier answers is plain text, so no thinking block is ever replayed out of context.
//   "drop_block" makes a prefix mismatch degrade instead of failing the request.

import Anthropic from "@anthropic-ai/sdk";
import { StreamChatError, CONTINUE_PROMPT, THINKING_CUT_PROMPT } from "./llm-stream.js";

export const CLAUDE_CHAT_MODELS = new Set([
    "claude-haiku-5-5",
    "claude-sonnet-5-5",
    "claude-opus-5-5",
    "claude-fable-5-1",
]);

// Models that accept the server-side refusal fallback in its "default" form on the Claude API.
const FALLBACK_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-1"]);

const DEFAULT_EFFORT = {
    "claude-haiku-5-5": "low",
    "claude-sonnet-5-5": "medium",
    "claude-opus-5-5": "medium",
    "claude-fable-5-1": "medium",
};

// Thinking tokens count toward max_tokens, so Claude gets more room than the Cloudflare default -
// but only when the caller's cap (derived from the user's remaining tokens) is already at its normal size.
const MIN_MAX_TOKENS = 32000;
const NORMAL_CALLER_CAP = 8192;

// After a mid-response server-side fallback, blocks before the last `fallback` block belong to the
// model that declined: only its text is kept; its thinking and tool calls are neither run nor re-sent.
function contentAfterFallback(content) {
    let lastFallback = -1;
    content.forEach((b, i) => { if (b.type === "fallback") lastFallback = i; });
    if (lastFallback < 0) return content;
    return [...content.slice(0, lastFallback).filter((b) => b.type === "text"), ...content.slice(lastFallback)];
}

let client = null;
function getClient() {
    if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
    return client;
}

function toSystemBlocks(systemText, cacheBoundary) {
    if (!systemText) return undefined;
    const boundary = Number.isInteger(cacheBoundary) && cacheBoundary > 0 && cacheBoundary < systemText.length
        ? cacheBoundary
        : systemText.length;
    const blocks = [{ type: "text", text: systemText.slice(0, boundary), cache_control: { type: "ephemeral" } }];
    const tail = systemText.slice(boundary);
    if (tail.trim()) blocks.push({ type: "text", text: tail });
    return blocks;
}

// The shared system prompt asks every model for inline <think>...</think> reasoning. Claude has native
// thinking, but may still follow that rule, so such spans are routed to the thought stream instead of the
// answer. Tags can be split across chunks, so a possible partial tag is held back until resolved.
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
    return {
        push(piece) {
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
        },
        flush() {
            if (pending) (inThink ? emitThought : emitText)(pending);
            pending = "";
        },
    };
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);

// Limits apply to the base64 that is sent (4/3 of the file size): 5 MB per image, 32 MB per request.
const MAX_IMAGE_BYTES = Math.floor(3.75 * 1024 * 1024);
const MAX_PDF_BYTES = 20 * 1024 * 1024;

// The real image type from the file's first bytes; the browser's mimeType can be wrong or empty.
function sniffImageType(buf) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
    if (buf.slice(0, 3).toString("ascii") === "GIF") return "image/gif";
    if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
    return null;
}

// Only files from Classgrid's own storage are downloaded, so a user can't make the server fetch arbitrary
// URLs: the Classgrid CDN (CloudFront over S3), the public R2 bucket URL used for chat uploads
// (config/r2Client.js), and the two Classgrid S3 buckets, including signed (presigned) links to them.
const TRUSTED_S3_BUCKETS = [
    { bucket: "erp-classgrid", region: "eu-north-1" },
    { bucket: "classgrid-student-docs-prod", region: "ap-south-1" },
];

function isTrustedAttachmentUrl(url) {
    try {
        const u = new URL(url);
        if (u.protocol !== "https:") return false;
        const trusted = new Set(["cdn.classgrid.in", "pub-96a564393c0440f2bab37ad8bbe92398.r2.dev"]);
        if (process.env.R2_PUBLIC_URL) {
            try { trusted.add(new URL(process.env.R2_PUBLIC_URL.replace(/^["']|["']$/g, "")).hostname); } catch { /* ignore a malformed value */ }
        }
        if (trusted.has(u.hostname)) return true;
        return TRUSTED_S3_BUCKETS.some(({ bucket, region }) =>
            // virtual-hosted style: <bucket>.s3.<region>.amazonaws.com / <bucket>.s3.amazonaws.com
            u.hostname === `${bucket}.s3.${region}.amazonaws.com` || u.hostname === `${bucket}.s3.amazonaws.com` ||
            // path style: s3.<region>.amazonaws.com/<bucket>/...
            ((u.hostname === `s3.${region}.amazonaws.com` || u.hostname === "s3.amazonaws.com") && u.pathname.startsWith(`/${bucket}/`))
        );
    } catch {
        return false;
    }
}

function nativeAttachmentKind(a) {
    const type = String(a?.mimeType || "").toLowerCase();
    if (!isTrustedAttachmentUrl(typeof a?.url === "string" ? a.url : "")) return null;
    if (IMAGE_TYPES.has(type)) return "image";
    if (type === "application/pdf") return "pdf";
    // Browsers sometimes send no type at all; fall back to the file extension (the bytes are checked later).
    if (!type && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(a.url)) return "image";
    if (!type && /\.pdf(\?|$)/i.test(a.url)) return "pdf";
    return null;
}

// Downloads a file from trusted Classgrid storage; redirects are followed by hand, and only to another
// trusted URL. Returns null when the file can't be fetched.
async function fetchTrustedFile(startUrl, signal) {
    const fetchSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
    let url = startUrl;
    let res;
    for (let hop = 0; hop < 3; hop++) {
        res = await fetch(url, { signal: fetchSignal, redirect: "manual" });
        if (res.status < 300 || res.status >= 400) break;
        const next = res.headers.get("location");
        const nextUrl = next ? new URL(next, url).toString() : "";
        if (!nextUrl || !isTrustedAttachmentUrl(nextUrl)) { res = null; break; }
        url = nextUrl;
    }
    if (!res || !res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
}

function imageBlockFromBuffer(buf) {
    if (!buf || buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
    const mediaType = sniffImageType(buf);
    if (!mediaType) return null;
    return { type: "image", source: { type: "base64", media_type: mediaType, data: buf.toString("base64") } };
}

// Images that come back from tools (view_image, a Classgrid image link in a tool's output, analyze_image on
// a Classgrid link) are shown to Claude as real images. Every image is re-sent with the rest of the chat on
// later rounds, so a run is capped by count and size (the API allows 32 MB per request).
const TRUSTED_IMAGE_URL = /https:\/\/[^\s"'<>()\]]+?\.(?:png|jpe?g|gif|webp)(?:\?[^\s"'<>()\]]*)?/gi;
// Only tools that make or upload an image have their image links shown; database, log, web and other
// results stay text (their links are just data, and fetching them would cost tokens on every query).
const IMAGE_LINK_TOOLS = new Set(["upload_sandbox_file_to_cdn", "upload_file_to_cdn", "generate_image", "edit_image"]);
const MAX_IMAGES_PER_TOOL_RESULT = 4;
const MAX_TOOL_IMAGES_PER_RUN = 16;
const MAX_TOOL_IMAGE_BYTES_PER_RUN = 18 * 1024 * 1024;

// Attachments Claude can read natively: images (vision) and PDFs. The server downloads them and sends the
// bytes (base64), so Claude never has to reach the URL itself. A file that can't be fetched is skipped
// and stays a link in the message text.
async function toAttachmentBlocks(attachments, signal) {
    const blocks = [];
    for (const a of attachments || []) {
        const kind = nativeAttachmentKind(a);
        if (!kind) continue;
        try {
            const buf = await fetchTrustedFile(a.url, signal);
            if (!buf) continue;
            if (buf.length === 0 || buf.length > (kind === "image" ? MAX_IMAGE_BYTES : MAX_PDF_BYTES)) continue;
            const data = buf.toString("base64");
            if (kind === "image") {
                const mediaType = sniffImageType(buf);
                if (!mediaType) continue; // not a format Claude reads (e.g. HEIC): stays a link for analyze_image
                blocks.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
            } else {
                blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data }, ...(a.name ? { title: String(a.name).slice(0, 200) } : {}) });
            }
        } catch (e) {
            if (signal?.aborted) throw e;
            console.warn(`[claude] could not load attachment for native vision (${String(a.url).slice(0, 80)}): ${e.message}`);
        }
    }
    return blocks;
}

function toClaudeMessages(messages, attachmentBlocks) {
    const out = [];
    for (const m of messages) {
        if (m.role !== "user" && m.role !== "assistant") continue;
        const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
        if (!text.trim()) continue;
        if (out.length === 0 && m.role === "assistant") continue; // the first message must be from the user
        out.push({ role: m.role, content: text });
    }
    // Attachments belong to the newest user message; blocks go before its text.
    const blocks = attachmentBlocks || [];
    const last = out[out.length - 1];
    if (blocks.length > 0 && last?.role === "user") {
        last.content = [...blocks, { type: "text", text: last.content }];
    }
    return out;
}

// Tool search: only these frequently used tools are loaded into Claude's context up front. Every other
// tool is sent with defer_loading, so its definition costs no input tokens until Claude finds it with
// the server-side tool search. Deferred tools sit outside the cached prefix, so caching is unaffected.
const ALWAYS_LOADED_TOOLS = new Set(["search_web", "open_url", "get_timezone_time", "run_code", "search_knowledge_base", "generate_pdf"]);
const TOOL_SEARCH_TOOL = { type: "tool_search_tool_bm25_20251119", name: "tool_search_tool_bm25" };
const LOAD_TOOLS_TOOL = "load_tools";

function withToolSearch(claudeTools, loadedToolNames) {
    const keep = loadedToolNames instanceof Set && loadedToolNames.size > 0 ? loadedToolNames : ALWAYS_LOADED_TOOLS;
    if (claudeTools.every((t) => keep.has(t.name))) return claudeTools;
    const loaded = claudeTools.filter((t) => keep.has(t.name));
    const deferred = claudeTools
        .filter((t) => !keep.has(t.name))
        .map(({ cache_control, ...t }) => ({ ...t, defer_loading: true })); // deferred tools can't carry cache_control
    const head = [TOOL_SEARCH_TOOL, ...loaded];
    // The cache breakpoint goes on the last always-loaded tool.
    head[head.length - 1] = { ...head[head.length - 1], cache_control: { type: "ephemeral" } };
    return [...head, ...deferred];
}

function toClaudeTools(tools) {
    // The API rejects a request where two tools share a name, so keep the first definition of each.
    const seen = new Set();
    const out = tools
        .filter((t) => {
            const name = t?.function?.name;
            if (!name || name === "internal_thought_process" || seen.has(name)) return false;
            seen.add(name);
            return true;
        })
        .map((t) => {
            const schema = t.function.parameters && typeof t.function.parameters === "object"
                ? t.function.parameters
                : { type: "object", properties: {} };
            return {
                name: t.function.name,
                description: t.function.description || "",
                input_schema: schema.type ? schema : { type: "object", ...schema },
            };
        });
    // Tools render before the system prompt; caching the last one caches the whole tool list.
    if (out.length > 0) out[out.length - 1] = { ...out[out.length - 1], cache_control: { type: "ephemeral" } };
    return out;
}

function addUsage(total, u) {
    if (!u) return;
    total.input_tokens += u.input_tokens || 0;
    total.output_tokens += u.output_tokens || 0;
    total.cache_read_input_tokens += u.cache_read_input_tokens || 0;
    total.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
    total.prompt_tokens = total.input_tokens + total.cache_read_input_tokens + total.cache_creation_input_tokens;
    total.completion_tokens = total.output_tokens;
    total.total_tokens = total.prompt_tokens + total.completion_tokens;
}

/**
 * Runs the tool-calling loop on a Claude model with streaming.
 * Throws StreamChatError on API failures; `error.toolsRun` tells the caller whether
 * any real tool already executed (in which case retrying elsewhere could repeat side effects).
 */
export async function streamClaudeChat({
    model,
    messages,
    tools = [],
    toolHandlers = {},
    maxTokens = MIN_MAX_TOKENS,
    maxToolDepth = 100,
    timeoutMs = 300000,
    systemCacheBoundary,
    loadedToolNames,
    groupNeedingLoad,
    attachments = [],
    effort,
    // Auto-continue: when the answer hits max_tokens it is continued in the same reply, up to this many times,
    // while outputBudget (the user's remaining tokens; undefined = no limit) still has room
    maxContinuations = 0,
    // At the tool-round limit, ask for an answer from what was found instead of the fixed "couldn't find" text
    answerAtDepthLimit = false,
    outputBudget,
    signal,
    onToken,
    onThought,
    onStatus,
}) {
    if (!CLAUDE_CHAT_MODELS.has(model)) throw new StreamChatError(`Unsupported Claude model: ${model}`);
    if (!process.env.ANTHROPIC_API_KEY) throw new StreamChatError("ANTHROPIC_API_KEY is not set");

    const systemText = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const system = toSystemBlocks(systemText, systemCacheBoundary);
    const attachmentBlocks = await toAttachmentBlocks(attachments, signal);
    const conversation = toClaudeMessages(messages, attachmentBlocks);
    // With an image attached Claude looks at it directly, so the analyze_image detour is not offered.
    const hasNativeImage = attachmentBlocks.some((b) => b.type === "image");
    const claudeTools = withToolSearch(toClaudeTools(hasNativeImage ? tools.filter((t) => t?.function?.name !== "analyze_image") : tools), loadedToolNames);
    const sentToolNames = new Set(claudeTools.map((t) => t.name));
    const deferredToolNames = new Set(claudeTools.filter((t) => t.defer_loading).map((t) => t.name));
    if (conversation.length === 0) throw new StreamChatError("No user message to send");

    // Images a tool result carries: ones the handler returned ({ images: [{ data, mediaType }] }) and Classgrid
    // image links in its text, within the per-result and per-run caps.
    let toolImagesSent = 0;
    let toolImageBytesSent = 0;
    const seenImageUrls = new Set();
    const toolResultImages = async (toolName, result, text) => {
        const blocks = [];
        const take = (block) => {
            if (!block || blocks.length >= MAX_IMAGES_PER_TOOL_RESULT || toolImagesSent >= MAX_TOOL_IMAGES_PER_RUN) return;
            const bytes = block.source.data.length;
            if (toolImageBytesSent + bytes > MAX_TOOL_IMAGE_BYTES_PER_RUN) return;
            toolImagesSent++;
            toolImageBytesSent += bytes;
            blocks.push(block);
        };
        for (const b of result?.imageBlocks || []) take(b);
        for (const img of result?.images || []) {
            try { take(imageBlockFromBuffer(Buffer.from(String(img?.data || ""), "base64"))); } catch { /* skip a bad image */ }
        }
        for (const url of IMAGE_LINK_TOOLS.has(toolName) ? String(text).match(TRUSTED_IMAGE_URL) || [] : []) {
            if (blocks.length >= MAX_IMAGES_PER_TOOL_RESULT) break;
            if (seenImageUrls.has(url) || !isTrustedAttachmentUrl(url)) continue;
            seenImageUrls.add(url);
            try {
                take(imageBlockFromBuffer(await fetchTrustedFile(url, signal)));
            } catch (e) {
                if (signal?.aborted) throw e;
                console.warn(`[claude] could not load tool image ${url.slice(0, 80)}: ${e.message}`);
            }
        }
        return blocks;
    };

    const usage = {
        prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
        input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0,
    };
    const betas = ["thinking-binding-controls-2026-08-01"];
    if (FALLBACK_MODELS.has(model)) betas.push("server-side-fallback-2026-07-01");

    const params = {
        model,
        max_tokens: (maxTokens || 0) >= NORMAL_CALLER_CAP ? Math.max(maxTokens, MIN_MAX_TOKENS) : Math.max(maxTokens || 0, 1024),
        system,
        tools: claudeTools.length > 0 ? claudeTools : undefined,
        thinking: {
            type: "adaptive",
            display: "summarized",
            block_binding: { prefix_mismatch_behavior: "drop_block" },
        },
        output_config: { effort: effort || DEFAULT_EFFORT[model] || "medium" },
        // Automatic cache point on the newest message: chat history and earlier rounds of this answer (tool
        // calls and results, e.g. a long PDF the model wrote) are read from cache on the next round instead
        // of being paid in full again. Together with the tools and system breakpoints that's 3 of the 4 allowed.
        cache_control: { type: "ephemeral" },
        betas,
        ...(FALLBACK_MODELS.has(model) ? { fallbacks: "default" } : {}),
    };

    const earlierCalls = []; // { name, input } of every tool call already handled in this answer
    let depth = 0;
    let toolsRun = 0;
    let hadReasoning = false;
    let thoughtThisRound = false;
    let servedModel = model; // differs from `model` when a server-side fallback answered
    // Usage of the round in progress, read from the stream events; added to `usage` if the round is cut off.
    let roundUsage = null;
    let continuedText = ""; // earlier parts of an answer that was cut off and continued
    let continuations = 0;
    let lastIntro = ""; // start of the previous tool round's text, to catch a model stuck repeating itself
    // Never let one round write more than the user has left
    const roundMaxTokens = () => outputBudget === undefined
        ? params.max_tokens
        : Math.max(1024, Math.min(params.max_tokens, outputBudget - (usage.output_tokens || 0)));

    try {
        for (;;) {
            if (signal?.aborted) throw new StreamChatError("Request aborted");

            thoughtThisRound = false;
            const emitThought = (piece) => {
                // Keep reasoning from separate rounds visually separate in the thought stream.
                if (hadReasoning && !thoughtThisRound) onThought?.("\n\n");
                thoughtThisRound = true;
                onThought?.(piece);
            };
            let roundText = "";
            const splitter = createThinkSplitter((piece) => { roundText += piece; onToken?.(piece); }, emitThought);
            const stream = getClient().beta.messages.stream(
                { ...params, max_tokens: roundMaxTokens(), messages: conversation },
                { signal, timeout: timeoutMs },
            );

            for await (const event of stream) {
                if (event.type === "message_start") {
                    roundUsage = { ...(event.message?.usage || {}) };
                    continue;
                }
                if (event.type === "message_delta") {
                    if (roundUsage && event.usage?.output_tokens !== undefined) roundUsage.output_tokens = event.usage.output_tokens;
                    continue;
                }
                if (event.type !== "content_block_delta") continue;
                if (event.delta.type === "thinking_delta" && event.delta.thinking) {
                    emitThought(event.delta.thinking);
                } else if (event.delta.type === "text_delta" && event.delta.text) {
                    splitter.push(event.delta.text);
                }
            }
            splitter.flush();

            const message = await stream.finalMessage();
            roundUsage = null;
            addUsage(usage, message.usage);
            if (message.model) servedModel = message.model;
            if (thoughtThisRound) hadReasoning = true;

            const content = contentAfterFallback(message.content);
            // Without a mid-response fallback the streamed text (minus inline <think> spans) is the answer;
            // after one, only the text blocks that survive contentAfterFallback count.
            const hadFallback = content !== message.content;
            const text = hadFallback
                ? content.filter((b) => b.type === "text").map((b) => b.text).join("").replace(/<think>[\s\S]*?<\/think>/g, "").trim()
                : roundText.trim();
            const toolUses = content.filter((b) => b.type === "tool_use");

            if (message.stop_reason === "refusal") {
                // Partial output from a declined response is discarded, not shown as a finished answer.
                return { answer: "I can't help with that request.", usage, toolsRun, servedModel };
            }
            if (message.stop_reason === "pause_turn") {
                conversation.push({ role: "assistant", content });
                continue;
            }
            if (toolUses.length === 0) {
                const piece = hadFallback ? text : roundText;
                const roomLeft = outputBudget === undefined || outputBudget - (usage.output_tokens || 0) >= 2048;
                if (message.stop_reason === "max_tokens" && piece.trim() && continuations < maxContinuations && roomLeft) {
                    continuations++;
                    continuedText += piece;
                    console.log(`[AI-STREAM] Claude answer hit max_tokens, continuing (${continuations}/${maxContinuations})`);
                    conversation.push({ role: "assistant", content });
                    conversation.push({ role: "user", content: CONTINUE_PROMPT });
                    continue;
                }
                // Cut off while still thinking, before any answer: ask for the answer itself
                if (message.stop_reason === "max_tokens" && !piece.trim() && thoughtThisRound && continuations < maxContinuations && roomLeft) {
                    continuations++;
                    console.log(`[AI-STREAM] Claude cut off while thinking, asking for the answer (${continuations}/${maxContinuations})`);
                    conversation.push({ role: "assistant", content: [{ type: "text", text: "(I ran out of room while planning.)" }] });
                    conversation.push({ role: "user", content: THINKING_CUT_PROMPT });
                    continue;
                }
                return { answer: (continuedText + piece).trim() || null, usage, toolsRun, servedModel };
            }
            if (depth >= maxToolDepth) {
                if (answerAtDepthLimit) {
                    // Same as the Cloudflare path: no more tools, answer from what was found so far
                    conversation.push({ role: "assistant", content });
                    conversation.push({ role: "user", content: [
                        ...toolUses.map((c) => ({ type: "tool_result", tool_use_id: c.id, content: "Not run: no more tool calls are possible.", is_error: true })),
                        { type: "text", text: "No more tool calls are possible. Answer now from what you found so far, and say what you could not check." },
                    ] });
                    const last = await getClient().beta.messages.stream(
                        { ...params, max_tokens: roundMaxTokens(), messages: conversation, tool_choice: { type: "none" } },
                        { signal, timeout: timeoutMs },
                    ).finalMessage();
                    addUsage(usage, last.usage);
                    const lastText = (last.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
                    if (lastText) onToken?.(lastText);
                    return { answer: (continuedText + lastText).trim() || null, usage, toolsRun, servedModel };
                }
                return { answer: "I searched but couldn't find a clear answer. Could you try rephrasing?", usage, toolsRun, servedModel };
            }

            // The same text again before another tool call means the model is going round in circles:
            // stop here and keep what it wrote, instead of repeating the same paragraph many times
            const intro = (text || "").slice(0, 120);
            if (intro.length >= 40 && intro === lastIntro) {
                console.log(`[AI-STREAM] Claude repeated the same text before a tool call (${toolUses.map((c) => c.name).join(", ")}), stopping the loop`);
                return { answer: (continuedText + text).trim() || null, usage, toolsRun, servedModel };
            }
            lastIntro = intro;

            // Pass the assistant turn back unchanged (apart from a declined model's blocks) so its thinking stays valid.
            conversation.push({ role: "assistant", content });

            const truncated = message.stop_reason === "max_tokens";
            const callsThisRound = [];
            const toolResults = [];
            const extraTexts = [];
            let countsTowardDepth = false;
            let stopAnswer = null;

            for (const call of toolUses) {
                const inputKey = JSON.stringify(call.input ?? {});
                let content;
                let isError = false;

                if (truncated) {
                    content = "Error: this tool call was cut off before its input was complete. Call it again with shorter input.";
                    isError = true;
                } else if ([...earlierCalls, ...callsThisRound].some((c) => c.name === call.name && c.input === inputKey)) {
                    content = `ERROR: You have ALREADY called ${call.name} with these exact arguments. Use the data you already have.`;
                    isError = true;
                } else if (!sentToolNames.has(call.name)) {
                    // Only tools that were actually sent to the model may run.
                    content = `Error: Unknown tool ${call.name}.`;
                    isError = true;
                } else if (!toolHandlers[call.name]) {
                    content = `Error: Unknown tool ${call.name}.`;
                    isError = true;
                } else if (call.name !== LOAD_TOOLS_TOOL && groupNeedingLoad?.(call.name)) {
                    // Found through tool search but its group (and that group's rules) isn't loaded yet.
                    content = `Error: Before using ${call.name}, call load_tools with groups ["${groupNeedingLoad(call.name)}"] to load it and its rules, then call ${call.name} again.`;
                    isError = true;
                } else {
                    // load_tools only changes which tools are visible: no status pill, and not counted as an action.
                    const isLoader = call.name === LOAD_TOOLS_TOOL;
                    if (!isLoader) { onStatus?.(call.name.replace(/_/g, " ")); toolsRun++; }
                    try {
                        // analyze_image on a Classgrid image: Claude looks at the image itself instead of
                        // reading another model's description of it.
                        const nativeImage = call.name === "analyze_image" && isTrustedAttachmentUrl(String(call.input?.url || ""))
                            ? imageBlockFromBuffer(await fetchTrustedFile(String(call.input.url), signal).catch(() => null))
                            : null;
                        content = nativeImage
                            ? { text: `The image is attached below; look at it yourself to answer: ${String(call.input?.question || "describe it").slice(0, 500)}`, imageBlocks: [nativeImage] }
                            : await toolHandlers[call.name](call.input ?? {});
                    } catch (e) {
                        content = `Tool error: ${e instanceof Error ? e.message : String(e)}`;
                        isError = true;
                    }
                    if (!isLoader) onStatus?.("analyzing");
                }
                countsTowardDepth = true;
                callsThisRound.push({ name: call.name, input: inputKey });
                // A handler may return { text, toolReferences }: load_tools hands Claude the deferred tools it
                // asked for as tool_reference blocks, which the API expands into their full definitions.
                const isObjectResult = content && typeof content === "object" && "text" in content;
                if (isObjectResult && typeof content.stopAnswer === "string") stopAnswer = content.stopAnswer;
                const refs = isObjectResult && Array.isArray(content.toolReferences)
                    ? content.toolReferences.filter((n) => deferredToolNames.has(n))
                    : [];
                const resultText = String((isObjectResult ? content.text : content) ?? "").slice(0, call.name === "run_project_helpers" ? 200000 : call.name === "open_url" || call.name === "view_project_file" || call.name === "search_project" ? 20000 : 6000);
                // The tool_result can only hold the references, so a loaded group's rules follow as a text block.
                if (refs.length > 0 && content.instructions) extraTexts.push(String(content.instructions));
                const images = refs.length > 0 || isError ? [] : await toolResultImages(call.name, isObjectResult ? content : null, resultText);
                toolResults.push({
                    type: "tool_result",
                    tool_use_id: call.id,
                    // The API requires a tool_result that carries tool_reference blocks to contain nothing else.
                    content: refs.length > 0
                        ? refs.map((n) => ({ type: "tool_reference", tool_name: n }))
                        : images.length > 0 ? [{ type: "text", text: resultText }, ...images] : resultText,
                    ...(isError ? { is_error: true } : {}),
                });
            }

            // All results go back in one user message, which keeps Claude making parallel calls.
            conversation.push({ role: "user", content: [...toolResults, ...extraTexts.map((text) => ({ type: "text", text: `Rules for the tools just loaded:\n${text}` }))] });
            earlierCalls.push(...callsThisRound);
            if (stopAnswer) return { answer: stopAnswer, usage, toolsRun, servedModel };
            if (countsTowardDepth) depth++;
        }
    } catch (err) {
        // A round that failed or was aborted mid-stream is still billed for what it processed.
        if (roundUsage) addUsage(usage, roundUsage);
        let wrapped;
        if (err instanceof StreamChatError) {
            wrapped = err;
        } else if (err instanceof Anthropic.APIError) {
            wrapped = new StreamChatError(`Anthropic${err.status ? ` ${err.status}` : ""}: ${err.message}`, {
                status: err.status,
                rateLimited: err instanceof Anthropic.RateLimitError,
            });
        } else {
            wrapped = new StreamChatError(err?.message || String(err));
        }
        wrapped.toolsRun = toolsRun;
        wrapped.usage = usage;
        wrapped.servedModel = servedModel;
        throw wrapped;
    }
}
