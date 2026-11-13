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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

import { primarySupabaseClient } from '../config/supabaseClient.js';
import accessLogger from '../config/logger.js';
import OpenAI from 'openai';

/**
 * Creates a new AI chat session.
 */
export async function createSession(userEmail, title, isIncognito = false) {
    // Incognito chats are saved like any chat but marked is_incognito: hidden from the user's lists, deleted when closed
    const { data, error } = await primarySupabaseClient
        .from('ai_chat_sessions')
        .insert([{ user_email: userEmail, title, is_incognito: !!isIncognito }])
        .select()
        .single();

    if (error) {
        console.error("Error creating AI chat session:", error);
        throw error;
    }
    
    return data;
}

/**
 * Titles of the same user's other recent chats (newest first), so a new title doesn't repeat one of them.
 */
export async function otherChatTitles(sessionId, limit = 40) {
    if (!sessionId) return [];
    const { data: own } = await primarySupabaseClient.from('ai_chat_sessions').select('user_email').eq('id', sessionId).single();
    if (!own?.user_email) return [];
    const { data } = await primarySupabaseClient
        .from('ai_chat_sessions')
        .select('title')
        .eq('user_email', own.user_email)
        .neq('id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);
    return (data || []).map((r) => String(r.title || '').trim()).filter(Boolean);
}

/**
 * Updates the title of an existing AI chat session.
 */
export async function updateSessionTitle(sessionId, title) {
    if (!sessionId) return null;

    const { data, error } = await primarySupabaseClient
        .from('ai_chat_sessions')
        .update({ title })
        .eq('id', sessionId)
        .select()
        .single();
    forgetSession(sessionId);

    if (error) {
        console.error("Error updating AI chat session title:", error);
        throw error;
    }

    return data;
}

/**
 * Saves a message to an existing chat session.
 */
export async function saveMessage(sessionId, role, content, fileUrls = [], senderEmail = null) {
    if (!sessionId) return null;

    // sender_email is set only in Share Grid chats (who of the people sent it)
    const row = { session_id: sessionId, role, content, file_urls: fileUrls };
    if (senderEmail) row.sender_email = senderEmail;
    const { data, error } = await primarySupabaseClient
        .from('ai_chat_messages')
        .insert([row])
        .select()
        .single();

    if (error) {
        console.error("Error saving AI chat message:", error);
        throw error;
    }

    // Fire and forget the Memory Agent
    triggerMemoryAgent(sessionId).catch(err => console.error("Memory Agent error:", err));

    return data;
}

// The summary starts with this header, so the chat knows how many messages it covers and sends the model
// every message after that point (no gap between the summary and the recent messages).
const MEMORY_HEADER = /^\[Summary of messages 1-(\d+)\]\n/;
// Every 8 messages DeepSeek V4 Flash rewrites one summary of the whole chat (User facts + Task state).
const MEMORY_EVERY = 8;
const MEMORY_MESSAGE_CHARS = 3000;
const MEMORY_FLASH_MODEL = "@cf/deepseek-ai/deepseek-v4.1-flash-1017";
// The desktop app: more of each message read, and the newest DeepSeek Flash writes its longer memory
const DESKTOP_MEMORY_MESSAGE_CHARS = 6000;
const DESKTOP_MEMORY_FLASH_MODEL = "@cf/deepseek-ai/deepseek-v4.1-flash-1017";

/** How many chat messages a saved summary covers, or null for an older summary without the header. */
export function memoryCoverage(summary) {
    const m = MEMORY_HEADER.exec(String(summary || ""));
    return m ? Number(m[1]) : null;
}

/** The summary text without its coverage header. */
export function memoryText(summary) {
    return String(summary || "").replace(MEMORY_HEADER, "");
}

// Saved assistant messages can be JSON ({ classgrid_ai_message, content, steps }): the text is summarized, and in the
// desktop app a short list of the steps it took (tools, files, commands), so long agent work is remembered too
function plainMessageText(content, withSteps = false) {
    const text = String(content ?? "");
    if (text.trim().startsWith("{")) {
        try {
            const inner = JSON.parse(text);
            if (inner?.classgrid_ai_message) {
                const steps = (Array.isArray(inner.steps) ? inner.steps : []).slice(-40).map((s) => {
                    const a = s?.args || {};
                    const what = a.path || a.file_path || a.command || a.url || a.query || a.name || a.task || "";
                    return `- ${s?.tool || s?.name || "step"}${what ? `: ${String(what).slice(0, 160)}` : ""}${s?.status === "error" ? " (failed)" : ""}`;
                });
                return String(inner.content || "") + (withSteps && steps.length ? `\n[Steps taken]\n${steps.join("\n")}` : "");
            }
        } catch { /* not JSON */ }
    }
    return text;
}

const MEMORY_INSTRUCTIONS = `You keep the long-term memory of one chat between a user and Classgrid AI.
You get the PREVIOUS MEMORY (may be empty) and the NEW MESSAGES since it was written. Write the updated memory.

Output exactly these two sections, in Markdown, max 350 words in total:

## User facts
Stable facts about the user: their name, things they asked the AI to remember (favorite things, numbers, names), stated preferences and standing instructions.
- Keep every fact from the previous memory unless the user changed or withdrew it.
- Copy names, numbers, links and file paths exactly.

## Task state
What the chat is working on now: the goal, decisions made, files and links created (exact paths/URLs), and what is still pending.
- Drop finished or outdated items.

Rules:
- Write only what the messages actually say. Never invent facts, instructions or preferences.
- Something the AI offered or suggested is not a user instruction unless the user agreed to it.
- Do not record temporary status or guesses (for example "memory is not working yet" or "the agent may have failed").
- If a section has nothing, write "None yet."
- Output only the two sections, nothing before or after.`;

// The desktop app's longer memory (owner, 2026-11-02): enough to carry on a chat of many hours
const DESKTOP_MEMORY_INSTRUCTIONS = `You keep the long-term memory of one chat between a user and Classgrid AI.
You get the PREVIOUS MEMORY (may be empty) and the NEW MESSAGES since it was written. Write the updated memory.

Output exactly these sections, in Markdown, max 1500 words in total. The AI must be able to carry on a chat of many
hours from this memory alone, so keep the details that matter:

## User facts
Stable facts about the user: their name, things they asked the AI to remember (favorite things, numbers, names), stated preferences and standing instructions.
- Keep every fact from the previous memory unless the user changed or withdrew it.
- Copy names, numbers, links and file paths exactly.

## What the user asked, in order
Every request the user made in this chat, one short line each, oldest first, with whether it is done, in progress or still to do.
- Keep the old requests from the previous memory (shorten them if needed, never drop one).

## Work done
Files, folders, links and projects created or changed (exact paths/URLs), commands and tools that mattered, and their results.

## Problems and fixes
Errors that happened (the exact error text when short) and how they were fixed, or that they are still open.

## Task state
What the chat is working on right now, decisions made, and what is still pending.
- Drop finished or outdated items here (they stay in "What the user asked" as done).

Rules:
- Write only what the messages actually say. Never invent facts, instructions or preferences.
- Something the AI offered or suggested is not a user instruction unless the user agreed to it.
- Do not record temporary status or guesses (for example "memory is not working yet" or "the agent may have failed").
- If a section has nothing, write "None yet."
- Output only the two sections, nothing before or after.`;

async function summarizeWithFlash(input, desktop = false) {
    const { streamChat } = await import('./llm-stream.js');
    const result = await streamChat({
        provider: {
            name: "cloudflare",
            url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${desktop ? DESKTOP_MEMORY_FLASH_MODEL : MEMORY_FLASH_MODEL}`,
            apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN || "",
            model: desktop ? DESKTOP_MEMORY_FLASH_MODEL : MEMORY_FLASH_MODEL,
            timeoutMs: 90000
        },
        messages: [
            { role: "system", content: desktop ? DESKTOP_MEMORY_INSTRUCTIONS : MEMORY_INSTRUCTIONS },
            { role: "user", content: input }
        ],
        tools: [],
        maxTokens: desktop ? 8000 : 3000, // Flash reasons first; leave room for the memory after the reasoning
        maxToolDepth: 0,
        timeoutMs: 90000
    });
    // (its tokens are not written to AiUsageLog: counted here towards the Cloudflare daily Neuron cap)
    if (result.usage) meterCfNeurons(desktop ? DESKTOP_MEMORY_FLASH_MODEL : MEMORY_FLASH_MODEL, result.usage);
    return String(result.answer || "").trim();
}

// Fallback when DeepSeek V4 Flash is unavailable.
async function summarizeWithMistral(input, desktop = false) {
    const mistralKey = process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY_2;
    if (!mistralKey) throw new Error("MISTRAL_API_KEY is not set");
    const openai = new OpenAI({ apiKey: mistralKey, baseURL: "https://api.mistral.ai/v1" });
    const response = await openai.chat.completions.create({
        model: "open-mistral-nemo",
        messages: [{ role: "system", content: desktop ? DESKTOP_MEMORY_INSTRUCTIONS : MEMORY_INSTRUCTIONS }, { role: "user", content: input }]
    });
    return String(response.choices?.[0]?.message?.content || "").trim();
}

const DESKTOP_SUMMARY_CHARS = 30000; // this much new text since the last summary is summarized now in the desktop app
async function grewBig(sessionId, messages) {
    try {
        const redis = (await import('../config/redis.js')).default;
        if (JSON.parse((await redis.get(`chatwake:meta:${sessionId}`)) || "{}").clientApp !== "desktop") return false;
        const { data: session } = await primarySupabaseClient.from('ai_chat_sessions').select('long_term_memory').eq('id', sessionId).single();
        const covered = session?.long_term_memory ? (memoryCoverage(session.long_term_memory) ?? 0) : 0;
        const sinceText = messages.slice(covered).reduce((n, m) => n + plainMessageText(m.content, true).length, 0);
        return sinceText >= DESKTOP_SUMMARY_CHARS;
    } catch { return false; }
}

/**
 * Background worker that keeps each chat's long-term memory: every 8 messages it updates the previous
 * summary with the messages since then (DeepSeek V4 Flash, Mistral Nemo as fallback).
 */
export async function triggerMemoryAgent(sessionId, { force = false } = {}) {
    if (!sessionId) return false;
    let lockKey = null;
    let redis = null;
    try {
        const { data: messages, error } = await primarySupabaseClient
            .from('ai_chat_messages')
            .select('role, content, created_at, sender_email')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error || !messages) return false;
        const total = messages.length;
        // force (the /compact command): now, without waiting for the next 8-message mark
        if (total < MEMORY_EVERY) return false;
        // The desktop app also updates the memory when the chat grew big since the last summary: one long agent answer
        // with many steps is a single message, so waiting for 8 messages would leave the memory far behind
        if (!force && total % MEMORY_EVERY !== 0 && !(await grewBig(sessionId, messages))) return false;

        // One update at a time per chat (two messages saved at once could both reach this point).
        redis = (await import('../config/redis.js')).default;
        lockKey = `ai:memory:lock:${sessionId}`;
        const gotLock = await redis.set(lockKey, "1", "EX", 120, "NX").catch(() => "OK");
        if (!gotLock) return false;
        // A chat in the desktop app gets the longer memory (its last client is kept with the chat's wake-up details)
        let desktop = false;
        try { desktop = JSON.parse((await redis.get(`chatwake:meta:${sessionId}`)) || "{}").clientApp === "desktop"; } catch { /* website */ }

        const { data: session } = await primarySupabaseClient
            .from('ai_chat_sessions')
            .select('long_term_memory')
            .eq('id', sessionId)
            .single();
        const previous = session?.long_term_memory || "";
        // An older summary without the header covered everything up to the previous 8-message mark.
        const covered = previous ? (memoryCoverage(previous) ?? Math.max(0, total - MEMORY_EVERY)) : 0;
        const newMessages = messages.slice(Math.min(covered, total));
        if (newMessages.length === 0) return false;

        // Share Grid chats: each user message says who sent it ("USER (Rahul)"), so the summary keeps who said what
        // (messages from before the chat was shared are the owner's)
        const { gridLabelMap } = await import('./ai-chat-grid.service.js');
        const grid = await gridLabelMap(sessionId);
        const who = (m) => {
            if (!grid || m.role !== 'user') return '';
            const email = String(m.sender_email || '').toLowerCase() || grid.owner;
            return ` (${grid.labels[email] || email})`;
        };
        const input = [
            `PREVIOUS MEMORY:\n${previous ? memoryText(previous) : "(empty)"}`,
            `NEW MESSAGES (${covered + 1} to ${total}):`,
            ...newMessages.map((m, i) => `[${covered + i + 1}] ${String(m.role).toUpperCase()}${who(m)}: ${plainMessageText(m.content, desktop).slice(0, desktop ? DESKTOP_MEMORY_MESSAGE_CHARS : MEMORY_MESSAGE_CHARS)}`),
            // Share Grid: several people use this chat, so facts are kept per person
            ...(grid ? [`NOTE: This chat is shared by ${grid.members.length} people: ${Object.values(grid.labels).join(", ")}. Write the User facts separately for each person, under their name, so one person's facts and preferences are never applied to another.`] : [])
        ].join("\n\n");

        console.log(`[Memory Agent] Updating memory for session ${sessionId} (messages ${covered + 1}-${total})...`);
        let summary = "";
        let usedModel = MEMORY_FLASH_MODEL;
        try {
            summary = await summarizeWithFlash(input, desktop);
        } catch (e) {
            console.warn(`[Memory Agent] DeepSeek V4 Flash failed, using Mistral Nemo: ${e.message}`);
        }
        if (!summary) {
            usedModel = "open-mistral-nemo";
            summary = await summarizeWithMistral(input, desktop);
        }
        if (!summary) throw new Error("empty summary");

        const { error: updateErr } = await primarySupabaseClient
            .from('ai_chat_sessions')
            .update({ long_term_memory: `[Summary of messages 1-${total}]\n${summary}` })
            .eq('id', sessionId);
        forgetSession(sessionId);

        if (updateErr) {
            console.error("[Memory Agent] Error saving to DB:", updateErr);
            return false;
        }
        console.log(`[Memory Agent] Successfully saved condensed memory for session ${sessionId} (1-${total}, ${usedModel})`);
        return true;
    } catch (error) {
        console.error("[Memory Agent] Failed:", error);
        return false;
    } finally {
        if (redis && lockKey) redis.del(lockKey).catch(() => {});
    }
}

/**
 * Retrieves all non-incognito sessions for a user.
 */
export async function getSessions(userEmail) {
    // Only what the chat list needs (sidebar + search palette); the big columns (memory summary etc.) stay in the DB.
    // The database sends at most 1000 rows per request, so read in pages: with more chats than that, the oldest
    // ones silently dropped off the list and looked deleted. Small columns only, and a page cap as a brake.
    const PAGE = 1000, MAX_PAGES = 10;
    const all = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        const { data, error } = await primarySupabaseClient
            .from('ai_chat_sessions')
            .select('id, title, created_at, pinned')
            .eq('user_email', userEmail)
            .eq('is_incognito', false)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(page * PAGE, page * PAGE + PAGE - 1);

        if (error) {
            console.error("Error fetching AI chat sessions:", error);
            throw error;
        }
        all.push(...(data || []));
        if (!data || data.length < PAGE) break;
    }

    return all;
}

/**
 * Retrieves all messages for a given session.
 */
export async function getSessionMessages(sessionId) {
    const { data, error } = await primarySupabaseClient
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching AI chat messages:", error);
        throw error;
    }

    return data;
}

/**
 * Deletes a chat session and its messages.
 */
export async function deleteSession(sessionId) {
    if (!sessionId) return null;

    // Messages cascade delete if foreign key is set up, but let's delete messages first just in case
    await primarySupabaseClient.from('ai_chat_messages').delete().eq('session_id', sessionId);
    
    const { error } = await primarySupabaseClient
        .from('ai_chat_sessions')
        .delete()
        .eq('id', sessionId);
    forgetSession(sessionId);

    if (error) {
        console.error("Error deleting AI chat session:", error);
        throw error;
    }
    return true;
}

/**
 * Updates the pinned status of a chat session.
 */
export async function updateSessionPinned(sessionId, pinned) {
    if (!sessionId) return null;

    const { data, error } = await primarySupabaseClient
        .from('ai_chat_sessions')
        .update({ pinned })
        .eq('id', sessionId)
        .select()
        .single();
    forgetSession(sessionId);

    if (error) {
        console.error("Error updating AI chat session pinned status:", error);
        throw error;
    }
    return data;
}

/**
 * Retrieves a single session by ID.
 */
// A chat's row is read at the start of every answer (ownership, ended, summary). It is kept in this process for a
// few seconds, so the next message of the same chat doesn't wait on the database for it again (answers must start at
// once, owner 2026-11-09). Code that changes the row calls forgetSession first.
const sessionRows = new Map(); // sessionId -> { at, promise }
const SESSION_ROW_MS = 30000; // (every writer of the row calls forgetSession, so a change is seen at once)
export function forgetSession(sessionId) { sessionRows.delete(String(sessionId)); }
export async function getSessionById(sessionId) {
    const key = String(sessionId);
    const kept = sessionRows.get(key);
    if (kept && Date.now() - kept.at < SESSION_ROW_MS) return kept.promise;
    const promise = readSessionRow(sessionId);
    sessionRows.set(key, { at: Date.now(), promise });
    promise.then((row) => { if (!row) sessionRows.delete(key); }, () => sessionRows.delete(key));
    if (sessionRows.size > 5000) sessionRows.clear();
    return promise;
}
async function readSessionRow(sessionId) {
    const { data, error } = await primarySupabaseClient
        .from('ai_chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (error) {
        console.error("Error fetching session:", error);
        return null; // Might not exist
    }
    return data;
}

// ─────────────────────────────────────────────────
// PUBLIC CHAT SHARING
// ─────────────────────────────────────────────────

import crypto from 'crypto';
import { meterText as meterCfNeurons } from "./cf-neuron-cap.service.js";

/**
 * Generates a short, URL-safe share ID (10 chars).
 */
function generateShareId() {
    return crypto.randomBytes(8).toString('base64url').slice(0, 10);
}

/**
 * Creates a public snapshot of a chat session for sharing.
 * Stores a frozen copy of all messages so the shared link remains valid
 * even if the original session is later edited or deleted.
 */
export async function createSharedSnapshot(sessionId, userEmail, userName, title, messages, providedShareId = null) {
    const shareId = providedShareId || generateShareId();

    const { data, error } = await primarySupabaseClient
        .from('shared_chat_snapshots')
        .insert([{
            share_id: shareId,
            original_session_id: sessionId,
            user_email: userEmail,
            user_name: userName || userEmail.split('@')[0],
            title,
            messages: JSON.stringify(messages),
        }])
        .select()
        .single();

    if (error) {
        console.error("[Share] Error creating shared snapshot:", error);
        throw error;
    }

    console.info(`[Share] ✅ Created public share ${shareId} for session ${sessionId} by ${userEmail}`);
    return data;
}

/**
 * Retrieves a shared chat snapshot by its public share ID.
 * No authentication required — this is a public endpoint.
 */
export async function getSharedSnapshot(shareId) {
    const { data, error } = await primarySupabaseClient
        .from('shared_chat_snapshots')
        .select('*')
        .eq('share_id', shareId)
        .single();

    if (error) {
        console.warn(`[Share] Snapshot not found for shareId: ${shareId}`);
        return null;
    }

    return data;
}

/**
 * Retrieves all AI generated images for a user across all non-incognito sessions.
 */
export async function getUserGeneratedImages(userEmail) {
    const { data: sessions, error: sessionsError } = await primarySupabaseClient
        .from('ai_chat_sessions')
        .select('id')
        .eq('user_email', userEmail)
        .eq('is_incognito', false);

    if (sessionsError) {
        console.error("Error fetching sessions for images:", sessionsError);
        throw sessionsError;
    }

    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map(s => s.id);
    const images = [];
    
    // Chunk sessionIds to prevent HeadersOverflowError (fetch failed) on huge GET requests
    const CHUNK_SIZE = 50;
    for (let i = 0; i < sessionIds.length; i += CHUNK_SIZE) {
        const chunk = sessionIds.slice(i, i + CHUNK_SIZE);
        
        const { data: messages, error: messagesError } = await primarySupabaseClient
            .from('ai_chat_messages')
            .select('*')
            .in('session_id', chunk)
            .like('content', '%[IMAGE_GENERATION_COMPLETE:%')
            .order('created_at', { ascending: false });

        if (messagesError) {
            console.error("Error fetching image messages chunk:", messagesError);
            throw messagesError;
        }

        for (const msg of messages) {
            const content = msg.content;
            const match = content.match(/\[IMAGE_GENERATION_COMPLETE:\s*(.*?)\s*[|:]\s*(.*?)\]/);
            if (match) {
                images.push({
                    id: msg.id,
                    prompt: match[1].trim(),
                    url: match[2].trim(),
                    createdAt: msg.created_at,
                    sessionId: msg.session_id
                });
            }
        }
    }

    // Sort images globally since we fetched in chunks
    images.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Deduplicate images by URL (in case the AI repeated the string in later messages)
    const uniqueImages = [];
    const seenUrls = new Set();
    for (const img of images) {
        if (!seenUrls.has(img.url)) {
            seenUrls.add(img.url);
            uniqueImages.push(img);
        }
    }

    return uniqueImages;
}
