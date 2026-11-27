// The chat list is ordered by last activity, like ChatGPT and Claude (owner, 2026-11-27: "when we open an old chat and
// type, it goes to the top of the chat list; in ours it stays as it is"). The server sends every chat's updated_at
// (its last message, else when it started) and the list newest activity first; the sidebar moves a chat to the top
// the moment a message is sent or an answer lands in it, without waiting for the next list.

export const CHAT_TOUCHED_EVENT = "agent:session-touched";

type Timed = { id: string; created_at: string; updated_at?: string };

/** When the chat last had a message (ms): its updated_at, else when it was started */
export function chatActivity(c: Timed): number {
  const t = Date.parse(c.updated_at || c.created_at);
  return Number.isFinite(t) ? t : 0;
}

/** Newest activity first (the input is not changed; equal times keep their order) */
export function byActivity<T extends Timed>(list: T[]): T[] {
  return [...list].sort((a, b) => chatActivity(b) - chatActivity(a));
}

/** The list with one chat's updated_at set to `at`, that chat first; a chat not in the list leaves it as it is */
export function touchInList<T extends Timed>(list: T[], id: string, at: number = Date.now()): T[] {
  const i = list.findIndex((s) => s.id === id);
  if (i === -1) return list;
  const touched = { ...list[i]!, updated_at: new Date(Math.max(at, chatActivity(list[i]!))).toISOString() };
  return [touched, ...list.slice(0, i), ...list.slice(i + 1)];
}

/** Tell the chat list that a chat just had a message (sent, answered, woken) */
export function touchChat(sessionId: string | null | undefined) {
  if (!sessionId) return;
  window.dispatchEvent(new CustomEvent(CHAT_TOUCHED_EVENT, { detail: { sessionId } }));
}
