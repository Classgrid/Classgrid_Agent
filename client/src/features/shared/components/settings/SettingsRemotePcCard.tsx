// Settings → General → Remote PC (the Classgrid app and Classgrid Code; owner, 2026-11-18: "add essential settings in
// Classgrid Code, VSX, the desktop app and the mobile app"). A chat turned on with "/remote" here is followed and
// answered from the phone, and the work runs on this computer. Two settings live on the server, for this computer
// (GET / PUT /api/remote/devices/:deviceId): whether it may be controlled from the phone, and the permission mode the
// phone starts with. Three live in the desktop app itself (desktop/remotepc.js): the tray when the window is closed,
// keeping the computer awake while the AI works, and starting with Windows.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/marketing_ui/switch";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";

type Local = { allow: boolean; keepAwake: boolean; trayOnClose: boolean; openAtLogin: boolean; defaultMode: string };
type Desk = {
  deviceId?: string | null;
  remotePcSettings?: () => Promise<Local>;
  saveRemotePcSettings?: (patch: Partial<Local>) => Promise<Local>;
};
const desk = (): Desk | null => (window as unknown as { classgridDesktop?: Desk }).classgridDesktop || null;

const MODES = [
  { id: "review", name: "Request Review" },
  { id: "default", name: "Default" },
  { id: "auto", name: "Auto" },
  { id: "turbo", name: "Turbo" },
];

export function SettingsRemotePcCard() {
  const deviceId = desk()?.deviceId || null;
  const hasLocal = !!desk()?.remotePcSettings;
  const [server, setServer] = useState<{ allowed: boolean; defaultMode: string } | null>(null);
  const [local, setLocal] = useState<Local | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    fetchWithRescue(`${backendUrl}/api/remote/devices/${deviceId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setServer({ allowed: d.allowed !== false, defaultMode: d.defaultMode || "default" }))
      .catch(() => {});
    desk()?.remotePcSettings?.().then(setLocal).catch(() => {});
  }, [deviceId]);

  if (!deviceId || !server) return null;

  const saveServer = async (patch: { allowed?: boolean; defaultMode?: string }) => {
    setBusy(true);
    const before = server;
    setServer({ ...server, ...patch });
    try {
      const res = await fetchWithRescue(`${backendUrl}/api/remote/devices/${deviceId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      setServer(before);
      toast.error("Couldn't save. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveLocal = async (patch: Partial<Local>) => {
    const saved = await desk()?.saveRemotePcSettings?.(patch).catch(() => null);
    if (saved) setLocal(saved);
  };

  const row = (title: string, text: string, control: React.ReactNode, first = false) => (
    <div className={`flex items-center justify-between gap-6 px-5 py-4 ${first ? "" : "border-t border-border"}`}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{text}</span>
      </div>
      {control}
    </div>
  );

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-foreground mb-2">Remote PC</h3>
      <div className="rounded-xl border border-border bg-card">
        {row(
          "Control this computer from your phone",
          "Type /remote in a chat here, and follow and answer it from the Classgrid phone app under Remote PC. The work runs on this computer.",
          <Switch checked={server.allowed} disabled={busy} onCheckedChange={(on) => saveServer({ allowed: on })} />,
          true,
        )}
        {row(
          "Permission mode on the phone",
          "How the phone starts for this computer's chats. The phone can change it.",
          <select
            value={server.defaultMode}
            disabled={busy || !server.allowed}
            onChange={(e) => saveServer({ defaultMode: e.target.value })}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            {MODES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>,
        )}
        {hasLocal && local && (
          <>
            {row(
              "Keep running when the window is closed",
              "Classgrid stays in the tray by the clock and its work goes on. Quit it from the tray.",
              <Switch checked={local.trayOnClose} onCheckedChange={(on) => saveLocal({ trayOnClose: on })} />,
            )}
            {row(
              "Keep this computer awake while the AI works",
              "It won't go to sleep by itself during a task. Closing a laptop's lid still sleeps it: to change that, open Windows' Power Options and choose what closing the lid does.",
              <Switch checked={local.keepAwake} onCheckedChange={(on) => saveLocal({ keepAwake: on })} />,
            )}
            {row(
              "Start Classgrid with Windows",
              "It opens in the tray when you sign in to Windows, ready for your phone.",
              <Switch checked={local.openAtLogin} onCheckedChange={(on) => saveLocal({ openAtLogin: on })} />,
            )}
          </>
        )}
      </div>
    </section>
  );
}
