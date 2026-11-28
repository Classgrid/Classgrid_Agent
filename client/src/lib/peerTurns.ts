// The chat screen's side of session-to-session messaging (desktop app, Classgrid Code, the editor extension), kept
// out of AskAiPanel.tsx so every case can be tested (server/tests/peer-turns.test.mjs). AskAiPanel gives it what it
// needs (deps) and calls onMessage / turnState / tick; this file decides what happens:
//   - a message or an answer from another session starts a turn here when nothing runs; while a turn runs it waits in
//     the host's inbox and starts the next turn when this one ends (pickUp)
//   - a "finished its turn" notice waits a moment for that session's answer, so the answer, not the notice, starts the
//     turn (owner, 2026-11-24: the notice came first and the work was done twice)
//   - when a turn a message started ends, its whole answer goes back to that session (tried again if it did not get
//     there), and only then is "idle" told
//   - every few seconds the screen tells the host its real state again and picks up anything left in the inbox, so a
//     state the host missed never holds messages for good (owner, 2026-11-28: the session stayed "busy" for good and
//     ten answers that had arrived were never shown)
//   - a message that cannot start a turn (the chat has ended) is not lost: the sender is told at once
// Only types are imported, so Node can load this file for the tests as it is.
import type { PeerMessage } from "./peerSessions";

export type PeerAnswer = { text: string; answeredItself: boolean } | null;
export type PeerTurnsDeps = {
  /** Starts a hidden turn with this text: true when it started, "busy" when a turn is starting or running on this
   *  screen right now (the message waits for it), false when no turn can start at all (the chat has ended). */
  ask: (prompt: string, m: PeerMessage) => boolean | "busy";
  /** The text a message starts its turn with (peerSessions.ts peerPrompt). */
  prompt: (m: PeerMessage) => string;
  /** Whether this screen is the one that handles messages (the last chat panel mounted in this page). */
  isActive: () => boolean;
  reportStatus: (status: "busy" | "idle", force?: boolean) => void;
  markRead: (ids: string[]) => void;
  inboxNow: () => Promise<PeerMessage[]>;
  sendAnswer: (target: string, text: string, replyTo: string) => Promise<boolean>;
  /** The answer this chat wrote to the message with that id, once its turn ended. */
  answerFor: (messageId: string) => PeerAnswer;
  onPending?: (count: number) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
  now?: () => number;
};

export const PEER_NOTICE_HOLD_MS = 5000;
export const PEER_ANSWER_FRESH_MS = 20000;
export const PEER_TICK_MS = 15000;
const ANSWER_RETRY_MS = [2000, 5000, 15000];
// an answer that still did not get there is tried again at every tick for this long (the other window may be reloading)
const ANSWER_KEEP_MS = 30 * 60 * 1000;
export const CHAT_ENDED_ANSWER = "This session's chat has ended, so it can't work on messages. Ask the person to open a new chat in that window, then send the message again.";

export function createPeerTurns(d: PeerTurnsDeps) {
  const setTimer = d.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = d.clearTimer ?? ((t: unknown) => clearTimeout(t as ReturnType<typeof setTimeout>));
  const now = d.now ?? (() => Date.now());
  const handled = new Set<string>();
  const answerAt = new Map<string, number>();
  const held = new Map<string, { timer: unknown; m: PeerMessage }>();
  let busy = false;
  // when a turn was asked for and its screen has not said "busy" yet (askQuestion starts a moment later): a second
  // message in that moment must wait, not start a second turn; a turn that never starts is given up after a while
  let startedAt = 0;
  const START_GIVE_UP_MS = 15000;
  let pending = 0;
  let turn: { sessionId: string; messageId: string } | null = null;
  // a finished turn whose answer has not gone back yet (it goes 300 ms after the turn ends, or at once if the screen closes)
  const undelivered: Array<{ sessionId: string; messageId: string; text: string; since: number }> = [];
  const answersDue = new Set<{ sessionId: string; messageId: string }>(); // (each its own: a quick next turn must not replace one)
  let picking = false;
  let disposed = false;
  const timers = new Set<unknown>();
  const later = (fn: () => void, ms: number) => {
    const t = setTimer(() => { timers.delete(t); if (!disposed) fn(); }, ms);
    timers.add(t);
    return t;
  };
  const setPending = (n: number) => { pending = n; d.onPending?.(n); };
  const handle = (id: string) => { handled.add(id); if (handled.size > 2000) handled.delete(handled.values().next().value as string); };

  // A message that starts a turn. False when no turn could start: the message stays unread for a later try, except a
  // message from a session (not a notice, not an answer), whose sender is told at once that this chat has ended.
  function start(m: PeerMessage): boolean {
    handle(m.id);
    const answersBack = !m.notice && !m.replyTo && !!m.from?.sessionId;
    turn = answersBack ? { sessionId: m.from.sessionId, messageId: m.id } : null;
    let result: boolean | "busy" = false;
    try { result = d.ask(d.prompt(m), m); } catch { result = false; }
    if (result === true) { busy = true; startedAt = now(); d.markRead([m.id]); return true; }
    turn = null;
    // (a turn of the person's is starting this very moment: the message stays unread and starts the next turn)
    if (result === "busy") { handled.delete(m.id); setPending(pending + 1); return false; }
    if (answersBack) {
      d.markRead([m.id]);
      // (tried again at every tick if it does not get there, like any answer)
      const u = { sessionId: m.from.sessionId, messageId: m.id, text: CHAT_ENDED_ANSWER, since: now() };
      void Promise.resolve(d.sendAnswer(u.sessionId, u.text, u.messageId)).catch(() => false).then((ok) => { if (!ok && !disposed) undelivered.push(u); });
    } else if (m.notice) {
      d.markRead([m.id]); // (a notice is of no use later)
    } else {
      // an answer stays unread: it is shown as soon as this screen can take a turn again (a new chat is opened)
      handled.delete(m.id);
    }
    return false;
  }

  function onMessage(m: PeerMessage) {
    if (disposed || !m || !d.isActive() || handled.has(m.id)) return;
    const sid = m.from?.sessionId || "";
    const dropNotice = (n: PeerMessage) => { handle(n.id); d.markRead([n.id]); };
    if (m.notice === "idle") {
      if (answerAt.has(sid) && now() - (answerAt.get(sid) || 0) < PEER_ANSWER_FRESH_MS) { dropNotice(m); return; }
      if (!busy) {
        const before = held.get(sid);
        if (before) { clearTimer(before.timer); timers.delete(before.timer); dropNotice(before.m); }
        const timer = later(() => {
          held.delete(sid);
          if (handled.has(m.id)) return;
          if (busy) { setPending(pending + 1); return; }
          start(m); // (no answer came: the notice itself is what there is to act on)
        }, PEER_NOTICE_HOLD_MS);
        held.set(sid, { timer, m });
        return;
      }
    } else if (!m.notice) {
      answerAt.set(sid, now());
      const h = held.get(sid);
      if (h) { clearTimer(h.timer); timers.delete(h.timer); held.delete(sid); dropNotice(h.m); }
    }
    // busy: it waits in the host's inbox and starts the next turn when this one ends (pickUp)
    if (busy) { setPending(pending + 1); return; }
    start(m);
  }

  // What is still in the host's inbox starts the next turn: an answer or a message before a "finished its turn" notice
  async function pickUp() {
    if (disposed || busy || picking || !d.isActive()) return;
    picking = true;
    try {
      const msgs = await d.inboxNow();
      if (disposed || busy || !d.isActive()) return;
      // (a notice already waiting for its session's answer is left to its own timer)
      const waiting = msgs.filter((x) => x && !handled.has(x.id) && !(x.notice && held.get(x.from?.sessionId || "")?.m.id === x.id));
      const m = waiting.find((x) => x.replyTo) || waiting.find((x) => !x.notice) || waiting[0];
      if (!m) return;
      if (!m.notice) {
        const sid = m.from?.sessionId || "";
        const same = waiting.filter((x) => x.notice === "idle" && x.from?.sessionId === sid);
        const h = held.get(sid);
        if (h) { clearTimer(h.timer); timers.delete(h.timer); held.delete(sid); same.push(h.m); }
        for (const n of same) handle(n.id);
        if (same.length) d.markRead(same.map((n) => n.id));
        answerAt.set(sid, now());
      }
      start(m);
    } catch { /* the host is gone */ } finally { picking = false; }
  }

  const tellIdle = () => { if (!disposed && !busy && d.isActive()) d.reportStatus("idle", true); };

  async function sendBack(asked: { sessionId: string; messageId: string }, final = false) {
    const answer = d.answerFor(asked.messageId);
    const text = String(answer?.text || "").trim();
    if (!text || answer?.answeredItself) { tellIdle(); return; }
    if (final) { try { await d.sendAnswer(asked.sessionId, text, asked.messageId); } catch { /* the host is gone */ } return; }
    let delivered = false;
    for (let i = 0; i <= ANSWER_RETRY_MS.length && !disposed; i++) {
      try { delivered = await d.sendAnswer(asked.sessionId, text, asked.messageId); } catch { delivered = false; }
      if (delivered) break;
      if (i < ANSWER_RETRY_MS.length) await new Promise<void>((r) => later(r, ANSWER_RETRY_MS[i] ?? 0));
    }
    if (!delivered && !disposed) undelivered.push({ ...asked, text, since: now() });
    tellIdle();
  }

  // A turn started (true) or ended (false: finished, failed or stopped)
  function turnState(submitting: boolean) {
    if (disposed) return;
    busy = submitting;
    startedAt = 0;
    if (!d.isActive()) return;
    if (submitting) { d.reportStatus("busy"); return; }
    setPending(0);
    const asked = turn;
    turn = null;
    // the answer goes back first, then "idle" (the "finished its turn" notice used to reach the other session before
    // the answer did); a turn nobody asked for says "idle" at once
    if (asked) {
      answersDue.add(asked);
      later(() => { if (answersDue.delete(asked)) void sendBack(asked); }, 300);
    }
    else d.reportStatus("idle", true);
    later(() => { void pickUp(); }, 400);
  }

  // Every PEER_TICK_MS: the real state again (the host may have missed it), and anything left in the inbox
  function tick() {
    if (disposed || !d.isActive()) return;
    if (busy && startedAt && now() - startedAt > START_GIVE_UP_MS) { busy = false; startedAt = 0; turn = null; }
    d.reportStatus(busy ? "busy" : "idle", true);
    if (!busy) void pickUp();
    void retryUndelivered();
  }

  async function retryUndelivered() {
    for (const u of undelivered.splice(0)) {
      if (now() - u.since > ANSWER_KEEP_MS) continue;
      let ok = false;
      try { ok = await d.sendAnswer(u.sessionId, u.text, u.messageId); } catch { ok = false; }
      if (!ok && !disposed) undelivered.push(u);
    }
  }

  function dispose() {
    // (a screen closed right after its turn ended: its answer still goes back, once)
    const due = [...answersDue];
    answersDue.clear();
    for (const a of due) void sendBack(a, true);
    disposed = true;
    for (const t of timers) clearTimer(t);
    timers.clear();
    held.clear();
  }

  return { onMessage, turnState, tick, pickUp, dispose, isBusy: () => busy, pendingCount: () => pending, currentTurn: () => turn };
}
