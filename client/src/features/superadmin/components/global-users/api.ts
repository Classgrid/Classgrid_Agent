// Talking to the server for the Users pages: the people list, one person's page, their payments and the account
// actions (ban, unban, log out everywhere, password reset email, role). Every query key starts with
// ["super-admin", ...] so one action can refresh the list and the person page together, and the live socket
// events refresh them when something changes elsewhere (another admin, a purchase).
import { useEffect, useRef } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { getSocket } from "@/lib/socketClient";
import { errorText, httpStatus, roleLabel } from "./format";
import type { PeopleParams, PeopleResponse, PersonActionInput, PersonOverview, PaymentsResponse } from "./types";

export const PAGE_SIZE = 25;
export const PAYMENTS_PAGE_SIZE = 20;

export const PEOPLE_KEY = ["super-admin", "people"] as const;
export const peopleKey = (params: PeopleParams) => [...PEOPLE_KEY, params] as const;
export const personKey = (userId: string) => ["super-admin", "person", userId] as const;
export const personPaymentsKey = (userId: string, page: number) => [...personKey(userId), "payments", page] as const;

// A wrong id or a removed account will not come back by asking again
const retryUnlessMissing = (count: number, error: unknown) => {
  const status = httpStatus(error);
  if (status === 400 || status === 404) return false;
  return count < 2;
};

export function fetchPeople(params: PeopleParams): Promise<PeopleResponse> {
  // (the server takes at most 100 characters of search; defaults are left out so the address of the request stays short)
  const q = params.q.trim().slice(0, 100);
  return apiClient
    .get<PeopleResponse>("/api/super-admin/users/list", {
      params: {
        q: q || undefined,
        plan: params.plan,
        status: params.status,
        method: params.method,
        signup: params.signup,
        sort: params.sort,
        dir: params.dir,
        page: params.page,
        limit: PAGE_SIZE,
      },
    })
    .then((r) => r.data);
}

export function usePeople(params: PeopleParams) {
  return useQuery({
    queryKey: peopleKey(params),
    queryFn: () => fetchPeople(params),
    staleTime: 30_000,
    // (the old page stays on screen while the next one loads, instead of the list flashing empty)
    placeholderData: keepPreviousData,
  });
}

export function usePerson(userId: string | undefined) {
  return useQuery({
    queryKey: personKey(userId || ""),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: PersonOverview }>(`/api/super-admin/users/${encodeURIComponent(userId!)}/overview`)
        .then((r) => r.data.data),
    enabled: !!userId,
    staleTime: 15_000,
    retry: retryUnlessMissing,
  });
}

export function usePersonPayments(userId: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: personPaymentsKey(userId, page),
    queryFn: () =>
      apiClient
        .get<PaymentsResponse>(`/api/super-admin/users/${encodeURIComponent(userId)}/payments`, {
          params: { page, limit: PAYMENTS_PAGE_SIZE },
        })
        .then((r) => r.data),
    enabled: enabled && !!userId,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

// Each action is the same request the server has always taken; the page shows its own words when it worked
const SUCCESS_TEXT = {
  ban: "Banned",
  unban: "Unbanned",
  force_logout: "Logged out everywhere",
  reset_password: "Password reset email sent",
} as const;

export function usePersonAction(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PersonActionInput) => {
      const base = `/api/super-admin/users/${encodeURIComponent(userId)}`;
      switch (input.type) {
        case "ban": {
          const reason = input.reason.trim().slice(0, 300);
          return (await apiClient.patch(`${base}/ban`, reason ? { reason } : {})).data;
        }
        case "unban": return (await apiClient.patch(`${base}/unban`)).data;
        case "force_logout": return (await apiClient.post(`${base}/force-logout`)).data;
        case "reset_password": return (await apiClient.post(`${base}/reset-password`)).data;
        case "role": return (await apiClient.patch(`${base}/role`, { role: input.role })).data;
      }
    },
    onSuccess: (_data, input) => {
      toast.success(input.type === "role" ? `Role changed to ${roleLabel(input.role)}` : SUCCESS_TEXT[input.type]);
      queryClient.invalidateQueries({ queryKey: personKey(userId) });
      queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
    },
    onError: (error) => toast.error(errorText(error)),
  });
}

// The list refreshes when the server says an account changed (it sends "global_users_updated" to the super admin
// room after a ban, unban, log out everywhere or role change). The room is joined again after a reconnect, because
// a new connection starts in no rooms.
export function usePeopleLive() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const join = () => socket.emit("join_superadmin_support");
    const onUpdated = () => queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
    join();
    socket.on("connect", join);
    socket.on("global_users_updated", onUpdated);
    return () => {
      socket.off("connect", join);
      socket.off("global_users_updated", onUpdated);
    };
  }, [queryClient]);
}

// The person page refreshes when this account changes, and when AI usage changes (that event also comes when
// someone buys a plan or credits). AI usage is sent after every AI answer by anyone, so those refreshes are
// spaced out to one every few seconds instead of reloading the whole page on each message.
const USAGE_REFRESH_GAP_MS = 5_000;

export function usePersonLive(userId: string | undefined) {
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !userId) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: personKey(userId) });
    const join = () => {
      socket.emit("join_superadmin_support");
      socket.emit("join_superadmin_ai_usage");
    };
    const onUsersUpdated = (payload?: { userId?: string }) => {
      if (payload?.userId && String(payload.userId) === userId) refresh();
    };
    const onUsageUpdated = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        refresh();
      }, USAGE_REFRESH_GAP_MS);
    };
    join();
    socket.on("connect", join);
    socket.on("global_users_updated", onUsersUpdated);
    socket.on("ai_usage_updated", onUsageUpdated);
    return () => {
      socket.off("connect", join);
      socket.off("global_users_updated", onUsersUpdated);
      socket.off("ai_usage_updated", onUsageUpdated);
      socket.emit("leave_superadmin_ai_usage");
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [queryClient, userId]);
}
