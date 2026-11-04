import React, { useEffect, useState } from "react";
import { Switch } from "@/components/marketing_ui/switch";
import { BlueSlider } from "@/components/marketing_ui/BlueSlider";
import {
  readNotificationSettings,
  refreshNotificationSettings,
  saveNotificationSettings,
  playNotificationSound,
  type DesktopNotificationSettings,
} from "@/lib/desktopNotifications";

// Notifications in Settings (the Classgrid app and Classgrid Code, each with its own choices): the agent's Windows
// notifications and their sound. Grid messages only in the Classgrid app, where the Grids are.
const IN_EDITOR = import.meta.env.VITE_EDITOR === "1";

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4 border-b border-border last:border-b-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{desc}</span>
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="rounded-xl border border-border bg-card">{children}</div>
    </section>
  );
}

export function SettingsDesktopNotificationsCard() {
  const [settings, setSettings] = useState<DesktopNotificationSettings>(readNotificationSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    refreshNotificationSettings().then((s) => { setSettings(s); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (loaded) saveNotificationSettings(settings);
  }, [settings, loaded]);

  const set = (patch: Partial<DesktopNotificationSettings>) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
      <p className="text-sm text-muted-foreground mt-1">Manage your notification preferences.</p>

      <Section title="General">
        <Row title="Enable Notifications for Agent" desc="Show system notifications when your action is needed or the agent finishes.">
          <Switch checked={settings.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </Row>
      </Section>

      {!IN_EDITOR && (
        <Section title="Grids">
          <Row title="Enable Notifications for Grid messages" desc="Show a system notification when someone sends you a message in a Grid.">
            <Switch checked={settings.gridMessages} onCheckedChange={(v) => set({ gridMessages: v })} />
          </Row>
        </Section>
      )}

      <Section title="Sound">
        <Row title="Enable Sounds for Agent" desc="Play a sound when your action is needed or the agent finishes.">
          <Switch
            checked={settings.sound}
            onCheckedChange={(v) => {
              set({ sound: v });
              if (v) playNotificationSound(settings.volume);
            }}
          />
        </Row>
        <Row title="Volume" desc="Set the volume of agent sounds.">
          <div className={`flex items-center gap-3 w-56 shrink-0 ${settings.sound ? "" : "opacity-50 pointer-events-none"}`}>
            <BlueSlider
              value={settings.volume}
              onValueChange={(v) => set({ volume: v })}
              onPointerUp={() => playNotificationSound(settings.volume)}
              min={0}
              max={100}
              step={1}
              aria-label="Volume"
            />
            <span className="w-10 text-right text-sm font-medium tabular-nums text-foreground">{settings.volume}%</span>
          </div>
        </Row>
      </Section>
    </div>
  );
}
