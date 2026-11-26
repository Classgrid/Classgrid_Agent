// Which plans each model is in, and the user's plan under the greeting (owner, 2026-11-15, like Claude's app). The
// plans and modelPlans come from the public pricing feed (GET /api/public/ai-pricing), the same one classgrid.in/pricing
// reads; plans are bought only on classgrid.in/pricing.
import { useQuery } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { apiClient } from "@/lib/apiClient";
import { queryClient } from "@/lib/queryClient";
import { usePlanOverview, type PlanOverview } from "@/features/shared/queries/usePlanOverview";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/marketing_ui/dialog";

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

/**
 * A plan is bought in ONE place (owner, 2026-11-26, as ChatGPT does): a plan bought in the phone app is a Google Play
 * subscription and is changed there. Every Upgrade button stays; tapped while such a plan is running (active, grace,
 * on hold or paused: the server's playSubscriptionLive, which also refuses the website purchase), it shows this card
 * instead of the pricing page.
 */
export function phonePlanRunning(data: PlanOverview | undefined | null): boolean {
  const plan = data?.plan;
  if (!plan) return false;
  const play = plan.source === "google_play" || plan.billing === "play";
  const state = plan.play_state || "";
  return play && state !== "SUBSCRIPTION_STATE_EXPIRED" && (
    state === "SUBSCRIPTION_STATE_ON_HOLD" || state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" || state === "SUBSCRIPTION_STATE_PAUSED"
    || (!!data?.enabled && !!plan.key && plan.key !== "free"));
}

/** The card: "You can't change your plan here ..." with OK */
export function showPhonePlanCard() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  const close = () => { root.unmount(); el.remove(); };
  root.render(
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-[420px] rounded-[28px] p-6 gap-0 border-0" overlayClassName="supports-backdrop-filter:backdrop-blur-none !backdrop-blur-none !bg-black/40">
        <DialogTitle className="sr-only">Your plan</DialogTitle>
        {/* (like ChatGPT's "You can't make changes to your subscription inside this app" card: big text, one OK pill) */}
        <DialogDescription className="text-[15px] leading-relaxed text-foreground">
          You can't change your plan here, because you bought it in the Classgrid phone app.
        </DialogDescription>
        <p className="text-[15px] leading-relaxed text-foreground mt-3">Please open the Classgrid app, under Settings &gt; Billing, to change your plan.</p>
        <DialogFooter className="mt-6 sm:justify-stretch">
          <button type="button" className="w-full h-11 rounded-full text-[14px] font-medium cursor-pointer bg-foreground text-background hover:bg-foreground/90" onClick={close}>OK</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );
}

/** classgrid.in/pricing: in the computer's browser from the desktop app and Classgrid Code, a new tab on the web */
export function openPricing() {
  if (phonePlanRunning(queryClient.getQueryData<PlanOverview>(["ai-plan-overview"]))) { showPhonePlanCard(); return; }
  const desk = (window as unknown as { classgridDesktop?: { openExternal?: (url: string) => Promise<unknown> } }).classgridDesktop;
  if (desk?.openExternal) { desk.openExternal(PRICING_URL); return; }
  window.open(PRICING_URL, "_blank", "noopener,noreferrer");
}

/**
 * For a model the user's own plan does not include: the plans that do ("Pro or Max") and the lowest of them; null
 * when the user can use it (their plan has it, plans are off, or no plan limits apply to them: `myPlanKey` null).
 * Owner, 2026-11-15: the tag shows only to people who need to upgrade for that model, never on models they have.
 */
export function useModelPlans(myPlanKey: string | null | undefined) {
  const { data } = usePricingFeed();
  const on = !!data?.plansEnabled && !!data.modelPlans;
  return (modelId: string) => {
    if (!on || !myPlanKey || modelId === "auto") return null;
    const list = data!.modelPlans![modelId];
    if (!list) return null; // a model no plan lists: every plan has it
    if (list.some((p) => p.key === myPlanKey)) return null; // the user's plan has it
    const names = list.map((p) => p.name);
    return { label: planList(names), lowest: names[0] || "", locked: true };
  };
}

/** "Free plan · Upgrade" under the greeting (plans on, and only for users plans apply to) */
export function PlanPill() {
  const { data } = usePlanOverview();
  const { data: feed } = usePricingFeed();
  // (staff accounts have no plan limits: limits is null, nothing to show)
  if (!data?.enabled || !data.plan?.name || !data.plan.limits) return null;
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
