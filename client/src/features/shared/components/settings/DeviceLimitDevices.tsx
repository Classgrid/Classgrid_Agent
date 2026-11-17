// A sign-in refused by the plan's device limit (403 DEVICE_LIMIT) comes with a ticket (10 minutes). The login page
// shows the account's devices with it, the same rows as Settings > Devices, so the person can log out one and sign in
// again (server: GET / DELETE /api/auth/device-limit/devices, X-Device-Ticket). An expired ticket shows nothing: the
// next refused sign-in brings a new one.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { apiClient } from "@/lib/apiClient";
import type { Device, DevicesData } from "@/features/shared/queries/useDevices";
import { DeviceRow, DeviceRowSkeleton } from "./DeviceRows";

export function DeviceLimitDevices({ ticket, className = "" }: { ticket: string; className?: string }) {
  const qc = useQueryClient();
  const headers = { "X-Device-Ticket": ticket };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["device-limit-devices", ticket],
    queryFn: async () => (await apiClient.get("/api/auth/device-limit/devices", { headers })).data as DevicesData,
    staleTime: 0,
    retry: false,
  });
  const [asking, setAsking] = useState<Device | null>(null);
  const [busy, setBusy] = useState(false);

  const endOne = async () => {
    if (!asking) return;
    setBusy(true);
    try {
      await apiClient.delete(`/api/auth/device-limit/devices/${encodeURIComponent(asking.id)}`, { headers });
      setAsking(null);
      await qc.invalidateQueries({ queryKey: ["device-limit-devices", ticket] });
    } catch (e) {
      const m = (e as { message?: unknown })?.message;
      toast.error(typeof m === "string" && m.trim() ? m : "Couldn't log out that device. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (isError || (data && !data.devices.length)) return null;
  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card text-left">
        {isLoading || !data ? (
          <><DeviceRowSkeleton width="w-40" /><DeviceRowSkeleton width="w-48" /></>
        ) : (
          data.devices.map((d) => <DeviceRow key={d.id} d={d} onLogout={() => setAsking(d)} />)
        )}
      </div>
      <DangerConfirmDialog
        open={asking !== null}
        onOpenChange={(o) => { if (!o && !busy) setAsking(null); }}
        title={asking ? `Log out ${asking.device_name}?` : "Log out"}
        description="It will be signed out."
        warningMessage="It has to sign in again to use your account."
        actionLabel="Log out"
        isLoading={busy}
        onConfirm={endOne}
      />
    </div>
  );
}
