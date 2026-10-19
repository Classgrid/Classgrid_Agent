/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
import { useMemo, useState } from "react";
import { BookOpen, Brain, ChevronRight, GitBranch, Lightbulb, MessageCircle, PencilRuler, CalendarCheck } from "lucide-react";
import { iconFor } from "./PointsBlocks";

// Study and school-data blocks for the chat:
// ```followups (clickable next questions), ```actions (cards with a button), ```reportcard (marks + grades),
// ```timetable (weekly grid), ```attendance (month calendar) and ```planner (day-by-day study plan).

const TEXT = "text-[#2C2C2B] dark:text-[#F0EFED]";
const MUTED = "text-[#6B6B69] dark:text-[#A6A6A3]";
const BOX = "my-4 rounded-2xl border border-black/10 dark:border-white/10";

// ── Follow-up questions ─────────────────────────────────────

export type FollowUpsData = { title?: string; questions?: (string | { icon?: string; text?: string })[] };

// An icon that matches what the question asks for, when the AI didn't name one
function guessIcon(text: string) {
  const t = text.toLowerCase();
  if (/mcq|quiz|practice|test me|question/.test(t)) return Brain;
  if (/diagram|flowchart|flow chart|mind map/.test(t)) return GitBranch;
  if (/step by step|draw|how to/.test(t)) return PencilRuler;
  if (/example/.test(t)) return Lightbulb;
  if (/remind|schedule|plan|timetable/.test(t)) return CalendarCheck;
  if (/explain|what|why|meaning|simple/.test(t)) return BookOpen;
  return MessageCircle;
}

export function FollowUps({ data, onAsk }: { data: FollowUpsData; onAsk?: (text: string) => void }) {
  const items = (Array.isArray(data.questions) ? data.questions : [])
    .map((q) => (typeof q === "string" ? { text: q } : q))
    .filter((q): q is { icon?: string; text: string } => !!q && typeof q.text === "string" && q.text.trim() !== "")
    .slice(0, 4);
  if (items.length === 0) return null;

  return (
    <div className="mt-6 mb-2">
      <p className={`mb-3 text-[16px] font-semibold ${TEXT}`}>{data.title || "What would you like to learn next?"}</p>
      <div className="space-y-2.5">
        {items.map((q, i) => {
          const Icon = q.icon ? iconFor(q.icon) : guessIcon(q.text);
          return (
            <button
              key={i}
              type="button"
              disabled={!onAsk}
              onClick={() => onAsk?.(q.text)}
              className={`flex w-full items-center gap-3 rounded-2xl border border-black/10 px-4 py-3.5 text-left text-[15px] transition-colors hover:bg-black/[0.04] disabled:cursor-default dark:border-white/10 dark:hover:bg-white/[0.06] ${TEXT}`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              <span className="min-w-0 flex-1">{q.text}</span>
              <ChevronRight className={`h-4 w-4 shrink-0 ${MUTED}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Action cards ────────────────────────────────────────────

export type ActionItem = {
  icon?: string; image?: string; title?: string; subtitle?: string; text?: string;
  button?: string; ask?: string; answer?: string;
};
export type ActionsData = { style?: "grid" | "list"; items?: ActionItem[] };

function ActionCard({ item, list, onAsk }: { item: ActionItem; list: boolean; onAsk?: (text: string) => void }) {
  const [shown, setShown] = useState(false);
  const Icon = iconFor(item.icon || "idea");
  const isReveal = typeof item.answer === "string" && item.answer.trim() !== "";
  const label = isReveal ? (shown ? "Hide answer" : item.button || "Show answer") : item.button;
  const ask = item.ask || (item.button && item.title ? `${item.button}: ${item.title}` : item.button);

  const button = label ? (
    <button
      type="button"
      disabled={!isReveal && !onAsk}
      onClick={() => (isReveal ? setShown((s) => !s) : ask && onAsk?.(ask))}
      className={`mt-4 w-full rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors disabled:cursor-default ${
        isReveal && shown
          ? "bg-[#F0EFED] text-[#1A1A19] hover:bg-white"
          : `border border-black/15 hover:bg-black/[0.04] dark:border-white/20 dark:hover:bg-white/[0.06] ${TEXT}`
      }`}
    >
      {label}
    </button>
  ) : null;

  const body = (
    <>
      {item.title && <p className={`text-[17px] font-semibold ${TEXT}`}>{item.title}</p>}
      {item.subtitle && <p className={`mt-1 text-[15px] ${MUTED}`}>{item.subtitle}</p>}
      {item.text && <p className={`mt-2 text-[15px] leading-6 ${TEXT}`}>{item.text}</p>}
      {isReveal && shown && <p className={`mt-3 text-[15px] leading-6 ${TEXT}`}>{item.answer}</p>}
    </>
  );

  if (list) {
    return (
      <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="flex gap-4">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/[0.06] dark:bg-white/10 ${TEXT}`}>
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">{body}</div>
        </div>
        {button}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-black/10 p-4 dark:border-white/10">
      {item.image ? (
        <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="mb-3 aspect-[16/9] w-full rounded-xl object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      ) : (
        <Icon className="mb-3 h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
      )}
      <div className="flex-1">{body}</div>
      {button}
    </div>
  );
}

export function ActionCards({ data, onAsk }: { data: ActionsData; onAsk?: (text: string) => void }) {
  const items = (Array.isArray(data.items) ? data.items : []).filter((it) => it && (it.title || it.text)).slice(0, 8);
  if (items.length === 0) return null;
  const list = data.style === "list";
  return (
    <div className={list ? "my-4 space-y-4" : "my-4 grid gap-4 sm:grid-cols-2"}>
      {items.map((it, i) => <ActionCard key={i} item={it} list={list} onAsk={onAsk} />)}
    </div>
  );
}

// ── Report card ─────────────────────────────────────────────

export type ReportCardData = {
  student?: string; class?: string; term?: string; school?: string; rollNo?: string | number;
  subjects?: { name?: string; marks?: number | string; max?: number | string; grade?: string }[];
  remarks?: string; attendance?: string;
};

// CBSE-style grade from a percentage
function gradeFor(pct: number) {
  if (pct >= 91) return "A1";
  if (pct >= 81) return "A2";
  if (pct >= 71) return "B1";
  if (pct >= 61) return "B2";
  if (pct >= 51) return "C1";
  if (pct >= 41) return "C2";
  if (pct >= 33) return "D";
  return "E";
}

function barColor(pct: number) {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  if (pct >= 33) return "bg-orange-500";
  return "bg-red-500";
}

export function ReportCard({ data }: { data: ReportCardData }) {
  const rows = (Array.isArray(data.subjects) ? data.subjects : [])
    .filter((s) => s && s.name)
    .map((s) => {
      const marks = Number(s.marks);
      const max = Number(s.max) > 0 ? Number(s.max) : 100;
      const pct = Number.isFinite(marks) ? Math.max(0, Math.min(100, (marks / max) * 100)) : NaN;
      return { name: String(s.name), marks, max, pct, grade: s.grade || (Number.isFinite(pct) ? gradeFor(pct) : "–") };
    });
  if (rows.length === 0) return null;

  const scored = rows.filter((r) => Number.isFinite(r.marks));
  const total = scored.reduce((a, r) => a + r.marks, 0);
  const totalMax = scored.reduce((a, r) => a + r.max, 0);
  const overall = totalMax > 0 ? (total / totalMax) * 100 : NaN;
  const passed = scored.length > 0 && scored.every((r) => r.pct >= 33);
  const details = [data.class && `Class ${data.class}`, data.rollNo && `Roll no. ${data.rollNo}`, data.term, data.school].filter(Boolean);

  return (
    <div className={`${BOX} overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 p-5 dark:border-white/10">
        <div className="min-w-0">
          <p className={`text-[13px] font-medium uppercase tracking-wide ${MUTED}`}>Report card</p>
          <p className={`mt-1 text-[20px] font-semibold ${TEXT}`}>{data.student || "Student"}</p>
          {details.length > 0 && <p className={`mt-1 text-[14px] ${MUTED}`}>{details.join(" · ")}</p>}
        </div>
        {Number.isFinite(overall) && (
          <div className="text-right">
            <p className={`text-[32px] font-semibold leading-none ${TEXT}`}>{overall.toFixed(1)}%</p>
            <p className={`mt-2 text-[14px] ${MUTED}`}>
              {total} / {totalMax} · Grade {gradeFor(overall)} ·{" "}
              <span className={passed ? "font-medium text-emerald-600 dark:text-emerald-400" : "font-medium text-red-500"}>{passed ? "Pass" : "Needs improvement"}</span>
            </p>
          </div>
        )}
      </div>
      <div className="divide-y divide-black/10 dark:divide-white/10">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3">
            <span className={`w-28 shrink-0 truncate text-[15px] sm:w-40 ${TEXT}`}>{r.name}</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
              {Number.isFinite(r.pct) && <div className={`h-full rounded-full ${barColor(r.pct)}`} style={{ width: `${r.pct}%` }} />}
            </div>
            <span className={`w-16 shrink-0 text-right text-[15px] tabular-nums ${TEXT}`}>{Number.isFinite(r.marks) ? `${r.marks}/${r.max}` : "–"}</span>
            <span className={`w-9 shrink-0 text-right text-[14px] font-semibold ${TEXT}`}>{r.grade}</span>
          </div>
        ))}
      </div>
      {(data.attendance || data.remarks) && (
        <div className={`space-y-1 border-t border-black/10 px-5 py-4 text-[15px] dark:border-white/10 ${TEXT}`}>
          {data.attendance && <p><span className={MUTED}>Attendance:</span> {data.attendance}</p>}
          {data.remarks && <p><span className={MUTED}>Remarks:</span> {data.remarks}</p>}
        </div>
      )}
    </div>
  );
}

// ── Weekly timetable ────────────────────────────────────────

export type TimetableData = { title?: string; times?: string[]; days?: { day?: string; periods?: string[] }[] };

const SUBJECT_COLORS = [
  "bg-sky-500/15 text-sky-800 dark:text-sky-200", "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  "bg-violet-500/15 text-violet-800 dark:text-violet-200", "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  "bg-rose-500/15 text-rose-800 dark:text-rose-200", "bg-teal-500/15 text-teal-800 dark:text-teal-200",
  "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200", "bg-lime-500/15 text-lime-800 dark:text-lime-200",
];

// Same subject → same colour in every cell
function subjectColor(name: string) {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SUBJECT_COLORS[h % SUBJECT_COLORS.length];
}

export function Timetable({ data }: { data: TimetableData }) {
  const days = (Array.isArray(data.days) ? data.days : []).filter((d) => d && d.day);
  if (days.length === 0) return null;
  const times = Array.isArray(data.times) ? data.times : [];
  const cols = Math.max(times.length, ...days.map((d) => (Array.isArray(d.periods) ? d.periods.length : 0)));
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  return (
    <div className={`${BOX} overflow-hidden`}>
      {data.title && <p className={`border-b border-black/10 px-5 py-4 text-[17px] font-semibold dark:border-white/10 ${TEXT}`}>{data.title}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          {times.length > 0 && (
            <thead>
              <tr>
                <th className="w-24 px-3 py-2.5" />
                {Array.from({ length: cols }, (_, i) => (
                  <th key={i} className={`whitespace-nowrap px-2 py-2.5 text-center text-[12px] font-medium ${MUTED}`}>{times[i] || ""}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {days.map((d, r) => {
              const name = String(d.day);
              const isToday = today.startsWith(name.toLowerCase().slice(0, 3));
              return (
                <tr key={r} className={`border-t border-black/10 dark:border-white/10 ${isToday ? "bg-emerald-500/[0.07]" : ""}`}>
                  <td className={`whitespace-nowrap px-3 py-2 font-semibold ${TEXT}`}>
                    {name}
                    {isToday && <span className="ml-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">Today</span>}
                  </td>
                  {Array.from({ length: cols }, (_, c) => {
                    const cell = String(d.periods?.[c] ?? "").trim();
                    const isBreak = /^(break|lunch|recess|free|-)$/i.test(cell);
                    return (
                      <td key={c} className="px-1 py-1.5">
                        {cell && (
                          <span className={`block min-w-[84px] whitespace-nowrap rounded-lg px-2 py-2 text-center ${isBreak ? `bg-black/[0.04] dark:bg-white/[0.05] ${MUTED}` : subjectColor(cell)}`}>
                            {cell}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Attendance calendar ─────────────────────────────────────

type Status = "present" | "absent" | "late" | "leave" | "holiday";
export type AttendanceData = {
  title?: string; student?: string; month?: string;
  days?: Record<string, string>;
  absent?: number[]; late?: number[]; leave?: number[]; holiday?: number[];
};

const STATUS_STYLE: Record<Status, string> = {
  present: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
  absent: "bg-red-500/20 text-red-700 dark:text-red-300",
  late: "bg-amber-500/25 text-amber-800 dark:text-amber-200",
  leave: "bg-sky-500/20 text-sky-800 dark:text-sky-200",
  holiday: "bg-black/[0.05] text-[#6B6B69] dark:bg-white/[0.06] dark:text-[#A6A6A3]",
};

function toStatus(v: string): Status | null {
  const s = v.trim().toLowerCase();
  if (s === "p" || s.startsWith("pres")) return "present";
  if (s === "a" || s.startsWith("abs")) return "absent";
  if (s === "l" || s.startsWith("late")) return "late";
  if (s.startsWith("leave") || s === "lv") return "leave";
  if (s === "h" || s.startsWith("hol") || s === "off") return "holiday";
  return null;
}

export function AttendanceCalendar({ data }: { data: AttendanceData }) {
  const { year, month } = useMemo(() => {
    const m = /^(\d{4})-(\d{1,2})/.exec(String(data.month || ""));
    const now = new Date();
    return m ? { year: Number(m[1]), month: Number(m[2]) - 1 } : { year: now.getFullYear(), month: now.getMonth() };
  }, [data.month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const now = new Date();
  const lastDay = year === now.getFullYear() && month === now.getMonth() ? now.getDate() : daysInMonth;

  // Status per day: an explicit map wins; otherwise listed days, and other school days (not Sunday) up to today are present
  const status: (Status | null)[] = Array.from({ length: daysInMonth + 1 }, () => null);
  if (data.days && typeof data.days === "object") {
    for (const [k, v] of Object.entries(data.days)) {
      const day = Number(/(\d{1,2})$/.exec(k)?.[1]);
      if (day >= 1 && day <= daysInMonth && typeof v === "string") status[day] = toStatus(v);
    }
  } else {
    const mark = (list: unknown, s: Status) => (Array.isArray(list) ? list : []).forEach((d) => { const n = Number(d); if (n >= 1 && n <= daysInMonth) status[n] = s; });
    mark(data.holiday, "holiday"); mark(data.leave, "leave"); mark(data.late, "late"); mark(data.absent, "absent");
    for (let d = 1; d <= lastDay; d++) if (!status[d] && new Date(year, month, d).getDay() !== 0) status[d] = "present";
  }

  const count = (s: Status) => status.filter((x) => x === s).length;
  const present = count("present"), late = count("late"), absent = count("absent"), leave = count("leave");
  const working = present + late + absent + leave;
  const pct = working > 0 ? ((present + late) / working) * 100 : NaN;
  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className={`${BOX} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-[17px] font-semibold ${TEXT}`}>{data.title || "Attendance"}</p>
          <p className={`mt-1 text-[14px] ${MUTED}`}>{[data.student, monthName].filter(Boolean).join(" · ")}</p>
        </div>
        {Number.isFinite(pct) && (
          <div className="text-right">
            <p className={`text-[28px] font-semibold leading-none ${pct >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{pct.toFixed(0)}%</p>
            <p className={`mt-1.5 text-[13px] ${MUTED}`}>{present + late} of {working} days</p>
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className={`py-1 text-[12px] font-medium ${MUTED}`}>{d}</span>)}
        {Array.from({ length: firstWeekday }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const s = status[i + 1];
          return (
            <span key={i} title={s || undefined} className={`flex h-9 items-center justify-center rounded-lg text-[13px] sm:h-10 font-medium ${s ? STATUS_STYLE[s] : MUTED}`}>
              {i + 1}
            </span>
          );
        })}
      </div>
      <div className={`mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] ${TEXT}`}>
        {([["present", present], ["absent", absent], ["late", late], ["leave", leave], ["holiday", count("holiday")]] as [Status, number][])
          .filter(([, n]) => n > 0)
          .map(([s, n]) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded ${STATUS_STYLE[s].split(" ")[0]}`} />
              <span className="capitalize">{s}</span> {n}
            </span>
          ))}
      </div>
    </div>
  );
}

// ── Study planner ───────────────────────────────────────────

export type PlannerData = { title?: string; exam?: string; days?: { date?: string; title?: string; tasks?: string[] }[] };

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function StudyPlanner({ data, onAsk }: { data: PlannerData; onAsk?: (text: string) => void }) {
  const days = (Array.isArray(data.days) ? data.days : []).filter((d) => d && (d.title || d.tasks?.length));
  // Ticks stay in this browser only (a convenience; the plan itself is in the chat)
  const storeKey = `cg-plan:${data.title || ""}:${days[0]?.date || ""}`;
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch { return {}; }
  });
  if (days.length === 0) return null;

  const toggle = (id: string) => setDone((prev) => {
    const next = { ...prev, [id]: !prev[id] };
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* storage blocked */ }
    return next;
  });

  const todayKey = dayKey(new Date());
  const totalTasks = days.reduce((a, d) => a + (d.tasks?.length || 1), 0);
  const doneTasks = Object.values(done).filter(Boolean).length;
  const examAt = data.exam ? new Date(data.exam) : null;
  const daysLeft = examAt && !Number.isNaN(examAt.getTime())
    ? Math.ceil((new Date(dayKey(examAt)).getTime() - new Date(todayKey).getTime()) / 86400000)
    : null;

  return (
    <div className={`${BOX} overflow-hidden`}>
      <div className="border-b border-black/10 p-5 dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`text-[17px] font-semibold ${TEXT}`}>{data.title || "Study plan"}</p>
            {examAt && !Number.isNaN(examAt.getTime()) && (
              <p className={`mt-1 text-[14px] ${MUTED}`}>Exam on {examAt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
            )}
          </div>
          {daysLeft !== null && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
              {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : daysLeft === 0 ? "Exam today" : "Exam over"}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (doneTasks / totalTasks) * 100)}%` }} />
          </div>
          <span className={`text-[13px] tabular-nums ${MUTED}`}>{doneTasks}/{totalTasks} done</span>
        </div>
      </div>
      <div className="divide-y divide-black/10 dark:divide-white/10">
        {days.map((d, i) => {
          const date = d.date ? new Date(`${d.date}T00:00:00`) : null;
          const valid = date && !Number.isNaN(date.getTime());
          const key = valid ? dayKey(date) : "";
          const isToday = key === todayKey;
          const isPast = valid && key < todayKey;
          const tasks = d.tasks?.length ? d.tasks : [d.title || ""];
          return (
            <div key={i} className={`flex gap-4 px-5 py-4 ${isToday ? "bg-emerald-500/[0.07]" : ""} ${isPast ? "opacity-60" : ""}`}>
              <div className="w-14 shrink-0 text-center">
                {valid ? (
                  <>
                    <p className={`text-[12px] font-medium uppercase ${MUTED}`}>{date.toLocaleDateString("en-US", { weekday: "short" })}</p>
                    <p className={`text-[22px] font-semibold leading-tight ${TEXT}`}>{date.getDate()}</p>
                    <p className={`text-[12px] ${MUTED}`}>{date.toLocaleDateString("en-US", { month: "short" })}</p>
                  </>
                ) : (
                  <p className={`text-[14px] font-semibold ${TEXT}`}>Day {i + 1}</p>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] font-semibold ${TEXT}`}>
                  {d.title}
                  {isToday && <span className="ml-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">Today</span>}
                </p>
                <div className="mt-2 space-y-1.5">
                  {tasks.map((t, j) => {
                    const id = `${i}:${j}`;
                    return (
                      <label key={j} className={`flex cursor-pointer items-start gap-2.5 text-[15px] ${TEXT}`}>
                        <input type="checkbox" checked={!!done[id]} onChange={() => toggle(id)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-600" />
                        <span className={done[id] ? "line-through opacity-60" : ""}>{t}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {onAsk && (
        <div className="border-t border-black/10 p-4 dark:border-white/10">
          <button
            type="button"
            onClick={() => onAsk(`Set WhatsApp and email reminders for this study plan${data.title ? ` (${data.title})` : ""}.`)}
            className={`flex w-full items-center justify-center gap-2 rounded-full border border-black/15 px-4 py-2.5 text-[15px] font-medium transition-colors hover:bg-black/[0.04] dark:border-white/20 dark:hover:bg-white/[0.06] ${TEXT}`}
          >
            <CalendarCheck className="h-4 w-4" /> Set reminders
          </button>
        </div>
      )}
    </div>
  );
}
