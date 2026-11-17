// Plans & Usage (owner, 2026-11-17): the plans as they are now, read live from the plan table (the same rows Plans &
// Billing edits and the chat enforces): each plan's price, its session and weekly credits, Claude credits, images and
// call minutes. Nothing is edited here: the link opens Plans & Billing.
//
// Each card also says how many people are on the plan now, how many bought it and how many were gifted it, and how
// many end in the next 7 days (GET /plans/summary). "See people" filters the people list below to that plan.
import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useAiPlans, usePlansSummary, type PlanCount, type PlanRow } from "@/features/superadmin/queries/useAiUsage";
import { Section } from "./Section";
import { peopleText, planLines, priceText } from "./planText";

const num = (v: number) => Math.round(v || 0).toLocaleString("en-IN");

export function PlansSummary({ onSeePeople }: { onSeePeople: (planKey: string) => void }) {
  const plansQuery = useAiPlans();
  const summaryQuery = usePlansSummary();
  const table = plansQuery.data;
  const summary = summaryQuery.data;
  const enabled = summary?.enabled ?? table?.enabled;
  const isLoading = plansQuery.isLoading || summaryQuery.isLoading;
  const isError = plansQuery.isError || summaryQuery.isError;

  // The plan table gives the prices and limits; the summary gives the counts. A plan only in one of them still shows.
  const counts = new Map<string, PlanCount>((summary?.plans || []).map((p) => [p.key, p]));
  const rows: PlanRow[] = (table?.plans || []).slice();
  for (const p of summary?.plans || []) if (!rows.some((r) => r.key === p.key)) rows.push({ key: p.key, name: p.name, sort: p.sort, coming_soon: p.coming_soon, is_public: p.is_public });
  rows.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  const paidCounts = (summary?.plans || []).filter((p) => p.key !== "free");
  const paid = paidCounts.reduce((s, p) => s + (p.people || 0), 0);
  const bought = paidCounts.reduce((s, p) => s + (p.bought || 0), 0);
  const gifted = paidCounts.reduce((s, p) => s + (p.gifted || 0), 0);

  const retry = () => { plansQuery.refetch(); summaryQuery.refetch(); };

  return (
    <Section
      icon={Layers}
      title="Plans"
      badge={enabled === undefined ? null : <Badge variant={enabled ? "neutral" : "warning"}>{enabled ? "Plans are on" : "Plans are off"}</Badge>}
      note={enabled === false
        ? "Plans are off, so everyone gets the limits under Settings, lower on this page."
        : "Everyone gets the limits of their plan. Change plans in Plans & Billing."}
      right={
        <Link
          to="/super-admin/billing/plans"
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Open Plans & Billing
          <ArrowRight className="w-4 h-4" />
        </Link>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : isError || !rows.length ? (
        <div className="py-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">Could not read the plans right now.</p>
          <Button type="button" variant="outline" size="sm" onClick={retry}>Try again</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {summary && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-foreground">
                {peopleText(summary.total)} · {num(paid)} on a paid plan · {num(bought)} bought · {num(gifted)} gifted
              </p>
              {summary.staff > 0 && (
                <p className="text-xs text-muted-foreground">
                  {num(summary.staff)} Classgrid staff accounts (super admins and @classgrid.in emails) use the limits under Settings, not their plan.
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {rows.map((p) => {
              const c = counts.get(p.key);
              const isFree = p.key === "free";
              return (
                <div key={p.key} className="rounded-xl border border-border bg-background/40 p-4 flex flex-col gap-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-foreground truncate">{p.name}</div>
                    {p.coming_soon ? <Badge variant="warning" className="shrink-0">Coming soon</Badge> : p.is_public === false ? <Badge variant="neutral" className="shrink-0">Hidden</Badge> : null}
                  </div>
                  <div>
                    <div className="text-foreground">
                      <span className="text-2xl font-bold tabular-nums">{num(c?.people || 0)}</span>
                      <span className="text-sm text-muted-foreground"> {(c?.people || 0) === 1 ? "person" : "people"}</span>
                    </div>
                    {isFree ? (
                      <p className="text-xs text-muted-foreground mt-0.5">Everyone without a paid plan</p>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mt-0.5">{num(c?.bought || 0)} bought · {num(c?.gifted || 0)} gifted</p>
                        {(c?.endingSoon || 0) > 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{num(c?.endingSoon || 0)} end in the next 7 days</p>}
                      </>
                    )}
                  </div>
                  <div className="text-sm font-medium text-foreground tabular-nums">
                    {priceText(p.price_inr_monthly)}
                    {Number(p.price_inr_monthly) > 0 && <span className="text-xs font-normal text-muted-foreground"> / month</span>}
                  </div>
                  <dl className="flex flex-col gap-1.5 text-sm border-t border-border pt-3">
                    {planLines(p).map((l) => (
                      <div key={l.label} className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted-foreground shrink-0">{l.label}</dt>
                        <dd className={`text-right tabular-nums ${l.value === "Not included" ? "text-muted-foreground" : "text-foreground"}`}>{l.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Button type="button" variant="ghost" size="sm" className="mt-auto self-start -ml-2 font-medium" onClick={() => onSeePeople(p.key)}>
                    See people
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Section>
  );
}
