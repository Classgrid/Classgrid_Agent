// One signed-in device as a row: its type's icon, its name, "This device" on the current one, the type, when it was
// last used and when it signed in, and a Log out button. Settings > Devices (SettingsDevicesSection) and the login
// page's list after a sign-in over the plan's devices (DeviceLimitDevices) show the same rows.
import { Code, Globe, Monitor, Smartphone, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import type { Device, DeviceKind } from "@/features/shared/queries/useDevices";
import { btnGrey } from "./AddEmailForm";

export const DEVICE_KINDS: Record<DeviceKind, { label: string; icon: LucideIcon }> = {
  website: { label: "Website", icon: Globe },
  desktop: { label: "Desktop app", icon: Monitor },
  phone: { label: "Phone app", icon: Smartphone },
  editor: { label: "Code editor", icon: Code },
};

const usedText = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const signedInText = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function DeviceRow({ d, onLogout }: { d: Device; onLogout: () => void }) {
  const kind = DEVICE_KINDS[d.kind] || DEVICE_KINDS.website;
  const Icon = kind.icon;
  return (
    <div className="px-5 py-4 border-b border-border last:border-b-0 flex items-center gap-4">
      <div className="size-9 shrink-0 rounded-lg bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center text-foreground" title={kind.label} aria-label={kind.label}>
        <Icon className="size-[18px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-[15px] text-foreground break-words">{d.device_name}</span>
          {d.this_device && (
            <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-xs font-medium bg-black/[0.06] dark:bg-white/[0.09] text-muted-foreground">This device</span>
          )}
        </div>
        <div className="text-[13px] text-muted-foreground mt-1">
          {kind.label} · Last used {usedText(d.last_seen_at)} · Signed in {signedInText(d.created_at)}
        </div>
      </div>
      <button type="button" className={`${btnGrey} shrink-0`} onClick={onLogout}>Log out</button>
    </div>
  );
}

export function DeviceRowSkeleton({ width }: { width: string }) {
  return (
    <div className="px-5 py-4 border-b border-border last:border-b-0 flex items-center gap-4">
      <Skeleton className="size-9 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className={`h-4 ${width} rounded`} />
        <Skeleton className="h-3 w-64 max-w-full rounded mt-2" />
      </div>
      <Skeleton className="h-8 w-[70px] rounded-full shrink-0" />
    </div>
  );
}
