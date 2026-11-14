/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// The Upgrade page of the AI hub (rebuilt, owner 2026-11-14): the user's plan with this week's use, the plans
// (Free, Pro, Max, Enterprise) with a monthly / yearly switch and buy buttons, then the credits top-up. The same page
// in the website, the desktop app and Classgrid Code; the payment itself opens on billing.classgrid.in.
import React, { useState } from "react";
import { useMyAiBalance, useInitiateAiTopUp } from "@/components/ai/queries/useAiCredits";
import { useQueryClient } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { ArrowUpCircle, Wallet, AlertCircle, BadgeCheck, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Button } from "@/components/marketing_ui/button";
import { BlueSlider } from "@/components/marketing_ui/BlueSlider";
import { toast } from "sonner";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { PlanCards, useMyPlan, usePlans, inr, type Term } from "./PlanCards";
import { CheckCircle2 } from "lucide-react";

const WEBSITE = import.meta.env.VITE_DESKTOP !== "1" && import.meta.env.VITE_EDITOR !== "1";
const PRICING_URL = import.meta.env.VITE_PRICING_URL || "https://classgrid.in/pricing";

/** The payment page (billing.classgrid.in), for a top-up or a plan, in the app's light or dark look */
export async function openCheckout(checkoutUrl: string) {
  // Classgrid Code: the payment page opens in the computer's browser (the editor's tab can't show it)
  const editorDesk = import.meta.env.VITE_EDITOR === "1" ? (window as unknown as { classgridDesktop?: { openExternal?: (url: string) => Promise<unknown> } }).classgridDesktop : undefined;
  let url = checkoutUrl;
  try {
    const u = new URL(checkoutUrl);
    u.searchParams.set("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
    url = u.toString();
  } catch { /* the link as it came */ }
  if (editorDesk?.openExternal) { await editorDesk.openExternal(url); return; }
  window.location.href = url;
}

const dateText = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null);
const pct = (used: number, cap: number) => (cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0);

function Meter({ label, used, cap }: { label: string; used: number; cap: number }) {
  if (!(cap > 0)) return null;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{formatNumber(used)} / {formatNumber(cap)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-foreground/70" style={{ width: `${pct(used, cap)}%` }} />
      </div>
    </div>
  );
}

export function AiUpgradePanel() {
  const queryClient = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useMyAiBalance();
  const { data: plans } = usePlans();
  const { data: mine } = useMyPlan();
  const topUpMutation = useInitiateAiTopUp();
  const [term, setTerm] = useState<Term>("month");

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CLASSGRID_PAYMENT_SUCCESS") {
        toast.success("Payment successful! AI Credits have been added to your account.");
        queryClient.invalidateQueries({ queryKey: ["my-ai-balance"] });
        queryClient.invalidateQueries({ queryKey: ["my-ai-plan"] });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient]);

  // Owner's order: this one account can top up from ₹1 (everyone else starts at ₹299). The server checks it too.
  const { data: currentUser } = useCurrentUser();
  const minInr = String(currentUser?.email || "").trim().toLowerCase() === "nikhilsubsun123@gmail.com" ? 1 : 299;
  const [customAmountStr, setCustomAmountStr] = useState<string>("299");
  const customAmount = parseInt(customAmountStr) || 0;
  const creditsPerInr = balance?.credits_per_inr ?? 5000;
  const expectedTokens = customAmount * creditsPerInr;
  const isValidAmount = customAmount >= minInr && customAmount <= 10000;

  const handleTopUp = async () => {
    if (!isValidAmount) return;
    try {
      const response = await topUpMutation.mutateAsync(customAmount);
      if (response && response.checkout_url) await openCheckout(response.checkout_url);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Could not start the payment. Please try again.");
    }
  };

  if (balanceLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const isBlocked = balance?.ai_access_blocked;
  const plansOn = !!plans?.enabled && (plans?.plans?.length || 0) > 0;
  const planName = mine?.name || "Free";
  const until = dateText(mine?.expires_at);
  const weekEnds = dateText(mine?.week?.ends_at);
  const lim = mine?.limits;
  const yearlyPlan = plans?.plans?.find((p) => p.price_inr_yearly > 0 && p.price_inr_monthly > 0);
  // The biggest plan that can be bought: on it there is nothing to upgrade to, only time to add
  const buyable = (plans?.plans || []).filter((p) => !p.coming_soon && p.key !== "free" && p.price_inr_monthly > 0);
  const onTopPlan = !!mine?.key && mine.key !== "free" && buyable.length > 0 && buyable[buyable.length - 1]?.key === mine.key;
  const nextPlan = mine?.key && mine.key !== "free" ? buyable[buyable.findIndex((p) => p.key === mine.key) + 1] : buyable[0];
  const yearlySaving = yearlyPlan ? Math.max(0, Math.round(100 - (yearlyPlan.price_inr_yearly / (yearlyPlan.price_inr_monthly * 12)) * 100)) : 0;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="p-6 border-b border-border flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold mb-1">{plansOn ? "Plans and credits" : "Upgrade AI Credits"}</h2>
          <p className="text-muted-foreground text-sm">
            {plansOn ? "Pick a plan for a month or a year, or top up credits any time." : "Purchase additional AI Credits to continue using the assistant seamlessly."}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {isBlocked ? (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 p-4 rounded-lg flex items-start gap-3 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">AI Access Blocked</h4>
              <p className="text-sm mt-1">Your AI access has been suspended by the administrator. Top-ups are currently disabled.</p>
            </div>
          </div>
        ) : (
          <>
            {/* The user's plan, this week's use and the credit balance */}
            <div className="bg-muted/30 border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-lg"><BadgeCheck className="w-5 h-5 text-emerald-500" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">Your plan</div>
                  <div className="font-bold text-foreground">{plansOn ? planName : "Free"}</div>
                  {until && <div className="text-xs text-muted-foreground">until {until}</div>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/10 p-2 rounded-lg"><Wallet className="w-5 h-5 text-indigo-500" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">Top-up credits</div>
                  <div className="font-bold text-foreground">{formatNumber(balance?.ai_credits_balance || 0)} Credits</div>
                  <div className="text-xs text-muted-foreground">also pay for extra images, messages and voice</div>
                </div>
              </div>
              {plansOn && lim && mine?.week ? (
                <div className="space-y-2">
                  <Meter label="Credits this week" used={mine.week.used} cap={lim.tokens_per_week} />
                  <Meter label="Claude credits this week" used={mine.week.claude_used} cap={lim.claude_credits_per_week} />
                  {weekEnds && <div className="text-[11px] text-muted-foreground">Week ends {weekEnds}</div>}
                </div>
              ) : null}
            </div>

            {/* The plans (only while the super admin has plans on) */}
            {plansOn && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-emerald-500" /> Plans</h3>
                  <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
                    <button type="button" onClick={() => setTerm("month")} className={`px-3 py-1 rounded-md ${term === "month" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Monthly</button>
                    <button type="button" onClick={() => setTerm("year")} className={`px-3 py-1 rounded-md ${term === "year" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                      Yearly{yearlySaving > 0 ? ` (save ${yearlySaving}%)` : ""}
                    </button>
                  </div>
                </div>
                {!WEBSITE && mine && mine.key !== "free" && (
                  <p className="text-sm text-muted-foreground mb-4">
                    You are on <span className="font-medium text-foreground">{planName}</span>{until ? ` until ${until}` : ""}. Buying again adds the time after that.
                  </p>
                )}
                {WEBSITE ? (
                  // The website: the plans live on classgrid.in/pricing; a plan picked there starts its payment back here
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                          {mine?.key && mine.key !== "free" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <BadgeCheck className="w-4 h-4 text-muted-foreground" />}
                          {mine?.key && mine.key !== "free" ? `${planName}: subscribed${until ? ` until ${until}` : ""}` : "Free plan"}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {mine?.key && mine.key !== "free"
                            ? onTopPlan
                              ? `${planName} is the biggest plan. Need more time? Add a ${term} to it.`
                              : `Move up to ${nextPlan?.name || "a bigger plan"}, or add a ${term} to ${planName}.`
                            : `Pro gives Claude, more pictures, calls and projects. Max gives five times Pro with Claude Fable.`}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => { window.location.href = PRICING_URL; }}>
                        {mine?.key && mine.key !== "free" ? (onTopPlan ? `Add 1 ${term}` : `Upgrade to ${nextPlan?.name || "a bigger plan"}`) : "See plans"}
                        <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </div>
                    <a href={PRICING_URL} className="inline-block mt-3 text-xs text-muted-foreground hover:text-foreground">All plans and prices on classgrid.in/pricing</a>
                  </div>
                ) : (
                  <PlanCards term={term} onCheckout={openCheckout} />
                )}
                <p className="text-xs text-muted-foreground mt-3">Prices in ₹, GST included. A plan is paid once for its month or year; nothing renews by itself.</p>
              </div>
            )}

            {/* Top-up */}
            <div>
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-amber-500" />
                {plansOn ? "Top up credits" : "Custom Top-Up Amount"}
              </h3>
              {plansOn && (
                <p className="text-sm text-muted-foreground mb-4">
                  Credits for more chat on any plan. Once your plan's images, WhatsApp messages, voice replies or voice input are used up, each extra one is paid from these credits too.
                </p>
              )}

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Enter Amount (₹{minInr} - ₹10,000)
                </label>
                <div className="flex items-center gap-6">
                  <div className="flex-1 px-1">
                    <BlueSlider
                      min={minInr}
                      max={10000}
                      step={1}
                      value={customAmount}
                      onValueChange={(val: number) => setCustomAmountStr(String(val))}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2 font-medium">
                      <span>₹{minInr}</span>
                      <span>₹10,000</span>
                    </div>
                  </div>
                  <div className="shrink-0 w-24 text-right">
                    <span className="text-2xl font-bold text-foreground">{inr(customAmount)}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted border border-border rounded-lg flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">You will receive:</span>
                  <span className="text-lg font-bold text-foreground flex items-center gap-1.5">
                    <Wallet className="w-5 h-5 text-muted-foreground" />
                    {formatNumber(expectedTokens)} Credits
                  </span>
                </div>
                {!isValidAmount && customAmountStr !== "" && (
                  <p className="text-red-500 text-sm mt-3 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Amount must be between ₹{minInr} and ₹10,000.
                  </p>
                )}
              </div>

              <div className="flex justify-start pt-2">
                <Button
                  variant="ghost"
                  onClick={handleTopUp}
                  disabled={!isValidAmount || topUpMutation.isPending}
                  className="text-muted-foreground hover:text-foreground border border-border/50 shadow-sm px-6"
                >
                  {topUpMutation.isPending ? "Processing..." : "Purchase Credits"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
