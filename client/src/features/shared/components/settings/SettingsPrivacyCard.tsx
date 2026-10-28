/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
import React from "react";
import { Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/marketing_ui/switch";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

// Settings → Privacy: show or hide your email and hobbies on your profile for other people.
// Saved as privacySettings.hideEmail / hideHobbies (PUT /api/user/email-preferences); the server
// then leaves them out of what other people receive, so this is not only hidden on screen.

type PrivacyPrefs = { hideEmail: boolean; hideHobbies: boolean; hideBio: boolean };
const KEY = ["privacy-settings"];

export function SettingsPrivacyCard() {
  const queryClient = useQueryClient();
  const { data: privacy, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<{ privacySettings?: Partial<PrivacyPrefs> }>("/api/user/email-preferences");
      return { hideEmail: !!data.privacySettings?.hideEmail, hideHobbies: !!data.privacySettings?.hideHobbies, hideBio: !!data.privacySettings?.hideBio };
    },
    staleTime: 5 * 60 * 1000,
  });

  const save = useMutation({
    mutationFn: async (next: PrivacyPrefs) => {
      await apiClient.put("/api/user/email-preferences", { privacySettings: next });
      return next;
    },
    onMutate: async (next) => {
      const previous = queryClient.getQueryData<PrivacyPrefs>(KEY);
      queryClient.setQueryData(KEY, next); // switch moves at once
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
      toast.error("Couldn't save your privacy setting. Please try again.");
    },
    onSuccess: () => toast.success("Privacy setting saved."),
  });

  const current: PrivacyPrefs = privacy || { hideEmail: false, hideHobbies: false, hideBio: false };
  const setShow = (field: keyof PrivacyPrefs, show: boolean) => save.mutate({ ...current, [field]: !show });

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm mb-6">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <Eye size={18} className="text-foreground" /> Privacy
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Choose what other people can see on your profile.</p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-foreground">Show Email</span>
            <span className="text-xs text-muted-foreground">Let others see your email address on your profile</span>
          </div>
          <Switch
            checked={!current.hideEmail}
            onCheckedChange={(checked) => setShow("hideEmail", checked)}
            disabled={isLoading || save.isPending}
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-foreground">Show Hobbies</span>
            <span className="text-xs text-muted-foreground">Let others see your hobbies on your profile</span>
          </div>
          <Switch
            checked={!current.hideHobbies}
            onCheckedChange={(checked) => setShow("hideHobbies", checked)}
            disabled={isLoading || save.isPending}
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-foreground">Show Bio</span>
            <span className="text-xs text-muted-foreground">Let others see your bio on your profile</span>
          </div>
          <Switch
            checked={!current.hideBio}
            onCheckedChange={(checked) => setShow("hideBio", checked)}
            disabled={isLoading || save.isPending}
          />
        </div>
      </div>
    </div>
  );
}
