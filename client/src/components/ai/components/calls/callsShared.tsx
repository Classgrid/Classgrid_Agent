// Shared bits of the Calls pages (the list and one call's record): the record's shape as the server sends it,
// status words and colours, time formatting, and what to call each step of the AI's work.
import React, { useEffect, useRef } from "react";
import { Phone, MessageCircle, Mail } from "lucide-react";
import { motion, useReducedMotion, type Transition, type Variants } from "framer-motion";
import gsap from "gsap";
import { describeStep } from "../stepper/tool-results/describeStep";

// ─── Motion (framer-motion for layout and enter/leave, GSAP for counting numbers) ───

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 36, mass: 0.8 };
export const SOFT: Transition = { duration: 0.32, ease: EASE };

// A list whose rows come in one after the other
export const listVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } } };
export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: SOFT },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
};
// A block that grows open and folds shut (height + fade)
export const foldVariants: Variants = {
  closed: { height: 0, opacity: 0, transition: { height: { duration: 0.26, ease: EASE }, opacity: { duration: 0.16 } } },
  open: { height: "auto", opacity: 1, transition: { height: { duration: 0.3, ease: EASE }, opacity: { duration: 0.24, delay: 0.06 } } },
};
// A page or tab panel coming in
export const panelVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease: EASE } },
};

// With "reduce motion" on, everything appears in place
export function useMotion() {
  const reduce = !!useReducedMotion();
  return { reduce, list: reduce ? undefined : listVariants, row: reduce ? undefined : rowVariants, panel: reduce ? undefined : panelVariants, fold: reduce ? undefined : foldVariants };
}

// A number that counts up to its value when it appears or changes (GSAP)
export function CountUp({ value, className = "", suffix = "" }: { value: number; className?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const shown = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) { shown.current = value; el.textContent = `${value}${suffix}`; return; }
    const o = { n: shown.current };
    const tween = gsap.to(o, { n: value, duration: 0.7, ease: "power2.out", onUpdate: () => { el.textContent = `${Math.round(o.n)}${suffix}`; } });
    shown.current = value;
    return () => { tween.kill(); };
  }, [value, suffix, reduce]);
  return <span ref={ref} className={cn("tabular-nums", className)}>{value}{suffix}</span>;
}

// A thing that pops in with a small spring (status dots, badges)
export const Pop = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const reduce = useReducedMotion();
  return (
    <motion.span className={className} initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...SPRING, delay }}>
      {children}
    </motion.span>
  );
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export type CallOrigin = "call" | "message" | "email";
export type CallStatus = "live" | "answered" | "queued" | "working" | "sleeping" | "waiting" | "paused" | "retrying" | "done" | "failed" | "stopped";

export interface CallCounts { steps?: number; failed?: number; whatsapp_sent?: number; emails_read?: number; emails_sent?: number }

export interface CallListItem {
  _id: string;
  origin: CallOrigin;
  name: string;
  summary: string;
  status: CallStatus;
  started_at: string;
  ended_at?: string | null;
  duration_ms: number;
  phone?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  project_made?: boolean;
  wake_at?: string | null;
  error?: string;
  tasks: number;
  counts: CallCounts;
  models: string[];
  work_started_at?: string | null;
  work_ended_at?: string | null;
}

export interface TranscriptLine { at: number; who: "caller" | "ai" | "classgrid"; kind: "speech" | "task" | "asked" | "tool" | "message" | "email"; text: string; tool?: string; args?: any }
export interface WorkStep { run: number; at: string; ended_at?: string | null; tool: string; title?: string; args?: any; result?: string; status: "ok" | "error" | "stopped" }
export interface WorkRun { no: number; started_at: string; ended_at?: string | null; reason: string; outcome: string; error?: string; model?: string; thought?: string; answer?: string; steps?: number }
export interface SentItem { at: string; kind: "whatsapp" | "email"; by: "agent" | "classgrid"; to?: string; text: string; ok?: boolean }

export interface CallRecord extends Omit<CallListItem, "tasks" | "counts" | "models"> {
  call_id?: string | null;
  ended_by?: string;
  call_model?: string;
  transcript: TranscriptLine[];
  tasks: { text: string; project_name?: string; coding?: boolean }[];
  live_works: { key?: string; session_id?: string; request: string; started_at?: string; ended_at?: string; answer?: string; error?: string; late?: boolean }[];
  session_id?: string | null;
  work: { started_at?: string | null; ended_at?: string | null; attempts: number; runs: WorkRun[]; steps: WorkStep[]; models: string[]; counts: CallCounts };
  sent: SentItem[];
}

// What the pages already loaded, kept while the app is open: going back to the list or into a call shows it at once
// and refreshes quietly (no loading bars the second time, owner 2026-11-09). The desktop app also keeps it on disk.
export const callsMemory = { list: null as CallListItem[] | null, calls: new Map<string, CallRecord>() };

// The states still changing (the pages refresh themselves while a call is in one of these)
export const ACTIVE: CallStatus[] = ["live", "queued", "working", "retrying"];

type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet";
export const STATUS: Record<CallStatus, { label: string; tone: Tone; pulse?: boolean; help: string }> = {
  live: { label: "On the call", tone: "green", pulse: true, help: "The call is going on right now." },
  answered: { label: "Answered on the call", tone: "neutral", help: "No task was saved: the questions were answered on the call." },
  queued: { label: "Starting", tone: "blue", pulse: true, help: "The call ended and the work is about to start." },
  working: { label: "Working", tone: "blue", pulse: true, help: "Classgrid AI is working on it now." },
  sleeping: { label: "Continues later", tone: "violet", help: "The AI paused on purpose and continues at the time it chose." },
  waiting: { label: "Waiting for you", tone: "amber", help: "The AI asked you something on WhatsApp and waits for your reply." },
  paused: { label: "Paused: no tokens", tone: "amber", help: "Your AI tokens ran out. It continues when they come back." },
  retrying: { label: "Failed, trying again", tone: "red", help: "The last run failed. It tries again in a few minutes." },
  done: { label: "Done", tone: "green", help: "The task is finished." },
  failed: { label: "Failed", tone: "red", help: "The AI gave up on this task." },
  stopped: { label: "Stopped", tone: "neutral", help: "The task was not finished in 48 hours and was stopped." },
};

export const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};
export const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60", blue: "bg-blue-500", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", violet: "bg-violet-500",
};

// "52 done" with a green dot, and "4 failed" with a red dot only when something failed (never one red number for
// all the steps, owner 2026-11-09)
export function StepCounts({ total, failed, className = "", word = "done" }: { total: number; failed: number; className?: string; word?: string }) {
  const ok = Math.max(0, total - failed);
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{ok} {word}</span>
      {failed > 0 && <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{failed} failed</span>}
    </span>
  );
}

// The badge swaps with a small fade when the status changes (live updates)
export function StatusBadge({ status, className = "" }: { status: CallStatus; className?: string }) {
  const s = STATUS[status] || STATUS.working;
  const reduce = useReducedMotion();
  return (
    <motion.span
      key={status}
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      title={s.help}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${toneClass[s.tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass[s.tone]} ${s.pulse ? "animate-pulse" : ""}`} />
      {s.label}
    </motion.span>
  );
}

export const ORIGIN: Record<CallOrigin, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  call: { label: "WhatsApp call", icon: Phone },
  message: { label: "WhatsApp message", icon: MessageCircle },
  email: { label: "Email to agent@classgrid.in", icon: Mail },
};

// ─── Time ─────────────────────────────────────────────────────

export function fmtDuration(ms: number | null | undefined, { short = false } = {}): string {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  if (s < 1) return short ? "<1s" : "under a second";
  if (s < 60) return short ? `${s}s` : `${s} sec`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return short ? `${m}m ${r}s` : `${m} min${r ? ` ${r} sec` : ""}`;
  const h = Math.floor(m / 60), rm = m % 60;
  return short ? `${h}h ${rm}m` : `${h} h${rm ? ` ${rm} min` : ""}`;
}

// 0:42, 12:05 (time since the call started)
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function fmtTime(d: string | Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// "Today", "Yesterday", or the date, for grouping the list
export function dayLabel(d: string | Date): string {
  const date = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(date); that.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });
}

export function between(a: string | Date | null | undefined, b: string | Date | null | undefined): number {
  if (!a || !b) return 0;
  return new Date(b).getTime() - new Date(a).getTime();
}

// ─── Models ───────────────────────────────────────────────────

const MODEL_NAMES: Array<[RegExp, string]> = [
  [/claude-fable-5-1/i, "Claude Fable 5.1"], [/claude-opus-5-5/i, "Claude Opus 5.5"], [/claude-sonnet-5-5/i, "Claude Sonnet 5.5"], [/claude-haiku-5-5/i, "Claude Haiku 5.5"],
  [/claude-opus/i, "Claude Opus"], [/claude-sonnet/i, "Claude Sonnet"], [/claude-haiku/i, "Claude Haiku"], [/claude/i, "Claude"],
  [/deepseek.*v4.*flash/i, "DeepSeek V4.1 Flash"], [/deepseek.*v4.*pro/i, "DeepSeek V4 Pro"], [/deepseek/i, "DeepSeek"],
  [/glm-4\.7-flash/i, "GLM-4.7 Flash"], [/glm/i, "GLM"], [/gpt-5/i, "GPT-5"], [/gpt-4/i, "GPT-4"], [/gemini/i, "Gemini"], [/llama/i, "Llama"], [/whisper/i, "Whisper"],
];
export function modelLabel(id: string | null | undefined): string {
  if (!id) return "";
  const hit = MODEL_NAMES.find(([re]) => re.test(id));
  if (hit) return hit[1];
  return id.split("/").pop()!.replace(/[-_]/g, " ");
}

// ─── Steps ────────────────────────────────────────────────────

export type SideEffect = "whatsapp" | "email_sent" | "email_read" | "project" | "helpers" | "skill" | "sleep" | "end" | "file" | "web" | "terminal" | null;

const humanize = (tool: string) => {
  const t = tool.replace(/^mcp__[^_]+__/, "").replace(/[_-]+/g, " ").trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : "Step";
};

export function stepLabel(step: WorkStep): string {
  try {
    const d = describeStep(step.tool, step.args, step.result, step.status === "ok" ? "success" : "error");
    if (d) return d;
  } catch { /* the describer didn't know this tool */ }
  if (step.title) return step.title;
  return humanize(step.tool);
}

export function sideEffectOf(tool: string): SideEffect {
  const t = tool.toLowerCase();
  if (/send_whatsapp_message/.test(t)) return "whatsapp";
  if (/^(send_email|gmail_send|send_gmail|outlook_send|send_outlook)/.test(t)) return "email_sent";
  if (/^(read_agent_email|gmail_|read_gmail|search_gmail|outlook_read|read_outlook|list_emails|read_email)/.test(t)) return "email_read";
  if (/(create|make)_project|project_create/.test(t)) return "project";
  if (/run_project_helpers|define_helper|message_helper|check_helpers|run_workflow/.test(t)) return "helpers";
  if (/^(read_skill|list_skills|create_skill)/.test(t)) return "skill";
  if (/^sleep_until/.test(t)) return "sleep";
  if (/^end_task/.test(t)) return "end";
  if (/write_file|edit_file|create_file|computer_write|computer_edit|save_file|upload/.test(t)) return "file";
  if (/web_search|search_web|open_page|browse|fetch_url/.test(t)) return "web";
  if (/terminal|run_command|shell|execute/.test(t)) return "terminal";
  return null;
}

export const SIDE_EFFECT_LABEL: Record<Exclude<SideEffect, null>, string> = {
  whatsapp: "WhatsApp sent", email_sent: "Email sent", email_read: "Email checked", project: "Project", helpers: "Helpers", skill: "Skill",
  sleep: "Paused on purpose", end: "Ended the task", file: "File", web: "Web", terminal: "Terminal",
};

export const RUN_REASON: Record<string, string> = {
  call: "after the call", restart: "after the server restarted", reply: "after your WhatsApp reply", time: "at the time it chose",
  tokens: "when your tokens came back", continue: "to finish what was left", email: "after your email", helpers: "after its helpers finished", retry: "trying again",
};

export const RUN_OUTCOME: Record<string, { label: string; tone: Tone }> = {
  answer: { label: "Answered", tone: "green" }, sleep: { label: "Paused on purpose", tone: "violet" }, quota: { label: "Tokens ran out", tone: "amber" },
  error: { label: "Failed", tone: "red" }, stopped: { label: "Stopped", tone: "neutral" }, "": { label: "Running", tone: "blue" },
};

// Names of helpers and skills the AI used, read from its steps
export function helpersAndSkills(steps: WorkStep[]) {
  const helpers = new Set<string>(), skills = new Set<string>();
  for (const s of steps) {
    const a = s.args || {};
    if (/run_project_helpers|define_helper/.test(s.tool)) {
      const list = Array.isArray(a.helpers) ? a.helpers : Array.isArray(a.tasks) ? a.tasks : a.name ? [a] : [];
      for (const h of list) { const n = typeof h === "string" ? h : h?.name || h?.task || h?.title; if (n) helpers.add(String(n).slice(0, 80)); }
    }
    if (/^read_skill|^create_skill/.test(s.tool) && (a.name || a.skill)) skills.add(String(a.name || a.skill));
  }
  return { helpers: [...helpers], skills: [...skills] };
}

export function toolsUsed(steps: WorkStep[]) {
  const map = new Map<string, { name: string; count: number; failed: number }>();
  for (const s of steps) {
    const e = map.get(s.tool) || { name: s.tool, count: 0, failed: 0 };
    e.count++;
    if (s.status !== "ok") e.failed++;
    map.set(s.tool, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

// The name a user sees for a tool (never the internal id, owner 2026-11-09)
const TOOL_NAMES: Array<[RegExp, string]> = [
  [/^google_workspace_connector/, "Google"], [/^microsoft_workspace_connector/, "Microsoft"], [/^github_workspace_connector/, "GitHub"],
  [/^slack_workspace_connector/, "Slack"], [/^notion_connector/, "Notion"], [/^zoom_connector/, "Zoom"], [/^vercel_connector/, "Vercel"],
  [/^supabase_connector/, "Supabase"], [/^sanity_connector/, "Sanity"], [/^youtube_connector/, "YouTube"], [/^facebook_connector/, "Facebook"],
  [/^instagram_connector/, "Instagram"], [/^whatsapp_business_connector/, "WhatsApp Business"], [/^aws_ses_connector/, "Email (AWS)"],
  [/^canva_connector/, "Canva"], [/^spotify_connector/, "Spotify"],
  [/^run_code/, "Run code"], [/^upload_sandbox_file_to_cdn|^upload_file|^cdn_upload/, "Upload file"], [/^parse_document/, "Read document"],
  [/^get_my_profile/, "My profile"], [/^send_whatsapp_message/, "WhatsApp message"], [/^read_whatsapp_messages/, "Read WhatsApp"],
  [/^wait_for_whatsapp_reply/, "Wait for WhatsApp reply"], [/^read_agent_email/, "Check email"], [/^send_email|^gmail_send|^send_gmail/, "Send email"],
  [/^web_search|^search_web/, "Web search"], [/^open_page|^browse|^fetch_url/, "Open web page"], [/^end_task/, "End task"], [/^sleep_until/, "Pause"],
  [/^create_presentation|^generate_pptx/, "Make presentation"], [/^generate_document|^create_document/, "Make document"],
  [/^run_project_helpers/, "Helpers"], [/^check_helpers/, "Check helpers"], [/^message_helper/, "Message a helper"], [/^define_helper/, "Define a helper"],
  [/^run_workflow/, "Workflow"], [/^read_skill|^list_skills|^create_skill/, "Skill"], [/^read_local_file/, "Read file on computer"],
  [/^computer_write|^computer_edit/, "Edit file on computer"], [/^run_local_command|^terminal/, "Terminal"], [/^analyze_image/, "Look at picture"],
  [/^query_database|^database/, "Database"], [/^knowledge_base|^search_knowledge/, "Knowledge base"], [/^generate_image|^create_image/, "Make picture"],
];
export function publicToolName(tool: string): string {
  const hit = TOOL_NAMES.find(([re]) => re.test(tool));
  if (hit) return hit[1];
  const t = tool.replace(/^mcp__[^_]+__/, "").replace(/_connector$/, "").replace(/[_-]+/g, " ").trim();
  const words = t ? t[0]!.toUpperCase() + t.slice(1) : "Step";
  return words.replace(/\bwhatsapp\b/gi, "WhatsApp").replace(/\bgithub\b/gi, "GitHub").replace(/\bcdn\b/gi, "CDN").replace(/\bai\b/gi, "AI").replace(/\burl\b/gi, "URL").replace(/\bpdf\b/gi, "PDF");
}

export function prettyJson(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
