// Plans & Usage, the people list (owner, 2026-11-17): everyone who finished signing up, newest first, with the plan in
// force (bought or gifted, until when, or the paid plan that ended) and how much of the current session they used.
// Read from GET /api/super-admin/ai-usage/people one page at a time; the search and the filters live in the address
// (q, plan, how, page), so Back and a shared link give the same list. Opening a person shows their page.
import { useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/marketing_ui/avatar";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { SuperadminFilterBar } from "@/features/superadmin/components/SuperadminFilterBar";
import { dayText, n } from "@/features/shared/queries/usePlanOverview";
import { useAiPlans, usePeople, type PersonRow } from "@/features/superadmin/queries/useAiUsage";
import { Section } from "./Section";
import { peopleText } from "./planText";

export type PeopleFilterPatch = { q?: string; plan?: string; how?: string; page?: number };

const HOW_LABELS: Record<string, string> = { all: "Bought or gifted", bought: "Bought", gifted: "Gifted" };

/** The session in words, and the bar's fill (null: no bar, because there is no limit or the plan has no session) */
function sessionOf(s: PersonRow["session"]) {
  const fresh = s.used === 0 && !s.resetAt;
  if (s.limit === 0) return { text: "Not included", pct: null as number | null, short: "Not included" };
  if (s.limit < 0) return { text: fresh ? "Not used yet" : `${n(s.used)} credits · no limit`, pct: null, short: "No limit" };
  const pct = Math.min(100, Math.round((s.used / s.limit) * 100));
  return { text: fresh ? "Not used yet" : `${n(s.used)} of ${n(s.limit)} credits`, pct, short: `${pct}% of session` };
}

const barColor = (pct: number) => (pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-blue-400");

/** "Gifted, until 3 Dec 2026", "Bought, no end date", or "Pro ended 1 Nov 2026" for a paid plan that ended */
function planLine(p: PersonRow["plan"]) {
  if (p.key !== "free") return `${p.how === "gifted" ? "Gifted" : "Bought"}, ${p.expires_at ? `until ${dayText(p.expires_at)}` : "no end date"}`;
  if (p.ended) return `${p.ended.name} ended${p.ended.at ? ` ${dayText(p.ended.at)}` : ""}`;
  return "";
}

function PersonAvatar({ row, className }: { row: PersonRow; className?: string }) {
  return (
    <Avatar className={className}>
      {row.photo && <AvatarImage src={row.photo} alt="" />}
      <AvatarFallback className="text-xs font-semibold">{(row.name || row.email || "?").charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function PeopleList({ q, plan, how, page, onChange, onOpen }: {
  q: string; plan: string; how: string; page: number; onChange: (patch: PeopleFilterPatch) => void; onOpen: (id: string) => void;
}) {
  const { data: plansData } = useAiPlans();
  const { data, isLoading, isError, isFetching, refetch } = usePeople({ q, plan, how, page });
  const planOptions = (plansData?.plans || []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const planLabel = (key: string) => (key === "all" ? "All plans" : key === "paid" ? "Any paid plan" : planOptions.find((p) => p.key === key)?.name || key);

  // The search box keeps what is typed; the address gets it 300 ms after the last key, so each key does not ask the
  // server. When the address changes from outside (Clear filters, Back), the box follows it.
  const [text, setText] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    if (q !== text.trim()) setText(q);
  }
  useEffect(() => {
    if (text.trim() === q) return;
    const t = setTimeout(() => onChange({ q: text.trim(), page: 1 }), 300);
    return () => clearTimeout(t);
  }, [text, q, onChange]);

  const filtered = !!q || plan !== "all" || how !== "all";
  const rows = data?.data || [];
  const pages = Math.max(1, data?.pages || 1);

  const columns = [
    {
      key: "person",
      header: "Person",
      width: "w-[42%]",
      render: (_: unknown, r: PersonRow) => (
        <div className="flex items-center gap-3 min-w-0">
          <PersonAvatar row={r} />
          <div className="flex flex-col min-w-0">
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{r.name || r.email}</span>
              {r.blocked ? <Badge variant="danger" className="shrink-0">Blocked</Badge> : r.staff ? <Badge variant="neutral" className="shrink-0">Staff</Badge> : null}
            </span>
            <span className="text-xs text-muted-foreground truncate">{r.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      width: "w-[28%]",
      render: (_: unknown, r: PersonRow) => {
        const line = planLine(r.plan);
        return (
          <div className="flex flex-col items-start gap-1 min-w-0">
            <Badge variant={r.plan.key === "free" ? "neutral" : "outline"}>{r.plan.name}</Badge>
            {line && <span className="text-xs text-muted-foreground truncate max-w-full">{line}</span>}
          </div>
        );
      },
    },
    {
      key: "session",
      header: "Session",
      width: "w-[30%]",
      render: (_: unknown, r: PersonRow) => {
        const s = sessionOf(r.session);
        return (
          <div className="flex flex-col gap-1.5 min-w-0">
            {s.pct !== null && (
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className={`h-full w-[var(--w)] rounded-full ${barColor(s.pct)}`} style={{ "--w": `${s.pct}%` } as CSSProperties} />
              </div>
            )}
            <span className="text-xs text-muted-foreground tabular-nums truncate">{s.text}</span>
          </div>
        );
      },
    },
  ];

  return (
    <Section
      id="people"
      icon={Users}
      title="People"
      note="Everyone who finished signing up. Open a person to see their plan, usage and history."
    >
      <SuperadminFilterBar searchQuery={text} onSearchChange={setText} searchPlaceholder="Search by name or email">
        <Select value={plan} onValueChange={(v) => onChange({ plan: String(v || "all"), how: String(v) === "free" ? "all" : how, page: 1 })}>
          <SelectTrigger className="h-9 px-3 min-w-[140px] rounded-full border border-dashed border-border bg-transparent shadow-sm" aria-label="Plan">
            <SelectValue>{(v: string) => planLabel(v || "all")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {planOptions.map((p) => <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>)}
            <SelectItem value="paid">Any paid plan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={how} disabled={plan === "free"} onValueChange={(v) => onChange({ how: String(v || "all"), page: 1 })}>
          <SelectTrigger className="h-9 px-3 min-w-[150px] rounded-full border border-dashed border-border bg-transparent shadow-sm" aria-label="Bought or gifted">
            <SelectValue>{(v: string) => HOW_LABELS[v] || HOW_LABELS.all}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(HOW_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </SuperadminFilterBar>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : isError && !data ? (
        <div className="py-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Could not read the people list.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : !rows.length ? (
        <div className="py-8 flex flex-col items-center gap-3 text-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">{filtered ? "No one matches these filters." : "No one here yet."}</p>
          {filtered && (
            <Button type="button" variant="outline" size="sm" onClick={() => { setText(""); onChange({ q: "", plan: "all", how: "all", page: 1 }); }}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground -mt-3">
            {filtered ? `${n(data?.total || 0)} match` : peopleText(data?.total || 0)}
          </p>

          {/* sm and up: a table; the whole row opens the person */}
          <div className={`hidden sm:block overflow-x-auto transition-opacity ${isFetching ? "opacity-70" : ""}`}>
            <div className="min-w-[640px]">
              <DataTable columns={columns} rows={rows} onRowClick={(r: PersonRow) => onOpen(r.id)} />
            </div>
          </div>

          {/* Phone: one line per person, with the plan and the session on the right */}
          <div className={`sm:hidden rounded-md border border-border bg-card divide-y divide-border transition-opacity ${isFetching ? "opacity-70" : ""}`}>
            {rows.map((r) => (
              <Button key={r.id} type="button" variant="ghost" onClick={() => onOpen(r.id)} className="w-full h-auto rounded-none justify-start px-3 py-3 font-normal">
                <span className="flex items-center gap-3 w-full min-w-0">
                  <PersonAvatar row={r} />
                  <span className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-sm font-medium text-foreground truncate">{r.name || r.email}</span>
                    <span className="text-xs text-muted-foreground truncate">{r.email}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={r.plan.key === "free" ? "neutral" : "outline"}>{r.plan.name}</Badge>
                    {r.blocked ? <span className="text-[11px] text-red-500">Blocked</span> : <span className="text-[11px] text-muted-foreground tabular-nums">{sessionOf(r.session).short}</span>}
                  </span>
                </span>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="icon" aria-label="Previous page" title="Previous page" disabled={page <= 1 || isFetching} onClick={() => onChange({ page: Math.max(1, page - 1) })} className="h-8 w-9"><ChevronLeft className="w-4 h-4" /></Button>
            <Button type="button" variant="outline" size="icon" aria-label="Next page" title="Next page" disabled={page >= pages || isFetching} onClick={() => onChange({ page: Math.min(pages, page + 1) })} className="h-8 w-9"><ChevronRight className="w-4 h-4" /></Button>
            <span className="text-xs text-muted-foreground ml-2">Page {Math.min(page, pages)} of {pages}</span>
          </div>
        </div>
      )}
    </Section>
  );
}
