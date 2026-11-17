// Small helpers for the Plans & Usage pages (kept out of the component files so they only export components)
import type { PlanRow } from "@/features/superadmin/queries/useAiUsage";

export type UserPlan = { id?: string; status?: string; billing?: string; started_at?: string | null; expires_at?: string | null; note?: string; set_by?: string; source?: string };

/** True when the date has passed */
export const isPast = (iso?: string | null) => !!iso && new Date(iso).getTime() < Date.now();

/** The server's message from a failed request, else the fallback */
export function errorText(e: unknown, fallback: string) {
  const r = (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return r?.message || r?.error || fallback;
}

/** How the plan was given: bought (a payment), gifted (by a super admin) or the Free plan */
export function planSourceText(plan?: UserPlan | null) {
  const b = plan?.billing || "none";
  if (!plan?.id || plan.id === "free" || b === "none") return "Free plan";
  if (b === "granted") return plan.set_by ? `Gifted by ${plan.set_by}` : "Gifted";
  if (b === "prepaid_yearly") return "Bought, 1 year";
  if (b === "manual_monthly") return "Bought, 1 month";
  if (b === "upi_autopay") return "Bought, paid every month";
  if (b === "play") return "Bought in the phone app";
  return "Bought";
}

const num = (v: unknown) => Math.round(Number(v) || 0).toLocaleString("en-IN");
export const priceText = (v: unknown) => (Number(v) < 0 ? "Contact us" : Number(v) === 0 ? "Free" : `₹${num(v)}`);

/** "every 5 hours", "a month", "every 2 weeks" */
export function periodText(value: unknown, unit: unknown) {
  const v = Math.max(1, Number(value) || 1);
  const u = String(unit || "month");
  return v === 1 ? `a ${u}` : `every ${v} ${u}s`;
}

/** A plan limit in words: -1 no limit, 0 not included, else the number, its unit and its period */
export function limitText(v: unknown, unit: string, per?: string) {
  const n = Number(v);
  if (n === -1) return "No limit";
  if (!n) return "Not included";
  return `${num(n)} ${unit}${per ? ` ${per}` : ""}`;
}

/** A plan's main limits, as the Plans card lists them */
export function planLines(p: PlanRow) {
  return [
    { label: "Session", value: limitText(p.tokens_per_window, "credits", periodText(p.window_reset_value, p.window_reset_unit)) },
    { label: "Week", value: limitText(p.tokens_per_week, "credits", "a week") },
    { label: "Claude", value: limitText(p.claude_credits_per_week, "credits", "a week") },
    { label: "Pictures", value: limitText(p.images_per_period, "pictures", periodText(p.images_reset_value, p.images_reset_unit)) },
    { label: "Calls", value: limitText(p.call_minutes_per_period, "minutes", periodText(p.call_reset_value, p.call_reset_unit)) },
  ];
}

/** The first word of a person's name, for sentences like "Give Asha a paid plan" ("this person" when there is no name) */
export function firstNameOf(name?: string | null) {
  return String(name || "").trim().split(/\s+/)[0] || "this person";
}

/** "1 person", "12 people" */
export const peopleText = (count: number) => `${num(count)} ${count === 1 ? "person" : "people"}`;

/** A 24 character hex id, the only kind of person id the server knows (anything else is not looked up) */
export const isPersonId = (id?: string | null) => !!id && /^[0-9a-f]{24}$/i.test(id);

/** Scrolls the page to a section by its id (the "See people" and "Gift a plan" buttons) */
export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
