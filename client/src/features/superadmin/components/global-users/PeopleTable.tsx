// The people list on wider screens (from tablet size up): one row per person, opening their page on click.
import { useMemo } from "react";
import { DataTable } from "@/components/marketing_ui/data-table";
import { PersonAvatar } from "./PersonAvatar";
import { PlanBadge } from "./PlanBadge";
import { StatusBadge } from "./StatusBadge";
import { dateText, num, planIdLabel, relativeText } from "./format";
import type { PersonRow, PlanSummary } from "./types";

// The small line under the plan: how it differs from a plain bought plan
export function planSubText(plan: PlanSummary): string | null {
  if (plan.noLimits) return "No plan limits";
  if (plan.ended) return `${planIdLabel(plan.savedId)} ended`;
  if (plan.source === "gifted") return "Gifted";
  return null;
}

export function PeopleTable({ rows, isLoading, onOpen }: { rows: PersonRow[]; isLoading: boolean; onOpen: (row: PersonRow) => void }) {
  const columns = useMemo(() => [
    {
      key: "person",
      header: "Person",
      // (no fixed width: in a fixed-layout table this column takes whatever the five fixed columns leave, and the
      // table's minimum width below keeps that at 220px or more)
      width: undefined,
      render: (_: unknown, u: PersonRow) => (
        <div className="flex items-center gap-3 py-1 min-w-0">
          <PersonAvatar name={u.name} email={u.email} src={u.profilePicture} />
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm text-foreground break-words">{u.name || u.email}</span>
            <span className="text-xs text-muted-foreground break-all">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      width: "w-[140px]",
      render: (_: unknown, u: PersonRow) => {
        const sub = planSubText(u.plan);
        return (
          <div className="flex flex-col items-start gap-1 min-w-0">
            <PlanBadge plan={u.plan} />
            {sub && <span className="text-xs text-muted-foreground break-words max-w-full">{sub}</span>}
          </div>
        );
      },
    },
    {
      key: "joinedAt",
      header: "Joined",
      width: "w-[120px]",
      render: (_: unknown, u: PersonRow) => <span className="text-sm text-muted-foreground whitespace-nowrap">{dateText(u.joinedAt)}</span>,
    },
    {
      key: "lastActiveAt",
      header: "Last active",
      width: "w-[130px]",
      render: (_: unknown, u: PersonRow) => <span className="text-sm text-muted-foreground whitespace-nowrap">{relativeText(u.lastActiveAt)}</span>,
    },
    {
      key: "chats",
      header: "Chats",
      width: "w-[80px] text-right",
      render: (_: unknown, u: PersonRow) => (
        <div className="text-right text-sm text-foreground tabular-nums">
          {u.chats === null ? <span className="text-muted-foreground" title="Couldn't count chats right now">–</span> : num(u.chats)}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[110px]",
      render: (_: unknown, u: PersonRow) => <StatusBadge status={u.status} />,
    },
  ], []);

  // The six columns need about 800px. On a tablet next to the sidebar there is less room than that, and the table
  // itself hides what doesn't fit, so the table scrolls sideways inside its own box instead of cutting off columns.
  // (While loading, the table is only skeleton bars, which need no minimum width.)
  return (
    <div className="w-full overflow-x-auto">
      <DataTable columns={columns} rows={rows} isLoading={isLoading} onRowClick={onOpen}
        className={isLoading ? "shadow-sm" : "shadow-sm min-w-[800px]"} />
    </div>
  );
}
