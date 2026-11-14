// A plan chosen on classgrid.in/pricing: the chat starts its payment (POST /api/ai/topup/plan) and opens the payment
// page on billing.classgrid.in. Only this hand-off lives in the app; the plans themselves are shown on the pricing page.
import { apiClient as api } from "@/lib/apiClient";

export type Term = "month" | "year";
const desktop = () => ((window as any).classgridDesktop?.isDesktop ? { clientApp: "desktop" } : {});

/** Starts the payment of a plan for a month or a year and returns the checkout link */
export async function startPlanPayment(key: string, term: Term, returnTo?: "pricing"): Promise<string> {
  const data = (await api.post("/api/ai/topup/plan", { plan: key, term, ...(returnTo ? { returnTo } : {}), ...desktop() })).data?.data;
  if (!data?.checkout_url) throw new Error("Could not start the payment. Please try again.");
  return data.checkout_url as string;
}

/** The payment page, in the app's light or dark look (Classgrid Code opens it in the computer's browser) */
export async function openCheckout(checkoutUrl: string) {
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
