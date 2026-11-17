// Plans & Usage (owner, 2026-11-17): the plans as they are now, read live from the plan table (the same rows Plans &
// Billing edits and the chat enforces): each plan's price, its session and weekly credits, Claude credits, images and
// call minutes. Nothing is edited here: the link opens Plans & Billing.
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/marketing_ui/badge";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useAiPlans } from "@/features/superadmin/queries/useAiUsage";
import { planLines, priceText } from "./planText";

export function PlansSummary() {
  const { data, isLoading, isError } = useAiPlans();
  const plans = (data?.plans || []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground">Plans</h2>
            {data && <Badge variant={data.enabled ? "success" : "neutral"} dot>{data.enabled ? "Plans are on" : "Plans are off"}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.enabled === false
              ? "Plans are off, so everyone uses the limits under When plans are off, lower on this page."
              : "Every user gets the limits of the plan they are on. These numbers come live from the plan table."}
          </p>
        </div>
        <Link
          to="/super-admin/billing/plans"
          className="inline-flex items-center justify-center gap-2 h-9 px-4 shrink-0 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Edit plans in Plans & Billing
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
        </div>
      ) : isError || !plans.length ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Could not read the plans. Open Plans & Billing to check them.</div>
      ) : (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div key={p.key} className="rounded-xl border border-border bg-background/40 p-4 flex flex-col gap-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">{p.name}</div>
                  {p.tagline && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.tagline}</div>}
                </div>
                {p.coming_soon ? <Badge variant="warning" className="shrink-0">Coming soon</Badge> : p.is_public === false ? <Badge variant="neutral" className="shrink-0">Hidden</Badge> : null}
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
