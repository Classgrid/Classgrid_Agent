// The account's emails (Settings > Account > Emails, and the student application): up to three per account, each
// confirmed with a 6-digit code sent to it. Signing in works with any of them and the same password.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/apiClient";

export type AccountEmail = { email: string; verified_at?: string; school: boolean };
export type AccountEmails = { primary: AccountEmail; emails: AccountEmail[]; pending_email: string | null; max: number };

export const useAccountEmails = () => useQuery({
  queryKey: ["account-emails"],
  queryFn: async () => (await api.get("/api/user/emails")).data?.data as AccountEmails,
  staleTime: 60_000,
});

const useRefresh = () => {
  const qc = useQueryClient();
  return (data?: AccountEmails) => {
    if (data) qc.setQueryData(["account-emails"], data);
    else qc.invalidateQueries({ queryKey: ["account-emails"] });
    qc.invalidateQueries({ queryKey: ["ai-student"] });
  };
};

/** Sends the code to a new email */
export const useAddAccountEmail = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (email: string) => (await api.post("/api/user/emails", { email })).data?.data as { pending_email: string; expires_in_minutes: number },
    onSuccess: () => refresh(),
  });
};

/** Adds the email with its code */
export const useConfirmAccountEmail = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (code: string) => (await api.post("/api/user/emails/confirm", { code })).data?.data as AccountEmails,
    onSuccess: (data) => refresh(data),
  });
};

export const useRemoveAccountEmail = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (email: string) => (await api.delete(`/api/user/emails/${encodeURIComponent(email)}`)).data?.data as AccountEmails,
    onSuccess: (data) => refresh(data),
  });
};

/** Every confirmed email of the account, the main one first */
export const allEmails = (d?: AccountEmails | null): AccountEmail[] => (d ? [d.primary, ...d.emails] : []);
