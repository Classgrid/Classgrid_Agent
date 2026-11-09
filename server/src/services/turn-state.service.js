// An answer's state in Redis while it runs (owner, 2026-11-09: a server restart in the middle of an answer must not
// end it). After every model round the running answer saves the model conversation so far (in the model's own
// format), its steps, thinking and usage under its turn id. When the server comes back and the app asks for the same
// answer again (POST /api/ai/ask with resumeTurn), the answer goes on from that round instead of starting over.
import redis from "../config/redis.js";

const KEY = (turnId) => `ai:turnstate:${turnId}`;
const KEEP_S = 2 * 3600;

export async function saveTurnState(turnId, state) {
    if (!turnId) return;
    try { await redis.set(KEY(turnId), JSON.stringify(state), "EX", KEEP_S); } catch (e) { console.warn("[turn state] not saved:", e.message); }
}

export async function loadTurnState(turnId) {
    if (!turnId) return null;
    try {
        const raw = await redis.get(KEY(turnId));
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

export async function clearTurnState(turnId) {
    if (!turnId) return;
    await redis.del(KEY(turnId)).catch(() => {});
}
