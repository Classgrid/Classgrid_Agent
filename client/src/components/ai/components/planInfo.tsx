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

/** A link in the computer's browser from the desktop app and Classgrid Code, a new tab on the web */
export function openOutside(url: string) {
  const desk = (window as unknown as { classgridDesktop?: { openExternal?: (url: string) => Promise<unknown> } }).classgridDesktop;
  if (desk?.openExternal) { desk.openExternal(url); return; }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** classgrid.in/pricing: in the computer's browser from the desktop app and Classgrid Code, a new tab on the web */
export function openPricing() {
  openOutside(PRICING_URL);
}

/**
 * A plan is bought, changed and renewed in ONE place (owner, 2026-11-26, as ChatGPT does): a plan bought in the phone
 * app is a Google Play subscription that renews by itself, so the website, the desktop app and the extension offer no
 * plan purchase for it ("Add 1 month" there would run a second clock next to Google's); they send the person to Google
 * Play. Live while Google may still charge it: active, in its grace period, on hold or paused (the server's
 * playSubscriptionLive, which refuses a website plan purchase then: has_play_plan). Credits are bought anywhere.
 * Returns Google Play's page for the subscription, or null when the plan is not a live Google Play one.
 */
const PLAY_PACKAGE = "com.classgrid.mobile";
export const playManageUrl = (productId?: string | null) =>
  `https://play.google.com/store/account/subscriptions?${productId ? `sku=${encodeURIComponent(productId)}&` : ""}package=${PLAY_PACKAGE}`;
type PlanForPlay = { key?: string; billing?: string; source?: string | null; play_state?: string | null; play_product_id?: string | null };
export function livePlayPlanUrl(enabled: boolean | undefined, plan: PlanForPlay | null | undefined): string | null {
  if (!plan) return null;
  const play = plan.source === "google_play" || plan.billing === "play";
  const state = plan.play_state || "";
  const live = play && state !== "SUBSCRIPTION_STATE_EXPIRED" && (
    state === "SUBSCRIPTION_STATE_ON_HOLD" || state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" || state === "SUBSCRIPTION_STATE_PAUSED"
    || (!!enabled && !!plan.key && plan.key !== "free"));
  return live ? playManageUrl(plan.play_product_id) : null;
}

/** The live Google Play plan's page from the plan overview, or null */
export function usePlayManageUrl(): string | null {
  const { data } = usePlanOverview();
  return livePlayPlanUrl(data?.enabled, data?.plan);
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
  // (a phone plan is changed in Google Play only)
  const playUrl = livePlayPlanUrl(data.enabled, data.plan);
  return (
    <div className="flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground select-none">
      <span>{data.plan.name} plan</span>
      {playUrl ? (
        <>
          <span aria-hidden>·</span>
          <span title="Change it in the Classgrid phone app, under Settings > Billing">Managed on your phone</span>
        </>
      ) : !top && (
        <>
          <span aria-hidden>·</span>
          <button type="button" onClick={openPricing} className="underline underline-offset-2 hover:text-foreground cursor-pointer">Upgrade</button>
        </>
      )}
    </div>
  );
}
