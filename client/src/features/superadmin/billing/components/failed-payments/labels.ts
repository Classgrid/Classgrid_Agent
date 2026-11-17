// Failed payments for Classgrid AI: every word the pages show for the server's keys, in one place, so the list, the
// filters and the detail page always say the same thing. Plain, short words (owner, 2026-11-17).
import type { Method, PlanKey, Purchase, ReasonKey, Term, Who } from "./failedPaymentsApi";

// Same order as the "Why it failed" filter
export const REASONS: Array<{ key: ReasonKey; label: string; sentence: string }> = [
  { key: "cancelled", label: "They cancelled it", sentence: "They closed the payment window or pressed cancel before paying." },
  { key: "timed_out", label: "It took too long", sentence: "The payment wasn't finished in time, so Razorpay stopped it." },
  { key: "insufficient_funds", label: "Not enough money", sentence: "Their account didn't have enough money." },
  { key: "otp_pin", label: "Wrong OTP or PIN", sentence: "The OTP or PIN they entered was wrong, or the check didn't finish." },
  { key: "declined", label: "Their bank said no", sentence: "Their bank or card company turned the payment down." },
  { key: "limit", label: "Over their bank's limit", sentence: "The amount was over a limit set by their bank or UPI app." },
  { key: "risk", label: "Stopped by Razorpay's safety check", sentence: "Razorpay's safety check stopped the payment." },
  { key: "upi", label: "UPI problem", sentence: "Something went wrong with their UPI ID or UPI app." },
  { key: "technical", label: "Bank or Razorpay problem", sentence: "Their bank or Razorpay had a technical problem." },
  { key: "other", label: "Other reason", sentence: "Razorpay gave another reason. What it said is below." },
];

const REASON_BY_KEY = new Map(REASONS.map((r) => [r.key, r]));

export const reasonLabel = (key: ReasonKey | null | undefined) =>
  REASON_BY_KEY.get(key as ReasonKey)?.label ?? "Other reason";

export const reasonSentence = (key: ReasonKey | null | undefined) =>
  REASON_BY_KEY.get(key as ReasonKey)?.sentence ?? REASON_BY_KEY.get("other")!.sentence;

export const REASON_KEYS = REASONS.map((r) => r.key);

const WHO: Record<Who, string> = {
  person: "They did",
  bank: "Their bank",
  razorpay: "Razorpay",
  classgrid: "Classgrid's payment settings",
};
export const whoLabel = (who: Who | null | undefined) => (who && WHO[who]) || "Not known";

const METHOD: Record<Method, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  other: "Other",
};
export const methodLabel = (method: Method | null | undefined) => (method && METHOD[method]) || "Not known";

export const termLabel = (term: Term | null | undefined) => (term === "year" ? "1 year" : "1 month");

// The plan's name from the server; if it is missing, the key with a capital first letter
export const planNameOf = (planKey: PlanKey | null | undefined, planName: string | null | undefined) =>
  planName || (planKey ? planKey.charAt(0).toUpperCase() + planKey.slice(1) : "");

// "Pro plan, 1 month" (no student note), for payments that only carry the plan and the length
export function planLabel(planKey: PlanKey | null | undefined, planName: string | null | undefined, term: Term | null | undefined) {
  const name = planNameOf(planKey, planName);
  if (!name) return "A plan";
  return `${name} plan, ${termLabel(term)}`;
}

export function purchaseLabel(purchase: Purchase | null | undefined) {
  if (!purchase) return "Not known";
  if (purchase.kind === "credits") return "AI credits";
  if (purchase.kind === "plan") {
    if (!purchase.planKey) return "A plan";
    return planLabel(purchase.planKey, purchase.planName, purchase.term) + (purchase.student ? " (student price)" : "");
  }
  return "Not known";
}

// The same label inside a sentence ("for a plan", not "for A plan")
export const purchaseInSentence = (purchase: Purchase | null | undefined) => {
  const label = purchaseLabel(purchase);
  return label === "A plan" ? "a plan" : label;
};

// "₹499" or "₹1,999.50": en-IN grouping, at most two decimals
export function formatInr(amount: number | null | undefined) {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  return `₹${safe.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const formatCount = (n: number | null | undefined) => (Number(n) || 0).toLocaleString("en-IN");

// Month names are fixed here: some browsers write September as "Sept" in en-IN, and the pages want "Sep"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The date and time in India, whatever the viewer's own time zone is
function indiaParts(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: get("day"),
    month: MONTHS[Number(get("month")) - 1] ?? "",
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
    dayPeriod: get("dayPeriod").toLowerCase(),
  };
}

// "17 Nov 2026, 3:42 pm"
export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const p = indiaParts(iso);
  if (!p) return "—";
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod}`.trim();
}

// "17 Nov 2026"
export function formatDay(iso: string | null | undefined) {
  if (!iso) return "—";
  const p = indiaParts(iso);
  if (!p) return "—";
  return `${p.day} ${p.month} ${p.year}`;
}
