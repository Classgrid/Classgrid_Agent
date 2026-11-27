// The chat list is ordered by last activity, like ChatGPT and Claude (owner, 2026-11-27: "when we open an old chat
// and type, it goes to the top of the chat list; in ours it stays as it is, I need to scroll").
//
// When a chat last had a message is kept in the Redis hash ai:chatTouched:<email> (chatId -> ms), written by
// touchChat on every send, answer, woken answer and shared-chat message. Every chat list response carries it as
// updated_at (a chat never touched since that hash began falls back to its created_at) and is sorted newest first.
// Pins are the apps' business: they keep pinned chats on top of this order.

const ms = (v) => {
    const t = typeof v === "number" ? v : Date.parse(v);
    return Number.isFinite(t) ? t : 0;
};

/** updated_at of one chat: its last touch (when later than its start), else when it was started */
export function lastActivity(session, touched = {}) {
    const t = Number(touched?.[session?.id]);
    const created = ms(session?.created_at);
    if (Number.isFinite(t) && t > 0 && t >= created) return new Date(t).toISOString();
    return session?.created_at ?? null;
}

/** Each chat with updated_at set, newest activity first (equal times: newer chat first, then the higher id) */
export function byLastActivity(sessions, touched = {}) {
    return (sessions || [])
        .map((s) => ({ ...s, updated_at: lastActivity(s, touched) }))
        .sort((a, b) => ms(b.updated_at) - ms(a.updated_at) || ms(b.created_at) - ms(a.created_at) || String(b.id).localeCompare(String(a.id)));
}
