// Gift a plan (owner, 2026-11-17): pick a paid plan from the plan table, how long it lasts (1, 3, 6 months, 1 year or
// an end date) and why. Saved by setUserPlan (PUT /api/super-admin/ai-usage/users/:id/plan), which keeps the reason
// on the plan and in the admin audit log, and emails the user "You're on the Classgrid {Plan} plan".
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Label } from "@/components/marketing_ui/label";
import { Textarea } from "@/components/marketing_ui/textarea";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useAiPlans, useGiftPlan, giftablePlans } from "@/features/superadmin/queries/useAiUsage";
import { errorText } from "./planText";

const PERIODS = [
  { key: "1", label: "1 month", months: 1 },
  { key: "3", label: "3 months", months: 3 },
  { key: "6", label: "6 months", months: 6 },
  { key: "12", label: "1 year", months: 12 },
  { key: "date", label: "End date", months: 0 },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const dayText = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const inr = (v: unknown) => (Number(v) > 0 ? `₹${Math.round(Number(v)).toLocaleString("en-IN")} / month` : "");
/** Today as YYYY-MM-DD in this computer's time (what a date box shows) */
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const monthsFromNow = (months: number) => { const d = new Date(); d.setMonth(d.getMonth() + months); return d; };

export function GiftPlanForm({ userIds, who, onDone, idPrefix = "gift" }: { userIds: string[]; who?: string; onDone?: () => void; idPrefix?: string }) {
  const { data, isLoading } = useAiPlans();
  const plans = useMemo(() => giftablePlans(data?.plans), [data]);
  const gift = useGiftPlan();
  const [picked, setPicked] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("1");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);

  // (the first paid plan until one is picked)
  const plan = plans.find((p) => p.key === picked) || plans[0];
  const choice = PERIODS.find((p) => p.key === period) || PERIODS[0];
  const endOk = choice.months > 0 || (!!endDate && endDate > todayIso());
  const end = choice.months > 0 ? monthsFromNow(choice.months) : endOk ? new Date(`${endDate}T23:59:59`) : null;
  const reasonOk = reason.trim().length > 0;
  const busy = gift.isPending;

  const submit = () => {
    setTried(true);
    if (!plan || !end || !endOk || !reasonOk || !userIds.length) return;
    gift.mutate(
      { userIds, planId: plan.key, reason: reason.trim(), ...(choice.months ? { months: choice.months } : { expiresAt: end.toISOString() }) },
      {
        onSuccess: (count) => {
          toast.success(`${plan.name} plan given to ${count === 1 ? who || "the user" : `${count} users`}, until ${dayText(end)}`);
          setReason("");
          setTried(false);
          onDone?.();
        },
        onError: (e) => toast.error(errorText(e, "Could not give the plan")),
      },
    );
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!plan) return <p className="text-sm text-muted-foreground">There is no paid plan to give. Add one in Plans & Billing.</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Plan</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Plan">
          {plans.map((p) => {
            const on = p.key === plan.key;
            return (
              <Button key={p.key} type="button" variant="outline" role="radio" aria-checked={on} disabled={busy} onClick={() => setPicked(p.key)}
                className={`h-auto justify-start text-left whitespace-normal p-3 font-normal ${on ? "border-foreground ring-1 ring-foreground bg-muted/40" : ""}`}>
                <span className="flex flex-col items-start">
                  <span className="font-semibold text-foreground">{p.name}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">{inr(p.price_inr_monthly) || p.tagline || " "}</span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">How long</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How long">
          {PERIODS.map((p) => (
            <Button key={p.key} type="button" size="sm" role="radio" aria-checked={p.key === period} disabled={busy} onClick={() => setPeriod(p.key)}
              variant={p.key === period ? "default" : "outline"} className="h-9 px-3.5 font-medium">
              {p.label}
            </Button>
          ))}
        </div>
        {period === "date" && (
          <Input id={`${idPrefix}-end`} type="date" min={todayIso()} value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={busy} className="h-9 max-w-[220px] mt-1" aria-label="End date" />
        )}
        {tried && !endOk && <p className="text-xs text-red-500">Pick an end date after today.</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-reason`} className="text-sm font-medium">Reason</Label>
        <Textarea id={`${idPrefix}-reason`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} maxLength={300}
          placeholder="For example: thanks for the bug reports" className="min-h-[64px]" fieldState={tried && !reasonOk ? "error" : "normal"} />
        <p className={`text-xs ${tried && !reasonOk ? "text-red-500" : "text-muted-foreground"}`}>
          {tried && !reasonOk ? "Write why you are giving this plan." : "Saved with the plan and shown in the plan history."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {end ? <>{plan.name} until <span className="text-foreground font-medium">{dayText(end)}</span>. {userIds.length === 1 ? "The user gets" : "Each user gets"} an email.</> : "Pick when the plan ends."}
        </p>
        <Button type="button" size="sm" onClick={submit} isLoading={busy} disabled={!userIds.length} className="shrink-0">
          {!busy && <Gift className="w-4 h-4" />}
          {`Gift ${plan.name}`}{userIds.length > 1 ? ` to ${userIds.length} users` : ""}
        </Button>
      </div>
    </div>
  );
}
