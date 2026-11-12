// Calendar events in the AI's answer, the way the launch video shows them: one row per event with a clock, the start
// time, the title and how long it lasts, in a rounded box under the answer (owner, 2026-11-12). The rows come from
// the answer's own calendar steps (Google Calendar list_events, Microsoft and Zoom meeting lists); the AI's text above
// stays as it is. Nothing is shown when no step listed events.
import React from "react";
import { Clock } from "lucide-react";
import { parseResult, unwrapList, pick } from "../../stepper/tool-results/primitives";

type Step = { type?: string; tool?: string; args?: any; result?: unknown; status?: string };
type Row = { key: string; when: Date | null; allDay: boolean; title: string; minutes: number | null; link: string | null };

const CALENDAR_OPS: Record<string, RegExp> = {
  google_workspace_connector: /^list_events$/,
  microsoft_workspace_connector: /^list_(meetings|events)$/,
  zoom_connector: /^list_meetings$/,
};

/** True when this answer has a finished calendar step with events */
export function hasCalendarEvents(steps: Step[] | undefined): boolean {
  return rowsFrom(steps || []).length > 0;
}

const text = (v: any) => (v === undefined || v === null ? "" : String(v));
const asDate = (v: any) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };

function rowsFrom(steps: Step[]): Row[] {
  const rows: Row[] = [];
  for (const s of steps) {
    if (s.type !== "tool" || !s.tool || s.status !== "success") continue;
    const ops = CALENDAR_OPS[s.tool];
    if (!ops || !ops.test(text(s.args?.operation))) continue;
    const { data } = parseResult(s.result);
    const { list } = unwrapList(data);
    const events = list ?? (data && typeof data === "object" && !Array.isArray(data) && pick(data, ["start", "start_time", "startTime", "summary", "topic"]) ? [data] : []);
    for (const e of events) {
      if (!e || typeof e !== "object") continue;
      const startRaw = pick(e, ["start.dateTime", "start.date", "startDateTime", "start_time", "startTime", "scheduled_at"]);
      const endRaw = pick(e, ["end.dateTime", "end.date", "endDateTime", "end_time", "endTime"]);
      const allDay = !!pick(e, ["start.date"]) && !pick(e, ["start.dateTime"]);
      const when = asDate(startRaw);
      const end = asDate(endRaw);
      let minutes: number | null = null;
      if (Number.isFinite(Number(e.duration)) && Number(e.duration) > 0) minutes = Number(e.duration);
      else if (when && end && !allDay) minutes = Math.round((end.getTime() - when.getTime()) / 60000);
      const title = text(pick(e, ["summary", "subject", "topic", "title", "name"])).trim() || "Event";
      const link = text(pick(e, ["htmlLink", "webLink", "join_url", "joinUrl", "hangoutLink", "url"])) || null;
      rows.push({ key: `${s.tool}-${text(e.id || e.uid || title)}-${startRaw || ""}`, when, allDay, title, minutes, link: /^https?:\/\//.test(link || "") ? link : null });
    }
  }
  // Once each, soonest first (events without a time last)
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)))
    .sort((a, b) => (a.when?.getTime() ?? Infinity) - (b.when?.getTime() ?? Infinity))
    .slice(0, 12);
}

const timeOf = (r: Row) => (r.allDay ? "All day" : r.when ? r.when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "");
const lengthOf = (r: Row) => (r.minutes === null || r.minutes <= 0 ? "" : r.minutes >= 60 && r.minutes % 60 === 0 ? `${r.minutes / 60} h` : r.minutes >= 60 ? `${Math.floor(r.minutes / 60)} h ${r.minutes % 60} min` : `${r.minutes} min`);

export function CalendarEventsDisplay({ steps }: { steps: Step[] }) {
  const rows = rowsFrom(steps || []);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-border bg-secondary/30 divide-y divide-border overflow-hidden">
      {rows.map((r) => {
        const inner = (
          <>
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            {timeOf(r) && <span className="shrink-0 font-semibold text-foreground">{timeOf(r)}</span>}
            <span className="min-w-0 flex-1 truncate text-foreground">{r.title}</span>
            {lengthOf(r) && <span className="shrink-0 text-[13px] text-muted-foreground">{lengthOf(r)}</span>}
          </>
        );
        const cls = "flex items-center gap-3 px-4 py-3 text-[14.5px]";
        return r.link
          ? <a key={r.key} href={r.link} target="_blank" rel="noreferrer" className={`${cls} hover:bg-secondary/60 transition-colors`}>{inner}</a>
          : <div key={r.key} className={cls}>{inner}</div>;
      })}
    </div>
  );
}
