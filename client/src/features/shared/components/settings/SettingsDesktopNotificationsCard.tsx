import React, { useEffect, useState } from "react";
import { Bell, MessageSquare, ShieldAlert, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/marketing_ui/switch";
import { Slider } from "@/components/marketing_ui/slider";
import {
  readNotificationSettings,
  saveNotificationSettings,
  playNotificationSound,
  type DesktopNotificationSettings,
} from "@/lib/desktopNotifications";

// The desktop app's notification settings (Windows notifications). Shown only in the desktop app and in
// Classgrid Code, where the settings are kept on this computer.
export function SettingsDesktopNotificationsCard() {
  const [settings, setSettings] = useState<DesktopNotificationSettings>(readNotificationSettings);

  useEffect(() => {
    saveNotificationSettings(settings);
  }, [settings]);

  const set = (patch: Partial<DesktopNotificationSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const Row = ({ icon: Icon, title, desc, checked, onChange, disabled }: {
    icon: typeof Bell; title: string; desc: string; checked: boolean;
    onChange: (v: boolean) => void; disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between gap-4 p-5 border-b border-border last:border-b-0">
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold text-sm text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{desc}</span>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm mb-6">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <Bell size={18} className="text-foreground" /> Notifications
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Windows notifications when you're not looking at the app. Nothing pops up while you're already here.
        </p>
      </div>

      <div className="flex flex-col">
        <Row
          icon={Bell}
          title="Enable notifications"
          desc="A Windows notification when the AI finishes, or when it needs you"
          checked={settings.enabled}
          onChange={(v) => set({ enabled: v })}
        />

        <div className={settings.enabled ? "" : "opacity-50 pointer-events-none"}>
          <Row
            icon={Sparkles}
            title="AI finished"
            desc="The agent finished its answer"
            checked={settings.aiFinished}
            onChange={(v) => set({ aiFinished: v })}
          />
          <Row
            icon={ShieldAlert}
            title="Needs you"
            desc="The agent is waiting for you to approve a command or permission"
            checked={settings.needsYou}
            onChange={(v) => set({ needsYou: v })}
          />
          <Row
            icon={MessageSquare}
            title="Grid messages"
            desc="Someone sent you a new message in a shared Grid chat"
            checked={settings.gridMessages}
            onChange={(v) => set({ gridMessages: v })}
          />
        </div>

        <div className="p-5 border-t border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {settings.sound ? (
                <Volume2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              ) : (
                <VolumeX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-semibold text-sm text-foreground">Sound</span>
                <span className="text-xs text-muted-foreground">Play a sound with each notification</span>
              </div>
            </div>
            <Switch
              checked={settings.sound}
              onCheckedChange={(v) => {
                set({ sound: v });
                if (v) playNotificationSound(settings.volume);
              }}
            />
          </div>

          <div className={`mt-4 flex items-center gap-4 ${settings.sound ? "" : "opacity-50 pointer-events-none"}`}>
            <VolumeX className="size-4 shrink-0 text-muted-foreground" />
            <Slider
              value={[settings.volume]}
              onValueChange={(v) => set({ volume: v[0] })}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <Volume2 className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}