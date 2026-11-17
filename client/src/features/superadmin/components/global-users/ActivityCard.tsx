// What the person has made with Classgrid: chats, projects, live docs, pages and WhatsApp calls, and when they last
// chatted or got an AI answer. Each number is counted on its own, so one that couldn't be counted shows a dash
// while the others still show.
import { Activity } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { dateText, num, relativeText } from "./format";
import type { PersonOverview } from "./types";

const UNKNOWN = { value: "–", title: "Couldn't count right now" };

const count = (n: number | null | undefined) => (n === null || n === undefined ? UNKNOWN : { value: num(n) });

function Tile({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-foreground break-words leading-snug" title={title}>{value}</div>
    </div>
  );
}

export function ActivityCard({ activity }: { activity: PersonOverview["activity"] }) {
  // (no newest chat: either there are none, or the chats couldn't be read this time)
  const lastChat = activity.lastChatAt
    ? { value: dateText(activity.lastChatAt) }
    : activity.chats === null ? UNKNOWN : { value: "No chats yet" };
  const tiles = [
    { label: "Chats", ...count(activity.chats) },
    { label: "Last chat", ...lastChat },
    { label: "Last AI answer", value: relativeText(activity.lastAiUseAt) },
    { label: "Projects", ...count(activity.projects) },
    { label: "Live docs", ...count(activity.liveDocs) },
    { label: "Pages", ...count(activity.pages) },
    { label: "WhatsApp calls", ...count(activity.calls) },
  ];
  return (
    <SectionCard icon={Activity} title="Activity" note="What they've made with Classgrid.">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map((t) => <Tile key={t.label} label={t.label} value={t.value} title={"title" in t ? t.title : undefined} />)}
      </div>
    </SectionCard>
  );
}
