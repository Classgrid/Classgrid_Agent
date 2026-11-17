// This browser's own id (or the desktop app's: it keeps its own storage), sent with every API request as X-Device-Id
// and with a Google / GitHub sign-in as ?device=. Settings > Devices: the same browser signing in again replaces its
// own sign-in instead of counting as one more device toward the plan's device limit (server:
// services/user-session.service.js). It is random, says nothing about the person, and stays through a logout
// (LogoutPage keeps it).
export const DEVICE_ID_KEY = "cg_device_id";

let kept = "";

export function deviceId(): string {
  if (kept) return kept;
  try {
    const saved = localStorage.getItem(DEVICE_ID_KEY) || "";
    if (/^[A-Za-z0-9._:-]{6,128}$/.test(saved)) return (kept = saved);
    const made = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join("-");
    localStorage.setItem(DEVICE_ID_KEY, made);
    return (kept = made);
  } catch {
    return ""; // storage blocked: the server counts each sign-in on its own
  }
}
