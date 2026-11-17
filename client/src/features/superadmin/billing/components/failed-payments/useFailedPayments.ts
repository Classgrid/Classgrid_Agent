// Failed payments for Classgrid AI: the React Query hooks for the list, the summary and one payment, and the live
// refresh. The Razorpay webhook already sends "failed_payment_received" and "platform_transactions_updated" over the
// socket when a payment fails, so the pages reload by themselves instead of asking the server on a timer.
import { useEffect } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socketClient";
import {
  errorStatus,
  fetchFailedPayment,
  fetchFailedPayments,
  fetchFailedPaymentsSummary,
  type FailedPaymentsParams,
} from "./failedPaymentsApi";

const ROOT = ["superadmin", "failed-payments"] as const;

export function useFailedPaymentsList(params: FailedPaymentsParams) {
  return useQuery({
    queryKey: [...ROOT, "list", params],
    queryFn: () => fetchFailedPayments(params),
    // Keep the old rows on screen while the next page or filter loads, so the table doesn't jump
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    // A 400 means the filters are wrong (e.g. a bad date); asking again gives the same answer
    retry: (count, error) => errorStatus(error) !== 400 && count < 2,
  });
}

export function useFailedPaymentsSummary() {
  return useQuery({
    queryKey: [...ROOT, "summary"],
    queryFn: fetchFailedPaymentsSummary,
    staleTime: 60_000,
  });
}

export function useFailedPayment(id: string | undefined) {
  return useQuery({
    queryKey: [...ROOT, "detail", id],
    queryFn: () => fetchFailedPayment(id as string),
    enabled: Boolean(id),
    // "Not found" and "not a valid link" won't change by asking again
    retry: (count, error) => {
      const status = errorStatus(error);
      if (status === 404 || status === 400) return false;
      return count < 2;
    },
  });
}

export function useFailedPaymentsLiveRefresh() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: [...ROOT] });
    };
    socket.on("failed_payment_received", refresh);
    socket.on("platform_transactions_updated", refresh);
    return () => {
      socket.off("failed_payment_received", refresh);
      socket.off("platform_transactions_updated", refresh);
    };
  }, [queryClient]);
}
