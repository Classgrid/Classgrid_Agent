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
import fs from "fs";
import path from "path";

const checkoutPath = path.join(process.cwd(), "client", "src", "features", "billing-portal", "pages", "CheckoutPage.tsx");
let checkoutContent = fs.readFileSync(checkoutPath, "utf-8");

// 1. Send postMessage on success
const confirmLogicOld = `            if (return_url) {
              setReturnUrl(return_url);
            }
            setStep("success");`;
const confirmLogicNew = `            if (return_url === "close_window") {
              setReturnUrl("close_window");
              if (window.opener) {
                 window.opener.postMessage({ type: "CLASSGRID_PAYMENT_SUCCESS" }, "*");
              }
            } else if (return_url) {
              setReturnUrl(return_url);
            }
            setStep("success");`;

if (checkoutContent.includes(confirmLogicOld)) {
    checkoutContent = checkoutContent.replace(confirmLogicOld, confirmLogicNew);
} else {
    console.log("Could not find confirm logic old");
}

// 2. Change return URL rendering in success step
const returnUrlOld = `              {returnUrl ? (
                <a href={returnUrl} className="mt-4 flex w-full items-center justify-center rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600">
                  Return to Dashboard
                </a>
              ) : (
                <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                  You can now close this tab.
                </p>
              )}`;
const returnUrlNew = `              {returnUrl === "close_window" ? (
                <button onClick={() => window.close()} className="mt-4 flex w-full items-center justify-center rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600">
                  Close Window
                </button>
              ) : returnUrl ? (
                <a href={returnUrl} className="mt-4 flex w-full items-center justify-center rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600">
                  Return to Dashboard
                </a>
              ) : (
                <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                  You can now close this tab.
                </p>
              )}`;

if (checkoutContent.includes(returnUrlOld)) {
    checkoutContent = checkoutContent.replace(returnUrlOld, returnUrlNew);
} else {
    console.log("Could not find returnUrl rendering old");
}

fs.writeFileSync(checkoutPath, checkoutContent, "utf-8");
console.log("CheckoutPage updated successfully.");

// 3. Update AiUpgradePanel.tsx to listen for the message
const panelPath = path.join(process.cwd(), "client", "src", "components", "ai", "components", "credits", "AiUpgradePanel.tsx");
let panelContent = fs.readFileSync(panelPath, "utf-8");

const importOld = `import { useMyAiBalance, useInitiateAiTopUp } from "@/components/ai/queries/useAiCredits";`;
const importNew = `import { useMyAiBalance, useInitiateAiTopUp } from "@/components/ai/queries/useAiCredits";\nimport { useQueryClient } from "@tanstack/react-query";`;

if (panelContent.includes(importOld) && !panelContent.includes("useQueryClient")) {
    panelContent = panelContent.replace(importOld, importNew);
}

const mutationOld = `  const { data: balance, isLoading: balanceLoading } = useMyAiBalance();
  const topUpMutation = useInitiateAiTopUp();`;
const mutationNew = `  const queryClient = useQueryClient();
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
  }, [queryClient]);`;

if (panelContent.includes(mutationOld)) {
    panelContent = panelContent.replace(mutationOld, mutationNew);
    fs.writeFileSync(panelPath, panelContent, "utf-8");
    console.log("AiUpgradePanel updated successfully.");
} else {
    console.log("Could not find AiUpgradePanel mutation logic.");
}

