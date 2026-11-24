// "Run in background" on a command the AI is waiting for (owner, 2026-11-24, with a recording of another app: "also
// build it like yours, instead of showing Waiting for output"). Desktop app, Classgrid Code and the extension: a
// command on this computer that is still running shows "Run in background" in its box. Pressed, the command is not
// stopped: it goes on as a background job, the AI gets what it printed so far and goes on with its work, and it is
// woken with the result when the command ends (desktop/runner.js backgroundCommand; the same job a command becomes
// by itself after its waiting time).
//
// The chat screen notes each command step it hands to this computer while it runs (the step's own id on the answer's
// stream); the command's box finds its id here by the command's text.
import { useSyncExternalStore } from "react";
import { runningCommandFor } from "./followUpParts";

const COMMAND_TOOLS = new Set(["execute_terminal_command", "run_code", "computer_terminal"]);
type Running = { id: string; command: string };
let running: Running[] = [];
const listeners = new Set<() => void>();
const changed = () => { for (const l of listeners) l(); };
const textOf = (args: any): string => String(args?.command ?? args?.code ?? "").trim();

/** A command step starts on this computer */
export function commandStarted(id: string, tool: string, args: any): void {
  if (!id || !COMMAND_TOOLS.has(tool) || running.some((r) => r.id === id)) return;
  running = [...running, { id, command: textOf(args) }];
  changed();
}

/** Its reply came back (finished, moved to the background, or failed) */
export function commandEnded(id: string): void {
  if (!running.some((r) => r.id === id)) return;
  running = running.filter((r) => r.id !== id);
  changed();
}

/** This app can move a running command to the background */
export const canBackgroundCommands = (): boolean => typeof (window as any)?.classgridDesktop?.backgroundCommand === "function";

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => running;

/** The id of the running command with this text, or null (not running here, or this app cannot move it) */
export function useRunningCommandId(command: string, active: boolean): string | null {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (!active || !canBackgroundCommands()) return null;
  return runningCommandFor(list, command);
}

/** Moves it to the background. False: it had already ended. */
export async function runInBackground(id: string): Promise<boolean> {
  try { return (await (window as any).classgridDesktop.backgroundCommand(id)) === true; } catch { return false; }
}
