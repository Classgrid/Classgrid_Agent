// Desktop notifications (the Classgrid app and Classgrid Code): the user's choices, kept on this computer in one
// file (%APPDATA%\Classgrid\notification-settings.json), so both programs use the same values. localStorage keeps a
// copy for this window. The settings page writes here; the AI panel and the Grids popup read here before showing a
// Windows notification.

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
  notify?: (title: string, body: string) => Promise<unknown>;
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

// One Windows notification, if the user wants this kind and isn't looking at the window it belongs to.
// kind: what it is about (the switches in Settings). Returns true when it was shown.
export function showDesktopNotification(kind: "aiFinished" | "needsYou" | "gridMessages", body: string, title = "Classgrid"): boolean {
  const isDesktop = import.meta.env.VITE_DESKTOP === "1";
  const isEditor = import.meta.env.VITE_EDITOR === "1";
  if (!isDesktop && !isEditor) return false;
  if (typeof document !== "undefined" && document.hasFocus()) return false; // the user is already here
  try {
    const s = readNotificationSettings();
    if (!s.enabled || !s[kind]) return false;
    if (s.sound) playNotificationSound(s.volume);
    if (isEditor) {
      // Classgrid Code has no Electron: its extension shows the toast (notify-toast.ps1)
      void desk()?.notify?.(title, body);
      return true;
    }
    // The Classgrid app: its main window shows it, so a click brings the app forward
    if (desk()?.notify) { void desk()!.notify!(title, body); return true; }
    const n = new Notification(title, { body });
    n.onclick = () => window.focus();
    return true;
  } catch { return false; }
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