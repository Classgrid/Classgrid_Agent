// Settings > Devices: where the account is signed in (the website, the desktop app, the phone app, code editors), and
// logging out one of them or all of them (server: routes/user-devices.routes.js)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/apiClient";

export type DeviceKind = "website" | "desktop" | "phone" | "editor";
export type Device = {
  id: string;
  kind: DeviceKind;
  device_name: string;
  created_at: string;
  last_seen_at: string;
  this_device: boolean;
};
// max: the plan's device limit, null when there is none
export type DevicesData = { devices: Device[]; limit: { used: number; max: number | null }; note: string };

// Loaded when the section opens, and again when the window gets focus (a device may have signed in meanwhile)
export const useDevices = () => useQuery({
  queryKey: ["devices"],
  queryFn: async () => (await api.get("/api/user/devices")).data as DevicesData,
  staleTime: 0,
  refetchOnWindowFocus: true,
});

/** Logs out one device. this_device: it was this one (then the app goes to the login page) */
export const useLogoutDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/user/devices/${encodeURIComponent(id)}`)).data as { this_device: boolean },
    onSuccess: (data) => { if (!data?.this_device) qc.invalidateQueries({ queryKey: ["devices"] }); },
  });
};

/** Logs out every device, this one too */
export const useLogoutAllDevices = () => useMutation({
  mutationFn: async () => (await api.post("/api/user/devices/logout-all")).data as { ended: number },
});
