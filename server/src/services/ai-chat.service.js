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
    if (isIncognito) return null; // Do not save incognito sessions

    const { data, error } = await primarySupabaseClient
        .from('ai_chat_sessions')
        .insert([{ user_email: userEmail, title, is_incognito: false }])
        .select()
        .single();

    if (error) {
        console.error("Error creating AI chat session:", error);
        throw error;
    }
    
    return data;
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

    if (error) {
        console.error("Error updating AI chat session title:", error);
        throw error;
    }

    return data;
}

/**
 * Saves a message to an existing chat session.
 */
export async function saveMessage(sessionId, role, content, fileUrls = []) {
    if (!sessionId) return null;

    const { data, error } = await primarySupabaseClient
        .from('ai_chat_messages')
        .insert([{ session_id: sessionId, role, content, file_urls: fileUrls }])
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
const MEMORY_EVERY = 8;
const MEMORY_MESSAGE_CHARS = 3000;
const MEMORY_FLASH_MODEL = "@cf/deepseek-ai/deepseek-v4-flash-0731";

/** How many chat messages a saved summary covers, or null for an older summary without the header. */
export function memoryCoverage(summary) {
    const m = MEMORY_HEADER.exec(String(summary || ""));
    return m ? Number(m[1]) : null;
}

/** The summary text without its coverage header. */
export function memoryText(summary) {
    return String(summary || "").replace(MEMORY_HEADER, "");
}

// Saved assistant messages can be JSON ({ classgrid_ai_message, content, steps }); only the text is summarized.
function plainMessageText(content) {
    const text = String(content ?? "");
    if (text.trim().startsWith("{")) {
        try {
            const inner = JSON.parse(text);
            if (inner?.classgrid_ai_message) return String(inner.content || "");
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

async function summarizeWithFlash(input) {
    const { streamChat } = await import('./llm-stream.js');
    const result = await streamChat({
        provider: {
            name: "cloudflare",
            url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MEMORY_FLASH_MODEL}`,
            apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN || "",
            model: MEMORY_FLASH_MODEL,
            timeoutMs: 90000
        },
        messages: [
            { role: "system", content: MEMORY_INSTRUCTIONS },
            { role: "user", content: input }
        ],
        tools: [],
        maxTokens: 3000, // Flash reasons first; leave room for the memory after the reasoning
        maxToolDepth: 0,
        timeoutMs: 90000
    });
    return String(result.answer || "").trim();
}

// Fallback when DeepSeek V4 Flash is unavailable.
async function summarizeWithMistral(input) {
    const mistralKey = process.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY_2;
    if (!mistralKey) throw new Error("MISTRAL_API_KEY is not set");
    const openai = new OpenAI({ apiKey: mistralKey, baseURL: "https://api.mistral.ai/v1" });
    const response = await openai.chat.completions.create({
        model: "open-mistral-nemo",
        messages: [{ role: "system", content: MEMORY_INSTRUCTIONS }, { role: "user", content: input }]
    });
    return String(response.choices?.[0]?.message?.content || "").trim();
}

/**
 * Background worker that keeps each chat's long-term memory: every 8 messages it updates the previous
 * summary with the messages since then (DeepSeek V4 Flash, Mistral Nemo as fallback).
 */
export async function triggerMemoryAgent(sessionId) {
    if (!sessionId) return;
    let lockKey = null;
    let redis = null;
    try {
        const { data: messages, error } = await primarySupabaseClient
            .from('ai_chat_messages')
            .select('role, content, created_at')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error || !messages) return;
        const total = messages.length;
        if (total < MEMORY_EVERY || total % MEMORY_EVERY !== 0) return;

        // One update at a time per chat (two messages saved at once could both reach this point).
        redis = (await import('../config/redis.js')).default;
        lockKey = `ai:memory:lock:${sessionId}`;
        const gotLock = await redis.set(lockKey, "1", "EX", 120, "NX").catch(() => "OK");
        if (!gotLock) return;

        const { data: session } = await primarySupabaseClient
            .from('ai_chat_sessions')
            .select('long_term_memory')
            .eq('id', sessionId)
            .single();
        const previous = session?.long_term_memory || "";
        // An older summary without the header covered everything up to the previous 8-message mark.
        const covered = previous ? (memoryCoverage(previous) ?? Math.max(0, total - MEMORY_EVERY)) : 0;
        const newMessages = messages.slice(Math.min(covered, total));
        if (newMessages.length === 0) return;

        const input = [
            `PREVIOUS MEMORY:\n${previous ? memoryText(previous) : "(empty)"}`,
            `NEW MESSAGES (${covered + 1} to ${total}):`,
            ...newMessages.map((m, i) => `[${covered + i + 1}] ${String(m.role).toUpperCase()}: ${plainMessageText(m.content).slice(0, MEMORY_MESSAGE_CHARS)}`)
        ].join("\n\n");

        console.log(`[Memory Agent] Updating memory for session ${sessionId} (messages ${covered + 1}-${total})...`);
        let summary = "";
        let usedModel = MEMORY_FLASH_MODEL;
        try {
            summary = await summarizeWithFlash(input);
        } catch (e) {
            console.warn(`[Memory Agent] DeepSeek V4 Flash failed, using Mistral Nemo: ${e.message}`);
        }
        if (!summary) {
            usedModel = "open-mistral-nemo";
            summary = await summarizeWithMistral(input);
        }
        if (!summary) throw new Error("empty summary");

        const { error: updateErr } = await primarySupabaseClient
            .from('ai_chat_sessions')
            .update({ long_term_memory: `[Summary of messages 1-${total}]\n${summary}` })
            .eq('id', sessionId);

        if (updateErr) {
            console.error("[Memory Agent] Error saving to DB:", updateErr);
        } else {
            console.log(`[Memory Agent] Successfully saved condensed memory for session ${sessionId} (1-${total}, ${usedModel})`);
        }
    } catch (error) {
        console.error("[Memory Agent] Failed:", error);
    } finally {
        if (redis && lockKey) redis.del(lockKey).catch(() => {});
    }
}

/**
 * Retrieves all non-incognito sessions for a user.
 */
export async function getSessions(userEmail) {
    // Only what the chat list needs (sidebar + search palette); the big columns (memory summary etc.) stay in the DB.
    const { data, error } = await primarySupabaseClient
        .from('ai_chat_sessions')
        .select('id, title, created_at, pinned')
        .eq('user_email', userEmail)
        .eq('is_incognito', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching AI chat sessions:", error);
        throw error;
    }

    return data;
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

    if (error) {
        console.error("Error updating AI chat session pinned status:", error);
        throw error;
    }
    return data;
}

/**
 * Retrieves a single session by ID.
 */
export async function getSessionById(sessionId) {
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
