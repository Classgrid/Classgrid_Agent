// Which plans each model is in, and the user's plan under the greeting (owner, 2026-11-15, like Claude's app). The
// plans and modelPlans come from the public pricing feed (GET /api/public/ai-pricing), the same one classgrid.in/pricing
// reads; plans are bought only on classgrid.in/pricing.
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { usePlanOverview } from "@/features/shared/queries/usePlanOverview";

export const PRICING_URL = "https://classgrid.in/pricing";

type FeedPlan = { key: string; name: string; comingSoon?: boolean };
type PricingFeed = { plansEnabled: boolean; plans: FeedPlan[]; modelPlans?: Record<string, { key: string; name: string }[]> };

export const usePricingFeed = () => useQuery({
  queryKey: ["ai-pricing-feed"],
  queryFn: async () => (await apiClient.get("/api/public/ai-pricing")).data as PricingFeed,
  staleTime: 5 * 60 * 1000,
});

/** "Pro", "Pro or Max", "Pro, Max or Enterprise" */
export const planList = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`);

/** classgrid.in/pricing: in the computer's browser from the desktop app and Classgrid Code, a new tab on the web */
export function openPricing() {
  const desk = (window as unknown as { classgridDesktop?: { openExternal?: (url: string) => Promise<unknown> } }).classgridDesktop;
  if (desk?.openExternal) { desk.openExternal(PRICING_URL); return; }
  window.open(PRICING_URL, "_blank", "noopener,noreferrer");
}

/**
 * For each model: the names of the plans that include it (no label when every plan does, or plans are off), and
 * whether the user's own plan lacks it (`myPlanKey` null = no plan limits apply to this user).
 */
export function useModelPlans(myPlanKey: string | null | undefined) {
  const { data } = usePricingFeed();
  const on = !!data?.plansEnabled && !!data.modelPlans;
  const buyable = (data?.plans || []).filter((p) => !p.comingSoon);
  return (modelId: string) => {
    if (!on || modelId === "auto") return null;
    const list = data!.modelPlans![modelId];
    if (!list) return null; // a model no plan lists: every plan has it
    if (list.length >= buyable.length) return null;
    const names = list.map((p) => p.name);
    return { label: planList(names), lowest: names[0] || "", locked: !!myPlanKey && !list.some((p) => p.key === myPlanKey) };
  };
}

/** "Free plan · Upgrade" under the greeting (plans on, and only for users plans apply to) */
export function PlanPill() {
  const { data } = usePlanOverview();
  const { data: feed } = usePricingFeed();
  if (!data?.enabled || !data.plan?.name) return null;
  const buyable = (feed?.plans || []).filter((p) => !p.comingSoon);
  const top = buyable.length > 0 && buyable[buyable.length - 1]?.key === data.plan.key;
  return (
    <div className="flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground select-none">
      <span>{data.plan.name} plan</span>
      {!top && (
        <>
          <span aria-hidden>·</span>
          <button type="button" onClick={openPricing} className="underline underline-offset-2 hover:text-foreground cursor-pointer">Upgrade</button>
        </>
      )}
    </div>
  );
}
