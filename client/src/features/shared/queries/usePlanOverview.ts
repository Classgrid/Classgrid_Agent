// The signed-in user's plan and every usage count (GET /api/ai/plan/overview), the usage history, and the automatic
// top-up setting: Settings > Usage and Settings > Billing read these. A limit is -1 for unlimited, 0 for not
// included, null when nothing limits it.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export type UsageHistory = {
  days: number; since: string;
  total: { credits: number; requests: number };
  perDay: { day: string; credits: number; requests: number }[];
  events: { at: string; model: string; provider: string; what: string; credits: number }[];
};

export type AutoTopup = { enabled: boolean; below_inr: number; amount_inr: number };

export const usePlanOverview = () => useQuery({
  queryKey: ["ai-plan-overview"],
  queryFn: async () => (await api.get("/api/ai/plan/overview")).data as PlanOverview,
  staleTime: 15_000,
});

export const useUsageHistory = (days = 14) => useQuery({
  queryKey: ["ai-usage-history", days],
  queryFn: async () => (await api.get(`/api/ai/plan/usage-history?days=${days}`)).data as UsageHistory,
  staleTime: 30_000,
});

export const useAutoTopup = () => useQuery({
  queryKey: ["ai-auto-topup"],
  queryFn: async () => (await api.get("/api/ai/credits/auto-topup")).data?.data as AutoTopup,
  staleTime: 60_000,
});

export const useSaveAutoTopup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: AutoTopup) => (await api.put("/api/ai/credits/auto-topup", next)).data?.data as AutoTopup,
    onSuccess: (data) => qc.setQueryData(["ai-auto-topup"], data),
  });
};

export const n = (v: number) => Math.round(v).toLocaleString("en-IN");
export const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
export const dayText = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "");
export const whenText = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "");
export const timeText = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "");
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
