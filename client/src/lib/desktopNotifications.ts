// Desktop notifications (the Classgrid app and Classgrid Code): the user's choices, kept on this computer, each
// program with its own (the app: %APPDATA%\Classgrid\notification-settings.json; Classgrid Code: its own file next to
// it). localStorage keeps a copy for this window. Grid messages are the Classgrid app's only (the Grids are there). The settings page writes here; the AI panel and the Grids popup read here before showing a
// Windows notification.

export type DesktopNotificationSettings = {
  enabled: boolean;        // master switch: any Windows notification at all
  aiFinished: boolean;     // the agent finished its answer
  needsYou: boolean;       // the agent is waiting for you (approve a command / permission)
  gridMessages: boolean;   // someone sent a new message in a shared Grid chat
  sound: boolean;          // play a sound with the notification
  volume: number;          // 0..100
};

// (each program has its own choices: the Classgrid app and Classgrid Code)
const KEY = import.meta.env.VITE_EDITOR === "1" ? "cg_editor_notifications" : "cg_desktop_notifications";

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
  notify?: (title: string, body: string, opts?: { sound?: boolean; toast?: boolean }) => Promise<unknown>;
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
  try {
    const s = readNotificationSettings();
    // The agent: "Enable Notifications for Agent" (the Windows notification) and "Enable Sounds for Agent" (its sound)
    // each on their own. Grid messages have their own switch and are only in the Classgrid app (the Grids are there).
    const agent = kind !== "gridMessages";
    if (!agent && isEditor) return false;
    const wantToast = agent ? s.enabled && s[kind] : s.gridMessages;
    const wantSound = s.sound && (agent ? s[kind] : s.gridMessages);
    if (!wantToast && !wantSound) return false;
    // You're looking at it: only the sound, no Windows notification over what you're reading
    if (typeof document !== "undefined" && document.hasFocus()) {
      if (wantSound) playNotificationSound(s.volume);
      return false;
    }
    if (isEditor) {
      // Classgrid Code has no Electron: its extension shows the toast as Classgrid Code with Windows' notification
      // sound, or only the sound while Classgrid Code is the window in front (the panel's own sound isn't heard then)
      void desk()?.notify?.(title, body, { sound: wantSound, toast: wantToast });
      return wantToast;
    }
    if (wantSound) playNotificationSound(s.volume);
    if (!wantToast) return false;
    // The Classgrid app: its main window shows it, so a click brings the app forward
    if (desk()?.notify) { void desk()!.notify!(title, body); return true; }
    const n = new Notification(title, { body });
    n.onclick = () => window.focus();
    return true;
  } catch { return false; }
}

// Permission: Windows lets desktop apps notify by default, so in the app / Classgrid Code "asking" means the user
// agreed in our prompt and a test notification is sent. In a plain browser it is the browser's own prompt.
export type NotificationPermissionState = "granted" | "denied" | "unknown";
const PERM_KEY = "classgrid_notification_permission";
export function getNotificationPermission(): NotificationPermissionState {
  try {
    const v = localStorage.getItem(PERM_KEY);
    if (v === "granted" || v === "denied") return v;
    if (!desk()?.notify && typeof Notification !== "undefined" && Notification.permission !== "default") {
      return Notification.permission === "granted" ? "granted" : "denied";
    }
  } catch { /* ignore */ }
  return "unknown";
}
export async function requestNotificationPermission(allow: boolean): Promise<NotificationPermissionState> {
  let state: NotificationPermissionState = allow ? "granted" : "denied";
  if (allow && !desk()?.notify && typeof Notification !== "undefined") {
    const r = await Notification.requestPermission();
    state = r === "granted" ? "granted" : "denied";
  }
  try { localStorage.setItem(PERM_KEY, state); } catch { /* ignore */ }
  if (state === "granted") sendTestNotification();
  return state;
}

// A test notification from Settings: shown even while the window is focused and whatever the switches say.
export function sendTestNotification(): boolean {
  try {
    const s = readNotificationSettings();
    if (s.sound) playNotificationSound(s.volume);
    const title = "Classgrid";
    const body = "Test notification: this is how the agent tells you it finished or needs you.";
    if (desk()?.notify) { void desk()!.notify!(title, body); return true; }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") { new Notification(title, { body }); return true; }
    return false;
  } catch { return false; }
}

// A tiny "ding" (a short sine blip) at the chosen volume, so a notification can be heard without a sound file.
export function playNotificationSound(volume: number) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume / 100)) * 0.12;
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