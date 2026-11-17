// The people list on phones: one card per person instead of a table, so nothing scrolls sideways.
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { PersonAvatar } from "./PersonAvatar";
import { PlanBadge } from "./PlanBadge";
import { StatusBadge } from "./StatusBadge";
import { dateText, num, relativeText } from "./format";
import type { PersonRow } from "./types";

export function PeopleCards({ rows, isLoading, onOpen }: { rows: PersonRow[]; isLoading: boolean; onOpen: (row: PersonRow) => void }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((u) => {
        const parts = [`Joined ${dateText(u.joinedAt)}`, `Active ${relativeText(u.lastActiveAt).toLowerCase()}`];
        if (u.chats !== null) parts.push(`${num(u.chats)} chats`);
        return (
          <li key={u._id}>
            <button type="button" onClick={() => onOpen(u)}
              className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <PersonAvatar name={u.name} email={u.email} src={u.profilePicture} />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-sm text-foreground break-words">{u.name || u.email}</span>
                  <span className="text-xs text-muted-foreground break-all">{u.email}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <PlanBadge plan={u.plan} />
                <StatusBadge status={u.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{parts.join(" · ")}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
