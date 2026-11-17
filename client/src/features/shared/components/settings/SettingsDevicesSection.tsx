// Settings > Devices (owner, 2026-11-17: "build it for all three devices, show the device name and type, logout, and
// logout from all"): every place the account is signed in, with its type, name, when it was last used and when it
// signed in, a Log out button for each, and Log out from all devices. Logging out this device or all of them ends
// at the login page, the way the app's own logout does (/logout, LogoutPage). With a plan's device limit, the line
// under the title says how many of the allowed devices are in use.
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { isChatHost } from "@/lib/chatHost";
import { getLoginPathForPath } from "@/features/auth/auth-helpers";
import { useDevices, useLogoutAllDevices, useLogoutDevice, type Device } from "@/features/shared/queries/useDevices";
import { btnGrey } from "./AddEmailForm";
import { DeviceRow, DeviceRowSkeleton } from "./DeviceRows";

const errorText = (e: unknown, fallback: string) => {
  const m = (e as { message?: unknown })?.message;
  return typeof m === "string" && m.trim() ? m : fallback;
};

export function SettingsDevicesSection() {
  const { data, isLoading, isError } = useDevices();
  const logoutOne = useLogoutDevice();
  const logoutAll = useLogoutAllDevices();
  const [asking, setAsking] = useState<Device | null>(null);
  const [askingAll, setAskingAll] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // The app's own logout (like the account menu's Log out): it clears what this browser keeps and opens the login page
  const toLogin = () => {
    const loginPath = isChatHost() ? "/login" : getLoginPathForPath(location.pathname);
    navigate(`/logout?redirectTo=${encodeURIComponent(loginPath)}`);
  };

  const endOne = async () => {
    if (!asking) return;
    try {
      const res = await logoutOne.mutateAsync(asking.id);
      setAsking(null);
      if (res?.this_device) toLogin();
    } catch (e) {
      toast.error(errorText(e, "Couldn't log out that device. Try again."));
    }
  };

  const endAll = async () => {
    try {
      await logoutAll.mutateAsync();
      setAskingAll(false);
      toLogin();
    } catch (e) {
      toast.error(errorText(e, "Couldn't log out from all devices. Try again."));
    }
  };

  return (
    <div className="max-w-[860px]">
      <h2 className="text-xl font-semibold text-foreground">Devices</h2>
      {data && data.limit.max !== null && (
        <p className="text-[15px] text-foreground mt-2">{data.limit.used} of {data.limit.max} devices</p>
      )}

      <div className="rounded-xl border border-border bg-card mt-5">
        {isLoading || (!data && !isError) ? (
          <><DeviceRowSkeleton width="w-48" /><DeviceRowSkeleton width="w-56" /></>
        ) : isError || !data ? (
          <div className="px-5 py-4 text-sm text-muted-foreground">Couldn't load your devices.</div>
        ) : data.devices.length ? (
          data.devices.map((d) => <DeviceRow key={d.id} d={d} onLogout={() => setAsking(d)} />)
        ) : (
          <div className="px-5 py-4 text-sm text-muted-foreground">No devices to show.</div>
        )}
      </div>
      {data?.note && <p className="text-xs text-muted-foreground mt-2.5">{data.note}</p>}

      <div className="mt-6">
        <button type="button" className={btnGrey} disabled={!data} onClick={() => setAskingAll(true)}>Log out from all devices</button>
      </div>

      <DangerConfirmDialog
        open={asking !== null}
        onOpenChange={(o) => { if (!o && !logoutOne.isPending) setAsking(null); }}
        title={asking ? `Log out ${asking.device_name}?` : "Log out"}
        description={asking?.this_device ? "This is the device you're using now. You'll go to the login page." : "It will be signed out."}
        warningMessage="It has to sign in again to use your account."
        actionLabel="Log out"
        isLoading={logoutOne.isPending}
        onConfirm={endOne}
      />
      <DangerConfirmDialog
        open={askingAll}
        onOpenChange={(o) => { if (!o && !logoutAll.isPending) setAskingAll(false); }}
        title="Log out from all devices?"
        description="Every device signed in to your account is signed out, this one too. You'll go to the login page."
        warningMessage="Each device has to sign in again to use your account."
        actionLabel="Log out from all"
        isLoading={logoutAll.isPending}
        onConfirm={endAll}
      />
    </div>
  );
}
