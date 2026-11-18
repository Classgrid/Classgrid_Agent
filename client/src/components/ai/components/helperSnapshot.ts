// The open chat's helpers as the Agent map last read them (GET /api/ai/sessions/:id/helpers, AgentMap.tsx), shared with
// the helper cards in the chat (stepper/ProjectToolSteps.tsx ProjectHelpersStep), so a card started in the background
// shows the helper's real state, time and tokens after the answer that started it has ended (owner, 2026-11-18: "see
// how much better your helpers show in the chat", Claude Code's "Agent: ... · Working in the background" cards).
// Its own module: AgentMap imports the stepper, so the stepper can't import AgentMap.
import { useSyncExternalStore } from "react";

export type HelperSnap = {
  no: number;
  task: string;
  state: "running" | "done" | "failed";
  startedAt: number | null;
  endedAt: number | null;
  tokens?: number;
  steps?: unknown[];
  model?: string | null;
  switches?: { from: string; why: string }[];
};

let current: { sessionId: string | null; helpers: HelperSnap[] } = { sessionId: null, helpers: [] };
const listeners = new Set<() => void>();

/** The Agent map read the chat's helpers. */
export function publishHelpers(sessionId: string | null, helpers: HelperSnap[]) {
  current = { sessionId, helpers };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** The open chat's helpers, as last read. */
export function useHelperSnapshot() {
  return useSyncExternalStore(subscribe, () => current);
}

/** A helper card asks the Agent map to open that helper's details. */
export const OPEN_HELPER_EVENT = "cg:open-helper";
export function openHelper(no: number) {
  try { window.dispatchEvent(new CustomEvent(OPEN_HELPER_EVENT, { detail: no })); } catch { /* no window */ }
}
