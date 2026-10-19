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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useState } from "react";
import { useMyAiBalance, useInitiateAiTopUp } from "@/components/ai/queries/useAiCredits";
import { useQueryClient } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { Zap, ArrowUpCircle, Wallet, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Button } from "@/components/marketing_ui/button";
import { BlueSlider } from "@/components/marketing_ui/BlueSlider";
import { toast } from "sonner";

export function AiUpgradePanel() {
  const queryClient = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useMyAiBalance();
  const topUpMutation = useInitiateAiTopUp();

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CLASSGRID_PAYMENT_SUCCESS") {
        toast.success("Payment successful! AI Credits have been added to your account.");
        queryClient.invalidateQueries({ queryKey: ["myAiBalance"] });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [queryClient]);



  const [customAmountStr, setCustomAmountStr] = useState<string>("1");
  
  const customAmount = parseInt(customAmountStr) || 0;
  const creditsPerInr = balance?.credits_per_inr ?? 5000;
  const expectedTokens = customAmount * creditsPerInr;
  // TODO: Minimum amount lowered from 100 to 1 for testing purposes. Revert to 100 in production.
  const isValidAmount = customAmount >= 1 && customAmount <= 10000;

  const handleTopUp = async () => {
    if (!isValidAmount) return;
    try {
      const response = await topUpMutation.mutateAsync(customAmount);
      if (response && response.checkout_url) {
        try {
          const urlObj = new URL(response.checkout_url);
          const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
          urlObj.searchParams.set("theme", theme);
          window.location.href = urlObj.toString();
        } catch (e) {
          window.location.href = response.checkout_url;
        }
      }
    } catch (error) {
      toast.error("Failed to initiate top-up. Please try again.");
    }
  };

  if (balanceLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const isBlocked = balance?.ai_access_blocked;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-bold mb-2">Upgrade AI Credits</h2>
        <p className="text-muted-foreground text-sm">Purchase additional AI Credits to continue using the assistant seamlessly.</p>
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
            {/* Balance Overview Mini */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/10 p-2 rounded-lg">
                  <Wallet className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Current Balance</div>
                  <div className="font-bold text-foreground">{formatNumber(balance?.ai_credits_balance || 0)} Credits</div>
                </div>
              </div>
            </div>

            {/* Top-up Form */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-amber-500" />
                Custom Top-Up Amount
              </h3>
              
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Enter Amount (₹1 - ₹10,000)
                </label>
                <div className="flex items-center gap-6">
                  <div className="flex-1 px-1">
                    <BlueSlider
                      min={1}
                      max={10000}
                      step={1}
                      value={customAmount}
                      onValueChange={(val: number) => setCustomAmountStr(String(val))}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2 font-medium">
                      <span>₹1</span>
                      <span>₹10,000</span>
                    </div>
                  </div>
                  <div className="shrink-0 w-24 text-right">
                    <span className="text-2xl font-bold text-foreground">₹{formatNumber(customAmount)}</span>
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
                    <AlertCircle className="w-4 h-4" /> Amount must be between ₹1 and ₹10,000.
                  </p>
                )}
              </div>

              <div className="flex justify-start pt-4 mt-2">
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


