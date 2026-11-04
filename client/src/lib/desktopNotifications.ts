// Desktop notifications (the Classgrid app and Classgrid Code): the user's choices, kept on this computer
// (localStorage, so both the app and the editor's AI panel read the same settings). The settings page writes
// here; AskAiPanel reads here before showing a Windows notification.

export type DesktopNotificationSettings = {
  enabled: boolean;        // master switch: any Windows notification at all
  aiFinished: boolean;     // the agent finished its answer
  needsYou: boolean;       // the agent is waiting for you (approve a command / permission)
  gridMessages: boolean;   // someone sent a new message in a shared Grid chat
  sound: boolean;          // play a sound with the notification
  volume: number;          // 0..100
};

const KEY = "cg_desktop_notifications";

export const DEFAULT_NOTIFICATION_SETTINGS: DesktopNotificationSettings = {
  enabled: true,
  aiFinished: true,
  needsYou: true,
  gridMessages: true,
  sound: true,
  volume: 70,
};

export function readNotificationSettings(): DesktopNotificationSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DesktopNotificationSettings>;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

type SharedDesktop = {
  getNotificationSettings?: () => Promise<Partial<DesktopNotificationSettings> | null>;
  saveNotificationSettings?: (s: DesktopNotificationSettings) => Promise<unknown>;
};
const desk = () => (typeof window !== "undefined" ? ((window as any).classgridDesktop as SharedDesktop | undefined) : undefined);

export function saveNotificationSettings(settings: DesktopNotificationSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch { /* storage blocked */ }
  // One file on this computer (%APPDATA%\Classgrid), read by the app and by Classgrid Code
  try { void desk()?.saveNotificationSettings?.(settings); } catch { /* not in the desktop app */ }
}

// Reads the shared file into this window's copy, so a change made in the other window (app or Classgrid Code) is used here
export async function refreshNotificationSettings(): Promise<DesktopNotificationSettings> {
  try {
    const shared = await desk()?.getNotificationSettings?.();
    if (shared) {
      const merged = { ...DEFAULT_NOTIFICATION_SETTINGS, ...shared };
      try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch { /* storage blocked */ }
      return merged;
    }
  } catch { /* keep this window's copy */ }
  return readNotificationSettings();
}

if (typeof window !== "undefined") {
  void refreshNotificationSettings();
  window.addEventListener("blur", () => { void refreshNotificationSettings(); });
}

// A tiny "ding" (a short sine blip) at the chosen volume, so a notification can be heard without a sound file.
export function playNotificationSound(volume: number) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume / 100)) * 0.5;
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const blip = (freq: number, at: number, dur: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(at);
      osc.stop(at + dur);
    };
    blip(880, now, 0.12);
    blip(1174.66, now + 0.12, 0.18);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch { /* no audio */ }
}