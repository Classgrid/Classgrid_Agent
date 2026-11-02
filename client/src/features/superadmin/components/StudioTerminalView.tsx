// Studio Mode's Terminal tab: the commands the agent runs in this project and what they printed, live.
// The list lives in the Studio page (useAgentTerminal), so switching tabs keeps it.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { closeLocalTerminal, hasLocalTerminals, localShells, LocalTerminalView, openLocalTerminal, useLocalTerminals } from "./LocalTerminal";

const EASE = [0.22, 1, 0.36, 1] as const;
const TERMINAL_TOOLS = new Set(["execute_terminal_command", "run_code", "start_background_command", "check_background_command", "stop_background_command"]);
const MAX_ENTRIES = 200;
const MAX_OUTPUT = 20_000;

export type TerminalEntry = { id: string; tool: string; command: string; output: string; status: "running" | "done" | "error" };

function commandText(tool: string, args: any): string {
  if (args?.command) return String(args.command);
  if (tool === "run_code") {
    const first = String(args?.code || "").split("\n").find((l) => l.trim()) || "";
    return `${args?.language || "code"} › ${first.slice(0, 160)}`;
  }
  if (tool === "check_background_command") return `check ${args?.job_id || args?.id || "background job"}`;
  if (tool === "stop_background_command") return `stop ${args?.job_id || args?.id || "background job"}`;
  return tool;
}

export function useAgentTerminal() {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const pending = useRef<Record<string, string[]>>({});
  useEffect(() => {
    const onTool = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!TERMINAL_TOOLS.has(d.tool)) return;
      if (d.phase === "start") {
        const id = `${d.tool}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        (pending.current[d.tool] ||= []).push(id);
        setEntries((list) => [...list, { id, tool: d.tool, command: commandText(d.tool, d.args), output: "", status: "running" as const }].slice(-MAX_ENTRIES));
        return;
      }
      const id = (pending.current[d.tool] || []).shift();
      const out = typeof d.result === "string" ? d.result : d.result == null ? "" : JSON.stringify(d.result, null, 2);
      const status = /^\s*error/i.test(out) ? "error" as const : "done" as const;
      setEntries((list) => {
        if (id && list.some((x) => x.id === id)) return list.map((x) => (x.id === id ? { ...x, output: out.slice(0, MAX_OUTPUT), status } : x));
        return [...list, { id: `${d.tool}-${Date.now()}`, tool: d.tool, command: commandText(d.tool, d.args), output: out.slice(0, MAX_OUTPUT), status }].slice(-MAX_ENTRIES);
      });
    };
    window.addEventListener("agent:tool", onTool);
    return () => window.removeEventListener("agent:tool", onTool);
  }, []);
  return { entries, clear: () => setEntries([]) };
}

export function StudioTerminalView({ entries, onClear }: { entries: TerminalEntry[]; onClear: () => void }) {
  const reduce = useReducedMotion();
  // The desktop app: the user's own terminals next to the Agent terminal ("agent" = the agent's commands)
  const mine = useLocalTerminals();
  const [shown, setShown] = useState<string>("agent");
  const [shells, setShells] = useState<{ id: string; name: string }[]>([]);
  const [picking, setPicking] = useState(false);
  useEffect(() => { if (hasLocalTerminals()) void localShells().then(setShells); }, []);
  const newTerminal = async (shell?: string) => {
    setPicking(false);
    const t = await openLocalTerminal(shell);
    if (t) setShown(t.id);
  };
  const shownTerm = mine.find((t) => t.id === shown) || null;
  const boxRef = useRef<HTMLDivElement>(null);
  // Follow the newest output, unless the user scrolled up to read
  const stick = useRef(true);
  useEffect(() => {
    const el = boxRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-[#1e1e1e]">
      {hasLocalTerminals() && (
        <div className="shrink-0 flex items-center gap-1 h-9 px-2 border-b border-border overflow-x-auto">
          <button onClick={() => setShown("agent")} className={`h-7 px-2.5 rounded-md text-[12px] whitespace-nowrap transition-colors ${!shownTerm ? "bg-black/[0.06] dark:bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Agent</button>
          {mine.map((t, i) => (
            <span key={t.id} className={`group flex items-center h-7 rounded-md text-[12px] whitespace-nowrap ${shownTerm?.id === t.id ? "bg-black/[0.06] dark:bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <button onClick={() => setShown(t.id)} className="h-7 pl-2.5 pr-1">{t.name} {i + 1}{t.ended ? " (ended)" : ""}</button>
              <button onClick={() => { closeLocalTerminal(t.id); if (shown === t.id) setShown("agent"); }} aria-label={`Close ${t.name} ${i + 1}`} className="flex items-center justify-center size-5 mr-1 rounded hover:bg-black/[0.08] dark:hover:bg-white/[0.1]"><X className="size-3" /></button>
            </span>
          ))}
          <div className="relative">
            <button onClick={() => (shells.length > 1 ? setPicking((v) => !v) : void newTerminal())} title="New terminal" aria-label="New terminal" className="flex items-center gap-1 h-7 px-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]">
              <Plus className="size-3.5" /> New terminal
            </button>
            {picking && (
              <div className="absolute left-0 top-8 z-20 min-w-[170px] rounded-lg border border-border bg-white dark:bg-[#252526] p-1 shadow-lg">
                {shells.map((sh) => (
                  <button key={sh.id} onClick={() => void newTerminal(sh.id)} className="w-full text-left h-8 px-2.5 rounded-md text-[13px] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]">{sh.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {shownTerm ? <LocalTerminalView key={shownTerm.id} term={shownTerm} /> : (<>
      <div className="shrink-0 flex items-center gap-2 h-9 px-3 border-b border-border">
        <span className="text-[12px] text-muted-foreground">Agent terminal</span>
        {entries.some((x) => x.status === "running") && (
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full rounded-full bg-sky-400 opacity-75 animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-sky-400" />
            </span>
            Running
          </span>
        )}
        {entries.length > 0 && (
          <button onClick={onClear} className="ml-auto h-6 px-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors">
            Clear
          </button>
        )}
      </div>
      <div
        ref={boxRef}
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}
        className="flex-1 min-h-0 overflow-auto p-3 font-mono text-[12.5px] leading-[1.6]"
      >
        {!entries.length ? (
          <p className="text-muted-foreground">Commands run by the agent in this chat appear here.</p>
        ) : (
          <AnimatePresence initial={false}>
            {entries.map((x) => (
              <motion.div
                key={x.id}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
                className="mb-3"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[#16825d] dark:text-[#4ec9b0] select-none">$</span>
                  <span className="flex-1 min-w-0 whitespace-pre-wrap break-words text-foreground">{x.command}</span>
                  {x.status === "running" && <span className="mt-1 size-3 shrink-0 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />}
                </div>
                {x.output && (
                  <pre className={`mt-1 pl-4 whitespace-pre-wrap break-words ${x.status === "error" ? "text-[#cd3131] dark:text-[#f48771]" : "text-foreground/70"}`}>{x.output}</pre>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      </>)}
    </div>
  );
}
