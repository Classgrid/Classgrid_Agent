// Settings → Billing, built exactly like the owner's approved mockup (2026-11-14): Subscription (plan, price,
// paid until, Upgrade and Renew), Plans (monthly / yearly switch, four cards, Upgrade to the bigger one), Credits
// (Add credits with an amount and a slider, "You get … credits", then Top-up balance and Granted credits as two
// separate rows), Payment history (a plain table). Website: upgrading goes to classgrid.in/pricing; the desktop app
// and Classgrid Code buy in the app. A top-up is paid in the app everywhere.
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { BlueSlider } from "@/components/marketing_ui/BlueSlider";
import { apiClient as api } from "@/lib/apiClient";
import { usePlanOverview, usePlans, inr, n, dayText, type PlanRow } from "@/features/shared/queries/usePlanOverview";
import { useUserProfile } from "@/features/shared/queries/useUserProfile";
import { startPlanPayment, openCheckout, type Term } from "@/components/ai/components/credits/planPayment";

const WEBSITE = import.meta.env.VITE_DESKTOP !== "1" && import.meta.env.VITE_EDITOR !== "1";
const PRICING_URL = import.meta.env.VITE_PRICING_URL || "https://classgrid.in/pricing";
const PLAN_NAMES: Record<string, string> = { free: "Free", pro: "Pro", max: "Max", enterprise: "Enterprise" };
const primary = "h-[34px] px-3.5 rounded-lg bg-foreground text-background text-[13px] font-medium inline-flex items-center justify-center cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none";
const plain = "h-[34px] px-3.5 rounded-lg bg-black/[0.06] dark:bg-white/[0.1] text-foreground text-[13px] font-medium inline-flex items-center justify-center cursor-pointer hover:bg-black/[0.09] dark:hover:bg-white/[0.14] disabled:opacity-50 disabled:pointer-events-none";

type Txn = { _id: string; type?: string; amount_inr?: number; credits_added?: number; plan_key?: string; plan_term?: string; status?: string; paymentMethod?: string; paymentTime?: string; createdAt?: string };
const useHistory = () => useQuery({ queryKey: ["my-ai-history"], queryFn: async () => ((await api.get("/api/ai/credits/history")).data?.data || []) as Txn[] });

function H3({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="flex items-center justify-between text-[13px] font-semibold text-foreground mt-7 mb-2"><span>{children}</span>{right}</div>;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card ${className}`}>{children}</div>;
}
const tick = <Check className="size-3.5 shrink-0 mt-0.5 text-emerald-500" />;

export function SettingsBillingSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = usePlanOverview();
  const { data: plans } = usePlans();
  const { data: history } = useHistory();
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
  const subscribed = data.plan.subscribed;
  const mineRow = sorted.find((p) => p.key === data.plan.key);
  const monthly = mineRow && mineRow.price_inr_monthly > 0 ? mineRow.price_inr_monthly : 0;
  const buyable = sorted.filter((p) => !p.coming_soon && p.price_inr_monthly > 0);
  const onTop = subscribed && buyable.length > 0 && buyable[buyable.length - 1]?.key === data.plan.key;
  const yearSave = (() => { const p = sorted.find((x) => x.price_inr_yearly > 0 && x.price_inr_monthly > 0); return p ? Math.max(0, Math.round(100 - (p.price_inr_yearly / (p.price_inr_monthly * 12)) * 100)) : 0; })();
  const under = [monthly ? `${inr(monthly)} a month` : "", data.plan.expires_at ? `paid until ${dayText(data.plan.expires_at)}` : subscribed ? "no end date" : "", subscribed ? "does not renew by itself" : ""].filter(Boolean).join(" · ");
  const students = sorted.filter((p) => p.student_price_inr_monthly > 0 && p.student_price_inr_monthly < p.price_inr_monthly);
  const rows = (history || []).filter((t) => !["pause", "resume", "revoke"].includes(String(t.type || "")));
  const describe = (t: Txn) => t.type === "plan" ? `${PLAN_NAMES[t.plan_key || ""] || t.plan_key} plan, ${t.plan_term === "year" ? "1 year" : "1 month"}`
    : t.type === "topup" ? `Top-up, ${n(t.credits_added || 0)} credits`
    : t.type === "grant" ? `Credits granted by Classgrid, ${n(t.credits_added || 0)}`
    : `${(t.type || "").charAt(0).toUpperCase()}${(t.type || "").slice(1)}${t.credits_added ? `, ${n(t.credits_added)} credits` : ""}`;

  const cardButton = (p: PlanRow, i: number) => {
    const price = term === "year" ? p.price_inr_yearly : p.price_inr_monthly;
    if (p.coming_soon || price < 0) return <a className={plain} href="https://classgrid.in/contact" target="_blank" rel="noreferrer">Talk to us</a>;
    if (price === 0) return <span className={`${plain} opacity-50`}>{i === myRank ? "Your plan" : "Included"}</span>;
    if (i < myRank) return <span className={`${plain} opacity-50`}>Included in {name}</span>;
    if (i === myRank) return <button type="button" className={plain} disabled={buyPlan.isPending} onClick={() => buy(p.key)}>Renew for {inr(price)}</button>;
    return <button type="button" className={primary} disabled={buyPlan.isPending} onClick={() => buy(p.key)}>Upgrade to {p.name}</button>;
  };

  return (
    <div className="max-w-[980px]">
      <h2 className="text-xl font-semibold text-foreground">Billing</h2>
      <p className="text-sm text-muted-foreground mt-1">Your plan, upgrades, credits and payments.</p>

      <H3>Subscription</H3>
      <Card>
        <div className="flex items-center justify-between gap-6 px-5 py-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-semibold text-foreground">{name}</span>
              {subscribed && <span className="inline-flex items-center h-[22px] px-2.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-medium">Subscribed</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{under || (data.enabled ? "Pro gives Claude, more pictures, calls and projects. Max gives five times Pro with Claude Fable." : "Plans are not open yet.")}</div>
          </div>
          <div className="flex items-center gap-2">
            {data.enabled && !onTop && <a className={primary} href="#plans">Upgrade</a>}
            {subscribed && monthly > 0 && <button type="button" className={plain} disabled={buyPlan.isPending} onClick={() => buy(mineRow!.key)}>Renew for {inr(monthly)}</button>}
          </div>
        </div>
      </Card>

      {data.enabled && sorted.length > 0 && (
        <div id="plans">
          <H3 right={
            <span className="inline-flex items-center rounded-full border border-border p-[3px]">
              {(["month", "year"] as Term[]).map((t) => (
                <button key={t} type="button" onClick={() => setTerm(t)} className={`h-[26px] px-3 rounded-full text-xs ${term === t ? "bg-foreground text-background font-medium" : "text-muted-foreground font-normal"}`}>
                  {t === "month" ? "Monthly" : `Yearly${yearSave ? ` · save ${yearSave}%` : ""}`}
                </button>
              ))}
            </span>
          }>Plans</H3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {sorted.map((p, i) => {
              const price = term === "year" ? p.price_inr_yearly : p.price_inr_monthly;
              const contact = p.coming_soon || price < 0;
              return (
                <div key={p.key} className={`rounded-xl border bg-card p-[18px] flex flex-col gap-2.5 ${i === myRank + 1 && !contact ? "border-foreground" : "border-border"}`}>
                  <div className="flex items-center justify-between gap-2 text-[15px] font-semibold text-foreground">
                    {p.name}
                    {i === myRank && <span className="text-[11px] font-medium text-muted-foreground border border-border rounded-full px-2 py-0.5">Your plan</span>}
                    {i === myRank + 1 && !contact && <span className="text-[11px] font-medium text-muted-foreground border border-border rounded-full px-2 py-0.5">Popular</span>}
                  </div>
                  <div className="text-[22px] font-semibold text-foreground">
                    {contact ? <span className="text-[17px]">Contact us</span> : price === 0 ? "₹0" : <>{inr(price)} <span className="text-xs font-normal text-muted-foreground">a {term}</span></>}
                  </div>
                  <ul className="flex flex-col gap-1.5 flex-1">
                    {(p.features_text || []).slice(0, 4).map((l, k) => <li key={k} className="flex gap-2 text-[13px] leading-[18px] text-foreground/85">{tick}{l}</li>)}
                  </ul>
                  <div className="[&>*]:w-full">{cardButton(p, i)}</div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2.5">
            {students.length ? `Students pay less: ${students.map((p) => `${p.name} ${inr(p.student_price_inr_monthly)}`).join(", ")} a month. ` : ""}
            Prices include GST. A plan is paid once for a month or a year. {WEBSITE && <a href={PRICING_URL} className="underline underline-offset-2">Full comparison</a>}
          </p>
        </div>
      )}

      <H3>Credits</H3>
      <Card>
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <div className="text-sm font-medium text-foreground">Add credits</div>
              <div className="text-xs text-muted-foreground mt-0.5">Used only after your plan's limits. Paid once, valid for 30 days.</div>
              <div className="flex items-center gap-3 mt-3.5">
                <label className="flex items-center h-11 px-3.5 rounded-[10px] border border-border bg-background text-lg font-semibold gap-1.5 w-40">
                  <span className="text-muted-foreground font-normal">₹</span>
                  <input aria-label="Amount in rupees" type="number" min={minInr} max={10000} value={amount} onChange={(e) => setAmount(Math.max(0, Math.min(10000, Number(e.target.value) || 0)))} className="w-full bg-transparent outline-none" />
                </label>
                <span className="text-[13px] text-muted-foreground">{inr(minInr)} to ₹10,000</span>
              </div>
              <div className="mt-4 max-w-[420px]">
                <BlueSlider min={minInr} max={10000} step={1} value={Math.max(minInr, Math.min(10000, amount))} onValueChange={(v: number) => setAmount(v)} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">You get</div>
              <div className="text-[22px] font-semibold text-foreground mt-0.5">{n(amount * perInr)} credits</div>
              <div className="text-xs text-muted-foreground mt-0.5">₹1 = {n(perInr)} credits · GST included</div>
              <button type="button" className={`${primary} mt-3 px-5`} disabled={topUp.isPending || amount < minInr || amount > 10000} onClick={() => topUp.mutate(amount)}>
                {topUp.isPending ? "Opening payment…" : "Buy credits"}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 px-5 py-4 border-b border-border">
          <div><div className="text-sm font-medium text-foreground">Top-up balance</div><div className="text-xs text-muted-foreground mt-0.5">Expires 30 days after the top-up</div></div>
          <span className="text-sm text-foreground tabular-nums">{n(data.balance.topup)}</span>
        </div>
        <div className="flex items-center justify-between gap-6 px-5 py-4">
          <div><div className="text-sm font-medium text-foreground">Granted credits</div><div className="text-xs text-muted-foreground mt-0.5">Given by Classgrid</div></div>
          <span className="text-sm text-foreground tabular-nums">{n(data.balance.promotion)}</span>
        </div>
      </Card>

      <H3>Payment history</H3>
      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">No payments yet.</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3 border-b border-border">Date</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3 border-b border-border">Description</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3 border-b border-border">Paid with</th>
                <th className="text-right font-medium text-muted-foreground text-xs px-5 py-3 border-b border-border">Amount</th>
                <th className="text-right font-medium text-muted-foreground text-xs px-5 py-3 border-b border-border">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t._id} className="[&>td]:border-b [&>td]:border-border last:[&>td]:border-b-0">
                  <td className="px-5 py-3.5 text-foreground whitespace-nowrap">{dayText(t.paymentTime || t.createdAt)}</td>
                  <td className="px-5 py-3.5 text-foreground">{describe(t)}</td>
                  <td className="px-5 py-3.5 text-muted-foreground capitalize">{t.paymentMethod || (t.type === "grant" ? "–" : "")}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-foreground">{(t.amount_inr || 0) > 0 ? inr(t.amount_inr || 0) : "–"}</td>
                  <td className="px-5 py-3.5 text-right text-muted-foreground capitalize">{t.status || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-muted-foreground mt-2.5">Receipts are also sent to your email.</p>
    </div>
  );
}
