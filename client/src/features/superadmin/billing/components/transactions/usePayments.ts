// React Query hooks for the Transactions pages. The list keeps the previous page on screen while the next one loads,
// so changing a filter doesn't flash an empty table.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchPayment, fetchPayments, type PaymentFilters } from "./paymentsApi";

export function usePayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: ["billing-payments", "list", filters],
    queryFn: () => fetchPayments(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: 1,
  });
}

// apiClient turns every error into { message, code } with code = the HTTP status as text
export const isNotFound = (error: unknown) => String((error as any)?.code ?? "") === "404";

export function usePayment(key: string | undefined) {
  return useQuery({
    queryKey: ["billing-payments", "detail", key],
    queryFn: () => fetchPayment(key as string),
    enabled: !!key,
    staleTime: 30_000,
    // A payment that doesn't exist won't appear on a second try; anything else gets one more try
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 1,
  });
}
