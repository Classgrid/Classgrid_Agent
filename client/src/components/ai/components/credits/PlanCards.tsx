// The plans (Free, Pro, Max, Enterprise) as the super admin set them, with the user's current plan and a buy button
// for a month or a year. Shown only while plans are on.
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Crown } from "lucide-react";
import { apiClient as api } from "@/lib/apiClient";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";

type Plan = {
  key: string; name: string; tagline: string; coming_soon: boolean;
  price_inr_monthly: number; price_inr_yearly: number; student_price_inr_monthly: number; student_price_inr_yearly: number;
  features_text: string[];
};
type MyPlan = { enabled: boolean; key: string; name: string; status: string; billing: string; expires_at: string | null };

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const desktop = () => ((window as any).classgridDesktop?.isDesktop ? { clientApp: "desktop" } : {});

export function PlanCards({ onCheckout }: { onCheckout: (url: string) => Promise<void> | void }) {
  const [term, setTerm] = useState<"month" | "year">("month");
  const { data: plans, isLoading } = useQuery({ queryKey: ["ai-plans"], queryFn: async () => (await api.get("/api/ai/plans")).data as { enabled: boolean; plans: Plan[] } });
  const { data: mine } = useQuery({ queryKey: ["my-ai-plan"], queryFn: async () => (await api.get("/api/ai/plan")).data as MyPlan });
  const buy = useMutation({
    mutationFn: async (key: string) => (await api.post("/api/ai/topup/plan", { plan: key, term, ...desktop() })).data?.data,
    onSuccess: async (data) => { if (data?.checkout_url) await onCheckout(data.checkout_url); },
    onError: (e: any) => toast.error(e?.response?.data?.error || "Could not start the payment. Please try again."),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!plans?.enabled || !plans.plans?.length) return null;

  const current = mine?.key || "free";
  const until = mine?.expires_at ? new Date(mine.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> Plans</h3>
        <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
          <button type="button" onClick={() => setTerm("month")} className={`px-3 py-1 rounded-md ${term === "month" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Monthly</button>
          <button type="button" onClick={() => setTerm("year")} className={`px-3 py-1 rounded-md ${term === "year" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Yearly</button>
        </div>
      </div>
      {mine && current !== "free" && (
        <p className="text-sm text-muted-foreground mb-4">You are on <span className="font-medium text-foreground">{mine.name}</span>{until ? ` until ${until}` : ""}. Buying again adds the time after that.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {plans.plans.map((p) => {
          const price = term === "year" ? p.price_inr_yearly : p.price_inr_monthly;
          const student = term === "year" ? p.student_price_inr_yearly : p.student_price_inr_monthly;
          const isCurrent = current === p.key;
          const buyable = !p.coming_soon && p.key !== "free" && price > 0;
          return (
            <div key={p.key} className={`rounded-xl border p-5 flex flex-col gap-3 ${isCurrent ? "border-foreground" : "border-border"} bg-card`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{p.name}</span>
                  {isCurrent && <span className="text-xs rounded-full bg-foreground text-background px-2 py-0.5">Your plan</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{p.tagline}</div>
              </div>
              <div>
                {price < 0 ? <span className="text-xl font-bold">Contact us</span> : price === 0 ? <span className="text-xl font-bold">Free</span> : (
                  <>
                    <span className="text-2xl font-bold">{inr(price)}</span>
                    <span className="text-sm text-muted-foreground"> / {term === "year" ? "year" : "month"}</span>
                    {student > 0 && student < price && <div className="text-xs text-muted-foreground">Students {inr(student)}</div>}
                  </>
                )}
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5 flex-1">
                {(p.features_text || []).map((f, i) => <li key={i} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" /><span>{f}</span></li>)}
              </ul>
              {p.coming_soon ? (
                <Button variant="outline" disabled className="w-full">Coming soon</Button>
              ) : buyable ? (
                <Button className="w-full" onClick={() => buy.mutate(p.key)} disabled={buy.isPending}>
                  {buy.isPending && buy.variables === p.key ? "Opening payment..." : isCurrent ? `Add 1 ${term}` : `Get ${p.name}`}
                </Button>
              ) : (
                <Button variant="outline" disabled className="w-full">{isCurrent ? "Your plan" : "Included"}</Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
