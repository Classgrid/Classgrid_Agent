// The helpers of a chat, in the chat box: "● 2 agents" while helpers work (also after the answer has ended, when they
// run in the background), and an Agent map with each helper. A helper opens with the same stepper as the main agent's
// replies: its thinking, each step it took (what it ran and what came back), "Worked for X" and its answer.
import React from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { getSocket } from "@/lib/socketClient";
import { Dialog, DialogContent, DialogTitle } from "@/components/marketing_ui/dialog";
import { cn } from "@/lib/utils";
import { ReplySteps } from "./stepper/ReplySteps";
import type { AgentStep } from "./AskAiPanel";

type Helper = {
  no: number; task: string; type: string | null; model: string | null; tokens?: number; canEdit: boolean;
  state: "running" | "done" | "failed"; startedAt: number | null; endedAt: number | null;
  thought?: string; steps: any[]; live?: string; report: string; notes: string[];
};

const took = (h: Helper, now: number) => {
  if (!h.startedAt) return "";
  const s = Math.max(0, Math.round(((h.endedAt || now) - h.startedAt) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};
const tokensText = (n?: number) => (!n ? "" : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M tokens` : n >= 1000 ? `${(n / 1000).toFixed(1)}k tokens` : `${n} tokens`);
const title = (h: Helper) => (h.task.split("\n")[0] || "").replace(/\s+/g, " ").trim().slice(0, 90) || `Helper ${h.no}`;
const stateText = (h: Helper) => (h.state === "running" ? "Working" : h.state === "done" ? "Finished" : "Failed");
// (a server from before the full steps sent { tool, what, result, failed })
const asSteps = (h: Helper): AgentStep[] =>
  (h.steps || []).map((s, i) => (s?.type === "tool" ? s : { id: `s${i}`, type: "tool", tool: String(s?.tool || ""), args: s?.what ? { url: s.what } : {}, result: s?.result || "", status: s?.failed ? "error" : "success" }));

// Green while working, grey when done, red when it failed (a hex green: the app's emerald and green classes are greys)
function Dot({ state }: { state: "running" | "done" | "failed" }) {
  return (
    <span className="relative flex size-2 shrink-0">
      {state === "running" && <span className="absolute inline-flex size-full rounded-full bg-[#22c55e] opacity-60 animate-ping" />}
      <span className={cn("relative inline-flex size-2 rounded-full", state === "running" ? "bg-[#22c55e]" : state === "failed" ? "bg-red-500" : "bg-muted-foreground/45")} />
    </span>
  );
}

// The detail box keeps showing the newest work while it comes in, unless the user scrolled up to read
function useFollow(dep: unknown) {
  const ref = React.useRef<HTMLDivElement>(null);
  const stick = React.useRef(true);
  React.useEffect(() => { const el = ref.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [dep]);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; };
  return { ref, onScroll };
}

function HelperDetail({ helper, now, onBack, renderAnswer }: { helper: Helper; now: number; onBack: () => void; renderAnswer?: (text: string, writing: boolean) => React.ReactNode }) {
  const [showTask, setShowTask] = React.useState(false);
  const running = helper.state === "running";
  const steps = asSteps(helper);
  const answer = running ? helper.live || "" : helper.report || "";
  const thinking = running && !answer && !steps.some((s) => s.status === "loading");
  const workedMs = helper.startedAt ? (helper.endedAt || now) - helper.startedAt : undefined;
  const follow = useFollow(`${steps.length}:${steps[steps.length - 1]?.status}:${(helper.thought || "").length}:${answer.length}`);
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-start gap-2 px-5 pt-4 pb-3 pr-12 border-b border-border/60">
        <button type="button" onClick={onBack} aria-label="Back" className="mt-0.5 flex items-center justify-center size-7 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"><ArrowLeft className="size-4" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <Dot state={helper.state} />
            <DialogTitle className="truncate text-[15px] font-semibold">{title(helper)}</DialogTitle>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {stateText(helper)}{helper.type ? ` · ${helper.type}` : ""}{helper.model ? ` · ${helper.model}` : ""} · {helper.canEdit ? "can edit" : "read only"} · background
          </p>
          <p className="text-[13px] text-muted-foreground">Started by the main agent · {took(helper, now)}{helper.tokens ? ` · ${tokensText(helper.tokens)}` : ""}</p>
        </div>
      </div>
      <div ref={follow.ref} onScroll={follow.onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <button type="button" onClick={() => setShowTask(!showTask)} className="mb-3 flex items-center gap-1.5 text-[14px] text-slate-500 dark:text-[#8a8a8a] hover:text-foreground">
          <ChevronRight className={cn("size-3.5 transition-transform duration-200", showTask && "rotate-90")} />
          <span className="font-medium">Task</span>
        </button>
        {showTask && <div className="mb-4 ml-5 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[13px] text-foreground/85">{helper.task}</div>}
        {(steps.length > 0 || !!helper.thought?.trim() || thinking) && (
          <div className="mb-4">
            <ReplySteps thought={helper.thought} steps={steps} live={running} thinking={thinking} workedMs={running ? undefined : workedMs} shineSteps={false} />
          </div>
        )}
        {answer.trim() && (renderAnswer ? renderAnswer(answer, running) : <div className="whitespace-pre-wrap text-[14px] text-foreground/90">{answer}</div>)}
        {helper.notes.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Notes to the main agent</div>
            <div className="flex flex-col gap-1.5">
              {helper.notes.map((n, i) => <div key={i} className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 px-3 py-2 text-[13px] text-foreground/85">{n}</div>)}
            </div>
          </div>
        )}
        {!running && !answer.trim() && !steps.length && <p className="text-[13px] text-muted-foreground">It didn't take any steps.</p>}
      </div>
    </div>
  );
}

export function AgentMapButton({ sessionId, busy, renderAnswer }: { sessionId: string | null | undefined; busy: boolean; renderAnswer?: (text: string, writing: boolean) => React.ReactNode }) {
  const [helpers, setHelpers] = React.useState<Helper[]>([]);
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(Date.now());
  const running = helpers.filter((h) => h.state === "running").length;

  const load = React.useCallback(async () => {
    if (!sessionId) { setHelpers([]); return; }
    try {
      const { data } = await apiClient.get(`/api/ai/sessions/${sessionId}/helpers`);
      setHelpers(Array.isArray(data?.helpers) ? data.helpers : []);
    } catch { /* keep what is shown */ }
  }, [sessionId]);

  // Load when the chat opens, while an answer runs (helpers may start), and every few seconds while any work
  React.useEffect(() => { setHelpers([]); setPicked(null); void load(); }, [load]);
  React.useEffect(() => {
    if (!busy && !running && !open) return;
    const t = setInterval(() => { void load(); setNow(Date.now()); }, running && open ? 1500 : running || open ? 2500 : 4000);
    return () => clearInterval(t);
  }, [busy, running, open, load]);
  // The answer ended: helpers it started are now in the list
  React.useEffect(() => { if (!busy) void load(); }, [busy, load]);
  // The chat was woken because helpers finished
  React.useEffect(() => {
    const sock = getSocket();
    if (!sock) return;
    // (not on each live "event" of the woken answer: only when it starts and ends)
    const on = (d: { sessionId?: string; phase?: string }) => { if (d?.sessionId === sessionId && d.phase !== "event") void load(); };
    sock.on("chat:woke", on);
    return () => { sock.off("chat:woke", on); };
  }, [sessionId, load]);

  if (!helpers.length) return null;
  const helper = picked !== null ? helpers.find((h) => h.no === picked) : null;
  const shown = running || helpers.length;
  const mainState = busy ? "Working" : running ? "Waiting for its helpers" : "Done";

  return (
    <>
      {/* (hidden when the chat box is narrow, so it never runs into the buttons on the left) */}
      <button
        type="button"
        onClick={() => { setPicked(null); setOpen(true); }}
        title={running ? `${running} helper${running > 1 ? "s" : ""} working` : "This chat's helpers"}
        className="h-8 shrink-0 rounded-full flex items-center gap-1.5 px-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer @max-[30rem]:hidden"
      >
        <Dot state={running ? "running" : "done"} />
        <span>{shown} {shown === 1 ? "agent" : "agents"}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn("p-0 gap-0 overflow-hidden flex flex-col sm:max-w-[760px]", helper ? "h-[85vh]" : "max-h-[85vh]")}
          overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-none"
        >
          {helper ? (
            <HelperDetail key={helper.no} helper={helper} now={now} onBack={() => setPicked(null)} renderAnswer={renderAnswer} />
          ) : (
            <div className="flex min-h-0 flex-col px-5 pt-4 pb-5">
              <DialogTitle className="text-[17px] font-semibold">Agent map</DialogTitle>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {helpers.length} {helpers.length === 1 ? "helper" : "helpers"}{running ? ` · ${running} working` : ""} · click a helper for details
              </p>
              <div className="mt-4 min-h-0 overflow-y-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
                <div className="shrink-0 rounded-xl border border-border bg-muted/30 px-4 py-3 sm:w-[200px]">
                  <div className="flex items-center gap-2">
                    <Dot state={busy ? "running" : "done"} />
                    <span className="text-sm font-semibold">Main agent</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{mainState}</div>
                </div>
                {/* The lines from the main agent to each helper */}
                <div className="hidden sm:block self-stretch w-6 relative">
                  <div className="absolute top-1/2 left-0 w-3 border-t border-border" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2 sm:border-l sm:border-border sm:pl-3">
                  {helpers.map((h) => (
                    <button key={h.no} type="button" onClick={() => setPicked(h.no)} className="group text-left rounded-xl border border-border px-3 py-2.5 hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <Dot state={h.state} />
                        <span className="text-sm font-medium truncate">{title(h)}</span>
                        <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </div>
                      <div className="ml-4 mt-0.5 text-xs text-muted-foreground truncate">
                        {stateText(h)} · {took(h, now)} · {asSteps(h).length} {asSteps(h).length === 1 ? "step" : "steps"}{h.tokens ? ` · ${tokensText(h.tokens)}` : ""}{h.model ? ` · ${h.model}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
