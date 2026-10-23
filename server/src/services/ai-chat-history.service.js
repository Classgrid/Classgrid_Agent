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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/**
 * ai-chat-history.service.js
 *
 * Dual-layer AI chat history: Redis (hot cache) + Supabase (source of truth).
 *
 * Architecture:
 *  - Every chat session has a Redis List at key: ai:chat:history:{sessionId}
 *  - Each item in the list is a JSON string: { role, content }
 *  - On every request, Redis is checked first (fast, ~1ms)
 *  - On cache miss, Supabase is queried and Redis is warmed
 *  - Redis list is capped at MAX_HISTORY (500) messages via LTRIM
 *  - TTL is reset to 24h on every write (active sessions stay warm)
 *
 * Tiered depth:
 *  - Default: 25 messages (fast, from Redis)
 *  - Extended: up to 500 (from Supabase via warmCache)
 *  - Hard cap: 500 messages max
 */

import redis from '../config/redis.js';
import { getSessionMessages } from './ai-chat.service.js';
import { senderLabels } from './ai-chat-grid.service.js';

const REDIS_KEY_PREFIX  = 'ai:chat:history:';
const MAX_HISTORY       = 500;   // absolute cap stored in Redis
const DEFAULT_DEPTH     = 12;    // default messages sent to LLM per request (was 25; see docs/AI_TOKEN_ROOT_CAUSE.md)
// Tool memory notes are restored only for the most recent answers, each cut short, so old tool results
// don't make every new message heavier. Links in a result are always kept.
const TOOL_NOTE_TURNS   = 2;
const TOOL_NOTE_CHARS   = 600;
const CACHE_TTL_SECONDS = 86400; // 24 hours

/**
 * Adds a message's file links back to its text for the model ("Attached Files:" is the same format the
 * current message uses), so a follow-up like "show the full table" can re-open a file uploaded earlier.
 */
function withFileLinks(content, fileUrls) {
    const files = Array.isArray(fileUrls) ? fileUrls.filter(u => typeof u === 'string' && u) : [];
    if (files.length === 0) return content || '';
    return `${content || ''}\n\nAttached Files:\n${files.join('\n')}`.trim();
}

/**
 * Build the Redis list key for a session.
 */
function redisKey(sessionId) {
    return `${REDIS_KEY_PREFIX}${sessionId}`;
}

/**
 * Fetch the last `depth` messages for a session.
 *
 * Strategy:
 *  1. Try Redis (LRANGE from the right side — newest messages)
 *  2. On miss, warm the cache from Supabase then retry
 *
 * @param {string} sessionId
 * @param {number} depth - how many messages to return (default 25, max 500)
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
export async function getHistory(sessionId, depth = DEFAULT_DEPTH) {
    if (!sessionId) return [];

    const safeDepth = Math.min(Math.max(1, depth), MAX_HISTORY);
    const key = redisKey(sessionId);

    try {
        // Check if the Redis list exists
        const listLen = await redis.llen(key);

        if (listLen === 0) {
            // Cache miss — warm from Supabase
            await warmCache(sessionId);
        }

        // LRANGE with negative index: -safeDepth gets the last N items
        const raw = await redis.lrange(key, -safeDepth, -1);
        // Tool notes are kept only for the last TOOL_NOTE_TURNS assistant messages.
        const assistantPositions = raw.map((item, i) => (/"role"\s*:\s*"assistant"/.test(item) ? i : -1)).filter(i => i >= 0);
        const notesFrom = assistantPositions.length > TOOL_NOTE_TURNS ? assistantPositions[assistantPositions.length - TOOL_NOTE_TURNS] : 0;
        return raw.flatMap((item, itemIndex) => {
            try {
                const parsed = JSON.parse(item);
                if (parsed && parsed.fileUrls) {
                    parsed.content = withFileLinks(parsed.content, parsed.fileUrls);
                    delete parsed.fileUrls;
                }
                if (parsed && typeof parsed.content === 'string' && parsed.content.trim().startsWith('{')) {
                    try {
                        const inner = JSON.parse(parsed.content);
                        if (inner && inner.classgrid_ai_message) {
                            parsed.content = inner.content || '';

                            // Safely restore truncated tool memory for the LLM without blowing up the context window
                            if (itemIndex >= notesFrom && inner.steps && Array.isArray(inner.steps) && inner.steps.length > 0) {
                                const toolSummaries = inner.steps.map(s => {
                                    if (!s.tool) return null;
                                    let resExcerpt = "No result recorded";
                                    if (typeof s.result === 'string') {
                                        // Short excerpt, but every link in the result is kept (CDN files, PDFs, meeting links)
                                        if (s.result.length > TOOL_NOTE_CHARS) {
                                            const links = [...new Set(s.result.match(/https?:\/\/[^\s"'<>)\]]+/g) || [])].slice(0, 10);
                                            resExcerpt = s.result.substring(0, TOOL_NOTE_CHARS) + '...[TRUNCATED]' + (links.length ? ` Links: ${links.join(' ')}` : '');
                                        } else {
                                            resExcerpt = s.result;
                                        }
                                    }
                                    return `Tool Used: ${s.tool} | Result Excerpt: ${resExcerpt}`;
                                }).filter(Boolean).join('\n');
                                
                                if (toolSummaries) {
                                    return [
                                        parsed,
                                        {
                                            role: 'system',
                                            content: `[SYSTEM NOTE - YOUR BACKGROUND TOOL MEMORY FOR THIS TURN:\n${toolSummaries}\n(You actually ran these tools. Do not hallucinate that you didn't!)]`
                                        }
                                    ];
                                }
                            }
                        }
                    } catch {}
                }
                return [parsed];
            }
            catch { return []; }
        });

    } catch (err) {
        console.error(`[ChatHistory] Redis error for session ${sessionId}, falling back to Supabase:`, err?.message);
        // Graceful fallback: read directly from Supabase
        return await getHistoryFromSupabase(sessionId, safeDepth);
    }
}

/** How many messages the chat has so far (warms the cache from Supabase on a miss). */
export async function getHistoryCount(sessionId) {
    if (!sessionId) return 0;
    const key = redisKey(sessionId);
    try {
        let len = await redis.llen(key);
        if (len === 0) {
            await warmCache(sessionId);
            len = await redis.llen(key);
        }
        return len;
    } catch {
        return (await getSessionMessages(sessionId).catch(() => []))?.length || 0;
    }
}

/**
 * Append a new message to the session history in Redis.
 * Also resets TTL so active sessions stay warm.
 * Caps list at MAX_HISTORY via LTRIM.
 *
 * @param {string} sessionId
 * @param {'user'|'assistant'} role
 * @param {string} content
 */
export async function appendToHistory(sessionId, role, content, fileUrls = []) {
    const files = Array.isArray(fileUrls) ? fileUrls.filter(u => typeof u === 'string' && u) : [];
    if (!sessionId || !role || (!content && files.length === 0)) return;

    const key = redisKey(sessionId);
    // File links are kept with the message so later turns can still open the file (see withFileLinks).
    const item = JSON.stringify(files.length ? { role, content: content || '', fileUrls: files } : { role, content });

    try {
        await redis.rpush(key, item);
        await redis.ltrim(key, -MAX_HISTORY, -1); // Keep only the last 500
        await redis.expire(key, CACHE_TTL_SECONDS); // Reset 24h TTL
    } catch (err) {
        // Non-fatal — history is already saved to Supabase separately
        console.warn(`[ChatHistory] Failed to append to Redis for session ${sessionId}:`, err?.message);
    }
}

/**
 * Populate Redis from Supabase for a cold session.
 * Called automatically on cache miss.
 *
 * @param {string} sessionId
 */
export async function warmCache(sessionId) {
    if (!sessionId) return;

    try {
        const dbMessages = await getSessionMessages(sessionId);
        if (!dbMessages || dbMessages.length === 0) return;

        const key = redisKey(sessionId);
        // Share Grid chats: user messages start with the sender's name, as when they were sent
        const label = (await senderLabels(sessionId)) || (() => '');

        // Write all messages into Redis as a pipeline (atomic, fast)
        const pipeline = redis.pipeline();
        for (const msg of dbMessages) {
            if (msg.role === 'user' || msg.role === 'assistant') {
                const files = Array.isArray(msg.file_urls) ? msg.file_urls.filter(Boolean) : [];
                const content = label(msg) + (msg.content || '');
                pipeline.rpush(key, JSON.stringify(files.length
                    ? { role: msg.role, content, fileUrls: files }
                    : { role: msg.role, content }));
            }
        }
        pipeline.ltrim(key, -MAX_HISTORY, -1);
        pipeline.expire(key, CACHE_TTL_SECONDS);
        await pipeline.exec();

        console.info(`[ChatHistory] ✅ Warmed Redis cache for session ${sessionId} with ${dbMessages.length} messages`);
    } catch (err) {
        console.error(`[ChatHistory] Failed to warm Redis cache for session ${sessionId}:`, err?.message);
    }
}

/**
 * Invalidate (delete) the Redis cache for a session.
 * Call this when a session is deleted.
 *
 * @param {string} sessionId
 */
export async function invalidateHistoryCache(sessionId) {
    if (!sessionId) return;
    try {
        await redis.del(redisKey(sessionId));
        console.info(`[ChatHistory] 🗑️ Invalidated Redis cache for session ${sessionId}`);
    } catch (err) {
        console.warn(`[ChatHistory] Failed to invalidate Redis cache for session ${sessionId}:`, err?.message);
    }
}

/**
 * Direct Supabase fallback (no Redis).
 * Used when Redis is unavailable.
 *
 * @param {string} sessionId
 * @param {number} depth
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
async function getHistoryFromSupabase(sessionId, depth = DEFAULT_DEPTH) {
    try {
        const dbMessages = await getSessionMessages(sessionId);
        if (!dbMessages) return [];
        const label = (await senderLabels(sessionId)) || (() => '');
        return dbMessages
            .slice(-depth)
            .map(m => {
                let text = m.content || '';
                if (typeof text === 'string' && text.trim().startsWith('{')) {
                    try {
                        const inner = JSON.parse(text);
                        if (inner && inner.classgrid_ai_message) {
                            text = inner.content || '';
                        }
                    } catch {}
                }
                return { role: m.role, content: withFileLinks(label(m) + text, m.file_urls) };
            });
    } catch (err) {
        console.error(`[ChatHistory] Supabase fallback also failed for session ${sessionId}:`, err?.message);
        return [];
    }
}

/**
 * Every stored message of one chat, numbered from 1 (the first message), for the recall_chat and
 * search_recall_chat tools. Reads Redis, warming it from Supabase when the chat is no longer cached.
 * @returns {Promise<Array<{n: number, role: string, content: string}>>}
 */
export async function getChatTranscript(sessionId) {
    if (!sessionId) return [];
    const key = redisKey(sessionId);
    if ((await redis.llen(key)) === 0) await warmCache(sessionId);
    const raw = await redis.lrange(key, 0, -1);
    return raw.map((item, i) => {
        let role = "unknown", content = "";
        try {
            const parsed = JSON.parse(item);
            role = parsed?.role || role;
            content = typeof parsed?.content === "string" ? parsed.content : "";
            if (content.trim().startsWith("{")) {
                try {
                    const inner = JSON.parse(content);
                    if (inner && inner.classgrid_ai_message) content = inner.content || "";
                } catch {}
            }
        } catch {}
        return { n: i + 1, role, content };
    });
}
