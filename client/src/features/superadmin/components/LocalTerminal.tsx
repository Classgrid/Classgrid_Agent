// The desktop app: the user's own terminals in Studio's Terminal tab (PowerShell, Git Bash or Command Prompt on this
// computer), next to the Agent terminal. The shells run in the app (desktop/terminal.js); what they printed is kept
// here too, so switching tabs and coming back shows it again.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { localFolderOf } from "../utils/localProject";

type Desktop = {
  termShells: () => Promise<{ id: string; name: string }[]>;
  termOpen: (o: { shell?: string; cwd?: string | null; cols?: number; rows?: number }) => Promise<{ id: string; name: string; cwd: string }>;
  termInput: (id: string, data: string) => void;
  termResize: (id: string, cols: number, rows: number) => void;
  termClose: (id: string) => void;
  onTermData: (cb: (m: { id: string; data: string }) => void) => () => void;
  onTermExit: (cb: (m: { id: string; code: number }) => void) => () => void;
};
const desktop = (): Desktop | null => {
  const d = typeof window !== "undefined" ? (window as any).classgridDesktop : null;
  return d?.termOpen ? d : null;
};
export const hasLocalTerminals = () => !!desktop();

export type LocalTerm = { id: string; name: string; cwd: string; ended: boolean };
const MAX_KEPT = 200_000;
let terms: LocalTerm[] = [];
const kept = new Map<string, string>(); // what each terminal printed (to show again after switching tabs)
const writers = new Map<string, (data: string) => void>();
const subs = new Set<() => void>();
const changed = () => { terms = [...terms]; subs.forEach((f) => f()); };
let wired = false;
function wire() {
  const d = desktop();
  if (!d || wired) return;
  wired = true;
  d.onTermData(({ id, data }) => {
    kept.set(id, ((kept.get(id) || "") + data).slice(-MAX_KEPT));
    writers.get(id)?.(data);
  });
  d.onTermExit(({ id }) => {
    const t = terms.find((x) => x.id === id);
    if (t) { t.ended = true; changed(); }
    writers.get(id)?.("\r\n[The terminal has ended]\r\n");
  });
}

export function useLocalTerminals() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => terms);
}
export const localShells = () => desktop()?.termShells().catch(() => []) ?? Promise.resolve([]);

// A new terminal, starting in the open project's folder on this computer (else the home folder)
export async function openLocalTerminal(shell?: string): Promise<LocalTerm | null> {
  const d = desktop();
  if (!d) return null;
  wire();
  let cwd: string | null = null;
  try { cwd = localFolderOf(sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open")); } catch { /* none */ }
  const r = await d.termOpen({ shell, cwd, cols: 100, rows: 30 });
  const t: LocalTerm = { id: r.id, name: r.name, cwd: r.cwd, ended: false };
  terms = [...terms, t];
  changed();
  return t;
}
export function closeLocalTerminal(id: string) {
  desktop()?.termClose(id);
  kept.delete(id);
  terms = terms.filter((t) => t.id !== id);
  changed();
}

export function LocalTerminalView({ term }: { term: LocalTerm }) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const d = desktop();
    const box = boxRef.current;
    if (!d || !box) return;
    const dark = document.documentElement.classList.contains("dark");
    const xterm = new Terminal({
      fontFamily: "Consolas, 'Cascadia Mono', 'Courier New', monospace",
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      theme: dark ? { background: "#1e1e1e", foreground: "#cccccc", cursor: "#cccccc" } : { background: "#ffffff", foreground: "#1e1e1e", cursor: "#1e1e1e", selectionBackground: "#add6ff" },
    });
    const fit = new FitAddon();
    xterm.loadAddon(fit);
    xterm.open(box);
    const sizeUp = () => { try { fit.fit(); d.termResize(term.id, xterm.cols, xterm.rows); } catch { /* hidden */ } };
    sizeUp();
    const before = kept.get(term.id);
    if (before) xterm.write(before);
    writers.set(term.id, (data) => xterm.write(data));
    const typed = xterm.onData((data) => d.termInput(term.id, data));
    const watch = new ResizeObserver(() => sizeUp());
    watch.observe(box);
    xterm.focus();
    return () => {
      watch.disconnect();
      typed.dispose();
      if (writers.get(term.id)) writers.delete(term.id);
      xterm.dispose();
    };
  }, [term.id]);
  return <div ref={boxRef} className="flex-1 min-h-0 px-2 pt-2 bg-white dark:bg-[#1e1e1e]" />;
}
