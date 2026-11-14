// The signed-in user's plan and every usage count (GET /api/ai/plan/overview), for Settings → Plan, Usage and Billing.
// A limit is -1 for unlimited, 0 for not included, null when nothing limits it.
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/apiClient";

export type Meter = { used: number; limit: number | null; resetAt?: string | null; periodText?: string } | null;
export type PlanOverview = {
  enabled: boolean;
  plan: {
    key: string; name: string; tagline: string; status: string; billing: string; started_at: string | null; expires_at: string | null;
    subscribed: boolean; limits: Record<string, any> | null;
  };
  balance: { topup: number; promotion: number; credits_per_inr: number; extra: { image: number; whatsapp: number; voicereply: number; voiceinput: number } };
  usage: {
    credits_window: Meter; credits_week: Meter; claude_week: Meter; fable_week: Meter;
    chats_window: Meter; chats_week: Meter; images: Meter; voice_replies: Meter; voice_input_minutes: Meter;
    whatsapp: (Meter & { dayLimit?: number | null }) | null;
    call_minutes: (Meter & { callsPerDay?: number | null; maxMinutes?: number | null }) | null;
    projects: Meter;
    storage: { usedMb: number; limit: number | null; files: { count: number; mb: number }; images: { count: number; mb: number }; generatedImages: number };
  };
};

export type PlanRow = {
  key: string; name: string; tagline: string; coming_soon: boolean;
  price_inr_monthly: number; price_inr_yearly: number; student_price_inr_monthly: number; student_price_inr_yearly: number;
  features_text: string[];
};

export const usePlanOverview = () => useQuery({
  queryKey: ["ai-plan-overview"],
  queryFn: async () => (await api.get("/api/ai/plan/overview")).data as PlanOverview,
  staleTime: 15_000,
});

export const usePlans = () => useQuery({
  queryKey: ["ai-plans"],
  queryFn: async () => (await api.get("/api/ai/plans")).data as { enabled: boolean; plans: PlanRow[] },
  staleTime: 60_000,
});

export const n = (v: number) => Math.round(v).toLocaleString("en-IN");
export const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
/** "Unlimited", "Not included", or the number with its unit */
export const limitText = (limit: number | null | undefined, unit = "") =>
  limit === null || limit === undefined ? "" : limit < 0 ? "Unlimited" : limit === 0 ? "Not included" : `${n(limit)}${unit ? ` ${unit}` : ""}`;
export const dayText = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "");
export const whenText = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "");
export const mbText = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`);
/** "5 hours" from a reset value and unit */
export const periodText = (value: any, unit: any) => (value && unit ? `${value} ${unit}${Number(value) === 1 ? "" : "s"}` : "");
/** "in 2 h 12 min" until a moment */
export function inText(iso?: string | null) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "soon";
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `in ${h} h ${m % 60} min`;
  return `in ${Math.round(h / 24)} days`;
}
