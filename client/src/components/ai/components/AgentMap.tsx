// The helpers of a chat, in the chat box: "● 2 agents" while helpers work (also after the answer has ended, when they
// run in the background), and an Agent map with each helper: what it was asked, its steps, time and report.
import React from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { getSocket } from "@/lib/socketClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { cn } from "@/lib/utils";

type HelperStep = { tool: string; what: string; at: number; failed: boolean; result: string };
type Helper = { no: number; task: string; type: string | null; model: string | null; tokens?: number; canEdit: boolean; state: "running" | "done" | "failed"; startedAt: number | null; endedAt: number | null; steps: HelperStep[]; report: string; notes: string[] };

const toolName = (t: string) => t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const took = (h: Helper, now: number) => {
  if (!h.startedAt) return "";
  const s = Math.max(0, Math.round(((h.endedAt || now) - h.startedAt) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};
const tokensText = (n?: number) => (!n ? "" : n >= 1000 ? `${(n / 1000).toFixed(1)}k tokens` : `${n} tokens`);
const title = (h: Helper) => (h.task.split("\n")[0] || "").replace(/\s+/g, " ").trim().slice(0, 70) || `Helper ${h.no}`;
const stateText = (h: Helper) => (h.state === "running" ? "Working" : h.state === "done" ? "Finished" : "Failed");
const dot = (h: Helper) => (h.state === "running" ? "bg-green-500" : h.state === "done" ? "bg-muted-foreground/50" : "bg-red-500");

export function AgentMapButton({ sessionId, busy }: { sessionId: string | null | undefined; busy: boolean }) {
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
    const t = setInterval(() => { void load(); setNow(Date.now()); }, running || open ? 2500 : 4000);
    return () => clearInterval(t);
  }, [busy, running, open, load]);
  // The answer ended: helpers it started are now in the list
  React.useEffect(() => { if (!busy) void load(); }, [busy, load]);
  // The chat was woken because helpers finished
  React.useEffect(() => {
    const sock = getSocket();
    if (!sock) return;
    const on = (d: { sessionId?: string }) => { if (d?.sessionId === sessionId) void load(); };
    sock.on("chat:woke", on);
    return () => { sock.off("chat:woke", on); };
  }, [sessionId, load]);

  if (!helpers.length) return null;
  const helper = picked !== null ? helpers.find((h) => h.no === picked) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => { setPicked(null); setOpen(true); }}
        title={running ? `${running} helper${running > 1 ? "s" : ""} working` : "This chat's helpers"}
        className="h-8 shrink-0 rounded-full flex items-center gap-1.5 px-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer"
      >
        <span className={cn("size-2 rounded-full", running ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50")} />
        <span>{running ? running : helpers.length} {(running ? running : helpers.length) === 1 ? "agent" : "agents"}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto" overlayClassName="!bg-black/40">
          {!helper ? (
            <>
              <DialogHeader>
                <DialogTitle>Agent map</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {helpers.length} {helpers.length === 1 ? "helper" : "helpers"}{running ? ` · ${running} working` : ""} · click a helper for details
                </p>
              </DialogHeader>
              <div className="flex items-stretch gap-4 mt-2">
                <div className="shrink-0 self-center rounded-xl border border-border px-4 py-3">
                  <div className="text-sm font-semibold">Main agent</div>
                  <div className="text-xs text-muted-foreground">{busy ? "Answering" : "Waiting for its helpers"}</div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2 border-l border-border pl-4">
                  {helpers.map((h) => (
                    <button key={h.no} type="button" onClick={() => setPicked(h.no)} className="text-left rounded-xl border border-border px-3 py-2.5 hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("size-2 shrink-0 rounded-full", dot(h), h.state === "running" && "animate-pulse")} />
                        <span className="text-sm font-medium truncate">{title(h)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {stateText(h)} · {took(h, now)} · {h.steps.length} {h.steps.length === 1 ? "step" : "steps"}{h.tokens ? ` · ${tokensText(h.tokens)}` : ""}{h.model ? ` · ${h.model}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPicked(null)} aria-label="Back" className="flex items-center justify-center size-8 rounded-md hover:bg-muted"><ArrowLeft className="size-4" /></button>
                  <span className={cn("size-2 rounded-full", dot(helper), helper.state === "running" && "animate-pulse")} />
                  <DialogTitle className="truncate">{title(helper)}</DialogTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stateText(helper)}{helper.type ? ` · ${helper.type}` : ""}{helper.model ? ` · ${helper.model}` : ""} · {helper.canEdit ? "can edit" : "read only"} · background
                </p>
                <p className="text-sm text-muted-foreground">Started by the main agent · {took(helper, now)}{helper.tokens ? ` · ${tokensText(helper.tokens)}` : ""}</p>
              </DialogHeader>
              <details open className="mt-2">
                <summary className="flex items-center gap-1 text-sm font-medium cursor-pointer list-none"><ChevronDown className="size-4" /> Task</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-[13px] font-mono">{helper.task}</pre>
              </details>
              <details open className="mt-3">
                <summary className="flex items-center gap-1 text-sm font-medium cursor-pointer list-none"><ChevronDown className="size-4" /> Steps ({helper.steps.length})</summary>
                <div className="mt-2 flex flex-col gap-1.5">
                  {!helper.steps.length && <p className="text-sm text-muted-foreground">No steps yet.</p>}
                  {helper.steps.map((s, i) => (
                    <details key={i} className="text-sm min-w-0 rounded-lg border border-border">
                      <summary className="cursor-pointer list-none px-3 py-2 truncate">
                        <span className={cn("font-medium", s.failed && "text-red-500")}>{toolName(s.tool)}</span>
                        {s.what && <span className="text-muted-foreground"> {s.what}</span>}
                      </summary>
                      <div className="border-t border-border px-3 py-2 grid grid-cols-[2.5rem_1fr] gap-x-2 gap-y-1.5 font-mono text-[12.5px]">
                        <span className="text-muted-foreground">IN</span>
                        <span className="whitespace-pre-wrap break-words">{s.what || "(nothing)"}</span>
                        <span className="text-muted-foreground">OUT</span>
                        <span className={cn("whitespace-pre-wrap break-words", s.failed && "text-red-500")}>{s.result || (helper.state === "running" && i === helper.steps.length - 1 ? "Working…" : "(no output)")}</span>
                      </div>
                    </details>
                  ))}
                </div>
              </details>
              {(helper.report || helper.notes.length > 0) && (
                <details open className="mt-3">
                  <summary className="flex items-center gap-1 text-sm font-medium cursor-pointer list-none"><ChevronDown className="size-4" /> {helper.state === "running" ? "Notes to the main agent" : "Report"}</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-[13px]">{helper.report || helper.notes.join("\n")}</pre>
                </details>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
