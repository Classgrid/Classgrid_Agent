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

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
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

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

/**
 * Server-side Native Socket.IO Broadcaster
 * 
 * REPLACES Supabase Realtime. Uses the Socket.IO instance from socket.service.js
 * to broadcast events directly to connected clients via WebSocket.
 * 
 * The function signature is IDENTICAL to the old Supabase version so all
 * existing route files (thread_chat, group_chat, org_chat, etc.) work
 * without any code changes.
 * 
 * Channel naming convention (unchanged):
 *   - "thread:{threadId}"  → thread chat room
 *   - "user:{userId}"      → user's personal sidebar channel
 *   - "comments:{id}"      → comment threads
 *   - "classroom:{id}"     → classroom chat
 */

let _socketModule = null;

// Lazy import to avoid circular dependency
async function getIO() {
  if (!_socketModule) {
    try {
      _socketModule = await import("./socket.service.js");
    } catch (err) {
      console.error("[Realtime] Failed to import socket.service.js:", err.message);
      return null;
    }
  }
  return _socketModule.getIO();
}
/**
 * Broadcast an event to a Socket.IO room (replaces Supabase channel broadcast).
 * 
 * @param {string} channelName - e.g. "thread:abc123", "user:xyz"
 * @param {string} event - e.g. "new_message", "thread_updated", "reaction_update"
 * @param {object} payload - the data to send
 */
export async function broadcastToChannel(channelName, event, payload) {
  try {
    const io = await getIO();
    if (!io) {
      console.warn(`[Realtime] Cannot broadcast — Socket.IO not initialized`);
      return;
    }

    // Emit to the Socket.IO room with event name prefixed by channel type
    // e.g. room "thread:abc" gets event "thread:new_message"
    io.to(channelName).emit(`${channelName.split(':')[0]}:${event}`, payload);
  } catch (err) {
    console.error(`[Realtime] Broadcast error on ${channelName}:`, err.message);
  }
}

/**
 * Broadcast a notification to a specific user.
 */
export async function broadcastNotification(userId, notification) {
  await broadcastToChannel(`user:${userId}`, "notification", notification);
}

export default { broadcastToChannel, broadcastNotification };
