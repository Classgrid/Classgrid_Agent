// One call's record (owner's design, 2026-11-09), read-only: what was said on the call, then what Classgrid AI did
// for it afterwards, run by run and step by step (tool, what went in, what came out, how long, what failed), its
// thinking, the models it used, the WhatsApp messages and emails it sent or read, and the project it made.
// There is no chat box here: the user can only read. The link sent on WhatsApp after a call opens this page.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, Clock, Copy, Check, Search, AlertTriangle, ChevronDown, ChevronRight, MessageSquare, Mail, FolderPlus, Folder,
  Brain, Wrench, Moon, Flag, Globe, Terminal, FileText, Sparkles, Users, BookOpen, CircleDot, Hourglass,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import {
  ACTIVE, ORIGIN, RUN_OUTCOME, RUN_REASON, SIDE_EFFECT_LABEL, STATUS, StatusBadge, between, dotClass, fmtClock, fmtDate, fmtDuration, fmtTime,
  helpersAndSkills, modelLabel, prettyJson, sideEffectOf, stepLabel, toneClass, toolsUsed,
  type CallRecord, type SentItem, type SideEffect, type TranscriptLine, type WorkRun, type WorkStep,
} from "./callsShared";
import { callsBasePath } from "./CallsPage";

type Tab = "transcript" | "work" | "details";
const TAB_KEY = "calls:tab";
const readTab = (): Tab => { try { const t = localStorage.getItem(TAB_KEY); return t === "work" || t === "details" ? t : "transcript"; } catch { return "transcript"; } };

const Eyebrow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground", className)}>{children}</p>
);

export const CallDetailPage: React.FC<{ id?: string }> = ({ id }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = `${callsBasePath(location.pathname)}/calls`;

  const [call, setCall] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>(readTab);
  const [copied, setCopied] = useState(false);

  const load = async (quiet = false) => {
    if (!id) return;
    try {
      const res = await api.get(`/api/calls/${id}`);
      if (res.data?.success) { setCall(res.data.call); setMissing(false); }
      else setMissing(true);
    } catch (e: any) {
      if (e?.response?.status === 404) setMissing(true);
      else if (!quiet) toast.error("The call could not be loaded");
    } finally {
      if (!quiet) setLoading(false);
    }
  };
  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  // While the call is live or the AI is working, the page refreshes itself (steps appear as they happen)
  const active = !!call && ACTIVE.includes(call.status);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => load(true), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, id]);

  const pickTab = (t: Tab) => { setTab(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* storage blocked */ } };

  const copyTranscript = async () => {
    if (!call) return;
    const text = call.transcript.map((l) => `[${fmtClock(l.at)}] ${l.who === "caller" ? "You" : "Classgrid AI"}${l.kind !== "speech" && l.kind !== "message" && l.kind !== "email" ? ` (${l.kind})` : ""}: ${l.text}`).join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { toast.error("Could not copy"); }
  };

  if (loading) return <DetailSkeleton />;
  if (missing || !call) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
        <BackLink onClick={() => navigate(backPath)} />
        <div className="mt-10 rounded-2xl border border-border/60 p-10 text-center">
          <p className="text-[15px] font-medium">This call was not found.</p>
          <p className="mt-1 text-sm text-muted-foreground">It may belong to another account, or the link is not complete.</p>
        </div>
      </div>
    );
  }

  const O = ORIGIN[call.origin] || ORIGIN.call;
  const OriginIcon = O.icon;
  const counts = call.work?.counts || {};
  const steps = call.work?.steps || [];
  const runs = call.work?.runs || [];
  const workMs = between(call.work?.started_at, call.work?.ended_at || (ACTIVE.includes(call.status) ? new Date() : call.work?.started_at));
  const showProblem = ["failed", "retrying", "stopped"].includes(call.status);

  return (
    <div className="mx-auto w-full max-w-4xl p-4 pb-20 sm:p-6 lg:p-8">
      <BackLink onClick={() => navigate(backPath)} />

      {/* ── Head ── */}
      <header className="mt-4 pb-6 border-b border-border/60">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <OriginIcon className="w-3.5 h-3.5" />
              <span>{O.label}</span>
              <span aria-hidden>·</span>
              <span>{fmtDate(call.started_at)}, {fmtTime(call.started_at)}</span>
              {call.duration_ms > 0 && (<><span aria-hidden>·</span><span>{fmtDuration(call.duration_ms)}</span></>)}
            </div>
            <h1 className="mt-2 text-[22px] sm:text-[26px] font-semibold tracking-[-0.01em] leading-tight break-words">{call.name || "Call"}</h1>
            {call.summary && <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed line-clamp-3">{call.summary}</p>}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={call.status} />
            {call.status === "sleeping" && call.wake_at && <span className="text-[11px] text-muted-foreground">continues {fmtDate(call.wake_at)}, {fmtTime(call.wake_at)}</span>}
          </div>
        </div>

        {/* Quick facts */}
        <div className="mt-5 flex flex-wrap gap-2">
          {call.project_name && (
            <Fact icon={call.project_made ? FolderPlus : Folder} label={call.project_made ? "Project made" : "Project"} value={call.project_name} />
          )}
          {(counts.steps || 0) > 0 && <Fact icon={Wrench} label="Steps" value={`${counts.steps}${counts.failed ? ` · ${counts.failed} failed` : ""}`} warn={!!counts.failed} />}
          {workMs > 0 && <Fact icon={Hourglass} label="Worked" value={fmtDuration(workMs)} />}
          {(counts.whatsapp_sent || 0) > 0 && <Fact icon={MessageSquare} label="WhatsApp sent" value={String(counts.whatsapp_sent)} />}
          {((counts.emails_read || 0) + (counts.emails_sent || 0)) > 0 && <Fact icon={Mail} label="Emails" value={`${counts.emails_read || 0} read · ${counts.emails_sent || 0} sent`} />}
          {(call.work?.models || []).length > 0 && <Fact icon={Sparkles} label="Model" value={call.work.models.map(modelLabel).join(", ")} />}
        </div>
      </header>

      {/* ── Problem banner ── */}
      {showProblem && (
        <div className={cn("mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px]",
          call.status === "stopped" ? "border-border/60 bg-muted/40" : "border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200")}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">{STATUS[call.status].help}</p>
            {call.error && <p className="mt-0.5 opacity-80 break-words">{call.error}</p>}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-muted/60 dark:bg-white/5 p-1 text-[13px]">
          {([["transcript", call.origin === "call" ? "Transcript" : "Message"], ["work", "What the AI did"], ["details", "Details"]] as Array<[Tab, string]>).map(([t, label]) => (
            <button
              key={t}
              onClick={() => pickTab(t)}
              className={cn("px-3.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer",
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
              {t === "work" && (counts.steps || 0) > 0 && <span className="ml-1.5 text-[11px] text-muted-foreground">{counts.steps}</span>}
            </button>
          ))}
        </div>
        {tab === "transcript" && call.transcript.length > 0 && (
          <button onClick={copyTranscript} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground cursor-pointer">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <div className="mt-5">
        {tab === "transcript" && <TranscriptTab call={call} />}
        {tab === "work" && <WorkTab call={call} runs={runs} steps={steps} />}
        {tab === "details" && <DetailsTab call={call} steps={steps} />}
      </div>
    </div>
  );
};

// ─── Transcript ────────────────────────────────────────────────

function TranscriptTab({ call }: { call: CallRecord }) {
  const [q, setQ] = useState("");
  const [hit, setHit] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);
  const needle = q.trim().toLowerCase();
  const hits = useMemo(() => call.transcript.map((l, i) => (needle && l.text.toLowerCase().includes(needle) ? i : -1)).filter((i) => i >= 0), [call.transcript, needle]);
  useEffect(() => { setHit(0); }, [needle]);
  useEffect(() => {
    const i = hits[hit];
    if (i != null) refs.current[i]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [hit, hits]);

  if (!call.transcript.length) {
    return (
      <Empty icon={Phone} title={call.status === "live" ? "The call is going on" : "Nothing was recorded on this call"}
        text={call.status === "live" ? "What is said shows up here as the call goes on." : "The call ended before anything was said."} />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 bg-muted/40 dark:bg-white/5 border border-border/60 rounded-xl px-3.5 py-2 focus-within:border-foreground/20 transition-colors">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text" data-no-ring="true" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in the transcript"
            onKeyDown={(e) => { if (e.key === "Enter" && hits.length) setHit((h) => (h + (e.shiftKey ? hits.length - 1 : 1)) % hits.length); }}
            className="flex-1 bg-transparent text-sm outline-none border-none focus:ring-0 focus-visible:ring-0 focus:outline-none placeholder:text-muted-foreground"
          />
          {needle && <span className="text-[11px] text-muted-foreground tabular-nums">{hits.length ? `${hit + 1}/${hits.length}` : "0"}</span>}
        </div>
        {needle && hits.length > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setHit((h) => (h + hits.length - 1) % hits.length)} className="p-1.5 rounded-md hover:bg-muted cursor-pointer" aria-label="Previous match"><ChevronDown className="w-4 h-4 rotate-180" /></button>
            <button onClick={() => setHit((h) => (h + 1) % hits.length)} className="p-1.5 rounded-md hover:bg-muted cursor-pointer" aria-label="Next match"><ChevronDown className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <ol className="relative">
        {call.transcript.map((l, i) => (
          <li key={i} ref={(el) => { refs.current[i] = el; }} className={cn("rounded-lg -mx-2 px-2", hits[hit] === i && "bg-amber-50 dark:bg-amber-500/10")}>
            <TranscriptRow line={l} needle={needle} origin={call.origin} />
          </li>
        ))}
      </ol>

      {call.live_works?.length > 0 && (
        <section className="mt-8">
          <Eyebrow>Done during the call</Eyebrow>
          <div className="mt-3 space-y-2">
            {call.live_works.map((w, i) => (
              <details key={i} className="group rounded-xl border border-border/60 open:bg-muted/20">
                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                  <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-[13px] truncate">{w.request}</span>
                  <span className="text-[11px] text-muted-foreground">{w.late ? "answered after the call" : fmtDuration(between(w.started_at, w.ended_at), { short: true })}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 text-[13px] whitespace-pre-wrap break-words text-foreground/90">{w.error ? <span className="text-red-600 dark:text-red-400">{w.error}</span> : w.answer || "No answer was kept."}</div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Highlight({ text, needle }: { text: string; needle: string }) {
  if (!needle) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let i = 0;
  const lower = text.toLowerCase();
  while (i < text.length) {
    const j = lower.indexOf(needle, i);
    if (j < 0) { parts.push(text.slice(i)); break; }
    parts.push(text.slice(i, j), <mark key={j} className="bg-amber-200/70 dark:bg-amber-400/30 rounded-sm px-0.5">{text.slice(j, j + needle.length)}</mark>);
    i = j + needle.length;
  }
  return <>{parts}</>;
}

function TranscriptRow({ line, needle, origin }: { line: TranscriptLine; needle: string; origin: CallRecord["origin"] }) {
  const isCaller = line.who === "caller";
  const isNote = line.kind === "task" || line.kind === "asked" || line.kind === "tool";
  if (isNote) {
    const label = line.kind === "task" ? "Saved a task" : line.kind === "asked" ? "Asked Classgrid" : `Used ${(line.tool || "a tool").replace(/_/g, " ")}`;
    const Icon = line.kind === "task" ? Flag : line.kind === "asked" ? Sparkles : Wrench;
    return (
      <div className="flex gap-3 py-2 pl-[52px]">
        <div className="flex-1 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-[12.5px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80"><Icon className="w-3.5 h-3.5" />{label}</span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-foreground/90 break-words"><Highlight text={line.text} needle={needle} /></span>
          {line.kind === "task" && line.args?.project_name && <span className="text-muted-foreground"> · in {line.args.project_name}</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 py-2.5">
      <span className="w-10 shrink-0 pt-[3px] font-mono text-[11px] tabular-nums text-muted-foreground/70 text-right">{origin === "call" ? fmtClock(line.at) : ""}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-[12px] font-semibold", isCaller ? "text-foreground" : "text-blue-700 dark:text-blue-300")}>{isCaller ? "You" : "Classgrid AI"}</span>
          {line.kind === "email" && <span className="text-[11px] text-muted-foreground">email</span>}
        </div>
        <p className="mt-0.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90"><Highlight text={line.text} needle={needle} /></p>
        {line.args?.file && <a href={line.args.file} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-blue-600 dark:text-blue-400 underline underline-offset-2"><FileText className="w-3 h-3" />{line.args.name || "File"}</a>}
      </div>
    </div>
  );
}

// ─── What the AI did ──────────────────────────────────────────

function WorkTab({ call, runs, steps }: { call: CallRecord; runs: WorkRun[]; steps: WorkStep[] }) {
  if (call.status === "answered") {
    return <Empty icon={Phone} title="Answered on the call" text="No task was saved, so there was no work after the call. The recap the AI sent is under Details." />;
  }
  if (!runs.length) {
    return (
      <Empty icon={ACTIVE.includes(call.status) ? Hourglass : CircleDot}
        title={call.status === "live" ? "The work starts when the call ends" : call.status === "queued" ? "Starting the work…" : "No work was recorded"}
        text={call.status === "live" || call.status === "queued" ? "Each step appears here as the AI does it." : "This record has no steps yet."}
        pulse={ACTIVE.includes(call.status)} />
    );
  }
  return (
    <div className="space-y-6">
      {call.tasks?.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <Eyebrow>{call.tasks.length === 1 ? "The task" : `${call.tasks.length} tasks, in order`}</Eyebrow>
          <ol className="mt-2 space-y-1.5">
            {call.tasks.map((t, i) => (
              <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed">
                {call.tasks.length > 1 && <span className="font-mono text-[11px] text-muted-foreground pt-1">{i + 1}.</span>}
                <span className="break-words">{t.text}{t.project_name ? <span className="text-muted-foreground"> · in {t.project_name}</span> : null}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {runs.map((run, i) => (
        <RunBlock key={run.no || i} run={run} steps={steps.filter((s) => (s.run || 1) === (run.no || i + 1))} live={ACTIVE.includes(call.status) && !run.ended_at} defaultOpen={i === runs.length - 1} />
      ))}
    </div>
  );
}

const GAP_MS = 20000; // a quiet stretch this long between two steps is shown as the AI thinking

function RunBlock({ run, steps, live, defaultOpen }: { run: WorkRun; steps: WorkStep[]; live: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const outcome = RUN_OUTCOME[live ? "" : run.outcome] ?? { label: "Running", tone: "blue" as const };
  const ms = between(run.started_at, run.ended_at || (live ? new Date() : run.started_at));
  const failedSteps = steps.filter((s) => s.status !== "ok").length;

  // Steps in time order, with the quiet stretches between them
  const rows = useMemo(() => {
    const out: Array<{ kind: "step"; step: WorkStep } | { kind: "gap"; ms: number }> = [];
    let prevEnd: number | null = new Date(run.started_at).getTime();
    for (const s of steps) {
      const at = new Date(s.at).getTime();
      if (prevEnd != null && at - prevEnd >= GAP_MS) out.push({ kind: "gap", ms: at - prevEnd });
      out.push({ kind: "step", step: s });
      prevEnd = s.ended_at ? new Date(s.ended_at).getTime() : at;
    }
    if (run.ended_at && prevEnd != null && new Date(run.ended_at).getTime() - prevEnd >= GAP_MS) out.push({ kind: "gap", ms: new Date(run.ended_at).getTime() - prevEnd });
    return out;
  }, [steps, run.started_at, run.ended_at]);

  return (
    <section className="rounded-2xl border border-border/60 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer">
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", open && "rotate-90")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold">Run {run.no}</span>
            <span className="text-[12px] text-muted-foreground">{RUN_REASON[run.reason] || run.reason || ""}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(run.started_at)}{run.ended_at ? ` – ${fmtTime(run.ended_at)}` : ""} · {fmtDuration(ms, { short: true })}</span>
            <span>{steps.length} step{steps.length === 1 ? "" : "s"}{failedSteps ? ` · ${failedSteps} failed` : ""}</span>
            {run.model && <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />{modelLabel(run.model)}</span>}
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap", toneClass[outcome.tone])}>
          <span className={cn("h-1.5 w-1.5 rounded-full", dotClass[outcome.tone], live && "animate-pulse")} />{outcome.label}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/60 px-4 py-4 space-y-4">
          {run.thought && <Thinking text={run.thought} />}

          {rows.length === 0 && (
            <p className="text-[13px] text-muted-foreground">{live ? "Working… the first step shows here when it finishes." : "This run used no tools."}</p>
          )}
          {rows.length > 0 && (
            <ol className="relative ml-2 border-l border-border/70 pl-5 space-y-1">
              {rows.map((r, i) => r.kind === "gap"
                ? <GapRow key={`g${i}`} ms={r.ms} />
                : <StepRow key={`${r.step.tool}-${r.step.at}-${i}`} step={r.step} />)}
              {live && (
                <li className="relative py-2 text-[13px] text-muted-foreground">
                  <span className="absolute -left-[25px] top-[13px] h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse ring-4 ring-background" />
                  Working…
                </li>
              )}
            </ol>
          )}

          {run.error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span className="break-words">{run.error}</span>
            </div>
          )}
          {run.answer && (
            <div>
              <Eyebrow>What it said at the end of this run</Eyebrow>
              <Clamp text={run.answer} className="mt-2 text-[14px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Thinking({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const clean = text.replace(/```[\s\S]*?(?:```|$)/g, "\n✏️ (drafted code)\n").trim();
  return (
    <div className="rounded-xl bg-muted/30 dark:bg-white/[0.03]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-[13px] cursor-pointer">
        <Brain className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">The AI's thinking</span>
        <span className="text-[11px] text-muted-foreground">· its own notes while working, not a full account</span>
        <ChevronDown className={cn("ml-auto w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-3.5 pb-3.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground max-h-[420px] overflow-y-auto chat-scrollbar">{clean}</div>}
    </div>
  );
}

const SIDE_ICON: Record<Exclude<SideEffect, null>, React.ComponentType<{ className?: string }>> = {
  whatsapp: MessageSquare, email_sent: Mail, email_read: Mail, project: FolderPlus, helpers: Users, skill: BookOpen, sleep: Moon, end: Flag, file: FileText, web: Globe, terminal: Terminal,
};

function StepRow({ step }: { step: WorkStep }) {
  const [open, setOpen] = useState(false);
  const bad = step.status !== "ok";
  const effect = sideEffectOf(step.tool);
  const ms = between(step.at, step.ended_at);
  const label = stepLabel(step);
  const Icon = effect ? SIDE_ICON[effect] : null;
  const argsText = prettyJson(step.args);
  return (
    <li className="relative">
      <span className={cn("absolute -left-[25px] top-[13px] h-2.5 w-2.5 rounded-full ring-4 ring-background", bad ? "bg-red-500" : effect === "sleep" ? "bg-violet-500" : "bg-emerald-500")} />
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-start gap-2.5 rounded-lg px-2 py-2 -ml-2 text-left hover:bg-muted/40 transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[13.5px] break-words", bad && "text-red-700 dark:text-red-300")}>{label}</span>
            {effect && Icon && (
              <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
                effect === "whatsapp" || effect === "email_sent" ? toneClass.green : effect === "sleep" ? toneClass.violet : "bg-muted text-muted-foreground")}>
                <Icon className="w-3 h-3" />{SIDE_EFFECT_LABEL[effect]}
              </span>
            )}
            {bad && <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-medium", toneClass.red)}>{step.status === "stopped" ? "Stopped" : "Failed"}</span>}
          </div>
          {!open && effect === "whatsapp" && step.args?.messageText && <p className="mt-0.5 text-[12.5px] text-muted-foreground line-clamp-2 break-words">“{String(step.args.messageText)}”</p>}
          {!open && bad && step.result && <p className="mt-0.5 text-[12.5px] text-red-700/80 dark:text-red-300/80 line-clamp-2 break-words">{step.result}</p>}
        </div>
        <span className="shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">{fmtTime(step.at)}{ms > 0 ? ` · ${fmtDuration(ms, { short: true })}` : ""}</span>
      </button>
      {open && (
        <div className="ml-0 mb-2 rounded-xl border border-border/60 bg-muted/20 text-[12.5px] divide-y divide-border/50">
          <div className="px-3.5 py-2.5 flex items-center gap-2 text-muted-foreground">
            <Wrench className="w-3.5 h-3.5" /><span className="font-mono text-[11.5px]">{step.tool}</span>
            <span className="ml-auto font-mono text-[11px]">{fmtTime(step.at)}{step.ended_at ? ` → ${fmtTime(step.ended_at)}` : ""}</span>
          </div>
          {argsText && argsText !== "{}" && (
            <div className="px-3.5 py-2.5">
              <Eyebrow>What went in</Eyebrow>
              <pre className="mt-1.5 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words max-h-[260px] overflow-y-auto chat-scrollbar text-foreground/85">{argsText}</pre>
            </div>
          )}
          <div className="px-3.5 py-2.5">
            <Eyebrow>What came out</Eyebrow>
            <pre className={cn("mt-1.5 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words max-h-[320px] overflow-y-auto chat-scrollbar", bad ? "text-red-700 dark:text-red-300" : "text-foreground/85")}>{step.result || "(nothing was returned)"}</pre>
          </div>
        </div>
      )}
    </li>
  );
}

function GapRow({ ms }: { ms: number }) {
  return (
    <li className="relative py-1.5 text-[11.5px] text-muted-foreground/80 italic">
      <span className="absolute -left-[22px] top-[11px] h-1.5 w-1.5 rounded-full bg-border ring-4 ring-background" />
      {fmtDuration(ms, { short: true })} of thinking, with no tool used
    </li>
  );
}

// ─── Details ──────────────────────────────────────────────────

function DetailsTab({ call, steps }: { call: CallRecord; steps: WorkStep[] }) {
  const tools = toolsUsed(steps);
  const { helpers, skills } = helpersAndSkills(steps);
  const sent = [...(call.sent || [])].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const workMs = between(call.work?.started_at, call.work?.ended_at);
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/60 divide-y divide-border/50 sm:grid sm:grid-cols-2 sm:divide-y-0 overflow-hidden">
        <Cell label="Status"><StatusBadge status={call.status} /></Cell>
        <Cell label={call.origin === "call" ? "Call" : "Started"}>{fmtDate(call.started_at)}, {fmtTime(call.started_at)}{call.duration_ms ? ` · ${fmtDuration(call.duration_ms)}` : ""}{call.ended_by ? <span className="text-muted-foreground"> · ended: {endedByLabel(call.ended_by)}</span> : null}</Cell>
        <Cell label="Work">{call.work?.started_at ? <>{fmtTime(call.work.started_at)}{call.work.ended_at ? ` – ${fmtTime(call.work.ended_at)}` : ""}{workMs > 0 ? ` · ${fmtDuration(workMs)}` : ""} · {call.work.runs?.length || 0} run{(call.work.runs?.length || 0) === 1 ? "" : "s"}</> : <span className="text-muted-foreground">none</span>}</Cell>
        <Cell label="Steps">{(call.work?.counts?.steps || 0)}{call.work?.counts?.failed ? <span className="text-red-600 dark:text-red-400"> · {call.work.counts.failed} failed</span> : null}</Cell>
        <Cell label="Models">{call.call_model && <span className="text-muted-foreground">On the call: {modelLabel(call.call_model)}</span>}{(call.work?.models || []).length ? <div className="mt-0.5">{call.work.models.map((m) => <span key={m} className="mr-1.5 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[12px]">{modelLabel(m)}</span>)}</div> : (!call.call_model && <span className="text-muted-foreground">—</span>)}</Cell>
        <Cell label="Project">{call.project_name ? <>{call.project_name}{call.project_made && <span className="text-muted-foreground"> · made for this call</span>}</> : <span className="text-muted-foreground">none</span>}</Cell>
        <Cell label="Helpers">{helpers.length ? helpers.join(", ") : <span className="text-muted-foreground">none used</span>}</Cell>
        <Cell label="Skills">{skills.length ? skills.join(", ") : <span className="text-muted-foreground">none used</span>}</Cell>
      </section>

      <section>
        <Eyebrow>Tools used</Eyebrow>
        {tools.length ? (
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {tools.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 text-[13px]">
                <span className="font-mono text-[12px] truncate">{t.name}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">×{t.count}{t.failed ? <span className="text-red-600 dark:text-red-400"> · {t.failed} failed</span> : null}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-[13px] text-muted-foreground">No tools were used.</p>}
      </section>

      <section>
        <Eyebrow>Sent to you</Eyebrow>
        {sent.length ? (
          <ol className="mt-3 space-y-2">
            {sent.map((s, i) => <SentRow key={i} item={s} />)}
          </ol>
        ) : <p className="mt-2 text-[13px] text-muted-foreground">Nothing was sent yet.</p>}
      </section>

      <section className="text-[11.5px] text-muted-foreground font-mono">
        <div>record {call._id}</div>
        {call.call_id && <div>call {call.call_id}</div>}
      </section>
    </div>
  );
}

function SentRow({ item }: { item: SentItem }) {
  const Icon = item.kind === "email" ? Mail : MessageSquare;
  return (
    <li className="flex gap-3 rounded-xl border border-border/60 px-3.5 py-2.5">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <span>{item.kind === "email" ? "Email" : "WhatsApp"} · {item.by === "agent" ? "by the AI" : "by Classgrid"}</span>
          {item.to && <span className="truncate">· to {item.to}</span>}
          <span className="ml-auto font-mono tabular-nums">{fmtDate(item.at)}, {fmtTime(item.at)}</span>
        </div>
        <Clamp text={item.text} lines={4} className="mt-1 text-[13px] whitespace-pre-wrap break-words text-foreground/90" />
      </div>
    </li>
  );
}

// ─── Small parts ──────────────────────────────────────────────

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
      <ArrowLeft className="w-4 h-4" /> Calls
    </button>
  );
}

function Fact({ icon: Icon, label, value, warn = false }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-[12px]", warn && "border-red-200 dark:border-red-500/30")}>
      <Icon className={cn("w-3.5 h-3.5", warn ? "text-red-500" : "text-muted-foreground")} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate max-w-[220px]">{value}</span>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-4 sm:border-b sm:border-border/50 sm:[&:nth-child(odd)]:border-r">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1.5 text-[14px] break-words">{children}</div>
    </div>
  );
}

function Clamp({ text, lines = 6, className = "" }: { text: string; lines?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 420 || text.split("\n").length > lines;
  return (
    <div>
      <p className={className} style={!open && long ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}>{text}</p>
      {long && <button onClick={() => setOpen((o) => !o)} className="mt-1 text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer">{open ? "Show less" : "Show all"}</button>}
    </div>
  );
}

function Empty({ icon: Icon, title, text, pulse = false }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; pulse?: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
      <div className={cn("mx-auto w-11 h-11 rounded-2xl bg-muted/60 dark:bg-white/5 flex items-center justify-center", pulse && "animate-pulse")}>
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <h3 className="mt-3 text-[14.5px] font-semibold">{title}</h3>
      <p className="mt-1 text-[13px] text-muted-foreground max-w-sm mx-auto">{text}</p>
    </div>
  );
}

function endedByLabel(why: string) {
  if (why === "remote") return "you hung up";
  if (/AI hung up/i.test(why)) return "the AI hung up";
  if (/limit/i.test(why)) return "15 minute limit";
  if (/connection/i.test(why)) return "the connection dropped";
  return why;
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-pulse p-4 sm:p-6 lg:p-8">
      <div className="h-4 w-16 rounded bg-muted" />
      <div className="mt-6 h-3 w-48 rounded bg-muted" />
      <div className="mt-3 h-7 w-2/3 rounded bg-muted" />
      <div className="mt-3 h-4 w-1/2 rounded bg-muted" />
      <div className="mt-6 flex gap-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 w-28 rounded-lg bg-muted" />)}</div>
      <div className="mt-8 h-9 w-72 rounded-lg bg-muted" />
      <div className="mt-6 space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-xl bg-muted" />)}</div>
    </div>
  );
}

export default CallDetailPage;
