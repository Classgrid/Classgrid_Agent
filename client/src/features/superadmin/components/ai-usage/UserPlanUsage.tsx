// Plans & Usage, one user (owner, 2026-11-17): the user's plan first (name, status, dates, bought or gifted and why),
// then the same usage bars the user sees in Settings > Usage (planOverviewFor on the server), then the plan gifts and
// the usage history. Read only, except the buttons, which open the gift forms.
//
// Also the payments (plans bought for a month or a year, and credit top-ups) from detail.payments, and the WhatsApp
// calls of today, this week and this month next to the plan's call limits (detail.callCounts).
import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Gift, RefreshCw, Gauge, BadgeCheck } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Badge } from "@/components/marketing_ui/badge";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/marketing_ui/table";
import { n, inText, dayText, timeText, type Meter, type PlanOverview } from "@/features/shared/queries/usePlanOverview";
import { modelName } from "@/features/shared/components/settings/modelName";
import {
  useAiPlans, planNameOf, useUserUsageHistory,
  type CallCount, type Payment, type PlanHistoryRow, type StudentInfo, type UserDetail,
} from "@/features/superadmin/queries/useAiUsage";
import { StudentPriceRow, EndPlanButton } from "./UserPlanCard";
import { Section } from "./Section";
import { isPast, planSourceText, scrollToId, type UserPlan } from "./planText";

export type { PlanHistoryRow };

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

/** The plan at the top of the person's page */
export function PlanHeaderCard({ userId, plan, planKey, student, staff, plansEnabled, firstName, customWindowLimit }: {
  userId: string; plan?: UserPlan | null; planKey?: string; student?: StudentInfo; staff?: boolean;
  plansEnabled?: boolean; firstName: string; customWindowLimit?: number | null;
}) {
  const { data } = useAiPlans();
  const storedKey = plan?.id || "free";
  // The plan in force comes from the server (planKey); an ended or cancelled paid plan is Free there
  const key = planKey || (storedKey !== "free" && !isPast(plan?.expires_at) && plan?.status !== "expired" && plan?.status !== "cancelled" ? storedKey : "free");
  const isFree = key === "free";
  const ended = isFree && storedKey !== "free";
  const gifted = plan?.billing === "granted";
  const due = !isFree && plan?.status === "past_due";

  return (
    <Section icon={BadgeCheck} title="Plan" right={<Button type="button" variant="primary" size="sm" onClick={() => scrollToId("gift")}><Gift className="w-4 h-4 mr-2" />Gift a plan</Button>}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl font-semibold text-foreground">{planNameOf(data?.plans, key)}</span>
          <Badge variant={due ? "warning" : "neutral"}>{due ? "Payment due" : "Active"}</Badge>
        </div>
        {ended && (
          <p className="text-sm text-muted-foreground -mt-2">
            Was on {planNameOf(data?.plans, storedKey)}{plan?.expires_at ? ` until ${dayText(plan.expires_at)}` : ""}{gifted ? ", as a gift" : ""}.
          </p>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Fact label="How">{isFree ? "Free plan" : planSourceText(plan)}</Fact>
          <Fact label="Since">{isFree ? "Since sign up" : dayText(plan?.started_at) || "Not saved"}</Fact>
          <Fact label="Until">{isFree ? "No end" : plan?.expires_at ? dayText(plan.expires_at) : "No end date"}</Fact>
          <Fact label="Time left">{!isFree && plan?.expires_at ? inText(plan.expires_at) : "No end"}</Fact>
        </div>
        {!isFree && gifted && plan?.note && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm break-words">
            <span className="text-muted-foreground">Reason: </span><span className="text-foreground">{plan.note}</span>
          </div>
        )}
        {(plansEnabled === false || staff || customWindowLimit != null) && (
          <div className="flex flex-col gap-1">
            {plansEnabled === false && <p className="text-xs text-muted-foreground">Plans are off, so {firstName} gets the limits under Settings on the Plans & Usage page.</p>}
            {staff && <p className="text-xs text-muted-foreground">Classgrid staff accounts (super admins and @classgrid.in emails) use the limits under Settings, not a plan.</p>}
            {customWindowLimit != null && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {firstName} has their own session limit of {n(customWindowLimit)} credits, set by hand earlier. It is used instead of the plan's.
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3 pt-3 border-t border-border">
          <StudentPriceRow userId={userId} student={student} />
          {!isFree && <div className="flex justify-end -mb-2"><EndPlanButton userId={userId} plan={plan} /></div>}
        </div>
      </div>
    </Section>
  );
}

// ── The usage bars (the user's Settings > Usage page, plus pictures and storage) ──
function UsageBar({ name, m, unit, line }: { name: string; m: Meter | null | undefined; unit: string; line?: string }) {
  if (!m) return null;
  const notIn = m.limit === 0;
  const unlimited = m.limit === null || (m.limit !== null && m.limit < 0);
  const pct = !notIn && !unlimited && m.limit ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0;
  const right = notIn ? "Not in plan" : unlimited ? "No limit" : `${pct}% used`;
  const amount = notIn ? "" : unlimited ? `${n(m.used)} ${unit} used` : `${n(m.used)} of ${n(m.limit as number)} ${unit}`;
  return (
    <div className="px-4 py-3.5 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className={`text-sm ${notIn ? "text-muted-foreground" : "text-foreground"}`}>{name}</span>
        <span className={`text-sm tabular-nums whitespace-nowrap ${pct >= 100 ? "text-red-500" : notIn ? "text-muted-foreground" : "text-foreground/80"}`}>{right}</span>
      </div>
      {!notIn && (
        <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
          {!unlimited && <div className={`h-full w-[var(--w)] rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-blue-400"}`} style={pctVar("--w", pct)} />}
        </div>
      )}
      {!notIn && <div className="text-xs text-muted-foreground mt-1.5">{[amount, line].filter(Boolean).join(" · ")}</div>}
    </div>
  );
}

/** "3 of 5" or "3" (no limit) */
const countOf = (c: CallCount) => `${n(c.used)}${c.limit !== null && c.limit >= 0 ? ` of ${n(c.limit)}` : ""}`;

/** The WhatsApp calls row: counts only, no bar (the plan limits calls per day, week and month at once) */
function CallsRow({ calls }: { calls: NonNullable<UserDetail["callCounts"]> }) {
  return (
    <div className="px-4 py-3.5 border-b border-border last:border-b-0">
      <div className="text-sm text-foreground">WhatsApp calls</div>
      <div className="text-xs text-muted-foreground mt-1.5">
        Today {countOf(calls.day)} · this week {countOf(calls.week)} · this month {countOf(calls.month)}
      </div>
    </div>
  );
}

const resets = (iso?: string | null) => (iso ? `Resets ${inText(iso)}` : "");
const per = (text?: string) => (text ? `per ${text.replace(/^1 /, "")}` : "");
const joined = (...parts: string[]) => parts.filter(Boolean).join(" · ");

export function PlanUsageBars({ overview, callCounts, firstName }: { overview?: PlanOverview | null; callCounts?: UserDetail["callCounts"]; firstName: string }) {
  const u = overview?.usage;
  return (
    <Section icon={Gauge} title="Usage now" note={`The same numbers ${firstName} sees in Settings > Usage.`}>
      {!u ? (
        <p className="text-sm text-muted-foreground">Could not read the usage right now.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground mb-2">Credits</div>
            <div className="rounded-xl border border-border bg-background/40">
              <UsageBar name="Session" m={u.credits_window} unit="credits" line={joined(u.credits_window?.periodText ? `${u.credits_window.periodText} from the first message` : "", resets(u.credits_window?.resetAt))} />
              <UsageBar name="Week" m={u.credits_week} unit="credits" line={resets(u.credits_week?.resetAt)} />
              <UsageBar name="Claude" m={u.claude_week} unit="credits" line={joined("Sonnet, Opus and Haiku", resets(u.claude_week?.resetAt))} />
              <UsageBar name="Fable" m={u.fable_week} unit="credits" line={resets(u.fable_week?.resetAt)} />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground mb-2">Pictures, calls, WhatsApp, voice and storage</div>
            <div className="rounded-xl border border-border bg-background/40">
              <UsageBar name="Pictures" m={u.images} unit="pictures" line={joined(per(u.images?.periodText), resets(u.images?.resetAt))} />
              <UsageBar name="WhatsApp call minutes" m={u.call_minutes} unit="minutes" line={joined(per(u.call_minutes?.periodText), resets(u.call_minutes?.resetAt))} />
              {callCounts && <CallsRow calls={callCounts} />}
              <UsageBar name="WhatsApp messages" m={u.whatsapp} unit="messages" line={joined(per(u.whatsapp?.periodText), resets(u.whatsapp?.resetAt))} />
              <UsageBar name="Voice" m={u.voice_input_minutes} unit="minutes" line="today · Resets at midnight" />
              <UsageBar name="Read aloud" m={u.voice_replies} unit="replies" line="today · Resets at midnight" />
              <UsageBar name="Storage" m={{ used: u.storage.usedMb, limit: u.storage.limit }} unit="MB" line={`${n(u.storage.files.count)} files, ${n(u.storage.images.count)} pictures`} />
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

/** A small heading inside the History section */
export function HistoryHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-2">{children}</h3>;
}

/** The plan gifts and ends, with their reasons (from the admin audit log, plus the current gift saved on the plan) */
export function PlanHistoryList({ rows }: { rows?: PlanHistoryRow[] }) {
  const { data } = useAiPlans();
  if (!rows?.length) return <p className="text-sm text-muted-foreground">No plan changes by a super admin.</p>;
  return (
    <div className="rounded-xl border border-border divide-y divide-border">
      {rows.map((r, i) => (
        <div key={i} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6">
          <div className="text-xs text-muted-foreground sm:w-32 shrink-0 pt-0.5">{timeText(r.at)}</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-foreground">
              {r.action === "gift" ? `Gifted ${planNameOf(data?.plans, r.plan)}${r.expires_at ? ` until ${dayText(r.expires_at)}` : ""}` : "Moved to Free"}
              {r.by && <span className="text-muted-foreground"> by {r.by}</span>}
              {r.saved_on_plan && <span className="text-muted-foreground"> (from before the history was kept)</span>}
            </div>
            {r.reason && <div className="text-sm text-muted-foreground mt-0.5 break-words">Reason: {r.reason}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A payment's status as a badge: never green (owner's rule) */
function PaymentStatus({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s === "success") return <Badge variant="neutral">Paid</Badge>;
  if (s === "pending") return <Badge variant="warning">Pending</Badge>;
  if (s === "failed") return <Badge variant="danger">Failed</Badge>;
  return <Badge variant="neutral">{s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown"}</Badge>;
}

/** The payments of one person, newest first: plans bought for a month or a year, and credit top-ups */
export function PaymentsList({ payments }: { payments?: Payment[] }) {
  const { data } = useAiPlans();
  if (!payments?.length) return <p className="text-sm text-muted-foreground">No payments yet.</p>;
  return (
    <div className="rounded-xl border border-border divide-y divide-border">
      {payments.map((p) => (
        <div key={p.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
          <div className="text-xs text-muted-foreground sm:w-32 shrink-0">{timeText(p.at)}</div>
          <div className="min-w-0 flex-1 text-sm text-foreground">
            {p.kind === "plan" ? (
              <>
                {planNameOf(data?.plans, p.plan_key)}, {p.plan_term === "year" ? "1 year" : "1 month"}
                {p.period_start && p.period_end && <span className="text-muted-foreground"> · {dayText(p.period_start)} to {dayText(p.period_end)}</span>}
              </>
            ) : (
              <>Top-up, {n(p.credits_added || 0)} credits</>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-medium text-foreground tabular-nums">₹{Number(p.amount_inr || 0).toLocaleString("en-IN")}</span>
            <PaymentStatus status={p.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The usage history: credits per day and the requests, as the user sees it */
export function UserUsageHistory({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data: hist, isLoading, isFetching, refetch } = useUserUsageHistory(userId, 14, page);
  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!hist) return <p className="text-sm text-muted-foreground">Could not read the usage history right now.</p>;
  const maxDay = Math.max(1, ...hist.perDay.map((d) => d.credits));
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-muted-foreground">{dayText(hist.since)} to {dayText(hist.asOf)}</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-background/40 p-4"><div className="text-sm text-muted-foreground">Credits used</div><div className="text-2xl font-semibold mt-1 tabular-nums">{n(hist.total.credits)}</div></div>
        <div className="rounded-xl border border-border bg-background/40 p-4"><div className="text-sm text-muted-foreground">Requests</div><div className="text-2xl font-semibold mt-1 tabular-nums">{n(hist.total.requests)}</div></div>
      </div>
      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="text-sm font-semibold text-foreground">Credits a day</div>
        <div className="flex items-end gap-1 h-[140px] mt-3 border-b border-border px-1">
          {hist.perDay.map((d) => (
            <div key={d.day} className="flex-1 h-[var(--h)] bg-blue-400 rounded-t" style={pctVar("--h", Math.max(d.credits ? 2 : 0, Math.round((d.credits / maxDay) * 100)))} title={`${dayText(d.day)}: ${n(d.credits)} credits, ${d.requests} requests`} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5"><span>{dayText(hist.perDay[0]?.day)}</span><span>{dayText(hist.perDay[hist.perDay.length - 1]?.day)}</span></div>
      </div>
      <div className="rounded-xl border border-border bg-background/40 overflow-hidden">
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
