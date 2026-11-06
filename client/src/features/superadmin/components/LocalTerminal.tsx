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

export type LocalTerm = { id: string; name: string; cwd: string; ended: boolean; project: string | null }; // project: the project folder it was opened for (null: none)
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
    printed.set(id, (printed.get(id) || 0) + data.length);
    writers.get(id)?.(data);
  });
  d.onTermExit(({ id }) => {
    const t = terms.find((x) => x.id === id);
    if (t) { t.ended = true; changed(); }
    writers.get(id)?.("\r\n[The terminal has ended]\r\n");
  });
}

// For the AI (sent with the user's next message in Studio): what each terminal printed since the last message, as
// plain text (no colours or cursor codes), at most the last 6,000 characters of each
const printed = new Map<string, number>(); // how much each terminal has printed in all
const sentUpTo = new Map<string, number>(); // ...and how much of it the AI has had
const plain = (s: string) => s
  .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "")
  .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "")
  .replace(/\x1b[()][A-Za-z0-9]|\x1b[=>78]/g, "")
  .replace(/\r\n/g, "\n")
  .replace(/[^\n]*\r(?!\n)/g, "")
  .replace(/\n{3,}/g, "\n\n");
export function newTerminalOutput(): string {
  const parts: string[] = [];
  const folder = openProjectFolder(); // only the open project's terminals (no project: those opened with no project)
  for (const t of terms.filter((x) => x.project === folder)) {
    const total = printed.get(t.id) || 0;
    const fresh = total - (sentUpTo.get(t.id) || 0);
    sentUpTo.set(t.id, total);
    if (fresh <= 0) continue;
    const text = plain((kept.get(t.id) || "").slice(-Math.min(fresh, MAX_KEPT))).trim().slice(-6000);
    if (text) parts.push(`[${t.name}${t.ended ? ", ended" : ""} in ${t.cwd}]\n${text}`);
  }
  return parts.join("\n\n");
}

export function useLocalTerminals() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => terms);
}
export const localShells = () => desktop()?.termShells().catch(() => []) ?? Promise.resolve([]);

// The open project's folder on this computer (null: no project, or one that isn't on this computer)
export function openProjectFolder(): string | null {
  try { return localFolderOf(sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open")) || null; } catch { return null; }
}

// A new terminal, starting in the open project's folder on this computer (else the home folder)
export async function openLocalTerminal(shell?: string): Promise<LocalTerm | null> {
  const d = desktop();
  if (!d) return null;
  wire();
  const cwd = openProjectFolder();
  const r = await d.termOpen({ shell, cwd, cols: 100, rows: 30 });
  const t: LocalTerm = { id: r.id, name: r.name, cwd: r.cwd, ended: false, project: cwd };
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
