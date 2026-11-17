// Plans & Usage, one user (owner, 2026-11-17): the user's plan first (name, status, dates, bought or gifted and why),
// then the same usage bars the user sees in Settings > Usage (planOverviewFor on the server), then the plan gifts and
// the usage history. Read only, except the buttons, which open the gift forms.
import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Gift, Coins, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Button } from "@/components/marketing_ui/button";
import { Badge } from "@/components/marketing_ui/badge";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/marketing_ui/table";
import { n, inText, dayText, timeText, type Meter, type PlanOverview } from "@/features/shared/queries/usePlanOverview";
import { modelName } from "@/features/shared/components/settings/modelName";
import { useAiPlans, planNameOf, useUserUsageHistory } from "@/features/superadmin/queries/useAiUsage";
import { StudentPriceRow, EndPlanButton } from "./UserPlanCard";
import { isPast, planSourceText, type UserPlan } from "./planText";

export type PlanHistoryRow = { at: string; action: "gift" | "end"; plan: string; expires_at: string | null; reason: string; by: string };
type StudentInfo = { email?: string | null; method?: string; verified_at?: string; expires_at?: string | null } | null;

function statusOf(plan?: UserPlan | null): { text: string; variant: "success" | "warning" | "neutral" } {
  if (!plan?.id || plan.id === "free") return { text: "Active", variant: "success" };
  if (isPast(plan.expires_at) || plan.status === "expired") return { text: "Ended", variant: "neutral" };
  if (plan.status === "cancelled") return { text: "Cancelled", variant: "neutral" };
  if (plan.status === "past_due") return { text: "Payment due", variant: "warning" };
  return { text: "Active", variant: "success" };
}

/** A width or height in percent, through a CSS variable (the design rules allow only CSS variables in style) */
const pctVar = (name: "--w" | "--h", pct: number) => ({ [name]: `${pct}%` }) as CSSProperties;

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground mt-0.5 break-words">{children}</div>
    </div>
  );
}

/** The plan at the top of the page, with the two gift buttons */
export function PlanHeaderCard({ userId, plan, overview, student, onGift, onGrant }: {
  userId: string; plan?: UserPlan | null; overview?: PlanOverview | null; student?: StudentInfo; onGift: () => void; onGrant: () => void;
}) {
  const { data } = useAiPlans();
  const status = statusOf(plan);
  const rawKey = plan?.id || "free";
  const ended = rawKey !== "free" && status.text !== "Active" && status.text !== "Payment due";
  const shownKey = ended ? "free" : rawKey;
  const name = planNameOf(data?.plans, shownKey);
  const gifted = plan?.billing === "granted";
  const staff = overview?.enabled && !overview.plan?.limits;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 space-y-0">
        <div className="min-w-0">
          <CardDescription>Plan</CardDescription>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <CardTitle className="text-2xl">{name}</CardTitle>
            <Badge variant={ended ? "success" : status.variant} dot>{ended ? "Active" : status.text}</Badge>
          </div>
          {!ended && overview?.enabled && overview.plan?.tagline && <p className="text-sm text-muted-foreground mt-1">{overview.plan.tagline}</p>}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" size="sm" onClick={onGift}><Gift className="w-4 h-4" />Gift a plan</Button>
          <Button type="button" size="sm" variant="outline" onClick={onGrant} className="font-medium"><Coins className="w-4 h-4" />Gift credits</Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {ended ? (
          <p className="text-sm text-muted-foreground">
            Was on {planNameOf(data?.plans, rawKey)}{plan?.expires_at ? ` until ${dayText(plan.expires_at)}` : ""}{gifted ? ", as a gift" : ""}.
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Fact label="How">{planSourceText(plan)}</Fact>
            <Fact label="Started">{rawKey === "free" ? "Since sign up" : dayText(plan?.started_at) || "Not saved"}</Fact>
            <Fact label="Ends">{rawKey === "free" ? "No end" : plan?.expires_at ? dayText(plan.expires_at) : "No end date"}</Fact>
            <Fact label="Status">{rawKey !== "free" && plan?.expires_at ? `Ends ${inText(plan.expires_at)}` : status.text}</Fact>
          </div>
        )}
        {gifted && plan?.note && !ended && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Reason: </span><span className="text-foreground">{plan.note}</span>
          </div>
        )}
        {overview && !overview.enabled && (
          <p className="text-xs text-muted-foreground">Plans are off, so this user has the limits under When plans are off on the Plans & Usage page.</p>
        )}
        {staff && (
          <p className="text-xs text-muted-foreground">Classgrid staff accounts (super admins and @classgrid.in emails) use the limits under When plans are off, not a plan.</p>
        )}
        <div className="flex flex-col gap-3 pt-3 border-t border-border">
          <StudentPriceRow userId={userId} student={student} />
          {rawKey !== "free" && !ended && <div className="flex justify-end -mb-2"><EndPlanButton userId={userId} plan={plan} /></div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── The usage bars (the user's Settings > Usage page, plus images and storage) ──
function UsageBar({ name, m, unit, line }: { name: string; m: Meter | null | undefined; unit: string; line?: string }) {
  if (!m) return null;
  const notIn = m.limit === 0;
  const unlimited = m.limit === null || (m.limit !== null && m.limit < 0);
  const pct = !notIn && !unlimited && m.limit ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0;
  const right = notIn ? "Not in plan" : unlimited ? "No limit" : `${pct}% used`;
  const amount = notIn ? "" : unlimited ? `${n(m.used)} ${unit} used` : `${n(m.used)} of ${n(m.limit as number)} ${unit}`;
  return (
    <div className="px-5 py-3.5 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className={`text-sm ${notIn ? "text-muted-foreground" : "text-foreground"}`}>{name}</span>
        <span className={`text-sm tabular-nums whitespace-nowrap ${pct >= 100 ? "text-red-500" : notIn ? "text-muted-foreground" : "text-foreground/80"}`}>{right}</span>
      </div>
      {!notIn && (
        <div className="h-2 rounded-full bg-black/[0.07] dark:bg-white/[0.1] overflow-hidden mt-2">
          {!unlimited && <div className={`h-full w-[var(--w)] rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-blue-400"}`} style={pctVar("--w", pct)} />}
        </div>
      )}
      {!notIn && <div className="text-xs text-muted-foreground mt-1.5">{[amount, line].filter(Boolean).join(" · ")}</div>}
    </div>
  );
}

const resets = (iso?: string | null) => (iso ? `Resets ${inText(iso)}` : "");
const per = (text?: string) => (text ? `per ${text.replace(/^1 /, "")}` : "");
const joined = (...parts: string[]) => parts.filter(Boolean).join(" · ");

export function PlanUsageBars({ overview }: { overview?: PlanOverview | null }) {
  if (!overview) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Usage</CardTitle><CardDescription>Could not read the usage of this user right now.</CardDescription></CardHeader>
      </Card>
    );
  }
  const u = overview.usage;
  const storage: Meter = { used: u.storage.usedMb, limit: u.storage.limit };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div className="text-sm font-semibold text-foreground mb-2">Credits</div>
        <div className="rounded-xl border border-border bg-card">
          <UsageBar name="Session" m={u.credits_window} unit="credits" line={joined(u.credits_window?.periodText ? `${u.credits_window.periodText} from the first message` : "", resets(u.credits_window?.resetAt))} />
          <UsageBar name="Week" m={u.credits_week} unit="credits" line={resets(u.credits_week?.resetAt)} />
          <UsageBar name="Claude" m={u.claude_week} unit="credits" line={joined("Sonnet, Opus and Haiku", resets(u.claude_week?.resetAt))} />
          <UsageBar name="Fable" m={u.fable_week} unit="credits" line={resets(u.fable_week?.resetAt)} />
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground mb-2">Images, calls, WhatsApp, voice and storage</div>
        <div className="rounded-xl border border-border bg-card">
          <UsageBar name="Images" m={u.images} unit="images" line={joined(per(u.images?.periodText), resets(u.images?.resetAt))} />
          <UsageBar name="WhatsApp calls" m={u.call_minutes} unit="minutes" line={joined(per(u.call_minutes?.periodText), resets(u.call_minutes?.resetAt))} />
          <UsageBar name="WhatsApp messages" m={u.whatsapp} unit="messages" line={joined(per(u.whatsapp?.periodText), resets(u.whatsapp?.resetAt))} />
          <UsageBar name="Voice" m={u.voice_input_minutes} unit="minutes" line="today · Resets at midnight" />
          <UsageBar name="Read aloud" m={u.voice_replies} unit="replies" line="today · Resets at midnight" />
          <UsageBar name="Storage" m={storage} unit="MB" line={`${n(u.storage.files.count)} files, ${n(u.storage.images.count)} pictures`} />
        </div>
      </div>
    </div>
  );
}

/** The plan gifts and ends, with their reasons (from the admin audit log) */
export function PlanHistoryList({ rows }: { rows?: PlanHistoryRow[] }) {
  const { data } = useAiPlans();
  if (!rows?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Plan history</CardTitle>
        <CardDescription>Plans given or ended by a super admin, newest first</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.map((r, i) => (
          <div key={i} className="px-6 py-3 border-t border-border flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6">
            <div className="text-xs text-muted-foreground w-32 shrink-0 pt-0.5">{timeText(r.at)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-foreground">
                {r.action === "gift" ? `Gifted ${planNameOf(data?.plans, r.plan)}${r.expires_at ? ` until ${dayText(r.expires_at)}` : ""}` : "Moved to Free"}
                {r.by && <span className="text-muted-foreground"> by {r.by}</span>}
              </div>
              {r.reason && <div className="text-sm text-muted-foreground mt-0.5 break-words">Reason: {r.reason}</div>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** The usage history: credits per day and the requests, as the user sees it */
export function UserUsageHistory({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data: hist, isLoading, isFetching, refetch } = useUserUsageHistory(userId, 14, page);
  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!hist) return null;
  const maxDay = Math.max(1, ...hist.perDay.map((d) => d.credits));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold text-foreground">Usage history</div>
        <div className="text-xs text-muted-foreground">{dayText(hist.since)} to {dayText(hist.asOf)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-sm text-muted-foreground">Credits used</div><div className="text-2xl font-semibold mt-1 tabular-nums">{n(hist.total.credits)}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-sm text-muted-foreground">Requests</div><div className="text-2xl font-semibold mt-1 tabular-nums">{n(hist.total.requests)}</div></div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">Credits per day</div>
        <div className="flex items-end gap-1 h-[140px] mt-3 border-b border-border px-1">
          {hist.perDay.map((d) => (
            <div key={d.day} className="flex-1 h-[var(--h)] bg-blue-400 rounded-t" style={pctVar("--h", Math.max(d.credits ? 2 : 0, Math.round((d.credits / maxDay) * 100)))} title={`${dayText(d.day)}: ${n(d.credits)} credits, ${d.requests} requests`} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5"><span>{dayText(hist.perDay[0]?.day)}</span><span>{dayText(hist.perDay[hist.perDay.length - 1]?.day)}</span></div>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {hist.events.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Time</TableHead><TableHead>Model</TableHead><TableHead>What</TableHead><TableHead className="text-right">Credits</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {hist.events.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{timeText(e.at)}</TableCell>
                    <TableCell>{modelName(e.model)}</TableCell>
                    <TableCell>{e.what}</TableCell>
                    <TableCell className="text-right tabular-nums">{n(e.credits)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">No requests in the last {hist.days} days.</div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="icon" aria-label="Previous page" title="Previous page" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-8 w-9"><ChevronLeft className="w-4 h-4" /></Button>
            <Button type="button" variant="outline" size="icon" aria-label="Next page" title="Next page" disabled={page >= hist.pages || isFetching} onClick={() => setPage((p) => Math.min(hist.pages, p + 1))} className="h-8 w-9"><ChevronRight className="w-4 h-4" /></Button>
            <span className="text-xs text-muted-foreground ml-2">Page {page} of {hist.pages}</span>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Refresh" title="Refresh" onClick={() => refetch()} className="h-8 w-8 text-muted-foreground"><RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>
    </div>
  );
}
