// The plans (Free, Pro, Max, Enterprise) as the super admin set them: price for the chosen term, student price, the
// lines of the pricing page, the user's current plan, and a buy button that starts the Razorpay payment on
// billing.classgrid.in (POST /api/ai/topup/plan). Shown only while plans are on. Used by the Upgrade page
// (AiUpgradePanel) in the website, the desktop app and Classgrid Code alike.
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { apiClient as api } from "@/lib/apiClient";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";

export type Plan = {
  key: string; name: string; tagline: string; coming_soon: boolean;
  price_inr_monthly: number; price_inr_yearly: number; student_price_inr_monthly: number; student_price_inr_yearly: number;
  features_text: string[];
};
export type MyPlan = {
  enabled: boolean; key: string; name: string; status: string; billing: string; expires_at: string | null; started_at?: string | null;
  limits: { tokens_per_window: number; window_reset_value: number; window_reset_unit: string; tokens_per_week: number; claude_credits_per_week: number; fable_share_percent: number; images_per_period: number; call_minutes_per_period: number; projects_max: number; helpers_per_chat: number } | null;
  week: { used: number; claude_used: number; fable_used: number; ends_at: string | null } | null;
};
export type Term = "month" | "year";

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const desktop = () => ((window as any).classgridDesktop?.isDesktop ? { clientApp: "desktop" } : {});

export const usePlans = () => useQuery({ queryKey: ["ai-plans"], queryFn: async () => (await api.get("/api/ai/plans")).data as { enabled: boolean; plans: Plan[] } });
export const useMyPlan = () => useQuery({ queryKey: ["my-ai-plan"], queryFn: async () => (await api.get("/api/ai/plan")).data as MyPlan });

/** Starts the payment of a plan for a month or a year and returns the checkout link (billing.classgrid.in) */
export async function startPlanPayment(key: string, term: Term): Promise<string> {
  const data = (await api.post("/api/ai/topup/plan", { plan: key, term, ...desktop() })).data?.data;
  if (!data?.checkout_url) throw new Error("Could not start the payment. Please try again.");
  return data.checkout_url as string;
}

export function PlanCards({ term, onCheckout }: { term: Term; onCheckout: (url: string) => Promise<void> | void }) {
  const { data: plans, isLoading } = usePlans();
  const { data: mine } = useMyPlan();
  const buy = useMutation({
    mutationFn: async ({ key, term: t }: { key: string; term: Term }) => startPlanPayment(key, t),
    onSuccess: async (url) => { await onCheckout(url); },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || "Could not start the payment. Please try again."),
  });

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!plans?.enabled || !plans.plans?.length) return null;

  const current = mine?.key || "free";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {plans.plans.map((p) => {
        const price = term === "year" ? p.price_inr_yearly : p.price_inr_monthly;
        const student = term === "year" ? p.student_price_inr_yearly : p.student_price_inr_monthly;
        const isCurrent = current === p.key;
        const buyable = !p.coming_soon && p.key !== "free" && price > 0;
        const monthly = term === "year" && price > 0 ? price / 12 : null;
        return (
          <div key={p.key} className={`rounded-2xl border p-5 flex flex-col gap-4 bg-card ${isCurrent ? "border-foreground shadow-sm" : "border-border"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-lg text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.tagline}</div>
              </div>
              {isCurrent && <span className="shrink-0 text-[11px] font-medium rounded-full bg-foreground text-background px-2 py-0.5">Your plan</span>}
            </div>
            <div className="min-h-[52px]">
              {price < 0 ? (
                <span className="text-2xl font-bold">Contact us</span>
              ) : price === 0 ? (
                <span className="text-2xl font-bold">Free</span>
              ) : (
                <>
                  <span className="text-3xl font-bold">{inr(price)}</span>
                  <span className="text-sm text-muted-foreground"> / {term}</span>
                  {monthly !== null && <div className="text-xs text-muted-foreground">{inr(monthly)} a month, billed yearly</div>}
                  {student > 0 && student < price && <div className="text-xs text-muted-foreground">Students {inr(student)} / {term}</div>}
                </>
              )}
            </div>
            <ul className="text-sm text-muted-foreground space-y-1.5 flex-1">
              {(p.features_text || []).map((f, i) => (
                <li key={i} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" /><span>{f}</span></li>
              ))}
            </ul>
            {p.coming_soon ? (
              <Button variant="outline" disabled className="w-full">Coming soon</Button>
            ) : buyable ? (
              <Button className="w-full" variant={isCurrent ? "outline" : "default"} onClick={() => buy.mutate({ key: p.key, term })} disabled={buy.isPending}>
                {buy.isPending && buy.variables?.key === p.key ? "Opening payment..." : isCurrent ? `Add 1 ${term}` : `Get ${p.name}`}
              </Button>
            ) : (
              <Button variant="outline" disabled className="w-full">{isCurrent ? "Your plan" : "Included"}</Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
