// One helper as a row: "● Research context.dev guides" / "Working · 2m 50s · 33 steps · DeepSeek V4.1 Flash".
// The Agent map (AgentMap.tsx) lists helpers with it, and the chat shows the same rows where the main agent started
// them (stepper/ProjectToolSteps.tsx ProjectHelpersStep), so the chat never shows the raw "Started 1 helper(s)..."
// text meant for the AI (owner, 2026-11-18: "we already have this much good, then also you added that in chat").
// Its own module: AgentMap imports the stepper, so the stepper can't import AgentMap.
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HelperSnap } from "./helperSnapshot";

export const helperTook = (h: Pick<HelperSnap, "startedAt" | "endedAt">, now: number) => {
  if (!h.startedAt) return "";
  const s = Math.max(0, Math.round(((h.endedAt || now) - h.startedAt) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};
export const tokensText = (n?: number) => (!n ? "" : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M tokens` : n >= 1000 ? `${(n / 1000).toFixed(1)}k tokens` : `${n} tokens`);
export const helperTitle = (h: Pick<HelperSnap, "no" | "task" | "title">) => (h.title?.trim() || h.task.split("\n")[0] || "").replace(/\s+/g, " ").trim().slice(0, 90) || `Helper ${h.no}`;
// "Claude Opus 5.5 → GLM 5.3" when another model took over
export const modelText = (h: Pick<HelperSnap, "model" | "switches">) => [...(h.switches || []).map((x) => x.from), h.model].filter(Boolean).join(" → ");
export const stateText = (h: Pick<HelperSnap, "state">) => (h.state === "running" ? "Working" : h.state === "done" ? "Finished" : "Failed");

// Green while working, grey when done, red when it failed (a hex green: the app's emerald and green classes are greys)
export function Dot({ state }: { state: "running" | "done" | "failed" }) {
  return (
    <span className="relative flex size-2 shrink-0">
      {state === "running" && <span className="absolute inline-flex size-full rounded-full bg-[#22c55e] opacity-60 animate-ping" />}
      <span className={cn("relative inline-flex size-2 rounded-full", state === "running" ? "bg-[#22c55e]" : state === "failed" ? "bg-red-500" : "bg-muted-foreground/45")} />
    </span>
  );
}

export function HelperRow({ helper, now, onClick, className }: { helper: HelperSnap; now: number; onClick: () => void; className?: string }) {
  const steps = (helper.steps || []).length;
  return (
    <button type="button" onClick={onClick} className={cn("group w-full text-left rounded-xl border border-border px-3 py-2.5 hover:bg-muted/60 transition-colors", className)}>
      <div className="flex items-center gap-2 min-w-0">
        <Dot state={helper.state} />
        <span className="text-sm font-medium truncate">{helperTitle(helper)}</span>
        <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </div>
      <div className="ml-4 mt-0.5 text-xs text-muted-foreground truncate">
        {stateText(helper)} · {helperTook(helper, now)} · {steps} {steps === 1 ? "step" : "steps"}{helper.tokens ? ` · ${tokensText(helper.tokens)}` : ""}{helper.model ? ` · ${modelText(helper)}` : ""}
      </div>
    </button>
  );
}
