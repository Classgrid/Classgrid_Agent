// Settings → Billing (owner's mockup, 2026-11-14): the subscription, the plans with a monthly / yearly switch and
// the upgrade buttons, buying top-up credits (amount and slider), the credit balances, and the payment history.
// Website: upgrading goes to classgrid.in/pricing (a plan picked there starts its payment back in the chat). The
// desktop app and Classgrid Code buy in the app. A top-up is paid in the app everywhere.
import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Check } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { BlueSlider } from "@/components/marketing_ui/BlueSlider";
import { apiClient as api } from "@/lib/apiClient";
import { usePlanOverview, usePlans, inr, n, dayText, type PlanRow } from "@/features/shared/queries/usePlanOverview";
import { useUserProfile } from "@/features/shared/queries/useUserProfile";
import { startPlanPayment, openCheckout, type Term } from "@/components/ai/components/credits/planPayment";
import { Section, Row, btn, btnPrimary } from "./SettingsBits";
import { AiCreditsPanel } from "@/components/ai/components/credits/AiCreditsPanel";

const WEBSITE = import.meta.env.VITE_DESKTOP !== "1" && import.meta.env.VITE_EDITOR !== "1";
const PRICING_URL = import.meta.env.VITE_PRICING_URL || "https://classgrid.in/pricing";
const PLAN_NAMES: Record<string, string> = { free: "Free", pro: "Pro", max: "Max", enterprise: "Enterprise" };


function PlanCard({ p, term, rank, myRank, onBuy, busy }: { p: PlanRow; term: Term; rank: number; myRank: number; onBuy: (key: string) => void; busy: boolean }) {
  const price = term === "year" ? p.price_inr_yearly : p.price_inr_monthly;
  const mine = rank === myRank;
  const lines = (p.features_text || []).slice(0, 4);
  const contact = p.coming_soon || price < 0;
  const button = contact
    ? <a className={`${btn} w-full`} href="https://classgrid.in/contact" target="_blank" rel="noreferrer">Talk to us</a>
    : price === 0
      ? <span className={`${btn} w-full opacity-50`}>{myRank === 0 ? "Your plan" : "Included"}</span>
      : rank < myRank
        ? <span className={`${btn} w-full opacity-50`}>Included in your plan</span>
        : <button type="button" className={`${rank > myRank ? btnPrimary : btn} w-full`} disabled={busy} onClick={() => onBuy(p.key)}>
            {mine ? `Renew for ${inr(price)}` : `Upgrade to ${p.name}`}
          </button>;
  return (
    <div className={`rounded-xl border bg-card p-4 flex flex-col gap-3 ${rank === myRank + 1 ? "border-foreground" : "border-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{p.name}</span>
        {mine && <span className="text-[11px] text-muted-foreground border border-border rounded-full px-2 py-0.5">Your plan</span>}
      </div>
      <div className="text-xl font-semibold text-foreground">
        {contact ? <span className="text-base">Contact us</span> : price === 0 ? "₹0" : <>{inr(price)} <span className="text-xs font-normal text-muted-foreground">a {term}</span></>}
      </div>
      <ul className="flex flex-col gap-1.5 flex-1">
        {lines.map((l, i) => <li key={i} className="flex gap-2 text-xs text-foreground/85 leading-[18px]"><Check className="size-3.5 shrink-0 mt-0.5 text-emerald-500" />{l}</li>)}
      </ul>
      {button}
    </div>
  );
}

export function SettingsBillingSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = usePlanOverview();
  const { data: plans } = usePlans();
  const { data: profile } = useUserProfile();
  const [term, setTerm] = useState<Term>("month");
  // Owner's order: this one account can top up from ₹1 (everyone else starts at ₹299). The server checks it too.
  const minInr = String(profile?.email || "").trim().toLowerCase() === "nikhilsubsun123@gmail.com" ? 1 : 299;
  const [amount, setAmount] = useState(500);
  const perInr = data?.balance.credits_per_inr || 3000;

  const buyPlan = useMutation({
    mutationFn: async (key: string) => openCheckout(await startPlanPayment(key, term)),
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || "Could not start the payment. Please try again."),
  });
  const topUp = useMutation({
    mutationFn: async (amountInr: number) => {
      const res = (await api.post("/api/ai/topup/initiate", { amount_inr: amountInr, ...((window as any).classgridDesktop?.isDesktop ? { clientApp: "desktop" } : {}) })).data?.data;
      if (!res?.checkout_url) throw new Error("Could not start the payment. Please try again.");
      await openCheckout(res.checkout_url);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || "Could not start the payment. Please try again."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["ai-plan-overview"] }),
  });

  const sorted = useMemo(() => (plans?.plans || []).slice(), [plans]);
  const myRank = Math.max(0, sorted.findIndex((p) => p.key === (data?.plan.key || "free")));
  const buy = (key: string) => (WEBSITE ? window.location.assign(PRICING_URL) : buyPlan.mutate(key));

  if (isLoading || !data) return <div className="flex flex-col gap-4"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;

  const name = data.enabled ? data.plan.name : "Free";
  const mineRow = sorted.find((p) => p.key === data.plan.key);
  const price = mineRow && mineRow.price_inr_monthly > 0 ? `${inr(mineRow.price_inr_monthly)} a month` : "";
  const onTop = data.plan.subscribed && sorted.length > 0 && sorted.filter((p) => !p.coming_soon && p.price_inr_monthly > 0).slice(-1)[0]?.key === data.plan.key;
  const yearSave = (() => { const p = sorted.find((x) => x.price_inr_yearly > 0 && x.price_inr_monthly > 0); return p ? Math.max(0, Math.round(100 - (p.price_inr_yearly / (p.price_inr_monthly * 12)) * 100)) : 0; })();

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Billing</h2>
      <p className="text-sm text-muted-foreground mt-1">Your plan, upgrades, credits and payments.</p>

      <Section title="Subscription">
        <Row
          title={<span className="flex items-center gap-2">{name}{data.plan.subscribed && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3" /> Subscribed</span>}</span>}
          desc={[price, data.plan.expires_at ? `paid until ${dayText(data.plan.expires_at)}` : data.plan.subscribed ? "no end date" : "", data.plan.subscribed ? "does not renew by itself" : "Pro gives Claude, more pictures, calls and projects"].filter(Boolean).join(" · ")}
        >
          {!onTop && data.enabled && <a className={btnPrimary} href="#plans">Upgrade</a>}
          {data.plan.subscribed && mineRow && mineRow.price_inr_monthly > 0 && <button type="button" className={btn} disabled={buyPlan.isPending} onClick={() => buy(mineRow.key)}>Renew for {inr(mineRow.price_inr_monthly)}</button>}
        </Row>
      </Section>

      {data.enabled && sorted.length > 0 && (
        <div id="plans">
          <Section title="Plans" action={
            <div className="inline-flex items-center rounded-lg bg-black/[0.05] dark:bg-white/[0.07] p-0.5">
              {(["month", "year"] as Term[]).map((t) => (
                <button key={t} type="button" onClick={() => setTerm(t)} className={`h-7 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${term === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "month" ? "Monthly" : `Yearly${yearSave ? ` · save ${yearSave}%` : ""}`}
                </button>
              ))}
            </div>
          }>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 bg-transparent">
              {sorted.map((p, i) => <PlanCard key={p.key} p={p} term={term} rank={i} myRank={myRank} onBuy={buy} busy={buyPlan.isPending} />)}
            </div>
          </Section>
          <p className="text-xs text-muted-foreground mt-2">
            {sorted.some((p) => p.student_price_inr_monthly > 0 && p.student_price_inr_monthly < p.price_inr_monthly) ? `Students pay less: ${sorted.filter((p) => p.student_price_inr_monthly > 0 && p.student_price_inr_monthly < p.price_inr_monthly).map((p) => `${p.name} ${inr(p.student_price_inr_monthly)}`).join(", ")} a month. ` : ""}
            Prices include GST. A plan is paid once for a month or a year. {WEBSITE && <a href={PRICING_URL} className="underline underline-offset-2">Full comparison</a>}
          </p>
        </div>
      )}

      <Section title="Credits">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <div className="text-sm font-medium text-foreground">Add credits</div>
              <div className="text-xs text-muted-foreground mt-0.5">Used only after your plan's limits. Paid once, valid for 30 days.</div>
              <div className="flex items-center gap-3 mt-4">
                <label className="flex items-center h-10 px-3 rounded-lg border border-border bg-background text-base font-semibold gap-1.5 w-40">
                  <span className="text-muted-foreground font-normal">₹</span>
                  <input aria-label="Amount in rupees" type="number" min={minInr} max={10000} value={amount} onChange={(e) => setAmount(Math.max(0, Math.min(10000, Number(e.target.value) || 0)))} className="w-full bg-transparent outline-none" />
                </label>
                <span className="text-xs text-muted-foreground">{inr(minInr)} to ₹10,000</span>
              </div>
              <div className="mt-4 max-w-md">
                <BlueSlider min={minInr} max={10000} step={1} value={Math.max(minInr, Math.min(10000, amount))} onValueChange={(v: number) => setAmount(v)} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">You get</div>
              <div className="text-xl font-semibold text-foreground mt-0.5">{n(amount * perInr)} credits</div>
              <div className="text-xs text-muted-foreground mt-0.5">₹1 = {n(perInr)} credits · GST included</div>
              <button type="button" className={`${btnPrimary} mt-3 px-5`} disabled={topUp.isPending || amount < minInr || amount > 10000} onClick={() => topUp.mutate(amount)}>
                {topUp.isPending ? "Opening payment…" : "Buy credits"}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Granted credits and bought credits, each with its own card, and the billing history (the AI Credits panel as it was) */}
      <Section title="Credit details and billing history">
        <AiCreditsPanel embedded />
      </Section>
      <p className="text-xs text-muted-foreground mt-2">Receipts are sent to your email. Prices include GST.</p>
    </div>
  );
}
