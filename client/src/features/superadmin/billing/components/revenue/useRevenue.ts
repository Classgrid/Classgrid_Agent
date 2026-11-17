// React Query hooks for the Revenue page, and its live updates. The Razorpay webhook sends "billing_payments_updated"
// to the "superadmin:billing" room when a payment is saved, fails or is refunded; the page joins that room and loads
// its numbers again then. The room is joined again after a reconnect, because a new connection starts in no rooms.
import { useEffect } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socketClient";
import {
  fetchRevenuePayments,
  fetchRevenueSummary,
  type RevenuePaymentFilters,
  type RevenueRange,
} from "./revenueApi";

const ROOT = ["superadmin", "revenue"] as const;

// apiClient turns every error into { message, code } with code = the HTTP status as text
const isBadRequest = (error: unknown) => String((error as { code?: unknown })?.code ?? "") === "400";

export function useRevenueSummary(range: RevenueRange) {
  return useQuery({
    queryKey: [...ROOT, "summary", range],
    queryFn: () => fetchRevenueSummary(range),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // A 400 means the dates are wrong; asking again gives the same answer
    retry: (count, error) => !isBadRequest(error) && count < 2,
  });
}

export function useRevenuePayments(filters: RevenuePaymentFilters) {
  return useQuery({
    queryKey: [...ROOT, "payments", filters],
    queryFn: () => fetchRevenuePayments(filters),
    // Keep the old rows on screen while the next page or filter loads, so the table doesn't jump
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: (count, error) => !isBadRequest(error) && count < 2,
  });
}

export function useRevenueLive() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const join = () => socket.emit("join_superadmin_billing");
    const onChanged = () => queryClient.invalidateQueries({ queryKey: [...ROOT] });
    join();
    socket.on("connect", join);
    socket.on("billing_payments_updated", onChanged);
    return () => {
      socket.off("connect", join);
      socket.off("billing_payments_updated", onChanged);
      socket.emit("leave_superadmin_billing");
    };
  }, [queryClient]);
}
