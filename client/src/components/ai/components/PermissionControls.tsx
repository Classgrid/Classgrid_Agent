// The agent's permission mode (the shield in the chat box, Studio and Project Mode) and the card that asks the user
// before a command, a push or a browser action runs. The agent waits for the answer.
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleHelp, ShieldCheck, ShieldEllipsis, ShieldAlert, Shield, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/marketing_ui/dropdown-menu";
import { fetchWithRescue } from "@/lib/rescue";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const EASE = [0.22, 1, 0.36, 1] as const;

export type PermissionMode = "review" | "default" | "auto" | "turbo";
export const PERMISSION_MODE_KEY = "cg_permission_mode";
export const readPermissionMode = (): PermissionMode => {
  try {
    const v = localStorage.getItem(PERMISSION_MODE_KEY);
    return v === "review" || v === "default" || v === "auto" || v === "turbo" ? v : "default";
  } catch { return "default"; }
};

const MODES: { id: PermissionMode; name: string; text: string; Icon: typeof Shield }[] = [
  { id: "review", name: "Request Review", text: "Every command asks you first.", Icon: ShieldEllipsis },
  { id: "default", name: "Default", text: "Asks before sensitive actions.", Icon: ShieldCheck },
  { id: "auto", name: "Auto", text: "Asks only before destructive actions.", Icon: Shield },
  { id: "turbo", name: "Turbo", text: "Runs everything without asking.", Icon: ShieldAlert },
];

const card = "z-[100] bg-white dark:bg-[#202020] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-2xl";

export function PermissionModePicker({ value, onChange }: { value: PermissionMode; onChange: (m: PermissionMode) => void }) {
  const current = MODES.find((m) => m.id === value) || MODES[1]!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer @max-[40rem]:hidden"
          title={`Permissions: ${current.name}`}
          aria-label={`Permissions: ${current.name}`}
        >
          <current.Icon className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" sideOffset={8} className={`w-[300px] ${card}`}>
        {MODES.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => onChange(m.id)}
            className="flex items-start gap-3 py-2 px-3 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a2a2a] focus:bg-slate-100 dark:focus:bg-[#2a2a2a]"
          >
            <m.Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 min-w-0">
              <span className="block text-[13.5px] text-foreground">{m.name}</span>
              <span className="block text-[12px] text-muted-foreground">{m.text}</span>
            </span>
            {m.id === value && <Check className="mt-0.5 size-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type PermissionRequest = { id: string; tool: string; title: string; detail?: string; label?: string };

// The card above the chat box: 1 allow once, 2 always in this chat, 3 always, 4 no (with what to do instead)
export function PermissionCard({ request, onDone }: { request: PermissionRequest; onDone: () => void }) {
  const reduce = useReducedMotion();
  const [choice, setChoice] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);
  const label = request.label || "this";

  // The card hides at once on an answer; it comes back only if the answer could not be sent
  const send = async (decision: "once" | "chat" | "always" | "no" | "skip") => {
    if (busy) return;
    setBusy(true);
    setHidden(true);
    try {
      const res = await fetchWithRescue(`${backendUrl}/api/ai/permission/${request.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: decision === "no" ? note : "" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Could not send your answer");
        setBusy(false);
        setHidden(false);
        return;
      }
      onDone();
    } catch {
      toast.error("Could not send your answer");
      setBusy(false);
      setHidden(false);
    }
  };
  const submit = () => send((["once", "chat", "always", "no"] as const)[choice]!);

  // Keys 1–4 pick, Enter sends, Esc skips (not while typing the note)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hidden) return;
      const typing = document.activeElement === noteRef.current;
      if (!typing && /^[1-4]$/.test(e.key)) { e.preventDefault(); setChoice(Number(e.key) - 1); if (e.key === "4") setTimeout(() => noteRef.current?.focus(), 0); }
      else if (e.key === "Enter" && !e.shiftKey && (typing || !(document.activeElement instanceof HTMLTextAreaElement || (document.activeElement as HTMLElement)?.isContentEditable))) { e.preventDefault(); submit(); }
      else if (e.key === "Escape" && !typing) { e.preventDefault(); send("skip"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const options = [
    "Yes, allow this time",
    `Yes, and always allow ${label} in this chat`,
    `Yes, and always allow ${label}`,
  ];
  const row = (on: boolean) => cn("w-full flex items-start gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors", on ? "bg-black/[0.06] dark:bg-white/[0.08] text-foreground" : "text-foreground/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]");
  const num = "mt-px shrink-0 flex items-center justify-center size-5 rounded bg-black/[0.06] dark:bg-white/[0.08] text-[11.5px] text-muted-foreground";

  if (hidden) return null;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
      className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-3 shadow-sm"
    >
      <div className="flex items-start gap-2.5">
        <CircleHelp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="flex-1 min-w-0 text-[14px] font-medium text-foreground">{request.title}</p>
        <button type="button" onClick={() => send("skip")} className="shrink-0 flex items-center justify-center size-6 rounded text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]" aria-label="Skip">
          <X className="size-4" />
        </button>
      </div>
      {request.detail && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/[0.04] dark:bg-black/40 px-3 py-2 font-mono text-[12.5px] text-foreground/90 [scrollbar-width:thin]">{request.detail}</pre>
      )}
      <div className="mt-2 flex flex-col gap-0.5">
        {options.map((text, k) => (
          <button key={k} type="button" onClick={() => setChoice(k)} onDoubleClick={() => send((["once", "chat", "always"] as const)[k]!)} className={row(choice === k)}>
            <span className={num}>{k + 1}</span>
            <span className="min-w-0 break-words">{text}</span>
          </button>
        ))}
        {/* 4 "No" with its note, and Skip / Submit on the same line */}
        <div className="flex items-center gap-2">
          <div className={cn(row(choice === 3), "flex-1 min-w-0 items-center")} onClick={() => { setChoice(3); noteRef.current?.focus(); }}>
            <span className={num}>4</span>
            <span className="shrink-0">No</span>
            <input
              ref={noteRef}
              data-no-ring
              value={note}
              onChange={(e) => { setNote(e.target.value); setChoice(3); }}
              onFocus={() => setChoice(3)}
              placeholder="(tell the agent what to do instead)"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button type="button" disabled={busy} onClick={() => send("skip")} className="shrink-0 h-8 px-3 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] disabled:opacity-50">Skip</button>
          <button type="button" disabled={busy} onClick={submit} className="shrink-0 h-8 px-3.5 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90 disabled:opacity-50">Submit ↵</button>
        </div>
      </div>
    </motion.div>
  );
}
