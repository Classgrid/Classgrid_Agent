// The plan and every usage count of the signed-in user (GET /api/ai/plan/overview), for the AI hub's Plan and Usage
// pages. A limit is -1 for unlimited, 0 for not included, null when nothing limits it.
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

export const usePlanOverview = () => useQuery({
  queryKey: ["ai-plan-overview"],
  queryFn: async () => (await api.get("/api/ai/plan/overview")).data as PlanOverview,
  staleTime: 15_000,
});

export const n = (v: number) => Math.round(v).toLocaleString("en-IN");
export const limitText = (limit: number | null, unit = "") => (limit === null ? "" : limit < 0 ? "Unlimited" : limit === 0 ? "Not included" : `${n(limit)}${unit ? ` ${unit}` : ""}`);
export const dateText = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : null);
export const mbText = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb * 10) / 10} MB`);
