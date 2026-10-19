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
import {
  CircleCheck, ShieldCheck, Shield, Layers, LayoutGrid, TrendingUp, Gauge, Zap, Target, Star, TriangleAlert,
  CircleAlert, Info, Lightbulb, Rocket, Users, Lock, Clock, Search, FileText, ChartColumn, MousePointerClick,
  Sparkles, Heart, Globe, Smartphone, Settings, Wrench, ThumbsUp, ThumbsDown, CircleX, BadgeDollarSign,
  BookOpen, GraduationCap, MessageCircle, Eye, Palette, ListChecks, Flag, StarHalf, Brain, GitBranch, PencilRuler,
  CalendarCheck, Download, Code, type LucideIcon,
} from "lucide-react";
import { SourceChip, takeCitations, type ChatSource } from "./SourceChip";

// ```points (icon + bold title + text rows: "tiles" in a bordered box, or "icons" with orange line icons)
// and ```rating (overall rating card with a big score and stars) — ChatGPT-style report pieces.

// Fixed set of icons the AI may name; anything else falls back to a check mark.
const ICONS: Record<string, LucideIcon> = {
  check: CircleCheck, "check-circle": CircleCheck, "circle-check": CircleCheck, done: CircleCheck,
  shield: Shield, "shield-check": ShieldCheck, security: ShieldCheck, trust: ShieldCheck,
  layers: Layers, stack: Layers, layout: LayoutGrid, "layout-grid": LayoutGrid, grid: LayoutGrid, dashboard: LayoutGrid,
  "trending-up": TrendingUp, growth: TrendingUp, conversion: TrendingUp, gauge: Gauge, speed: Gauge, performance: Gauge,
  zap: Zap, fast: Zap, target: Target, goal: Target, star: Star, warning: TriangleAlert, "alert-triangle": TriangleAlert,
  alert: CircleAlert, "alert-circle": CircleAlert, info: Info, idea: Lightbulb, lightbulb: Lightbulb, rocket: Rocket,
  launch: Rocket, users: Users, people: Users, team: Users, lock: Lock, privacy: Lock, clock: Clock, time: Clock,
  search: Search, seo: Search, file: FileText, document: FileText, chart: ChartColumn, data: ChartColumn,
  click: MousePointerClick, cta: MousePointerClick, pointer: MousePointerClick, sparkles: Sparkles, ai: Sparkles,
  heart: Heart, globe: Globe, web: Globe, mobile: Smartphone, phone: Smartphone, settings: Settings, wrench: Wrench,
  fix: Wrench, "thumbs-up": ThumbsUp, good: ThumbsUp, "thumbs-down": ThumbsDown, bad: ThumbsDown, x: CircleX,
  "x-circle": CircleX, price: BadgeDollarSign, pricing: BadgeDollarSign, money: BadgeDollarSign, book: BookOpen,
  learn: BookOpen, education: GraduationCap, "graduation-cap": GraduationCap, message: MessageCircle, chat: MessageCircle,
  eye: Eye, visibility: Eye, design: Palette, palette: Palette, list: ListChecks, checklist: ListChecks, flag: Flag,
  brain: Brain, quiz: Brain, practice: Brain, mcq: Brain, diagram: GitBranch, flowchart: GitBranch, "git-branch": GitBranch,
  draw: PencilRuler, steps: PencilRuler, pencil: PencilRuler, calendar: CalendarCheck, reminder: CalendarCheck,
  schedule: CalendarCheck, download: Download, notes: Download, code: Code, course: GraduationCap, cap: GraduationCap,
};

export function iconFor(name?: string): LucideIcon {
  return ICONS[String(name || "").trim().toLowerCase()] || CircleCheck;
}

export type PointItem = { icon?: string; title?: string; text?: string; cite?: number[] };
export type PointsData = { style?: "tiles" | "icons"; items?: PointItem[] };

export function PointsList({ data, sources }: { data: PointsData; sources?: ChatSource[] }) {
  const items = (Array.isArray(data.items) ? data.items : []).filter((it) => it && (it.title || it.text)).slice(0, 12);
  if (items.length === 0) return null;
  const tiles = data.style !== "icons";

  const rows = items.map((it, i) => {
    const Icon = iconFor(it.icon);
    const { text: itemText, ids } = takeCitations(it.text, it.cite);
    const cited = (sources || []).filter((s) => ids.includes(s.id));
    return (
      <div key={i} className={tiles ? "flex gap-4" : "flex gap-3.5 py-5 first:pt-1 last:pb-1"}>
        {tiles ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/[0.06] text-[#2C2C2B] dark:bg-white/10 dark:text-[#F0EFED]">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
        ) : (
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-500 dark:text-orange-400" strokeWidth={2} />
        )}
        <div className="min-w-0 flex-1">
          {it.title && (
            <p className={`${tiles ? "text-[17px] leading-10" : "text-[16px] leading-6"} font-semibold text-[#2C2C2B] dark:text-[#F0EFED]`}>
              {it.title}
            </p>
          )}
          {(itemText || cited.length > 0) && (
            <p className={`${tiles ? "" : "mt-1"} text-[16px] leading-[26px] text-[#2C2C2B] dark:text-[#F0EFED]`}>
              {itemText}
              {cited.length > 0 && <> <SourceChip sources={cited} /></>}
            </p>
          )}
        </div>
      </div>
    );
  });

  return tiles ? (
    <div className="my-4 space-y-4 rounded-2xl border border-black/10 p-5 dark:border-white/10">{rows}</div>
  ) : (
    <div className="my-4 divide-y divide-black/10 dark:divide-white/10">{rows}</div>
  );
}

export type RatingData = {
  label?: string;
  score?: number | string;
  max?: number | string;
  stars?: number;
  caption?: string;
  summary?: string;
  cite?: number[];
};

function toNumber(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function scoreColor(ratio: number) {
  if (ratio >= 0.7) return "text-emerald-500";
  if (ratio >= 0.5) return "text-amber-500";
  return "text-red-500";
}

export function RatingCard({ data, sources }: { data: RatingData; sources?: ChatSource[] }) {
  const max = toNumber(data.max, 10);
  const score = Math.min(Math.max(toNumber(data.score, 0), 0), max);
  const ratio = max > 0 ? score / max : 0;
  const starCount = Math.min(Math.max(Math.round(toNumber(data.stars, max <= 10 ? max : 5)), 1), 10);
  const filled = ratio * starCount;
  const { text: summary, ids } = takeCitations(data.summary, data.cite);
  const cited = (sources || []).filter((s) => ids.includes(s.id));
  const shown = Number.isInteger(score) ? `${score}` : `${Math.round(score * 10) / 10}`;

  return (
    <div className="my-5 rounded-2xl border border-black/10 p-5 sm:p-6 dark:border-white/10">
      <p className="text-[14px] font-semibold uppercase tracking-wide text-black/50 dark:text-white/55">
        {data.label || "My overall rating"}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className={`text-[44px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${scoreColor(ratio)}`}>
          {shown}/{max}
        </span>
        <span className="flex flex-col gap-1">
          {/* Like ChatGPT: only the earned stars in gold, plus a half star for a remainder (no empty stars) */}
          <span className="flex items-center gap-1 text-[#E9A23B]" aria-label={`${shown} out of ${max}`}>
            {Array.from({ length: Math.floor(filled) }, (_, i) => (
              <Star key={i} className="h-6 w-6 fill-current" strokeWidth={1.5} />
            ))}
            {filled - Math.floor(filled) >= 0.15 && <StarHalf className="h-6 w-6" strokeWidth={2} />}
          </span>
          {data.caption && <span className="text-[13px] text-black/50 dark:text-white/55">{data.caption}</span>}
        </span>
      </div>
      {(summary || cited.length > 0) && (
        <p className="mt-4 text-[16px] leading-[26px] text-[#2C2C2B] dark:text-[#F0EFED]">
          {summary}
          {cited.length > 0 && <> <SourceChip sources={cited} /></>}
        </p>
      )}
    </div>
  );
}
